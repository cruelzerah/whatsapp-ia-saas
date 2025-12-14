// pages/api/webhook.js
import { safeTrim, safePhone } from "../../lib/utils";

// Função temporária inline (depois vamos criar lib/whatsapp.js)
async function sendWhatsAppText(phone, text) {
  try {
    const cleanPhone = safePhone(phone);
    const cleanText = safeTrim(text);

    if (!cleanPhone || !cleanText) {
      console.warn("⚠️ sendWhatsAppText: phone ou text vazio", { phone, text });
      return { ok: false, reason: "phone_or_text_empty" };
    }

    const instanceId = process.env.ZAPI_INSTANCE_ID;
    const token = process.env.ZAPI_TOKEN;

    if (!instanceId || !token) {
      console.error("❌ ZAPI_INSTANCE_ID ou ZAPI_TOKEN não configurados");
      return { ok: false, reason: "missing_env" };
    }

    const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: cleanPhone,
        message: cleanText,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Z-API erro:", data);
      return { ok: false, reason: "zapi_error", data };
    }

    console.log("✅ Mensagem enviada via Z-API:", { phone: cleanPhone, text: cleanText.slice(0, 50) });
    return { ok: true, data };
  } catch (err) {
    console.error("❌ sendWhatsAppText exception:", err);
    return { ok: false, reason: "exception", error: err.message };
  }
}

export default async function handler(req, res) {
  // Health check
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, route: "/api/webhook" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = req.body;

    console.log("📩 Z-API WEBHOOK:", JSON.stringify(payload, null, 2));

    // Ignora se for mensagem enviada por você (fromMe = true)
    if (payload.fromMe === true) {
      return res.status(200).json({ ok: true, skipped: "fromMe" });
    }

    // Ignora se não for mensagem de texto normal
    if (payload.type !== "ReceivedCallback") {
      return res.status(200).json({ ok: true, skipped: "not_text" });
    }

    // Extrai telefone e mensagem
    const phone = safeTrim(payload.phone);
    const message = safeTrim(payload?.text?.message);

    if (!phone || !message) {
      return res.status(200).json({ ok: true, skipped: "no_phone_or_message" });
    }

    console.log("✅ Mensagem válida de:", phone, "→", message.slice(0, 50));

    // Chama o /api/chat para processar com IA
    const chatResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://seu-projeto.vercel.app'}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: { message },
      }),
    });

    const chatData = await chatResponse.json();

    if (!chatData.ok || !chatData.reply) {
      console.error("❌ Erro ao processar /api/chat:", chatData);
      return res.status(200).json({ ok: true, skipped: "chat_error" });
    }

    console.log("🤖 Resposta da IA:", chatData.reply.slice(0, 100));

    // Envia resposta via Z-API
    const sent = await sendWhatsAppText(phone, chatData.reply);

    if (!sent.ok) {
      console.error("❌ Erro ao enviar via Z-API:", sent);
    }

    return res.status(200).json({ ok: true, reply: chatData.reply, sent });
  } catch (err) {
    console.error("❌ /api/webhook ERROR:", err);
    console.error("Stack:", err.stack);
    return res.status(200).json({ ok: false, error: err.message || "internal_error" });
  }
}
