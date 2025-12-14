// pages/api/webhook.js

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

function safePhone(v) {
  const s = safeTrim(v);
  return s.replace(/\D/g, "");
}

// Função para enviar mensagem via Z-API
async function sendWhatsAppText(phone, text) {
  try {
    const cleanPhone = safePhone(phone);
    const cleanText = safeTrim(text);

    if (!cleanPhone || !cleanText) {
      console.warn("⚠️ sendWhatsAppText: phone ou text vazio");
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

    console.log("✅ Mensagem enviada via Z-API");
    return { ok: true, data };
  } catch (err) {
    console.error("❌ sendWhatsAppText exception:", err);
    return { ok: false, reason: "exception", error: err.message };
  }
}

export default async function handler(req, res) {
  // Health check
  if (req.method === "GET") {
    return res.status(200).json({ 
      ok: true, 
      route: "/api/webhook",
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = req.body;

    console.log("📩 Z-API WEBHOOK:", JSON.stringify(payload, null, 2));

    // Ignora se for mensagem enviada por você
    if (payload.fromMe === true) {
      console.log("⏭️ Skipped: fromMe");
      return res.status(200).json({ ok: true, skipped: "fromMe" });
    }

    // Ignora se não for mensagem de texto
    if (payload.type !== "ReceivedCallback") {
      console.log("⏭️ Skipped: not ReceivedCallback");
      return res.status(200).json({ ok: true, skipped: "not_text" });
    }

    const phone = safeTrim(payload.phone);
    const message = safeTrim(payload?.text?.message);

    if (!phone || !message) {
      console.log("⏭️ Skipped: no phone or message");
      return res.status(200).json({ ok: true, skipped: "no_phone_or_message" });
    }

    console.log("✅ Mensagem válida:", phone, "→", message.slice(0, 50));

    // Chama o /api/chat com userId fixo (use o DEFAULT_USER_ID ou seu userId real)
    const userId = process.env.DEFAULT_USER_ID || "seu-user-id-aqui";

    const chatResponse = await fetch(`${req.headers.host?.includes('localhost') ? 'http' : 'https'}://${req.headers.host}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: userId,
        text: { message },
      }),
    });

    const chatData = await chatResponse.json();

    console.log("🤖 /api/chat response:", chatData);

    if (!chatData.ok || !chatData.reply) {
      console.error("❌ Erro ao processar /api/chat:", chatData);
      return res.status(200).json({ ok: true, skipped: "chat_error", chatData });
    }

    console.log("✅ Resposta da IA:", chatData.reply.slice(0, 100));

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
