// pages/api/webhook.js
import { sendWhatsAppText } from "../../lib/whatsapp";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { buildIaPrompt } from "../../lib/promptBuilder";
import { getOpenAIClient } from "../../lib/openaiClient";
import { safeTrim } from "../../lib/utils";

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

    // Busca configurações (usa DEFAULT_USER_ID ou o primeiro usuário)
    const userId = process.env.DEFAULT_USER_ID;

    if (!userId) {
      console.warn("⚠️ DEFAULT_USER_ID não configurado, pulando IA");
      return res.status(200).json({ ok: true, skipped: "no_user_id" });
    }

    const { data: settings, error: settingsErr } = await supabaseAdmin
      .from("company_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (settingsErr || !settings) {
      console.error("❌ Erro ao buscar settings:", settingsErr);
      return res.status(200).json({ ok: true, skipped: "no_settings" });
    }

    // Busca produtos
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("user_id", userId);

    // Monta prompt e chama IA
    const prompt = buildIaPrompt(settings, products || [], message);

    const openai = getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // ⚠️ corrige aqui: é "gpt-4o-mini", não "gpt-4.1-mini"
      messages: [{ role: "user", content: prompt }],
    });

    const reply =
      completion?.choices?.[0]?.message?.content ||
      "Desculpe, não consegui processar sua mensagem. Pode repetir?";

    console.log("🤖 Resposta da IA:", reply.slice(0, 100));

    // Envia resposta via Z-API
    const sent = await sendWhatsAppText(phone, reply);

    if (!sent.ok) {
      console.error("❌ Erro ao enviar via Z-API:", sent);
    }

    return res.status(200).json({ ok: true, reply, sent });
  } catch (err) {
    console.error("❌ /api/webhook ERROR:", err);
    return res.status(200).json({ ok: false, error: err.message || "internal_error" });
  }
}
