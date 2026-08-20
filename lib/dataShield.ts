import crypto from "crypto";

/**
 * DataShield - AES-256-CBC Payload Encryption & Decryption Engine
 * Protege payloads de tráfego de rede (DevTools / F12) impedindo a leitura
 * de valores monetários e campos sensíveis em texto claro.
 *
 * Formato gerado: IV_HEX:CIPHERTEXT_HEX (ex: "a1b2...:f9e8...")
 */

const DATASHIELD_SECRET =
  process.env.DATASHIELD_SECRET || "kamael_finance_datashield_aes256_secret_key_2026";

// Derive uma chave de 32 bytes (256 bits) usando SHA-256 da secret
function getShieldKey(): Buffer {
  return crypto.createHash("sha256").update(DATASHIELD_SECRET).digest();
}

/**
 * Criptografa uma string qualquer usando AES-256-CBC
 */
export function encryptDataShield(text: string | number): string {
  if (text === null || text === undefined) return "";
  const strValue = String(text);

  const iv = crypto.randomBytes(16);
  const key = getShieldKey();

  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(strValue, "utf8", "hex");
  encrypted += cipher.final("hex");

  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Descriptografa uma string criptografada no formato IV:CIPHERTEXT
 */
export function decryptDataShield(encryptedText: string): string {
  if (!encryptedText || typeof encryptedText !== "string" || !encryptedText.includes(":")) {
    return encryptedText;
  }

  try {
    const [ivHex, cipherTextHex] = encryptedText.split(":");
    if (!ivHex || !cipherTextHex) return encryptedText;

    const iv = Buffer.from(ivHex, "hex");
    const key = getShieldKey();

    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(cipherTextHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    // Se falhar a descriptografia (valor não estava criptografado ou chave diferente), retorna o texto original
    return encryptedText;
  }
}

/**
 * Lista de campos financeiros e sensíveis para aplicar blindagem no F12
 */
const SENSITIVE_FIELDS = new Set([
  "bancaInicial",
  "bancaAtual",
  "profit",
  "valor",
  "initialBalance",
  "creditLimit",
  "amount",
  "saldoAtualBruto",
  "valorInvestido",
  "taxasAcumuladas",
  "impostoEstimado",
  "cotacaoAtual",
  "dividendosRecebidos",
  "precoUnitario",
  "minAmount",
  "maxAmount",
  "paidAmount",
  "totalInvestido",
  "totalSaque",
  "acumulado",
  "objetivo",
]);

/**
 * Intercepta um objeto/payload e criptografa os campos sensíveis
 */
export function shieldFinancialPayload<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => shieldFinancialPayload(item)) as unknown as T;
  }

  const shielded: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.has(key) && value !== null && value !== undefined) {
      shielded[key] = encryptDataShield(value);
      // Mantém também o valor numérico para acessos locais se necessário
      shielded[`_${key}_raw`] = value;
    } else if (typeof value === "object" && value !== null) {
      shielded[key] = shieldFinancialPayload(value);
    } else {
      shielded[key] = value;
    }
  }

  return shielded as T;
}

/**
 * Intercepta um objeto/payload e faz a desblindagem transparente dos campos criptografados
 */
export function unshieldFinancialPayload<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => unshieldFinancialPayload(item)) as unknown as T;
  }

  const unshielded: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("_") && key.endsWith("_raw")) continue;

    if (
      SENSITIVE_FIELDS.has(key) &&
      typeof value === "string" &&
      value.includes(":")
    ) {
      const decryptedStr = decryptDataShield(value);
      const numValue = Number(decryptedStr);
      unshielded[key] = !isNaN(numValue) ? numValue : decryptedStr;
    } else if (typeof value === "object" && value !== null) {
      unshielded[key] = unshieldFinancialPayload(value);
    } else {
      unshielded[key] = value;
    }
  }

  return unshielded as T;
}
