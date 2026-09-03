"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { getActiveUserId } from "./actions";
import { getInvoiceDueDateInfo } from "./invoice-utils";
import { getMonthName } from "./constants";

export interface CreateCreditPixInput {
  sourceCardWalletId: string;
  destAccountWalletId: string;
  netAmount: number;
  installmentsCount: number;
  installmentAmount: number;
  firstBillingMonth: number;
  firstBillingYear: number;
  operationDate: string;
  description?: string;
}

export interface CreditPixInstallmentDetail {
  installmentNumber: number;
  installmentsCount: number;
  amount: number;
  billingMonth: number;
  billingYear: number;
  dueDateStr: string;
  isPaid: boolean;
  status: "Paga" | "Pendente" | "Atrasada";
}

export interface CreditPixOperationItem {
  id: string;
  operationDate: string;
  operationDateFormatted: string;
  sourceCard: {
    id: string;
    title: string;
    bankName: string;
    lastDigits: string;
  };
  destAccount: {
    id: string;
    title: string;
    bankName: string;
  };
  netAmount: number;
  totalAmount: number;
  feeAmount: number;
  feePercentage: number;
  installmentsCount: number;
  installmentAmount: number;
  firstBillingMonth: number;
  firstBillingYear: number;
  description?: string;
  status: string;
  paidInstallmentsCount: number;
  installments: CreditPixInstallmentDetail[];
}

export interface CreditPixOverviewData {
  totalNet: number;
  totalFees: number;
  totalDebt: number;
  totalInstallments: number;
  paidInstallments: number;
  amortizationPct: number;
  operations: CreditPixOperationItem[];
}

/**
 * Retorna as contas e cartões disponíveis para o modal de novo PIX no Crédito
 */
export async function getCreditPixOptionsAction() {
  const userId = await getActiveUserId();

  const [creditCards, bankAccounts] = await Promise.all([
    prisma.wallet.findMany({
      where: {
        userId,
        walletType: "CREDIT_CARD",
      },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        bankName: true,
        creditLimit: true,
        vencimento: true,
        diaFechamento: true,
      },
    }),
    prisma.wallet.findMany({
      where: {
        userId,
        walletType: { in: ["CONTA_CORRENTE", "DEBIT", "INVESTIMENTO"] },
      },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        bankName: true,
        initialBalance: true,
      },
    }),
  ]);

  return {
    creditCards: creditCards.map((c) => ({
      id: c.id,
      title: c.title,
      bankName: c.bankName || c.title,
      limit: Number(c.creditLimit || 0),
      vencimento: c.vencimento || 10,
      diaFechamento: (c as any).diaFechamento || 1,
    })),
    bankAccounts: bankAccounts.map((a) => ({
      id: a.id,
      title: a.title,
      bankName: a.bankName || a.title,
    })),
  };
}

/**
 * Cria uma operação completa de PIX no Crédito de forma atômica
 */
export async function createCreditPixOperationAction(input: CreateCreditPixInput) {
  const userId = await getActiveUserId();

  if (!input.sourceCardWalletId) throw new Error("Selecione o cartão de crédito de origem.");
  if (!input.destAccountWalletId) throw new Error("Selecione a conta corrente de destino.");
  if (!input.netAmount || input.netAmount <= 0) throw new Error("O valor líquido deve ser maior que zero.");
  if (!input.installmentsCount || input.installmentsCount < 1) throw new Error("A quantidade de parcelas deve ser de no mínimo 1.");
  if (!input.installmentAmount || input.installmentAmount <= 0) throw new Error("O valor da parcela deve ser maior que zero.");

  const [sourceCard, destAccount] = await Promise.all([
    prisma.wallet.findUnique({
      where: { id: input.sourceCardWalletId, userId },
    }),
    prisma.wallet.findUnique({
      where: { id: input.destAccountWalletId, userId },
    }),
  ]);

  if (!sourceCard) throw new Error("Cartão de crédito não encontrado.");
  if (!destAccount) throw new Error("Conta corrente destino não encontrada.");

  const netAmount = Math.round(Number(input.netAmount) * 100) / 100;
  const installmentsCount = Number(input.installmentsCount);
  const installmentAmount = Math.round(Number(input.installmentAmount) * 100) / 100;

  const totalAmount = Math.round(installmentsCount * installmentAmount * 100) / 100;
  const feeAmount = Math.max(0, Math.round((totalAmount - netAmount) * 100) / 100);
  const feePercentage = netAmount > 0 ? Math.round((feeAmount / netAmount) * 10000) / 100 : 0;

  const opDate = input.operationDate ? new Date(input.operationDate) : new Date();
  const groupId = `cpix-${crypto.randomUUID()}`;

  // Executa toda a transação no banco de dados
  const result = await prisma.$transaction(async (tx) => {
    // 1. Garante categorias padrão
    let incomeCat = await tx.category.findFirst({
      where: { name: { equals: "Aporte de Liquidez", mode: "insensitive" } },
    });
    if (!incomeCat) {
      incomeCat = await tx.category.create({
        data: { name: "Aporte de Liquidez", color: "#10B981" },
      });
    }

    let expenseCat = await tx.category.findFirst({
      where: { name: { equals: "PIX no Crédito", mode: "insensitive" } },
    });
    if (!expenseCat) {
      expenseCat = await tx.category.create({
        data: { name: "PIX no Crédito", color: "#8B5CF6" },
      });
    }

    // 2. Cria a transação de entrada (INCOME) na conta corrente
    const incomeTx = await tx.transaction.create({
      data: {
        walletId: destAccount.id,
        categoryId: incomeCat.id,
        description: `PIX no Crédito - Entrada de Liquidez (${sourceCard.title})`,
        type: "INCOME",
        amount: netAmount,
        date: opDate,
        competenceDate: opDate,
        status: "COMPLETED",
        source: "MANUAL",
        tags: "#pixcredito",
      },
    });

    // 3. Cria as N transações de despesa parcelada no cartão de crédito
    for (let i = 1; i <= installmentsCount; i++) {
      // Cálculo da competência de fatura de cada parcela
      const rawMonth = input.firstBillingMonth + (i - 1);
      const targetMonth = ((rawMonth - 1) % 12) + 1;
      const targetYear = input.firstBillingYear + Math.floor((rawMonth - 1) / 12);

      // Data de referência da parcela dentro do mês de competência
      const instDate = new Date(Date.UTC(targetYear, targetMonth - 1, 15, 12, 0, 0));

      await tx.transaction.create({
        data: {
          walletId: sourceCard.id,
          categoryId: expenseCat.id,
          description: `PIX no Crédito (${i}/${installmentsCount}) - ${destAccount.title}`,
          type: "EXPENSE",
          amount: installmentAmount,
          date: instDate,
          competenceDate: instDate,
          installmentsCount,
          currentInstallment: i,
          installmentGroupId: groupId,
          status: "COMPLETED",
          source: "MANUAL",
          tags: "#pixcredito",
        },
      });
    }

    // 4. Cria o registro mestre de CreditPixOperation
    const operation = await (tx as any).creditPixOperation.create({
      data: {
        userId,
        sourceCardWalletId: sourceCard.id,
        destAccountWalletId: destAccount.id,
        netAmount,
        totalAmount,
        feeAmount,
        feePercentage,
        installmentsCount,
        installmentAmount,
        firstBillingMonth: input.firstBillingMonth,
        firstBillingYear: input.firstBillingYear,
        operationDate: opDate,
        installmentGroupId: groupId,
        incomeTransactionId: incomeTx.id,
        description: input.description || null,
        status: "ACTIVE",
      },
    });

    return operation;
  });

  revalidatePath("/pix-credito");
  revalidatePath("/despesas");
  revalidatePath("/dashboard");
  revalidatePath("/receitas");

  return { success: true, operationId: result.id };
}

/**
 * Consulta todas as operações de PIX no Crédito com métricas consolidadas e cronograma de faturas
 */
export async function getCreditPixOverviewAction(): Promise<CreditPixOverviewData> {
  const userId = await getActiveUserId();

  const operations = await (prisma as any).creditPixOperation.findMany({
    where: { userId },
    include: {
      sourceCardWallet: true,
      destAccountWallet: true,
    },
    orderBy: { operationDate: "desc" },
  });

  if (!operations || operations.length === 0) {
    return {
      totalNet: 0,
      totalFees: 0,
      totalDebt: 0,
      totalInstallments: 0,
      paidInstallments: 0,
      amortizationPct: 0,
      operations: [],
    };
  }

  // Busca todos os pagamentos de fatura para conferência do status de cada parcela
  const allCardIds = Array.from(new Set(operations.map((o: any) => o.sourceCardWalletId)));
  const paidInvoices = await (prisma as any).invoicePayment.findMany({
    where: {
      walletId: { in: allCardIds },
    },
  });

  const paidSet = new Set<string>();
  paidInvoices.forEach((p: any) => {
    paidSet.add(`${p.walletId}-${p.month}-${p.year}`);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalNet = 0;
  let totalFees = 0;
  let totalDebt = 0;
  let totalInstallments = 0;
  let paidInstallments = 0;

  const operationItems: CreditPixOperationItem[] = operations.map((op: any) => {
    const net = Number(op.netAmount || 0);
    const total = Number(op.totalAmount || 0);
    const fee = Number(op.feeAmount || 0);
    const count = Number(op.installmentsCount || 1);
    const instAmt = Number(op.installmentAmount || 0);

    totalNet += net;
    totalFees += fee;
    totalDebt += total;
    totalInstallments += count;

    const sourceCard = op.sourceCardWallet;
    const destAccount = op.destAccountWallet;

    const titleDigits = sourceCard.title?.replace(/\D/g, "").slice(-4).padStart(4, "0");
    const lastDigits = titleDigits ? `**** ${titleDigits}` : "**** ----";

    const installments: CreditPixInstallmentDetail[] = [];
    let opPaidCount = 0;

    for (let i = 1; i <= count; i++) {
      const rawMonth = op.firstBillingMonth + (i - 1);
      const bMonth = ((rawMonth - 1) % 12) + 1;
      const bYear = op.firstBillingYear + Math.floor((rawMonth - 1) / 12);

      const dueDateInfo = getInvoiceDueDateInfo(
        sourceCard.diaFechamento ?? 1,
        sourceCard.vencimento ?? 10,
        bMonth,
        bYear
      );

      const isPaid = paidSet.has(`${sourceCard.id}-${bMonth}-${bYear}`) ||
                     paidSet.has(`${sourceCard.id}-${dueDateInfo.billingMonth}-${dueDateInfo.billingYear}`);

      let status: "Paga" | "Pendente" | "Atrasada" = "Pendente";
      if (isPaid) {
        status = "Paga";
        opPaidCount++;
      } else if (dueDateInfo.dueDate < today) {
        status = "Atrasada";
      }

      installments.push({
        installmentNumber: i,
        installmentsCount: count,
        amount: instAmt,
        billingMonth: bMonth,
        billingYear: bYear,
        dueDateStr: dueDateInfo.dateStr,
        isPaid,
        status,
      });
    }

    paidInstallments += opPaidCount;

    const opDate = new Date(op.operationDate);
    const formattedDate = opDate.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    return {
      id: op.id,
      operationDate: op.operationDate.toISOString(),
      operationDateFormatted: formattedDate,
      sourceCard: {
        id: sourceCard.id,
        title: sourceCard.title,
        bankName: sourceCard.bankName || sourceCard.title,
        lastDigits,
      },
      destAccount: {
        id: destAccount.id,
        title: destAccount.title,
        bankName: destAccount.bankName || destAccount.title,
      },
      netAmount: net,
      totalAmount: total,
      feeAmount: fee,
      feePercentage: Number(op.feePercentage || 0),
      installmentsCount: count,
      installmentAmount: instAmt,
      firstBillingMonth: op.firstBillingMonth,
      firstBillingYear: op.firstBillingYear,
      description: op.description || "",
      status: op.status,
      paidInstallmentsCount: opPaidCount,
      installments,
    };
  });

  const amortizationPct = totalInstallments > 0
    ? Math.round((paidInstallments / totalInstallments) * 100)
    : 0;

  return {
    totalNet: Math.round(totalNet * 100) / 100,
    totalFees: Math.round(totalFees * 100) / 100,
    totalDebt: Math.round(totalDebt * 100) / 100,
    totalInstallments,
    paidInstallments,
    amortizationPct,
    operations: operationItems,
  };
}

/**
 * Exclui uma operação de PIX no Crédito em cascata (desfaz a receita e as parcelas no cartão)
 */
export async function deleteCreditPixOperationAction(operationId: string) {
  const userId = await getActiveUserId();

  const operation = await (prisma as any).creditPixOperation.findUnique({
    where: { id: operationId, userId },
  });

  if (!operation) throw new Error("Operação de PIX no Crédito não encontrada.");

  await prisma.$transaction(async (tx) => {
    // 1. Remove a transação de entrada na conta se existir
    if (operation.incomeTransactionId) {
      await tx.transaction.deleteMany({
        where: { id: operation.incomeTransactionId },
      });
    }

    // 2. Remove todas as parcelas geradas no cartão de crédito vinculadas ao groupId
    await tx.transaction.deleteMany({
      where: {
        installmentGroupId: operation.installmentGroupId,
      },
    });

    // 3. Remove o registro mestre da operação
    await (tx as any).creditPixOperation.delete({
      where: { id: operationId },
    });
  });

  revalidatePath("/pix-credito");
  revalidatePath("/despesas");
  revalidatePath("/dashboard");
  revalidatePath("/receitas");

  return { success: true };
}
