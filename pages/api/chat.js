// pages/api/chat.js

// ====== PATCH GLOBAL PARA .trim() ======
// ISSO PRECISA ESTAR NO TOPO, ANTES DE QUALQUER IMPORT
if (typeof String.prototype.trim === "function") {
  const originalTrim = String.prototype.trim;
  
  String.prototype.trim = function() {
    // Se this for null/undefined, retorna string vazia
    if (this == null) return "";
    
    // Se já for string, usa trim original
    if (typeof this === "string") {
      return originalTrim.call(this);
    }
    
    // Caso contrário, converte para string primeiro
    try {
      return String(this).trim();
    } catch (e) {
      console.warn("⚠️ trim() chamado em valor não-string:", typeof this, this);
      return "";
    }
  };
}
// ====== FIM DO PATCH ======

import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { buildIaPrompt } from "../../lib/promptBuilder";
import { getOpenAIClient } from "../../lib/openaiClient";
import { safeString } from "../../lib/utils";

export default async function handler(req, res) {
  try {
    console.log("🟢 /api/chat START - timestamp:", new Date().toISOString());

    // Healthcheck
    if (req.method === "GET") {
      return res.status(200).json({
        ok: true,
        route: "/api/chat",
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        trimPatchActive: true,
      });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const body = req.body || {};

    // Detecta webhook Z-API
    const isWebhook = !body.userId;

    const userId = safeString(body.userId || process.env.DEFAULT_USER_ID);

    // Extrai mensagem de TODAS as formas possíveis
    const message =
      safeString(body?.text?.message) ||
      safeString(body?.message?.text) ||
      safeString(body?.message) ||
      safeString(body?.text) ||
      safeString(body?.messageText) ||
      safeString(body?.body);

    console.log("📩 /api/chat RECEIVED:", {
      isWebhook,
      userId,
      messageLength: message.length,
      bodyKeys: Object.keys(body),
    });

    if (!userId || !message) {
      console.log("⚠️ Missing userId or message, skipping");
      return res.status(200).json({ 
        ok: true, 
        skipped: true, 
        reason: "missing_user_or_message",
        received: { userId, message: message.slice(0, 50) }
      });
    }

    console.log("🔍 Fetching settings for userId:", userId);

    // Busca configurações
    const { data: settings, error: settingsErr } = await supabaseAdmin
      .from("company_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (settingsErr) {
      console.error("❌ SUPABASE settings error:", settingsErr);
      return res.status(200).json({ ok: true, skipped: true, reason: "settings_error", error: settingsErr.message });
    }

    if (!settings) {
      console.log("⚠️ No settings found for userId:", userId);
      return res.status(200).json({ ok: true, skipped: true, reason: "no_settings" });
    }

    console.log("✅ Settings found:", settings.company_name);

    // Produtos
    console.log("🔍 Fetching products for userId:", userId);
    
    const { data: products, error: prodErr } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("user_id", userId);

    if (prodErr) {
      console.error("❌ SUPABASE products error:", prodErr);
    } else {
      console.log("✅ Products found:", products?.length || 0);
    }

    console.log("🤖 Building prompt...");
    const prompt = buildIaPrompt(settings, products || [], message);

    console.log("🤖 Calling OpenAI...");
    const openai = getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const reply =
      completion?.choices?.[0]?.message?.content ||
      "Não consegui responder agora. Pode repetir sua pergunta, por favor?";

    console.log("✅ OpenAI reply:", reply.slice(0, 100));

    return res.status(200).json({ ok: true, reply });
    
  } catch (err) {
    console.error("🔥 /api/chat ERROR:", err.message);
    console.error("🔥 Stack:", err.stack);
    console.error("🔥 Type:", err.constructor.name);
    
    return res.status(200).json({ 
      ok: false, 
      error: "internal_error", 
      message: err.message,
      type: err.constructor.name,
    });
  }
}
