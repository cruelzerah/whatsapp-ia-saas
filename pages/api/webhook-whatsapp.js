async function send360DialogTextMessage({ to, text }) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) throw new Error("Missing WHATSAPP_ACCESS_TOKEN");

  // ✅ endpoint CORRETO do SANDBOX
  const url = "https://waba-sandbox.360dialog.io/v1/messages";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp", // ⚠️ OBRIGATÓRIO
      to,
      type: "text",
      text: {
        body: text,
      },
    }),
  });

  const data = await response.text();

  if (!response.ok) {
    console.error("360dialog error:", data);
    throw new Error(`360dialog send failed: ${data}`);
  }

  return data;
}
