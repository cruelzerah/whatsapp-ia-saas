// pages/api/chat.js

// ====== PATCH GLOBAL PARA .trim() ======
if (typeof String.prototype.trim === "function") {
  const originalTrim = String.prototype.trim;
  
  String.prototype.trim = function() {
    if (this == null) return "";
    if (typeof this === "string") return originalTrim.call(this);
    try {
      return String(this).trim();
    } catch (e) {
      console.warn("⚠️ trim() error:", typeof this, this);
      return "";
    }
  };
}
// ====== FIM DO PATCH ======

function safeTrim(v) {
  try {
    if (v === null || v === undefined) return "";
    if (typeof v === "string") return v.trim();
    if (typeof v === "number" || typeof v === "boolean") return String(v).trim();
    if (typeof v === "object") return JSON.stringify(v).trim();
    return String(v).trim();
  } catch {
    return "";
  }
}

// Importações
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { buildIaPrompt } from "../../lib/promptBuilder";
import { getOpenAIClient } from "../../lib/openaiClient";

export default async function handler(req, res) {
  console.log("🔵 /api/chat START");

  // GET = healthcheck
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      route: "/api/chat",
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const body = req.body || {};

    const userId = safeTrim(body.userId || process.env.DEFAULT_USER_ID);
    const rawMessage = body?.text?.message || body?.message || body?.text || "";
    const message = safeTrim(rawMessage);

    console.log("📩 Received:", { userId, messageLength: message.length });

    if (!userId || !message) {
      console.log("⚠️ Missing userId or message");
      return res.status(200).json({
        ok: false,
        error: "missing_userId_or_message",
        received: { userId, message: message.slice(0, 50) },
      });
    }

    // Busca settings
    console.log("🔍 Fetching settings...");
    const { data: settings, error: settingsErr } = await supabaseAdmin
      .from("company_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (settingsErr) {
      console.error("❌ Supabase settings error:", settingsErr);
      return res.status(200).json({ ok: false, error: "settings_error", details: settingsErr.message });
    }

    if (!settings) {
      console.log("⚠️ No settings found for userId:", userId);
      return res.status(200).json({ ok: false, error: "no_settings" });
    }

    console.log("✅ Settings OK:", settings.company_name);

    // Busca produtos
    console.log("🔍 Fetching products...");
    const { data: products, error: prodErr } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("user_id", userId);

    if (prodErr) {
      console.error("⚠️ Products error:", prodErr);
    }

    console.log("✅ Products:", products?.length || 0);

    // Monta prompt
    console.log("🤖 Building prompt...");
    const prompt = buildIaPrompt(settings, products || [], message);

    // Chama OpenAI
    console.log("🤖 Calling OpenAI...");
    const openai = getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const reply = safeTrim(completion?.choices?.[0]?.message?.content) || 
      "Não consegui responder agora. Pode repetir sua pergunta, por favor?";

    console.log("✅ OpenAI reply:", reply.slice(0, 100));

    return res.status(200).json({ ok: true, reply });

  } catch (err) {
    console.error("❌ /api/chat ERROR:", err.message);
    console.error("Stack:", err.stack);

    return res.status(200).json({
      ok: false,
      error: "internal_error",
      message: err.message,
      type: err.constructor.name,
    });
  }
}
