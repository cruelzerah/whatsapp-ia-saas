// lib/whatsapp.js
import { safeTrim, safePhone } from "./utils";

export async function sendWhatsAppText(phone, text) {
  try {
    const cleanPhone = safePhone(phone); // garante que vai virar string numérica
    const cleanText = safeTrim(text);    // garante que vai virar string

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
