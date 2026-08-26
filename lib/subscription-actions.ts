"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

const db = prisma as any;

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
    // Ignora erro de leitura de cookie
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

export type SubscriptionWithStatus = {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  category: string;
  defaultWalletId: string | null;
  defaultWalletTitle?: string | null;
  isPaid: boolean;
  paidInfo: {
    paymentId: string;
    amount: number;
    paidAt: string;
    paymentWalletId: string | null;
    paymentWalletTitle?: string | null;
    transactionId?: string | null;
  } | null;
};

// 1. Obter assinaturas com status do mês selecionado
export async function getSubscriptionsWithMonthlyStatusAction(
  month: number,
  year: number
): Promise<{
  subscriptions: SubscriptionWithStatus[];
  summary: {
    totalSubscriptionsCount: number;
    totalMonthlyAmount: number;
    totalPaidAmount: number;
    totalPendingAmount: number;
  };
}> {
  const userId = await getActiveUserId();

  // Buscar todas as assinaturas do usuário (ou sistema)
  const subscriptions = await db.subscription.findMany({
    where: {
      OR: [{ userId }, { userId: null }]
    },
    include: {
      defaultWallet: {
        select: { id: true, title: true, bankName: true }
      },
      payments: {
        where: { month, year },
        include: {
          subscription: true
        }
      }
    },
    orderBy: [{ dueDay: "asc" }, { name: "asc" }]
  });

  // Buscar informações das carteiras de pagamento do mês
  const walletIds = new Set<string>();
  subscriptions.forEach((sub: any) => {
    if (sub.defaultWalletId) walletIds.add(sub.defaultWalletId);
    sub.payments.forEach((p: any) => {
      if (p.paymentWalletId) walletIds.add(p.paymentWalletId);
    });
  });

  const wallets = await prisma.wallet.findMany({
    where: { id: { in: Array.from(walletIds) } },
    select: { id: true, title: true, bankName: true }
  });

  const walletMap = new Map<string, string>();
  wallets.forEach(w => {
    walletMap.set(w.id, w.bankName || w.title);
  });

  let totalMonthlyAmount = 0;
  let totalPaidAmount = 0;
  let totalPendingAmount = 0;

  const result: SubscriptionWithStatus[] = subscriptions.map((sub: any) => {
    const amt = Number(sub.amount);
    totalMonthlyAmount += amt;

    const payment = sub.payments && sub.payments.length > 0 ? sub.payments[0] : null;
    const isPaid = !!payment;

    if (isPaid) {
      totalPaidAmount += Number(payment.amount || amt);
    } else {
      totalPendingAmount += amt;
    }

    return {
      id: sub.id,
      name: sub.name,
      amount: amt,
      dueDay: sub.dueDay,
      category: sub.category || "Outros",
      defaultWalletId: sub.defaultWalletId,
      defaultWalletTitle: sub.defaultWalletId ? (walletMap.get(sub.defaultWalletId) || sub.defaultWallet?.title || null) : null,
      isPaid,
      paidInfo: payment
        ? {
            paymentId: payment.id,
            amount: Number(payment.amount),
            paidAt: payment.paidAt.toISOString(),
            paymentWalletId: payment.paymentWalletId,
            paymentWalletTitle: payment.paymentWalletId ? (walletMap.get(payment.paymentWalletId) || null) : null,
            transactionId: payment.paymentTransactionId,
          }
        : null
    };
  });

  return {
    subscriptions: result,
    summary: {
      totalSubscriptionsCount: result.length,
      totalMonthlyAmount,
      totalPaidAmount,
      totalPendingAmount,
    }
  };
}

// 2. Criar nova assinatura
export async function createSubscriptionAction(data: {
  name: string;
  amount: number;
  dueDay: number;
  category: string;
  defaultWalletId?: string;
}) {
  const userId = await getActiveUserId();

  const created = await db.subscription.create({
    data: {
      userId,
      name: data.name.trim(),
      amount: data.amount,
      dueDay: Math.min(31, Math.max(1, data.dueDay)),
      category: data.category || "Outros",
      defaultWalletId: data.defaultWalletId || null,
    }
  });

  revalidatePath("/assinaturas");
  return created;
}

// 3. Editar assinatura
export async function updateSubscriptionAction(
  id: string,
  data: {
    name: string;
    amount: number;
    dueDay: number;
    category: string;
    defaultWalletId?: string;
  }
) {
  const updated = await db.subscription.update({
    where: { id },
    data: {
      name: data.name.trim(),
      amount: data.amount,
      dueDay: Math.min(31, Math.max(1, data.dueDay)),
      category: data.category || "Outros",
      defaultWalletId: data.defaultWalletId || null,
    }
  });

  revalidatePath("/assinaturas");
  return updated;
}

// 4. Excluir assinatura
export async function deleteSubscriptionAction(id: string) {
  await db.subscription.delete({
    where: { id }
  });

  revalidatePath("/assinaturas");
  return { success: true };
}

// 5. Pagar assinatura no mês selecionado
export async function paySubscriptionAction(
  subscriptionId: string,
  month: number,
  year: number,
  walletId: string
) {
  const sub = await db.subscription.findUnique({
    where: { id: subscriptionId }
  });

  if (!sub) {
    throw new Error("Assinatura não encontrada.");
  }

  const wallet = await prisma.wallet.findUnique({
    where: { id: walletId },
    select: { id: true, title: true, bankName: true, walletType: true }
  });

  if (!wallet) {
    throw new Error("Conta/Carteira selecionada não foi encontrada.");
  }

  const walletName = wallet.bankName || wallet.title;
  const amt = Number(sub.amount);

  // Data do pagamento
  const dueDay = Math.min(28, sub.dueDay);
  const txDate = new Date(year, month - 1, dueDay);

  // Buscar ou criar categoria "Assinaturas" se necessário
  let cat = await prisma.category.findFirst({
    where: { name: { equals: "Assinaturas", mode: "insensitive" } }
  });

  if (!cat) {
    cat = await prisma.category.create({
      data: {
        name: "Assinaturas",
        color: "#6366F1"
      }
    });
  }

  // 1. Criar transação de débito no histórico da conta
  const transaction = await prisma.transaction.create({
    data: {
      walletId,
      categoryId: cat.id,
      description: `Assinatura ${sub.name} (Pago via ${walletName})`,
      type: "EXPENSE",
      amount: amt,
      date: txDate,
      source: "SUBSCRIPTION",
      status: "COMPLETED",
      tags: `#assinatura,#${sub.category.toLowerCase().replace(/\s+/g, "")}`,
    }
  });

  // 2. Criar registro de pagamento em SubscriptionPayment
  const payment = await db.subscriptionPayment.upsert({
    where: {
      subscriptionId_month_year: {
        subscriptionId,
        month,
        year
      }
    },
    create: {
      subscriptionId,
      month,
      year,
      amount: amt,
      paymentWalletId: walletId,
      paymentTransactionId: transaction.id,
      paidAt: new Date()
    },
    update: {
      amount: amt,
      paymentWalletId: walletId,
      paymentTransactionId: transaction.id,
      paidAt: new Date()
    }
  });

  revalidatePath("/assinaturas");
  revalidatePath("/despesas");
  revalidatePath("/cartoes");
  revalidatePath("/dashboard");

  return { success: true, payment, transaction };
}

// 6. Desfazer pagamento de assinatura
export async function undoSubscriptionPaymentAction(
  subscriptionId: string,
  month: number,
  year: number
) {
  const payment = await db.subscriptionPayment.findUnique({
    where: {
      subscriptionId_month_year: {
        subscriptionId,
        month,
        year
      }
    }
  });

  if (payment) {
    if (payment.paymentTransactionId) {
      try {
        await prisma.transaction.delete({
          where: { id: payment.paymentTransactionId }
        });
      } catch (e) {
        console.error("Transação associada já havia sido removida:", e);
      }
    }

    await db.subscriptionPayment.delete({
      where: { id: payment.id }
    });
  }

  revalidatePath("/assinaturas");
  revalidatePath("/despesas");
  revalidatePath("/cartoes");
  revalidatePath("/dashboard");

  return { success: true };
}
