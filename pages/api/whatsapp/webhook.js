// pages/api/whatsapp/webhook.js

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

export default async function handler(req, res) {
  // 1) Verificação do webhook (Meta chama via GET)
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: "Forbidden" });
  }

  // 2) Recebimento de mensagens/eventos (Meta chama via POST)
  if (req.method === "POST") {
    try {
      const body = req.body;

      // (Opcional) log pra debug
      // console.log(JSON.stringify(body, null, 2));

      // ✅ aqui depois a gente extrai msg e responde usando seu sendWhatsAppText()
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message || "server_error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
