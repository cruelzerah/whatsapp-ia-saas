// pages/update-password.js
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    if (password !== confirm) {
      setMessage("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      console.error(error);
      setMessage("Erro ao atualizar senha. Tente novamente.");
    } else {
      setMessage("Senha atualizada com sucesso! Você já pode fazer login.");
    }

    setLoading(false);
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
      <form
        onSubmit={handleSubmit}
        style={{
          maxWidth: 400,
          width: "100%",
          background: "#020617",
          borderRadius: 16,
          border: "1px solid #1e293b",
          padding: 24,
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        }}
      >
        <h1 style={{ fontSize: 20, marginBottom: 12 }}>Definir nova senha</h1>

        <label style={{ display: "block", marginBottom: 12, fontSize: 14 }}>
          Nova senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              marginTop: 4,
              padding: 8,
              borderRadius: 8,
              border: "1px solid #1e293b",
              background: "#020617",
              color: "#e2e8f0",
            }}
          />
        </label>

        <label style={{ display: "block", marginBottom: 16, fontSize: 14 }}>
          Confirmar senha
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            style={{
              width: "100%",
              marginTop: 4,
              padding: 8,
              borderRadius: 8,
              border: "1px solid #1e293b",
              background: "#020617",
              color: "#e2e8f0",
            }}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px 16px",
            borderRadius: 999,
            border: "none",
            background: loading ? "#082f49" : "#0ea5e9",
            color: "#0b1120",
            fontWeight: 600,
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "Salvando..." : "Salvar nova senha"}
        </button>

        {message && (
          <p style={{ marginTop: 12, fontSize: 13, color: "#e2e8f0" }}>
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
