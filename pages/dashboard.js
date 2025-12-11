// pages/dashboard.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { buildIaPrompt } from "../lib/promptBuilder";

const SAAS_TITLE = "InfinixAI – Painel de Configurações da IA";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // campos do formulário
  const [companyName, setCompanyName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [products, setProducts] = useState("");

  // horário de atendimento
  const [openingHours, setOpeningHours] = useState("");

  // tom de voz
  const [toneMode, setToneMode] = useState("informal"); // informal | formal | custom
  const [customTone, setCustomTone] = useState("");

  // objeções padrão
  const [objectionPrice, setObjectionPrice] = useState("");
  const [objectionWarranty, setObjectionWarranty] = useState("");
  const [objectionDelivery, setObjectionDelivery] = useState("");
  const [objectionTrust, setObjectionTrust] = useState("");
  const [objectionAlternative, setObjectionAlternative] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [promptPreview, setPromptPreview] = useState("");

  // carrega usuário logado
  useEffect(() => {
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        window.location.href = "/login";
        return;
      }

      setUser(data.user);

      // salva o user_id no navegador para outras telas (como /chat-teste)
      if (typeof window !== "undefined") {
        window.localStorage.setItem("infinix_user_id", data.user.id);
      }

      setLoadingUser(false);
    }

    loadUser();
  }, []);

  // carrega configurações do negócio
  useEffect(() => {
    if (!user) return;

    async function loadCompanySettings() {
      setMessage("");

      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error(error);
        setMessage("Erro ao carregar dados do negócio.");
        return;
      }

      if (data) {
        setCompanyName(data.company_name || "");
        setBusinessDescription(data.business_description || "");
        setProducts(data.products || "");

        setOpeningHours(data.opening_hours || "");

        setObjectionPrice(data.objection_price || "");
        setObjectionWarranty(data.objection_warranty || "");
        setObjectionDelivery(data.objection_delivery || "");
        setObjectionTrust(data.objection_trust || "");
        setObjectionAlternative(data.objection_alternative || "");

        const t = data.tone || "informal";
        const presets = ["informal", "formal"];

        if (presets.includes(t)) {
          setToneMode(t);
          setCustomTone("");
        } else if (t && t.length > 0) {
          setToneMode("custom");
          setCustomTone(t);
        } else {
          setToneMode("informal");
          setCustomTone("");
        }
      }
    }

    loadCompanySettings();
  }, [user]);

  // gera prévia do prompt sempre que os dados mudarem
  useEffect(() => {
    const toneToUse =
      toneMode === "custom" && customTone.trim().length > 0
        ? customTone.trim()
        : toneMode;

    const settings = {
      company_name: companyName,
      business_description: businessDescription,
      products, // texto livre com regras e exemplos
      tone: toneToUse,
      opening_hours: openingHours,
      objection_price: objectionPrice,
      objection_warranty: objectionWarranty,
      objection_delivery: objectionDelivery,
      objection_trust: objectionTrust,
      objection_alternative: objectionAlternative,
    };

    // mensagem de exemplo só para gerar a prévia
    const fakeUserMessage =
      "Oi, queria saber preço, garantia e prazo de entrega de um produto.";

    // buildIaPrompt(settings, userMessage, productsArray)
    // aqui productsArray fica vazio, pq a lista vem da tela /produtos de verdade
    const prompt = buildIaPrompt(settings, fakeUserMessage, []);
    setPromptPreview(prompt);
  }, [
    companyName,
    businessDescription,
    products,
    toneMode,
    customTone,
    openingHours,
    objectionPrice,
    objectionWarranty,
    objectionDelivery,
    objectionTrust,
    objectionAlternative,
  ]);

  async function handleSave(e) {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage("");

    const toneToSave =
      toneMode === "custom" && customTone.trim().length > 0
        ? customTone.trim()
        : toneMode;

    const payload = {
      user_id: user.id,
      company_name: companyName,
      business_description: businessDescription,
      products,
      tone: toneToSave,
      opening_hours: openingHours,
      objection_price: objectionPrice,
      objection_warranty: objectionWarranty,
      objection_delivery: objectionDelivery,
      objection_trust: objectionTrust,
      objection_alternative: objectionAlternative,
    };

    const { error } = await supabase
      .from("company_settings")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      console.error(error);
      setMessage("Erro ao salvar. Tente novamente.");
    } else {
      setMessage("Informações salvas com sucesso! ✅");
    }

    setSaving(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loadingUser) {
    return <div style={{ padding: 24 }}>Carregando...</div>;
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
      {/* topo */}
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
            Preencha abaixo as informações do seu negócio (loja, clínica,
            escritório, serviço, etc.) e como a InfinixAI deve atender as
            pessoas em seu nome.
          </p>
        </div>

        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
            Logado como:
          </p>
          <p style={{ fontSize: 14, marginBottom: 8 }}>{user.email}</p>
          <button
            onClick={handleLogout}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: "1px solid #1e293b",
              background: "transparent",
              color: "#e2e8f0",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Sair
          </button>
        </div>
      </header>

      {/* card principal */}
      <main
        style={{
          maxWidth: 900,
          margin: "0 auto",
          background: "#020617",
          borderRadius: 16,
          padding: 24,
          border: "1px solid #1e293b",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        }}
      >
        <form onSubmit={handleSave}>
          {/* NOME DO NEGÓCIO */}
          <label style={{ display: "block", marginBottom: 16, fontSize: 14 }}>
            Nome do negócio
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              placeholder="Ex: Nepo Cosméticos, Clínica Sorriso Perfeito, Studio X, Escritório Tal..."
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

          {/* DESCRIÇÃO DO NEGÓCIO */}
          <label style={{ display: "block", marginBottom: 16, fontSize: 14 }}>
            Descreva seu negócio
            <textarea
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value)}
              rows={4}
              placeholder="Ex: Clínica odontológica especializada em implantes e ortodontia. Atendemos adultos e crianças, com foco em atendimento humanizado e explicações claras sobre cada procedimento."
              style={{
                width: "100%",
                marginTop: 4,
                padding: 8,
                borderRadius: 8,
                border: "1px solid #1e293b",
                background: "#020617",
                color: "#e2e8f0",
                resize: "vertical",
              }}
            />
          </label>

          {/* HORÁRIO DE ATENDIMENTO */}
          <label style={{ display: "block", marginBottom: 16, fontSize: 14 }}>
            Horário de atendimento
            <input
              type="text"
              value={openingHours}
              onChange={(e) => setOpeningHours(e.target.value)}
              placeholder='Ex: Segunda a sexta, das 9h às 18h. Sábado das 9h às 13h. (Se estiver fechado, peça para chamar no horário comercial.)'
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

          {/* O QUE A IA DEVE FAZER */}
          <label style={{ display: "block", marginBottom: 16, fontSize: 14 }}>
            O que a InfinixAI deve fazer? (regras e exemplos)
            <textarea
              value={products}
              onChange={(e) => setProducts(e.target.value)}
              rows={6}
              placeholder={`Explique, com bastante detalhe, como a InfinixAI deve atender em nome do seu negócio. Por exemplo:

- Como ela deve se apresentar? (Ex: "Oi, eu sou a InfinixAI, assistente virtual da Clínica Sorriso Perfeito, tudo bem?")
- Quais tipos de dúvidas ela precisa saber responder? (preço, procedimentos, agenda, horários, produtos, planos, etc.)
- O que pode e o que NÃO pode prometer (prazo, descontos, garantias, políticas de cancelamento, procedimentos que exigem avaliação presencial...).
- Como deve oferecer serviços, planos, pacotes ou produtos complementares.
- Exemplos de perguntas frequentes e respostas ideais para o seu negócio.`}
              style={{
                width: "100%",
                marginTop: 4,
                padding: 8,
                borderRadius: 8,
                border: "1px solid #1e293b",
                background: "#020617",
                color: "#e2e8f0",
                resize: "vertical",
              }}
            />
          </label>

          {/* TOM DE VOZ */}
          <label style={{ display: "block", marginBottom: 8, fontSize: 14 }}>
            Tom de voz da InfinixAI
            <select
              value={toneMode}
              onChange={(e) => setToneMode(e.target.value)}
              style={{
                width: "100%",
                marginTop: 4,
                padding: 8,
                borderRadius: 8,
                border: "1px solid #1e293b",
                background: "#020617",
                color: "#e2e8f0",
              }}
            >
              <option value="informal">
                Informal (abreviações, emojis, bem amigável)
              </option>
              <option value="formal">
                Formal (fala comum, educada, sem muitas gírias)
              </option>
              <option value="custom">
                Personalizado (InfinixAI copia o seu jeito de falar)
              </option>
            </select>
          </label>

          <p
            style={{
              fontSize: 12,
              color: "#64748b",
              marginBottom: toneMode === "custom" ? 8 : 16,
            }}
          >
            Escolha um estilo pronto ou use a opção{" "}
            <strong>Personalizado</strong> para descrever exatamente como você
            conversa com seus clientes. A InfinixAI vai atender como se fosse
            você.
          </p>

          {/* TOM PERSONALIZADO */}
          {toneMode === "custom" && (
            <label
              style={{ display: "block", marginBottom: 16, fontSize: 14 }}
            >
              Descreva o seu jeito de falar com as pessoas
              <textarea
                value={customTone}
                onChange={(e) => setCustomTone(e.target.value)}
                rows={4}
                placeholder={`Exemplos do que você pode escrever:

- "Sou bem informal, uso algumas abreviações e emojis, chamo as pessoas de 'amor' ou 'amigo(a)' às vezes."
- "Gosto de ser direto(a), educado(a) e claro(a), sem enrolação."
- "Falo como amigo(a) dos clientes/pacientes, elogio, motivo e mantenho uma energia positiva."

A InfinixAI vai usar essa descrição para conversar do mesmo jeito que você. Poucas pessoas vão perceber que é uma IA 😉`}
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #1e293b",
                  background: "#020617",
                  color: "#e2e8f0",
                  resize: "vertical",
                }}
              />
            </label>
          )}

          {/* BLOCO DE OBJEÇÕES */}
          <div
            style={{
              marginTop: 24,
              marginBottom: 8,
              paddingTop: 16,
              borderTop: "1px solid #1e293b",
            }}
          >
            <h2 style={{ fontSize: 16, marginBottom: 8 }}>
              Como quebrar objeções (preço, prazo, garantia...)
            </h2>
            <p
              style={{
                fontSize: 12,
                color: "#64748b",
                marginBottom: 12,
              }}
            >
              Aqui você define respostas padrão para as objeções mais comuns.
              A InfinixAI vai usar essas informações automaticamente para
              defender seu preço, prazo, garantia e passar confiança.
            </p>

            <label
              style={{ display: "block", marginBottom: 10, fontSize: 14 }}
            >
              Objeção de preço (está caro, não tem desconto?)
              <textarea
                value={objectionPrice}
                onChange={(e) => setObjectionPrice(e.target.value)}
                rows={3}
                placeholder={`Ex: Nosso preço é focado em qualidade e segurança. Usamos produtos originais, oferecemos suporte e garantia, e muitos clientes nos escolhem justamente pela confiança e resultado.`}
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #1e293b",
                  background: "#020617",
                  color: "#e2e8f0",
                  resize: "vertical",
                }}
              />
            </label>

            <label
              style={{ display: "block", marginBottom: 10, fontSize: 14 }}
            >
              Objeção de prazo / entrega
              <textarea
                value={objectionDelivery}
                onChange={(e) => setObjectionDelivery(e.target.value)}
                rows={3}
                placeholder={`Ex: Trabalhamos com prazos reais, para entregar com segurança e qualidade. Sempre que possível, antecipamos o prazo. Assim que o pedido é confirmado, já começamos o processo.`}
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #1e293b",
                  background: "#020617",
                  color: "#e2e8f0",
                  resize: "vertical",
                }}
              />
            </label>

            <label
              style={{ display: "block", marginBottom: 10, fontSize: 14 }}
            >
              Objeção de garantia / resultado
              <textarea
                value={objectionWarranty}
                onChange={(e) => setObjectionWarranty(e.target.value)}
                rows={3}
                placeholder={`Ex: Oferecemos garantia dentro de X dias para defeitos de fabricação/serviço. Nosso foco é que você fique satisfeito(a) e, se tiver qualquer problema, auxiliamos no pós-venda.`}
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #1e293b",
                  background: "#020617",
                  color: "#e2e8f0",
                  resize: "vertical",
                }}
              />
            </label>

            <label
              style={{ display: "block", marginBottom: 10, fontSize: 14 }}
            >
              Objeção de confiança (é confiável? já atenderam muita gente?)
              <textarea
                value={objectionTrust}
                onChange={(e) => setObjectionTrust(e.target.value)}
                rows={3}
                placeholder={`Ex: Já atendemos centenas de clientes, temos avaliações positivas e priorizamos um atendimento transparente. O objetivo é que você se sinta seguro(a) em cada etapa.`}
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #1e293b",
                  background: "#020617",
                  color: "#e2e8f0",
                  resize: "vertical",
                }}
              />
            </label>

            <label
              style={{ display: "block", marginBottom: 10, fontSize: 14 }}
            >
              Quando o cliente não quer aquele produto (sugerir alternativa)
              <textarea
                value={objectionAlternative}
                onChange={(e) => setObjectionAlternative(e.target.value)}
                rows={3}
                placeholder={`Ex: Se aquele produto não for ideal para você, indicamos outras opções com ótimo custo-benefício e que podem atender o que você precisa hoje.`}
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #1e293b",
                  background: "#020617",
                  color: "#e2e8f0",
                  resize: "vertical",
                }}
              />
            </label>
          </div>

          {/* BOTÃO SALVAR */}
          <button
            type="submit"
            disabled={saving}
            style={{
              marginTop: 8,
              padding: "10px 24px",
              borderRadius: 999,
              border: "none",
              background: saving ? "#082f49" : "#0ea5e9",
              color: "#0b1120",
              fontWeight: 600,
              cursor: saving ? "default" : "pointer",
            }}
          >
            {saving ? "Salvando..." : "Salvar informações da InfinixAI"}
          </button>

          {message && (
            <p style={{ marginTop: 12, fontSize: 14, color: "#22c55e" }}>
              {message}
            </p>
          )}

          {/* PRÉVIA DO CÉREBRO DA IA */}
          <div
            style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop: "1px solid #1e293b",
            }}
          >
            <h2 style={{ fontSize: 16, marginBottom: 8 }}>
              Como a InfinixAI vai pensar (prévia do prompt interno)
            </h2>
            <p
              style={{
                fontSize: 12,
                color: "#64748b",
                marginBottom: 8,
              }}
            >
              Este texto é o "cérebro" da InfinixAI. Ele é gerado
              automaticamente a partir das informações que você preencheu
              acima. No futuro, é isso que será enviado para a InfinixAI
              atender as pessoas como se fosse uma atendente humana.
            </p>
            <textarea
              readOnly
              value={promptPreview}
              rows={12}
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 8,
                border: "1px solid #1e293b",
                background: "#020617",
                color: "#e2e8f0",
                resize: "vertical",
                fontSize: 12,
                lineHeight: 1.4,
                whiteSpace: "pre-wrap",
              }}
            />
          </div>
        </form>
      </main>
    </div>
  );
}
