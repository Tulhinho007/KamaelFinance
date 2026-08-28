"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

async function getActiveUserId(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const sessionVal = cookieStore.get("kamael_session")?.value;
    if (sessionVal) {
      const parsed = JSON.parse(sessionVal);
      if (parsed?.id) {
        const userExists = await prisma.user.findUnique({
          where: { id: parsed.id },
          select: { id: true }
        });
        if (userExists) return userExists.id;
      }
    }
  } catch (e) {
    // Ignora erro em estático
  }

  const devId = process.env.DEV_USER_ID;
  if (devId && devId !== "00000000-0000-0000-0000-000000000000") {
    const user = await prisma.user.findUnique({ where: { id: devId }, select: { id: true } });
    if (user) return user.id;
  }

  const user =
    (await prisma.user.findFirst({ where: { email: "kamaelcontatos@gmail.com" }, select: { id: true } })) ||
    (await prisma.user.findFirst({ where: { role: "MASTER" }, select: { id: true }, orderBy: { createdAt: "asc" } })) ||
    (await prisma.user.findFirst({ select: { id: true }, orderBy: { createdAt: "asc" } }));

  if (!user) {
    throw new Error("Nenhum usuário encontrado no sistema.");
  }
  return user.id;
}

export type CategoryBudgetOverview = {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  spentAmount: number;
  maxAmount: number;
  percentage: number;
  status: "OK" | "WARNING" | "EXCEEDED";
};

const NON_EXPENSE_KEYWORDS = [
  "salário", "salario", "renda", "receita", "entrada", "investimento",
  "pagamento de fatura", "fatura", "transferência", "transferencia", "ajuste"
];

export async function getCategoryBudgetsOverviewAction(month: number, year: number) {
  const userId = await getActiveUserId();

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  // Filtrar apenas categorias legítimas de despesa
  const expenseCategories = categories.filter(cat => {
    const nameLower = cat.name.toLowerCase();
    return !NON_EXPENSE_KEYWORDS.some(kw => nameLower.includes(kw));
  });

  const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const to   = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  // 1. Transações do mês filtradas por usuário e período
  const transactions = await prisma.transaction.findMany({
    where: {
      wallet: { userId },
      type: "EXPENSE",
      date: { gte: from, lte: to },
      deletedAt: null,
    },
    select: { categoryId: true, amount: true },
  });

  // 2. Tetos específicos cadastrados no banco para M/Y
  const dbBudgets = await (prisma as any).categoryBudget.findMany({
    where: { userId, month, year },
  });

  const budgetMap = new Map<string, number>();
  dbBudgets.forEach((b: any) => {
    budgetMap.set(b.categoryId, Number(b.maxAmount));
  });

  // 3. Mapear gastos por categoria
  const spentMap = new Map<string, number>();
  transactions.forEach(t => {
    if (t.categoryId) {
      const cur = spentMap.get(t.categoryId) || 0;
      spentMap.set(t.categoryId, cur + Number(t.amount));
    }
  });

  const result: CategoryBudgetOverview[] = expenseCategories.map(cat => {
    const spentAmount = spentMap.get(cat.id) || 0;

    // Se houver limite pontual para o mês, usa ele; caso contrário usa o defaultMaxAmount recorrente da categoria
    const monthSpecificMax = budgetMap.get(cat.id);
    const maxAmount = monthSpecificMax !== undefined ? monthSpecificMax : Number((cat as any).defaultMaxAmount || 0);

    let percentage = 0;
    if (maxAmount > 0) {
      percentage = Math.round((spentAmount / maxAmount) * 100);
    }

    let status: "OK" | "WARNING" | "EXCEEDED" = "OK";
    if (maxAmount > 0) {
      if (percentage >= 100) status = "EXCEEDED";
      else if (percentage >= 80) status = "WARNING";
    }

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      categoryColor: cat.color || "#6366f1",
      spentAmount,
      maxAmount,
      percentage,
      status,
    };
  });

  const totalSpent = result.reduce((s, r) => s + r.spentAmount, 0);
  const totalBudget = result.reduce((s, r) => s + r.maxAmount, 0);

  return {
    budgets: result,
    summary: {
      totalSpent,
      totalBudget,
      overallPercentage: totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0,
      exceededCount: result.filter(r => r.status === "EXCEEDED").length,
      warningCount: result.filter(r => r.status === "WARNING").length,
    }
  };
}

export async function saveCategoryBudgetAction(
  categoryId: string,
  maxAmount: number,
  month: number,
  year: number
) {
  const userId = await getActiveUserId();

  // 1. Atualiza/Cria teto pontual no mês
  await (prisma as any).categoryBudget.upsert({
    where: {
      userId_categoryId_month_year: {
        userId,
        categoryId,
        month,
        year,
      },
    },
    create: {
      userId,
      categoryId,
      maxAmount,
      month,
      year,
    },
    update: {
      maxAmount,
    },
  });

  // 2. Atualiza limite padrão recorrente na Categoria
  await (prisma.category as any).update({
    where: { id: categoryId },
    data: { defaultMaxAmount: maxAmount }
  });

  revalidatePath("/planejamento/orcamentos");
  revalidatePath("/despesas");
  revalidatePath("/dashboard");
  return { success: true };
}
