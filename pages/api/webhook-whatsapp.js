// pages/api/webhook-whatsapp.js

export default async function handler(req, res) {
  console.log("📨 Webhook recebido do 360Dialog:", req.body);

  // 1) Verifica se é o teste do painel do 360Dialog
  if (req.body?.event === "webhook-test-event") {
    console.log("✅ Teste de webhook recebido e aprovado!");
    return res.status(200).json({ ok: true, message: "Webhook online!" });
  }

  // 2) Aqui você vai receber mensagens de verdade
  // Exemplo básico:
  const from = req.body?.from;
  const text = req.body?.text?.body;

  if (from && text) {
    console.log("💬 Mensagem recebida:", { from, text });

    // Resposta simples só para testar
    return res.status(200).json({
      reply: `Recebi sua mensagem: ${text}`,
    });
  }

  // fallback
  return res.status(200).json({ ok: true });
}
