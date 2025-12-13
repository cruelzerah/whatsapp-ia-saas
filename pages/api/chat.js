// pages/api/chat.js

import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { buildIaPrompt } from "../../lib/promptBuilder";
import { getOpenAIClient } from "../../lib/openaiClient";

// =======================
// Custos OpenAI
// =======================
const PRICE_INPUT_4_1_MINI = 0.15 / 1_000_000;
const PRICE_OUTPUT_4_1_MINI = 0.60 / 1_000_000;
const USD_BRL_RATE = Number(process.env.USD_BRL_RATE || "5.5");

// =======================
// Helpers Z-API
// =======================
function normalizePhoneBR(phone) {
  if (!phone) return null;
  return String(phone).replace(/\D/g, "") || null;
}

async function zapiSendText({ phone, message }) {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;

  if (!instanceId || !token) {
    throw new Error("Z-API não configurada");
  }

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

  const headers = { "Content-Type": "application/json" };
  if (clientToken) headers["Client-Token"] = clientToken;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ phone, message }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err);
  }
}

// =======================
// EXTRATOR CORRETO Z-API
// =======================
function extractFromZapiPayload(body) {
  let phone = null;
  let text = null;

  // telefone
  phone =
    body?.phone ||
    body?.from ||
    body?.connectedPhone ||
    body?.sender ||
    body?.data?.phone ||
    body?.message?.from;

  // texto (Z-API manda como objeto)
  if (typeof body?.text === "string") {
    text = body.text;
  } else if (typeof body?.text?.message === "string") {
    text = body.text.message;
  } else if (typeof body?.message?.text === "string") {
    text = body.message.text;
  } else if (typeof body?.message?.body === "string") {
    text = body.message.body;
  }

  phone = normalizePhoneBR(phone);
  text = typeof text === "string" ? text.trim() : null;

  return { phone, text };
}

// =======================
// HANDLER PRINCIPAL
// =======================
export default async function handler(req, res) {
  try {
    // ===================
    // GET = health check
    // ===================
    if (req.method === "GET") {
      return res.status(200).json({
        ok: true,
        route: "/api/chat",
        hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
        hasSupabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        hasZapi: Boolean(process.env.ZAPI_INSTANCE_ID),
      });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    const body = req.body || {};
    const isInternal = Boolean(body.userId);

    // ===================
    // WEBHOOK Z-API
    // ===================
    let message = body.message;
    let userId = body.userId;
    let conversationId = body.conversationId || null;
    let fromPhone = null;

    if (!isInternal) {
      console.log("Z-API WEBHOOK:", JSON.stringify(body, null, 2));

      const extracted = extractFromZapiPayload(body);
      fromPhone = extracted.phone;
      message = extracted.text;

      userId = process.env.DEFAULT_USER_ID;

      if (!userId || !fromPhone || !message) {
        return res.status(200).json({ ok: true, skipped: true });
      }
    }

    if (!message || !userId) {
      return res.status(400).json({ error: "message ou userId ausente" });
    }

    // ===================
    // SETTINGS
    // ===================
    const { data: settings } = await supabaseAdmin
      .from("company_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!settings) {
      return isInternal
        ? res.status(404).json({ error: "Empresa sem configuração" })
        : res.status(200).json({ ok: true });
    }

    // ===================
    // PRODUTOS
    // ===================
    const { data: products = [] } = await supabaseAdmin
      .from("products")
      .select("id, name, description, price")
      .eq("user_id", userId)
      .limit(100);

    // ===================
    // OPENAI
    // ===================
    const prompt = buildIaPrompt(settings, products, message);
    const openai = getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const aiText =
      completion?.choices?.[0]?.message?.content ||
      "Não consegui responder agora.";

    // ===================
    // CONVERSA
    // ===================
    if (!conversationId) {
      const { data: conv } = await supabaseAdmin
        .from("conversations")
        .insert({
          user_id: userId,
          title: message.slice(0, 100),
          meta: fromPhone ? { fromPhone } : null,
        })
        .select("id")
        .single();

      conversationId = conv?.id;
    }

    if (conversationId) {
      await supabaseAdmin.from("chat_logs").insert([
        { user_id: userId, role: "user", message, conversation_id: conversationId },
        { user_id: userId, role: "assistant", message: aiText, conversation_id: conversationId },
      ]);
    }

    // ===================
    // ENVIA RESPOSTA
    // ===================
    if (!isInternal && fromPhone) {
      await zapiSendText({ phone: fromPhone, message: aiText });
      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({
      reply: aiText,
      conversationId,
    });
  } catch (err) {
    console.error("ERRO /api/chat:", err);
    return res.status(200).json({ ok: true });
  }
}
