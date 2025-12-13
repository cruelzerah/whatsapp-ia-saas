// lib/trimPatch.js
// Patch global para evitar erro de .trim() em tipos não-string

if (typeof String.prototype.trim !== "undefined") {
  const originalTrim = String.prototype.trim;

  String.prototype.trim = function () {
    if (this === null || this === undefined) return "";
    if (typeof this === "string") return originalTrim.call(this);
    try {
      return String(this).trim();
    } catch {
      return "";
    }
  };
}

export default function applyTrimPatch() {
  console.log("✅ Trim patch aplicado globalmente");
}
