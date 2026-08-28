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
  dueDateStr: string;
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

  // Normalizar Data Atual para comparação estrita (00:00:00)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const events: CalendarEventItem[] = [];

  // 1. FATURAS DE CARTÃO DE CRÉDITO
  // O vencimento real da fatura no mês 'month' / 'year' é no dia 'c.vencimento' de 'month'/'year'.
  // As compras que compõem essa fatura foram efetuadas na competência anterior (month - 1).
  const purchasesMonth = month === 1 ? 12 : month - 1;
  const purchasesYear  = month === 1 ? year - 1 : year;

  const purchasesFrom = new Date(Date.UTC(purchasesYear, purchasesMonth - 1, 1, 0, 0, 0));
  const purchasesTo   = new Date(Date.UTC(purchasesYear, purchasesMonth, 0, 23, 59, 59, 999));

  for (const c of creditCards) {
    const dueDay = Math.min(31, Math.max(1, c.vencimento || 10));
    const dueDate = new Date(year, month - 1, dueDay, 0, 0, 0);

    const isPaid = paidSet.has(c.id);

    // Soma das compras da fatura que vence neste mês selecionado
    const txs = await prisma.transaction.findMany({
      where: {
        walletId: c.id,
        type: "EXPENSE",
        deletedAt: null,
        date: { gte: purchasesFrom, lte: purchasesTo }
      },
      select: { amount: true }
    });
    const amt = txs.reduce((s, t) => s + Number(t.amount), 0);

    if (amt > 0) {
      // Regra de Status:
      // - PAGO: se isPaid === true
      // - VENCIDO: APENAS se dueDate < today E não foi paga
      // - PENDENTE (A Vencer): se dueDate >= today E não foi paga
      const status: "PAGO" | "PENDENTE" | "VENCIDO" = isPaid
        ? "PAGO"
        : (dueDate < today ? "VENCIDO" : "PENDENTE");

      const dueDateStr = `${String(dueDay).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;

      events.push({
        id: `card-${c.id}`,
        title: `Fatura ${c.bankName || c.title}`,
        type: "INVOICE",
        amount: amt,
        dueDay,
        dueDateStr,
        isPaid,
        status
      });
    }
  }

  // 2. ASSINATURAS
  for (const s of subscriptions) {
    const dueDay = Math.min(31, Math.max(1, s.dueDay || 10));
    const dueDate = new Date(year, month - 1, dueDay, 0, 0, 0);

    const isPaid = s.payments && s.payments.length > 0;
    const status: "PAGO" | "PENDENTE" | "VENCIDO" = isPaid
      ? "PAGO"
      : (dueDate < today ? "VENCIDO" : "PENDENTE");

    const dueDateStr = `${String(dueDay).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;

    events.push({
      id: `sub-${s.id}`,
      title: `Assinatura ${s.name}`,
      type: "SUBSCRIPTION",
      amount: Number(s.amount),
      dueDay,
      dueDateStr,
      isPaid,
      status
    });
  }

  // 3. DESPESAS DIRETAS (Conta Corrente / Outras Carteiras) com vencimento neste mês
  const directFrom = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const directTo   = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const directExpenses = await prisma.transaction.findMany({
    where: {
      wallet: { userId, walletType: { not: "CREDIT_CARD" } },
      type: "EXPENSE",
      date: { gte: directFrom, lte: directTo },
      deletedAt: null,
      NOT: [
        { category: { name: { contains: "Pagamento de Fatura", mode: "insensitive" } } },
        { description: { contains: "Pagamento Fatura", mode: "insensitive" } },
        { tags: { contains: "pagamentodefatura", mode: "insensitive" } },
      ]
    },
    include: { wallet: true }
  });

  for (const exp of directExpenses) {
    const expDate = new Date(exp.date);
    const dueDay = expDate.getUTCDate();
    const dueDate = new Date(year, month - 1, dueDay, 0, 0, 0);

    const isPaid = exp.status === "COMPLETED" || exp.status === "PAID" || exp.status === "pago";
    const status: "PAGO" | "PENDENTE" | "VENCIDO" = isPaid
      ? "PAGO"
      : (dueDate < today ? "VENCIDO" : "PENDENTE");

    const dueDateStr = `${String(dueDay).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;

    events.push({
      id: `exp-${exp.id}`,
      title: exp.description,
      type: "EXPENSE",
      amount: Number(exp.amount),
      dueDay,
      dueDateStr,
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
