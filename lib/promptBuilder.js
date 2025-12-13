// lib/promptBuilder.js

/**
 * Converte qualquer coisa em texto seguro
 */
function normalizeText(value) {
  if (typeof value === "string") return value.trim();

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

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

/**
 * Gera o prompt da IA
 */
export function buildIaPrompt(settings, products, userMessage) {
  // ✅ NORMALIZA A MENSAGEM AQUI (ESSA É A CHAVE)
  const safeUserMessage = normalizeText(userMessage);

  const {
    company_name,
    business_description,
    products: productsText,
    tone,
    opening_hours,
    objection_price,
    objection_warranty,
    objection_delivery,
    objection_trust,
    objection_alternative,
  } = settings || {};

  const safeProducts = Array.isArray(products) ? products : [];

  const activeProducts = safeProducts.filter(
    (p) => p.is_active !== false
  );

  const inactiveProducts = safeProducts.filter(
    (p) => p.is_active === false
  );

  let productsBlock = "";

  if (safeProducts.length > 0) {
    const renderList = (list) =>
      list
        .slice(0, 50)
        .map((p) => {
          const name = p.name || "(sem nome)";
          const price =
            p.price !== null && p.price !== undefined
              ? ` - R$ ${Number(p.price).toFixed(2)}`
              : "";
          const desc = p.description ? ` – ${p.description}` : "";
          const stock = p.is_active === false ? " (SEM ESTOQUE)" : "";
          return `• ${name}${price}${desc}${stock}`;
        })
        .join("\n");

    productsBlock = `
PRODUTOS / SERVIÇOS:

Disponíveis:
${activeProducts.length ? renderList(activeProducts) : "(nenhum disponível)"}

${
  inactiveProducts.length
    ? `Indisponíveis:
${renderList(inactiveProducts)}`
    : ""
}
`;
  } else if (productsText) {
    productsBlock = `
Produtos informados pelo cliente:
${productsText}
`;
  } else {
    productsBlock = `
Nenhum produto cadastrado.
Não invente preços ou informações.
`;
  }

  let objectionsBlock = "";

  if (
    objection_price ||
    objection_warranty ||
    objection_delivery ||
    objection_trust ||
    objection_alternative
  ) {
    objectionsBlock = `
REGRAS PARA OBJEÇÕES:
${objection_price ? `- Preço: ${objection_price}` : ""}
${objection_warranty ? `- Garantia: ${objection_warranty}` : ""}
${objection_delivery ? `- Entrega: ${objection_delivery}` : ""}
${objection_trust ? `- Confiança: ${objection_trust}` : ""}
${objection_alternative ? `- Alternativas: ${objection_alternative}` : ""}
`;
  }

  return `
Você é a InfinixAI, atendente virtual da empresa "${company_name || "empresa"}".

Sobre o negócio:
${business_description || "Sem descrição."}

${productsBlock}

Horário de atendimento:
${opening_hours || "Não informado."}

Tom de voz:
${tone || "Amigável, profissional e objetivo."}

${objectionsBlock}

REGRAS:
- Responda sempre em português do Brasil
- Seja humano, claro e direto
- Não invente preços
- Não diga que é uma IA

Mensagem do cliente:
"${safeUserMessage}"
`.trim();
}
