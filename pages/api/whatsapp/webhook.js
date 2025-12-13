import { sendWhatsAppText } from "../../../lib/whatsapp";

export default async function handler(req, res) {
  // Health check simples
  if (req.method === "GET") {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = req.body;

    console.log("Z-API WEBHOOK PAYLOAD:", JSON.stringify(payload, null, 2));

    // ⚠️ Ainda NÃO vou tentar extrair phone/text sem ver o formato real do payload da sua conta
    // Próximo passo: você me manda 1 payload do log e eu coloco a extração certinha + IA + resposta.

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "server_error" });
  }
}
