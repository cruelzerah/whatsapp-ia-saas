// pages/admin/usage.js
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export default function AdminUsage() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [totals, setTotals] = useState({ tokens: 0, usd: 0, brl: 0 });
  const [byMonth, setByMonth] = useState([]);
  const [byCompany, setByCompany] = useState([]);

  // 1) Carrega usuário logado
  useEffect(() => {
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        // Se não estiver logado, manda pro login
        window.location.href = "/login";
        return;
      }

      setUser(data.user);
      setLoadingUser(false);
      setAuthorized(
        ADMIN_EMAIL &&
          data.user.email &&
          data.user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
      );
    }

    loadUser();
  }, []);

  // 2) Busca dados da API
  async function fetchUsageData(options = {}) {
    try {
      setLoadingData(true);
      setError("");

      const params = new URLSearchParams();

      // permite passar datas diferentes das que estão no state (ex: limpar filtro)
      const s = options.startDate ?? startDate;
      const e = options.endDate ?? endDate;

      if (s) params.append("startDate", s);
      if (e) params.append("endDate", e);

      const qs = params.toString();
      const url = `/api/admin/usage-summary${qs ? `?${qs}` : ""}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Falha ao buscar resumo de uso");
      }

      const json = await res.json();
      setTotals(json.totals || { tokens: 0, usd: 0, brl: 0 });
      setByMonth(json.byMonth || []);
      setByCompany(json.byCompany || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Erro ao carregar dados de uso.");
    } finally {
      setLoadingData(false);
    }
  }

  // Carrega dados assim que o admin é autorizado
  useEffect(() => {
    if (authorized) {
      fetchUsageData();
    }
  }, [authorized]);

  function handleApplyFilter(e) {
    e.preventDefault();
    fetchUsageData();
  }

  function handleClearFilter() {
    setStartDate("");
    setEndDate("");
    fetchUsageData({ startDate: "", endDate: "" });
  }

  if (loadingUser) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "#e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Carregando...
      </div>
    );
  }

  if (!authorized) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "#e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            background: "#020617",
            border: "1px solid #1e293b",
            borderRadius: 16,
            padding: 32,
            maxWidth: 480,
            textAlign: "center",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
          }}
        >
          <h1 style={{ fontSize: 20, marginBottom: 12 }}>Acesso restrito</h1>
          <p style={{ fontSize: 14, color: "#64748b" }}>
            Esta página é exclusiva do administrador. Seu e-mail (
            <strong>{user?.email}</strong>) não está autorizado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#e2e8f0",
        fontFamily: "system-ui, sans-serif",
        padding: 24,
      }}
    >
      {/* Topo */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>
            InfinixAI – Custos de Uso (Admin)
          </h1>
          <p style={{ fontSize: 14, color: "#64748b" }}>
            Visão geral de tokens e gastos por período, mês e cliente.
          </p>
        </div>

        <div style={{ textAlign: "right", fontSize: 12 }}>
          <div style={{ color: "#64748b" }}>Logado como:</div>
          <div>{user?.email}</div>
          <div style={{ color: "#22c55e", marginTop: 4 }}>Admin</div>
        </div>
      </header>

      {/* Filtro por data */}
      <section
        style={{
          background: "#020617",
          borderRadius: 16,
          padding: 16,
          border: "1px solid #1e293b",
          marginBottom: 16,
          display: "flex",
          alignItems: "flex-end",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "0 0 160px" }}>
          <label style={{ fontSize: 12, color: "#94a3b8" }}>Início</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              width: "100%",
              marginTop: 4,
              padding: 6,
              borderRadius: 8,
              border: "1px solid #1e293b",
              background: "#020617",
              color: "#e2e8f0",
              fontSize: 13,
            }}
          />
        </div>

        <div style={{ flex: "0 0 160px" }}>
          <label style={{ fontSize: 12, color: "#94a3b8" }}>Fim</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              width: "100%",
              marginTop: 4,
              padding: 6,
              borderRadius: 8,
              border: "1px solid #1e293b",
              background: "#020617",
              color: "#e2e8f0",
              fontSize: 13,
            }}
          />
        </div>

        <button
          onClick={handleApplyFilter}
          style={{
            padding: "8px 16px",
            borderRadius: 999,
            border: "none",
            background: "#0ea5e9",
            color: "#0b1120",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Aplicar filtro
        </button>

        <button
          onClick={handleClearFilter}
          style={{
            padding: "8px 16px",
            borderRadius: 999,
            border: "1px solid #1e293b",
            background: "transparent",
            color: "#e2e8f0",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Limpar filtro
        </button>
      </section>

      {error && (
        <p style={{ color: "#f97316", marginBottom: 12, fontSize: 14 }}>
          {error}
        </p>
      )}

      {/* Cards de totais */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            padding: 16,
            borderRadius: 16,
            border: "1px solid #1e293b",
            background: "#020617",
          }}
        >
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
            Tokens totais
          </div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>
            {loadingData ? "..." : totals.tokens.toLocaleString("pt-BR")}
          </div>
        </div>

        <div
          style={{
            padding: 16,
            borderRadius: 16,
            border: "1px solid #1e293b",
            background: "#020617",
          }}
        >
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
            Custo total (USD)
          </div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>
            {loadingData ? "..." : `$${totals.usd.toFixed(4)}`}
          </div>
        </div>

        <div
          style={{
            padding: 16,
            borderRadius: 16,
            border: "1px solid #1e293b",
            background: "#020617",
          }}
        >
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
            Custo total (BRL)
          </div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>
            {loadingData ? "..." : `R$ ${totals.brl.toFixed(2)}`}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
            Conversão aprox. (USD→BRL = {process.env.USD_BRL_RATE || "5.5"})
          </div>
        </div>
      </section>

      {/* Tabela por mês */}
      <section
        style={{
          marginBottom: 24,
          borderRadius: 16,
          border: "1px solid #1e293b",
          background: "#020617",
          padding: 16,
        }}
      >
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Resumo por mês</h2>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
          }}
        >
          <thead>
            <tr style={{ textAlign: "left", color: "#94a3b8" }}>
              <th style={{ padding: "8px 4px" }}>Mês</th>
              <th style={{ padding: "8px 4px" }}>Tokens</th>
              <th style={{ padding: "8px 4px" }}>USD</th>
              <th style={{ padding: "8px 4px" }}>BRL</th>
            </tr>
          </thead>
          <tbody>
            {loadingData ? (
              <tr>
                <td colSpan={4} style={{ padding: 8, color: "#64748b" }}>
                  Carregando...
                </td>
              </tr>
            ) : byMonth.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 8, color: "#64748b" }}>
                  Nenhum dado no período selecionado.
                </td>
              </tr>
            ) : (
              byMonth.map((m) => (
                <tr key={m.month}>
                  <td style={{ padding: "6px 4px" }}>{m.month}</td>
                  <td style={{ padding: "6px 4px" }}>
                    {m.tokens.toLocaleString("pt-BR")}
                  </td>
                  <td style={{ padding: "6px 4px" }}>${m.usd.toFixed(4)}</td>
                  <td style={{ padding: "6px 4px" }}>
                    R$ {m.brl.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Tabela por empresa */}
      <section
        style={{
          marginBottom: 24,
          borderRadius: 16,
          border: "1px solid #1e293b",
          background: "#020617",
          padding: 16,
        }}
      >
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Consumo por empresa</h2>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
          }}
        >
          <thead>
            <tr style={{ textAlign: "left", color: "#94a3b8" }}>
              <th style={{ padding: "8px 4px" }}>Empresa</th>
              <th style={{ padding: "8px 4px" }}>Tokens</th>
              <th style={{ padding: "8px 4px" }}>USD</th>
              <th style={{ padding: "8px 4px" }}>BRL</th>
            </tr>
          </thead>
          <tbody>
            {loadingData ? (
              <tr>
                <td colSpan={4} style={{ padding: 8, color: "#64748b" }}>
                  Carregando...
                </td>
              </tr>
            ) : byCompany.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 8, color: "#64748b" }}>
                  Nenhum dado no período selecionado.
                </td>
              </tr>
            ) : (
              byCompany.map((c) => (
                <tr key={c.companyName}>
                  <td style={{ padding: "6px 4px" }}>{c.companyName}</td>
                  <td style={{ padding: "6px 4px" }}>
                    {c.tokens.toLocaleString("pt-BR")}
                  </td>
                  <td style={{ padding: "6px 4px" }}>${c.usd.toFixed(4)}</td>
                  <td style={{ padding: "6px 4px" }}>
                    R$ {c.brl.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
