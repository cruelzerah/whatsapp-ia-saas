// lib/promptBuilder.js

function normalizeText(value) {
  if (typeof value === "string") return value.trim();

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

  return String(value || "");
}

export function buildIaPrompt(settings, products, userMessage) {
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

  let productsBlock = "";

  if (safeProducts.length > 0) {
    productsBlock = safeProducts
      .slice(0, 30)
      .map((p) => {
        const name = p.name || "Produto";
        const price =
          p.price !== null && p.price !== undefined
            ? ` - R$ ${Number(p.price).toFixed(2)}`
            : "";
        const desc = p.description ? ` – ${p.description}` : "";
        const stock = p.is_active === false ? " (SEM ESTOQUE)" : "";
        return `• ${name}${price}${desc}${stock}`;
      })
      .join("\n");
  } else if (productsText) {
    productsBlock = productsText;
  } else {
    productsBlock = "Nenhum produto cadastrado.";
  }

  return `
Você é a InfinixAI, atendente virtual da empresa "${company_name || "empresa"}".

Descrição do negócio:
${business_description || "Não informada."}

Produtos:
${productsBlock}

Horário de atendimento:
${opening_hours || "Não informado."}

Tom de voz:
${tone || "Amigável e profissional."}

Regras:
- Responda sempre em português do Brasil
- Não invente preços
- Não diga que é uma IA

Mensagem do cliente:
"${safeUserMessage}"
`.trim();
}
