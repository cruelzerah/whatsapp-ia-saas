/**
 * Gera o prompt que será enviado para a IA.
 * Esta versão é 100% segura contra valores não-string
 */

function safeText(value) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);

  if (value && typeof value === "object") {
    if (typeof value.message === "string") return value.message.trim();
    if (typeof value.text === "string") return value.text.trim();
    if (typeof value.body === "string") return value.body.trim();

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return "";
}

export function buildIaPrompt(settings = {}, products = [], userMessage) {
  const {
    company_name,
    business_description,
    tone,
    opening_hours,
    objection_price,
    objection_warranty,
    objection_delivery,
    objection_trust,
    objection_alternative,
  } = settings;

  const message = safeText(userMessage);

  // =========================
  // PRODUTOS
  // =========================
  const safeProducts = Array.isArray(products) ? products : [];

  const activeProducts = safeProducts.filter(
    (p) => p?.is_active !== false
  );

  const inactiveProducts = safeProducts.filter(
    (p) => p?.is_active === false
  );

  let productsBlock = "";

  if (safeProducts.length > 0) {
    const serialize = (list) =>
      list
        .slice(0, 50)
        .map((p) => {
          const name = safeText(p.name) || "Produto";
          const price =
            p.price !== null && p.price !== undefined
              ? ` - R$ ${Number(p.price).toFixed(2)}`
              : "";
          const desc = p.description ? ` – ${safeText(p.description)}` : "";
          const status =
            p.is_active === false ? " (SEM ESTOQUE)" : " (DISPONÍVEL)";

          return `• ${name}${price}${desc}${status}`;
        })
        .join("\n");

    productsBlock = `
PRODUTOS / SERVIÇOS CADASTRADOS:

Produtos disponíveis:
${activeProducts.length ? serialize(activeProducts) : "Nenhum produto disponível no momento."}

${
  inactiveProducts.length
    ? `Produtos sem estoque (NÃO oferecer):
${serialize(inactiveProducts)}`
    : ""
}
`;
  } else {
    productsBlock = `
Nenhum produto cadastrado.
- Não invente preços
- Oriente o cliente a confirmar diretamente com a loja
`;
  }

  // =========================
  // OBJEÇÕES
  // =========================
  let objectionsBlock = "";

  if (
    objection_price ||
    objection_warranty ||
    objection_delivery ||
    objection_trust ||
    objection_alternative
  ) {
    objectionsBlock = `
REGRAS PARA QUEBRAR OBJEÇÕES:

${objection_price ? `• Preço: ${safeText(objection_price)}` : ""}
${objection_warranty ? `• Garantia: ${safeText(objection_warranty)}` : ""}
${objection_delivery ? `• Entrega/Frete: ${safeText(objection_delivery)}` : ""}
${objection_trust ? `• Confiança: ${safeText(objection_trust)}` : ""}
${objection_alternative ? `• Alternativas: ${safeText(objection_alternative)}` : ""}
`;
  }

  // =========================
  // PROMPT FINAL
  // =========================
  return `
Você é a IA vendedora da empresa "${safeText(company_name) || "Empresa"}".

Descrição do negócio:
${safeText(business_description) || "Descrição não informada."}

${productsBlock}

Horário de atendimento:
${safeText(opening_hours) || "Horário não informado."}

Estilo de atendimento:
${safeText(tone) || "Amigável, profissional e objetiva."}

${objectionsBlock}

REGRAS OBRIGATÓRIAS:
- Responda SEMPRE em português do Brasil
- Fale como um vendedor humano
- Seja clara, educada e objetiva
- NÃO invente preços
- NÃO ofereça produtos sem estoque
- Se não souber algo, seja honesta
- Nunca diga que é uma IA

Mensagem do cliente:
"${message}"
`.trim();
}
