// pages/api/chat2.js

export default async function handler(req, res) {
  try {
    const body = req.body || {};

    // pega mensagem do jeito mais simples possível
    const msg =
      (typeof body?.text?.message === "string" && body.text.message) ||
      (typeof body?.message?.text === "string" && body.message.text) ||
      (typeof body?.message === "string" && body.message) ||
      (typeof body?.text === "string" && body.text) ||
      "";

    // fingerprint pra provar que esse arquivo está rodando
    return res.status(200).json({
      ok: true,
      route: "/api/chat2",
      version: "CHAT2-OK-001",
      msgPreview: msg.slice(0, 120),
      bodyKeys: Object.keys(body),
    });
  } catch (e) {
    return res.status(200).json({ ok: false, route: "/api/chat2", error: "internal_error" });
  }
}
