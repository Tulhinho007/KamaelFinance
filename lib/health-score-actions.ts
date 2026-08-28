"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getEmergencyFundOverviewAction } from "./emergency-fund-actions";
import { getCategoryBudgetsOverviewAction } from "./budget-actions";

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

export type HealthScoreResult = {
  score: number;
  rating: "A+" | "A" | "B" | "C" | "D" | "F";
  statusText: string;
  colorClass: string;
  subscores: {
    savings: { score: number; max: 300; percentage: number; label: string };
    budget: { score: number; max: 250; percentage: number; label: string };
    reserve: { score: number; max: 250; percentage: number; label: string };
    debt: { score: number; max: 200; percentage: number; label: string };
  };
  recommendations: string[];
};

export async function calculateHealthScoreAction(month?: number, year: number = 2026): Promise<HealthScoreResult> {
  const userId = await getActiveUserId();

  const targetMonth = month || (new Date().getMonth() + 1);

  const from = new Date(Date.UTC(year, targetMonth - 1, 1, 0, 0, 0));
  const to   = new Date(Date.UTC(year, targetMonth, 0, 23, 59, 59, 999));

  // 1. Pilar 1: Taxa de Poupança (Máx 300 pts)
  const incomes = await prisma.transaction.findMany({
    where: { wallet: { userId }, type: "INCOME", date: { gte: from, lte: to }, deletedAt: null },
    select: { amount: true }
  });
  const expenses = await prisma.transaction.findMany({
    where: { wallet: { userId }, type: "EXPENSE", date: { gte: from, lte: to }, deletedAt: null },
    select: { amount: true }
  });

  const totalIncome  = incomes.reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = expenses.reduce((s, t) => s + Number(t.amount), 0);

  let savingsRate = 0;
  if (totalIncome > 0) {
    savingsRate = Math.max(0, ((totalIncome - totalExpense) / totalIncome) * 100);
  }

  let savingsScore = 0;
  if (savingsRate >= 30) savingsScore = 300;
  else if (savingsRate > 0) savingsScore = Math.round((savingsRate / 30) * 300);

  // 2. Pilar 2: Cumprimento do Orçamento (Máx 250 pts)
  const budgetOverview = await getCategoryBudgetsOverviewAction(targetMonth, year);
  let budgetScore = 250;
  if (budgetOverview.summary.exceededCount > 0) {
    budgetScore = Math.max(0, 250 - (budgetOverview.summary.exceededCount * 50));
  }

  // 3. Pilar 3: Cobertura da Reserva de Emergência (Máx 250 pts)
  const reserveOverview = await getEmergencyFundOverviewAction();
  const monthsCovered = reserveOverview.monthsCovered;
  let reserveScore = 0;
  if (monthsCovered >= 6) reserveScore = 250;
  else if (monthsCovered > 0) reserveScore = Math.round((monthsCovered / 6) * 250);

  // 4. Pilar 4: Nível de Endividamento (Máx 200 pts)
  const creditCards = await prisma.wallet.findMany({
    where: { userId, walletType: "CREDIT_CARD" },
    select: { id: true }
  });
  const cardIds = creditCards.map(c => c.id);

  const cardExpenses = await prisma.transaction.findMany({
    where: { walletId: { in: cardIds }, type: "EXPENSE", date: { gte: from, lte: to }, deletedAt: null },
    select: { amount: true }
  });
  const totalCardExpenses = cardExpenses.reduce((s, t) => s + Number(t.amount), 0);

  let debtRatio = 0;
  if (totalIncome > 0) {
    debtRatio = (totalCardExpenses / totalIncome) * 100;
  }

  let debtScore = 200;
  if (debtRatio > 50) debtScore = 0;
  else if (debtRatio > 20) debtScore = Math.round(200 - ((debtRatio - 20) / 30) * 150);

  const totalScore = Math.min(1000, Math.max(0, savingsScore + budgetScore + reserveScore + debtScore));

  let rating: "A+" | "A" | "B" | "C" | "D" | "F" = "F";
  let statusText = "Crítico / Ação Imediata";
  let colorClass = "text-rose-500";

  if (totalScore >= 900) {
    rating = "A+"; statusText = "Excelente / Blindado"; colorClass = "text-purple-400";
  } else if (totalScore >= 800) {
    rating = "A"; statusText = "Forte / Saúde Exemplar"; colorClass = "text-emerald-500";
  } else if (totalScore >= 700) {
    rating = "B"; statusText = "Saudável / Estável"; colorClass = "text-teal-400";
  } else if (totalScore >= 550) {
    rating = "C"; statusText = "Moderado / Atenção"; colorClass = "text-amber-500";
  } else if (totalScore >= 400) {
    rating = "D"; statusText = "Vulnerável / Riscos"; colorClass = "text-orange-500";
  }

  const recommendations: string[] = [];
  if (savingsScore < 200) {
    recommendations.push("Aumente sua taxa de poupança tentando guardar ao menos 20% da sua renda mensal.");
  }
  if (budgetScore < 250) {
    recommendations.push("Você possui categorias com teto excedido. Ajuste os orçamentos ou reduza gastos supérfluos.");
  }
  if (reserveScore < 200) {
    recommendations.push("Sua reserva de emergência cobre menos de 6 meses. Considere direcionar novos aportes para ela.");
  }
  if (debtScore < 150) {
    recommendations.push("Suas faturas de cartão comprometem mais de 30% da sua renda. Evite parcelamentos desnecessários.");
  }
  if (recommendations.length === 0) {
    recommendations.push("Parabéns! Sua saúde financeira está em nível excelente. Mantenha os bons hábitos!");
  }

  // Gravar no histórico sem duplicar no mesmo dia
  try {
    await (prisma as any).healthScoreHistory.create({
      data: {
        userId,
        score: totalScore,
        rating,
        savingsSubscore: savingsScore,
        budgetSubscore: budgetScore,
        reserveSubscore: reserveScore,
        debtSubscore: debtScore,
      }
    });
  } catch (e) {
    // Ignora erro de duplicidade se houver
  }

  return {
    score: totalScore,
    rating,
    statusText,
    colorClass,
    subscores: {
      savings: { score: savingsScore, max: 300, percentage: Math.round((savingsScore / 300) * 100), label: `${Math.round(savingsRate)}% da renda poupada` },
      budget: { score: budgetScore, max: 250, percentage: Math.round((budgetScore / 250) * 100), label: budgetOverview.summary.exceededCount === 0 ? "Orçamento 100% cumprido" : `${budgetOverview.summary.exceededCount} categoria(s) estouradas` },
      reserve: { score: reserveScore, max: 250, percentage: Math.round((reserveScore / 250) * 100), label: `${monthsCovered} meses de reserva` },
      debt: { score: debtScore, max: 200, percentage: Math.round((debtScore / 200) * 100), label: `${Math.round(debtRatio)}% da renda em faturas` },
    },
    recommendations
  };
}
