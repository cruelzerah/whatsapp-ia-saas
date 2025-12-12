export default function handler(req, res) {
  res.status(200).json({
    hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    urlStartsWithHttps: String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").startsWith("https://"),
    anonLength: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").length,
  });
}
git add .