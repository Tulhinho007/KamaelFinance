"use server";

import { prisma } from "./prisma";
import { getActiveUserId } from "./actions";
import { CATEGORIES, getCategoryColor } from "./constants";
import { revalidatePath } from "next/cache";

export type CategoryBudgetItem = {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  budgetLimit: number;
  spentAmount: number;
  remainingAmount: number;
  percentage: number;
  status: "OK" | "WARNING" | "DANGER" | "NO_LIMIT";
};

export type MonthlyBudgetOverview = {
  success: boolean;
  month: number;
  year: number;
  budgetTotal: number;
  spentTotal: number;
  remainingTotal: number;
  overallPercentage: number;
  overallStatus: "OK" | "WARNING" | "DANGER";
  categories: CategoryBudgetItem[];
};

export async function getMonthlyBudgetDataAction({
  month,
  year,
}: {
  month: number;
  year: number;
}): Promise<MonthlyBudgetOverview> {
  try {
    const userId = await getActiveUserId();

    // Garante que todas as categorias padrão existam no banco
    for (const catName of CATEGORIES) {
      const exists = await prisma.category.findFirst({ where: { name: catName } });
      if (!exists) {
        await prisma.category.create({
          data: { name: catName, color: getCategoryColor(catName) },
        });
      }
    }

    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });

    // Orçamentos salvos para o usuário no mês/ano
    const budgets = await prisma.categoryBudget.findMany({
      where: { userId, month, year },
    });
    const budgetMap = new Map(
      budgets.map((b) => [b.categoryId, Number(b.maxAmount)])
    );

    // Transações do mês
    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const expenses = await prisma.transaction.findMany({
      where: {
        type: "EXPENSE",
        deletedAt: null,
        date: { gte: startDate, lte: endDate },
        wallet: { userId },
      },
      include: {
        category: true,
      },
    });

    // Ignora lançamentos de fatura/transferências
    const validExpenses = expenses.filter((t) => {
      const catName = t.category?.name?.toLowerCase() || "";
      const desc = t.description.toLowerCase();
      const tags = (t.tags || "").toLowerCase();

      if (
        catName.includes("pagamento de fatura") ||
        tags.includes("pagamentodefatura") ||
        desc.includes("pagamento fatura")
      ) {
        return false;
      }
      return true;
    });

    // Soma de gastos reais por categoria
    const spentMap = new Map<string, number>();
    for (const t of validExpenses) {
      if (t.categoryId) {
        spentMap.set(
          t.categoryId,
          (spentMap.get(t.categoryId) || 0) + Number(t.amount)
        );
      }
    }

    const categoryItems: CategoryBudgetItem[] = categories.map((cat) => {
      const limit = budgetMap.get(cat.id) || 0;
      const spent = spentMap.get(cat.id) || 0;
      const remaining = limit > 0 ? limit - spent : 0;
      const pct = limit > 0 ? (spent / limit) * 100 : 0;

      let status: "OK" | "WARNING" | "DANGER" | "NO_LIMIT" = "NO_LIMIT";
      if (limit > 0) {
        if (pct >= 100) status = "DANGER";
        else if (pct >= 80) status = "WARNING";
        else status = "OK";
      }

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        categoryColor: cat.color || getCategoryColor(cat.name),
        budgetLimit: limit,
        spentAmount: spent,
        remainingAmount: remaining,
        percentage: Number(pct.toFixed(1)),
        status,
      };
    });

    const budgetTotal = Array.from(budgetMap.values()).reduce(
      (acc, val) => acc + val,
      0
    );
    const spentTotal = validExpenses.reduce(
      (acc, t) => acc + Number(t.amount),
      0
    );
    const remainingTotal = budgetTotal - spentTotal;
    const overallPct =
      budgetTotal > 0 ? (spentTotal / budgetTotal) * 100 : 0;

    let overallStatus: "OK" | "WARNING" | "DANGER" = "OK";
    if (overallPct >= 100) overallStatus = "DANGER";
    else if (overallPct >= 80) overallStatus = "WARNING";

    return {
      success: true,
      month,
      year,
      budgetTotal,
      spentTotal,
      remainingTotal,
      overallPercentage: Number(overallPct.toFixed(1)),
      overallStatus,
      categories: categoryItems,
    };
  } catch (error) {
    console.error("Erro ao carregar dados do Orçamento Mensal:", error);
    return {
      success: false,
      month,
      year,
      budgetTotal: 0,
      spentTotal: 0,
      remainingTotal: 0,
      overallPercentage: 0,
      overallStatus: "OK",
      categories: [],
    };
  }
}

export async function updateCategoryBudgetAction({
  categoryId,
  maxAmount,
  month,
  year,
}: {
  categoryId: string;
  maxAmount: number;
  month: number;
  year: number;
}) {
  try {
    const userId = await getActiveUserId();
    const amount = Math.max(0, Number(maxAmount));

    if (amount === 0) {
      await prisma.categoryBudget.deleteMany({
        where: { userId, categoryId, month, year },
      });
    } else {
      await prisma.categoryBudget.upsert({
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
          month,
          year,
          maxAmount: amount,
        },
        update: {
          maxAmount: amount,
        },
      });
    }

    revalidatePath("/gestao-financeira/orcamentos");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar teto da categoria:", error);
    return { success: false, error: "Falha ao salvar limite." };
  }
}

export async function copyBudgetsFromPreviousMonthAction({
  month,
  year,
}: {
  month: number;
  year: number;
}) {
  try {
    const userId = await getActiveUserId();

    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = year - 1;
    }

    const prevBudgets = await prisma.categoryBudget.findMany({
      where: { userId, month: prevMonth, year: prevYear },
    });

    if (prevBudgets.length === 0) {
      return {
        success: false,
        error: "Nenhum orçamento configurado no mês anterior para copiar.",
      };
    }

    for (const pb of prevBudgets) {
      await prisma.categoryBudget.upsert({
        where: {
          userId_categoryId_month_year: {
            userId,
            categoryId: pb.categoryId,
            month,
            year,
          },
        },
        create: {
          userId,
          categoryId: pb.categoryId,
          month,
          year,
          maxAmount: pb.maxAmount,
        },
        update: {
          maxAmount: pb.maxAmount,
        },
      });
    }

    revalidatePath("/gestao-financeira/orcamentos");
    return { success: true, count: prevBudgets.length };
  } catch (error) {
    console.error("Erro ao copiar orçamentos do mês anterior:", error);
    return { success: false, error: "Erro ao copiar orçamentos." };
  }
}

export async function batchUpdateCategoryBudgetsAction({
  categoryIds,
  maxAmount,
  month,
  year,
}: {
  categoryIds: string[];
  maxAmount: number;
  month: number;
  year: number;
}) {
  try {
    const userId = await getActiveUserId();
    const amount = Math.max(0, Number(maxAmount));

    if (categoryIds.length === 0) {
      return { success: false, error: "Nenhuma categoria selecionada." };
    }

    if (amount === 0) {
      await prisma.categoryBudget.deleteMany({
        where: {
          userId,
          month,
          year,
          categoryId: { in: categoryIds },
        },
      });
    } else {
      for (const catId of categoryIds) {
        await prisma.categoryBudget.upsert({
          where: {
            userId_categoryId_month_year: {
              userId,
              categoryId: catId,
              month,
              year,
            },
          },
          create: {
            userId,
            categoryId: catId,
            month,
            year,
            maxAmount: amount,
          },
          update: {
            maxAmount: amount,
          },
        });
      }
    }

    revalidatePath("/gestao-financeira/orcamentos");
    return { success: true, count: categoryIds.length };
  } catch (error) {
    console.error("Erro ao atualizar tetos em lote:", error);
    return { success: false, error: "Falha ao salvar limites em lote." };
  }
}
