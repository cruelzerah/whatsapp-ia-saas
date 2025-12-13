// pages/api/webhook-whatsapp.js

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  // ✅ Healthcheck simples (pra testar no navegador)
  if (req.method === "GET" && !req.query["hub.mode"]) {
    return res.status(200).json({
      ok: true,
      route: "/api/webhook-whatsapp",
      hasVerifyToken: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
      hasAccessToken: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
    });
  }

  // ✅ Verificação do webhook (padrão Meta/Cloud API)
  // 360dialog normalmente usa o mesmo esquema: hub.mode / hub.verify_token / hub.challenge
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }

    return res.status(403).send("Forbidden: invalid verify token");
  }

  // ✅ Recebe eventos/mensagens
  if (req.method === "POST") {
    try {
      const payload = req.body;

      // (Opcional) log rápido no console da Vercel
      console.log("[webhook-whatsapp] payload:", JSON.stringify(payload));

      // -----
      // Aqui depende do formato que o 360dialog está te mandando.
      // O mais comum é vir parecido com Cloud API:
      // entry[0].changes[0].value.messages[0].text.body
      // -----
      const msg =
        payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0] || null;

      if (!msg) {
        // Sem mensagem (pode ser status, delivered, read etc)
        return res.status(200).json({ ok: true, ignored: true });
      }

      const from = msg.from; // telefone de quem mandou
      const text = msg?.text?.body || "";

      if (!from || !text) {
        return res.status(200).json({ ok: true, ignored: true });
      }

      // ✅ Chama seu /api/chat pra gerar resposta
      const baseUrl = process.env.APP_BASE_URL || "";
      const user_toggle = process.env.DEFAULT_USER_ID || "";

      const chatResp = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          userId: user_toggle,
        }),
      });

      const chatJson = await chatResp.json();
      const replyText =
        chatJson?.reply || "Desculpa! Tive um problema pra responder agora.";

      // ✅ Envia mensagem de volta pelo 360dialog
      await send360DialogTextMessage({
        to: from,
        text: replyText,
      });

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[webhook-whatsapp] ERROR:", err);
      return res.status(200).json({ ok: true, errorHandled: true }); // importante responder 200 pro provider não reenviar em loop
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

// ---------
// Envio via 360dialog Sandbox/API
// Endpoint comum: https://waba.360dialog.io/v1/messages
// Auth: Bearer <API_KEY>
// ---------
async function send360DialogTextMessage({ to, text }) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) throw new Error("Missing WHATSAPP_ACCESS_TOKEN");

  const url = "https://waba.360dialog.io/v1/messages";

  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to,
      type: "text",
      text: { body: text },
    }),
  });

  const data = await r.text();
  if (!r.ok) {
    throw new Error(`360dialog send error ${r.status}: ${data}`);
  }
  return data;
}
