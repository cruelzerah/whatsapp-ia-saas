import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { buildIaPrompt } from "../../lib/promptBuilder";
import { getOpenAIClient } from "../../lib/openaiClient";

/**
 * Normaliza qualquer entrada para STRING SEGURA
 * (NUNCA quebra com objetos)
 */
function toText(value) {
  try {
    if (value === null || value === undefined) return "";

    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean")
      return String(value);

    if (typeof value === "object") {
      if (typeof value.message === "string") return value.message;
      if (typeof value.text === "string") return value.text;
      if (typeof value.body === "string") return value.body;

      return JSON.stringify(value);
    }

    return String(value);
  } catch {
    return "";
  }
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
    // Detecta webhook Z-API
    // =========================
    const isWebhook = !body.userId;

    let userId = body.userId ||
