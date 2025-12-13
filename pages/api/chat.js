// pages/api/chat.js
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { buildIaPrompt } from "../../lib/promptBuilder";
import { getOpenAIClient } from "../../lib/openaiClient";

// custos aproximados por token do modelo gpt-4.1-mini
const PRICE_INPUT_4_1_MINI = 0.15 / 1_000_000;  // USD por token de entrada
const PRICE_OUTPUT_4_1_MINI = 0.60 / 1_000_000; // USD por token de saída

const USD_BRL_RATE = Number(process.env.USD_BRL_RATE || "5.50");

// =======================
// Z-API helpers (mínimo)
// =======================
function normalizePhoneBR(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  // Se vier sem 55, você pode decidir forçar 55 aqui.
  // Por segurança, vamos retornar como está (mas só dígitos).
  return digits || null;
}

async function zapiSendText({ phone, message }) {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN; // opcional

  if (!instanceId || !token) {
    throw new Error("ZAPI_INSTANCE_ID ou ZAPI_TOKEN não configurados.");
  }

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

  const headers = { "Content-Type": "application/json" };
  if (clientToken) headers["Client-Token"] = clientToken;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      phone,    // ex: "5511999999999"
      message,  // texto
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Z-API send-text failed: ${res.status} ${err}`);
  }
  return res.json();
}

// =========================================
// Extractor robusto: tenta achar phone/text
// =========================================
function extractFromZapiPayload(body) {
  // A Z-API pode mandar formatos diferentes dependendo de configuração/evento.
  // Vamos tentar várias rotas comuns e retornar o que achar.

  const candidates = [];

  // 1) body.message.* / body.messages[0].*
  candidates.push({
    phone:
      body?.phone ||
      body?.from ||
      body?.sender ||
      body?.participant ||
      body?.message?.phone ||
      body?.message?.from ||
      body?.message?.sender ||
      body?.messages?.[0]?.phone ||
      body?.messages?.[0]?.from ||
      body?.messages?.[0]?.sender ||
      body?.data?.phone ||
      body?.data?.from ||
      body?.data?.sender,
    text:
      body?.message?.text ||
      body?.message?.body ||
      body?.text ||
      body?.body ||
      body?.messages?.[0]?.text ||
      body?.messages?.[0]?.body ||
      body?.data?.text ||
      body?.data?.body,
  });

  // 2) Alguns payloads vêm como body.data.message.text
  candidates.push({
    phone:
      body?.data?.message?.phone ||
      body?.data?.message?.from ||
      body?.data?.message?.sender,
    text:
      body?.data?.message?.text ||
      body?.data?.message?.body,
  });

  // 3) Se vier estrutura tipo { message: { chatId, ... } }
  candidates.push({
    phone:
      body?.message?.chatId ||
      body?.data?.chatId ||
      body?.chatId,
    text:
      body?.message?.content ||
      body?.data?.content ||
      body?.content,
  });

  for (const c of candidates) {
    const phone = normalizePhoneBR(c.phone);
    const text = (c.text && String(c.text).trim()) || null;
    if (phone && text) return { phone, text };
  }

  return { phone: null, text: null };
}

// =======================
// Handler principal
// =======================
export default async function handler(req, res) {
  // ✅ Health check via GET (pra testar no navegador)
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      route: "/api/chat",
      method: "GET",
      hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      hasZapiInstance: Boolean(process.env.ZAPI_INSTANCE_ID),
      hasZapiToken: Boolean(process.env.ZAPI_TOKEN),
      hasZapiClientToken: Boolean(process.env.ZAPI_CLIENT_TOKEN),
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  // ⚠️ NUNCA devolva 400 pra webhook em produção (evita re-tentativas infinitas)
  // Para chamadas internas (seu painel), podemos devolver 400.
  // Vamos detectar origem: se tiver `userId` no body, é interno. Caso contrário, é webhook.
  const body = req.body || {};
  const isInternalRequest = Boolean(body.userId);

  try {
    // ✅ trava clara se não tiver key na Vercel
    if (!process.env.OPENAI_API_KEY) {
      const payload = {
        error: "OPENAI_API_KEY não configurada na Vercel",
        howToFix: "Vercel > Settings > Environment Variables > Add OPENAI_API_KEY > Redeploy",
      };
      return isInternalRequest
        ? res.status(500).json(payload)
        : res.status(200).json({ ok: true, skipped: "missing_openai_key" });
    }

    // -------------------------------
    // 1) Determinar mensagem + userId
    // -------------------------------
    let message = body.message;
    let userId = body.userId;
    let conversationId = body.conversationId || null;

    // Se não for interno, tentar extrair do payload da Z-API
    let fromPhone = null;

    if (!isInternalRequest) {
      const extracted = extractFromZapiPayload(body);
      fromPhone = extracted.phone;
      message = extracted.text;

      // ✅ Aqui você decide como mapear phone -> userId (seu cliente/empresa)
      // Opção A (mais simples agora): usar 1 userId fixo para testes
      // Crie no .env: DEFAULT_USER_ID=uuid_da_empresa_teste
      userId = process.env.DEFAULT_USER_ID;

      // Se não tiver DEFAULT_USER_ID, não dá pra saber qual empresa responde
      if (!userId) {
        console.log("Webhook recebido, mas DEFAULT_USER_ID não configurado. BODY:", JSON.stringify(body));
        return res.status(200).json({ ok: true, skipped: "missing_DEFAULT_USER_ID" });
      }

      // Se não conseguiu extrair mensagem/telefone, só aceita e loga
      if (!message || !fromPhone) {
        console.log("Webhook recebido, mas não consegui extrair phone/text:", JSON.stringify(body));
        return res.status(200).json({ ok: true, skipped: "unparsed_payload" });
      }
    } else {
      // interno: valida mínimos
      if (!message || !userId) {
        return res.status(400).json({
          error: "Parâmetros obrigatórios ausentes (message, userId).",
        });
      }
    }

    // ---------------------------------------
    // 2) Buscar configurações da empresa
    // ---------------------------------------
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("company_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (settingsError) {
      console.error("Supabase error (company_settings):", settingsError);
      const payload = {
        error: "Erro ao buscar configurações da empresa",
        details: settingsError.message,
      };
      return isInternalRequest ? res.status(500).json(payload) : res.status(200).json({ ok: true, skipped: "settings_error" });
    }

    if (!settings) {
      const payload = {
        error: "Configurações da empresa não encontradas. Preencha o painel da InfinixAI primeiro.",
      };
      return isInternalRequest ? res.status(404).json(payload) : res.status(200).json({ ok: true, skipped: "no_settings" });
    }

    // ----------------
    // 3) Produtos
    // ----------------
    let products = [];
    try {
      const { data: productsData, error: productsError } = await supabaseAdmin
        .from("products")
        .select("id, name, description, price, category, is_active, image_url")
        .eq("user_id", userId)
        .order("name", { ascending: true })
        .limit(100);

      if (productsError) console.error("Erro ao buscar products:", productsError);
      else products = productsData || [];
    } catch (prodErr) {
      console.error("Erro inesperado ao buscar products:", prodErr);
    }

    // ----------------
    // 4) Prompt + OpenAI
    // ----------------
    const prompt = buildIaPrompt(settings, products, message);

    const openai = getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const aiText =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "Não consegui gerar uma resposta agora, tente novamente em instantes.";

    // ----------------
    // 5) Conversa
    // ----------------
    let finalConversationId = conversationId || null;

    if (!finalConversationId) {
      const { data: conv, error: convError } = await supabaseAdmin
        .from("conversations")
        .insert({
          user_id: userId,
          title: message.slice(0, 120),
          // opcional: salvar de quem veio
          meta: fromPhone ? { fromPhone } : null,
        })
        .select("id")
        .single();

      if (convError) console.error("Erro ao criar conversa:", convError);
      else finalConversationId = conv.id;
    }

    // ----------------
    // 6) Logs
    // ----------------
    if (finalConversationId) {
      const { error: chatError } = await supabaseAdmin.from("chat_logs").insert([
        { user_id: userId, role: "user", message, conversation_id: finalConversationId },
        { user_id: userId, role: "assistant", message: aiText, conversation_id: finalConversationId },
      ]);

      if (chatError) console.error("Erro ao salvar chat_logs:", chatError);
    }

    // ----------------
    // 7) Usage
    // ----------------
    const usage = completion.usage || {};
    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || inputTokens + outputTokens;

    const costUsd =
      inputTokens * PRICE_INPUT_4_1_MINI +
      outputTokens * PRICE_OUTPUT_4_1_MINI;

    const costBrl = costUsd * USD_BRL_RATE;

    const { error: usageError } = await supabaseAdmin.from("usage_logs").insert({
      user_id: userId,
      model: completion.model || "gpt-4.1-mini",
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      cost_usd: costUsd,
      cost_brl: costBrl,
      meta: { source: isInternalRequest ? "panel" : "zapi_webhook", fromPhone },
    });

    if (usageError) console.error("Erro ao salvar usage_logs:", usageError);

    // ----------------
    // 8) Se veio do WhatsApp, responder via Z-API
    // ----------------
    if (!isInternalRequest && fromPhone) {
      try {
        await zapiSendText({ phone: fromPhone, message: aiText });
      } catch (sendErr) {
        console.error("Falha ao enviar resposta Z-API:", sendErr);
        // Mesmo falhando envio, respondemos 200 para webhook não ficar tentando eternamente
      }
      return res.status(200).json({ ok: true });
    }

    // Se interno, devolve reply para o frontend
    return res.status(200).json({
      reply: aiText,
      conversationId: finalConversationId,
    });
  } catch (error) {
    console.error("[/api/chat] ERRO GERAL:", error);

    // Webhook: sempre 200 pra evitar retry infinito
    if (!isInternalRequest) {
      return res.status(200).json({ ok: true, error: "internal_error" });
    }

    return res.status(500).json({
      error: "Erro ao gerar resposta da InfinixAI",
      details: error?.message || "Erro desconhecido",
    });
  }
}
