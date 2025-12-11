// pages/api/appointments/by-day.js
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { date, userId } = req.query;

    if (!date || !userId) {
      return res
        .status(400)
        .json({ error: "Parâmetros date e userId são obrigatórios." });
    }

    // date vem como "YYYY-MM-DD"
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const { data, error } = await supabaseAdmin
      .from("appointments")
      .select("*")
      .eq("user_id", userId)
      .gte("starts_at", start.toISOString())
      .lte("starts_at", end.toISOString())
      .order("starts_at", { ascending: true });

    if (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: "Erro ao buscar agendamentos do dia." });
    }

    return res.status(200).json({ appointments: data || [] });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Erro inesperado ao buscar agendamentos." });
  }
}
