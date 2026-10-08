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
  const calc = calculateInvoiceDueDateFromCompetence(selectedMonth, selectedYear, diaVencimento || 10);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isPast = calc.dueDate < today;

  return {
    dateStr: calc.dateStr,
    dueDate: calc.dueDate,
    isPast,
    billingMonth: calc.dueMonth,
    billingYear: calc.dueYear,
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
