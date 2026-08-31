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

export type RadarOverviewData = {
  success: boolean;
  maxAmount: number;
  totalRadarAmount: number;
  countRadar: number;
  averageRadarAmount: number;
  percentOfTotalBudget: number;
  totalAllExpenses: number;
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

    // Filtra transações que não sejam pagamentos de fatura nem transferências
    const validExpenses = allExpenses.filter((t) => {
      const catName = t.category?.name?.toLowerCase() || "";
      const desc = t.description.toLowerCase();
      const tags = (t.tags || "").toLowerCase();

      if (
        catName.includes("pagamento de fatura") ||
        tags.includes("pagamentodefatura") ||
        desc.includes("pagamento fatura") ||
        desc.includes("quitacao fatura")
      ) {
        return false;
      }
      return true;
    });

    // Total de despesas gerais do mês
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
    const percentOfTotalBudget =
      totalAllExpenses > 0 ? (totalRadarAmount / totalAllExpenses) * 100 : 0;

    // Agrupamento por Data (YYYY-MM-DD)
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
      percentOfTotalBudget: Number(percentOfTotalBudget.toFixed(1)),
      totalAllExpenses,
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
      percentOfTotalBudget: 0,
      totalAllExpenses: 0,
      groupedTransactions: [],
    };
  }
}
