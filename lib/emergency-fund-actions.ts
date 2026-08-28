"use server";

import { prisma } from "@/lib/prisma";
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

export async function getEmergencyFundOverviewAction(selectedWalletIds?: string[]) {
  const userId = await getActiveUserId();

  // 1. Carteiras do usuário
  const allWallets = await prisma.wallet.findMany({
    where: { userId },
    select: { id: true, title: true, bankName: true, walletType: true, initialBalance: true }
  });

  // Filtrar apenas carteiras bancárias/líquidas (ou selecionadas pelo usuário)
  const liquidWallets = allWallets.filter(w =>
    selectedWalletIds && selectedWalletIds.length > 0
      ? selectedWalletIds.includes(w.id)
      : w.walletType === "CONTA_CORRENTE" || w.walletType === "TICKET"
  );

  // 2. Calcular saldo total disponível nas carteiras de liquidez
  let totalLiquidity = 0;
  for (const w of liquidWallets) {
    const txs = await prisma.transaction.findMany({
      where: { walletId: w.id, deletedAt: null, status: "COMPLETED" },
      select: { type: true, amount: true }
    });
    const inc = txs.filter(t => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
    const exp = txs.filter(t => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);
    const net = Number(w.initialBalance || 0) + inc - exp;
    totalLiquidity += Math.max(0, net);
  }

  // 3. Média Móvel dos Gastos Mensais dos últimos 6 meses
  const now = new Date();
  const sixMonthsAgo = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 6, 1, 0, 0, 0));

  const pastExpenses = await prisma.transaction.findMany({
    where: {
      wallet: { userId },
      type: "EXPENSE",
      date: { gte: sixMonthsAgo },
      deletedAt: null,
    },
    select: { amount: true, date: true }
  });

  const total6MonthExpenses = pastExpenses.reduce((s, t) => s + Number(t.amount), 0);
  const monthlyAverageCost = total6MonthExpenses > 0 ? (total6MonthExpenses / 6) : 3500; // Fallback realista R$3500 se novo

  // 4. Meses de Cobertura
  const monthsCovered = monthlyAverageCost > 0 ? Math.round((totalLiquidity / monthlyAverageCost) * 10) / 10 : 0;

  let shieldLevel: "CRITICAL" | "MODERATE" | "SOLID" | "ARMORED" = "CRITICAL";
  if (monthsCovered >= 12) shieldLevel = "ARMORED";
  else if (monthsCovered >= 6) shieldLevel = "SOLID";
  else if (monthsCovered >= 3) shieldLevel = "MODERATE";

  return {
    totalLiquidity,
    monthlyAverageCost,
    monthsCovered,
    shieldLevel,
    target6Months: monthlyAverageCost * 6,
    target12Months: monthlyAverageCost * 12,
    remainingFor6Months: Math.max(0, (monthlyAverageCost * 6) - totalLiquidity),
    wallets: allWallets.map(w => ({
      id: w.id,
      title: w.title,
      bankName: w.bankName || w.title,
      walletType: w.walletType,
      isSelected: liquidWallets.some(lw => lw.id === w.id)
    }))
  };
}
