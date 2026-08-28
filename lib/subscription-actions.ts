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
  month?: number | null | string,
  year: number = 2026
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

  const isAnnualView = !month || month === "ALL" || month === "0" || Number.isNaN(Number(month));

  const paymentWhere: any = { year };
  if (!isAnnualView) {
    paymentWhere.month = Number(month);
  }

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
        where: paymentWhere,
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

  const result: SubscriptionWithStatus[] = [];

  subscriptions.forEach((sub: any) => {
    // 1. Filtro estrito de data de criação para evitar projeção fantasma em meses anteriores à criação
    if (!isAnnualView) {
      const numMonth = Number(month);
      const endOfMonth = new Date(Date.UTC(year, numMonth, 0, 23, 59, 59, 999));
      if (sub.createdAt && new Date(sub.createdAt) > endOfMonth) {
        // A assinatura foi criada em um mês POSTERIOR ao mês consultado -> Não existia neste mês!
        return;
      }
    } else {
      const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
      if (sub.createdAt && new Date(sub.createdAt) > endOfYear) {
        return;
      }
    }

    const amt = Number(sub.amount);
    totalMonthlyAmount += amt;

    const payment = sub.payments && sub.payments.length > 0 ? sub.payments[0] : null;
    const isPaid = !!payment;

    if (isPaid) {
      totalPaidAmount += Number(payment.amount || amt);
    } else {
      totalPendingAmount += amt;
    }

    result.push({
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
    });
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

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// 5. Pagar assinatura com Mês de Referência, Data Real e Trava de Saldo
export async function paySubscriptionAction(
  subscriptionId: string,
  refMonth: number,
  refYear: number,
  walletId: string,
  paidAtDateStr?: string,
  skipBalanceDeduction?: boolean
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

  // Data real do pagamento (Fluxo de Caixa)
  const actualPaidAt = paidAtDateStr ? new Date(paidAtDateStr + "T12:00:00") : new Date();

  // Data de hoje em YYYY-MM-DD
  const todayStr = new Date().toISOString().split("T")[0];
  const paidStr = paidAtDateStr || todayStr;

  // Trava de Segurança: Pagamento retroativo (anterior a hoje) NÃO abate do saldo da conta
  const isRetroactive = paidStr < todayStr;

  // O desconto automático no saldo da conta só ocorre se NÃO for retroativo E o checkbox NÃO foi marcado
  const shouldDeductBalance = !isRetroactive && !skipBalanceDeduction;

  // Mês de referência por extenso
  const refMonthName = MONTH_NAMES[Math.min(11, Math.max(0, refMonth - 1))];

  let transactionId: string | null = null;

  if (shouldDeductBalance) {
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

    // 1. Criar transação de débito no histórico da conta com a data REAL do pagamento e a referência na descrição
    const transaction = await prisma.transaction.create({
      data: {
        walletId,
        categoryId: cat.id,
        description: `Assinatura ${sub.name} - Ref: ${refMonthName}/${refYear} (Pago via ${walletName})`,
        type: "EXPENSE",
        amount: amt,
        date: actualPaidAt,
        source: "SUBSCRIPTION",
        status: "COMPLETED",
        tags: `#assinatura,#${sub.category.toLowerCase().replace(/\s+/g, "")}`,
      }
    });
    transactionId = transaction.id;
  }

  // 2. Criar ou atualizar o registro de pagamento vinculado à REFERÊNCIA (refMonth, refYear)
  const payment = await db.subscriptionPayment.upsert({
    where: {
      subscriptionId_month_year: {
        subscriptionId,
        month: refMonth,
        year: refYear
      }
    },
    create: {
      subscriptionId,
      month: refMonth,
      year: refYear,
      amount: amt,
      paymentWalletId: walletId,
      paymentTransactionId: transactionId,
      paidAt: actualPaidAt
    },
    update: {
      amount: amt,
      paymentWalletId: walletId,
      paymentTransactionId: transactionId,
      paidAt: actualPaidAt
    }
  });

  revalidatePath("/assinaturas");
  revalidatePath("/despesas");
  revalidatePath("/cartoes");
  revalidatePath("/dashboard");

  return { success: true, payment, deductedBalance: shouldDeductBalance };
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

// 7. Marcar Meses em Lote (Preenchimento Retroativo de Intervalo)
export async function batchPaySubscriptionsAction(data: {
  subscriptionId: string;
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
  walletId?: string;
  skipBalanceDeduction?: boolean;
}) {
  const sub = await db.subscription.findUnique({
    where: { id: data.subscriptionId }
  });

  if (!sub) {
    throw new Error("Assinatura não encontrada.");
  }

  const amt = Number(sub.amount);
  const walletId = data.walletId || sub.defaultWalletId || null;
  const skipDeduction = data.skipBalanceDeduction ?? true;

  // Gerar lista de pares (mês, ano) do intervalo
  const monthsToProcess: Array<{ month: number; year: number }> = [];
  let curY = data.startYear;
  let curM = data.startMonth;

  while (curY < data.endYear || (curY === data.endYear && curM <= data.endMonth)) {
    monthsToProcess.push({ month: curM, year: curY });
    curM++;
    if (curM > 12) {
      curM = 1;
      curY++;
    }
  }

  const todayStr = new Date().toISOString().split("T")[0];
  let totalProcessed = 0;

  for (const item of monthsToProcess) {
    const dueDay = Math.min(28, sub.dueDay || 10);
    const paidAt = new Date(Date.UTC(item.year, item.month - 1, dueDay, 12, 0, 0));
    const paidStr = paidAt.toISOString().split("T")[0];
    const isRetroactive = paidStr < todayStr;

    const shouldDeduct = !isRetroactive && !skipDeduction && !!walletId;
    let transactionId: string | null = null;

    if (shouldDeduct && walletId) {
      const wallet = await prisma.wallet.findUnique({
        where: { id: walletId },
        select: { title: true, bankName: true }
      });
      const walletName = wallet ? (wallet.bankName || wallet.title) : "Conta";
      const refMonthName = MONTH_NAMES[item.month - 1];

      let cat = await prisma.category.findFirst({
        where: { name: { equals: "Assinaturas", mode: "insensitive" } }
      });

      if (!cat) {
        cat = await prisma.category.create({
          data: { name: "Assinaturas", color: "#6366F1" }
        });
      }

      const tx = await prisma.transaction.create({
        data: {
          walletId,
          categoryId: cat.id,
          description: `Assinatura ${sub.name} - Ref: ${refMonthName}/${item.year} (Pago via ${walletName})`,
          type: "EXPENSE",
          amount: amt,
          date: paidAt,
          source: "SUBSCRIPTION",
          status: "COMPLETED",
          tags: `#assinatura,#${sub.category.toLowerCase().replace(/\s+/g, "")}`,
        }
      });
      transactionId = tx.id;
    }

    await db.subscriptionPayment.upsert({
      where: {
        subscriptionId_month_year: {
          subscriptionId: sub.id,
          month: item.month,
          year: item.year
        }
      },
      create: {
        subscriptionId: sub.id,
        month: item.month,
        year: item.year,
        amount: amt,
        paymentWalletId: walletId,
        paymentTransactionId: transactionId,
        paidAt
      },
      update: {
        amount: amt,
        paymentWalletId: walletId,
        paymentTransactionId: transactionId,
        paidAt
      }
    });

    totalProcessed++;
  }

  revalidatePath("/assinaturas");
  revalidatePath("/despesas");
  revalidatePath("/cartoes");
  revalidatePath("/dashboard");

  return { success: true, count: totalProcessed };
}
