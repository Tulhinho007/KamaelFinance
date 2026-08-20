export const CATEGORIES = [
  "Alimentação",
  "Assinaturas",
  "Casa",
  "Cuidados Pessoais",
  "Educação",
  "Eletrônicos",
  "Esportes",
  "Lazer",
  "Mercado",
  "Pets",
  "Saúde",
  "Trabalho",
  "Transporte",
  "Veículo / Combustível",
  "Vestuário",
  "Viagens",
  "Outros",
] as const;

export type CategoryName = typeof CATEGORIES[number];

export const CATEGORY_COLORS: Record<string, string> = {
  "Alimentação":           "#10B981",
  "Assinaturas":           "#8B5CF6",
  "Casa":                  "#3B82F6",
  "Cuidados Pessoais":     "#EC4899",
  "Educação":              "#6366F1",
  "Eletrônicos":           "#06B6D4",
  "Esportes":              "#F97316",
  "Lazer":                 "#F59E0B",
  "Mercado":               "#84CC16",
  "Pets":                  "#A855F7",
  "Saúde":                 "#EF4444",
  "Trabalho":              "#64748B",
  "Transporte":            "#14B8A6",
  "Veículo / Combustível": "#D97706",
  "Vestuário":             "#E11D48",
  "Viagens":               "#0284C7",
  "Outros":                "#6B7280",
};

export function getCategoryColor(categoryName: string): string {
  return CATEGORY_COLORS[categoryName] || "#8B5CF6";
}

export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
] as const;

export function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] || "";
}

