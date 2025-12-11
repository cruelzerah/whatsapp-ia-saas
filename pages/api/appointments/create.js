// pages/api/appointments/create.js
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const {
      userId,
      customerName,
      customerPhone,
      service,
      notes,
      startsAt,
    } = req.body;

    if (!userId || !startsAt) {
      return res
        .status(400)
        .json({ error: "userId e startsAt são obrigatórios." });
    }

    const { data, error } = await supabaseAdmin
      .from("appointments")
      .insert({
        user_id: userId,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        service: service || null,
        notes: notes || null,
        starts_at: startsAt,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: "Erro ao criar agendamento no banco." });
    }

    return res.status(200).json({ appointment: data });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Erro inesperado ao criar agendamento." });
  }
}
