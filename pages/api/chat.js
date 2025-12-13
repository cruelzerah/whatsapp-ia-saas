import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { buildIaPrompt } from "../../lib/promptBuilder";
import { getOpenAIClient } from "../../lib/openaiClient";

/* =========================
   CONFIG
========================= */
const PRICE_INPUT = 0.15 / 1_000_000;
const PRICE_OUTPUT = 0.6 / 1_000_000;
const USD_BRL_RATE = Number(process.env.USD_BRL_RATE || "5.5");

/* =========================
   Z-API
========================= */
async function zapiSendText(phone, message) {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

  const headers = { "Content-Type": "application/json" };
  if (clientToken) headers["Client-Token"] = clientToken;

  await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ phone, message }),
  });
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function extractZapi(body) {
  const phone =
    body?.phone ||
    body?.from ||
    body?.sender ||
    body?.data?.phone ||
    body?.data?.from ||
    body?.message?.from ||
    body?.messages?.[0]?.from;

  const text =
    body?.text ||
    body?.message?.text ||
    body?.message?.body ||
    body?.data?.text ||
    body?.messages?.[0]?.text;

  return {
    phone: normalizePhone(phone),
    text: text?.trim(),
  };
}

/* =========================
   HANDLER
========================= */
export default async function handler(req, res) {
  // ✅ Healthcheck
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      route: "/api/chat",
      zapi: Boolean(process.env.ZAPI_INSTANCE_ID),
      openai: Boolean(process.env.OPENAI_API_KEY),
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body;
  try {
    body = req.body || {};
  } catch {
    body = {};
  }

  const isInternal = Boolean(body.userId);

  /* =========================
     WEBHOOK Z-API
  ========================= */
  if (!isInternal) {
    console.log("📩 Z-API WEBHOOK:", JSON.stringify(body));

    const { phone, text } = extractZapi(body);

    if (!phone || !text) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const userId = process.env.DEFAULT_USER_ID;
    if (!userId) {
      console.error("❌ DEFAULT_USER_ID não definido");
      return res.status(200).json({ ok: true });
    }

    try {
      await processMessage({ userId, message: text, phone });
    } catch (err) {
      console.error("🔥 ERRO PROCESSANDO WEBHOOK:", err);
    }

    return res.status(200).json({ ok: true });
  }

  /* =========================
     REQUEST INTERNO
  ========================= */
  try {
    const { message, userId, conversationId } = body;

    if (!message || !userId) {
      return res.status(400).json({ error: "message e userId são obrigatórios" });
    }

    const result = await processMessage({
      userId,
      message,
      conversationId,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("🔥 ERRO /api/chat:", err);
    return res.status(500).json({ error: err.message });
  }
}

/* =========================
   CORE
========================= */
async function processMessage({ userId, message, phone, conversationId }) {
  const { data: settings } = await supabaseAdmin
    .from("company_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!settings) {
    throw new Error("Configurações da empresa não encontradas");
  }

  const { data: products } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true);

  const prompt = buildIaPrompt(settings, products || [], message);

  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
  });

  const reply = completion.choices[0].message.content;

  if (phone) {
    await zapiSendText(phone, reply);
  }

  return { reply };
}
