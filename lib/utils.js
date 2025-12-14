// lib/utils.js

/**
 * Converte QUALQUER valor em string segura (sem trim, sem erro).
 */
export function safeString(v) {
  try {
    if (v === null || v === undefined) return "";
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  } catch {
    return "";
  }
}

/**
 * Converte para string E faz trim seguro.
 */
export function safeTrim(v) {
  try {
    if (v === null || v === undefined) return "";
    if (typeof v === "string") return v.trim();
    if (typeof v === "number" || typeof v === "boolean") return String(v).trim();
    if (typeof v === "object") return JSON.stringify(v).trim();
    return String(v).trim();
  } catch {
    return "";
  }
}
