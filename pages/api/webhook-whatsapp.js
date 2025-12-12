// pages/api/webhook-whatsapp.js
import openaiChat from "./chat"; // reaproveita seu /api/chat handler (opcional)
import { supabaseAdmin } from "../../lib/supabaseAdmin";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const API_VERSION = process.env.WHATSAPP_API_VERSION || "v20.0";

async function sendWhatsAppText(to, text) {
  const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  const data = await resp.json();
  if (!resp.ok) {
    console.error("[WHATSAPP SEND ERROR]", resp.status, data);
    throw new Error(data?.error?.message || "Erro ao enviar mensagem WhatsApp");
  }
  return data;
}

export default async function handler(req, res) {
  // 1) Verificação do Webhook (GET)
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Forbidden");
  }

  // 2) Recebimento de mensagens (POST)
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body;

    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    const message = value?.messages?.[0];
    const from = message?.from; // telefone do cliente
    const text = message?.text?.body;

    // Evita processar evento que não seja texto
    if (!from || !text) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    // ✅ aqui você precisa mapear "from" -> userId (empresa)
    // Simples pra teste: userId fixo (depois a gente melhora)
    const userId = process.env.DEFAULT_USER_ID || "ac580248-ed02-4bd0-8b78-c67e086d1225";

    // Chama sua IA via /api/chat (interno)
    // Criamos um "req/res fake" pra reaproveitar o handler
    const fakeReq = { method: "POST", body: { message: text, userId } };

    let reply = "Não consegui responder agora.";
    const fakeRes = {
      status: () => fakeRes,
      json: (data) => {
        reply = data?.reply || reply;
        return data;
      },
    };

    await openaiChat(fakeReq, fakeRes);

    // Envia resposta pro WhatsApp
    await sendWhatsAppText(from, reply);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[WEBHOOK ERROR]", err);
    return res.status(200).json({ ok: true }); // WhatsApp exige 200 pra não reenviar loucamente
  }
}
