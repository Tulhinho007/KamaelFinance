export function getExpenseEmoji(description: string, tipo?: string): string {
  const d = (description || "").toLowerCase();

  if (
    d.includes("treino") ||
    d.includes("academia") ||
    d.includes("gym") ||
    d.includes("futvolei") ||
    d.includes("crossfit") ||
    d.includes("futebol") ||
    d.includes("esporte") ||
    d.includes("personal")
  ) {
    return "🏋️";
  }
  if (
    d.includes("internet") ||
    d.includes("fibra") ||
    d.includes("tim live") ||
    d.includes("wifi") ||
    d.includes("banda larga") ||
    d.includes("claro net") ||
    d.includes("vivo fibra")
  ) {
    return "🌐";
  }
  if (
    d.includes("celular") ||
    d.includes("telefone") ||
    d.includes("tim celular") ||
    d.includes("vivo") ||
    d.includes("claro") ||
    d.includes("plano celular")
  ) {
    return "📱";
  }
  if (
    d.includes("energia") ||
    d.includes("luz") ||
    d.includes("celpe") ||
    d.includes("solar") ||
    d.includes("enel") ||
    d.includes("cpfl") ||
    d.includes("neoenergia") ||
    d.includes("light") ||
    d.includes("eletro")
  ) {
    return "⚡";
  }
  if (
    d.includes("agua") ||
    d.includes("água") ||
    d.includes("compesa") ||
    d.includes("sabesp") ||
    d.includes("copasa") ||
    d.includes("sanepar") ||
    d.includes("saneamento")
  ) {
    return "💧";
  }
  if (
    d.includes("aluguel") ||
    d.includes("condominio") ||
    d.includes("condomínio") ||
    d.includes("moradia") ||
    d.includes("iptu") ||
    d.includes("casa") ||
    d.includes("apartamento")
  ) {
    return "🏠";
  }
  if (
    d.includes("netflix") ||
    d.includes("spotify") ||
    d.includes("prime") ||
    d.includes("disney") ||
    d.includes("max") ||
    d.includes("hbo") ||
    d.includes("youtube") ||
    d.includes("streaming") ||
    d.includes("deezer") ||
    d.includes("apple")
  ) {
    return "🎬";
  }
  if (
    d.includes("seguro") ||
    d.includes("saude") ||
    d.includes("saúde") ||
    d.includes("unimed") ||
    d.includes("hapvida") ||
    d.includes("farmacia") ||
    d.includes("farmácia") ||
    d.includes("medico") ||
    d.includes("médico")
  ) {
    return "🩺";
  }
  if (
    d.includes("curso") ||
    d.includes("faculdade") ||
    d.includes("escola") ||
    d.includes("educacao") ||
    d.includes("educação") ||
    d.includes("ingles") ||
    d.includes("inglês")
  ) {
    return "📚";
  }
  if (
    d.includes("investimento") ||
    d.includes("broker") ||
    d.includes("polarium") ||
    d.includes("aporte") ||
    d.includes("reserva") ||
    d.includes("bdr")
  ) {
    return "📈";
  }
  if (
    d.includes("emprestimo") ||
    d.includes("empréstimo") ||
    d.includes("financiamento") ||
    d.includes("supersim") ||
    d.includes("facio") ||
    d.includes("mentore") ||
    d.includes("stelios") ||
    d.includes("parcela")
  ) {
    return "🏦";
  }
  if (
    d.includes("mercado") ||
    d.includes("supermercado") ||
    d.includes("feira") ||
    d.includes("alimentacao") ||
    d.includes("alimentação")
  ) {
    return "🛒";
  }
  if (tipo === "ASSINATURA") {
    return "🔄";
  }
  return "⚡";
}
