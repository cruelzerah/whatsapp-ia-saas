// pages/api/chat.js

export default async function handler(req, res) {
  try {
    // Healthcheck (GET)
    if (req.method === "GET") {
      return res.status(200).json({
        ok: true,
        route: "/api/chat",
        mode: "minimal-test",
        timestamp: new Date().toISOString(),
      });
    }

    // Só aceita POST
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    // Loga exatamente o que está chegando
    console.log("=== /api/chat MINIMAL TEST ===");
    console.log("timestamp:", new Date().toISOString());
    console.log("body type:", typeof req.body);
    console.log("body content:", JSON.stringify(req.body, null, 2));

    // Resposta fixa (SEM chamar Supabase, OpenAI ou qualquer outra coisa)
    return res.status(200).json({
      ok: true,
      reply: "Teste minimal - /api/chat está funcionando sem erros de .trim()",
      receivedBody: req.body,
    });

  } catch (err) {
    console.error("🔥 /api/chat MINIMAL ERROR:", err);
    console.error("Stack:", err.stack);
    
    return res.status(200).json({ 
      ok: false, 
      error: "minimal_error",
      message: err.message,
    });
  }
}
