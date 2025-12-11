// pages/forgot-password.js
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      console.error(error);
      setMessage("Erro ao enviar o e-mail de recuperação. Tente novamente.");
    } else {
      setMessage(
        "Se o e-mail existir na base, enviamos um link para redefinir a senha. Confira sua caixa de entrada e spam."
      );
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
        <h1 style={{ fontSize: 20, marginBottom: 12 }}>Recuperar senha</h1>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
          Informe seu e-mail. Se ele estiver cadastrado, você receberá um link
          para redefinir a senha.
        </p>

        <label style={{ display: "block", marginBottom: 16, fontSize: 14 }}>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
          {loading ? "Enviando..." : "Enviar link de recuperação"}
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
