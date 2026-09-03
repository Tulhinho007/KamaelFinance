export const CATEGORIES = [
  "Alimentação",
  "Assinaturas",
  "Casa",
  "Cuidados Pessoais",
  "Doações & Presentes",
  "Educação",
  "Eletrônicos",
  "Empréstimos & Dívidas",
  "Esportes",
  "Impostos & Tributos",
  "Investimentos & Aportes",
  "Lazer",
  "Mercado",
  "Pets",
  "Saúde",
  "Serviços & Contas Fixas",
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
  "Doações & Presentes":    "#F43F5E",
  "Educação":              "#6366F1",
  "Eletrônicos":           "#06B6D4",
  "Empréstimos & Dívidas":  "#BE123C",
  "Esportes":              "#F97316",
  "Impostos & Tributos":    "#64748B",
  "Investimentos & Aportes":"#059669",
  "Lazer":                 "#F59E0B",
  "Mercado":               "#84CC16",
  "Pets":                  "#A855F7",
  "Saúde":                 "#EF4444",
  "Serviços & Contas Fixas":"#0284C7",
  "Trabalho":              "#475569",
  "Transporte":            "#14B8A6",
  "Veículo / Combustível": "#D97706",
  "Vestuário":             "#E11D48",
  "Viagens":               "#38BDF8",
  "Outros":                "#6B7280",
};

export function getCategoryColor(categoryName: string): string {
  return CATEGORY_COLORS[categoryName] || "#8B5CF6";
}
