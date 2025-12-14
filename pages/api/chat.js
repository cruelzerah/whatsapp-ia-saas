// pages/api/chat.js

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

// Importações necessárias
import Airtable from 'airtable';
import OpenAI from 'openai';

// Configuração do Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

// Configuração do OpenAI
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export default async function handler(req, res) {
  console.log("🔵 /api/chat called - method:", req.method);

  if (req.method !== 'POST') {
    console.log("❌ Method not POST, returning 405");
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, text } = req.body;

    console.log("📩 Request body:", JSON.stringify(req.body, null, 2));

    const safeUserId = safeTrim(userId);
    const rawMessage = text?.message || text || "";
    const message = safeTrim(rawMessage);

    if (!safeUserId || !message) {
      console.log("❌ Missing userId or message");
      return res.status(400).json({ 
        ok: false, 
        error: 'userId and message are required',
        received: { userId: safeUserId, message }
      });
    }

    console.log("✅ Valid message from userId:", safeUserId, "→", message.slice(0, 50));

    // Busca histórico do usuário no Airtable
    const records = await base('Conversations')
      .select({
        filterByFormula: `{userId} = '${safeUserId}'`,
        sort: [{ field: 'timestamp', direction: 'asc' }],
      })
      .all();

    console.log("📚 Found", records.length, "conversation records");

    const history = records.map((r) => ({
      role: safeTrim(r.fields.role),
      content: safeTrim(r.fields.content),
    }));

    // Adiciona a mensagem atual ao histórico
    history.push({ role: 'user', content: message });

    console.log("🤖 Calling OpenAI with", history.length, "messages");

    // Chama OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: history,
    });

    const reply = safeTrim(completion.choices[0]?.message?.content) || "Não consegui responder. Tente novamente.";

    console.log("✅ OpenAI reply:", reply.slice(0, 100));

    // Salva user message no Airtable
    await base('Conversations').create({
      userId: safeUserId,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    });

    // Salva assistant reply no Airtable
    await base('Conversations').create({
      userId: safeUserId,
      role: 'assistant',
      content: reply,
      timestamp: new Date().toISOString(),
    });

    console.log("✅ Saved to Airtable");

    return res.status(200).json({ ok: true, reply });

  } catch (err) {
    console.error("❌ /api/chat ERROR:", err);
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Stack:", err.stack);

    return res.status(200).json({ 
      ok: false, 
      error: err.message || 'internal_error',
      errorType: err.name,
    });
  }
}
