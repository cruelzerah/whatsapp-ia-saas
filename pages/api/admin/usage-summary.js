// pages/api/admin/usage-summary.js
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

const USD_BRL_RATE = Number(process.env.USD_BRL_RATE || "5.5");

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { startDate, endDate } = req.query;

    // 1) Carregar todas as empresas para mapear user_id → company_name
    const { data: companies } = await supabaseAdmin
      .from("company_settings")
      .select("user_id, company_name");

    const companyMap = {};
    companies?.forEach((c) => {
      companyMap[c.user_id] = c.company_name || "Sem nome";
    });

    // 2) Query base dos logs
    let query = supabaseAdmin.from("usage_logs").select("*");

    if (startDate) {
      query = query.gte("created_at", `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query = query.lte("created_at", `${endDate}T23:59:59.999Z`);
    }

    const { data, error } = await query;

    if (error) return res.status(500).json({ error });

    if (!data || data.length === 0) {
      return res.status(200).json({
        totals: { tokens: 0, usd: 0, brl: 0 },
        byMonth: [],
        byCompany: [],
      });
    }

    let totalTokens = 0;
    let totalUsd = 0;
    let totalBrl = 0;

    const monthMap = new Map();
    const companyMapAgg = new Map(); // chave: company_name

    for (const row of data) {
      const tokens = row.total_tokens || 0;
      const usd = row.cost_usd || 0;
      const brl = row.cost_brl ?? usd * USD_BRL_RATE;

      totalTokens += tokens;
      totalUsd += usd;
      totalBrl += brl;

      // Empresa associada
      const companyName = companyMap[row.user_id] || "Empresa desconhecida";

      // ----- Por empresa -----
      if (!companyMapAgg.has(companyName)) {
        companyMapAgg.set(companyName, { tokens: 0, usd: 0, brl: 0 });
      }
      const c = companyMapAgg.get(companyName);
      c.tokens += tokens;
      c.usd += usd;
      c.brl += brl;

      // ----- Por mês -----
      const created = new Date(row.created_at);
      const monthKey = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { tokens: 0, usd: 0, brl: 0 });
      }
      const m = monthMap.get(monthKey);
      m.tokens += tokens;
      m.usd += usd;
      m.brl += brl;
    }

    const byMonth = Array.from(monthMap.entries())
      .map(([month, v]) => ({
        month,
        tokens: v.tokens,
        usd: v.usd,
        brl: v.brl,
      }))
      .sort((a, b) => (a.month < b.month ? 1 : -1));

    const byCompany = Array.from(companyMapAgg.entries()).map(
      ([companyName, v]) => ({
        companyName,
        tokens: v.tokens,
        usd: v.usd,
        brl: v.brl,
      })
    );

    return res.status(200).json({
      totals: { tokens: totalTokens, usd: totalUsd, brl: totalBrl },
      byMonth,
      byCompany,
    });
  } catch (err) {
    console.error("Erro em /api/admin/usage-summary:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
}
