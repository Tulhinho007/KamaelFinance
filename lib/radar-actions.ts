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
