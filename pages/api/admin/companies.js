// pages/api/admin/companies.js
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("company_settings")
      .select("user_id, company_name")
      .order("company_name", { ascending: true });

    if (error) {
      console.error("Erro ao buscar empresas:", error);
      return res.status(500).json({ error: "Erro ao buscar empresas" });
    }

    return res.status(200).json({ companies: data });
  } catch (err) {
    console.error("Erro em /api/admin/companies:", err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
}
