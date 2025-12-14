// pages/api/chat.js

// ====== PATCH GLOBAL PARA .trim() ======
if (typeof String.prototype.trim === "function") {
  const originalTrim = String.prototype.trim;

  String.prototype.trim = function () {
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

export default async function handler(req, res) {
  console.log("🔵 /api/chat called - method:", req.method);

  // Healthcheck (GET)
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      route: "/api/chat",
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method !== "POST") {
    console.log("❌ Method not POST, returning 405");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const body = req.body || {};

    console.log("📩 /api/chat body:", JSON.stringify(body, null, 2));

    // Aceita vários formatos de mensagem
    const message =
      safeTrim(body?.text?.message) ||
      safeTrim(body?.message) ||
      safeTrim(body?.body) ||
      "";

    if (!message) {
      console.log("⚠️ Missing message in body");
      return res.status(200).json({
        ok: false,
        error: "missing_message",
      });
    }

    // Resposta fixa de teste (sem IA ainda)
    const reply = `Recebi sua mensagem: "${message}". Em breve responderei com IA.`;

    console.log("✅ /api/chat reply:", reply);

    return res.status(200).json({
      ok: true,
      reply,
    });
  } catch (err) {
    console.error("❌ /api/chat ERROR:", err);
    console.error("Stack:", err.stack);
    return res.status(200).json({
      ok: false,
      error: err.message || "internal_error",
    });
  }
}
