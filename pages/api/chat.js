// pages/api/chat.js

function toText(v) {
  try {
    if (v === null || v === undefined) return "";
    if (typeof v === "string") return v; // SEM trim!
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  } catch {
    return "";
  }
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return res.status(200).json({ ok: true, route: "/api/chat" });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = req.body || {};

    // tenta pegar mensagem de tudo que é jeito, SEM trim
    const message =
      toText(body?.text?.message) ||
      toText(body?.message?.text) ||
      toText(body?.message) ||
      toText(body?.text) ||
      toText(body?.messageText) ||
      toText(body?.body) ||
      toText(body);

    // Só devolve o que chegou
    return res.status(200).json({
      ok: true,
      gotType: typeof message,
      messagePreview: message.slice(0, 200),
    });
  } catch (err) {
    console.error("API CHAT ERROR:", err);
    return res.status(200).json({ ok: false, error: "internal_error" });
  }
}
