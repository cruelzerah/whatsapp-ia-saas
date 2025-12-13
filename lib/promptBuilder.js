// lib/promptBuilder.js

/**
 * Gera o prompt que será enviado para a IA
 */
export function buildIaPrompt(settings, products, userMessage) {
  const safeText = (v) => {
    try {
      if (v === null || v === undefined) return "";
      if (typeof v === "string") return v;
      if (typeof v === "number" || typeof v === "boolean") return String(v);

      if (typeof v === "object") {
        if (typeof v.message === "string") return v.message;
        if (typeof v.text === "string") return v.text;
        if (typeof v.body === "string") return v.body;
        return JSON.stringify(v);
      }

      return String(v);
    } catch {
      return "";
    }
  };

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
    (p) => p.is_active === true || p.is_active === null || p.is_active === undefined
  );

  const inactiveProducts = safeProducts.filter((p) => p.is_active === false);

  const serializeList = (list) =>
    list
      .slice(0, 50)
      .map((p) => {
        const nome = safeText(p?.name) || "(sem nome)";
        const categoria = p?.category ? ` [${safeText(p.category)}]` : "";
        const preco =
          p?.price !== null && p?.price !== undefined && p?.price !== ""
            ? ` - preço: R$ ${Number(p.price).toFixed(2)}`
            : "";
        const desc = p?.description ? ` – ${safeText(p.description)}` : "";
        const estoque =
          typeof p?.is_active === "boolean"
            ? p.is_active
              ? " (DISPONÍVEL)"
              : " (SEM ESTOQUE NO MOMENTO)"
            : "";

        return `• ${nome}${categoria}${preco}${desc}${estoque}`;
      })
      .join("\n");

  let productsBlock = "";

  if (safeProducts.length > 0) {
    productsBlock = `
INFORMAÇÕES DE PRODUTOS / SERVIÇOS:

Produtos ATIVOS (pode vender):
${activeProducts.length ? serializeList(activeProducts) : "(nenhum produto ativo)"}

${
  inactiveProducts.length
    ? `Produtos SEM ESTOQUE (não oferecer):
${serializeList(inactiveProducts)}`
    : ""
}
`;
  } else if (productsText) {
    productsBlock = `
Produtos (texto livre do painel):
${safeText(productsText)}
`;
  } else {
    productsBlock = `
Nenhum produto cadastrado.
- Não invente preços ou detalhes.
- Oriente o cliente a confirmar com a loja.
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
REGRAS PARA QUEBRAR OBJEÇÕES (use como base e adapte para soar natural):
${objection_price ? `• Preço: ${safeText(objection_price)}` : ""}
${objection_warranty ? `• Garantia: ${safeText(objection_warranty)}` : ""}
${objection_delivery ? `• Entrega: ${safeText(objection_delivery)}` : ""}
${objection_trust ? `• Confiança: ${safeText(objection_trust)}` : ""}
${objection_alternative ? `• Alternativas: ${safeText(objection_alternative)}` : ""}
`;
  }

  return `
Você é a InfinixAI, atendente virtual da empresa "${safeText(company_name || "a empresa")}".

Sobre o negócio:
${safeText(business_description) || "(sem descrição fornecida)"}

${productsBlock}

Horário:
${safeText(opening_hours) || "não informado"}

Tom de atendimento:
${safeText(tone) || "amigável e profissional"}

${objectionsBlock}

REGRAS IMPORTANTES:
- Responda sempre em português do Brasil.
- Fale como um vendedor humano da empresa; nunca diga que é IA.
- Não invente preços; use somente os preços cadastrados.
- Não ofereça itens marcados como "SEM ESTOQUE NO MOMENTO".
- Seja objetivo, útil e vendedor.

Mensagem do cliente (responda em uma única resposta):
"${safeText(userMessage)}"
`;
}
