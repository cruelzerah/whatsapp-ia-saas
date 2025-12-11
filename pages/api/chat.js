// pages/api/chat.js
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { buildIaPrompt } from "../../lib/promptBuilder";
import openai from "../../lib/openaiClient"; // 👈 cliente OpenAI já configurado

// custos aproximados por token do modelo gpt-4.1-mini
const PRICE_INPUT_4_1_MINI = 0.15 / 1_000_000;  // USD por token de entrada
const PRICE_OUTPUT_4_1_MINI = 0.60 / 1_000_000; // USD por token de saída

// câmbio usado para estimar custo em BRL (pode ajustar no .env.local)
const USD_BRL_RATE = Number(process.env.USD_BRL_RATE || "5.50");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { message, userId, conversationId } = req.body;

  if (!message || !userId) {
    return res
      .status(400)
      .json({ error: "Parâmetros obrigatórios ausentes (message, userId)." });
  }

  try {
    // 1) Buscar configurações da empresa desse usuário
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("company_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (settingsError) {
      console.error("Supabase error (company_settings):", settingsError);
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

    // 2) Buscar lista de produtos/serviços do usuário (ATIVOS + INATIVOS)
    let products = [];
    try {
      const { data: productsData, error: productsError } = await supabaseAdmin
        .from("products")
        .select(
          "id, name, description, price, category, is_active, image_url"
        )
        .eq("user_id", userId) // 👈 garante que só vê os produtos do próprio usuário
        .order("name", { ascending: true })
        .limit(100);

      if (productsError) {
        console.error("Erro ao buscar products:", productsError);
      } else {
        products = productsData || [];
      }
    } catch (prodErr) {
      console.error("Erro inesperado ao buscar products:", prodErr);
    }

    // 3) Montar o prompt da InfinixAI (AGORA COM PRODUTOS)
    // Assinatura correta: buildIaPrompt(settings, products, userMessage)
    const prompt = buildIaPrompt(settings, products, message);

    // 4) Chamar a OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const aiText =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "Não consegui gerar uma resposta agora, tente novamente em instantes.";

    // 5) Garantir que temos uma conversa (janela)
    let finalConversationId = conversationId || null;

    if (!finalConversationId) {
      const { data: conv, error: convError } = await supabaseAdmin
        .from("conversations")
        .insert({
          user_id: userId,
          title: message.slice(0, 120), // título = começo da primeira mensagem
        })
        .select("id")
        .single();

      if (convError) {
        console.error("Erro ao criar conversa:", convError);
      } else {
        finalConversationId = conv.id;
      }
    }

    // 6) Salvar logs de chat (duas linhas: cliente e IA)
    if (finalConversationId) {
      const { error: chatError } = await supabaseAdmin
        .from("chat_logs")
        .insert([
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
        console.error("Erro ao salvar chat_logs:", chatError);
      }
    }

    // 7) Salvar uso / custos em usage_logs
    const usage = completion.usage || {};
    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || inputTokens + outputTokens;

    const costUsd =
      inputTokens * PRICE_INPUT_4_1_MINI +
      outputTokens * PRICE_OUTPUT_4_1_MINI;

    const costBrl = costUsd * USD_BRL_RATE;

    const { error: usageError } = await supabaseAdmin
      .from("usage_logs")
      .insert({
        user_id: userId,
        model: completion.model || "gpt-4.1-mini",
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        cost_usd: costUsd,
        cost_brl: costBrl,
        meta: {
          source: "chat-teste",
        },
      });

    if (usageError) {
      console.error("Erro ao salvar usage_logs:", usageError);
    }

    // 8) Resposta pro front
    return res.status(200).json({
      reply: aiText,
      conversationId: finalConversationId,
    });
  } catch (error) {
    console.error("Erro no chat API:", error?.response?.data || error);

    return res.status(500).json({
      error: "Erro ao gerar resposta da InfinixAI",
      details: error?.message || "Erro desconhecido",
    });
  }
}
