// pages/api/chat2.js
export default async function handler(req, res) {
  return res.status(200).json({
    ok: true,
    route: "/api/chat2",
    marker: "CHAT2_V1_13122025",
    method: req.method,
  });
}
