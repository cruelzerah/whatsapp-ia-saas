// lib/promptBuilder.js
import { safeString } from "./utils";

/**
 * Gera o prompt para a IA (bem simples e robusto).
 */
export function buildIaPrompt(settings, products, userMessage) {
  const s = settings || {};
  const list = Array.isArray(products) ? products : [];

  const companyName = safeString(s.company_name) || "a empresa";
  const desc = safeString(s.business_description);
  const tone = safeString(s.tone) || "amigável e profissional";
  const hours = safeString(s.opening_hours);

  // Produtos ativos x inativos
  const active = list.filter((p) => p?.is_active === true || p?.is_active === null || p?.is_active === undefined);
  const inactive = list.filter((p) => p?.is_active === false);

  const formatProducts = (arr, label) => {
    if (!arr.length) return `(nenhum ${label})`;

    return arr.slice(0, 50).map((p) => {
      const name = safeString(p?.name) || "(sem nome)";
      const cat = safeString(p?.category);
      const price =
        p?.price !== null && p?.price !== undefined && p?.price !== ""
          ? ` | preço: R$ ${Number(p.price).toFixed(2)}`
          : "";
      const extra = safeString(p?.description);
      const stock = p?.is_active === false ? " | SEM ESTOQUE" : "";

      return `- ${name}${cat ? ` [${cat}]` : ""}${price}${extra ? ` | ${extra}` : ""}${stock}`;
    }).join("\n");
  };

  const productsBlock = list.length
    ? `PRODUTOS CADASTRADOS:\n\nATIVOS:\n${formatProducts(active, "ativo")}\n\nSEM ESTOQUE:\n${formatProducts(inactive, "sem estoque")}`
    : (safeString(s.products)
        ? `PRODUTOS (TEXTO DO PAINEL):\n${safeString(s.products)}`
        : `PRODUTOS:\nNenhum produto cadastrado ainda. Não invente preços ou detalhes.`);

  const objPrice = safeString(s.objection_price);
  const objWarranty = safeString(s.objection_warranty);
  const objDelivery = safeString(s.objection_delivery);
  const objTrust = safeString(s.objection_trust);
  const objAlt = safeString(s.objection_alternative);

  const objections = [objPrice, objWarranty, objDelivery, objTrust, objAlt].some(Boolean)
    ? `\nOBJEÇÕES (use como base quando aplicável):\n` +
      `${objPrice ? `- Preço: ${objPrice}\n` : ""}` +
      `${objWarranty ? `- Garantia: ${objWarranty}\n` : ""}` +
      `${objDelivery ? `- Entrega: ${objDelivery}\n` : ""}` +
      `${objTrust ? `- Confiança: ${objTrust}\n` : ""}` +
      `${objAlt ? `- Alternativas: ${objAlt}\n` : ""}`
    : "";

  const msg = safeString(userMessage);

  return (
    `Você é um atendente de vendas da empresa "${companyName}".\n` +
    `Responda sempre em português do Brasil.\n` +
    `Nunca diga que é IA.\n` +
    `Não invente preços.\n` +
    `Se não tiver informação, peça para o cliente confirmar com a loja.\n\n` +
    `SOBRE O NEGÓCIO:\n${desc || "(sem descrição)"}\n\n` +
    `${productsBlock}\n\n` +
    `HORÁRIO:\n${hours || "não informado"}\n\n` +
    `TOM:\n${tone}\n` +
    `${objections}\n` +
    `MENSAGEM DO CLIENTE:\n${msg}\n`
  );
}
