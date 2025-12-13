// lib/promptBuilder.js

/**
 * Converte qualquer valor em texto seguro (evita .trim em objeto).
 * - string => trim()
 * - number/boolean => String()
 * - object => tenta pegar .message se existir, senão JSON.stringify
 * - null/undefined => ""
 */
function safeText(value) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (value && typeof value === "object") {
    // caso comum da Z-API: { message: "texto" }
    if (typeof value.message === "string") return value.message.trim();

    // outras possibilidades
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
 * Formata preço em BRL com 2 casas, sem quebrar se vier string.
 */
function formatBRL(price) {
  if (price === null || price === undefined || price === "") return "";
  const n = Number(price);
  if (Number.isNaN(n)) return "";
  return `R$ ${n.toFixed(2)}`;
}

/**
 * Gera o prompt que será enviado para a InfinixAI.
 *
 * @param {object} settings    - registro da tabela company_settings do usuário
 * @param {Array}  products    - lista de produtos/serviços do usuário
 * @param {any}    userMessage - mensagem original do cliente (pode vir string ou objeto)
 */
export function buildIaPrompt(settings, products, userMessage) {
  const s = settings || {};

  const company_name = safeText(s.company_name);
  const business_description = safeText(s.business_description);

  // campo texto antigo do painel (se ainda quiser usar)
  const productsText = safeText(s.products);

  const tone = safeText(s.tone);
  const opening_hours = safeText(s.opening_hours);

  // objeções
  const objection_price = safeText(s.objection_price);
  const objection_warranty = safeText(s.objection_warranty);
  const objection_delivery = safeText(s.objection_delivery);
  const objection_trust = safeText(s.objection_trust);
  const objection_alternative = safeText(s.objection_alternative);

  // mensagem do cliente (blindada)
  const clientMessage = safeText(userMessage);

  // Garante que sempre temos um array
  const safeProducts = Array.isArray(products) ? products : [];

  // Separamos ativos e inativos (is_active = false => sem estoque)
  const activeProducts = safeProducts.filter(
    (p) => p?.is_active === true || p?.is_active === null || p?.is_active === undefined
  );
  const inactiveProducts = safeProducts.filter((p) => p?.is_active === false);

  // ----- BLOCO DE PRODUTOS / SERVIÇOS -----
  let productsBlock = "";

  if (safeProducts.length > 0) {
    const serializeList = (list) =>
      list
        .slice(0, 50) // limite pra não explodir tokens
        .map((p) => {
          const nome = safeText(p?.name) || "(sem nome)";
          const categoria = p?.category ? ` [${safeText(p.category)}]` : "";

          const preco = formatBRL(p?.price);
          const precoTxt = preco ? ` - preço: ${preco}` : "";

          const desc = p?.description ? ` – ${safeText(p.description)}` : "";

          const estoque =
            typeof p?.is_active === "boolean"
              ? p.is_active
                ? " (DISPONÍVEL)"
                : " (SEM ESTOQUE NO MOMENTO)"
              : "";

          return `• ${nome}${categoria}${precoTxt}${desc}${estoque}`;
        })
        .join("\n");

    const ativosTexto =
      activeProducts.length > 0 ? serializeList(activeProducts) : "(nenhum produto ativo cadastrado)";

    const inativosTexto = inactiveProducts.length > 0 ? serializeList(inactiveProducts) : "";

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
`.trim();
  } else if (productsText) {
    // fallback: texto livre antigo
    productsBlock = `
Informações textuais sobre produtos/serviços fornecidas pelo cliente:
${productsText}
`.trim();
  } else {
    productsBlock = `
Nenhum produto/serviço foi cadastrado ainda.
- Evite inventar detalhes técnicos ou preços.
- Se o cliente perguntar por algo específico, responda de forma genérica
  e peça para ele confirmar diretamente com a loja.
`.trim();
  }

  // ----- BLOCO DE OBJEÇÕES -----
  let objectionsBlock = "";

  const hasObjections =
    objection_price || objection_warranty || objection_delivery || objection_trust || objection_alternative;

  if (hasObjections) {
    objectionsBlock = `
REGRAS PARA QUEBRAR OBJEÇÕES
(use essas mensagens como base quando o cliente demonstrar dúvida/objeção):

${objection_price ? `• Se o cliente achar caro ou falar de preço: "${objection_price}".` : ""}
${objection_warranty ? `• Se perguntarem sobre garantia/segurança: "${objection_warranty}".` : ""}
${objection_delivery ? `• Se reclamarem de prazo/frete: "${objection_delivery}".` : ""}
${objection_trust ? `• Se o cliente demonstrar desconfiança: "${objection_trust}".` : ""}
${
  objection_alternative
    ? `• Se o cliente disser que está sem orçamento, ofereça alternativas: "${objection_alternative}".`
    : ""
}

Quando usar isso, adapte para soar natural, mas mantenha o sentido principal.
`.trim();
  }

  // ----- PROMPT FINAL -----
  return `
Você é a "InfinixAI", atendente virtual da empresa "${company_name || "a empresa"}".

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
"${clientMessage}"
`.trim();
}
