// lib/promptBuilder.js

export function buildIaPrompt(settings = {}, products = [], userMessage = "") {
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

  const safeMessage = typeof userMessage === "string" ? userMessage : String(userMessage);

  const safeProducts = Array.isArray(products) ? products : [];

  const activeProducts = safeProducts.filter(
    (p) => p?.is_active === true || p?.is_active === null || p?.is_active === undefined
  );

  const inactiveProducts = safeProducts.filter((p) => p?.is_active === false);

  const renderProduct = (p) => {
    const name = p?.name || "Produto";
    const category = p?.category ? ` [${p.category}]` : "";
    const price =
      p?.price !== null && p?.price !== undefined
        ? ` - R$ ${Number(p.price).toFixed(2)}`
        : "";
    const desc = p?.description ? ` – ${p.description}` : "";
    const stock = p?.is_active === false ? " (SEM ESTOQUE)" : "";

    return `• ${name}${category}${price}${desc}${stock}`;
  };

  let productsBlock = "";

  if (safeProducts.length > 0) {
    productsBlock = `
CATÁLOGO:

Produtos disponíveis:
${activeProducts.length ? activeProducts.map(renderProduct).join("\n") : "- Nenhum produto disponível."}

${
  inactiveProducts.length
    ? `
Produtos sem estoque (NÃO vender):
${inactiveProducts.map(renderProduct).join("\n")}
`
    : ""
}
`;
  } else {
    productsBlock = `
Nenhum produto cadastrado.
- Não invente preços.
- Oriente o cliente a falar com a loja.
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
COMO RESPONDER OBJEÇÕES:

${objection_price ? `• Preço: ${objection_price}` : ""}
${objection_warranty ? `• Garantia: ${objection_warranty}` : ""}
${objection_delivery ? `• Entrega: ${objection_delivery}` : ""}
${objection_trust ? `• Confiança: ${objection_trust}` : ""}
${objection_alternative ? `• Alternativas: ${objection_alternative}` : ""}
`;
  }

  return `
Você é a InfinixAI, atendente virtual da empresa "${company_name || "Empresa"}".

SOBRE A EMPRESA:
${business_description || "Descrição não informada."}

HORÁRIO:
${opening_hours || "Não informado."}

TOM DE VOZ:
${tone || "Amigável, humano e profissional."}

${productsBlock}

${objectionsBlock}

REGRAS:
- Responda em português do Brasil
- Nunca diga que é IA
- Não invente preços ou prazos
- Seja claro e direto
- Use emojis com moderação 🙂

MENSAGEM DO CLIENTE:
"${safeMessage}"

Responda como um vendedor humano.
`;
}
