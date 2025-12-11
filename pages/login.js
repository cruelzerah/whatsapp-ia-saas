// pages/login.js
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function LoginPage() {
  const [mode, setMode] = useState("login"); // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function resetMessages() {
    setMessage("");
    setError("");
  }

  async function handleLogin(e) {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Mensagem especial se o email não estiver confirmado
        if (
          error.message &&
          error.message.toLowerCase().includes("email not confirmed")
        ) {
          setError(
            "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada (e a pasta de spam) e clique no link de confirmação."
          );
        } else {
          setError(error.message || "Não foi possível entrar.");
        }
        return;
      }

      if (data.session) {
        // Redireciona para o painel
        window.location.href = "/dashboard";
      } else {
        setError("Não foi possível criar sessão. Tente novamente.");
      }
    } catch (err) {
      console.error(err);
      setError("Erro inesperado ao fazer login.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      if (password !== confirmPassword) {
        setError("As senhas não conferem.");
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        // options: { data: {...} } // se quiser salvar mais infos do usuário
      });

      if (error) {
        setError(error.message || "Erro ao criar conta.");
        return;
      }

      setMessage(
        "Cadastro criado! Enviamos um e-mail de confirmação. Clique no link que chegou na sua caixa de entrada para ativar sua conta."
      );
      setMode("login");
    } catch (err) {
      console.error(err);
      setError("Erro inesperado ao criar conta.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
        // se preferir /reset-password, troque aqui e crie essa página
      });

      if (error) {
        setError(error.message || "Erro ao enviar e-mail de recuperação.");
        return;
      }

      setMessage(
        "Se este e-mail estiver cadastrado, enviamos um link para redefinir sua senha. Verifique sua caixa de entrada."
      );
      setMode("login");
    } catch (err) {
      console.error(err);
      setError("Erro inesperado ao solicitar recuperação de senha.");
    } finally {
      setLoading(false);
    }
  }

  // -------- UI --------

  const isLogin = mode === "login";
  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";

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
        <h1 style={{ fontSize: 24, marginBottom: 8, textAlign: "center" }}>
          InfinixAI – Acesso
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "#64748b",
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          Faça login, crie sua conta ou recupere sua senha.
        </p>

        {/* Aba de modos */}
        <div
          style={{
            display: "flex",
            background: "#020617",
            borderRadius: 999,
            border: "1px solid #1e293b",
            marginBottom: 16,
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode("login");
              resetMessages();
            }}
            style={{
              flex: 1,
              padding: "8px 0",
              fontSize: 13,
              cursor: "pointer",
              border: "none",
              background: isLogin ? "#0ea5e9" : "transparent",
              color: isLogin ? "#0b1120" : "#e2e8f0",
            }}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              resetMessages();
            }}
            style={{
              flex: 1,
              padding: "8px 0",
              fontSize: 13,
              cursor: "pointer",
              border: "none",
              background: isSignup ? "#0ea5e9" : "transparent",
              color: isSignup ? "#0b1120" : "#e2e8f0",
            }}
          >
            Criar conta
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("forgot");
              resetMessages();
            }}
            style={{
              flex: 1,
              padding: "8px 0",
              fontSize: 13,
              cursor: "pointer",
              border: "none",
              background: isForgot ? "#0ea5e9" : "transparent",
              color: isForgot ? "#0b1120" : "#e2e8f0",
            }}
          >
            Esqueci
          </button>
        </div>

        {message && (
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
            {message}
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

        {/* Formulário principal */}
        <form
          onSubmit={
            isLogin ? handleLogin : isSignup ? handleSignup : handleForgotPassword
          }
        >
          <label style={{ display: "block", marginBottom: 12, fontSize: 14 }}>
            E-mail
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          {!isForgot && (
            <label style={{ display: "block", marginBottom: 12, fontSize: 14 }}>
              Senha
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
          )}

          {isSignup && (
            <label style={{ display: "block", marginBottom: 12, fontSize: 14 }}>
              Confirmar senha
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
          )}

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
            {loading
              ? "Processando..."
              : isLogin
              ? "Entrar"
              : isSignup
              ? "Criar conta"
              : "Enviar link de recuperação"}
          </button>
        </form>
      </div>
    </div>
  );
}
