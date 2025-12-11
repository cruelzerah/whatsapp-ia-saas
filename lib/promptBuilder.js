// lib/promptBuilder.js

/**
 * Gera o prompt que será enviado para a InfinixAI.
 *
 * @param {object} settings    - registro da tabela company_settings do usuário
 * @param {Array}  products    - lista de produtos/serviços do usuário
 * @param {string} userMessage - mensagem original do cliente
 */
export function buildIaPrompt(settings, products, userMessage) {
  const {
    company_name,
    business_description,
    products: productsText, // campo texto antigo do painel (se ainda quiser usar)
    tone,
    opening_hours,

    // novos campos de objeções (vamos criar na company_settings)
    objection_price,
    objection_warranty,
    objection_delivery,
    objection_trust,
    objection_alternative,
  } = settings || {};

  // Garante que sempre temos um array
  const safeProducts = Array.isArray(products) ? products : [];

  // Separamos ativos e inativos (is_active = false => sem estoque)
  const activeProducts = safeProducts.filter(
    (p) => p.is_active === true || p.is_active === null || p.is_active === undefined
  );
  const inactiveProducts = safeProducts.filter((p) => p.is_active === false);

  // ----- BLOCO DE PRODUTOS / SERVIÇOS -----

  let productsBlock = "";

  if (safeProducts.length > 0) {
    const serializeList = (list, statusLabel) =>
      list
        .slice(0, 50) // limite pra não explodir tokens
        .map((p) => {
          const nome = p.name || "(sem nome)";
          const categoria = p.category ? ` [${p.category}]` : "";
          const preco =
            p.price !== null && p.price !== undefined
              ? ` - preço: R$ ${Number(p.price).toFixed(2)}`
              : "";
          const desc = p.description ? ` – ${p.description}` : "";
          const estoque =
            typeof p.is_active === "boolean"
              ? p.is_active
                ? " (DISPONÍVEL)"
                : " (SEM ESTOQUE NO MOMENTO)"
              : "";

          return `• ${nome}${categoria}${preco}${desc}${estoque}`;
        })
        .join("\n") || `(nenhum item ${statusLabel})`;

    const ativosTexto =
      activeProducts.length > 0
        ? serializeList(activeProducts, "ativo")
        : "(nenhum produto ativo cadastrado)";

    const inativosTexto =
      inactiveProducts.length > 0 ? serializeList(inactiveProducts, "inativo") : "";

    productsBlock = `
INFORMAÇÕES DE PRODUTOS / SERVIÇOS CADASTRADOS:

Produtos ATIVOS (você PODE oferecer e vender normalmente):
${ativosTexto}

${
  inactiveProducts.length > 0
    ? `Produtos DESATIVADOS (considere como SEM ESTOQUE, fale isso claramente se o cliente pedir por algum deles):
${inativosTexto}`
    : ""
}
`;
  } else if (productsText) {
    // fallback: texto livre antigo
    productsBlock = `
Informações textuais sobre produtos/serviços fornecidas pelo cliente:
${productsText}
`;
  } else {
    productsBlock = `
Nenhum produto/serviço foi cadastrado ainda.
- Evite inventar detalhes técnicos ou preços.
- Se o cliente perguntar por algo específico, responda de forma genérica
  e peça para ele confirmar diretamente com a loja.`;
  }

  // ----- BLOCO DE OBJEÇÕES (PREÇO, PRAZO, GARANTIA, ETC.) -----

  let objectionsBlock = "";

  if (
    objection_price ||
    objection_warranty ||
    objection_delivery ||
    objection_trust ||
    objection_alternative
  ) {
    objectionsBlock = `
REGRAS PARA QUEBRAR OBJEÇÕES
(use essas mensagens como base quando o cliente demonstrar dúvida/objeção):

${
  objection_price
    ? `• Se o cliente achar caro ou falar de preço, responda nessa linha: "${objection_price}".`
    : ""
}
${
  objection_warranty
    ? `• Se perguntarem sobre garantia/segurança, use algo como: "${objection_warranty}".`
    : ""
}
${
  objection_delivery
    ? `• Se reclamarem de prazo/frete, explique assim: "${objection_delivery}".`
    : ""
}
${
  objection_trust
    ? `• Se o cliente demonstrar desconfiança da loja, reforce: "${objection_trust}".`
    : ""
}
${
  objection_alternative
    ? `• Se o cliente achar caro ou disser que está sem orçamento, ofereça alternativas nessa linha: "${objection_alternative}".`
    : ""
}

Quando usar isso, adapte o texto para soar natural na conversa, mas mantenha o sentido principal.
`;
  }

  // ----- PROMPT FINAL -----

  return `
Você é a "InfinixAI", atendente virtual da empresa "${
    company_name || "a empresa"
  }".

Sobre o negócio:
${business_description || "(sem descrição detalhada pelo cliente)."}

${productsBlock}

Horário de atendimento:
${opening_hours || "não informado, responda de forma genérica sobre horários."}

Estilo de atendimento:
${tone || "informal, amigável, com emojis moderados."}

${objectionsBlock}

Regras importantes:
- Sempre responda em português do Brasil.
- Seja objetiva, mas completa, com tom humano e amigável.
- Use PRIMEIRO os produtos cadastrados como referência de catálogo, preços e opções.
- Produtos com marcação "SEM ESTOQUE NO MOMENTO" NÃO devem ser oferecidos para venda.
  Se o cliente pedir especificamente um desses, explique que está em falta e ofereça alternativas.
- NÃO invente preços. Use apenas os valores listados quando existirem.
- Se não houver produtos cadastrados sobre o que o cliente pediu, seja honesto,
  responda de forma genérica e sugira que ele confirme com a loja.
- Quando o cliente demonstrar objeções de preço, prazo, garantia ou confiança,
  use as mensagens de objeções cadastradas como base para responder.
- Fale sempre como se fosse um vendedor da empresa, nunca diga que é um modelo de IA.

Mensagem do cliente (responda de forma natural, em uma única resposta de chat):
"${userMessage}"
`.trim();
}
