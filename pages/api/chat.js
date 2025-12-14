// pages/api/chat.js
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { buildIaPrompt } from "../../lib/promptBuilder";
import { getOpenAIClient } from "../../lib/openaiClient";
import { safeString } from "../../lib/utils";

export default async function handler(req, res) {
  try {
    // Healthcheck
    if (req.method === "GET") {
      return res.status(200).json({
        ok: true,
        route: "/api/chat",
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const body = req.body || {};

    // Detecta webhook Z-API (normalmente não vem userId)
    const isWebhook = !body.userId;

    const userId = safeString(body.userId || process.env.DEFAULT_USER_ID);

    // Extrai a mensagem do jeito mais tolerante possível
    const message =
      safeString(body?.text?.message) ||
      safeString(body?.message?.text) ||
      safeString(body?.message) ||
      safeString(body?.text) ||
      safeString(body?.messageText) ||
      safeString(body?.body);

    // LOGS para descobrir exatamente o que está chegando
    console.log("=== /api/chat IN ===");
    console.log("isWebhook:", isWebhook);
    console.log("userId:", userId);
    console.log("message type:", typeof message);
    console.log("message preview:", String(message || "").slice(0, 200));
    console.log("raw body keys:", Object.keys(body || {}));

    if (!userId || !message) {
      return res.status(200).json({ ok: true, skipped: true, reason: "missing_user_or_message" });
    }

    // Busca configurações
    const { data: settings, error: settingsErr } = await supabaseAdmin
      .from("company_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (settingsErr) {
      console.error("SUPABASE settings error:", settingsErr);
      return res.status(200).json({ ok: true, skipped: true, reason: "settings_error" });
    }

    if (!settings) {
      return res.status(200).json({ ok: true, skipped: true, reason: "no_settings" });
    }

    // Produtos
    const { data: products, error: prodErr } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("user_id", userId);

    if (prodErr) {
      console.error("SUPABASE products error:", prodErr);
    }

    const prompt = buildIaPrompt(settings, products || [], message);

    const openai = getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const reply =
      completion?.choices?.[0]?.message?.content ||
      "Não consegui responder agora. Pode repetir sua pergunta, por favor?";

    return res.status(200).json({ ok: true, reply });
  } catch (err) {
    console.error("🔥 /api/chat ERROR:", err);
    console.error("Stack:", err.stack);
    return res.status(200).json({ ok: false, error: "internal_error", message: err.message });
  }
}
