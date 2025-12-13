// lib/openaiClient.js
import OpenAI from "openai";

/**
 * Cliente OpenAI 100% seguro
 * - NÃO usa .trim()
 * - NÃO assume string
 * - NÃO quebra com webhook
 */
export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY não configurada");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}
