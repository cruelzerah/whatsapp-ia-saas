// lib/openaiClient.js
import OpenAI from "openai";

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY ausente no ambiente (process.env).");
  }

  return new OpenAI({ apiKey });
}
