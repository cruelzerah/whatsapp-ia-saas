// pages/api/chat.js
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { buildIaPrompt } from "../../lib/promptBuilder";
import { getOpenAIClient } from "../../lib/openaiClient";

/**
 * Normaliza QUALQUER entrada para string segura
 */
function toText(value) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (value && typeof value === "object") {
    if (typeof value.message === "string") return value.message.trim();
    if (typeof value.text === "string") return value.text.trim();
    if (typeof value.body === "string") return value.body.trim();

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return "";
}

export default async function handler(req, res) {
  try {
    // =========================
    // GET — healthcheck
    // =========================
    if (req.method === "GET") {
      return res.status(200).json({
        ok: true,
        route: "/api/chat",
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        hasSupabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = req.body || {};

    // =========================
    // Detecta se é webhook Z-API
    // =========================
    const isWebhook = !body.userId;

    let userId = body.userId || process.env.DEFAULT_USER_ID;
    let message = "";

    if (isWebhook) {
      console.log("📩 Z-API WEBHOOK:", JSON.stringify(body, null, 2));

      message =
        toText(body?.text?.message) ||
        toText(body?.message?.text) ||
        toText(body?.message) ||
        toText(body?.text);

      if (!userId || !message) {
        return res.status(200).json({ ok: true, skipped: true });
      }
    } else {
      message = toText(body.message);
      if (!userId || !message) {
        return res.status(400).json({ error: "Missing message or userId" });
      }
    }

    // =========================
    // Busca configurações
    // =========================
    const { data: settings } = await supabaseAdmin
      .from("company_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!settings) {
      return res.status(200).json({ ok: true, skipped: "no_settings" });
    }

    // =========================
    // Produtos
    // =========================
    const { data: products = [] } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("user_id", userId);

    // =========================
    // Prompt
    // =========================
    const prompt = buildIaPrompt(settings, products, message);

    const openai = getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const reply =
      completion?.choices?.[0]?.message?.content ||
      "Não consegui responder agora.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("🔥 CHAT ERROR:", err);
    return res.status(200).json({ ok: true, error: "internal_error" });
  }
}
