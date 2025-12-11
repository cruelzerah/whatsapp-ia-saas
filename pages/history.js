// pages/history.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function HistoryPage() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState("");

  // 1) Carrega usuário logado
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

  // 2) Carrega lista de conversas desse usuário
  useEffect(() => {
    if (!user) return;
    fetchConversations();
  }, [user]);

  async function fetchConversations() {
    try {
      setLoadingConversations(true);
      setError("");

      const { data, error } = await supabase
        .from("conversations")
        .select("id, title, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setError("Erro ao carregar conversas.");
        return;
      }

      setConversations(data || []);

      // se não tiver conversa selecionada ainda, seleciona a primeira
      if (!selectedConversationId && data && data.length > 0) {
        setSelectedConversationId(data[0].id);
      }
    } catch (err) {
      console.error(err);
      setError("Erro inesperado ao carregar conversas.");
    } finally {
      setLoadingConversations(false);
    }
  }

  // 3) Quando selecionar uma conversa, carrega as mensagens dela
  useEffect(() => {
    if (!user || !selectedConversationId) return;
    fetchMessages(selectedConversationId);
  }, [user, selectedConversationId]);

  async function fetchMessages(conversationId) {
    try {
      setLoadingMessages(true);
      setError("");

      const { data, error } = await supabase
        .from("chat_logs")
        .select("id, role, message, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error(error);
        setError("Erro ao carregar mensagens.");
        return;
      }

      setMessages(data || []);
    } catch (err) {
      console.error(err);
      setError("Erro inesperado ao carregar mensagens.");
    } finally {
      setLoadingMessages(false);
    }
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
            InfinixAI – Chat & Histórico
          </h1>
          <p style={{ fontSize: 14, color: "#64748b" }}>
            Veja as conversas da sua InfinixAI com os clientes, separadas por
            janela de chat.
          </p>
        </div>

        <div style={{ textAlign: "right", fontSize: 12 }}>
          <div style={{ color: "#64748b" }}>Logado como:</div>
          <div>{user?.email}</div>
        </div>
      </header>

      {error && (
        <p
          style={{
            color: "#f97316",
            marginBottom: 12,
            fontSize: 14,
          }}
        >
          {error}
        </p>
      )}

      {/* Layout principal: lista de chats + mensagens */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px 1fr",
          gap: 16,
          minHeight: "60vh",
        }}
      >
        {/* Coluna de conversas */}
        <aside
          style={{
            borderRadius: 16,
            border: "1px solid #1e293b",
            background: "#020617",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: 12,
              borderBottom: "1px solid #1e293b",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Chats
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
            }}
          >
            {loadingConversations ? (
              <div style={{ padding: 12, fontSize: 13, color: "#64748b" }}>
                Carregando conversas...
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: 12, fontSize: 13, color: "#64748b" }}>
                Nenhuma conversa encontrada ainda.
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === selectedConversationId;
                const created = new Date(conv.created_at);
                const dateStr = created.toLocaleString("pt-BR");

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversationId(conv.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      borderBottom: "1px solid #020617",
                      padding: "10px 12px",
                      cursor: "pointer",
                      background: isActive ? "#0f172a" : "transparent",
                      color: "#e2e8f0",
                      fontSize: 13,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 500,
                        marginBottom: 4,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {conv.title || "(sem título)"}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      {dateStr}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Coluna de mensagens */}
        <section
          style={{
            borderRadius: 16,
            border: "1px solid #1e293b",
            background: "#020617",
            padding: 16,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {loadingMessages ? (
            <div style={{ fontSize: 13, color: "#64748b" }}>
              Carregando mensagens...
            </div>
          ) : !selectedConversationId ? (
            <div style={{ fontSize: 13, color: "#64748b" }}>
              Selecione um chat na coluna à esquerda.
            </div>
          ) : messages.length === 0 ? (
            <div style={{ fontSize: 13, color: "#64748b" }}>
              Nenhuma mensagem registrada para este chat.
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {messages.map((msg) => {
                const isUser = msg.role === "user";
                const created = new Date(msg.created_at);
                const timeStr = created.toLocaleString("pt-BR");

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      justifyContent: isUser ? "flex-start" : "flex-end",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "70%",
                        background: isUser ? "#020617" : "#0ea5e9",
                        color: isUser ? "#e2e8f0" : "#0b1120",
                        borderRadius: 16,
                        padding: 10,
                        fontSize: 14,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          marginBottom: 4,
                          opacity: 0.7,
                        }}
                      >
                        {isUser ? "Cliente" : "InfinixAI"} • {timeStr}
                      </div>
                      <div style={{ whiteSpace: "pre-wrap" }}>
                        {msg.message || "(sem texto)"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
