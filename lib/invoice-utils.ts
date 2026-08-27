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
 * Calcula a data exata de vencimento da fatura de cartão de crédito para uma determinada competência (selectedMonth, selectedYear).
 * 
 * Regra:
 * Para a competência do mês selecionado (ex: Agosto/2026 = Mês 8), o vencimento da fatura ocorre no mês subsequente (+1 mês, ex: 10/09/2026).
 * Adiciona exatamente +1 mês à competência selecionada sem pular múltiplos meses.
 */
export function getInvoiceDueDateInfo(
  diaFechamento: number,
  diaVencimento: number,
  selectedMonth: number,
  selectedYear: number,
  _latestTransactionDate?: string | Date | null
): InvoiceDueDateInfo {
  const vencDay = diaVencimento || 10;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Mês/Ano de vencimento é exatamente +1 mês da competência selecionada
  let targetVencMonth = selectedMonth + 1;
  let targetVencYear = selectedYear;

  if (targetVencMonth > 12) {
    targetVencMonth = 1;
    targetVencYear += 1;
  }

  const dueDate = new Date(targetVencYear, targetVencMonth - 1, vencDay);
  dueDate.setHours(0, 0, 0, 0);

  const isPast = dueDate < today;
  const dateStr = `${String(vencDay).padStart(2, "0")}/${String(targetVencMonth).padStart(2, "0")}/${targetVencYear}`;

  return {
    dateStr,
    dueDate,
    isPast,
    billingMonth: targetVencMonth,
    billingYear: targetVencYear,
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
