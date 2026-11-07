/**
 * Helper de cálculo de datas e status de faturas de cartão de crédito.
 */

export interface InvoiceDueDateInfo {
  dateStr: string;       // Data formatada "DD/MM/YYYY"
  dueDate: Date;         // Objeto Date do vencimento
  isPast: boolean;       // Indica se a data de vencimento já passou em relação a hoje
  billingMonth: number;  // Mês real do vencimento (1-12)
  billingYear: number;   // Ano real do vencimento (ex: 2026)
}

export interface InvoiceStatusInfo {
  status: "zerada" | "paga" | "vencida" | "aguardando";
  label: string;
  colorClass: string;
  badgeText: string;
  isPast: boolean;
  isPaid: boolean;
}

/**
 * Calcula a data exata de vencimento e metadados de uma fatura a partir da competência (M+1).
 * dueDate = addMonths(competenceDate, 1) respeitando o dia configurado no cartão (dueDay).
 */
export function calculateInvoiceDueDateFromCompetence(
  competenceMonth: number,
  competenceYear: number,
  dueDay: number = 10
): {
  dueDate: Date;
  dateStr: string;
  isoDate: string;
  dueDay: number;
  dueMonth: number;
  dueYear: number;
} {
  let targetMonth = competenceMonth + 1;
  let targetYear = competenceYear;

  if (targetMonth > 12) {
    targetMonth = 1;
    targetYear += 1;
  }

  const maxDays = new Date(targetYear, targetMonth, 0).getDate();
  const safeDay = Math.min(Math.max(1, dueDay || 10), maxDays);
  const dueDate = new Date(targetYear, targetMonth - 1, safeDay);
  dueDate.setHours(0, 0, 0, 0);

  const dateStr = `${String(safeDay).padStart(2, "0")}/${String(targetMonth).padStart(2, "0")}/${targetYear}`;
  const isoDate = `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;

  return {
    dueDate,
    dateStr,
    isoDate,
    dueDay: safeDay,
    dueMonth: targetMonth,
    dueYear: targetYear,
  };
}

/**
 * Calcula a data exata de vencimento da fatura de cartão de crédito para uma determinada competência (selectedMonth, selectedYear).
 * 
 * Regra de Negócio:
 * Para a competência do mês selecionado (ex: Outubro/2026 = Mês 10), o vencimento da fatura ocorre no mês subsequente (+1 mês / M+1, ex: 10/11/2026).
 * Adiciona exatamente +1 mês à competência selecionada respeitando o dia de vencimento configurado.
 */
export function getInvoiceDueDateInfo(
  diaFechamento: number,
  diaVencimento: number,
  selectedMonth: number,
  selectedYear: number,
  _latestTransactionDate?: string | Date | null
): InvoiceDueDateInfo {
  const safeMonth = Math.max(1, Math.min(12, Number(selectedMonth) || 1));
  const safeYear = Number(selectedYear) || new Date().getFullYear();
  const maxDays = new Date(safeYear, safeMonth, 0).getDate();
  const safeDay = Math.min(Math.max(1, Number(diaVencimento) || 10), maxDays);
  const dueDate = new Date(safeYear, safeMonth - 1, safeDay, 12, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isPast = dueDate < today;
  const dateStr = `${String(safeDay).padStart(2, "0")}/${String(safeMonth).padStart(2, "0")}/${safeYear}`;

  return {
    dateStr,
    dueDate,
    isPast,
    billingMonth: safeMonth,
    billingYear: safeYear,
  };
}

/**
 * Retorna as informações de status da fatura conforme as regras de negócio:
 * 1. Fatura Zerada (faturaTotal <= 0): Exibe status neutro (ex: "Sem Fatura" / "Fatura Zerada"), NUNCA como vencida.
 * 2. Fatura Paga (isPaid === true ou pagoTotal >= faturaTotal): Exibe "Fatura Paga" (verde).
 * 3. Fatura Vencida: Apenas se faturaTotal > 0, isPaid === false E dataVencimento < dataAtual (isPast === true).
 * 4. Aguardando Pagamento: Quando faturaTotal > 0, isPaid === false E dataVencimento >= dataAtual (isPast === false).
 */
export function getInvoiceStatusInfo(
  faturaTotal: number,
  isPaid: boolean,
  isPast: boolean,
  vencimentoStr?: string
): InvoiceStatusInfo {
  if (faturaTotal <= 0) {
    return {
      status: "zerada",
      label: "Fatura Zerada",
      colorClass: "text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
      badgeText: "Sem Fatura",
      isPast: false,
      isPaid: false,
    };
  }

  if (isPaid) {
    return {
      status: "paga",
      label: "Fatura Paga",
      colorClass: "text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800",
      badgeText: "✓ Fatura Paga",
      isPast: false,
      isPaid: true,
    };
  }

  if (isPast) {
    return {
      status: "vencida",
      label: "Fatura Vencida",
      colorClass: "text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800",
      badgeText: vencimentoStr ? `🚨 Fatura Vencida (${vencimentoStr})` : "🚨 Fatura Vencida",
      isPast: true,
      isPaid: false,
    };
  }

  return {
    status: "aguardando",
    label: "Aguardando Pagamento",
    colorClass: "text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800",
    badgeText: vencimentoStr ? `Vence em ${vencimentoStr}` : "Aguardando Pagamento",
    isPast: false,
    isPaid: false,
  };
}

/**
 * Passo 1: Determina a data exata de vencimento da fatura à qual uma compra pertence,
 * com base na data da transação/compra, no dia de fechamento e no dia de vencimento.
 */
export function getFaturaVencimento(
  dataCompra: Date | string,
  diaFechamento: number = 1,
  diaVencimento: number = 10
): Date {
  let dia: number;
  let mes: number; // 0 a 11
  let ano: number;

  if (typeof dataCompra === "string") {
    const clean = dataCompra.split("T")[0];
    const parts = clean.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      ano = parts[0];
      mes = parts[1] - 1;
      dia = parts[2];
    } else {
      const d = new Date(dataCompra);
      ano = d.getFullYear();
      mes = d.getMonth();
      dia = d.getDate();
    }
  } else {
    ano = dataCompra.getFullYear();
    mes = dataCompra.getMonth();
    dia = dataCompra.getDate();
  }

  const safeFechamento = Math.max(1, Math.min(31, Number(diaFechamento) || 1));
  const safeVencimento = Math.max(1, Math.min(31, Number(diaVencimento) || 10));

  // Se a compra foi feita DEPOIS do dia do fechamento, vai para a fatura seguinte
  if (dia > safeFechamento) {
    mes += 1;
  }

  // Ajuste se o dia de vencimento for menor que o de fechamento (ex: fecha dia 28 e vence dia 05)
  if (safeVencimento < safeFechamento) {
    mes += 1;
  }

  while (mes > 11) {
    mes -= 12;
    ano += 1;
  }

  const maxDaysInMonth = new Date(ano, mes + 1, 0).getDate();
  const safeDueDay = Math.min(safeVencimento, maxDaysInMonth);

  return new Date(ano, mes, safeDueDay, 12, 0, 0);
}

/**
 * Retorna as datas de corte do ciclo de faturamento para um determinado mês/ano de vencimento.
 */
export function getInvoiceCycleDates(
  billingMonth: number, // 1-12 (Mês do vencimento da fatura)
  billingYear: number,  // Ano do vencimento da fatura
  diaFechamento: number = 1,
  diaVencimento: number = 10
): {
  closingDate: Date;
  previousClosingDate: Date;
  dueDate: Date;
} {
  const safeFechamento = Math.max(1, Math.min(31, Number(diaFechamento) || 1));
  const safeVencimento = Math.max(1, Math.min(31, Number(diaVencimento) || 10));

  let closingMonth = billingMonth;
  let closingYear = billingYear;
  if (safeVencimento < safeFechamento) {
    closingMonth = billingMonth === 1 ? 12 : billingMonth - 1;
    closingYear = billingMonth === 1 ? billingYear - 1 : billingYear;
  }

  const maxClosingDays = new Date(closingYear, closingMonth, 0).getDate();
  const safeClosingDay = Math.min(safeFechamento, maxClosingDays);
  const closingDate = new Date(closingYear, closingMonth - 1, safeClosingDay, 23, 59, 59, 999);

  let prevClosingMonth = closingMonth === 1 ? 12 : closingMonth - 1;
  let prevClosingYear = closingMonth === 1 ? closingYear - 1 : closingYear;
  const maxPrevDays = new Date(prevClosingYear, prevClosingMonth, 0).getDate();
  const safePrevDay = Math.min(safeFechamento, maxPrevDays);
  const previousClosingDate = new Date(prevClosingYear, prevClosingMonth - 1, safePrevDay, 23, 59, 59, 999);

  const maxDueDays = new Date(billingYear, billingMonth, 0).getDate();
  const safeDueDay = Math.min(safeVencimento, maxDueDays);
  const dueDate = new Date(billingYear, billingMonth - 1, safeDueDay, 12, 0, 0);

  return {
    closingDate,
    previousClosingDate,
    dueDate,
  };
}

/**
 * Determina a data exata de vencimento da fatura à qual uma transação pertence,
 * considerando data de compra, dia de fechamento, dia de vencimento e parcelas.
 */
export function getTransactionInvoiceDueDate(
  tx: {
    date?: Date | string | null;
    purchaseDate?: Date | string | null;
    dueDate?: Date | string | null;
    competenceDate?: Date | string | null;
    currentInstallment?: number | null;
    installmentsCount?: number | null;
    description?: string | null;
  },
  diaFechamento: number = 1,
  diaVencimento: number = 10
): Date {
  const rawDate = tx.purchaseDate || tx.competenceDate || tx.date;
  if (!rawDate) {
    return new Date();
  }

  const instMatch = tx.description ? tx.description.match(/\((\d+)\/(\d+)\)/) : null;
  const currentInst = tx.currentInstallment || (instMatch ? Number(instMatch[1]) : 1);

  const baseDueDate = getFaturaVencimento(rawDate, diaFechamento, diaVencimento);

  if (currentInst <= 1) {
    return baseDueDate;
  }

  // Para parcelas subsequentes (2/X, 3/X...):
  // Se a transação já possui dueDate explícito no banco:
  if (tx.dueDate) {
    const parsedDue = new Date(tx.dueDate);
    if (!isNaN(parsedDue.getTime())) {
      return parsedDue;
    }
  }

  // Sem dueDate gravado: o purchaseDate de cada parcela já é deslocado (i-1) meses
  // na criação, então o vencimento calculado pelo ciclo já é o correto (sem somar de novo).
  return baseDueDate;
}

/**
 * Verifica com precisão se uma transação pertence ao ciclo de faturamento especificado.
 */
export function isTransactionInInvoice(
  tx: {
    date?: Date | string | null;
    purchaseDate?: Date | string | null;
    dueDate?: Date | string | null;
    competenceDate?: Date | string | null;
    competenceMonth?: number | null;
    competenceYear?: number | null;
    currentInstallment?: number | null;
    installmentsCount?: number | null;
    description?: string | null;
  },
  billingMonth: number,
  billingYear: number,
  diaFechamento: number = 1,
  diaVencimento: number = 10
): boolean {
  const invDueDate = getTransactionInvoiceDueDate(tx, diaFechamento, diaVencimento);
  return (
    invDueDate.getFullYear() === Number(billingYear) &&
    invDueDate.getMonth() + 1 === Number(billingMonth)
  );
}

