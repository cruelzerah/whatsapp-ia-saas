// pages/api/chat.js
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { buildIaPrompt } from "../../lib/promptBuilder";
import { getOpenAIClient } from "../../lib/openaiClient";

/**
 * Converte qualquer valor em string "segura" (sem quebrar com trim)
 */
function toText(value) {
  try {
    if (value === null || value === undefined) return "";

    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }

    // Z-API costuma mandar objetos
    if (typeof value === "object") {
      if (typeof value.message === "string") return value.message;
      if (typeof value.text === "string") return value.text;
      if (typeof value.body === "string") return value.body;

      // último fallback
      return JSON.stringify(value);
    }

    return String(value);
  } catch {
    return "";
  }
}


/**
 * OpenAI pode retornar message.content como string OU array (content parts).
 * Isso evita o erro "?.trim is not a function".
 */
function extractOpenAIText(completion) {
  const content = completion?.choices?.[0]?.message?.content;

  // string normal
  if (typeof content === "string") return content.trim();

  // array de parts (ex: [{type:"text", text:"..."}])
  if (Array.isArray(content)) {
    const joined = content
      .map((part) => {
        // formatos mais comuns
        if (typeof part === "string") return part;
        if (part?.text) return toText(part.text);
        if (part?.content) return toText(part.content);
        if (part?.message) return toText(part.message);
        return toText(part);
      })
      .join(" ")
      .trim();

    return joined || "";
  }

  // objeto/qualquer outra coisa
  return toText(content);
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
        method: "GET",
        hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
        hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        hasZapiInstance: Boolean(process.env.ZAPI_INSTANCE_ID),
        hasZapiToken: Boolean(process.env.ZAPI_TOKEN),
        hasDefaultUserId: Boolean(process.env.DEFAULT_USER_ID),
      });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // =========================
    // Body pode vir como string em alguns cenários
    // =========================
    let body = req.body || {};
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    // =========================
    // Detecta se é webhook Z-API
    // =========================
    const isWebhook = !body.userId;

    let userId = body.userId || process.env.DEFAULT_USER_ID;

    // pegando msg do webhook (Z-API costuma mandar text.message)
    let message = "";

    if (isWebhook) {
      console.log("📩 Z-API WEBHOOK BODY:", JSON.stringify(body, null, 2));

      message =
        toText(body?.text?.message) ||
        toText(body?.message?.text) ||
        toText(body?.message) ||
        toText(body?.text);

      // se não tiver userId ou mensagem, responde 200 (não fica em retry)
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
    // Trava clara se não tiver key
    // =========================
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY não configurada");
      return isWebhook
        ? res.status(200).json({ ok: true, skipped: "missing_openai_key" })
        : res.status(500).json({ error: "OPENAI_API_KEY não configurada" });
    }

    // =========================
    // Busca configurações
    // =========================
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("company_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (settingsError) {
      console.error("Erro company_settings:", settingsError);
      return isWebhook
        ? res.status(200).json({ ok: true, skipped: "settings_error" })
        : res.status(500).json({ error: "Erro ao buscar settings" });
    }

    if (!settings) {
      return isWebhook
        ? res.status(200).json({ ok: true, skipped: "no_settings" })
        : res.status(404).json({ error: "no_settings" });
    }

    // =========================
    // Produtos
    // =========================
    const { data: products = [], error: prodErr } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("user_id", userId);

    if (prodErr) console.error("Erro products:", prodErr);

    // =========================
    // Prompt
    // =========================
    const prompt = buildIaPrompt(settings, products, message);

    // =========================
    // OpenAI
    // =========================
    const openai = getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const reply = extractOpenAIText(completion) || "Não consegui responder agora.";

    // =========================
    // Retorno
    // =========================
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("🔥 /api/chat ERROR:", err);
    // webhook SEMPRE 200
    return res.status(200).json({ ok: true, error: "internal_error" });
  }
}
