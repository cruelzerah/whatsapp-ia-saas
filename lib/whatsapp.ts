export async function sendWhatsAppText(to: string, text: string) {
  const instanceId = process.env.ZAPI_INSTANCE_ID!;
  const token = process.env.ZAPI_TOKEN!;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN; // opcional (mas você já tem)

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (clientToken) headers["Client-Token"] = clientToken;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      phone: to,      // ex: "5511999999999"
      message: text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Z-API send failed: ${res.status} ${err}`);
  }

  return res.json();
}
