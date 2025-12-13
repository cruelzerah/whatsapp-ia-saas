// lib/promptBuilder.js

/**
 * Gera o prompt que será enviado para a IA
 *
 * @param {object} settings    - registro da tabela company_settings
 * @param {Array}  products    - lista de produtos/serviços
 * @param {string} userMessage - mensagem do cliente (JÁ NORMALIZADA)
 */
export function buildIaPrompt(settings = {}, products = [], userMessage = "") {
  const {
    company_name,
    business_description,
    tone,
    opening_hours,

    // objeções
    objection_price,
    objection_warranty,
    objection_delivery,
    objection_trust,
    objection_alternative,
  } = settings;

  // =========================
  // Produtos (proteção total)
  // =========================
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
    const stock =
      p?.is_active === false ? " (SEM ESTOQUE)" : " (DISPONÍVEL)";

    return `• ${name}${category}${price}${desc}${stock}`;
  };

  let productsBlock = "";

  if (safeProducts.length > 0) {
    productsBlock = `
CATÁLOGO DA EMPRESA:

Produtos disponíveis para venda:
${activeProducts.length > 0 ? activeProducts.map(renderProduct).join("\n") : "- Nenhum produto disponível no momento."}

${
  inactiveProducts.length > 0
    ? `
Produtos sem estoque (NÃO OFERECER, apenas informar se o cliente pedir):
${inactiveProducts.map(renderProduct).join("\n")}
`
    : ""
}
`;
  } else {
    productsBlock = `
Nenhum produto foi cadastrado ainda.
- Não invente preços ou detalhes.
- Oriente o cliente a falar com a loja.
`;
  }

  // =========================
  // Objeções
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
COMO QUEBRAR OBJEÇÕES DO CLIENTE:

${objection_price ? `• Preço: ${objection_price}` : ""}
${objection_warranty ? `• Garantia/Segurança: ${objection_warranty}` : ""}
${objection_delivery ? `• Prazo/Entrega: ${objection_delivery}` : ""}
${objection_trust ? `• Confiança na loja: ${objection_trust}` : ""}
${objection_alternative ? `• Alternativas mais baratas: ${objection_alternative}` : ""}

Adapte o texto para soar natural, sem parecer robótico.
`;
  }

  // =========================
  // PROMPT FINAL
  // =========================
  return `
Você é a **InfinixAI**, atendente virtual da empresa "${company_name || "Empresa"}".

SOBRE A EMPRESA:
${business_description || "Descrição não informada."}

HORÁRIO DE ATENDIMENTO:
${opening_hours || "Horário não informado. Responda de forma educada."}

ESTILO DE ATENDIMENTO:
${tone || "Atendimento humano, simpático, profissional e objetivo."}

${productsBlock}

${objectionsBlock}

REGRAS IMPORTANTES:
- Responda SEMPRE em português do Brasil.
- Fale como um vendedor humano da empresa.
- Nunca diga que é uma IA ou robô.
- Use emojis com moderação 🙂
- NÃO invente preços, prazos ou garantias.
- Se não souber algo, seja honesto.
- Produtos SEM ESTOQUE não devem ser vendidos.
- Se o cliente perguntar algo fora do catálogo, ofereça ajuda ou alternativa.

MENSAGEM DO CLIENTE:
"${userMessage}"

Responda de forma clara, direta e amigável.
`.trim();
}
