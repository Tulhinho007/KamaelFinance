"use server";

import { prisma } from "./prisma";
import { getActiveUserId } from "./actions";

export type RadarTransactionItem = {
  id: string;
  description: string;
  amount: number;
  date: string;
  categoryName: string;
  categoryColor: string;
  walletTitle: string;
  walletType: string;
  bankName: string | null;
  status: string;
};

export type RadarDateGroup = {
  dateKey: string; // YYYY-MM-DD
  dateDisplay: string; // ex: "Hoje, 15 de Julho" ou "14 de Julho de 2026"
  transactions: RadarTransactionItem[];
};

export type RadarCategoryBreakdownItem = {
  name: string;
  color: string;
  total: number;
  count: number;
  percentage: number;
};

export type RadarOverviewData = {
  success: boolean;
  maxAmount: number;
  totalRadarAmount: number;
  countRadar: number;
  averageRadarAmount: number;
  projectedYearlyAmount: number;
  percentOfTotalBudget: number;
  totalAllExpenses: number;
  categoryBreakdown: RadarCategoryBreakdownItem[];
  groupedTransactions: RadarDateGroup[];
};

function formatGroupDateDisplay(dateStr: string): string {
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  const txDate = new Date(year, month, day);
  const now = new Date();

  const isToday =
    now.getFullYear() === year &&
    now.getMonth() === month &&
    now.getDate() === day;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    yesterday.getFullYear() === year &&
    yesterday.getMonth() === month &&
    yesterday.getDate() === day;

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const monthName = monthNames[month];

  if (isToday) {
    return `Hoje, ${day} de ${monthName}`;
  }
  if (isYesterday) {
    return `Ontem, ${day} de ${monthName}`;
  }
  return `${day} de ${monthName} de ${year}`;
}

export async function getRadarExpensesAction({
  month,
  year,
  maxAmount = 50,
}: {
  month: number;
  year: number;
  maxAmount?: number;
}): Promise<RadarOverviewData> {
  try {
    const userId = await getActiveUserId();

    // Início e fim do mês especificado
    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const allExpenses = await prisma.transaction.findMany({
      where: {
        type: "EXPENSE",
        deletedAt: null,
        date: { gte: startDate, lte: endDate },
        wallet: { userId },
      },
      include: {
        category: true,
        wallet: true,
      },
      orderBy: { date: "desc" },
    });

    // 1. Filtra rigorosamente transações para o Radar:
    // Deve analisar APENAS compras avulsas de cartão de crédito e saídas de débito/dinheiro rotineiras.
    // Ignorar: compromissos fixos da Central de Boletos, empréstimos, financiamentos e quitações de fatura.
    const validExpenses = allExpenses.filter((t) => {
      // Ignorar compromissos fixos, transferências internas e transações de fatura geradas
      if (t.source === "COMMITMENT" || t.source === "TRANSFER" || t.source === "INVOICE") {
        return false;
      }

      const catName = (t.category?.name || "").toLowerCase();
      const desc = (t.description || "").toLowerCase();
      const tags = (t.tags || "").toLowerCase();
      const pm = (t.paymentMethod || "").toUpperCase();

      // Ignorar pagamentos e quitações de fatura
      if (
        catName.includes("pagamento de fatura") ||
        catName.includes("fatura") ||
        tags.includes("pagamentodefatura") ||
        tags.includes("fatura") ||
        tags.includes("compromisso") ||
        tags.includes("boleto_fixo") ||
        tags.includes("transferencia") ||
        desc.includes("pagamento fatura") ||
        desc.includes("quitacao fatura") ||
        desc.includes("quitação fatura") ||
        desc.includes("pagamento de fatura")
      ) {
        return false;
      }

      // Ignorar empréstimos, financiamentos e parcelas de dívida
      if (
        desc.includes("empréstimo") ||
        desc.includes("emprestimo") ||
        desc.includes("financiamento") ||
        desc.includes("parcela fonte") ||
        desc.includes("supersim") ||
        desc.includes("mentore") ||
        catName.includes("empréstimo") ||
        catName.includes("emprestimo") ||
        catName.includes("financiamento") ||
        tags.includes("emprestimo")
      ) {
        return false;
      }

      // Ignorar boletos fixos contratuais
      if (pm === "BOLETO" && (t.source === "COMMITMENT" || tags.includes("boleto"))) {
        return false;
      }

      return true;
    });

    // Total de despesas gerais do mês (excluindo dívidas/faturas contratuais)
    const totalAllExpenses = validExpenses.reduce(
      (acc, t) => acc + Number(t.amount),
      0
    );

    // Filtra transações abaixo ou iguais ao limite parametrizado (ex: R$ 50,00)
    const radarExpenses = validExpenses.filter(
      (t) => Number(t.amount) <= maxAmount
    );

    const totalRadarAmount = radarExpenses.reduce(
      (acc, t) => acc + Number(t.amount),
      0
    );
    const countRadar = radarExpenses.length;
    const averageRadarAmount =
      countRadar > 0 ? totalRadarAmount / countRadar : 0;
    const projectedYearlyAmount = totalRadarAmount * 12;
    const percentOfTotalBudget =
      totalAllExpenses > 0 ? (totalRadarAmount / totalAllExpenses) * 100 : 0;

    // 2. Gráfico por Categoria dos Gastos Invisíveis
    const categoryMap = new Map<
      string,
      { name: string; color: string; total: number; count: number }
    >();

    for (const t of radarExpenses) {
      const catName = t.category?.name || "Outros";
      const catColor = t.category?.color || "#6366F1";
      const amt = Number(t.amount);

      if (!categoryMap.has(catName)) {
        categoryMap.set(catName, {
          name: catName,
          color: catColor,
          total: 0,
          count: 0,
        });
      }
      const cur = categoryMap.get(catName)!;
      cur.total = Math.round((cur.total + amt) * 100) / 100;
      cur.count += 1;
    }

    const categoryBreakdown: RadarCategoryBreakdownItem[] = Array.from(
      categoryMap.values()
    )
      .map((c) => ({
        ...c,
        percentage:
          totalRadarAmount > 0
            ? Math.round((c.total / totalRadarAmount) * 100)
            : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // 3. Agrupamento por Data (YYYY-MM-DD)
    const groupsMap = new Map<string, RadarTransactionItem[]>();

    for (const t of radarExpenses) {
      const d = new Date(t.date);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateKey = `${yyyy}-${mm}-${dd}`;

      const item: RadarTransactionItem = {
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        date: t.date.toISOString(),
        categoryName: t.category?.name || "Sem Categoria",
        categoryColor: t.category?.color || "#64748B",
        walletTitle: t.wallet.title,
        walletType: t.wallet.walletType,
        bankName: t.wallet.bankName || null,
        status: t.status,
      };

      if (!groupsMap.has(dateKey)) {
        groupsMap.set(dateKey, []);
      }
      groupsMap.get(dateKey)!.push(item);
    }

    const groupedTransactions: RadarDateGroup[] = Array.from(
      groupsMap.entries()
    ).map(([dateKey, items]) => ({
      dateKey,
      dateDisplay: formatGroupDateDisplay(dateKey),
      transactions: items,
    }));

    return {
      success: true,
      maxAmount,
      totalRadarAmount,
      countRadar,
      averageRadarAmount,
      projectedYearlyAmount,
      percentOfTotalBudget: Number(percentOfTotalBudget.toFixed(1)),
      totalAllExpenses,
      categoryBreakdown,
      groupedTransactions,
    };
  } catch (error) {
    console.error("Erro ao buscar dados do Radar de Gastos:", error);
    return {
      success: false,
      maxAmount,
      totalRadarAmount: 0,
      countRadar: 0,
      averageRadarAmount: 0,
      projectedYearlyAmount: 0,
      percentOfTotalBudget: 0,
      totalAllExpenses: 0,
      categoryBreakdown: [],
      groupedTransactions: [],
    };
  }
}

// --------------------------------------------------------------------------
// FECHAMENTO MENSAL DE GASTOS POR MODALIDADE (CRÉDITO vs. DÉBITO / CONTAS)
// --------------------------------------------------------------------------

function isInvoicePayment(t: {
  category?: { name?: string | null } | null;
  description?: string | null;
  tags?: string | null;
}): boolean {
  const cat = (t.category?.name || "").toLowerCase();
  const desc = (t.description || "").toLowerCase();
  const tags = (t.tags || "").toLowerCase();
  if (cat.includes("pagamento de fatura") || tags.includes("pagamentodefatura") || tags.includes("fatura")) return true;
  if (
    desc.includes("pagamento fatura") ||
    desc.includes("pagamento de fatura") ||
    desc.includes("quitação fatura") ||
    desc.includes("quitacao fatura")
  ) {
    return true;
  }
  return false;
}

export type MonthlyClosingTransaction = {
  id: string;
  description: string;
  amount: number;
  date: string;
  categoryName: string;
  categoryColor: string;
  installment?: string;
  paymentMethod?: string;
};

export type CardClosingItem = {
  walletId: string;
  name: string;
  bankName: string | null;
  color?: string | null;
  total: number;
  percentage: number;
  count: number;
  transactions: MonthlyClosingTransaction[];
};

export type AccountClosingItem = {
  walletId: string;
  name: string;
  bankName: string | null;
  color?: string | null;
  total: number;
  percentage: number;
  count: number;
  transactions: MonthlyClosingTransaction[];
};

export type MonthlyHistoryItem = {
  month: number;
  year: number;
  label: string; // Ex: "Set/26"
  creditTotal: number;
  debitTotal: number;
  total: number;
};

export type MonthlyClosingHistoryRecord = {
  month: number;
  year: number;
  label: string;               // Ex: "Outubro/2026"
  shortLabel: string;          // Ex: "Out/26"
  totalExpense: number;        // Total geral desembolsado
  creditTotal: number;
  debitTotal: number;
  previousMonthTotal: number;
  diffAmount: number;          // totalExpense - previousMonthTotal
  diffPercentage: number | null; // % de variação vs mês anterior
  status: "CLOSED" | "OPEN" | "FUTURE"; // 🟢 Fechado ou 🟡 Em Aberto ou ⚪ Previsto
  statusLabel: string;         // "Fechado" | "Em Aberto" | "Previsto"
  isCurrent: boolean;          // true se for o mês corrente
};

export type MonthlyClosingExpensesData = {
  success: boolean;
  month: number;
  year: number;
  totalExpense: number;
  creditTotal: number;
  debitTotal: number;
  previousMonthTotal: number;
  diffAmount: number;
  diffPercentage: number | null;
  status: "CLOSED" | "OPEN" | "FUTURE";
  statusLabel: string;
  isCurrentMonth: boolean;
  creditCards: CardClosingItem[];
  bankAccounts: AccountClosingItem[];
  history6Months: MonthlyHistoryItem[];
  monthlyClosingsHistory: MonthlyClosingHistoryRecord[];
};

export async function getMonthlyClosingExpensesAction({
  month,
  year,
}: {
  month: number;
  year: number;
}): Promise<MonthlyClosingExpensesData> {
  try {
    const userId = await getActiveUserId();

    const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const to = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // Busca todas as carteiras/contas/cartões do usuário
    const wallets = await prisma.wallet.findMany({
      where: { userId },
      orderBy: { title: "asc" },
    });

    const creditWallets = wallets.filter((w) => w.walletType === "CREDIT_CARD");
    const bankWallets = wallets.filter((w) => w.walletType !== "CREDIT_CARD");
    const creditWalletIds = creditWallets.map((w) => w.id);
    const bankWalletIds = bankWallets.map((w) => w.id);

    // 1. CRÉDITO: Despesas nos cartões vinculados à fatura do mês selecionado
    const creditTxs = await prisma.transaction.findMany({
      where: {
        walletId: { in: creditWalletIds },
        type: "EXPENSE",
        deletedAt: null,
        source: { not: "RECURRING_PROJECTION" },
        OR: [
          { competenceMonth: month, competenceYear: year },
          {
            competenceMonth: null,
            OR: [
              { competenceDate: { gte: from, lte: to } },
              { purchaseDate: { gte: from, lte: to } },
              { date: { gte: from, lte: to } },
            ],
          },
        ],
      },
      include: {
        category: { select: { id: true, name: true, color: true } },
        wallet: { select: { id: true, title: true, bankName: true } },
      },
      orderBy: [{ date: "desc" }, { purchaseDate: "desc" }],
    });

    const validCreditTxs = creditTxs.filter((t) => !isInvoicePayment(t));

    // 2. DÉBITO & PIX: Saídas liquidadas das contas bancárias no mês selecionado
    const bankTxs = await prisma.transaction.findMany({
      where: {
        walletId: { in: bankWalletIds },
        type: "EXPENSE",
        deletedAt: null,
        source: { not: "RECURRING_PROJECTION" },
        status: { not: "PENDING" },
        OR: [
          { date: { gte: from, lte: to } },
          { paymentDate: { gte: from, lte: to } },
          { competenceMonth: month, competenceYear: year },
        ],
      },
      include: {
        category: { select: { id: true, name: true, color: true } },
        wallet: { select: { id: true, title: true, bankName: true } },
      },
      orderBy: [{ paymentDate: "desc" }, { date: "desc" }],
    });

    const validBankTxs = bankTxs.filter((t) => !isInvoicePayment(t));

    // 3. Mapeamento por Cartão de Crédito
    const creditMap = new Map<
      string,
      {
        walletId: string;
        name: string;
        bankName: string | null;
        total: number;
        count: number;
        transactions: MonthlyClosingTransaction[];
      }
    >();

    for (const w of creditWallets) {
      creditMap.set(w.id, {
        walletId: w.id,
        name: w.title,
        bankName: w.bankName || null,
        total: 0,
        count: 0,
        transactions: [],
      });
    }

    for (const t of validCreditTxs) {
      const amt = Number(t.amount || 0);
      let card = creditMap.get(t.walletId);
      if (!card) {
        card = {
          walletId: t.walletId,
          name: t.wallet?.title || "Cartão",
          bankName: t.wallet?.bankName || null,
          total: 0,
          count: 0,
          transactions: [],
        };
        creditMap.set(t.walletId, card);
      }
      card.total = Math.round((card.total + amt) * 100) / 100;
      card.count += 1;
      card.transactions.push({
        id: t.id,
        description: t.description || "Compra no Cartão",
        amount: amt,
        date: (t.purchaseDate || t.date).toISOString().split("T")[0],
        categoryName: t.category?.name || "Outros",
        categoryColor: t.category?.color || "#6366F1",
        installment:
          t.installmentsCount && t.installmentsCount > 1
            ? `${(t as any).currentInstallment || 1}/${t.installmentsCount}`
            : undefined,
        paymentMethod: "CREDITO",
      });
    }

    const creditTotal = Math.round(
      Array.from(creditMap.values()).reduce((s, c) => s + c.total, 0) * 100
    ) / 100;

    const creditCards: CardClosingItem[] = Array.from(creditMap.values())
      .filter((c) => c.total > 0 || creditWallets.some((w) => w.id === c.walletId))
      .map((c) => ({
        ...c,
        percentage: creditTotal > 0 ? Number(((c.total / creditTotal) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // 4. Mapeamento por Conta Bancária (Débito & Pix)
    const bankMap = new Map<
      string,
      {
        walletId: string;
        name: string;
        bankName: string | null;
        total: number;
        count: number;
        transactions: MonthlyClosingTransaction[];
      }
    >();

    for (const w of bankWallets) {
      bankMap.set(w.id, {
        walletId: w.id,
        name: w.title,
        bankName: w.bankName || null,
        total: 0,
        count: 0,
        transactions: [],
      });
    }

    for (const t of validBankTxs) {
      const amt = Number(t.amount || 0);
      let acc = bankMap.get(t.walletId);
      if (!acc) {
        acc = {
          walletId: t.walletId,
          name: t.wallet?.title || "Conta",
          bankName: t.wallet?.bankName || null,
          total: 0,
          count: 0,
          transactions: [],
        };
        bankMap.set(t.walletId, acc);
      }
      acc.total = Math.round((acc.total + amt) * 100) / 100;
      acc.count += 1;
      acc.transactions.push({
        id: t.id,
        description: t.description || "Saída da Conta",
        amount: amt,
        date: (t.paymentDate || t.date).toISOString().split("T")[0],
        categoryName: t.category?.name || "Outros",
        categoryColor: t.category?.color || "#10B981",
        paymentMethod: (t.paymentMethod || "DEBITO").toUpperCase(),
      });
    }

    const debitTotal = Math.round(
      Array.from(bankMap.values()).reduce((s, a) => s + a.total, 0) * 100
    ) / 100;

    const bankAccounts: AccountClosingItem[] = Array.from(bankMap.values())
      .filter((a) => a.total > 0 || bankWallets.some((w) => w.id === a.walletId))
      .map((a) => ({
        ...a,
        percentage: debitTotal > 0 ? Number(((a.total / debitTotal) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const totalExpense = Math.round((creditTotal + debitTotal) * 100) / 100;

    // 5. Histórico e Evolução dos Últimos 6 Meses
    const MONTH_SHORT = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
      "Jul", "Ago", "Set", "Out", "Nov", "Dez",
    ];
    const MONTH_NAMES_FULL = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const monthsList: Array<{
      m: number;
      y: number;
      label: string;
      start: Date;
      end: Date;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      let m = month - i;
      let y = year;
      while (m <= 0) {
        m += 12;
        y -= 1;
      }
      const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
      monthsList.push({
        m,
        y,
        label: `${MONTH_SHORT[m - 1]}/${String(y).slice(2)}`,
        start,
        end,
      });
    }

    const yearStart = new Date(Date.UTC(year - 1, 11, 1, 0, 0, 0, 0)); // Dezembro do ano anterior
    const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));  // Fim do ano corrente
    const queryStart = monthsList[0].start < yearStart ? monthsList[0].start : yearStart;
    const queryEnd = monthsList[monthsList.length - 1].end > yearEnd ? monthsList[monthsList.length - 1].end : yearEnd;

    const histTxs = await prisma.transaction.findMany({
      where: {
        wallet: { userId },
        type: "EXPENSE",
        deletedAt: null,
        source: { not: "RECURRING_PROJECTION" },
        OR: [
          { competenceDate: { gte: queryStart, lte: queryEnd } },
          { purchaseDate: { gte: queryStart, lte: queryEnd } },
          { date: { gte: queryStart, lte: queryEnd } },
          { paymentDate: { gte: queryStart, lte: queryEnd } },
        ],
      },
      select: {
        walletId: true,
        amount: true,
        date: true,
        purchaseDate: true,
        paymentDate: true,
        competenceMonth: true,
        competenceYear: true,
        competenceDate: true,
        status: true,
        tags: true,
        description: true,
        category: { select: { name: true } },
        wallet: { select: { walletType: true } },
      },
    });

    // Função auxiliar para calcular totais de crédito e débito para qualquer (mês, ano)
    const computeMonthTotals = (m: number, y: number) => {
      const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
      let cTot = 0;
      let dTot = 0;

      for (const t of histTxs) {
        if (isInvoicePayment(t)) continue;
        const isCard = t.wallet?.walletType === "CREDIT_CARD";
        const amt = Number(t.amount || 0);

        if (isCard) {
          if (t.competenceMonth != null && t.competenceYear != null) {
            if (t.competenceMonth === m && t.competenceYear === y) {
              cTot += amt;
            }
          } else {
            const d = new Date(t.competenceDate || t.purchaseDate || t.date);
            if (d >= start && d <= end) {
              cTot += amt;
            }
          }
        } else {
          if (t.status === "PENDING") continue;
          const d = new Date(t.paymentDate || t.date);
          if (d >= start && d <= end) {
            dTot += amt;
          }
        }
      }

      cTot = Math.round(cTot * 100) / 100;
      dTot = Math.round(dTot * 100) / 100;
      return {
        creditTotal: cTot,
        debitTotal: dTot,
        total: Math.round((cTot + dTot) * 100) / 100,
      };
    };

    // 5.1 Gráfico dos 6 Meses
    const history6Months: MonthlyHistoryItem[] = monthsList.map((slot) => {
      const res = computeMonthTotals(slot.m, slot.y);
      return {
        month: slot.m,
        year: slot.y,
        label: slot.label,
        creditTotal: res.creditTotal,
        debitTotal: res.debitTotal,
        total: res.total,
      };
    });

    // 5.2 Histórico Completo de Fechamentos do Ano Selecionado
    const now = new Date();
    const nowMonth = now.getMonth() + 1;
    const nowYear = now.getFullYear();

    const decPrevYearTotals = computeMonthTotals(12, year - 1);
    const yearMonthTotals = new Map<number, { creditTotal: number; debitTotal: number; total: number }>();
    for (let m = 1; m <= 12; m++) {
      yearMonthTotals.set(m, computeMonthTotals(m, year));
    }

    const monthlyClosingsHistory: MonthlyClosingHistoryRecord[] = [];
    for (let m = 12; m >= 1; m--) {
      const curr = yearMonthTotals.get(m)!;
      const prev = m === 1 ? decPrevYearTotals : yearMonthTotals.get(m - 1)!;

      const prevTotal = prev.total;
      const diffAmount = Math.round((curr.total - prevTotal) * 100) / 100;
      let diffPercentage: number | null = null;
      if (prevTotal > 0) {
        diffPercentage = Number((((curr.total - prevTotal) / prevTotal) * 100).toFixed(1));
      } else if (prevTotal === 0 && curr.total === 0) {
        diffPercentage = 0;
      }

      const isCurrent = (year === nowYear && m === nowMonth);
      const isClosed = (year < nowYear || (year === nowYear && m < nowMonth));
      const status: "CLOSED" | "OPEN" | "FUTURE" = isCurrent ? "OPEN" : (isClosed ? "CLOSED" : "FUTURE");
      const statusLabel = isCurrent ? "Em Aberto" : (isClosed ? "Fechado" : "Previsto");

      monthlyClosingsHistory.push({
        month: m,
        year,
        label: `${MONTH_NAMES_FULL[m - 1]}/${year}`,
        shortLabel: `${MONTH_SHORT[m - 1]}/${String(year).slice(2)}`,
        totalExpense: curr.total,
        creditTotal: curr.creditTotal,
        debitTotal: curr.debitTotal,
        previousMonthTotal: prevTotal,
        diffAmount,
        diffPercentage,
        status,
        statusLabel,
        isCurrent,
      });
    }

    // Comparativo do mês selecionado vs mês anterior
    const selPrev = month === 1 ? decPrevYearTotals : (yearMonthTotals.get(month - 1) || computeMonthTotals(month - 1, year));
    const previousMonthTotal = selPrev.total;
    const diffAmount = Math.round((totalExpense - previousMonthTotal) * 100) / 100;
    let diffPercentage: number | null = null;
    if (previousMonthTotal > 0) {
      diffPercentage = Number((((totalExpense - previousMonthTotal) / previousMonthTotal) * 100).toFixed(1));
    } else if (previousMonthTotal === 0 && totalExpense === 0) {
      diffPercentage = 0;
    }

    const isCurrentMonth = (year === nowYear && month === nowMonth);
    const isClosed = (year < nowYear || (year === nowYear && month < nowMonth));
    const status: "CLOSED" | "OPEN" | "FUTURE" = isCurrentMonth ? "OPEN" : (isClosed ? "CLOSED" : "FUTURE");
    const statusLabel = isCurrentMonth ? "Em Aberto" : (isClosed ? "Fechado" : "Previsto");

    return {
      success: true,
      month,
      year,
      totalExpense,
      creditTotal,
      debitTotal,
      previousMonthTotal,
      diffAmount,
      diffPercentage,
      status,
      statusLabel,
      isCurrentMonth,
      creditCards,
      bankAccounts,
      history6Months,
      monthlyClosingsHistory,
    };
  } catch (error) {
    console.error("Erro ao gerar fechamento mensal de despesas:", error);
    return {
      success: false,
      month,
      year,
      totalExpense: 0,
      creditTotal: 0,
      debitTotal: 0,
      previousMonthTotal: 0,
      diffAmount: 0,
      diffPercentage: null,
      status: "OPEN",
      statusLabel: "Em Aberto",
      isCurrentMonth: false,
      creditCards: [],
      bankAccounts: [],
      history6Months: [],
      monthlyClosingsHistory: [],
    };
  }
}

