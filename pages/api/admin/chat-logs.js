// pages/admin/chat-logs.js
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const SAAS_TITLE = "InfinixAI – Histórico de Conversas (Admin)";
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

export default function AdminChatLogs() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [companies, setCompanies] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        window.location.href = "/login";
        return;
      }
      setUser(data.user);
      setLoadingUser(false);
    }
    loadUser();
  }, []);

  useEffect(() => {
    if (!user) return;

    if (ADMIN_EMAIL && user.email !== ADMIN_EMAIL) {
      setErrorMsg("Acesso restrito ao administrador.");
      setLoadingLogs(false);
      return;
    }

    async function loadCompanies() {
      try {
        const res = await fetch("/api/admin/companies");
        const json = await res.json();
        if (res.ok) {
          setCompanies(json.companies || []);
        } else {
          console.error(json);
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadCompanies();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (ADMIN_EMAIL && user.email !== ADMIN_EMAIL) return;

    async function loadLogs() {
      setLoadingLogs(true);
      setErrorMsg("");

      const params = new URLSearchParams();
      params.set("limit", "200");
      if (selectedUserId && selectedUserId !== "all") {
        params.set("userId", selectedUserId);
      }

      try {
        const res = await fetch(`/api/admin/chat-logs?${params.toString()}`);
        const json = await res.json();

        if (!res.ok) {
          setErrorMsg(json.error || "Erro ao carregar histórico.");
        } else {
          setLogs(json.logs || []);
        }
      } catch (err) {
        console.error(err);
        setErrorMsg("Erro ao buscar dados do servidor.");
      }

      setLoadingLogs(false);
    }

    loadLogs();
  }, [user, selectedUserId]);

  if (loadingUser) {
    return <div style={{ padding: 24 }}>Carregando usuário...</div>;
  }

  const companyNameById = {};
  companies.forEach((c) => {
    companyNameById[c.user_id] = c.company_name || "Sem nome";
  });

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
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>{SAAS_TITLE}</h1>
          <p style={{ fontSize: 14, color: "#64748b" }}>
            Visualize as conversas recentes da InfinixAI com os clientes dos
            seus usuários.
          </p>
        </div>

        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
            Logado como:
          </p>
          <p style={{ fontSize: 14, marginBottom: 8 }}>{user.email}</p>
        </div>
      </header>

      {errorMsg && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            background: "#7f1d1d",
            border: "1px solid #fecaca",
            color: "#fee2e2",
            fontSize: 14,
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Filtros */}
      <section
        style={{
          marginBottom: 16,
          padding: 12,
          borderRadius: 12,
          border: "1px solid #1e293b",
          background: "#020617",
        }}
      >
        <div style={{ fontSize: 13, marginBottom: 8 }}>
          <strong>Filtros</strong>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: 13, color: "#cbd5f5" }}>
              Cliente / Empresa:
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                style={{
                  marginLeft: 8,
                  padding: "4px 8px",
                  borderRadius: 8,
                  border: "1px solid #1e293b",
                  background: "#020617",
                  color: "#e2e8f0",
                  fontSize: 13,
                }}
              >
                <option value="all">Todos</option>
                {companies.map((c) => (
                  <option key={c.user_id} value={c.user_id}>
                    {c.company_name || c.user_id}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      {/* Lista de mensagens */}
      <section
        style={{
          padding: 16,
          borderRadius: 16,
          border: "1px solid #1e293b",
          background: "#020617",
        }}
      >
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>
          Mensagens recentes ({logs.length})
        </h2>

        {loadingLogs && <div>Carregando histórico...</div>}

        {!loadingLogs && logs.length === 0 && (
          <div style={{ fontSize: 13, color: "#64748b" }}>
            Nenhuma mensagem encontrada.
          </div>
        )}

        {!loadingLogs && logs.length > 0 && (
          <div
            style={{
              maxHeight: "70vh",
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {logs.map((log) => (
              <div
                key={log.id}
                style={{
                  marginBottom: 12,
                  padding: 8,
                  borderRadius: 8,
                  background:
                    log.direction === "user" ? "#020617" : "#022c22",
                  border:
                    log.direction === "user"
                      ? "1px solid #1e293b"
                      : "1px solid #065f46",
                  fontSize: 13,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                    color: "#94a3b8",
                  }}
                >
                  <span>
                    {log.direction === "user" ? "👤 Cliente" : "🤖 InfinixAI"} ·{" "}
                    <span style={{ color: "#e5e7eb" }}>
                      {companyNameById[log.user_id] ||
                        `User ${log.user_id.slice(0, 8)}...`}
                    </span>{" "}
                    · {log.channel} · {log.customer_identifier}
                  </span>
                  <span>
                    {new Date(log.created_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div style={{ whiteSpace: "pre-wrap" }}>{log.message}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
