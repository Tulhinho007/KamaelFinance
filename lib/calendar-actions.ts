"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getInvoiceDueDateInfo } from "@/lib/invoice-utils";

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
    // Ignora erro
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
    throw new Error("Nenhum usuário encontrado.");
  }
  return user.id;
}

export type CalendarEventItem = {
  id: string;
  title: string;
  type: "INVOICE" | "SUBSCRIPTION" | "EXPENSE";
  amount: number;
  dueDay: number;
  isPaid: boolean;
  status: "PAGO" | "PENDENTE" | "VENCIDO";
};

export async function getPaymentCalendarDataAction(month: number, year: number) {
  const userId = await getActiveUserId();

  const creditCards = await prisma.wallet.findMany({
    where: { userId, walletType: "CREDIT_CARD" },
    select: { id: true, title: true, bankName: true, vencimento: true, diaFechamento: true, creditLimit: true }
  });

  const subscriptions = await (prisma as any).subscription.findMany({
    where: { OR: [{ userId }, { userId: null }] },
    include: {
      payments: { where: { month, year } }
    }
  });

  const paidInvoices = await (prisma as any).invoicePayment.findMany({
    where: { wallet: { userId }, month, year }
  });
  const paidSet = new Set(paidInvoices.map((p: any) => p.walletId));

  const todayDay = new Date().getDate();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear  = new Date().getFullYear();

  const events: CalendarEventItem[] = [];

  // 1. Faturas de Cartão
  for (const c of creditCards) {
    const dueDay = c.vencimento || 10;
    const isPaid = paidSet.has(c.id);

    // Calcular fatura do cartão
    const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const to   = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const txs = await prisma.transaction.findMany({
      where: { walletId: c.id, type: "EXPENSE", date: { gte: from, lte: to }, deletedAt: null },
      select: { amount: true }
    });
    const amt = txs.reduce((s, t) => s + Number(t.amount), 0);

    if (amt > 0) {
      const isPast = (year < currentYear) || (year === currentYear && month < currentMonth) || (year === currentYear && month === currentMonth && dueDay < todayDay);
      const status = isPaid ? "PAGO" : (isPast ? "VENCIDO" : "PENDENTE");

      events.push({
        id: `card-${c.id}`,
        title: `Fatura ${c.bankName || c.title}`,
        type: "INVOICE",
        amount: amt,
        dueDay,
        isPaid,
        status
      });
    }
  }

  // 2. Assinaturas
  for (const s of subscriptions) {
    const dueDay = Math.min(31, Math.max(1, s.dueDay || 10));
    const isPaid = s.payments && s.payments.length > 0;
    const isPast = (year < currentYear) || (year === currentYear && month < currentMonth) || (year === currentYear && month === currentMonth && dueDay < todayDay);
    const status = isPaid ? "PAGO" : (isPast ? "VENCIDO" : "PENDENTE");

    events.push({
      id: `sub-${s.id}`,
      title: `Assinatura ${s.name}`,
      type: "SUBSCRIPTION",
      amount: Number(s.amount),
      dueDay,
      isPaid,
      status
    });
  }

  // Agrupar por dia do mês
  const calendarMap: Record<number, CalendarEventItem[]> = {};
  events.forEach(ev => {
    if (!calendarMap[ev.dueDay]) calendarMap[ev.dueDay] = [];
    calendarMap[ev.dueDay].push(ev);
  });

  return {
    events,
    calendarMap,
    totalMonthAmount: events.reduce((s, e) => s + e.amount, 0),
    totalPaidAmount: events.filter(e => e.isPaid).reduce((s, e) => s + e.amount, 0),
    totalPendingAmount: events.filter(e => !e.isPaid).reduce((s, e) => s + e.amount, 0),
  };
}
