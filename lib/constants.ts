export * from "@/constants/categories";

export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
] as const;

export function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] || "";
}

/**
 * Converte entradas numéricas escritas com vírgula ou ponto (ex: 50,50 ou 63.14)
 * em um number válido do JavaScript.
 */
export function parseCurrencyInput(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value === "number") return isNaN(value) ? 0 : value;
  const sanitized = String(value).trim().replace(",", ".");
  const num = parseFloat(sanitized);
  return isNaN(num) ? 0 : num;
}


