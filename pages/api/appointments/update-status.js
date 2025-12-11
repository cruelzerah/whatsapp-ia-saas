// pages/api/appointments/update-status.js
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { appointmentId, userId, status } = req.body;

    if (!appointmentId || !userId || !status) {
      return res
        .status(400)
        .json({ error: "appointmentId, userId e status são obrigatórios." });
    }

    const allowed = ["pending", "confirmed", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Status inválido." });
    }

    const { data, error } = await supabaseAdmin
      .from("appointments")
      .update({ status })
      .eq("id", appointmentId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: "Erro ao atualizar status do agendamento." });
    }

    return res.status(200).json({ appointment: data });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Erro inesperado ao atualizar agendamento." });
  }
}
