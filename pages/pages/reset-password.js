// pages/reset-password.js
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  // Garante que o Supabase capture o token da URL e crie a sessão
  useEffect(() => {
    // supabase-js já trata o hash da URL automaticamente ao inicializar
    // Aqui não precisamos fazer nada se você já criou o client normalmente.
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("");
    setError("");

    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setError(error.message || "Erro ao atualizar senha.");
        return;
      }

      setStatus("Senha alterada com sucesso! Você já pode fazer login.");
      // Se quiser, pode redirecionar automaticamente:
      // setTimeout(() => (window.location.href = "/login"), 2000);
    } catch (err) {
      console.error(err);
      setError("Erro inesperado ao atualizar senha.");
    } finally {
      setLoading(false);
    }
  }

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
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#020617",
          borderRadius: 16,
          border: "1px solid #1e293b",
          boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
          padding: 24,
        }}
      >
        <h1 style={{ fontSize: 22, marginBottom: 8, textAlign: "center" }}>
          Redefinir senha
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "#64748b",
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          Escolha uma nova senha para sua conta InfinixAI.
        </p>

        {status && (
          <div
            style={{
              marginBottom: 12,
              padding: 8,
              borderRadius: 8,
              background: "#022c22",
              border: "1px solid #16a34a",
              fontSize: 13,
              color: "#bbf7d0",
            }}
          >
            {status}
          </div>
        )}

        {error && (
          <div
            style={{
              marginBottom: 12,
              padding: 8,
              borderRadius: 8,
              background: "#451a03",
              border: "1px solid #f97316",
              fontSize: 13,
              color: "#fed7aa",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginBottom: 12, fontSize: 14 }}>
            Nova senha
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                marginTop: 4,
                padding: 8,
                borderRadius: 8,
                border: "1px solid #1e293b",
                background: "#020617",
                color: "#e2e8f0",
                fontSize: 14,
              }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 16, fontSize: 14 }}>
            Confirmar nova senha
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              style={{
                width: "100%",
                marginTop: 4,
                padding: 8,
                borderRadius: 8,
                border: "1px solid #1e293b",
                background: "#020617",
                color: "#e2e8f0",
                fontSize: 14,
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              marginTop: 8,
              padding: "10px 16px",
              borderRadius: 999,
              border: "none",
              background: loading ? "#082f49" : "#0ea5e9",
              color: "#0b1120",
              fontWeight: 600,
              cursor: loading ? "default" : "pointer",
              fontSize: 15,
            }}
          >
            {loading ? "Atualizando..." : "Salvar nova senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
