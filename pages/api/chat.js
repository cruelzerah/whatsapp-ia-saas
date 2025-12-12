// pages/api/chat.js
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { buildIaPrompt } from "../../lib/promptBuilder";
import openai from "../../lib/openaiClient";

const PRICE_INPUT_4_1_MINI = 0.15 / 1_000_000;
const PRICE_OUTPUT_4_1_MINI = 0.60 / 1_000_000;
const USD_BRL_RATE = Number(process.env.USD_BRL_RATE || "5.50");

export default async function handler(req, res) {
  // ✅ Health check via GET (pra testar no browser)
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      route: "/api/chat",
      method: req.method,
      hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    });
  }

  // ✅ Apenas POST daqui pra baixo
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido", method: req.method });
  }

  // ✅ Valida ENV da OpenAI antes de fazer qualquer coisa
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "OPENAI_API_KEY não configurada no Vercel",
      howToFix: "Vercel → Settings → Environment Variables → Add OPENAI_API_KEY → Redeploy",
    });
  }

  const { message, userId, conversationId } = req.body || {};

  if (!message || !userId) {
    return res.status(400).json({ error: "Parâmetros obrigatórios ausentes (message, userId)." });
  }

  try {
    // 1) company_settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("company_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (settingsError) {
      console.error("[api/chat] Supabase company_settings:", settingsError);
      return res.status(500).json({
        error: "Erro ao buscar configurações da empresa",
        details: settingsError.message,
      });
    }

    if (!settings) {
      return res.status(404).json({
        error: "Configurações da empresa não encontradas. Preencha o painel primeiro.",
      });
    }

    // 2) products
    const { data: productsData, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id, name, description, price, category, is_active, image_url")
      .eq("user_id", userId)
      .order("name", { ascending: true })
      .limit(100);

    if (productsError) {
      console.error("[api/chat] Supabase products:", productsError);
    }

    const products = productsData || [];

    // 3) prompt
    const prompt = buildIaPrompt(settings, products, message);

    // 4) OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const aiText =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "Não consegui gerar uma resposta agora, tente novamente em instantes.";

    // 5) conversa
    let finalConversationId = conversationId || null;

    if (!finalConversationId) {
      const { data: conv, error: convError } = await supabaseAdmin
        .from("conversations")
        .insert({ user_id: userId, title: message.slice(0, 120) })
        .select("id")
        .single();

      if (!convError && conv?.id) finalConversationId = conv.id;
      else console.error("[api/chat] criar conversa:", convError);
    }

    // 6) chat_logs
    if (finalConversationId) {
      const { error: chatError } = await supabaseAdmin.from("chat_logs").insert([
        { user_id: userId, role: "user", message, conversation_id: finalConversationId },
        { user_id: userId, role: "assistant", message: aiText, conversation_id: finalConversationId },
      ]);

      if (chatError) console.error("[api/chat] salvar chat_logs:", chatError);
    }

    // 7) usage_logs
    const usage = completion.usage || {};
    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || inputTokens + outputTokens;

    const costUsd = inputTokens * PRICE_INPUT_4_1_MINI + outputTokens * PRICE_OUTPUT_4_1_MINI;
    const costBrl = costUsd * USD_BRL_RATE;

    const { error: usageError } = await supabaseAdmin.from("usage_logs").insert({
      user_id: userId,
      model: completion.model || "gpt-4.1-mini",
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      cost_usd: costUsd,
      cost_brl: costBrl,
      meta: { source: "api/chat" },
    });

    if (usageError) console.error("[api/chat] salvar usage_logs:", usageError);

    return res.status(200).json({ reply: aiText, conversationId: finalConversationId });
  } catch (err) {
    console.error("[api/chat] ERRO GERAL:", err?.response?.data || err);
    return res.status(500).json({
      error: "Erro ao gerar resposta",
      details: err?.message || "Erro desconhecido",
    });
  }
}
