// pages/api/chat.js
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { buildIaPrompt } from "../../lib/promptBuilder";
import openai from "../../lib/openaiClient";

// custos aproximados por token do modelo gpt-4.1-mini
const PRICE_INPUT_4_1_MINI = 0.15 / 1_000_000; // USD por token de entrada
const PRICE_OUTPUT_4_1_MINI = 0.60 / 1_000_000; // USD por token de saída

// câmbio usado para estimar custo em BRL (pode ajustar no .env.local / Vercel env)
const USD_BRL_RATE = Number(process.env.USD_BRL_RATE || "5.50");

function setCors(res) {
  // se quiser travar no seu domínio depois, troque "*" pelo domínio do front
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function envSnapshot() {
  return {
    hasOpenAI: Boolean(process.env.OPENAI_API_KEY),
    hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
}

export default async function handler(req, res) {
  setCors(res);

  // Preflight do browser (senão dá 405)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  // Segurança: garantir JSON
  // (Em Vercel/Next geralmente já vem parseado, mas deixo defensivo)
  const body = req.body || {};
  const { message, userId, conversationId } = body;

  if (!message || !userId) {
    return res.status(400).json({
      error: "Parâmetros obrigatórios ausentes (message, userId).",
      received: { hasMessage: Boolean(message), hasUserId: Boolean(userId) },
    });
  }

  // Checagem de env antes de rodar tudo
  const env = envSnapshot();
  if (!env.hasOpenAI) {
    return res.status(500).json({
      error: "OPENAI_API_KEY não configurada no ambiente (Vercel).",
      env,
    });
  }
  if (!env.hasSupabaseUrl || !env.hasServiceRole) {
    return res.status(500).json({
      error:
        "Variáveis do Supabase faltando. Precisa NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
      env,
    });
  }

  try {
    // 1) Buscar configurações da empresa desse usuário
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("company_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (settingsError) {
      console.error("[/api/chat] Supabase error (company_settings):", settingsError);
      return res.status(500).json({
        error: "Erro ao buscar configurações da empresa",
        details: settingsError.message,
      });
    }

    if (!settings) {
      return res.status(404).json({
        error:
          "Configurações da empresa não encontradas. Preencha o painel da InfinixAI primeiro.",
      });
    }

    // 2) Buscar lista de produtos/serviços do usuário
    let products = [];
    const { data: productsData, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id, name, description, price, category, is_active, image_url")
      .eq("user_id", userId)
      .order("name", { ascending: true })
      .limit(100);

    if (productsError) {
      console.error("[/api/chat] Erro ao buscar products:", productsError);
      // não quebra o chat por causa disso, só segue com lista vazia
      products = [];
    } else {
      products = productsData || [];
    }

    // 3) Montar o prompt (settings + products + user msg)
    const prompt = buildIaPrompt(settings, products, message);

    // 4) Chamar OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content:
            "Você é a InfinixAI, assistente de vendas via WhatsApp. Responda curto, claro e objetivo, estilo WhatsApp.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const aiText =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "Não consegui gerar uma resposta agora, tente novamente em instantes.";

    // 5) Garantir conversa
    let finalConversationId = conversationId || null;

    if (!finalConversationId) {
      const { data: conv, error: convError } = await supabaseAdmin
        .from("conversations")
        .insert({
          user_id: userId,
          title: String(message).slice(0, 120),
        })
        .select("id")
        .single();

      if (convError) {
        console.error("[/api/chat] Erro ao criar conversa:", convError);
      } else {
        finalConversationId = conv.id;
      }
    }

    // 6) Salvar chat_logs
    if (finalConversationId) {
      const { error: chatError } = await supabaseAdmin.from("chat_logs").insert([
        {
          user_id: userId,
          role: "user",
          message,
          conversation_id: finalConversationId,
        },
        {
          user_id: userId,
          role: "assistant",
          message: aiText,
          conversation_id: finalConversationId,
        },
      ]);

      if (chatError) {
        console.error("[/api/chat] Erro ao salvar chat_logs:", chatError);
      }
    }

    // 7) Salvar uso/custos
    const usage = completion?.usage || {};
    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || inputTokens + outputTokens;

    const costUsd =
      inputTokens * PRICE_INPUT_4_1_MINI + outputTokens * PRICE_OUTPUT_4_1_MINI;
    const costBrl = costUsd * USD_BRL_RATE;

    const { error: usageError } = await supabaseAdmin.from("usage_logs").insert({
      user_id: userId,
      model: completion?.model || "gpt-4.1-mini",
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      cost_usd: costUsd,
      cost_brl: costBrl,
      meta: {
        source: "api-chat",
      },
    });

    if (usageError) {
      console.error("[/api/chat] Erro ao salvar usage_logs:", usageError);
    }

    // 8) Resposta pro front
    return res.status(200).json({
      reply: aiText,
      conversationId: finalConversationId,
    });
  } catch (error) {
    // Log completo pra você ver no Vercel Logs
    console.error("[/api/chat] ERRO GERAL:", {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      // OpenAI SDK costuma guardar status/response em props diferentes
      status: error?.status,
      code: error?.code,
      response: error?.response?.data,
    });

    return res.status(500).json({
      error: "Erro ao gerar resposta da InfinixAI",
      details: error?.message || "Erro desconhecido",
      env: envSnapshot(),
    });
  }
}
