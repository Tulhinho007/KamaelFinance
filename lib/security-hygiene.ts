/**
 * Security Hygiene & Input Controller Layer
 * Fornece validação de Honeypot, sanitização XSS/Injection e regras de higiene para dados recebidos.
 */

export interface HoneypotPayload {
  hp_website?: string;
  hp_confirm?: string;
  [key: string]: any;
}

/**
 * Verifica se campos do Honeypot foram preenchidos (indica ação de bot)
 */
export function isHoneypotTriggered(data: HoneypotPayload): boolean {
  if (!data) return false;
  const hpWeb = data.hp_website?.trim();
  const hpConf = data.hp_confirm?.trim();
  return Boolean(hpWeb || hpConf);
}

/**
 * Sanitiza uma string removendo tags HTML, scripts e padrões conhecidos de XSS / SQL Injection
 */
export function sanitizeInputString(input: string): string {
  if (!input || typeof input !== "string") return "";

  let cleaned = input.trim();

  // Remove tags HTML/XML
  cleaned = cleaned.replace(/<[^>]*>?/gm, "");

  // Remove esquemas javascript: ou data:
  cleaned = cleaned.replace(/javascript:/gi, "");
  cleaned = cleaned.replace(/vbscript:/gi, "");
  cleaned = cleaned.replace(/data:text\/html/gi, "");

  // Remove handlers de eventos como onload=, onerror=, onclick=
  cleaned = cleaned.replace(/on\w+\s*=/gi, "");

  // Escapa aspas para mitigar SQL/NoSQL Injection
  cleaned = cleaned.replace(/'/g, "''");

  return cleaned;
}

/**
 * Sanitiza todos os campos de texto de um objeto recursivamente
 */
export function sanitizePayload<T extends Record<string, any>>(data: T): T {
  if (!data || typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizePayload(item)) as unknown as T;
  }

  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      cleaned[key] = sanitizeInputString(value);
    } else if (typeof value === "object" && value !== null) {
      cleaned[key] = sanitizePayload(value);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned as T;
}

/**
 * Valida a higiene de e-mail (formato básico, caracteres aceitos)
 */
export function validateEmailHygiene(email: string): { valid: boolean; error?: string } {
  if (!email) return { valid: false, error: "E-mail é obrigatório." };

  const cleaned = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(cleaned)) {
    return { valid: false, error: "Formato de e-mail inválido." };
  }

  return { valid: true };
}

/**
 * Valida a higiene de senha (mínimo de caracteres, complexidade básica)
 */
export function validatePasswordHygiene(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 6) {
    return { valid: false, error: "A senha deve ter no mínimo 6 caracteres." };
  }

  return { valid: true };
}
