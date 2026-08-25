/**
 * Helper de cálculo de datas e ciclos de faturas de cartão de crédito.
 */

export interface InvoiceDueDateInfo {
  dateStr: string;       // Data formatada "DD/MM/YYYY"
  dueDate: Date;         // Objeto Date do vencimento
  isPast: boolean;       // Indica se a data de vencimento já passou em relação a hoje
  billingMonth: number;  // Mês real da fatura (1-12)
  billingYear: number;   // Ano real da fatura (ex: 2026)
}

/**
 * Calcula a data exata de vencimento e o mês correspondente da fatura de cartão de crédito.
 * 
 * Regra do ciclo bancário:
 * 1. O dia de fechamento (ex: dia 01) divide os lançamentos entre as faturas.
 * 2. Se a data do lançamento (ou referência) for POSTERIOR ao dia de fechamento do mês (ex: 20/08 > 01/08),
 *    o lançamento pertence à fatura do próximo mês (Setembro).
 * 3. O dia de vencimento (ex: dia 10) define a data limite de pagamento no mês do fechamento (ou no mês seguinte caso diaVencimento <= diaFechamento).
 */
export function getInvoiceDueDateInfo(
  diaFechamento: number,
  diaVencimento: number,
  selectedMonth: number,
  selectedYear: number,
  latestTransactionDate?: string | Date | null
): InvoiceDueDateInfo {
  const fechDay = diaFechamento || 1;
  const vencDay = diaVencimento || 10;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Data de referência inicial: primeiro dia do mês/ano selecionado
  let refDate = new Date(selectedYear, selectedMonth - 1, 1);

  // Se houver uma data de transação mais recente no mês, usa-a para determinar o ciclo correto
  if (latestTransactionDate) {
    const parsed = typeof latestTransactionDate === "string" ? new Date(latestTransactionDate) : latestTransactionDate;
    if (!isNaN(parsed.getTime())) {
      refDate = parsed;
    }
  }

  // Data do fechamento do mês de referência
  const closingDateRefMonth = new Date(refDate.getFullYear(), refDate.getMonth(), fechDay);
  closingDateRefMonth.setHours(0, 0, 0, 0);

  let closingYear = refDate.getFullYear();
  let closingMonth = refDate.getMonth(); // 0-indexed (0 = Jan, 7 = Ago, 8 = Set)

  // Se a data de referência for estritamente POSTERIOR ao dia de fechamento do mês, pertence à fatura do mês seguinte
  if (refDate > closingDateRefMonth) {
    closingMonth += 1;
    if (closingMonth > 11) {
      closingMonth = 0;
      closingYear += 1;
    }
  }

  // Calcula o mês/ano de vencimento a partir do fechamento
  let vencYear = closingYear;
  let vencMonth = closingMonth;

  // Caso o dia de vencimento seja menor ou igual ao dia de fechamento (ex: Fecha dia 25, Vence dia 05 do mês seguinte)
  if (vencDay <= fechDay) {
    vencMonth += 1;
    if (vencMonth > 11) {
      vencMonth = 0;
      vencYear += 1;
    }
  }

  const dueDate = new Date(vencYear, vencMonth, vencDay);
  dueDate.setHours(0, 0, 0, 0);

  const isPast = dueDate < today;
  const dateStr = `${String(vencDay).padStart(2, "0")}/${String(vencMonth + 1).padStart(2, "0")}/${vencYear}`;

  return {
    dateStr,
    dueDate,
    isPast,
    billingMonth: vencMonth + 1,
    billingYear: vencYear,
  };
}
