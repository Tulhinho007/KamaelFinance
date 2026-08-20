import { prisma } from "./prisma";

/**
 * Todas as consultas abaixo calculam saldo/gasto dinamicamente a partir das
 * transações — nunca lemos um "saldo atual" gravado no banco (ver nota no
 * schema.prisma). `deletedAt: null` respeita o soft delete.
 */

export type WalletWithTotals = {
  id: string;
  title: string;
  walletType: string;
  initialBalance: number;
  spent: number;
  income: number;
  balance: number;
};

// Uma carteira com total gasto, total recebido e saldo calculado
export async function getWalletsWithTotals(userId: string): Promise<WalletWithTotals[]> {
  const wallets = await prisma.wallet.findMany({
    where: { userId },
    include: {
      transactions: {
        where: { deletedAt: null },
        select: { type: true, amount: true },
      },
    },
  });

  return wallets.map((w) => {
    const spent = w.transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const income = w.transactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      id: w.id,
      title: w.title,
      walletType: w.walletType,
      initialBalance: Number(w.initialBalance),
      spent,
      income,
      balance: Number(w.initialBalance) + income - spent,
    };
  });
}

// Transações de uma carteira, com filtro opcional por texto e paginação simples
export async function getWalletTransactions(
  walletId: string,
  opts: { query?: string; limit?: number } = {}
) {
  const { query = "", limit = 50 } = opts;

  const transactions = await prisma.transaction.findMany({
    where: {
      walletId,
      deletedAt: null,
      ...(query ? { description: { contains: query, mode: "insensitive" } } : {}),
    },
    include: { category: true },
    orderBy: { date: "desc" },
    take: limit,
  });

  return transactions.map((t) => ({
    ...t,
    amount: Number(t.amount),
  }));
}

// Soma de gastos por categoria (para o gráfico de rosca) num intervalo de datas
export async function getCategoryBreakdown(
  userId: string,
  { from, to }: { from: Date; to: Date }
) {
  const grouped = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      type: "EXPENSE",
      deletedAt: null,
      date: { gte: from, lte: to },
      wallet: { userId },
    },
    _sum: { amount: true },
  });

  const categoryIds = grouped.map((g) => g.categoryId).filter(Boolean) as string[];
  const categories = await prisma.category.findMany({ where: { id: { in: categoryIds } } });
  const byId = new Map(categories.map((c) => [c.id, c]));

  return grouped
    .filter((g) => g.categoryId)
    .map((g) => ({
      categoryId: g.categoryId as string,
      name: byId.get(g.categoryId as string)?.name ?? "Sem categoria",
      color: byId.get(g.categoryId as string)?.color ?? "#6B7280",
      total: Number(g._sum.amount ?? 0),
    }))
    .sort((a, b) => b.total - a.total);
}

// Total de gastos por mês, últimos N meses (para o gráfico de linhas)
export async function getMonthlyHistory(userId: string, months = 6) {
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);

  const transactions = await prisma.transaction.findMany({
    where: {
      type: "EXPENSE",
      deletedAt: null,
      date: { gte: since },
      wallet: { userId },
    },
    select: { date: true, amount: true },
  });

  const totalsByMonth = new Map<string, number>();
  for (const t of transactions) {
    const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
    totalsByMonth.set(key, (totalsByMonth.get(key) ?? 0) + Number(t.amount));
  }

  // Garante todos os meses no intervalo, mesmo sem gasto (mostra 0 em vez de sumir do gráfico)
  const result: { month: string; gastos: number }[] = [];
  const cursor = new Date(since);
  for (let i = 0; i < months; i++) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    const label = cursor.toLocaleDateString("pt-BR", { month: "short" });
    result.push({ month: label, gastos: totalsByMonth.get(key) ?? 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return result;
}
