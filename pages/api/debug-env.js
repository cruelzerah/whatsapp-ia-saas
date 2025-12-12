// pages/api/debug-env.js
export default function handler(req, res) {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);

  return res.status(200).json({
    ok: true,
    method: req.method,
    hasUrl,
    hasAnon,
    hasServiceRole,
    hasOpenAI,
    urlStartsWithHttps: String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").startsWith("https://"),
    anonLength: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").length,
    serviceLength: (process.env.SUPABASE_SERVICE_ROLE_KEY || "").length,
    openaiLength: (process.env.OPENAI_API_KEY || "").length,
  });
}
