export default function handler(req, res) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  res.status(200).json({
    hasUrl: !!url,
    hasAnon: !!anon,
    hasServiceRole: !!service,
    urlStartsWithHttps: typeof url === "string" && url.startsWith("https://"),
    anonLength: anon?.length || 0,
    serviceLength: service?.length || 0,
  });
}
