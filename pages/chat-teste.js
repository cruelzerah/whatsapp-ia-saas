// pages/chat-teste.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ChatTeste() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  // 👇 novo: id da janela de conversa
  const [conversationId, setConversationId] = useState(null);

  // Carrega o usuário logado para pegar o ID
  useEffect(() => {
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        setUser(null);
      } else {
        setUser(data.user);
      }

      setLoadingUser(false);
    }

    loadUser();
  }, []);

  async function handleSend(e) {
    e.preventDefault();
    setError("");
    setReply("");

    if (!user) {
      setError(
        "Não encontrei o ID do usuário. Entre no painel da InfinixAI (dashboard) e faça login antes de testar."
      );
      return;
    }

    if (!message.trim()) {
      setError("Digite uma mensagem para testar.");
      return;
    }

    try {
      setSending(true);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          userId: user.id,          // 👈 ID do usuário
          conversationId,           // 👈 id da conversa (pode ser null na 1ª vez)
        }),
      });

      const data = await res.json();
      console.log("Resposta da API /api/chat:", data);

      if (!res.ok) {
        setError(data.error || "Erro ao falar com a InfinixAI.");
        return;
      }

      // 👇 guarda o ID da conversa devolvido pela API
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      setReply(data.reply || "(Resposta vazia)");
      setMessage(""); // se quiser limpar o campo depois de enviar
    } catch (err) {
      console.error(err);
      setError("Erro inesperado ao chamar a InfinixAI.");
    } finally {
      setSending(false);
    }
  }

  const userIdLabel = loadingUser
    ? "carregando..."
    : user
    ? user.id
    : "nenhum (faça login no painel primeiro)";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#e2e8f0",
        fontFamily: "system-ui, sans-serif",
        padding: 24,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "#020617",
          borderRadius: 16,
          padding: 24,
          border: "1px solid #1e293b",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        }}
      >
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>
          InfinixAI – Teste de Conversa
        </h1>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
          Envie uma mensagem como se fosse um cliente falando com a sua empresa.
          A InfinixAI vai responder usando as configurações salvas no painel.
        </p>

        <p style={{ fontSize: 12, color: "#a3e635", marginBottom: 4 }}>
          <strong>User ID carregado:</strong> {userIdLabel}
        </p>

        {/* 👇 debug opcional: mostra o ID da conversa atual */}
        {conversationId && (
          <p style={{ fontSize: 11, color: "#38bdf8", marginBottom: 8 }}>
            <strong>Conversa atual:</strong> {conversationId}
          </p>
        )}

        <form onSubmit={handleSend}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Ex: vcs tem xiaomi ?"
            style={{
              width: "100%",
              marginTop: 4,
              marginBottom: 12,
              padding: 8,
              borderRadius: 8,
              border: "1px solid #1e293b",
              background: "#020617",
              color: "#e2e8f0",
              resize: "vertical",
            }}
          />

          <button
            type="submit"
            disabled={sending}
            style={{
              width: "100%",
              padding: "10px 24px",
              borderRadius: 999,
              border: "none",
              background: sending ? "#082f49" : "#22c55e",
              color: "#0b1120",
              fontWeight: 600,
              cursor: sending ? "default" : "pointer",
              marginBottom: 12,
            }}
          >
            {sending ? "Enviando para a InfinixAI..." : "Enviar para a InfinixAI"}
          </button>
        </form>

        {error && (
          <p style={{ fontSize: 13, color: "#f97316", marginBottom: 8 }}>
            {error}
          </p>
        )}

        {reply && (
          <div
            style={{
              marginTop: 8,
              padding: 12,
              borderRadius: 8,
              border: "1px solid #1e293b",
              background: "#020617",
            }}
          >
            <p
              style={{
                fontSize: 12,
                color: "#64748b",
                marginBottom: 4,
              }}
            >
              Resposta da InfinixAI:
            </p>
            <p style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{reply}</p>
          </div>
        )}
      </div>
    </div>
  );
}
