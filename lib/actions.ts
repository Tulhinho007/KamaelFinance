"use server";

import { CATEGORIES, getCategoryColor, getMonthName } from "./constants";
import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { z } from "zod";
import type { Goal, GoalHistory, Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { getInvoiceDueDateInfo } from "./invoice-utils";

// ---------- Validação de entrada (DTOs) ----------

const createTransactionSchema = z.object({
  walletId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  description: z.string().min(1).max(120),
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.number().positive(),
  date: z.coerce.date(),
  isRecurring: z.boolean().default(false),
});

const createWalletSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1).max(80),
  walletType: z.string().min(1).max(40),
  initialBalance: z.number().nonnegative(),
  creditLimit: z.number().nonnegative().optional(),
});

// ---------- Helper: Identificação de Lançamentos de Pagamento de Fatura ----------

function isInvoicePaymentTransaction(t: {
  categoryId?: string | null;
  category?: { name?: string | null } | null;
  description?: string | null;
  tags?: string | null;
}): boolean {
  if (t.category?.name && t.category.name.toLowerCase().includes("pagamento de fatura")) {
    return true;
  }
  if (t.tags && t.tags.toLowerCase().includes("pagamentodefatura")) {
    return true;
  }
  if (t.description) {
    const descLower = t.description.toLowerCase();
    if (
      descLower.includes("pagamento fatura") ||
      descLower.includes("pagamento de fatura") ||
      descLower.includes("quitação fatura") ||
      descLower.includes("quitacao fatura")
    ) {
      return true;
    }
  }
  return false;
}

function isSubscriptionPaymentTransaction(t: {
  source?: string | null;
  tags?: string | null;
  description?: string | null;
}): boolean {
  if (t.source === "SUBSCRIPTION") return true;
  if (t.tags && (t.tags.includes("#assinatura") || t.tags.toLowerCase().includes("assinatura"))) return true;
  if (t.description && (t.description.toLowerCase().startsWith("assinatura ") || t.description.toLowerCase().includes("assinatura "))) return true;
  return false;
}

// ---------- Helper: resolve o ID real do usuário ativo no banco ----------


/**
 * Resolve o ID do usuário ativo.
 * 1. Verifica se existe sessão válida via Cookie kamael_session.
 * 2. Tenta o DEV_USER_ID do .env se existir no banco.
 * 3. Fallback: primeiro usuário cadastrado.
 */
export async function getActiveUserId(): Promise<string> {
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
    // Ignora erro de leitura de cookie em contexto estático
  }

  const devId = process.env.DEV_USER_ID;
  if (devId && devId !== "00000000-0000-0000-0000-000000000000") {
    const user = await prisma.user.findUnique({ where: { id: devId }, select: { id: true } });
    if (user) return user.id;
  }

  // Fallback: primeiro usuário com e-mail kamaelcontatos ou qualquer MASTER, depois qualquer user
  const user =
    (await prisma.user.findFirst({ where: { email: "kamaelcontatos@gmail.com" }, select: { id: true } })) ||
    (await prisma.user.findFirst({ where: { role: "MASTER" }, select: { id: true }, orderBy: { createdAt: "asc" } })) ||
    (await prisma.user.findFirst({ select: { id: true }, orderBy: { createdAt: "asc" } }));

  if (!user) {
    throw new Error("Nenhum usuário encontrado no sistema. Cadastre um usuário antes de continuar.");
  }

  return user.id;
}

// ---------- Actions ----------

export async function createTransaction(input: z.infer<typeof createTransactionSchema>) {
  const data = createTransactionSchema.parse(input);

  const transaction = await prisma.transaction.create({
    data: {
      walletId: data.walletId,
      categoryId: data.categoryId,
      description: data.description,
      type: data.type,
      amount: data.amount,
      date: data.date,
      isRecurring: data.isRecurring,
      source: "MANUAL",
    },
  });

  revalidatePath("/dashboard");
  return transaction;
}

export async function updateTransaction(
  id: string,
  input: Partial<z.infer<typeof createTransactionSchema>>
) {
  const transaction = await prisma.transaction.update({
    where: { id },
    data: input,
  });

  revalidatePath("/dashboard");
  return transaction;
}

// Soft delete — mantém o histórico financeiro (nunca apaga de fato)
export async function deleteTransaction(id: string) {
  await prisma.transaction.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/dashboard");
}

export async function createWallet(input: z.infer<typeof createWalletSchema>) {
  const data = createWalletSchema.parse(input);

  const wallet = await prisma.wallet.create({
    data: {
      userId: data.userId,
      title: data.title,
      walletType: data.walletType,
      initialBalance: data.initialBalance,
    },
  });

  if (data.initialBalance && Number(data.initialBalance) > 0) {
    let category = await prisma.category.findFirst({
      where: { name: "Saldo Inicial / Abertura" },
    });
    if (!category) {
      category = await prisma.category.create({
        data: { name: "Saldo Inicial / Abertura", color: "#10B981" },
      });
    }

    await prisma.transaction.create({
      data: {
        walletId: wallet.id,
        description: "Saldo Inicial de Abertura",
        amount: data.initialBalance,
        type: "INCOME",
        status: "COMPLETED",
        categoryId: category.id,
        date: new Date(),
      },
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/cartoes");
  return wallet;
}

// ---------- Actions de Receitas ----------

export async function getRevenues(month?: number | null | string, year: number = 2026) {
  const userId = await getActiveUserId();
  
  const isAnnualView = !month || month === "ALL" || month === "0" || Number.isNaN(Number(month));

  let from: Date;
  let to: Date;

  if (!isAnnualView) {
    const numMonth = Number(month);
    from = new Date(Date.UTC(year, numMonth - 1, 1, 0, 0, 0));
    to   = new Date(Date.UTC(year, numMonth, 0, 23, 59, 59, 999));
  } else {
    from = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    to   = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
  }

  const BENEFIT_TYPES = [
    "TICKET", "BENEFICIO", "BENEFÍCIO", 
    "ticket", "beneficio", "benefício", 
    "Ticket", "Benefício", "Beneficio"
  ];

  let transactions: any[] = await prisma.transaction.findMany({
    where: {
      wallet: { 
        userId,
        walletType: {
          notIn: BENEFIT_TYPES
        }
      },
      type: "INCOME",
      deletedAt: null,
      ...(!isAnnualView ? {
        OR: [
          { competenceMonth: Number(month), competenceYear: year },
          { competenceDate: { gte: from, lte: to } },
          { competenceMonth: null, competenceDate: null, date: { gte: from, lte: to } }
        ]
      } : {
        OR: [
          { competenceYear: year },
          { competenceDate: { gte: from, lte: to } },
          { competenceYear: null, competenceDate: null, date: { gte: from, lte: to } }
        ]
      })
    } as any,
    include: { wallet: true },
    orderBy: { date: "asc" }
  });

  // Salvaguarda adicional em memória para garantir isolamento estrito de benefícios e filtragem por competência
  return transactions
    .filter((t: any) => {
      const wType = (t.wallet?.walletType || "").toUpperCase();
      if (["TICKET", "BENEFICIO", "BENEFÍCIO"].includes(wType)) return false;

      if (!isAnnualView) {
        const numMonth = Number(month);
        if (t.competenceMonth != null && t.competenceYear != null) {
          return t.competenceMonth === numMonth && t.competenceYear === year;
        }
        const d = new Date(t.competenceDate || t.date);
        return d.getUTCFullYear() === year && (d.getUTCMonth() + 1) === numMonth;
      } else {
        if (t.competenceYear != null) {
          return t.competenceYear === year;
        }
        const d = new Date(t.competenceDate || t.date);
        return d.getUTCFullYear() === year;
      }
    })
    .map((t: any) => ({
      id: t.id,
      description: t.description,
      amount: Number(t.amount),
      status: t.status || "COMPLETED",
      date: t.date ? (typeof t.date === "string" ? t.date.split("T")[0] : new Date(t.date).toISOString().split("T")[0]) : "",
      competenceDate: t.competenceDate ? (typeof t.competenceDate === "string" ? t.competenceDate.split("T")[0] : new Date(t.competenceDate).toISOString().split("T")[0]) : (t.date ? (typeof t.date === "string" ? t.date.split("T")[0] : new Date(t.date).toISOString().split("T")[0]) : ""),
      competenceMonth: t.competenceMonth != null ? t.competenceMonth : (t.competenceDate ? new Date(t.competenceDate).getUTCMonth() + 1 : undefined),
      competenceYear: t.competenceYear != null ? t.competenceYear : (t.competenceDate ? new Date(t.competenceDate).getUTCFullYear() : undefined),
      walletId: t.walletId,
      account: t.wallet?.bankName || t.wallet?.title || "",
      walletType: t.wallet?.walletType,
      isBeneficio: false
    }));
}

export async function getSalaryCycleSummary(month: number, year: number) {
  const userId = await getActiveUserId();

  // 1. Busca contas bancárias/correntes do usuário (exclui TICKET e BENEFÍCIO)
  const bankWallets = await prisma.wallet.findMany({
    where: {
      userId,
      walletType: { 
        in: ["CONTA_CORRENTE", "Conta Corrente"],
        notIn: ["TICKET", "BENEFICIO", "BENEFÍCIO", "ticket", "beneficio", "benefício", "Ticket", "Benefício", "Beneficio"]
      }
    }
  });

  // 2. Calcula o saldo remanescente do mês anterior (M-1)
  let totalSaldoAnterior = 0;
  for (const w of bankWallets) {
    const bInfo = await calculateAccountBalance(w.id, month, year);
    totalSaldoAnterior += Number(bInfo.previousBalance || 0);
  }

  // 3. Receitas Previstas do mês (M)
  const revenues = await getRevenues(month, year);
  const totalReceitaPrevista = revenues.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return {
    totalSaldoAnterior,
    totalReceitaPrevista,
    disponivelReal: totalSaldoAnterior + totalReceitaPrevista,
    revenues
  };
}

export async function toggleTransactionStatusAction(id: string) {
  // Busca sem select para evitar conflito de tipos no Prisma Client
  const transaction = await prisma.transaction.findUnique({
    where: { id }
  });

  if (!transaction) throw new Error("Transação não encontrada");

  // Inverte o status: PENDING → COMPLETED ou COMPLETED → PENDING
  const currentStatus = transaction.status ?? "COMPLETED";
  const newStatus = currentStatus === "PENDING" ? "COMPLETED" : "PENDING";

  const updated = await prisma.transaction.update({
    where: { id },
    data: { status: newStatus }
  });

  revalidatePath("/receitas");
  revalidatePath("/despesas");
  revalidatePath("/cartoes");
  revalidatePath("/dashboard");

  return { id: updated.id, status: updated.status };
}

export async function createRevenueAction(
  description: string,
  amount: number,
  dateStr: string,
  walletId?: string,
  status: string = "COMPLETED",
  competenceDateStr?: string,
  categoryName?: string,
  competenceMonth?: number,
  competenceYear?: number
) {
  const userId = await getActiveUserId();
  
  let wallet = null;
  if (walletId) {
    wallet = await prisma.wallet.findFirst({
      where: { id: walletId, userId }
    });
  }

  if (!wallet) {
    wallet = await prisma.wallet.findFirst({
      where: { userId, walletType: { in: ["CONTA_CORRENTE", "Conta Corrente"] } },
      orderBy: { title: "asc" }
    }) || await prisma.wallet.findFirst({
      where: { userId }
    });
  }

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        userId,
        title: "Conta Corrente",
        walletType: "CONTA_CORRENTE",
        initialBalance: 0
      }
    });
  }

  const parts = dateStr.split("-");
  const date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));

  let competenceDate: Date = date;
  let compMonth: number = competenceMonth || (date.getUTCMonth() + 1);
  let compYear: number = competenceYear || date.getUTCFullYear();

  if (competenceMonth && competenceYear) {
    competenceDate = new Date(Date.UTC(competenceYear, competenceMonth - 1, 1));
  } else if (competenceDateStr) {
    const compParts = competenceDateStr.split("-");
    compYear = Number(compParts[0]);
    compMonth = Number(compParts[1]);
    competenceDate = new Date(Date.UTC(compYear, compMonth - 1, Number(compParts[2] || 1)));
  }

  const catNameToUse = categoryName || "Aporte / Injeção de Saldo";
  let dbCategory = await prisma.category.findFirst({
    where: { name: { equals: catNameToUse, mode: "insensitive" } }
  });
  if (!dbCategory) {
    dbCategory = await prisma.category.create({
      data: { name: catNameToUse, color: "#10B981" }
    });
  }

  const transaction: any = await prisma.transaction.create({
    data: {
      walletId: wallet.id,
      categoryId: dbCategory.id,
      description,
      type: "INCOME",
      amount: amount,
      status: status || "COMPLETED",
      date,
      competenceDate,
      competenceMonth: compMonth,
      competenceYear: compYear,
      source: "MANUAL"
    } as any
  });

  revalidatePath("/receitas");
  revalidatePath("/despesas");
  revalidatePath("/cartoes");
  revalidatePath("/dashboard");

  return {
    id: transaction.id,
    description: transaction.description,
    amount: Number(transaction.amount),
    date: new Date(transaction.date).toISOString().split("T")[0],
    competenceDate: transaction.competenceDate ? new Date(transaction.competenceDate).toISOString().split("T")[0] : new Date(transaction.date).toISOString().split("T")[0],
    competenceMonth: transaction.competenceMonth || compMonth,
    competenceYear: transaction.competenceYear || compYear,
    walletId: transaction.walletId,
    categoryId: dbCategory.id
  };
}

export async function updateRevenueAction(
  id: string,
  description: string,
  amount: number,
  dateStr: string,
  walletId?: string,
  competenceDateStr?: string,
  competenceMonth?: number,
  competenceYear?: number
) {
  const parts = dateStr.split("-");
  const date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));

  let competenceDate: Date = date;
  let compMonth: number = competenceMonth || (date.getUTCMonth() + 1);
  let compYear: number = competenceYear || date.getUTCFullYear();

  if (competenceMonth && competenceYear) {
    competenceDate = new Date(Date.UTC(competenceYear, competenceMonth - 1, 1));
  } else if (competenceDateStr) {
    const compParts = competenceDateStr.split("-");
    compYear = Number(compParts[0]);
    compMonth = Number(compParts[1]);
    competenceDate = new Date(Date.UTC(compYear, compMonth - 1, Number(compParts[2] || 1)));
  }

  let transaction: any;

  await prisma.$transaction(async (tx) => {
    const existingTx = await tx.transaction.findUnique({
      where: { id }
    });
    if (!existingTx) throw new Error("Receita não encontrada.");

    const oldAmount = Number(existingTx.amount);
    const oldWalletId = existingTx.walletId;
    const targetWalletId = walletId || oldWalletId;

    const dataToUpdate: any = {
      description,
      amount: amount,
      date,
      competenceDate,
      competenceMonth: compMonth,
      competenceYear: compYear
    };
    if (walletId) {
      dataToUpdate.walletId = walletId;
    }

    transaction = await tx.transaction.update({
      where: { id },
      data: dataToUpdate
    });

    const isCofrinho = existingTx.source === "COFRINHO" ||
      Boolean((existingTx as any).goalId) ||
      Boolean((existingTx as any).goalContributionId) ||
      existingTx.description.startsWith("Aporte Cofrinho:");

    if (isCofrinho) {
      // 1. Ajusta o saldo da conta se houve alteração de valor ou conta
      if (oldWalletId === targetWalletId && targetWalletId) {
        const diff = amount - oldAmount;
        if (diff !== 0) {
          await tx.wallet.update({
            where: { id: targetWalletId },
            data: { currentBalance: { increment: diff } } as any
          }).catch(() => {});
        }
      } else {
        if (oldWalletId && oldAmount > 0) {
          await tx.wallet.update({
            where: { id: oldWalletId },
            data: { currentBalance: { decrement: oldAmount } } as any
          }).catch(() => {});
        }
        if (targetWalletId && amount > 0) {
          await tx.wallet.update({
            where: { id: targetWalletId },
            data: { currentBalance: { increment: amount } } as any
          }).catch(() => {});
        }
      }

      // 2. Localiza e atualiza o histórico do aporte na meta
      const linkedHistory = await tx.goalHistory.findFirst({
        where: {
          OR: [
            ...((existingTx as any).goalContributionId ? [{ id: (existingTx as any).goalContributionId }] : []),
            { transactionId: id } as any
          ]
        }
      });

      if (linkedHistory) {
        await tx.goalHistory.update({
          where: { id: linkedHistory.id },
          data: {
            amount,
            date,
            ...(targetWalletId ? { walletId: targetWalletId } : {})
          }
        });

        // Recalcula acumulado da meta
        const goalId = linkedHistory.goalId;
        const allHistory = await tx.goalHistory.findMany({ where: { goalId } });
        const goal = await tx.goal.findUnique({ where: { id: goalId } });
        if (goal) {
          const totalAportado = allHistory.reduce((s, h) => s + Number(h.amount), 0);
          const isCompleted = totalAportado >= Number(goal.objetivo) && Number(goal.objetivo) > 0;
          await tx.goal.update({
            where: { id: goalId },
            data: {
              acumulado: totalAportado,
              status: isCompleted ? "COMPLETED" : "ACTIVE",
              completedAt: isCompleted ? ((goal as any)?.completedAt || new Date()) : null
            } as any
          });
        }
      }
    }
  });

  revalidatePath("/receitas");
  revalidatePath("/metas");
  revalidatePath("/despesas");
  revalidatePath("/cartoes");
  revalidatePath("/dashboard");
  revalidatePath("/contas");

  return {
    id: transaction.id,
    description: transaction.description,
    amount: Number(transaction.amount),
    date: new Date(transaction.date).toISOString().split("T")[0],
    competenceDate: transaction.competenceDate ? new Date(transaction.competenceDate).toISOString().split("T")[0] : new Date(transaction.date).toISOString().split("T")[0]
  };
}

export async function deleteRevenueAction(id: string) {
  await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { id }
    });

    if (!transaction) return;

    // Se for uma receita de cofrinho/meta
    const isCofrinho = transaction.source === "COFRINHO" ||
      Boolean((transaction as any).goalId) ||
      Boolean((transaction as any).goalContributionId) ||
      transaction.description.startsWith("Aporte Cofrinho:");

    if (isCofrinho) {
      // 1. Estorna o saldo da conta bancária
      if (transaction.walletId && Number(transaction.amount) > 0) {
        await tx.wallet.update({
          where: { id: transaction.walletId },
          data: { currentBalance: { decrement: transaction.amount } } as any
        }).catch(() => {});
      }

      // 2. Localiza e remove o registro correspondente em GoalHistory
      const linkedHistory = await tx.goalHistory.findFirst({
        where: {
          OR: [
            ...((transaction as any).goalContributionId ? [{ id: (transaction as any).goalContributionId }] : []),
            { transactionId: id } as any
          ]
        }
      });

      if (linkedHistory) {
        const goalId = linkedHistory.goalId;
        await tx.goalHistory.delete({ where: { id: linkedHistory.id } });

        // Recalcula acumulado da meta
        const allHistory = await tx.goalHistory.findMany({ where: { goalId } });
        const goal = await tx.goal.findUnique({ where: { id: goalId } });
        if (goal) {
          const totalAportado = allHistory.reduce((s, h) => s + Number(h.amount), 0);
          const isCompleted = totalAportado >= Number(goal.objetivo) && Number(goal.objetivo) > 0;
          await tx.goal.update({
            where: { id: goalId },
            data: {
              acumulado: totalAportado,
              status: isCompleted ? "COMPLETED" : "ACTIVE",
              completedAt: isCompleted ? ((goal as any)?.completedAt || new Date()) : null
            } as any
          });
        }
      }
    }

    await tx.transaction.update({
      where: { id },
      data: {
        deletedAt: new Date()
      }
    });
  });

  revalidatePath("/receitas");
  revalidatePath("/metas");
  revalidatePath("/dashboard");
  revalidatePath("/contas");
  revalidatePath("/despesas");
}

// ---------- Actions de Metas ----------

export async function getGoals() {
  try {
    const userId = await getActiveUserId();
    const goals = await prisma.goal.findMany({
      where: { userId },
      include: {
        history: {
          orderBy: { date: "asc" },
          include: { wallet: true }
        },
        wallet: true,
      } as any,
      orderBy: { dataInicio: "asc" }
    });

    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    return Promise.all(
      goals.map(async (g: any) => {
        let acumulado = Number(g.acumulado || 0);

        const objetivo = Number(g.objetivo || 0);
        const pct = objetivo > 0 ? Math.min(100, Math.round((acumulado / objetivo) * 100)) : 0;

        // Cálculo de Média Móvel de Aportes Mensais com base no histórico
        let mediaAporteMensal = 0;
        let estimatedDateStr = "Aguardando aportes";
        let paceStatus: "COMPLETED" | "ADVANCED" | "BEHIND" | "UNKNOWN" = "UNKNOWN";

        if (pct >= 100) {
          paceStatus = "COMPLETED";
          estimatedDateStr = "Meta Concluída!";
        } else if (g.history && g.history.length > 0) {
          const totalAportado = g.history.reduce((s: number, h: any) => s + Number(h.amount || 0), 0);
          const firstDate = g.history[0]?.date ? new Date(g.history[0].date) : new Date();
          const now = new Date();
          const diffMonths = Math.max(1, (now.getFullYear() - firstDate.getFullYear()) * 12 + (now.getMonth() - firstDate.getMonth()) + 1);
          mediaAporteMensal = totalAportado / diffMonths;

          if (mediaAporteMensal > 0 && acumulado < objetivo) {
            const remainingAmount = objetivo - acumulado;
            const monthsNeeded = Math.ceil(remainingAmount / mediaAporteMensal);
            const targetEstDate = new Date(now.getFullYear(), now.getMonth() + monthsNeeded, 1);

            estimatedDateStr = `${monthNames[targetEstDate.getMonth()]}/${targetEstDate.getFullYear()}`;
            const plannedEndDate = g.dataFim ? new Date(g.dataFim) : new Date();

            if (targetEstDate <= plannedEndDate) {
              paceStatus = "ADVANCED";
            } else {
              paceStatus = "BEHIND";
            }
          }
        }

        const isCompleted = g.status === "COMPLETED" || pct >= 100;
        const status = isCompleted ? "COMPLETED" : "ACTIVE";
        let completedAtStr: string | null = null;
        if (g.completedAt) {
          completedAtStr = new Date(g.completedAt).toLocaleDateString("pt-BR");
        } else if (isCompleted && g.history && g.history.length > 0) {
          const lastHist = g.history[g.history.length - 1];
          completedAtStr = lastHist?.date ? new Date(lastHist.date).toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR");
        } else if (isCompleted) {
          completedAtStr = new Date().toLocaleDateString("pt-BR");
        }

        // Detalhamento de distribuição de saldos guardados por conta/banco
        const walletBreakdownMap: Record<string, { walletId: string; walletTitle: string; totalAmount: number }> = {};
        (g.history || []).forEach((h: any) => {
          const wId = h.walletId || g.walletId || "default";
          const wTitle = h.wallet?.bankName || h.wallet?.title || g.wallet?.bankName || g.wallet?.title || "Outra Conta";
          if (!walletBreakdownMap[wId]) {
            walletBreakdownMap[wId] = { walletId: wId, walletTitle: wTitle, totalAmount: 0 };
          }
          walletBreakdownMap[wId].totalAmount += Number(h.amount || 0);
        });

        // Se não houver histórico mas houver conta padrão definida na meta
        if (Object.keys(walletBreakdownMap).length === 0 && g.wallet) {
          walletBreakdownMap[g.walletId] = {
            walletId: g.walletId,
            walletTitle: g.wallet.bankName || g.wallet.title,
            totalAmount: acumulado,
          };
        }

        const walletBreakdown = Object.values(walletBreakdownMap).sort((a, b) => b.totalAmount - a.totalAmount);

        const dataInicioStr = g.dataInicio ? new Date(g.dataInicio).toISOString().split("T")[0] : "";
        const dataFimStr = g.dataFim ? new Date(g.dataFim).toISOString().split("T")[0] : "";

        return {
          id: g.id,
          title: g.title,
          dataInicio: dataInicioStr,
          dataFim: dataFimStr,
          acumulado,
          objetivo,
          pct,
          iconName: g.iconName as "Plane" | "Car" | "Home" | "Target",
          tipo: ((g.tipo as "VISUAL" | "COFRINHO") || (g.isRealSaving ? "COFRINHO" : "VISUAL")),
          isRealSaving: !!(g.isRealSaving || g.tipo === "COFRINHO"),
          walletId: g.walletId || null,
          walletTitle: g.wallet?.bankName || g.wallet?.title || null,
          walletBreakdown,
          status,
          completedAt: completedAtStr,
          mediaAporteMensal,
          estimatedDateStr,
          paceStatus,
          history: (g.history || []).map((h: any) => {
            const hDate = h.date ? new Date(h.date) : new Date();
            return {
              id: h.id,
              rawDate: hDate.toISOString().split("T")[0],
              date: hDate.toLocaleDateString("pt-BR"),
              amount: Number(h.amount || 0),
              walletId: h.walletId || g.walletId || null,
              walletTitle: h.wallet?.bankName || h.wallet?.title || g.wallet?.bankName || g.wallet?.title || null,
              transactionId: h.transactionId || null,
            };
          })
        };
      })
    );
  } catch (error) {
    console.error("Erro ao obter metas:", error);
    return [];
  }
}

export async function createGoalAction(
  title: string,
  dataInicio: string,
  dataFim: string,
  objetivo: number,
  acumuladoInicial: number,
  iconName: string,
  walletId?: string,
  tipo: "VISUAL" | "COFRINHO" = "VISUAL",
  isRealSaving: boolean = false
) {
  const userId = await getActiveUserId();
  const isCompleted = acumuladoInicial > 0 && acumuladoInicial >= objetivo;
  const isReal = isRealSaving || tipo === "COFRINHO";
  const historyId = crypto.randomUUID();
  const goalId = crypto.randomUUID();

  let aporteDate = new Date();
  if (dataInicio) {
    const parts = dataInicio.split("-");
    if (parts.length === 3) {
      aporteDate = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0));
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.goal.create({
      data: {
        id: goalId,
        userId,
        walletId: walletId || null,
        title,
        dataInicio: new Date(dataInicio),
        dataFim: new Date(dataFim),
        objetivo,
        acumulado: acumuladoInicial,
        iconName,
        tipo,
        isRealSaving: isReal,
        status: isCompleted ? "COMPLETED" : "ACTIVE",
        completedAt: isCompleted ? new Date() : null,
      } as any
    });

    let transactionId: string | null = null;

    if (acumuladoInicial > 0) {
      // Se é cofrinho e possui saldo inicial e conta vinculada, cria transação de receita e incrementa saldo
      if (isReal && walletId) {
        let dbCategory = await tx.category.findFirst({
          where: { name: { equals: "Cofrinho", mode: "insensitive" } }
        });
        if (!dbCategory) {
          dbCategory = await tx.category.create({
            data: { name: "Cofrinho", color: "#10B981" }
          });
        }

        const newTx = await tx.transaction.create({
          data: {
            walletId,
            categoryId: dbCategory.id,
            type: "INCOME",
            amount: acumuladoInicial,
            date: aporteDate,
            competenceDate: aporteDate,
            description: `Aporte Cofrinho: ${title}`,
            status: "COMPLETED",
            tags: "#cofrinho, #meta",
            source: "COFRINHO",
            goalId,
            goalContributionId: historyId
          } as any
        });
        transactionId = newTx.id;

        await tx.wallet.update({
          where: { id: walletId },
          data: {
            currentBalance: { increment: acumuladoInicial }
          } as any
        }).catch(() => {});
      }

      await tx.goalHistory.create({
        data: {
          id: historyId,
          goalId,
          date: aporteDate,
          amount: acumuladoInicial,
          walletId: walletId || null,
          transactionId
        } as any
      });
    }
  });

  revalidatePath("/metas");
  revalidatePath("/receitas");
  revalidatePath("/dashboard");
  revalidatePath("/contas");
  if (walletId) {
    revalidatePath(`/contas/${walletId}`);
  }
}

export async function updateGoalAction(
  id: string,
  title: string,
  dataInicio: string,
  dataFim: string,
  objetivo: number,
  iconName: string,
  walletId?: string,
  tipo?: "VISUAL" | "COFRINHO",
  isRealSaving?: boolean
) {
  const currentGoal = await prisma.goal.findUnique({ where: { id } });
  const isCompleted = currentGoal ? Number(currentGoal.acumulado) >= objetivo : false;
  const resolvedTipo = tipo || (currentGoal as any)?.tipo || "VISUAL";
  const resolvedIsReal = isRealSaving !== undefined ? isRealSaving : (resolvedTipo === "COFRINHO" || !!(currentGoal as any)?.isRealSaving);

  await prisma.$transaction(async (tx) => {
    // 1. Se o título mudou, atualiza a descrição de todas as receitas vinculadas
    if (currentGoal && currentGoal.title !== title) {
      await tx.transaction.updateMany({
        where: {
          OR: [
            { goalId: id } as any,
            { description: `Aporte Cofrinho: ${currentGoal.title}`, source: "COFRINHO" }
          ]
        },
        data: {
          description: `Aporte Cofrinho: ${title}`
        }
      });
    }

    // 2. Se a conta vinculada mudou, atualiza nas receitas vinculadas e estorna/transfere o saldo
    if (currentGoal && walletId && currentGoal.walletId !== walletId) {
      const linkedTxs = await tx.transaction.findMany({
        where: {
          OR: [
            { goalId: id } as any,
            { description: `Aporte Cofrinho: ${title}`, source: "COFRINHO" }
          ]
        }
      });

      for (const t of linkedTxs) {
        await tx.transaction.update({
          where: { id: t.id },
          data: { walletId }
        });
        if (currentGoal.walletId) {
          await tx.wallet.update({
            where: { id: currentGoal.walletId },
            data: { currentBalance: { decrement: t.amount } } as any
          }).catch(() => {});
        }
        await tx.wallet.update({
          where: { id: walletId },
          data: { currentBalance: { increment: t.amount } } as any
        }).catch(() => {});
      }
    }

    await tx.goal.update({
      where: { id },
      data: {
        title,
        walletId: walletId || null,
        dataInicio: new Date(dataInicio),
        dataFim: new Date(dataFim),
        objetivo,
        iconName,
        tipo: resolvedTipo,
        isRealSaving: resolvedIsReal,
        status: isCompleted ? "COMPLETED" : ((currentGoal as any)?.status || "ACTIVE"),
        completedAt: isCompleted ? ((currentGoal as any)?.completedAt || new Date()) : null,
      } as any
    });
  });

  revalidatePath("/metas");
  revalidatePath("/receitas");
  revalidatePath("/dashboard");
  revalidatePath("/contas");
  if (walletId) {
    revalidatePath(`/contas/${walletId}`);
  }
}

export async function deleteGoalAction(id: string) {
  const affectedWalletIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    const goal = await tx.goal.findUnique({
      where: { id },
      include: { history: true }
    });

    if (!goal) return;

    if (goal.walletId) {
      affectedWalletIds.push(goal.walletId);
    }

    // 1. Localize todos os aportes e transações de receita vinculados a esse cofrinho (goalId)
    const historyTxIds = goal.history
      .map(h => (h as any).transactionId)
      .filter((tid): tid is string => Boolean(tid));

    const linkedTxs = await tx.transaction.findMany({
      where: {
        OR: [
          { goalId: id } as any,
          ...(historyTxIds.length > 0 ? [{ id: { in: historyTxIds } }] : []),
          { description: `Aporte Cofrinho: ${goal.title}`, source: "COFRINHO" },
        ]
      }
    });

    // 2. Para cada transação vinculada, estorne o valor do saldo da conta correspondente:
    for (const transaction of linkedTxs) {
      if (transaction.walletId && Number(transaction.amount) > 0) {
        affectedWalletIds.push(transaction.walletId);
        await tx.wallet.update({
          where: { id: transaction.walletId },
          data: { currentBalance: { decrement: transaction.amount } } as any
        }).catch(() => {});
      }
    }

    // Estorno de segurança para histórico com walletId mas sem transactionId vinculado
    const handledTxIds = new Set(linkedTxs.map(t => t.id));
    for (const h of goal.history) {
      if (
        h.walletId &&
        Number(h.amount) > 0 &&
        (!(h as any).transactionId || !handledTxIds.has((h as any).transactionId)) &&
        ((goal as any).tipo === "COFRINHO" || (goal as any).isRealSaving)
      ) {
        affectedWalletIds.push(h.walletId);
        await tx.wallet.update({
          where: { id: h.walletId },
          data: { currentBalance: { decrement: h.amount } } as any
        }).catch(() => {});
      }
    }

    // 3. Delete todas as transações de receita vinculadas
    const txIdsToDelete = linkedTxs.map(t => t.id);
    if (txIdsToDelete.length > 0) {
      await tx.transaction.deleteMany({
        where: { id: { in: txIdsToDelete } }
      });
    }

    // 4. Delete os registros de histórico de aportes e, por fim, delete o cofrinho/meta
    await tx.goalHistory.deleteMany({
      where: { goalId: id }
    });

    await tx.goal.delete({
      where: { id }
    });
  });

  // 5. Revalidação de Cache
  revalidatePath("/metas");
  revalidatePath("/receitas");
  revalidatePath("/dashboard");
  revalidatePath("/contas");
  for (const wId of Array.from(new Set(affectedWalletIds))) {
    revalidatePath(`/contas/${wId}`);
  }
  revalidatePath("/despesas");
}

export async function toggleGoalStatusAction(goalId: string, status: "ACTIVE" | "COMPLETED") {
  const isCompleted = status === "COMPLETED";
  await prisma.goal.update({
    where: { id: goalId },
    data: {
      status,
      completedAt: isCompleted ? new Date() : null,
    } as any
  });

  revalidatePath("/metas");
}

export async function getWalletsAction() {
  const userId = await getActiveUserId();
  const wallets = await prisma.wallet.findMany({
    where: { userId },
    orderBy: { title: "asc" }
  });

  return Promise.all(
    wallets.map(async (w: any) => {
      const txs = await prisma.transaction.findMany({
        where: { walletId: w.id, deletedAt: null, status: "COMPLETED" }
      });
      const income = txs.filter(t => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
      const expense = txs.filter(t => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);
      const currentTotal = Number(w.initialBalance || 0) + income - expense;

      return {
        id: w.id,
        title: w.title,
        bankName: w.bankName || w.title,
        walletType: w.walletType,
        currentTotal,
      };
    })
  );
}

export async function addAporteAction(
  goalId: string,
  amount: number,
  arg3?: string,
  arg4?: string | boolean,
  arg5?: boolean | string
) {
  let dateStr: string | undefined;
  let walletId: string | undefined;
  let moveRealBalance: boolean = true;

  if (typeof arg4 === "boolean") {
    walletId = typeof arg3 === "string" ? arg3 : undefined;
    moveRealBalance = arg4;
    dateStr = typeof arg5 === "string" ? arg5 : undefined;
  } else if (typeof arg3 === "string" && /^\d{4}-\d{2}-\d{2}/.test(arg3)) {
    dateStr = arg3;
    walletId = typeof arg4 === "string" ? arg4 : undefined;
    moveRealBalance = typeof arg5 === "boolean" ? arg5 : true;
  } else {
    if (typeof arg3 === "string" && arg3.length > 20) {
      walletId = arg3;
    } else if (typeof arg3 === "string") {
      dateStr = arg3;
    }
    if (typeof arg4 === "string") walletId = arg4;
    if (typeof arg4 === "boolean") moveRealBalance = arg4;
    if (typeof arg5 === "boolean") moveRealBalance = arg5;
    if (typeof arg5 === "string" && /^\d{4}-\d{2}-\d{2}/.test(arg5)) dateStr = arg5;
  }

  const goal = await prisma.goal.findUnique({
    where: { id: goalId }
  });

  if (!goal) throw new Error("Meta não encontrada.");

  const isCofrinho = (goal as any).tipo === "COFRINHO" || !!(goal as any).isRealSaving;
  const resolvedWalletId = walletId || goal.walletId || undefined;
  const shouldMoveBalance = moveRealBalance !== false && (isCofrinho || !!resolvedWalletId);

  if (isCofrinho && !resolvedWalletId) {
    throw new Error("Conta bancária vinculada é obrigatória para o Cofrinho.");
  }

  let aporteDate = new Date();
  if (dateStr) {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      aporteDate = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0));
    }
  }

  const historyId = crypto.randomUUID();

  await prisma.$transaction(async (tx) => {
    let transactionId: string | null = null;

    if (shouldMoveBalance && resolvedWalletId) {
      // Garante que a categoria "Cofrinho" exista no sistema
      let dbCategory = await tx.category.findFirst({
        where: { name: { equals: "Cofrinho", mode: "insensitive" } }
      });
      if (!dbCategory) {
        dbCategory = await tx.category.create({
          data: { name: "Cofrinho", color: "#10B981" }
        });
      }

      // 1. Cria a transação de Receita/Entrada (INCOME) na conta selecionada
      const newTx = await tx.transaction.create({
        data: {
          walletId: resolvedWalletId,
          categoryId: dbCategory.id,
          type: "INCOME",
          amount,
          date: aporteDate,
          competenceDate: aporteDate,
          description: `Aporte Cofrinho: ${goal.title}`,
          status: "COMPLETED",
          tags: "#cofrinho, #meta",
          source: "COFRINHO",
          goalId: goalId,
          goalContributionId: historyId,
        } as any
      });
      transactionId = newTx.id;

      // 2. Atualiza o saldo real da conta (incrementa)
      await tx.wallet.update({
        where: { id: resolvedWalletId },
        data: {
          currentBalance: { increment: amount }
        } as any
      }).catch(() => {});
    }

    // Registra o aporte no histórico da meta com vínculos mútuos
    await tx.goalHistory.create({
      data: {
        id: historyId,
        goalId,
        date: aporteDate,
        amount,
        walletId: resolvedWalletId || null,
        transactionId: transactionId || null,
      } as any
    });

    const newAcumulado = Number(goal.acumulado) + amount;
    const isNowCompleted = newAcumulado >= Number(goal.objetivo) && Number(goal.objetivo) > 0;

    await tx.goal.update({
      where: { id: goalId },
      data: {
        acumulado: newAcumulado,
        ...(isNowCompleted ? { status: "COMPLETED", completedAt: new Date() } : {})
      }
    });
  });

  // 3. Invalidação de Cache e Revalidação (Next.js)
  revalidatePath("/metas");
  revalidatePath("/receitas");
  revalidatePath("/dashboard");
  if (resolvedWalletId) {
    revalidatePath(`/contas/${resolvedWalletId}`);
  }
  revalidatePath("/contas");
  revalidatePath("/despesas");
}

export async function updateAporteAction(historyId: string, amount: number, dateStr?: string, walletId?: string) {
  let targetWalletId: string | null = null;
  let oldWalletId: string | null = null;

  await prisma.$transaction(async (tx) => {
    const existingHistory = await tx.goalHistory.findUnique({
      where: { id: historyId },
      include: { goal: true }
    });

    if (!existingHistory) return;

    const oldAmount = Number(existingHistory.amount || 0);
    oldWalletId = existingHistory.walletId;
    targetWalletId = walletId !== undefined ? (walletId || null) : oldWalletId;

    const updateData: any = { amount };
    let newDate: Date | undefined;
    if (dateStr) {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        newDate = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0));
        updateData.date = newDate;
      }
    }
    if (walletId !== undefined) {
      updateData.walletId = targetWalletId;
    }

    await tx.goalHistory.update({
      where: { id: historyId },
      data: updateData
    });

    // Localiza a transação vinculada (via transactionId, goalContributionId ou descrição cofrinho)
    let linkedTx: any = null;
    const existingTxId = (existingHistory as any).transactionId;
    if (existingTxId) {
      linkedTx = await tx.transaction.findUnique({
        where: { id: existingTxId }
      });
    }
    if (!linkedTx) {
      linkedTx = await tx.transaction.findFirst({
        where: {
          OR: [
            { goalContributionId: historyId } as any,
            ...(existingHistory.goal ? [{
              description: `Aporte Cofrinho: ${existingHistory.goal.title}`,
              amount: existingHistory.amount,
              source: "COFRINHO"
            }] : [])
          ]
        }
      });
    }

    // Se possui transação vinculada, sincroniza amount, date, walletId e vínculos
    if (linkedTx) {
      const txUpdateData: any = {
        amount,
        goalId: existingHistory.goalId,
        goalContributionId: historyId,
        description: `Aporte Cofrinho: ${existingHistory.goal?.title || "Meta"}`
      };
      if (newDate) {
        txUpdateData.date = newDate;
        txUpdateData.competenceDate = newDate;
      }
      if (targetWalletId) {
        txUpdateData.walletId = targetWalletId;
      }
      await tx.transaction.update({
        where: { id: linkedTx.id },
        data: txUpdateData
      }).catch(() => {});

      // Ajusta a diferença de saldo da conta bancária
      if (oldWalletId === targetWalletId && targetWalletId) {
        const diff = amount - oldAmount;
        if (diff !== 0) {
          await tx.wallet.update({
            where: { id: targetWalletId },
            data: { currentBalance: { increment: diff } } as any
          }).catch(() => {});
        }
      } else {
        if (oldWalletId && oldAmount > 0) {
          await tx.wallet.update({
            where: { id: oldWalletId },
            data: { currentBalance: { decrement: oldAmount } } as any
          }).catch(() => {});
        }
        if (targetWalletId && amount > 0) {
          await tx.wallet.update({
            where: { id: targetWalletId },
            data: { currentBalance: { increment: amount } } as any
          }).catch(() => {});
        }
      }
    } else if (targetWalletId) {
      // Se não existia transação no módulo de Receitas (ex: aporte antigo), cria a receita agora
      let dbCategory = await tx.category.findFirst({
        where: { name: { equals: "Cofrinho", mode: "insensitive" } }
      });
      if (!dbCategory) {
        dbCategory = await tx.category.create({
          data: { name: "Cofrinho", color: "#10B981" }
        });
      }

      const newTx = await tx.transaction.create({
        data: {
          walletId: targetWalletId,
          categoryId: dbCategory.id,
          type: "INCOME",
          amount,
          date: newDate || existingHistory.date,
          competenceDate: newDate || existingHistory.date,
          description: `Aporte Cofrinho: ${existingHistory.goal?.title || "Meta"}`,
          status: "COMPLETED",
          tags: "#cofrinho, #meta",
          source: "COFRINHO",
          goalId: existingHistory.goalId,
          goalContributionId: historyId
        } as any
      });

      await tx.goalHistory.update({
        where: { id: historyId },
        data: { transactionId: newTx.id } as any
      });

      if (oldWalletId === targetWalletId) {
        const diff = amount - oldAmount;
        if (diff !== 0) {
          await tx.wallet.update({
            where: { id: targetWalletId },
            data: { currentBalance: { increment: diff } } as any
          }).catch(() => {});
        }
      } else {
        if (oldWalletId && oldAmount > 0) {
          await tx.wallet.update({
            where: { id: oldWalletId },
            data: { currentBalance: { decrement: oldAmount } } as any
          }).catch(() => {});
        }
        if (targetWalletId && amount > 0) {
          await tx.wallet.update({
            where: { id: targetWalletId },
            data: { currentBalance: { increment: amount } } as any
          }).catch(() => {});
        }
      }
    }

    const goalId = existingHistory.goalId;
    const allHistory = await tx.goalHistory.findMany({
      where: { goalId }
    });

    const goal = await tx.goal.findUnique({ where: { id: goalId } });
    if (goal) {
      const totalAportado = allHistory.reduce((s, h) => s + Number(h.amount), 0);
      const isCompleted = totalAportado >= Number(goal.objetivo) && Number(goal.objetivo) > 0;

      await tx.goal.update({
        where: { id: goalId },
        data: {
          acumulado: totalAportado,
          status: isCompleted ? "COMPLETED" : "ACTIVE",
          completedAt: isCompleted ? ((goal as any)?.completedAt || new Date()) : null
        } as any
      });
    }
  });

  revalidatePath("/metas");
  revalidatePath("/receitas");
  revalidatePath("/dashboard");
  if (targetWalletId) {
    revalidatePath(`/contas/${targetWalletId}`);
  }
  if (oldWalletId && oldWalletId !== targetWalletId) {
    revalidatePath(`/contas/${oldWalletId}`);
  }
  revalidatePath("/contas");
  revalidatePath("/despesas");
}

export async function deleteAporteAction(historyId: string) {
  let targetWalletId: string | null = null;

  await prisma.$transaction(async (tx) => {
    const existingHistory = await tx.goalHistory.findUnique({
      where: { id: historyId },
      include: { goal: true }
    });

    if (!existingHistory) return;

    const goalId = existingHistory.goalId;
    const aporteAmount = Number(existingHistory.amount || 0);
    targetWalletId = existingHistory.walletId;

    // 1. Localiza a transação vinculada (via transactionId, goalContributionId ou descrição cofrinho)
    let linkedTx: any = null;
    const existingTxId = (existingHistory as any).transactionId;
    if (existingTxId) {
      linkedTx = await tx.transaction.findUnique({
        where: { id: existingTxId }
      });
    }
    if (!linkedTx) {
      linkedTx = await tx.transaction.findFirst({
        where: {
          OR: [
            { goalContributionId: historyId } as any,
            ...(existingHistory.goal ? [{
              description: `Aporte Cofrinho: ${existingHistory.goal.title}`,
              amount: existingHistory.amount,
              source: "COFRINHO"
            }] : [])
          ]
        }
      });
    }

    // 2. Subtrai o valor correspondente do saldo da conta (decrement: amount)
    const walletToDecrement = linkedTx?.walletId || targetWalletId;
    const amountToDecrement = linkedTx ? Number(linkedTx.amount) : aporteAmount;

    if (walletToDecrement && amountToDecrement > 0) {
      await tx.wallet.update({
        where: { id: walletToDecrement },
        data: { currentBalance: { decrement: amountToDecrement } } as any
      }).catch(() => {});
    }

    // 3. Remove a receita da tabela de transações
    if (linkedTx) {
      await tx.transaction.delete({
        where: { id: linkedTx.id }
      }).catch(() => {});
    }

    // 4. Remove o registro de aporte do histórico
    await tx.goalHistory.delete({
      where: { id: historyId }
    });

    // 5. Recalcula o acumulado total com base no histórico restante da meta
    const allHistory = await tx.goalHistory.findMany({
      where: { goalId }
    });

    const goal = await tx.goal.findUnique({ where: { id: goalId } });
    if (goal) {
      const totalAportado = allHistory.reduce((s, h) => s + Number(h.amount), 0);
      const isCompleted = totalAportado >= Number(goal.objetivo) && Number(goal.objetivo) > 0;

      await tx.goal.update({
        where: { id: goalId },
        data: {
          acumulado: totalAportado,
          status: isCompleted ? "COMPLETED" : "ACTIVE",
          completedAt: isCompleted ? ((goal as any)?.completedAt || new Date()) : null
        } as any
      });
    }
  });

  // Revalidações após exclusão
  revalidatePath("/metas");
  revalidatePath("/receitas");
  revalidatePath("/dashboard");
  if (targetWalletId) {
    revalidatePath(`/contas/${targetWalletId}`);
  }
  revalidatePath("/contas");
  revalidatePath("/despesas");
}

// ---------- Actions de Cartões e Contas ----------

export async function getCardData() {
  const userId = await getActiveUserId();

  // 1. Tenta encontrar um cartão de crédito
  let wallet = await prisma.wallet.findFirst({
    where: { userId, walletType: "CREDIT_CARD" },
  });

  // 2. Se não existir cartão de crédito, usa qualquer wallet do usuário
  //    (evita criar um phantom wallet quando o usuário já tem outros cartões)
  if (!wallet) {
    wallet = await prisma.wallet.findFirst({ where: { userId } });
  }

  // 3. SOMENTE cria wallet padrão se o usuário não tiver absolutamente nenhum
  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        userId,
        title: "Cartão Principal",
        walletType: "CREDIT_CARD",
        initialBalance: 0,
        creditLimit: 5000,
      },
    });
  }

  const purchases = await prisma.transaction.findMany({
    where: {
      walletId: wallet.id,
      type: "EXPENSE",
      deletedAt: null
    },
    include: { category: true },
    orderBy: { date: "desc" }
  });

  return {
    walletId: wallet.id,
    title: wallet.title,
    bankName: wallet.bankName || wallet.title,
    walletType: wallet.walletType,
    holder: (wallet as any).holder || "",
    agencia: wallet.agencia || "",
    conta: wallet.conta || "",
    initialBalance: Number(wallet.initialBalance || 0),
    creditLimit: Number(wallet.creditLimit || 5000),
    purchases: purchases.map(p => ({
      id: p.id,
      type: (p.installmentsCount && p.installmentsCount > 1) ? ("parcelado" as const) : ("vista" as const),
      description: p.description,
      category: p.category?.name || "Outros",
      amount: Number(p.amount),
      installmentsCount: p.installmentsCount || undefined,
      currentInstallment: (p as any).currentInstallment || undefined,
      installmentGroupId: (p as any).installmentGroupId || undefined,
      tags: (p as any).tags || undefined,
      isRecurring: Boolean((p as any).isRecurring),
      recurringDay: (p as any).recurringDay || undefined,
      date: p.date.toISOString().split("T")[0]
    }))
  };
}

// ---------- Cálculo de Saldo Acumulado (Rollover / Carryover) ----------

export async function calculateAccountBalance(walletId: string, month: number, year: number) {
  // Trava absoluta de data de início da conta: Julho de 2026 (meses anteriores ficam 100% zerados)
  const isPriorToJuly2026 = year < 2026 || (year === 2026 && month < 7);
  if (isPriorToJuly2026) {
    return {
      initialBalance: 0,
      carryoverBalance: 0,
      previousBalance: 0,
      totalAvailable: 0,
      monthIncome: 0,
      monthExpense: 0,
      finalBalance: 0,
    };
  }

  const wallet = await prisma.wallet.findUnique({
    where: { id: walletId },
  });

  if (!wallet) {
    return {
      initialBalance: 0,
      carryoverBalance: 0,
      previousBalance: 0,
      totalAvailable: 0,
      monthIncome: 0,
      monthExpense: 0,
      finalBalance: 0,
    };
  }

  const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const endOfMonth   = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  // Fetch ALL historical non-deleted transactions for this wallet up to endOfMonth
  const allWalletTransactions = await prisma.transaction.findMany({
    where: {
      walletId: walletId,
      deletedAt: null,
      OR: [
        { competenceDate: { lte: endOfMonth } },
        { purchaseDate: { lte: endOfMonth } },
        { date: { lte: endOfMonth } }
      ]
    },
    select: { type: true, amount: true, status: true, date: true, competenceDate: true, competenceMonth: true, competenceYear: true, purchaseDate: true, paymentDate: true },
  });

  const getTxCompetence = (t: any) => {
    if (t.competenceMonth != null && t.competenceYear != null) {
      return { month: t.competenceMonth, year: t.competenceYear };
    }
    const d = new Date(t.competenceDate || t.purchaseDate || t.date);
    return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
  };

  // Calculate historical totals up to endOfMonth (baseado na competência)
  const totalEntradasHistoricas = allWalletTransactions
    .filter((t) => {
      if (t.type !== "INCOME" || t.status === "PENDING") return false;
      const comp = getTxCompetence(t);
      return comp.year < year || (comp.year === year && comp.month <= month);
    })
    .reduce((s, t) => s + Number(t.amount), 0);

  const totalSaidasHistoricas = allWalletTransactions
    .filter((t) => {
      if (t.type !== "EXPENSE" || t.status === "PENDING") return false;
      const comp = getTxCompetence(t);
      return comp.year < year || (comp.year === year && comp.month <= month);
    })
    .reduce((s, t) => s + Number(t.amount), 0);

  // Saldo Disponível Consolidado (Todas as Entradas - Todas as Saídas Liquidadas)
  const finalBalance = totalEntradasHistoricas - totalSaidasHistoricas;

  // Transações do mês selecionado por competência
  const monthTransactions = allWalletTransactions.filter((t) => {
    const comp = getTxCompetence(t);
    return comp.year === year && comp.month === month;
  });

  const monthIncome = monthTransactions
    .filter((t) => t.type === "INCOME" && t.status !== "PENDING")
    .reduce((s, t) => s + Number(t.amount), 0);

  const monthExpense = monthTransactions
    .filter((t) => t.type === "EXPENSE" && t.status !== "PENDING")
    .reduce((s, t) => s + Number(t.amount), 0);

  // Transações anteriores ao mês selecionado por competência
  const prevTransactions = allWalletTransactions.filter((t) => {
    const comp = getTxCompetence(t);
    return comp.year < year || (comp.year === year && comp.month < month);
  });

  const prevIncome = prevTransactions
    .filter((t) => t.type === "INCOME" && t.status !== "PENDING")
    .reduce((s, t) => s + Number(t.amount), 0);

  const prevExpense = prevTransactions
    .filter((t) => t.type === "EXPENSE" && t.status !== "PENDING")
    .reduce((s, t) => s + Number(t.amount), 0);

  const previousBalance = prevIncome - prevExpense;
  const totalAvailable  = previousBalance + monthIncome;

  return {
    initialBalance: Number(wallet.initialBalance || 0),
    carryoverBalance: previousBalance,
    previousBalance,
    totalAvailable,
    monthIncome,
    monthExpense,
    finalBalance,
  };
}

export async function addCapitalInjectionAction(input: {
  walletId: string;
  originType: "SALARIO" | "RECARGA" | "FREELANCE" | "INVESTIMENTO" | "APORTE" | "ROLLOVER";
  amount: number;
  month: number;
  year: number;
  customDescription?: string;
}) {
  const originLabels: Record<string, string> = {
    SALARIO: "[Salário]",
    RECARGA: "[Recarga de Saldo]",
    FREELANCE: "[Renda Extra]",
    INVESTIMENTO: "[Investimento]",
    APORTE: "[Aporte Direto]",
    ROLLOVER: "[Saldo Anterior]",
  };

  const tag = originLabels[input.originType] || "[Injeção]";
  const desc = input.customDescription
    ? `${tag} ${input.customDescription}`
    : `${tag} Injeção de Capital`;

  const date = new Date(Date.UTC(input.year, input.month - 1, 1, 12, 0, 0));

  const transaction = await prisma.transaction.create({
    data: {
      walletId: input.walletId,
      description: desc,
      type: "INCOME",
      amount: input.amount,
      date,
      source: `INJECTION_${input.originType}`,
    },
  });

  revalidatePath("/despesas");
  revalidatePath("/cartoes");
  revalidatePath("/ticket");
  revalidatePath("/dashboard");

  return transaction;
}

function safeIsoDate(d: any): string {
  if (!d) return new Date().toISOString().split("T")[0];
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return new Date().toISOString().split("T")[0];
    return dt.toISOString().split("T")[0];
  } catch (e) {
    return new Date().toISOString().split("T")[0];
  }
}

export async function getCardDataById(id: string, month?: number, year?: number) {
  try {
    const userId = await getActiveUserId();

    let wallet = await prisma.wallet.findFirst({
      where: { id, userId }
    });

    if (!wallet) {
      wallet = await prisma.wallet.findUnique({
        where: { id }
      });
    }

    if (!wallet) {
      return null;
    }

    const allTransactions = await prisma.transaction.findMany({
      where: {
        walletId: wallet.id,
        deletedAt: null
      },
      include: { category: true },
      orderBy: { date: "asc" }
    });

    // Auditoria de Saldo Inicial: Garante que existas uma transação formal de Abertura de Saldo se initialBalance > 0
    if (Number(wallet.initialBalance || 0) > 0) {
      const hasOpeningTx = allTransactions.some(
        (t) => t.type === "INCOME" && (t.description?.includes("Saldo Inicial") || t.description?.includes("Abertura"))
      );

      if (!hasOpeningTx) {
        let category = await prisma.category.findFirst({
          where: { name: "Saldo Inicial / Abertura" },
        });
        if (!category) {
          category = await prisma.category.create({
            data: { name: "Saldo Inicial / Abertura", color: "#10B981" },
          });
        }
        const newOpeningTx = await prisma.transaction.create({
          data: {
            walletId: wallet.id,
            description: "Saldo Inicial de Abertura",
            amount: wallet.initialBalance,
            type: "INCOME",
            status: "COMPLETED",
            categoryId: category.id,
            date: (wallet as any).createdAt || new Date("2026-07-01T00:00:00Z"),
          },
          include: { category: true },
        });
        allTransactions.unshift(newOpeningTx);
      }
    }

    const purchases = allTransactions.filter(t => t.type === "EXPENSE");
    const injections = allTransactions.filter(t => t.type === "INCOME");

    let balanceInfo = null;
    try {
      if (month && year) {
        balanceInfo = await calculateAccountBalance(wallet.id, month, year);
      } else {
        const now = new Date();
        balanceInfo = await calculateAccountBalance(wallet.id, now.getUTCMonth() + 1, now.getUTCFullYear());
      }
    } catch (calcErr) {
      console.error("Erro ao calcular saldo em getCardDataById:", calcErr);
    }

    const targetMonth = month || (new Date().getMonth() + 1);
    const targetYear  = year || new Date().getFullYear();

    const dueDateInfo = getInvoiceDueDateInfo(
      (wallet as any).diaFechamento ?? 1,
      wallet.vencimento ?? 10,
      targetMonth,
      targetYear
    );

    const paidRecord = await (prisma as any).invoicePayment.findFirst({
      where: {
        walletId: wallet.id,
        OR: [
          { month: targetMonth, year: targetYear },
          { month: dueDateInfo.billingMonth, year: dueDateInfo.billingYear }
        ]
      }
    });

    const allPaidInvoices = await (prisma as any).invoicePayment.findMany({
      where: { walletId: wallet.id }
    });
    const totalPaidAmount = allPaidInvoices.reduce((s: number, p: any) => s + Number(p.amount), 0);

    return {
      walletId: wallet.id,
      title: wallet.title || "Conta sem nome",
      bankName: wallet.bankName || wallet.title || "Banco",
      walletType: wallet.walletType || "CONTA_CORRENTE",
      holder: (wallet as any).holder || "",
      agencia: wallet.agencia || "",
      conta: wallet.conta || "",
      vencimento: wallet.vencimento ?? 10,
      diaFechamento: (wallet as any).diaFechamento ?? 1,
      melhorDiaCompra: (wallet as any).diaFechamento ? ((wallet as any).diaFechamento % 31) + 1 : 2,
      initialBalance: Number(wallet.initialBalance || 0),
      creditLimit: Number(wallet.creditLimit || 0),
      totalPaidAmount,
      vencimentoStr:    dueDateInfo.dateStr,
      isPast:           dueDateInfo.isPast,
      billingMonth:     dueDateInfo.billingMonth,
      billingYear:      dueDateInfo.billingYear,
      isPaid:           !!paidRecord,
      paidAmount:       paidRecord ? Number(paidRecord.amount) : 0,
      paidAt:           paidRecord ? paidRecord.paidAt.toISOString() : null,
      allPaidInvoices:  allPaidInvoices.map((p: any) => ({
        month: p.month,
        year: p.year,
        amount: Number(p.amount),
        paidAt: p.paidAt ? p.paidAt.toISOString() : null
      })),
      balanceInfo,
      purchases: purchases.map(p => ({
        id: p.id,
        type: (p.installmentsCount && p.installmentsCount > 1) ? ("parcelado" as const) : ("vista" as const),
        description: p.description || "Lançamento",
        category: p.category?.name || "Outros",
        amount: Number(p.amount || 0),
        installmentsCount: p.installmentsCount || undefined,
        currentInstallment: (p as any).currentInstallment || undefined,
        installmentGroupId: (p as any).installmentGroupId || undefined,
        tags: (p as any).tags || undefined,
        isRecurring: Boolean((p as any).isRecurring),
        recurringDay: (p as any).recurringDay || undefined,
        date: safeIsoDate(p.date),
        competenceDate: safeIsoDate((p as any).competenceDate || p.date),
        competenceMonth: (p as any).competenceMonth || ((p as any).competenceDate ? new Date((p as any).competenceDate).getUTCMonth() + 1 : undefined),
        competenceYear: (p as any).competenceYear || ((p as any).competenceDate ? new Date((p as any).competenceDate).getUTCFullYear() : undefined),
        purchaseDate: safeIsoDate((p as any).purchaseDate || (p as any).competenceDate || p.date),
        paymentDate: safeIsoDate((p as any).paymentDate || p.date)
      })),
      injections: injections.map(i => ({
        id: i.id,
        description: i.description || "Injeção",
        category: i.category?.name || "Injeção de Capital",
        amount: Number(i.amount || 0),
        date: safeIsoDate(i.date),
        source: i.source,
        tags: (i as any).tags || undefined,
        competenceDate: safeIsoDate((i as any).competenceDate || i.date),
        competenceMonth: (i as any).competenceMonth || ((i as any).competenceDate ? new Date((i as any).competenceDate).getUTCMonth() + 1 : undefined),
        competenceYear: (i as any).competenceYear || ((i as any).competenceDate ? new Date((i as any).competenceDate).getUTCFullYear() : undefined),
        purchaseDate: safeIsoDate((i as any).purchaseDate || (i as any).competenceDate || i.date),
        paymentDate: safeIsoDate((i as any).paymentDate || i.date)
      })),
      allTransactions: allTransactions.map(t => ({
        id: t.id,
        type: t.type,
        description: t.description || "Transação",
        category: t.category?.name || (t.type === "INCOME" ? "Injeção de Capital" : "Outros"),
        amount: Number(t.amount || 0),
        status: t.status || "COMPLETED",
        installmentsCount: t.installmentsCount || undefined,
        tags: (t as any).tags || undefined,
        isRecurring: Boolean((t as any).isRecurring),
        recurringDay: (t as any).recurringDay || undefined,
        date: safeIsoDate(t.date),
        competenceDate: safeIsoDate((t as any).competenceDate || t.date),
        competenceMonth: (t as any).competenceMonth || ((t as any).competenceDate ? new Date((t as any).competenceDate).getUTCMonth() + 1 : undefined),
        competenceYear: (t as any).competenceYear || ((t as any).competenceDate ? new Date((t as any).competenceDate).getUTCFullYear() : undefined),
        purchaseDate: safeIsoDate((t as any).purchaseDate || (t as any).competenceDate || t.date),
        paymentDate: safeIsoDate((t as any).paymentDate || t.date),
        source: t.source,
      })),
    };
  } catch (err) {
    console.error("Erro interno em getCardDataById:", err);
    return null;
  }
}

export async function getAllWalletsSimple() {
  const userId = await getActiveUserId();

  const wallets = await prisma.wallet.findMany({
    where: {
      userId,
      walletType: { in: ["CREDIT_CARD", "TICKET", "CONTA_CORRENTE"] }
    },
    orderBy: { title: "asc" }
  });

  return wallets.map(w => ({
    id: w.id,
    title: w.title,
    bankName: w.bankName || w.title,
    walletType: w.walletType
  }));
}

export async function saveCardLimit(walletId: string, limit: number) {
  await prisma.wallet.update({
    where: { id: walletId },
    data: { creditLimit: limit }
  });
  revalidatePath("/cartoes");
  revalidatePath("/despesas");
}

export async function saveCardDates(walletId: string, diaFechamento: number, diaVencimento: number) {
  await prisma.wallet.update({
    where: { id: walletId },
    data: {
      diaFechamento: Number(diaFechamento) || 1,
      vencimento: Number(diaVencimento) || 10,
    } as any,
  });
  revalidatePath("/cartoes");
  revalidatePath("/despesas");
  revalidatePath(`/cartoes/${walletId}`);
}

function parseInputDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (dateStr.includes("-")) {
    const parts = dateStr.split("-");
    return new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
  } else if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    return new Date(Date.UTC(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])));
  }
  return new Date(dateStr);
}

function extractTags(description: string, explicitTags?: string): string | null {
  if (explicitTags && explicitTags.trim()) {
    return explicitTags.trim();
  }
  const extracted = description.match(/#[\wáàâãéèêíïóôõöúçñ\-_]+/gi);
  if (extracted && extracted.length > 0) {
    return Array.from(new Set(extracted)).join(",");
  }
  return null;
}

export async function createCardPurchase(
  walletId: string,
  description: string,
  category: string,
  amount: number,
  installmentsCount: number | undefined,
  dateStr: string,
  tags?: string,
  isRecurring?: boolean,
  recurringDay?: number,
  competenceDateStr?: string,
  paymentDateStr?: string,
  purchaseDateStr?: string
) {
  let dbCategory = await prisma.category.findFirst({
    where: { name: { equals: category, mode: "insensitive" } }
  }) || await prisma.category.findFirst({
    where: { name: category }
  });
  if (!dbCategory) {
    dbCategory = await prisma.category.create({
      data: {
        name: category,
        color: getCategoryColor(category)
      }
    });
  }

  const userId = await getActiveUserId();
  const finalTags = extractTags(description, tags);
  
  // Data em que a compra/despesa foi realizada
  const purchaseDate = purchaseDateStr ? parseInputDate(purchaseDateStr) : parseInputDate(dateStr);
  // Data de vencimento / liquidação do pagamento
  const paymentDate = paymentDateStr ? parseInputDate(paymentDateStr) : (purchaseDateStr ? parseInputDate(dateStr) : purchaseDate);

  let competenceDate: Date = purchaseDate;
  if (competenceDateStr) {
    const compParts = competenceDateStr.split("-");
    competenceDate = new Date(Date.UTC(Number(compParts[0]), Number(compParts[1]) - 1, Number(compParts[2] || 1)));
  }

  const numInstallments = installmentsCount && installmentsCount > 1 ? installmentsCount : 1;

  if (numInstallments > 1) {
    const groupId = crypto.randomUUID();
    const baseInstallment = Math.floor((amount / numInstallments) * 100) / 100;
    const remainder = Math.round((amount - baseInstallment * numInstallments) * 100) / 100;

    const transactionsData = [];
    for (let i = 1; i <= numInstallments; i++) {
      const instPaymentDate = new Date(paymentDate);
      instPaymentDate.setMonth(instPaymentDate.getMonth() + (i - 1));

      const instCompetenceDate = new Date(competenceDate);
      instCompetenceDate.setMonth(instCompetenceDate.getMonth() + (i - 1));

      const instAmount = i === 1 ? baseInstallment + remainder : baseInstallment;
      const instDesc = `${description} (${i}/${numInstallments})`;

      transactionsData.push({
        walletId,
        categoryId: dbCategory.id,
        description: instDesc,
        type: "EXPENSE" as const,
        amount: instAmount,
        installmentsCount: numInstallments,
        currentInstallment: i,
        installmentGroupId: groupId,
        date: instPaymentDate,
        purchaseDate,
        paymentDate: instPaymentDate,
        competenceDate: instCompetenceDate,
        competenceMonth: instCompetenceDate.getUTCMonth() + 1,
        competenceYear: instCompetenceDate.getUTCFullYear(),
        source: "MANUAL",
        tags: finalTags,
      });
    }

    await (prisma.transaction as any).createMany({
      data: transactionsData,
    });
  } else {
    const compMonth = competenceDate.getUTCMonth() + 1;
    const compYear = competenceDate.getUTCFullYear();
    const newTx = await (prisma.transaction as any).create({
      data: {
        walletId,
        categoryId: dbCategory.id,
        description,
        type: "EXPENSE",
        amount,
        installmentsCount: 1,
        date: paymentDate,
        purchaseDate,
        paymentDate,
        competenceDate,
        competenceMonth: compMonth,
        competenceYear: compYear,
        source: "MANUAL",
        tags: finalTags,
        isRecurring: !!isRecurring,
        recurringDay: isRecurring ? (recurringDay || paymentDate.getUTCDate()) : null
      }
    });

    await syncRecurringProjections(
      walletId,
      description,
      dbCategory.name,
      dbCategory.id,
      amount,
      paymentDate,
      !!isRecurring,
      recurringDay || paymentDate.getUTCDate(),
      finalTags
    );
  }

  revalidatePath("/cartoes");
  revalidatePath("/despesas");
  revalidatePath("/dashboard");
}

async function syncRecurringProjections(
  walletId: string,
  description: string,
  categoryName: string,
  categoryId: string,
  amount: number,
  initialDate: Date,
  isRecurring: boolean,
  recurringDay?: number,
  finalTags?: string | null,
  previousDescription?: string
) {
  const userId = await getActiveUserId();
  const cleanDescription = description.trim();
  const targetDay = Math.min(31, Math.max(1, recurringDay || initialDate.getUTCDate() || 10));

  if (!isRecurring) {
    // 1. Apagar projeções futuras pendentes vinculadas
    await prisma.transaction.deleteMany({
      where: {
        walletId,
        description: { in: [cleanDescription, previousDescription].filter(Boolean) as string[] },
        source: "RECURRING_PROJECTION",
        date: { gt: initialDate },
        status: { not: "COMPLETED" }
      }
    });

    // 2. Apagar o modelo Subscription
    await (prisma as any).subscription.deleteMany({
      where: {
        userId,
        OR: [
          { name: cleanDescription },
          { name: previousDescription || cleanDescription }
        ]
      }
    });
    return;
  }

  // 1. Sincronizar model Subscription
  const existingSub = await (prisma as any).subscription.findFirst({
    where: {
      userId,
      OR: [
        { name: cleanDescription },
        { name: previousDescription || cleanDescription }
      ]
    }
  });

  if (existingSub) {
    await (prisma as any).subscription.update({
      where: { id: existingSub.id },
      data: {
        name: cleanDescription,
        amount,
        dueDay: targetDay,
        defaultWalletId: walletId,
        category: categoryName
      }
    });
  } else {
    await (prisma as any).subscription.create({
      data: {
        userId,
        name: cleanDescription,
        amount,
        dueDay: targetDay,
        defaultWalletId: walletId,
        category: categoryName,
        createdAt: initialDate
      }
    });
  }

  // 2. Apagar projeções futuras pendentes antigas para re-gerar projeção limpa
  await prisma.transaction.deleteMany({
    where: {
      walletId,
      description: { in: [cleanDescription, previousDescription].filter(Boolean) as string[] },
      source: "RECURRING_PROJECTION",
      date: { gt: initialDate },
      status: { not: "COMPLETED" }
    }
  });

  // 3. Projetar lançamentos automáticos para os próximos 11 meses
  const initialYear = initialDate.getUTCFullYear();
  const initialMonth = initialDate.getUTCMonth();

  const futureTransactions = [];
  for (let step = 1; step <= 11; step++) {
    const nextDate = new Date(Date.UTC(initialYear, initialMonth + step, targetDay, 12, 0, 0));
    const compYear = initialYear + Math.floor((initialMonth + step) / 12);
    const compMonth = ((initialMonth + step) % 12) + 1;
    const compDate = new Date(Date.UTC(compYear, compMonth - 1, 1, 0, 0, 0));
    const purchDate = new Date(Date.UTC(compYear, compMonth - 1, 1, 12, 0, 0));

    futureTransactions.push({
      walletId,
      categoryId,
      description: cleanDescription,
      type: "EXPENSE" as const,
      amount,
      installmentsCount: 1,
      date: nextDate,
      purchaseDate: purchDate,
      paymentDate: nextDate,
      competenceDate: compDate,
      competenceMonth: compMonth,
      competenceYear: compYear,
      source: "RECURRING_PROJECTION",
      status: "PENDING",
      tags: finalTags || null,
      isRecurring: true,
      recurringDay: targetDay
    });
  }

  await (prisma.transaction as any).createMany({
    data: futureTransactions
  });
}

export async function updateCardPurchase(
  id: string,
  walletId: string,
  description: string,
  category: string,
  amount: number,
  installmentsCount: number | undefined,
  dateStr: string,
  tags?: string,
  isRecurring?: boolean,
  recurringDay?: number,
  competenceDateStr?: string,
  paymentDateStr?: string,
  purchaseDateStr?: string
) {
  const userId = await getActiveUserId();

  let dbCategory = await prisma.category.findFirst({
    where: { name: { equals: category, mode: "insensitive" } }
  }) || await prisma.category.findFirst({
    where: { name: category }
  });
  if (!dbCategory) {
    dbCategory = await prisma.category.create({
      data: {
        name: category,
        color: getCategoryColor(category)
      }
    });
  }

  const finalTags = extractTags(description, tags);
  const purchaseDate = purchaseDateStr ? parseInputDate(purchaseDateStr) : parseInputDate(dateStr);
  const paymentDate = paymentDateStr ? parseInputDate(paymentDateStr) : (purchaseDateStr ? parseInputDate(dateStr) : purchaseDate);

  let competenceDate: Date = purchaseDate;
  if (competenceDateStr) {
    const compParts = competenceDateStr.split("-");
    competenceDate = new Date(Date.UTC(Number(compParts[0]), Number(compParts[1]) - 1, Number(compParts[2] || 1)));
  }

  const targetDay = recurringDay || paymentDate.getUTCDate();

  const existingTx = await prisma.transaction.findUnique({ where: { id } });

  await prisma.transaction.update({
    where: { id },
    data: {
      walletId,
      description,
      categoryId: dbCategory.id,
      amount,
      installmentsCount,
      date: paymentDate,
      purchaseDate,
      paymentDate,
      competenceDate,
      competenceMonth: competenceDate.getUTCMonth() + 1,
      competenceYear: competenceDate.getUTCFullYear(),
      tags: finalTags,
      isRecurring: !!isRecurring,
      recurringDay: isRecurring ? targetDay : null
    } as any
  });

  await syncRecurringProjections(
    walletId,
    description,
    dbCategory.name,
    dbCategory.id,
    amount,
    paymentDate,
    !!isRecurring,
    targetDay,
    finalTags,
    existingTx?.description
  );

  revalidatePath("/cartoes");
  revalidatePath("/despesas");
  revalidatePath("/receitas");
  revalidatePath("/dashboard");
}

export async function deleteCardPurchase(id: string) {
  await prisma.transaction.update({
    where: { id },
    data: { deletedAt: new Date() }
  });
  revalidatePath("/cartoes");
  revalidatePath("/despesas");
}

export async function deleteBatchPurchasesAction(ids: string[]) {
  if (!ids || ids.length === 0) return;
  await prisma.transaction.updateMany({
    where: { id: { in: ids } },
    data: { deletedAt: new Date() }
  });
  revalidatePath("/cartoes");
  revalidatePath("/despesas");
}

export async function markBatchTransactionsPaidAction(ids: string[]) {
  if (!ids || ids.length === 0) return { success: true };
  await prisma.transaction.updateMany({
    where: { id: { in: ids } },
    data: { status: "COMPLETED" }
  });
  revalidatePath("/cartoes");
  revalidatePath("/despesas");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function unmarkBatchTransactionsPaidAction(ids: string[]) {
  if (!ids || ids.length === 0) return { success: true };
  await prisma.transaction.updateMany({
    where: { id: { in: ids } },
    data: { status: "PENDING" }
  });
  revalidatePath("/cartoes");
  revalidatePath("/despesas");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function duplicateExpenseToNextMonthAction(expenseId: string) {
  const original = await prisma.transaction.findUnique({
    where: { id: expenseId }
  });
  if (!original) throw new Error("Lançamento não encontrado.");

  const origDate = new Date(original.date);
  const nextDate = new Date(Date.UTC(origDate.getUTCFullYear(), origDate.getUTCMonth() + 1, origDate.getUTCDate(), 12, 0, 0));

  const rawComp = (original as any).competenceDate;
  const origComp = rawComp ? new Date(rawComp) : origDate;
  const nextComp = new Date(Date.UTC(origComp.getUTCFullYear(), origComp.getUTCMonth() + 1, 1, 12, 0, 0));

  const newTx = await prisma.transaction.create({
    data: {
      walletId: original.walletId,
      categoryId: original.categoryId,
      description: original.description,
      type: original.type,
      amount: original.amount,
      date: nextDate,
      competenceDate: nextComp,
      status: "PENDING",
      source: original.source || "MANUAL",
      tags: original.tags,
      installmentsCount: original.installmentsCount || null,
      currentInstallment: original.currentInstallment || null,
      installmentGroupId: original.installmentGroupId || null
    } as any
  });

  const monthShorts = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const newMonthLabel = `${monthShorts[nextComp.getUTCMonth()]}/${nextComp.getUTCFullYear()}`;

  revalidatePath("/cartoes");
  revalidatePath("/despesas");
  revalidatePath("/receitas");
  revalidatePath("/dashboard");

  return { success: true, newMonthLabel, id: newTx.id };
}

export async function duplicateBatchExpensesToNextMonthAction(expenseIds: string[]) {
  if (!expenseIds || expenseIds.length === 0) return { success: true, count: 0, newMonthLabel: "" };

  const originals = await prisma.transaction.findMany({
    where: { id: { in: expenseIds }, deletedAt: null }
  });

  let lastMonthLabel = "";
  for (const original of originals) {
    const origDate = new Date(original.date);
    const nextDate = new Date(Date.UTC(origDate.getUTCFullYear(), origDate.getUTCMonth() + 1, origDate.getUTCDate(), 12, 0, 0));

    const rawComp = (original as any).competenceDate;
    const origComp = rawComp ? new Date(rawComp) : origDate;
    const nextComp = new Date(Date.UTC(origComp.getUTCFullYear(), origComp.getUTCMonth() + 1, 1, 12, 0, 0));

    await prisma.transaction.create({
      data: {
        walletId: original.walletId,
        categoryId: original.categoryId,
        description: original.description,
        type: original.type,
        amount: original.amount,
        date: nextDate,
        competenceDate: nextComp,
        status: "PENDING",
        source: original.source || "MANUAL",
        tags: original.tags,
        installmentsCount: original.installmentsCount || null,
        currentInstallment: original.currentInstallment || null,
        installmentGroupId: original.installmentGroupId || null
      } as any
    });

    const monthShorts = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    lastMonthLabel = `${monthShorts[nextComp.getUTCMonth()]}/${nextComp.getUTCFullYear()}`;
  }

  revalidatePath("/cartoes");
  revalidatePath("/despesas");
  revalidatePath("/receitas");
  revalidatePath("/dashboard");

  return { success: true, count: originals.length, newMonthLabel: lastMonthLabel };
}

// ---------- Actions de Ticket Alimentação ----------

export async function getTicketData(month: number, year: number) {
  const userId = await getActiveUserId();
  
  let wallet = await prisma.wallet.findFirst({
    where: { userId, walletType: "TICKET" }
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        userId,
        title: "Ticket Alimentação",
        walletType: "TICKET",
        initialBalance: 270
      }
    });
  }

  const balanceInfo = await calculateAccountBalance(wallet.id, month, year);

  const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const to = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const expenses = await prisma.transaction.findMany({
    where: {
      walletId: wallet.id,
      type: "EXPENSE",
      date: {
        gte: from,
        lte: to
      },
      deletedAt: null
    },
    include: { category: true },
    orderBy: { date: "asc" }
  });

  return {
    walletId: wallet.id,
    saldoDisponivel: balanceInfo.finalBalance,
    saldoInicial: balanceInfo.carryoverBalance,
    monthIncome: balanceInfo.monthIncome,
    monthExpense: balanceInfo.monthExpense,
    expenses: expenses.map(e => ({
      id: e.id,
      description: e.description,
      category: e.category?.name || "Alimentação",
      amount: Number(e.amount),
      date: e.date.toISOString().split("T")[0]
    }))
  };
}

export async function saveTicketCarga(walletId: string, carga: number) {
  await prisma.wallet.update({
    where: { id: walletId },
    data: { initialBalance: carga }
  });
  revalidatePath("/ticket");
  revalidatePath("/cartoes");
  revalidatePath("/despesas");
}

export async function addTicketCarga(walletId: string, value: number, month?: number, year?: number, categoryName: string = "Recarga de Saldo") {
  const wallet = await prisma.wallet.findUnique({
    where: { id: walletId }
  });
  if (!wallet) throw new Error("Wallet not found");

  let category = await prisma.category.findFirst({
    where: { name: categoryName }
  });
  if (!category) {
    category = await prisma.category.create({
      data: { name: categoryName, color: "#10B981" }
    });
  }

  const txDate = (month && year) ? new Date(Date.UTC(year, month - 1, 15, 12, 0, 0)) : new Date();

  await prisma.transaction.create({
    data: {
      walletId,
      description: "Recarga de Saldo",
      amount: value,
      type: "INCOME",
      status: "COMPLETED",
      categoryId: category.id,
      date: txDate,
    }
  });

  revalidatePath("/ticket");
  revalidatePath("/cartoes");
  revalidatePath("/despesas");
  revalidatePath("/dashboard");
}

export async function removeTicketCarga(walletId: string, value: number, month?: number, year?: number) {
  const wallet = await prisma.wallet.findUnique({
    where: { id: walletId }
  });
  if (!wallet) throw new Error("Wallet not found");

  let category = await prisma.category.findFirst({
    where: { name: "Ajuste / Retirada de Saldo" }
  });
  if (!category) {
    category = await prisma.category.create({
      data: { name: "Ajuste / Retirada de Saldo", color: "#EF4444" }
    });
  }

  const txDate = (month && year) ? new Date(Date.UTC(year, month - 1, 15, 12, 0, 0)) : new Date();

  await prisma.transaction.create({
    data: {
      walletId,
      description: "Ajuste / Retirada de Saldo",
      amount: value,
      type: "EXPENSE",
      status: "COMPLETED",
      categoryId: category.id,
      date: txDate,
    }
  });

  revalidatePath("/ticket");
  revalidatePath("/cartoes");
  revalidatePath("/despesas");
  revalidatePath("/dashboard");
}

export async function createTicketExpense(
  walletId: string,
  description: string,
  category: string,
  amount: number,
  dateStr: string
) {
  let dbCategory = await prisma.category.findFirst({
    where: { name: { equals: category, mode: "insensitive" } }
  }) || await prisma.category.findFirst({
    where: { name: category }
  });
  if (!dbCategory && category) {
    dbCategory = await prisma.category.create({
      data: { name: category, color: getCategoryColor(category) }
    });
  }

  const parts = dateStr.split("-");
  const date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));

  await prisma.transaction.create({
    data: {
      walletId,
      description,
      categoryId: dbCategory?.id,
      type: "EXPENSE",
      amount,
      date,
      source: "MANUAL"
    }
  });
  revalidatePath("/ticket");
}

export async function updateTicketExpense(
  id: string,
  description: string,
  category: string,
  amount: number,
  dateStr: string
) {
  let dbCategory = await prisma.category.findFirst({
    where: { name: { equals: category, mode: "insensitive" } }
  }) || await prisma.category.findFirst({
    where: { name: category }
  });
  if (!dbCategory && category) {
    dbCategory = await prisma.category.create({
      data: { name: category, color: getCategoryColor(category) }
    });
  }

  const parts = dateStr.split("-");
  const date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));

  await prisma.transaction.update({
    where: { id },
    data: {
      description,
      categoryId: dbCategory?.id,
      amount,
      date
    }
  });
  revalidatePath("/ticket");
}

export async function deleteTicketExpense(id: string) {
  await prisma.transaction.update({
    where: { id },
    data: { deletedAt: new Date() }
  });
  revalidatePath("/ticket");
}

// ---------- Actions de Visão Geral de Despesas ----------

export async function getAllCardsOverview(month?: number | null | string, year: number = 2026) {
  const userId = await getActiveUserId();

  // A lista de Meus Cartões e Contas NUNCA é filtrada por mês/ano na busca de wallets
  const wallets = await prisma.wallet.findMany({
    where: {
      userId,
      walletType: { in: ["CREDIT_CARD", "TICKET", "CONTA_CORRENTE"] },
    },
    orderBy: { title: "asc" },
  });

  const isAnnualView = !month || month === "ALL" || month === "0" || Number.isNaN(Number(month));

  let from: Date;
  let to: Date;

  if (!isAnnualView) {
    const numMonth = Number(month);
    from = new Date(Date.UTC(year, numMonth - 1, 1, 0, 0, 0));
    to   = new Date(Date.UTC(year, numMonth, 0, 23, 59, 59, 999));
  } else {
    from = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    to   = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
  }

  const effectiveMonth = !isAnnualView ? Number(month) : (new Date().getMonth() + 1);

  const result = await Promise.all(
    wallets.map(async (w) => {
      const isCredit = w.walletType === "CREDIT_CARD";
      const balanceInfo = await calculateAccountBalance(w.id, effectiveMonth, year);

      const rawTransactions = await prisma.transaction.findMany({
        where: {
          walletId: w.id,
          type:     "EXPENSE",
          OR: [
            ...(!isAnnualView ? [{ competenceMonth: Number(month), competenceYear: year }] : [{ competenceYear: year }]),
            { competenceDate: { gte: from, lte: to } },
            { purchaseDate: { gte: from, lte: to } },
            { date: { gte: from, lte: to } }
          ],
          deletedAt: null,
        },
        include: { category: true },
        orderBy: { date: "asc" },
      });

      const transactions = rawTransactions.filter((t) => {
        if ((t as any).competenceMonth != null && (t as any).competenceYear != null) {
          if (!isAnnualView) {
            return (t as any).competenceMonth === Number(month) && (t as any).competenceYear === year;
          }
          return (t as any).competenceYear === year;
        }
        const d = new Date((t as any).competenceDate || (t as any).purchaseDate || t.date);
        return d >= from && d <= to;
      });

      const filteredTransactions = isCredit
        ? transactions
        : transactions.filter(t => !isInvoicePaymentTransaction(t) && !isSubscriptionPaymentTransaction(t));

      const faturaAtual = filteredTransactions.reduce((s, t) => s + Number(t.amount), 0);
      const faturaPaga = filteredTransactions
        .filter(t => (t as any).status === "COMPLETED" || (t as any).status === "pago" || (t as any).status === "confirmado")
        .reduce((s, t) => s + Number(t.amount), 0);
      const faturaPendente = filteredTransactions
        .filter(t => (t as any).status === "PENDING" || ((t as any).status !== "COMPLETED" && (t as any).status !== "pago" && (t as any).status !== "confirmado"))
        .reduce((s, t) => s + Number(t.amount), 0);

      // Para cartão de crédito: limitTotal é o limite de crédito.
      // Para conta corrente e ticket: limitTotal é o SALDO FINAL ACUMULADO.
      const limitTotal = isCredit
        ? Number(w.creditLimit || 0)
        : balanceInfo.finalBalance;

      const allExpenses = await prisma.transaction.findMany({
        where: { walletId: w.id, type: "EXPENSE", deletedAt: null },
      });

      let limitUsed = 0;
      if (isCredit) {
        const allPaidInvoices = await (prisma as any).invoicePayment.findMany({
          where: { walletId: w.id }
        });
        const paidKeys = new Set(allPaidInvoices.map((p: any) => `${p.month}-${p.year}`));

        limitUsed = allExpenses
          .filter(t => {
            const dt = new Date(t.date);
            const m = dt.getUTCMonth() + 1;
            const y = dt.getUTCFullYear();
            const isPaid = paidKeys.has(`${m}-${y}`);
            return !isPaid;
          })
          .reduce((s, t) => s + Number(t.amount), 0);
      } else {
        limitUsed = balanceInfo.monthExpense;
      }

      const titleDigits = w.title.replace(/\D/g, "").slice(-4).padStart(4, "0");
      const lastDigits  = titleDigits ? `**** ${titleDigits}` : "**** ----";

      // Total gasto / saídas da conta no período selecionado (Mês ou Ano)
      // Somar todas as saídas vinculadas a essa conta registradas no período
      const accountExpenses = transactions.reduce((s, t) => s + Number(t.amount), 0);
      const totalSpentInPeriod = accountExpenses;

      // Entradas na conta no período selecionado
      const rawPeriodIncomes = await prisma.transaction.findMany({
        where: {
          walletId: w.id,
          type:     "INCOME",
          OR: [
            ...(!isAnnualView ? [{ competenceMonth: Number(month), competenceYear: year }] : [{ competenceYear: year }]),
            { competenceDate: { gte: from, lte: to } },
            { date: { gte: from, lte: to } }
          ],
          deletedAt: null,
        },
        select: { amount: true, date: true, competenceDate: true, competenceMonth: true, competenceYear: true },
      });
      const periodIncomes = rawPeriodIncomes.filter((t) => {
        if ((t as any).competenceMonth != null && (t as any).competenceYear != null) {
          if (!isAnnualView) {
            return (t as any).competenceMonth === Number(month) && (t as any).competenceYear === year;
          }
          return (t as any).competenceYear === year;
        }
        const d = new Date((t as any).competenceDate || t.date);
        return d >= from && d <= to;
      });
      const accountIncomes = periodIncomes.reduce((s, t) => s + Number(t.amount), 0);

      const dueDateInfo = getInvoiceDueDateInfo(
        (w as any).diaFechamento ?? 1,
        w.vencimento ?? 10,
        effectiveMonth,
        year
      );

      const paidWhere: any = { walletId: w.id };
      if (!isAnnualView) {
        paidWhere.OR = [
          { month: Number(month), year },
          { month: dueDateInfo.billingMonth, year: dueDateInfo.billingYear }
        ];
      } else {
        paidWhere.year = year;
      }

      const paidRecord = await (prisma as any).invoicePayment.findFirst({
        where: paidWhere
      });

      return {
        id:               w.id,
        title:            w.title,
        bankName:         w.bankName || w.title,
        walletType:       w.walletType,
        holder:           (w as any).holder || "",
        agencia:          w.agencia || "",
        conta:            w.conta || "",
        lastDigits,
        cardBrand:        isCredit ? "VISA" : "",
        limitTotal,
        limitUsed:        isCredit ? Math.min(limitUsed, limitTotal) : limitUsed,
        faturaAtual,
        faturaPaga,
        faturaPendente,
        accountExpenses,
        totalSpentInPeriod,
        accountIncomes,
        isAnnualView,
        periodExpenseCount: transactions.length,
        periodIncomeCount:  periodIncomes.length,
        carryoverBalance: balanceInfo.carryoverBalance,
        monthIncome:      balanceInfo.monthIncome,
        monthExpense:     balanceInfo.monthExpense,
        finalBalance:     balanceInfo.finalBalance,
        vencimento:       w.vencimento ?? 10,
        diaFechamento:    (w as any).diaFechamento ?? 1,
        melhorDiaCompra:  (w as any).diaFechamento ? (((w as any).diaFechamento % 31) + 1) : 2,
        color:            "from-indigo-600 via-purple-600 to-violet-600",
        vencimentoStr:    dueDateInfo.dateStr,
        isPast:           dueDateInfo.isPast,
        billingMonth:     dueDateInfo.billingMonth,
        billingYear:      dueDateInfo.billingYear,
        isPaid:           !!paidRecord,
        paidAmount:       paidRecord ? Number(paidRecord.amount) : 0,
        paidAt:           paidRecord ? paidRecord.paidAt.toISOString() : null,
      };
    })
  );

  return result;
}

export async function getRealRevenueAction(month: number | null | string, year: number = 2026) {
  const userId = await getActiveUserId();
  const isAnnualView = !month || month === "ALL" || month === "0" || Number.isNaN(Number(month));
  const monthNum = isAnnualView ? null : Number(month);

  let from: Date;
  let to: Date;

  if (monthNum) {
    from = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0));
    to = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));
  } else {
    from = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    to = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      wallet: { userId },
      type: "INCOME",
      deletedAt: null,
      date: { gte: from, lte: to },
    },
    include: { wallet: true },
  });

  let total = 0;
  transactions.forEach((t) => {
    const isRealized = t.status === "COMPLETED" || t.status === "PAID";
    const wType = (t.wallet?.walletType || "").toUpperCase();
    const isBenefit = ["TICKET", "BENEFICIO", "BENEFÍCIO"].includes(wType);
    if (isRealized && !isBenefit) {
      total += Number(t.amount);
    }
  });

  return Math.round(total * 100) / 100;
}

// ---------- Actions de Pagamento de Faturas ----------

export async function payCardInvoiceAction(
  cardWalletId: string,
  month: number,
  year: number,
  amount: number,
  paymentWalletId?: string
) {
  const userId = await getActiveUserId();

  const card = await prisma.wallet.findUnique({
    where: { id: cardWalletId, userId },
  });
  if (!card) throw new Error("Cartão não encontrado.");

  let paymentTransactionId: string | null = null;

  if (paymentWalletId && paymentWalletId !== "NONE") {
    const paymentWallet = await prisma.wallet.findUnique({
      where: { id: paymentWalletId, userId },
    });

    if (paymentWallet) {
      let invoiceCat = await prisma.category.findFirst({
        where: { name: { equals: "Pagamento de Fatura", mode: "insensitive" } },
      });
      if (!invoiceCat) {
        invoiceCat = await prisma.category.create({
          data: {
            name: "Pagamento de Fatura",
            color: "#6366F1",
          },
        });
      }

      const now = new Date();
      const monthName = getMonthName(month);
      const tx = await prisma.transaction.create({
        data: {
          walletId: paymentWallet.id,
          categoryId: invoiceCat.id,
          description: `Pagamento de Fatura - ${card.title || card.bankName} (${monthName}/${year})`,
          type: "EXPENSE",
          amount: amount,
          date: now,
          competenceDate: now,
          source: "MANUAL",
          tags: "#pagamentodefatura",
        },
      });
      paymentTransactionId = tx.id;
    }
  }

  await (prisma as any).invoicePayment.upsert({
    where: {
      walletId_month_year: {
        walletId: cardWalletId,
        month,
        year,
      },
    },
    create: {
      walletId: cardWalletId,
      month,
      year,
      amount: amount,
      paymentWalletId: (paymentWalletId && paymentWalletId !== "NONE") ? paymentWalletId : null,
      paymentTransactionId,
    },
    update: {
      amount: amount,
      paymentWalletId: (paymentWalletId && paymentWalletId !== "NONE") ? paymentWalletId : null,
      paymentTransactionId,
      paidAt: new Date(),
    },
  });

  // Atualiza todas as transações do mês da fatura para COMPLETED/PAID
  const invoiceFrom = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const invoiceTo   = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  await prisma.transaction.updateMany({
    where: {
      walletId: cardWalletId,
      type: "EXPENSE",
      date: { gte: invoiceFrom, lte: invoiceTo },
      deletedAt: null,
    },
    data: {
      status: "COMPLETED",
    },
  });

  revalidatePath("/despesas");
  revalidatePath("/cartoes");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function undoCardInvoicePaymentAction(
  cardWalletId: string,
  month: number,
  year: number
) {
  const userId = await getActiveUserId();

  const existing = await (prisma as any).invoicePayment.findFirst({
    where: {
      walletId: cardWalletId,
      OR: [
        { month, year },
        { wallet: { userId } }
      ]
    },
  });

  const specificPayment = await (prisma as any).invoicePayment.findUnique({
    where: {
      walletId_month_year: {
        walletId: cardWalletId,
        month,
        year,
      },
    },
  }) || existing;

  if (!specificPayment) return { success: true };

  if (specificPayment.paymentTransactionId) {
    await prisma.transaction.updateMany({
      where: { id: specificPayment.paymentTransactionId },
      data: { deletedAt: new Date() },
    });
  }

  // Atualiza as transações da fatura de volta para PENDING
  const targetMonth = specificPayment?.month || month;
  const targetYear  = specificPayment?.year || year;
  const invoiceFrom = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0));
  const invoiceTo   = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));

  await prisma.transaction.updateMany({
    where: {
      walletId: cardWalletId,
      type: "EXPENSE",
      date: { gte: invoiceFrom, lte: invoiceTo },
      deletedAt: null,
    },
    data: {
      status: "PENDING",
    },
  });

  await (prisma as any).invoicePayment.delete({
    where: { id: specificPayment.id },
  });

  revalidatePath("/despesas");
  revalidatePath("/cartoes");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getPaidInvoicesAction(month?: number | null | string, year: number = 2026) {
  const userId = await getActiveUserId();

  const isAnnualView = !month || month === "ALL" || month === "0" || Number.isNaN(Number(month));

  const paidInvoices = await (prisma as any).invoicePayment.findMany({
    where: {
      wallet: { userId },
    },
    include: {
      wallet: true,
    },
    orderBy: { paidAt: "desc" },
  });

  const filtered = paidInvoices.filter((p: any) => {
    if (!isAnnualView) {
      const numMonth = Number(month);
      if (p.month === numMonth && p.year === year) return true;
      const paidDate = new Date(p.paidAt);
      return (paidDate.getUTCMonth() + 1 === numMonth && paidDate.getUTCFullYear() === year);
    } else {
      if (p.year === year) return true;
      const paidDate = new Date(p.paidAt);
      return paidDate.getUTCFullYear() === year;
    }
  });

  return Promise.all(
    filtered.map(async (p: any) => {
      let paymentWalletTitle = "Sem Débito em Conta";
      if (p.paymentWalletId) {
        const sourceWallet = await prisma.wallet.findUnique({
          where: { id: p.paymentWalletId },
          select: { title: true },
        });
        if (sourceWallet) paymentWalletTitle = sourceWallet.title;
      }

      return {
        id: p.id,
        walletId: p.walletId,
        cardTitle: p.wallet.title,
        bankName: p.wallet.bankName || p.wallet.title,
        month: p.month,
        year: p.year,
        amount: Number(p.amount),
        paidAt: p.paidAt.toISOString(),
        paymentWalletId: p.paymentWalletId,
        paymentWalletTitle,
      };
    })
  );
}

export async function createNewCard(input: {
  bankName:        string;
  walletType:      string;
  alias:           string;
  holder?:         string;
  agencia:         string;
  conta:           string;
  limitOrBalance:  number;
  diaFechamento:   number;
  diaVencimento:   number;
  originType?:     "SALARIO" | "RECARGA" | "FREELANCE" | "INVESTIMENTO" | "APORTE" | "ROLLOVER";
  targetMonth?:    number;
  targetYear?:     number;
}) {
  const userId = await getActiveUserId();

  const isCredit = input.walletType === "CREDIT_CARD";

  const wallet = await prisma.wallet.create({
    data: {
      userId,
      title:          input.alias || input.bankName,
      bankName:       input.bankName,
      walletType:     input.walletType,
      holder:         input.holder || null,
      agencia:        input.agencia,
      conta:          input.conta,
      vencimento:     Number(input.diaVencimento) || 10,
      diaFechamento:  Number(input.diaFechamento) || 1,
      initialBalance: isCredit ? 0 : (!input.originType || input.originType === "ROLLOVER" ? input.limitOrBalance : 0),
      creditLimit:    isCredit ? input.limitOrBalance : null,
    } as any,
  });

  if (!isCredit && input.limitOrBalance > 0 && input.originType && input.originType !== "ROLLOVER") {
    const now = new Date();
    const month = input.targetMonth || (now.getUTCMonth() + 1);
    const year  = input.targetYear  || now.getUTCFullYear();

    await addCapitalInjectionAction({
      walletId: wallet.id,
      originType: input.originType,
      amount: input.limitOrBalance,
      month,
      year,
      customDescription: "Saldo Inicial de Abertura",
    });
  }

  revalidatePath("/despesas");
  revalidatePath("/cartoes");
}

export async function updateCardAccount(
  walletId: string,
  input: {
    bankName:       string;
    walletType:     string;
    alias:          string;
    holder?:        string;
    agencia?:       string;
    conta?:         string;
    limitOrBalance: number;
    diaFechamento?: number;
    diaVencimento:  number;
  }
) {
  await prisma.wallet.update({
    where: { id: walletId },
    data: {
      title:          input.alias || input.bankName,
      bankName:       input.bankName,
      walletType:     input.walletType,
      holder:         input.holder || null,
      agencia:        input.agencia,
      conta:          input.conta,
      vencimento:     Number(input.diaVencimento) || 10,
      diaFechamento:  input.diaFechamento ? Number(input.diaFechamento) : 1,
      initialBalance: input.walletType === "CREDIT_CARD" ? 0 : input.limitOrBalance,
      creditLimit:    input.walletType === "CREDIT_CARD" ? input.limitOrBalance : null,
    } as any,
  });

  revalidatePath("/despesas");
  revalidatePath("/cartoes");
}

export async function deleteCardAccount(walletId: string) {
  try {
    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { walletId } }),
      prisma.invoicePayment.deleteMany({ where: { walletId } }),
      prisma.subscription.updateMany({ where: { defaultWalletId: walletId }, data: { defaultWalletId: null } }),
      prisma.goalHistory.deleteMany({ where: { walletId } }),
      prisma.goal.deleteMany({ where: { walletId } }),
      prisma.wallet.delete({ where: { id: walletId } }),
    ]);

    revalidatePath("/despesas");
    revalidatePath("/cartoes");
    revalidatePath("/dashboard");
    revalidatePath("/historico-pagamentos");
    return { success: true };
  } catch (error) {
    console.error("Erro ao deletar cartão/carteira:", error);
    throw error;
  }
}

// ---------- Busca de Faturas Pendentes a Vencer (Ordenação Cronológica) ----------

export async function getUpcomingCreditCardBills(userId: string) {
  // 1. Busca todos os cartões de crédito do usuário
  const creditCards = await prisma.wallet.findMany({
    where: {
      userId,
      walletType: "CREDIT_CARD",
    },
    orderBy: { title: "asc" },
  });

  if (creditCards.length === 0) return [];

  const cardIds = creditCards.map((c) => c.id);

  // 2. Busca todas as transações de despesa em cartões de crédito não deletadas
  const transactions = await prisma.transaction.findMany({
    where: {
      walletId: { in: cardIds },
      type: "EXPENSE",
      deletedAt: null,
    },
    select: {
      id: true,
      walletId: true,
      amount: true,
      date: true,
      status: true,
    },
    orderBy: { date: "asc" },
  });

  // 3. Busca todos os registros de pagamentos de faturas efetuados
  const paidInvoices = await (prisma as any).invoicePayment.findMany({
    where: {
      walletId: { in: cardIds },
    },
  });

  // Mapeia os pagamentos efetuados por walletId e competência/vencimento
  const paidMap = new Map<string, number>();
  paidInvoices.forEach((p: any) => {
    const key = `${p.walletId}-${p.month}-${p.year}`;
    paidMap.set(key, (paidMap.get(key) || 0) + Number(p.amount));
  });

  // 4. Agrupa transações por cartão e competência (mês e ano da despesa)
  const invoiceGroups = new Map<string, {
    card: typeof creditCards[0];
    month: number;
    year: number;
    totalAmount: number;
  }>();

  transactions.forEach((tx) => {
    const d = new Date(tx.date);
    const m = d.getUTCMonth() + 1;
    const y = d.getUTCFullYear();
    const groupKey = `${tx.walletId}-${m}-${y}`;

    const existing = invoiceGroups.get(groupKey);
    const amt = Number(tx.amount);

    if (existing) {
      existing.totalAmount += amt;
    } else {
      const card = creditCards.find((c) => c.id === tx.walletId);
      if (card) {
        invoiceGroups.set(groupKey, {
          card,
          month: m,
          year: y,
          totalAmount: amt,
        });
      }
    }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pendingBills = [];

  for (const group of Array.from(invoiceGroups.values())) {
    const { card, month, year, totalAmount } = group;
    if (totalAmount <= 0) continue;

    // Calcula a data de vencimento da fatura deste mês de competência
    const dueDateInfo = getInvoiceDueDateInfo(
      (card as any).diaFechamento ?? 1,
      card.vencimento ?? 10,
      month,
      year
    );

    // Verifica se essa fatura foi paga (pela competência OU pelo mês de vencimento)
    const paidByComp = paidMap.get(`${card.id}-${month}-${year}`) || 0;
    const paidByVenc = paidMap.get(`${card.id}-${dueDateInfo.billingMonth}-${dueDateInfo.billingYear}`) || 0;
    const totalPaid = Math.max(paidByComp, paidByVenc);

    // Se o valor pago for maior ou igual ao total, consideramos quitada
    if (totalPaid >= totalAmount) continue;

    const remainingAmount = Math.max(0, totalAmount - totalPaid);
    if (remainingAmount <= 0) continue;

    const dueDate = new Date(dueDateInfo.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const timeDiff = dueDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    const isPast = daysDiff < 0;

    let statusLabel = "PENDENTE";
    let statusBadgeVariant: "overdue" | "urgent" | "pending" = "pending";

    if (isPast) {
      const daysOverdue = Math.abs(daysDiff);
      statusLabel = daysOverdue === 1 ? "ATRASADA (1 DIA)" : `ATRASADA (${daysOverdue} DIAS)`;
      statusBadgeVariant = "overdue";
    } else if (daysDiff === 0) {
      statusLabel = "VENCE HOJE";
      statusBadgeVariant = "urgent";
    } else if (daysDiff <= 7) {
      statusLabel = daysDiff === 1 ? "VENCE AMANHÃ" : `VENCE EM ${daysDiff} DIAS`;
      statusBadgeVariant = "urgent";
    }

    pendingBills.push({
      id: `${card.id}-${year}-${month}`,
      cardId: card.id,
      title: card.title || card.bankName || "Cartão de Crédito",
      bankName: card.bankName || card.title,
      month,
      year,
      valor: Math.round(remainingAmount * 100) / 100,
      vencimento: dueDateInfo.dateStr,
      dueDate: dueDate.toISOString(),
      isPast,
      daysDiff,
      statusLabel,
      statusBadgeVariant,
    });
  }

  // Ordenação obrigatória pela data de vencimento mais próxima para a mais distante (crescente)
  pendingBills.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return pendingBills;
}

export async function getUpcomingBillsAction() {
  const userId = await getActiveUserId();
  return getUpcomingCreditCardBills(userId);
}

// ---------- Actions de Dashboard Principal ----------

export async function getDashboardOverviewData(year: number, month?: number | null, tag?: string | null) {
  const userId = await getActiveUserId();

  console.log("[getDashboardOverviewData] Início da busca:", { userId, year, month, tag });

  let from: Date;
  let to: Date;

  // Buffer de 24h para cobrir variações de fuso horário (ex: UTC-3 vs UTC)
  if (month && month >= 1 && month <= 12) {
    from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0) - 24 * 3600 * 1000);
    to   = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999) + 24 * 3600 * 1000);
  } else {
    from = new Date(Date.UTC(year, 0, 1, 0, 0, 0) - 24 * 3600 * 1000);
    to   = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999) + 24 * 3600 * 1000);
  }

  // 1. Lançamentos filtrados pelo período (Mês ou Ano) com inclusão de tags opcionais e respeito à competência
  const rawRangeTransactions: any[] = await prisma.transaction.findMany({
    where: {
      wallet: { userId },
      deletedAt: null,
      OR: [
        ...(month && month >= 1 && month <= 12 ? [{ competenceMonth: month, competenceYear: year }] : [{ competenceYear: year }]),
        { competenceDate: { gte: from, lte: to } },
        { purchaseDate: { gte: from, lte: to } },
        { date: { gte: from, lte: to } }
      ],
      ...(tag ? { tags: { contains: tag, mode: "insensitive" } } : {})
    } as any,
    include: {
      category: true,
      wallet: { select: { walletType: true, title: true } }
    },
    orderBy: { date: "desc" }
  });

  // Filtra com precisão garantindo que transações pertençam ao ano/mês sob regime de competência
  const rangeTransactions = rawRangeTransactions.filter((t) => {
    if (t.competenceMonth != null && t.competenceYear != null) {
      if (month && month >= 1 && month <= 12) {
        return t.competenceMonth === month && t.competenceYear === year;
      }
      return t.competenceYear === year;
    }
    const d = new Date(t.competenceDate || t.purchaseDate || t.date);
    const utcYear = d.getUTCFullYear();
    const utcMonth = d.getUTCMonth() + 1;
    const brt = new Date(d.getTime() - 3 * 3600 * 1000);
    const brtYear = brt.getUTCFullYear();
    const brtMonth = brt.getUTCMonth() + 1;

    if (month && month >= 1 && month <= 12) {
      return (utcYear === year && utcMonth === month) || (brtYear === year && brtMonth === month);
    }
    return utcYear === year || brtYear === year;
  });

  console.log(`[getDashboardOverviewData] Transações brutas: ${rawRangeTransactions.length}, filtradas no período: ${rangeTransactions.length}`);

  let totalReceitas = 0;
  let totalCreditExpenses = 0;
  let totalDebitExpenses = 0;

  rangeTransactions.forEach((t) => {
    const amt = Number(t.amount || 0);
    if (isNaN(amt) || amt <= 0) return;

    const isRealized = t.status === "COMPLETED" || t.status === "PAID";
    const wType = (t.wallet?.walletType || "").toUpperCase();
    const isBenefit = ["TICKET", "BENEFICIO", "BENEFÍCIO"].includes(wType);
    const isCredit = wType === "CREDIT_CARD";

    if (t.type === "INCOME") {
      if (isRealized && !isBenefit) {
        totalReceitas += amt;
      }
    } else if (t.type === "EXPENSE") {
      if (isCredit) {
        // Despesas lançadas em cartão de crédito no período
        totalCreditExpenses += amt;
      } else if (!isBenefit) {
        // Despesas em conta corrente / débito / PIX (exclui pagamento de fatura para não duplicar com despesas de crédito)
        if (!isInvoicePaymentTransaction(t)) {
          totalDebitExpenses += amt;
        }
      }
    }
  });

  // Cartões & Contas Overview (usamos o mês fornecido ou null para visão anual completa)
  const currentMonthNum = month || (new Date().getMonth() + 1);
  const cards = await getAllCardsOverview(month ? month : null, year);

  // Se estiver em modo mensal e os cartões tiverem cálculo consolidado de fatura via cards overview
  if (month) {
    const creditCardsTotal = cards
      .filter((c: any) => c.walletType === "CREDIT_CARD")
      .reduce((s: number, c: any) => s + Number(c.faturaAtual || 0), 0);
    if (creditCardsTotal > 0 && totalCreditExpenses === 0) {
      totalCreditExpenses = creditCardsTotal;
    }
  }

  totalReceitas = Math.max(0, Math.round(totalReceitas * 100) / 100);
  totalCreditExpenses = Math.max(0, Math.round(totalCreditExpenses * 100) / 100);
  totalDebitExpenses = Math.max(0, Math.round(totalDebitExpenses * 100) / 100);
  const totalGastos = Math.round((totalCreditExpenses + totalDebitExpenses) * 100) / 100;
  const balanco = Math.round((totalReceitas - totalGastos) * 100) / 100;

  // Metas Globais (Média ponderada ou percentual acumulado sobre objetivos ativos)
  const goals = await getGoals();
  const activeGoals = goals.filter((g: any) => g.status !== "COMPLETED" || g.pct >= 0);
  const totalAcumuladoMetas = activeGoals.reduce((s, g) => s + g.acumulado, 0);
  const totalObjetivoMetas = activeGoals.reduce((s, g) => s + g.objetivo, 0);
  const metasGlobaisPct = totalObjetivoMetas > 0 ? Math.min(100, Math.round((totalAcumuladoMetas / totalObjetivoMetas) * 100)) : 0;

  // 2. Breakdown de Gastos por Categoria no Período Filtrado
  // Inclui despesas em cartão de crédito e contas/débito, excluindo apenas pagamentos de fatura
  const monthExpenses = rangeTransactions.filter(
    (e) =>
      e.type === "EXPENSE" &&
      !isInvoicePaymentTransaction(e)
  );

  console.log(`[getDashboardOverviewData] Despesas para Distribuição por Categoria: ${monthExpenses.length}`);

  const categoryMap: Record<string, { name: string; color: string; total: number }> = {};

  monthExpenses.forEach((exp) => {
    const rawAmt = Number(exp.amount || 0);
    const amt = isNaN(rawAmt) ? 0 : Math.max(0, rawAmt);
    if (amt <= 0) return;

    const catName = exp.category?.name?.trim() || "Outros";
    const catColor = exp.category?.color || getCategoryColor(catName);

    if (!categoryMap[catName]) {
      categoryMap[catName] = { name: catName, color: catColor, total: 0 };
    }
    categoryMap[catName].total = Math.round((categoryMap[catName].total + amt) * 100) / 100;
  });

  const categoryBreakdown = Object.values(categoryMap).sort((a, b) => b.total - a.total);
  if (categoryBreakdown.length === 0) {
    categoryBreakdown.push({ name: "Sem gastos", color: "#94A3B8", total: 0 });
  }

  // 3. Histórico Comparativo ("Evolução Financeira")
  // No modo anual: exibe todos os 12 meses do ano selecionado.
  // No modo mensal: exibe os últimos 7 meses até o mês selecionado.
  const MONTH_NAMES_SHORT = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

  let histFrom: Date;
  let histTo: Date;

  if (!month) {
    histFrom = new Date(Date.UTC(year, 0, 1, 0, 0, 0) - 24 * 3600 * 1000);
    histTo   = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999) + 24 * 3600 * 1000);
  } else {
    let startM = month - 6;
    let startY = year;
    if (startM <= 0) {
      startM += 12;
      startY -= 1;
    }
    histFrom = new Date(Date.UTC(startY, startM - 1, 1, 0, 0, 0) - 24 * 3600 * 1000);
    histTo   = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999) + 24 * 3600 * 1000);
  }

  const histTransactionsRaw = await prisma.transaction.findMany({
    where: {
      wallet: { userId },
      deletedAt: null,
      date: { gte: histFrom, lte: histTo },
      ...(tag ? { tags: { contains: tag, mode: "insensitive" } } : {})
    },
    include: {
      wallet: { select: { walletType: true } },
      category: true
    }
  });

  const historyMonths: { month: string; receitas: number; gastos: number }[] = [];

  if (!month) {
    // Visão Anual: 12 meses (JAN a DEZ)
    for (let m = 1; m <= 12; m++) {
      const label = MONTH_NAMES_SHORT[m - 1];
      const mTx = histTransactionsRaw.filter((t) => {
        const d = new Date(t.date);
        const utcYear = d.getUTCFullYear();
        const utcMonth = d.getUTCMonth() + 1;
        const brt = new Date(d.getTime() - 3 * 3600 * 1000);
        const brtYear = brt.getUTCFullYear();
        const brtMonth = brt.getUTCMonth() + 1;
        return (utcYear === year && utcMonth === m) || (brtYear === year && brtMonth === m);
      });

      const mInc = mTx
        .filter((t) => t.type === "INCOME" && (t.status === "COMPLETED" || t.status === "PAID") && !["TICKET", "BENEFICIO", "BENEFÍCIO"].includes((t.wallet?.walletType || "").toUpperCase()))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const mExp = mTx
        .filter((t) => t.type === "EXPENSE" && !isInvoicePaymentTransaction(t))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      historyMonths.push({
        month: label,
        receitas: Math.round(mInc * 100) / 100,
        gastos: Math.round(mExp * 100) / 100,
      });
    }
  } else {
    // Visão Mensal: 7 meses até o mês selecionado
    for (let i = 6; i >= 0; i--) {
      let m = month - i;
      let y = year;
      if (m <= 0) {
        m += 12;
        y -= 1;
      }
      const label = MONTH_NAMES_SHORT[m - 1];
      const mTx = histTransactionsRaw.filter((t) => {
        const d = new Date(t.date);
        const utcYear = d.getUTCFullYear();
        const utcMonth = d.getUTCMonth() + 1;
        const brt = new Date(d.getTime() - 3 * 3600 * 1000);
        const brtYear = brt.getUTCFullYear();
        const brtMonth = brt.getUTCMonth() + 1;
        return (utcYear === y && utcMonth === m) || (brtYear === y && brtMonth === m);
      });

      const mInc = mTx
        .filter((t) => t.type === "INCOME" && (t.status === "COMPLETED" || t.status === "PAID") && !["TICKET", "BENEFICIO", "BENEFÍCIO"].includes((t.wallet?.walletType || "").toUpperCase()))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const mExp = mTx
        .filter((t) => t.type === "EXPENSE" && !isInvoicePaymentTransaction(t))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      historyMonths.push({
        month: label,
        receitas: Math.round(mInc * 100) / 100,
        gastos: Math.round(mExp * 100) / 100,
      });
    }
  }

  console.log("[getDashboardOverviewData] Concluído:", {
    totalReceitas,
    totalGastos,
    categoryBreakdownCount: categoryBreakdown.length,
    monthlyHistory: historyMonths
  });

  return {
    totalReceitas,
    totalIncomes: totalReceitas,
    totalCreditExpenses,
    totalDebitExpenses,
    totalGastos,
    balanco,
    metasGlobaisPct,
    cards,
    goals,
    categoryBreakdown,
    monthlyHistory: historyMonths,
    upcomingBills: await getUpcomingCreditCardBills(userId),
  };
}

// ─── ACTIONS DE CONFIGURAÇÃO E CATEGORIAS ──────────────────────────

export async function getAllCategoriesAction() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" }
  });

  if (categories.length === 0) {
    return CATEGORIES.map((c) => ({
      id: c,
      name: c,
      color: getCategoryColor(c),
    }));
  }

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
  }));
}

export async function createCategoryAction(name: string, color?: string) {
  const finalColor = color || getCategoryColor(name);
  const created = await prisma.category.create({
    data: {
      name,
      color: finalColor,
    },
  });
  revalidatePath("/configuracoes");
  return { id: created.id, name: created.name, color: created.color };
}

export async function updateCategoryAction(id: string, name: string, color?: string) {
  const finalColor = color || getCategoryColor(name);
  try {
    const updated = await prisma.category.update({
      where: { id },
      data: { name, color: finalColor },
    });
    revalidatePath("/configuracoes");
    return { id: updated.id, name: updated.name, color: updated.color };
  } catch {
    return { id, name, color: finalColor };
  }
}

export async function deleteCategoryAction(id: string) {
  try {
    await prisma.category.delete({
      where: { id },
    });
    revalidatePath("/configuracoes");
  } catch {
    // Ignore error if it's virtual
  }
}

export async function exportTransactionsCSVAction() {
  const transactions = await prisma.transaction.findMany({
    where: { deletedAt: null },
    include: { wallet: true, category: true },
    orderBy: { date: "desc" },
  });

  const header = "ID,Data,Descricao,Tipo,Valor,Categoria,Conta_Cartao,Fonte\n";
  const rows = transactions.map((t) => {
    const dateStr = t.date.toISOString().split("T")[0];
    const desc = `"${t.description.replace(/"/g, '""')}"`;
    const type = t.type === "INCOME" ? "Entrada" : "Saída";
    const amount = Number(t.amount).toFixed(2);
    const category = `"${(t.category?.name || "Sem Categoria").replace(/"/g, '""')}"`;
    const wallet = `"${(t.wallet?.title || "Conta").replace(/"/g, '""')}"`;
    const source = t.source || "MANUAL";
    return `${t.id},${dateStr},${desc},${type},${amount},${category},${wallet},${source}`;
  });

  return header + rows.join("\n");
}

export async function getUserProfile() {
  let user = null;

  try {
    const userId = await getActiveUserId();
    user = await prisma.user.findUnique({
      where: { id: userId },
    });
  } catch {
    // Nenhum usuário no banco ainda
  }

  return {
    id: user?.id,
    name: user?.name || "Túlio Cavalcanti",
    email: user?.email || "kamaelcontatos@gmail.com",
  };
}

export async function updateUserProfile(name: string, email?: string) {
  const cleanEmail = email ? email.toLowerCase().trim() : undefined;
  const currentProfile = await getUserProfile();
  const userId = currentProfile.id || await getActiveUserId();

  // Verificar se o e-mail informado já pertence a OUTRO usuário
  if (cleanEmail) {
    const existingUserWithEmail = await prisma.user.findFirst({
      where: {
        email: cleanEmail,
        NOT: { id: userId },
      },
    });

    if (existingUserWithEmail) {
      throw new Error("Este endereço de e-mail já está em uso por outro usuário.");
    }
  }

  try {
    const updated = await prisma.user.upsert({
      where: { id: userId },
      update: { name, email: cleanEmail },
      create: { id: userId, name, email: cleanEmail },
    });

    revalidatePath("/");
    revalidatePath("/configuracoes");
    revalidatePath("/usuarios");

    return {
      success: true,
      name: updated.name || name,
      email: updated.email || cleanEmail,
    };
  } catch (error: any) {
    if (error?.code === "P2002") {
      throw new Error("Este e-mail já está cadastrado para outro usuário.");
    }
    throw new Error(error?.message || "Erro ao atualizar perfil.");
  }
}

// ─── INVESTIMENTOS ACTIONS ───────────────────────────────────────────────────

const db = prisma as any;

export type InvestmentItem = {
  id: string;
  titulo: string;
  categoria: string;
  data_inicial: string;
  valor_investido: number;
  valor_atual_bruto: number;
  taxas_acumuladas: number;
  imposto_estimado: number;
  status: "ATIVO" | "RESGATADO";
};

export async function getInvestmentsData() {
  let list = await db.investment.findMany({
    orderBy: { createdAt: "desc" }
  });

  // Se o banco estiver vazio, cria investimentos de demonstração
  if (list.length === 0) {
    const demoData = [
      {
        titulo: "CDB Banco Master 120% CDI",
        categoria: "Renda Fixa",
        dataInicial: new Date("2024-01-15"),
        valorInvestido: 10000.00,
        valorAtualBruto: 11450.00,
        taxasAcumuladas: 0.00,
        impostoEstimado: 326.25,
        status: "ATIVO"
      },
      {
        titulo: "Ações PETR4 - Petrobras",
        categoria: "Ações",
        dataInicial: new Date("2023-05-10"),
        valorInvestido: 5000.00,
        valorAtualBruto: 7200.00,
        taxasAcumuladas: 15.00,
        impostoEstimado: 330.00,
        status: "ATIVO"
      },
      {
        titulo: "FII HGLG11 - Logística",
        categoria: "Fundos Imobiliários",
        dataInicial: new Date("2023-09-01"),
        valorInvestido: 3500.00,
        valorAtualBruto: 3820.00,
        taxasAcumuladas: 0.00,
        impostoEstimado: 0.00,
        status: "ATIVO"
      },
      {
        titulo: "Tesouro Selic 2029",
        categoria: "Tesouro Direto",
        dataInicial: new Date("2024-02-01"),
        valorInvestido: 8000.00,
        valorAtualBruto: 8520.00,
        taxasAcumuladas: 12.00,
        impostoEstimado: 117.00,
        status: "ATIVO"
      }
    ];

    for (const item of demoData) {
      await db.investment.create({ data: item });
    }

    list = await db.investment.findMany({
      orderBy: { createdAt: "desc" }
    });
  }

  const investimentos: InvestmentItem[] = list.map((inv: any) => ({
    id: inv.id,
    titulo: inv.titulo,
    categoria: inv.categoria,
    data_inicial: inv.dataInicial.toISOString().split("T")[0],
    valor_investido: Number(inv.valorInvestido),
    valor_atual_bruto: Number(inv.valorAtualBruto),
    taxas_acumuladas: Number(inv.taxasAcumuladas),
    imposto_estimado: Number(inv.impostoEstimado),
    status: inv.status as "ATIVO" | "RESGATADO"
  }));

  const calcLiquido = (inv: InvestmentItem) =>
    inv.valor_atual_bruto - inv.imposto_estimado - inv.taxas_acumuladas;

  const calcRentPercent = (inv: InvestmentItem) => {
    const lucro = inv.valor_atual_bruto - inv.valor_investido;
    return inv.valor_investido > 0 ? (lucro / inv.valor_investido) * 100 : 0;
  };

  const ativos = investimentos.filter((inv: InvestmentItem) => inv.status === "ATIVO");

  let patrimonioInvestido = 0;
  let patrimonioBruto = 0;
  let patrimonioLiquido = 0;

  ativos.forEach((inv: InvestmentItem) => {
    patrimonioInvestido += inv.valor_investido;
    patrimonioBruto += inv.valor_atual_bruto;
    patrimonioLiquido += calcLiquido(inv);
  });

  const lucroTotal = patrimonioBruto - patrimonioInvestido;
  const rentabilidadeGeral = patrimonioInvestido > 0 ? (lucroTotal / patrimonioInvestido) * 100 : 0;

  // Destaques
  let destaques = null;
  if (ativos.length > 0) {
    let melhorRent = ativos[0];
    let piorRent = ativos[0];
    let maiorLucro = ativos[0];
    let menorLucro = ativos[0];

    ativos.forEach((inv: InvestmentItem) => {
      const rent = calcRentPercent(inv);
      const melhR = calcRentPercent(melhorRent);
      const piorR = calcRentPercent(piorRent);

      if (rent > melhR) melhorRent = inv;
      if (rent < piorR) piorRent = inv;

      const lucro = inv.valor_atual_bruto - inv.valor_investido;
      const maiL = maiorLucro.valor_atual_bruto - maiorLucro.valor_investido;
      const menL = menorLucro.valor_atual_bruto - menorLucro.valor_investido;

      if (lucro > maiL) maiorLucro = inv;
      if (lucro < menL) menorLucro = inv;
    });

    destaques = {
      melhorRentabilidade: {
        titulo: melhorRent.titulo,
        categoria: melhorRent.categoria,
        rentPercent: calcRentPercent(melhorRent),
        lucroRs: melhorRent.valor_atual_bruto - melhorRent.valor_investido,
        valor_atual_bruto: melhorRent.valor_atual_bruto
      },
      piorRentabilidade: {
        titulo: piorRent.titulo,
        categoria: piorRent.categoria,
        rentPercent: calcRentPercent(piorRent),
        lucroRs: piorRent.valor_atual_bruto - piorRent.valor_investido,
        valor_atual_bruto: piorRent.valor_atual_bruto
      },
      maiorLucroRs: {
        titulo: maiorLucro.titulo,
        categoria: maiorLucro.categoria,
        lucroRs: maiorLucro.valor_atual_bruto - maiorLucro.valor_investido,
        rentPercent: calcRentPercent(maiorLucro),
        valor_atual_bruto: maiorLucro.valor_atual_bruto
      },
      menorLucroRs: {
        titulo: menorLucro.titulo,
        categoria: menorLucro.categoria,
        lucroRs: menorLucro.valor_atual_bruto - menorLucro.valor_investido,
        rentPercent: calcRentPercent(menorLucro),
        valor_atual_bruto: menorLucro.valor_atual_bruto
      }
    };
  }

  return {
    investimentos,
    resumo: {
      patrimonioInvestido,
      patrimonioBruto,
      patrimonioLiquido,
      lucroTotal,
      rentabilidadeGeral
    },
    destaques
  };
}

export async function createInvestmentAction(data: {
  titulo: string;
  categoria: string;
  data_inicial: string;
  valor_investido: number;
  valor_atual_bruto: number;
  taxas_acumuladas?: number;
  imposto_estimado?: number;
}) {
  await db.investment.create({
    data: {
      titulo: data.titulo,
      categoria: data.categoria || "Renda Fixa",
      dataInicial: new Date(data.data_inicial),
      valorInvestido: data.valor_investido,
      valorAtualBruto: data.valor_atual_bruto,
      taxasAcumuladas: data.taxas_acumuladas || 0,
      impostoEstimado: data.imposto_estimado || 0,
      status: "ATIVO"
    }
  });
  revalidatePath("/investimentos");
  revalidatePath("/");
}

export async function updateInvestmentAction(id: string, data: {
  titulo: string;
  categoria: string;
  data_inicial: string;
  valor_investido: number;
  valor_atual_bruto: number;
  taxas_acumuladas?: number;
  imposto_estimado?: number;
  status?: string;
}) {
  await db.investment.update({
    where: { id },
    data: {
      titulo: data.titulo,
      categoria: data.categoria,
      dataInicial: new Date(data.data_inicial),
      valorInvestido: data.valor_investido,
      valorAtualBruto: data.valor_atual_bruto,
      taxasAcumuladas: data.taxas_acumuladas || 0,
      impostoEstimado: data.imposto_estimado || 0,
      status: data.status || "ATIVO"
    }
  });
  revalidatePath("/investimentos");
  revalidatePath("/");
}

export async function deleteInvestmentAction(id: string) {
  await db.investment.delete({ where: { id } });
  revalidatePath("/investimentos");
  revalidatePath("/");
}

export async function toggleInvestmentStatusAction(id: string, currentStatus: string) {
  const newStatus = currentStatus === "ATIVO" ? "RESGATADO" : "ATIVO";
  await db.investment.update({
    where: { id },
    data: { status: newStatus }
  });
  revalidatePath("/investimentos");
  revalidatePath("/");
}

// ─── RENDA VARIÁVEL ACTIONS ───────────────────────────────────────────────────

export type VariableAssetItem = {
  id: string;
  titulo: string;
  categoria: string;
  cotacaoAtual: number;
  dividendosRecebidos: number;
  quantidadeCotas: number;
  precoMedio: number;
  valorInvestidoLiquido: number;
  valorAtualBruto: number;
  lucroCotistas: number;
  lucroRealizadoVendas: number;
  lucroBruto: number;
  rentabilidade: number;
  status: "ABERTO" | "ENCERRADO";
  lotesAbertos: {
    id: string;
    loteNumero: number;
    data: string;
    quantidadeInicial: number;
    quantidadeRestante: number;
    precoUnitario: number;
    custoUnitarioComTaxas: number;
  }[];
  transacoes: {
    id: string;
    tipo: "COMPRA" | "VENDA";
    data: string;
    quantidade: number;
    precoUnitario: number;
    taxas: number;
    loteNumero?: number;
    loteOrigemId?: string;
    lucroRealizadoVenda?: number;
    lotesOrigemInfo?: string;
  }[];
};

export async function getVariableAssetsData() {
  let list = await db.variableAsset.findMany({
    include: { transacoes: { orderBy: { data: "asc" } } },
    orderBy: { createdAt: "desc" }
  });

  if (list.length === 0) {
    await db.variableAsset.create({
      data: {
        titulo: "PETR4",
        categoria: "Ação",
        cotacaoAtual: 36.00,
        dividendosRecebidos: 120.00,
        status: "ABERTO",
        transacoes: {
          create: [
            { tipo: "COMPRA", data: new Date("2023-05-10"), quantidade: 100, precoUnitario: 30.00, taxas: 5.00 },
            { tipo: "COMPRA", data: new Date("2023-08-15"), quantidade: 50, precoUnitario: 34.00, taxas: 2.50 }
          ]
        }
      }
    });

    await db.variableAsset.create({
      data: {
        titulo: "HGLG11",
        categoria: "FII",
        cotacaoAtual: 165.50,
        dividendosRecebidos: 350.00,
        status: "ABERTO",
        transacoes: {
          create: [
            { tipo: "COMPRA", data: new Date("2023-09-01"), quantidade: 30, precoUnitario: 158.00, taxas: 0.00 }
          ]
        }
      }
    });

    list = await db.variableAsset.findMany({
      include: { transacoes: { orderBy: { data: "asc" } } },
      orderBy: { createdAt: "desc" }
    });
  }

  const assets: VariableAssetItem[] = list.map((asset: any) => {
    type FifoLot = {
      id: string;
      loteNumero: number;
      data: Date;
      quantidadeInicial: number;
      quantidadeRestante: number;
      precoUnitario: number;
      custoUnitarioComTaxas: number;
    };

    const lots: FifoLot[] = [];
    let lucroRealizadoTotalVendas = 0;
    let custoTotalOriginalAportado = 0;
    let compraCounter = 0;

    const transacoesOrdenadas = [...asset.transacoes].sort(
      (a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime()
    );

    const processedTransactions = transacoesOrdenadas.map((t: any) => {
      const qtd = Number(t.quantidade);
      const preco = Number(t.precoUnitario);
      const taxas = Number(t.taxas);
      const dataStr = new Date(t.data).toISOString().split("T")[0];

      if (t.tipo === "COMPRA") {
        compraCounter++;
        const taxaUnit = qtd > 0 ? taxas / qtd : 0;
        const custoUnitarioComTaxas = preco + taxaUnit;
        custoTotalOriginalAportado += (qtd * preco) + taxas;

        lots.push({
          id: t.id,
          loteNumero: compraCounter,
          data: new Date(t.data),
          quantidadeInicial: qtd,
          quantidadeRestante: qtd,
          precoUnitario: preco,
          custoUnitarioComTaxas
        });

        return {
          id: t.id,
          tipo: "COMPRA" as const,
          data: dataStr,
          quantidade: qtd,
          precoUnitario: preco,
          taxas,
          loteNumero: compraCounter
        };
      } else {
        // VENDA: se houver loteOrigemId específico, abater dele; senão aplicar FIFO
        let qtdAbater = qtd;
        let lucroVenda = 0;
        const infoLotes: string[] = [];

        if (t.loteOrigemId) {
          const targetLot = lots.find(l => l.id === t.loteOrigemId);
          if (targetLot && targetLot.quantidadeRestante > 0) {
            const qtdDoLote = Math.min(qtdAbater, targetLot.quantidadeRestante);
            targetLot.quantidadeRestante -= qtdDoLote;
            qtdAbater -= qtdDoLote;

            const lucroDaCota = preco - targetLot.custoUnitarioComTaxas;
            lucroVenda += lucroDaCota * qtdDoLote;

            const parts = targetLot.data.toISOString().split("T")[0].split("-");
            const dateFmt = `${parts[2]}/${parts[1]}/${parts[0]}`;
            infoLotes.push(`${qtdDoLote} cotas do Lote #${targetLot.loteNumero} (${dateFmt})`);
          }
        }

        // Se sobrou quantidade não abatida do lote específico, abater do restante por FIFO
        if (qtdAbater > 0) {
          for (const lot of lots) {
            if (qtdAbater <= 0) break;
            if (lot.quantidadeRestante > 0) {
              const qtdDoLote = Math.min(qtdAbater, lot.quantidadeRestante);
              lot.quantidadeRestante -= qtdDoLote;
              qtdAbater -= qtdDoLote;

              const lucroDaCota = preco - lot.custoUnitarioComTaxas;
              lucroVenda += lucroDaCota * qtdDoLote;

              const parts = lot.data.toISOString().split("T")[0].split("-");
              const dateFmt = `${parts[2]}/${parts[1]}/${parts[0]}`;
              infoLotes.push(`${qtdDoLote} cotas do Lote #${lot.loteNumero} (${dateFmt})`);
            }
          }
        }

        // Abater taxas da venda
        lucroVenda -= taxas;
        lucroRealizadoTotalVendas += lucroVenda;

        return {
          id: t.id,
          tipo: "VENDA" as const,
          data: dataStr,
          quantidade: qtd,
          precoUnitario: preco,
          taxas,
          loteOrigemId: t.loteOrigemId,
          lucroRealizadoVenda: lucroVenda,
          lotesOrigemInfo: infoLotes.length > 0 ? infoLotes.join(" • ") : "Baixa de lote inicial"
        };
      }
    });

    let quantidadeCotas = 0;
    let valorInvestidoLiquido = 0;

    const lotesAbertos = lots
      .filter(l => l.quantidadeRestante > 0)
      .map(l => {
        quantidadeCotas += l.quantidadeRestante;
        valorInvestidoLiquido += l.quantidadeRestante * l.custoUnitarioComTaxas;

        return {
          id: l.id,
          loteNumero: l.loteNumero,
          data: l.data.toISOString().split("T")[0],
          quantidadeInicial: l.quantidadeInicial,
          quantidadeRestante: l.quantidadeRestante,
          precoUnitario: l.precoUnitario,
          custoUnitarioComTaxas: l.custoUnitarioComTaxas
        };
      });

    const cotacao = Number(asset.cotacaoAtual);
    const dividendos = Number(asset.dividendosRecebidos);
    const precoMedio = quantidadeCotas > 0 ? valorInvestidoLiquido / quantidadeCotas : 0;
    const valorAtualBruto = quantidadeCotas * cotacao;
    
    // Lucro não realizado das cotas mantidas
    const lucroCotasAbertas = valorAtualBruto - valorInvestidoLiquido;
    const lucroCotistas = lucroRealizadoTotalVendas + lucroCotasAbertas;
    const lucroTotal = lucroCotistas + dividendos;
    
    const baseInvestida = valorInvestidoLiquido > 0 ? valorInvestidoLiquido : custoTotalOriginalAportado;
    const rentabilidade = baseInvestida > 0 ? (lucroTotal / baseInvestida) * 100 : 0;

    let calculatedStatus: "ABERTO" | "ENCERRADO" = asset.status as any || "ABERTO";
    if (asset.transacoes.length > 0 && quantidadeCotas <= 0) {
      calculatedStatus = "ENCERRADO";
    }

    return {
      id: asset.id,
      titulo: asset.titulo,
      categoria: asset.categoria,
      cotacaoAtual: cotacao,
      dividendosRecebidos: dividendos,
      quantidadeCotas,
      precoMedio,
      valorInvestidoLiquido: quantidadeCotas > 0 ? valorInvestidoLiquido : 0,
      valorAtualBruto,
      lucroCotistas,
      lucroRealizadoVendas: lucroRealizadoTotalVendas,
      lucroBruto: lucroTotal,
      rentabilidade,
      status: calculatedStatus,
      lotesAbertos,
      transacoes: processedTransactions
    };
  });

  return assets;
}

export async function createVariableAssetAction(data: {
  titulo: string;
  categoria: string;
  cotacaoAtual: number;
  quantidadeInicial?: number;
  precoInicial?: number;
  dataInicial?: string;
}) {
  const asset = await db.variableAsset.create({
    data: {
      titulo: data.titulo.toUpperCase(),
      categoria: data.categoria || "Ação",
      cotacaoAtual: data.cotacaoAtual,
      dividendosRecebidos: 0,
      status: "ABERTO"
    }
  });

  if (data.quantidadeInicial && data.precoInicial && data.quantidadeInicial > 0) {
    await db.variableTransaction.create({
      data: {
        assetId: asset.id,
        tipo: "COMPRA",
        data: data.dataInicial ? new Date(data.dataInicial) : new Date(),
        quantidade: data.quantidadeInicial,
        precoUnitario: data.precoInicial,
        taxas: 0
      }
    });
  }

  revalidatePath("/investimentos");
}

export async function addVariableTransactionAction(assetId: string, data: {
  tipo: "COMPRA" | "VENDA";
  data: string;
  quantidade: number;
  precoUnitario: number;
  taxas?: number;
  loteOrigemId?: string;
}) {
  await db.variableTransaction.create({
    data: {
      assetId,
      tipo: data.tipo,
      data: new Date(data.data),
      quantidade: data.quantidade,
      precoUnitario: data.precoUnitario,
      taxas: data.taxas || 0,
      loteOrigemId: data.loteOrigemId || null
    }
  });

  // Verificar se após esta transação a quantidade zerou para atualizar o status do ciclo
  const asset = await db.variableAsset.findUnique({
    where: { id: assetId },
    include: { transacoes: true }
  });

  if (asset) {
    let qtd = 0;
    asset.transacoes.forEach((t: any) => {
      if (t.tipo === "COMPRA") qtd += t.quantidade;
      else if (t.tipo === "VENDA") qtd -= t.quantidade;
    });

    if (qtd <= 0) {
      await db.variableAsset.update({
        where: { id: assetId },
        data: { status: "ENCERRADO" }
      });
    } else if (asset.status === "ENCERRADO" && qtd > 0) {
      await db.variableAsset.update({
        where: { id: assetId },
        data: { status: "ABERTO" }
      });
    }
  }

  revalidatePath("/investimentos");
}

export async function updateVariableTransactionAction(txId: string, data: {
  tipo: "COMPRA" | "VENDA";
  data: string;
  quantidade: number;
  precoUnitario: number;
  taxas?: number;
  loteOrigemId?: string;
}) {
  const tx = await db.variableTransaction.update({
    where: { id: txId },
    data: {
      tipo: data.tipo,
      data: new Date(data.data),
      quantidade: data.quantidade,
      precoUnitario: data.precoUnitario,
      taxas: data.taxas || 0,
      loteOrigemId: data.loteOrigemId || null
    }
  });

  if (tx.assetId) {
    const asset = await db.variableAsset.findUnique({
      where: { id: tx.assetId },
      include: { transacoes: true }
    });
    if (asset) {
      let qtd = 0;
      asset.transacoes.forEach((t: any) => {
        if (t.tipo === "COMPRA") qtd += t.quantidade;
        else if (t.tipo === "VENDA") qtd -= t.quantidade;
      });
      if (qtd <= 0) {
        await db.variableAsset.update({ where: { id: tx.assetId }, data: { status: "ENCERRADO" } });
      } else if (asset.status === "ENCERRADO" && qtd > 0) {
        await db.variableAsset.update({ where: { id: tx.assetId }, data: { status: "ABERTO" } });
      }
    }
  }

  revalidatePath("/investimentos");
}

export async function updateFullVariableAssetAction(id: string, data: {
  titulo: string;
  categoria: string;
  cotacaoAtual: number;
  dividendosRecebidos: number;
  status?: string;
}) {
  await db.variableAsset.update({
    where: { id },
    data: {
      titulo: data.titulo.toUpperCase(),
      categoria: data.categoria,
      cotacaoAtual: data.cotacaoAtual,
      dividendosRecebidos: data.dividendosRecebidos,
      ...(data.status ? { status: data.status } : {})
    }
  });
  revalidatePath("/investimentos");
}

export async function updateVariableAssetCotacaoAction(id: string, cotacaoAtual: number, dividendosRecebidos?: number) {
  await db.variableAsset.update({
    where: { id },
    data: {
      cotacaoAtual,
      ...(dividendosRecebidos !== undefined ? { dividendosRecebidos } : {})
    }
  });
  revalidatePath("/investimentos");
}


export async function deleteVariableTransactionAction(txId: string) {
  const tx = await db.variableTransaction.delete({
    where: { id: txId }
  });

  if (tx.assetId) {
    const asset = await db.variableAsset.findUnique({
      where: { id: tx.assetId },
      include: { transacoes: true }
    });
    if (asset) {
      let qtd = 0;
      asset.transacoes.forEach((t: any) => {
        if (t.tipo === "COMPRA") qtd += t.quantidade;
        else if (t.tipo === "VENDA") qtd -= t.quantidade;
      });
      if (qtd <= 0 && asset.transacoes.length > 0) {
        await db.variableAsset.update({ where: { id: tx.assetId }, data: { status: "ENCERRADO" } });
      } else if (asset.status === "ENCERRADO" && qtd > 0) {
        await db.variableAsset.update({ where: { id: tx.assetId }, data: { status: "ABERTO" } });
      }
    }
  }

  revalidatePath("/investimentos");
}

export async function toggleVariableAssetStatusAction(id: string, currentStatus: string) {
  const newStatus = currentStatus === "ABERTO" ? "ENCERRADO" : "ABERTO";
  await db.variableAsset.update({
    where: { id },
    data: { status: newStatus }
  });
  revalidatePath("/investimentos");
}

export async function deleteVariableAssetAction(id: string) {
  await db.variableAsset.delete({ where: { id } });
  revalidatePath("/investimentos");
}


// ─── CRIPTOMOEDAS ACTIONS ────────────────────────────────────────────────────

export type CryptoAssetItem = {
  id: string;
  token: string;
  nome: string;
  cotacaoAtual: number;
  quantidadeMoedas: number;
  precoMedio: number;
  custoTotalInvestido: number;
  valorAtualBruto: number;
  lucroRealizadoVendas: number;
  lucroReal: number;
  rentabilidade: number;
  status: "ABERTO" | "ENCERRADO";
  lotesAbertos: {
    id: string;
    loteNumero: number;
    data: string;
    quantidadeInicial: number;
    quantidadeRestante: number;
    precoUnitario: number;
    custoUnitarioComTaxas: number;
  }[];
  transacoes: {
    id: string;
    tipo: "COMPRA" | "VENDA";
    data: string;
    quantidade: number;
    precoUnitario: number;
    taxas: number;
    loteNumero?: number;
    loteOrigemId?: string;
    lucroRealizadoVenda?: number;
    lotesOrigemInfo?: string;
  }[];
};

export async function getCryptoAssetsData() {
  let list = await db.cryptoAsset.findMany({
    include: { transacoes: { orderBy: { data: "asc" } } },
    orderBy: { createdAt: "desc" }
  });

  if (list.length === 0) {
    await db.cryptoAsset.create({
      data: {
        token: "BTC",
        nome: "Bitcoin",
        cotacaoAtual: 340000.00,
        status: "ABERTO",
        transacoes: {
          create: [
            { tipo: "COMPRA", data: new Date("2023-05-10"), quantidade: 0.05, precoUnitario: 300000.00, taxas: 50.00 }
          ]
        }
      }
    });

    await db.cryptoAsset.create({
      data: {
        token: "ETH",
        nome: "Ethereum",
        cotacaoAtual: 16500.00,
        status: "ABERTO",
        transacoes: {
          create: [
            { tipo: "COMPRA", data: new Date("2023-08-15"), quantidade: 0.8, precoUnitario: 12500.00, taxas: 20.00 }
          ]
        }
      }
    });

    list = await db.cryptoAsset.findMany({
      include: { transacoes: { orderBy: { data: "asc" } } },
      orderBy: { createdAt: "desc" }
    });
  }

  const cryptos: CryptoAssetItem[] = list.map((c: any) => {
    type FifoLot = {
      id: string;
      loteNumero: number;
      data: Date;
      quantidadeInicial: number;
      quantidadeRestante: number;
      precoUnitario: number;
      custoUnitarioComTaxas: number;
    };

    const lots: FifoLot[] = [];
    let lucroRealizadoTotalVendas = 0;
    let custoTotalOriginalAportado = 0;
    let compraCounter = 0;

    const transacoesOrdenadas = [...c.transacoes].sort(
      (a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime()
    );

    const processedTransactions = transacoesOrdenadas.map((t: any) => {
      const qtd = Number(t.quantidade);
      const preco = Number(t.precoUnitario);
      const taxas = Number(t.taxas);
      const dataStr = new Date(t.data).toISOString().split("T")[0];

      if (t.tipo === "COMPRA") {
        compraCounter++;
        const taxaUnit = qtd > 0 ? taxas / qtd : 0;
        const custoUnitarioComTaxas = preco + taxaUnit;
        custoTotalOriginalAportado += (qtd * preco) + taxas;

        lots.push({
          id: t.id,
          loteNumero: compraCounter,
          data: new Date(t.data),
          quantidadeInicial: qtd,
          quantidadeRestante: qtd,
          precoUnitario: preco,
          custoUnitarioComTaxas
        });

        return {
          id: t.id,
          tipo: "COMPRA" as const,
          data: dataStr,
          quantidade: qtd,
          precoUnitario: preco,
          taxas,
          loteNumero: compraCounter
        };
      } else {
        let qtdAbater = qtd;
        let lucroVenda = 0;
        const infoLotes: string[] = [];

        if (t.loteOrigemId) {
          const targetLot = lots.find(l => l.id === t.loteOrigemId);
          if (targetLot && targetLot.quantidadeRestante > 0) {
            const qtdDoLote = Math.min(qtdAbater, targetLot.quantidadeRestante);
            targetLot.quantidadeRestante -= qtdDoLote;
            qtdAbater -= qtdDoLote;

            const lucroDaCota = preco - targetLot.custoUnitarioComTaxas;
            lucroVenda += lucroDaCota * qtdDoLote;

            const parts = targetLot.data.toISOString().split("T")[0].split("-");
            const dateFmt = `${parts[2]}/${parts[1]}/${parts[0]}`;
            infoLotes.push(`${qtdDoLote} moedas do Lote #${targetLot.loteNumero} (${dateFmt})`);
          }
        }

        if (qtdAbater > 0) {
          for (const lot of lots) {
            if (qtdAbater <= 0) break;
            if (lot.quantidadeRestante > 0) {
              const qtdDoLote = Math.min(qtdAbater, lot.quantidadeRestante);
              lot.quantidadeRestante -= qtdDoLote;
              qtdAbater -= qtdDoLote;

              const lucroDaCota = preco - lot.custoUnitarioComTaxas;
              lucroVenda += lucroDaCota * qtdDoLote;

              const parts = lot.data.toISOString().split("T")[0].split("-");
              const dateFmt = `${parts[2]}/${parts[1]}/${parts[0]}`;
              infoLotes.push(`${qtdDoLote} moedas do Lote #${lot.loteNumero} (${dateFmt})`);
            }
          }
        }

        lucroVenda -= taxas;
        lucroRealizadoTotalVendas += lucroVenda;

        return {
          id: t.id,
          tipo: "VENDA" as const,
          data: dataStr,
          quantidade: qtd,
          precoUnitario: preco,
          taxas,
          loteOrigemId: t.loteOrigemId,
          lucroRealizadoVenda: lucroVenda,
          lotesOrigemInfo: infoLotes.length > 0 ? infoLotes.join(" • ") : "Baixa de lote inicial"
        };
      }
    });

    let quantidadeMoedas = 0;
    let custoTotalInvestido = 0;

    const lotesAbertos = lots
      .filter(l => l.quantidadeRestante > 0)
      .map(l => {
        quantidadeMoedas += l.quantidadeRestante;
        custoTotalInvestido += l.quantidadeRestante * l.custoUnitarioComTaxas;

        return {
          id: l.id,
          loteNumero: l.loteNumero,
          data: l.data.toISOString().split("T")[0],
          quantidadeInicial: l.quantidadeInicial,
          quantidadeRestante: l.quantidadeRestante,
          precoUnitario: l.precoUnitario,
          custoUnitarioComTaxas: l.custoUnitarioComTaxas
        };
      });

    const cotacao = Number(c.cotacaoAtual);
    const precoMedio = quantidadeMoedas > 0 ? custoTotalInvestido / quantidadeMoedas : 0;
    const valorAtualBruto = quantidadeMoedas * cotacao;

    const lucroMoedasAbertas = valorAtualBruto - custoTotalInvestido;
    const lucroReal = lucroRealizadoTotalVendas + lucroMoedasAbertas;

    const baseInvestida = custoTotalInvestido > 0 ? custoTotalInvestido : custoTotalOriginalAportado;
    const rentabilidade = baseInvestida > 0 ? (lucroReal / baseInvestida) * 100 : 0;

    let calculatedStatus: "ABERTO" | "ENCERRADO" = c.status as any || "ABERTO";
    if (c.transacoes.length > 0 && quantidadeMoedas <= 0) {
      calculatedStatus = "ENCERRADO";
    }

    return {
      id: c.id,
      token: c.token,
      nome: c.nome,
      cotacaoAtual: cotacao,
      quantidadeMoedas,
      precoMedio,
      custoTotalInvestido: quantidadeMoedas > 0 ? custoTotalInvestido : 0,
      valorAtualBruto,
      lucroRealizadoVendas: lucroRealizadoTotalVendas,
      lucroReal,
      rentabilidade,
      status: calculatedStatus,
      lotesAbertos,
      transacoes: processedTransactions
    };
  });

  return cryptos;
}

export async function createCryptoAssetAction(data: {
  token: string;
  nome: string;
  cotacaoAtual: number;
  quantidadeInicial?: number;
  precoInicial?: number;
  dataInicial?: string;
}) {
  const crypto = await db.cryptoAsset.create({
    data: {
      token: data.token.toUpperCase(),
      nome: data.nome,
      cotacaoAtual: data.cotacaoAtual,
      status: "ABERTO"
    }
  });

  if (data.quantidadeInicial && data.precoInicial && data.quantidadeInicial > 0) {
    await db.cryptoTransaction.create({
      data: {
        cryptoId: crypto.id,
        tipo: "COMPRA",
        data: data.dataInicial ? new Date(data.dataInicial) : new Date(),
        quantidade: data.quantidadeInicial,
        precoUnitario: data.precoInicial,
        taxas: 0
      }
    });
  }

  revalidatePath("/investimentos");
}

export async function addCryptoTransactionAction(cryptoId: string, data: {
  tipo: "COMPRA" | "VENDA";
  data: string;
  quantidade: number;
  precoUnitario: number;
  taxas?: number;
  loteOrigemId?: string;
}) {
  await db.cryptoTransaction.create({
    data: {
      cryptoId,
      tipo: data.tipo,
      data: new Date(data.data),
      quantidade: data.quantidade,
      precoUnitario: data.precoUnitario,
      taxas: data.taxas || 0,
      loteOrigemId: data.loteOrigemId || null
    }
  });

  const crypto = await db.cryptoAsset.findUnique({
    where: { id: cryptoId },
    include: { transacoes: true }
  });

  if (crypto) {
    let qtd = 0;
    crypto.transacoes.forEach((t: any) => {
      if (t.tipo === "COMPRA") qtd += Number(t.quantidade);
      else if (t.tipo === "VENDA") qtd -= Number(t.quantidade);
    });

    if (qtd <= 0) {
      await db.cryptoAsset.update({ where: { id: cryptoId }, data: { status: "ENCERRADO" } });
    } else if (crypto.status === "ENCERRADO" && qtd > 0) {
      await db.cryptoAsset.update({ where: { id: cryptoId }, data: { status: "ABERTO" } });
    }
  }

  revalidatePath("/investimentos");
}

export async function updateCryptoTransactionAction(txId: string, data: {
  tipo: "COMPRA" | "VENDA";
  data: string;
  quantidade: number;
  precoUnitario: number;
  taxas?: number;
  loteOrigemId?: string;
}) {
  const tx = await db.cryptoTransaction.update({
    where: { id: txId },
    data: {
      tipo: data.tipo,
      data: new Date(data.data),
      quantidade: data.quantidade,
      precoUnitario: data.precoUnitario,
      taxas: data.taxas || 0,
      loteOrigemId: data.loteOrigemId || null
    }
  });

  if (tx.cryptoId) {
    const crypto = await db.cryptoAsset.findUnique({
      where: { id: tx.cryptoId },
      include: { transacoes: true }
    });
    if (crypto) {
      let qtd = 0;
      crypto.transacoes.forEach((t: any) => {
        if (t.tipo === "COMPRA") qtd += Number(t.quantidade);
        else if (t.tipo === "VENDA") qtd -= Number(t.quantidade);
      });
      if (qtd <= 0 && crypto.transacoes.length > 0) {
        await db.cryptoAsset.update({ where: { id: tx.cryptoId }, data: { status: "ENCERRADO" } });
      } else if (crypto.status === "ENCERRADO" && qtd > 0) {
        await db.cryptoAsset.update({ where: { id: tx.cryptoId }, data: { status: "ABERTO" } });
      }
    }
  }

  revalidatePath("/investimentos");
}

export async function deleteCryptoTransactionAction(txId: string) {
  const tx = await db.cryptoTransaction.delete({ where: { id: txId } });

  if (tx.cryptoId) {
    const crypto = await db.cryptoAsset.findUnique({
      where: { id: tx.cryptoId },
      include: { transacoes: true }
    });
    if (crypto) {
      let qtd = 0;
      crypto.transacoes.forEach((t: any) => {
        if (t.tipo === "COMPRA") qtd += Number(t.quantidade);
        else if (t.tipo === "VENDA") qtd -= Number(t.quantidade);
      });
      if (qtd <= 0 && crypto.transacoes.length > 0) {
        await db.cryptoAsset.update({ where: { id: tx.cryptoId }, data: { status: "ENCERRADO" } });
      } else if (crypto.status === "ENCERRADO" && qtd > 0) {
        await db.cryptoAsset.update({ where: { id: tx.cryptoId }, data: { status: "ABERTO" } });
      }
    }
  }

  revalidatePath("/investimentos");
}

export async function updateFullCryptoAssetAction(id: string, data: {
  token: string;
  nome: string;
  cotacaoAtual: number;
  status?: string;
  quantidadeAjustada?: number;
  custoTotalAjustado?: number;
}) {
  // Update core asset fields
  await db.cryptoAsset.update({
    where: { id },
    data: {
      token: data.token.toUpperCase(),
      nome: data.nome,
      cotacaoAtual: data.cotacaoAtual,
      ...(data.status ? { status: data.status } : {})
    }
  });

  // If user provided manual quantity/cost overrides, adjust the FIRST COMPRA transaction
  // so that downstream FIFO recalculation reflects the correct preço médio and lucro.
  if (data.quantidadeAjustada !== undefined && data.custoTotalAjustado !== undefined &&
      data.quantidadeAjustada > 0 && data.custoTotalAjustado >= 0) {
    const asset = await db.cryptoAsset.findUnique({
      where: { id },
      include: { transacoes: { orderBy: { data: "asc" } } }
    });

    if (asset && asset.transacoes.length > 0) {
      const firstCompra = (asset.transacoes as any[]).find((t: any) => t.tipo === "COMPRA");
      if (firstCompra) {
        const novoPrecoUnitario = data.quantidadeAjustada > 0
          ? data.custoTotalAjustado / data.quantidadeAjustada
          : Number(firstCompra.precoUnitario);

        await db.cryptoTransaction.update({
          where: { id: firstCompra.id },
          data: {
            quantidade: data.quantidadeAjustada,
            precoUnitario: novoPrecoUnitario,
            taxas: 0  // taxas embutidas no custoTotal
          }
        });
      }
    }
  }

  revalidatePath("/investimentos");
}

export async function updateCryptoAssetCotacaoAction(id: string, cotacaoAtual: number) {
  await db.cryptoAsset.update({
    where: { id },
    data: { cotacaoAtual }
  });
  revalidatePath("/investimentos");
}

export async function deleteCryptoAssetAction(id: string) {
  await db.cryptoAsset.delete({ where: { id } });
  revalidatePath("/investimentos");
}


// ─── APOSTAS & BANCAS ACTIONS ────────────────────────────────────────────────

export type BettingAccountItem = {
  id: string;
  nomePlataforma: string;
  saldoAtualBruto: number;
  totalDepositado: number;
  totalSacado: number;
  lucroReal: number;
  movimentacoes: {
    id: string;
    tipo: "DEPOSITO" | "SAQUE";
    data: string;
    valor: number;
  }[];
};

export async function getBettingAccountsData() {
  let list = await db.bettingAccount.findMany({
    include: { movimentacoes: { orderBy: { data: "desc" } } },
    orderBy: { createdAt: "desc" }
  });

  if (list.length === 0) {
    await db.bettingAccount.create({
      data: {
        nomePlataforma: "Betano",
        saldoAtualBruto: 450.00,
        movimentacoes: {
          create: [
            { tipo: "DEPOSITO", data: new Date("2026-01-01"), valor: 100.00 },
            { tipo: "DEPOSITO", data: new Date("2026-01-15"), valor: 200.00 },
            { tipo: "SAQUE", data: new Date("2026-02-10"), valor: 150.00 }
          ]
        }
      }
    });

    await db.bettingAccount.create({
      data: {
        nomePlataforma: "Bet365",
        saldoAtualBruto: 1200.00,
        movimentacoes: {
          create: [
            { tipo: "DEPOSITO", data: new Date("2026-02-01"), valor: 800.00 },
            { tipo: "SAQUE", data: new Date("2026-03-01"), valor: 300.00 }
          ]
        }
      }
    });

    list = await db.bettingAccount.findMany({
      include: { movimentacoes: { orderBy: { data: "desc" } } },
      orderBy: { createdAt: "desc" }
    });
  }

  const accounts: BettingAccountItem[] = list.map((acc: any) => {
    let totalDepositado = 0;
    let totalSacado = 0;

    acc.movimentacoes.forEach((m: any) => {
      const val = Number(m.valor);
      if (m.tipo === "DEPOSITO") totalDepositado += val;
      if (m.tipo === "SAQUE") totalSacado += val;
    });

    const saldoAtual = Number(acc.saldoAtualBruto);
    const lucroReal = (saldoAtual + totalSacado) - totalDepositado;

    return {
      id: acc.id,
      nomePlataforma: acc.nomePlataforma,
      saldoAtualBruto: saldoAtual,
      totalDepositado,
      totalSacado,
      lucroReal,
      movimentacoes: acc.movimentacoes.map((m: any) => ({
        id: m.id,
        tipo: m.tipo as "DEPOSITO" | "SAQUE",
        data: new Date(m.data).toISOString().split("T")[0],
        valor: Number(m.valor)
      }))
    };
  });

  return accounts;
}

export async function createBettingAccountAction(data: {
  nomePlataforma: string;
  saldoAtualBruto: number;
  depositoInicial?: number;
}) {
  const acc = await db.bettingAccount.create({
    data: {
      nomePlataforma: data.nomePlataforma,
      saldoAtualBruto: data.saldoAtualBruto
    }
  });

  if (data.depositoInicial && data.depositoInicial > 0) {
    await db.bettingTransaction.create({
      data: {
        accountId: acc.id,
        tipo: "DEPOSITO",
        data: new Date(),
        valor: data.depositoInicial
      }
    });
  }

  revalidatePath("/investimentos");
}

export async function addBettingTransactionAction(accountId: string, data: {
  tipo: "DEPOSITO" | "SAQUE";
  valor: number;
  data: string;
  atualizarSaldoBanca?: boolean;
}) {
  await db.bettingTransaction.create({
    data: {
      accountId,
      tipo: data.tipo,
      data: new Date(data.data),
      valor: data.valor
    }
  });

  if (data.atualizarSaldoBanca) {
    const acc = await db.bettingAccount.findUnique({ where: { id: accountId } });
    if (acc) {
      const current = Number(acc.saldoAtualBruto);
      const nextSaldo = data.tipo === "DEPOSITO" ? current + data.valor : Math.max(0, current - data.valor);
      await db.bettingAccount.update({
        where: { id: accountId },
        data: { saldoAtualBruto: nextSaldo }
      });
    }
  }

  revalidatePath("/investimentos");
}

export async function updateBettingAccountSaldoAction(id: string, saldoAtualBruto: number) {
  await db.bettingAccount.update({
    where: { id },
    data: { saldoAtualBruto }
  });
  revalidatePath("/investimentos");
}

export async function deleteBettingAccountAction(id: string) {
  await db.bettingAccount.delete({ where: { id } });
  revalidatePath("/investimentos");
}

export async function deleteBettingTransactionAction(txId: string) {
  await db.bettingTransaction.delete({ where: { id: txId } });
  revalidatePath("/investimentos");
}

export async function updateBettingTransactionAction(txId: string, data: {
  tipo: "DEPOSITO" | "SAQUE";
  valor: number;
  data: string;
}) {
  await db.bettingTransaction.update({
    where: { id: txId },
    data: {
      tipo: data.tipo,
      valor: data.valor,
      data: new Date(data.data)
    }
  });
  revalidatePath("/investimentos");
}

// ─── OUTROS INVESTIMENTOS ACTIONS ─────────────────────────────────────────────

export type OtherInvestmentItem = {
  id: string;
  nome: string;
  data: string;
  totalInvestido: number;
  taxaImposto: number;
  totalSaque: number;
  lucroReal: number;
  lucroPorcentagem: number;
};

export async function getOtherInvestmentsData(): Promise<OtherInvestmentItem[]> {
  const list = await db.otherInvestment.findMany({
    orderBy: { createdAt: "desc" }
  });

  return list.map((item: any) => {
    const totalInvestido = Number(item.totalInvestido || 0);
    const taxaImposto = Number(item.taxaImposto || 0);
    const totalSaque = Number(item.totalSaque || 0);

    // O cálculo de lucro só é ativado se houver saque realizado (totalSaque > 0)
    const hasSaque = totalSaque > 0;
    const lucroReal = hasSaque ? (totalSaque - totalInvestido - taxaImposto) : 0;
    const lucroPorcentagem = (hasSaque && totalInvestido > 0) ? (lucroReal / totalInvestido) * 100 : 0;

    return {
      id: item.id,
      nome: item.nome || "",
      data: item.data ? new Date(item.data).toISOString().split("T")[0] : "",
      totalInvestido,
      taxaImposto,
      totalSaque,
      lucroReal,
      lucroPorcentagem
    };
  });
}

export async function createOtherInvestmentAction(data: {
  nome: string;
  data?: string;
  totalInvestido?: number;
  taxaImposto?: number;
  totalSaque?: number;
}) {
  await db.otherInvestment.create({
    data: {
      nome: data.nome || "Novo Investimento",
      data: data.data ? new Date(data.data) : null,
      totalInvestido: data.totalInvestido || 0,
      taxaImposto: data.taxaImposto || 0,
      totalSaque: data.totalSaque || 0
    }
  });

  revalidatePath("/investimentos");
}

export async function updateOtherInvestmentAction(id: string, data: {
  nome: string;
  data?: string;
  totalInvestido?: number;
  taxaImposto?: number;
  totalSaque?: number;
}) {
  await db.otherInvestment.update({
    where: { id },
    data: {
      nome: data.nome || "",
      data: data.data ? new Date(data.data) : null,
      totalInvestido: data.totalInvestido || 0,
      taxaImposto: data.taxaImposto || 0,
      totalSaque: data.totalSaque || 0
    }
  });

  revalidatePath("/investimentos");
}

export async function deleteOtherInvestmentAction(id: string) {
  await db.otherInvestment.delete({ where: { id } });
  revalidatePath("/investimentos");
}

// ─── VISÃO GERAL CONSOLIDADA ───────────────────────────────────────────────────

export async function getConsolidatedInvestmentsOverview() {
  const rendaFixa = await getInvestmentsData();
  const rendaVariavel = await getVariableAssetsData();
  const cripto = await getCryptoAssetsData();
  const apostas = await getBettingAccountsData();
  const outros = await getOtherInvestmentsData();

  // Renda Fixa
  const rfBruto = rendaFixa.resumo.patrimonioBruto;
  const rfLiquido = rendaFixa.resumo.patrimonioLiquido;
  const rfInvestido = rendaFixa.resumo.patrimonioInvestido;
  const rfLucro = rendaFixa.resumo.lucroTotal;

  // Renda Variável
  let rvBruto = 0;
  let rvInvestido = 0;
  let rvLucro = 0;
  rendaVariavel.forEach((a: VariableAssetItem) => {
    rvBruto += a.valorAtualBruto;
    rvInvestido += a.valorInvestidoLiquido;
    rvLucro += a.lucroBruto;
  });

  // Cripto
  let criptoBruto = 0;
  let criptoInvestido = 0;
  let criptoLucro = 0;
  cripto.forEach((c: CryptoAssetItem) => {
    criptoBruto += c.valorAtualBruto;
    criptoInvestido += c.custoTotalInvestido;
    criptoLucro += c.lucroReal;
  });

  // Apostas / Bancas
  let apostasSaldoBruto = 0;
  let apostasDepositado = 0;
  let apostasSacado = 0;
  let apostasLucro = 0;
  apostas.forEach((b: BettingAccountItem) => {
    apostasSaldoBruto += b.saldoAtualBruto;
    apostasDepositado += b.totalDepositado;
    apostasSacado += b.totalSacado;
    apostasLucro += b.lucroReal;
  });

  // Outros Investimentos
  let outrosInvestido = 0;
  let outrosSaque = 0;
  let outrosTaxas = 0;
  let outrosLucro = 0;
  let outrosValorAtual = 0;
  outros.forEach((o: OtherInvestmentItem) => {
    outrosInvestido += o.totalInvestido;
    outrosSaque += o.totalSaque;
    outrosTaxas += o.taxaImposto;
    outrosLucro += o.lucroReal;
    // Se o saque for 0, o ativo continua em andamento (valoriza pelo investido)
    outrosValorAtual += o.totalSaque > 0 ? o.totalSaque : o.totalInvestido;
  });

  // Consolidados Totais
  const patrimonioBruto = rfBruto + rvBruto + criptoBruto + apostasSaldoBruto + outrosValorAtual;
  const patrimonioLiquido = rfLiquido + rvBruto + criptoBruto + apostasSaldoBruto + outrosValorAtual;
  const totalInvestido = rfInvestido + rvInvestido + criptoInvestido + apostasDepositado + outrosInvestido;
  const lucroTotal = rfLucro + rvLucro + criptoLucro + apostasLucro + outrosLucro;
  const rentabilidadeGeral = totalInvestido > 0 ? (lucroTotal / totalInvestido) * 100 : 0;

  // Alocação Percentual para o Gráfico Donut/Pizza
  const donutRaw = [
    { name: "Renda Fixa", value: rfBruto, color: "#6366F1" },
    { name: "Ações & FIIs", value: rvBruto, color: "#EC4899" },
    { name: "Criptomoedas", value: criptoBruto, color: "#F59E0B" },
    { name: "Apostas / Bankroll", value: apostasSaldoBruto, color: "#10B981" },
    { name: "Outros Patrimônios", value: outrosValorAtual, color: "#3B82F6" },
  ];

  const allocationDonutData = donutRaw
    .filter(item => item.value > 0)
    .map(item => ({
      ...item,
      pct: patrimonioBruto > 0 ? Math.round((item.value / patrimonioBruto) * 1000) / 10 : 0
    }));

  return {
    patrimonioBruto,
    patrimonioLiquido,
    totalInvestido,
    lucroTotal,
    rentabilidadeGeral,
    allocationDonutData,
    categorias: {
      rendaFixa: { bruto: rfBruto, liquido: rfLiquido, investido: rfInvestido, lucro: rfLucro, qtd: rendaFixa.investimentos.length },
      rendaVariavel: { bruto: rvBruto, investido: rvInvestido, lucro: rvLucro, qtd: rendaVariavel.length },
      cripto: { bruto: criptoBruto, investido: criptoInvestido, lucro: criptoLucro, qtd: cripto.length },
      apostas: { saldoBruto: apostasSaldoBruto, depositado: apostasDepositado, sacado: apostasSacado, lucro: apostasLucro, qtd: apostas.length },
      outros: { investido: outrosInvestido, saque: outrosSaque, taxas: outrosTaxas, lucro: outrosLucro, qtd: outros.length }
    }
  };
}

export async function getMonthlyNetWorthEvolution(year: number = new Date().getFullYear()) {
  const userId = await getActiveUserId();
  const overview = await getConsolidatedInvestmentsOverview();
  const totalInvestmentsNow = overview.patrimonioLiquido;

  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const timeline: Array<{
    monthLabel: string;
    month: number;
    year: number;
    contas: number;
    investimentos: number;
    passivos: number;
    patrimonioLiquido: number;
  }> = [];

  const wallets = await prisma.wallet.findMany({ where: { userId } });
  const nonCreditWallets = wallets.filter(w => w.walletType !== "CREDIT_CARD");

  for (let m = 1; m <= 12; m++) {
    const endOfMonthDate = new Date(Date.UTC(year, m, 0, 23, 59, 59, 999));

    // Saldo acumulado em Contas Correntes até o final do mês m
    let contasBalance = nonCreditWallets.reduce((acc, w) => acc + Number(w.initialBalance || 0), 0);
    const txUntilMonth = await prisma.transaction.findMany({
      where: {
        wallet: { userId, walletType: { not: "CREDIT_CARD" } },
        date: { lte: endOfMonthDate },
        status: "COMPLETED",
        deletedAt: null
      }
    });

    for (const t of txUntilMonth) {
      if (t.type === "INCOME") contasBalance += Number(t.amount);
      else if (t.type === "EXPENSE") contasBalance -= Number(t.amount);
    }

    // Faturas pendentes/passivos no final do mês m
    const pendingExpensesMonth = await prisma.transaction.findMany({
      where: {
        wallet: { userId },
        type: "EXPENSE",
        status: "PENDING",
        deletedAt: null,
        date: { lte: endOfMonthDate }
      }
    });
    const passivos = pendingExpensesMonth.reduce((s, t) => s + Number(t.amount), 0);

    const netWorthMonth = Math.max(0, contasBalance + totalInvestmentsNow - passivos);

    timeline.push({
      monthLabel: `${monthNames[m - 1]}/${String(year).slice(-2)}`,
      month: m,
      year,
      contas: Math.max(0, Math.round(contasBalance * 100) / 100),
      investimentos: Math.max(0, Math.round(totalInvestmentsNow * 100) / 100),
      passivos: Math.max(0, Math.round(passivos * 100) / 100),
      patrimonioLiquido: Math.round(netWorthMonth * 100) / 100,
    });
  }

  return timeline;
}

// ─── 1. PROJEÇÃO DE SALDO FUTURO (30 / 60 DIAS) ─────────────────────────────────

export async function getFutureBalanceProjection(days: 30 | 60 = 30) {
  const userId = await getActiveUserId();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const wallets = await prisma.wallet.findMany({
    where: { userId }
  });

  const nonCreditWallets = wallets.filter(w => w.walletType !== "CREDIT_CARD");

  // 1. Saldo Atual (Hoje): Somente transações CONCLUÍDAS até a data de hoje
  let startingBalance = nonCreditWallets.reduce((acc, w) => acc + Number(w.initialBalance || 0), 0);

  const completedTxUntilToday = await prisma.transaction.findMany({
    where: {
      wallet: { userId, walletType: { not: "CREDIT_CARD" } },
      date: { lte: todayEnd },
      status: "COMPLETED",
      deletedAt: null
    }
  });

  for (const t of completedTxUntilToday) {
    if (t.type === "INCOME") {
      startingBalance += Number(t.amount);
    } else if (t.type === "EXPENSE") {
      startingBalance -= Number(t.amount);
    }
  }

  // 2. Transações Futuras ou Pendentes para a Projeção (próximos N dias)
  const futureEndDate = new Date(todayEnd);
  futureEndDate.setDate(futureEndDate.getDate() + days);

  // Entradas Previstas: Receitas pendentes ou futuras no período (exclui cartão e benefícios)
  const futureIncomes = await prisma.transaction.findMany({
    where: {
      wallet: { 
        userId, 
        walletType: { 
          notIn: ["CREDIT_CARD", "TICKET", "BENEFICIO", "BENEFÍCIO", "ticket", "beneficio", "benefício", "Ticket", "Benefício", "Beneficio"] 
        } 
      },
      type: "INCOME",
      deletedAt: null,
      OR: [
        { date: { gt: todayEnd, lte: futureEndDate } },
        { status: "PENDING", date: { lte: futureEndDate } }
      ]
    }
  });

  // Saídas Previstas: Estritamente despesas com status Não Pago (PENDING / Contas a pagar em aberto)
  const unpaidExpenses = await prisma.transaction.findMany({
    where: {
      wallet: { userId, walletType: { not: "CREDIT_CARD" } },
      type: "EXPENSE",
      status: "PENDING",
      deletedAt: null,
      date: { lte: futureEndDate }
    }
  });

  const todayStr = today.toISOString().split("T")[0];
  const dailyIncomeMap: Record<string, number> = {};
  const dailyExpenseMap: Record<string, number> = {};

  for (const t of futureIncomes) {
    let dStr = t.date.toISOString().split("T")[0];
    if (dStr < todayStr) dStr = todayStr;
    const val = Number(t.amount);
    dailyIncomeMap[dStr] = (dailyIncomeMap[dStr] || 0) + val;
  }

  for (const t of unpaidExpenses) {
    let dStr = t.date.toISOString().split("T")[0];
    if (dStr < todayStr) dStr = todayStr;
    const val = Number(t.amount);
    dailyExpenseMap[dStr] = (dailyExpenseMap[dStr] || 0) + val;
  }

  const timeline: Array<{
    date: string;
    label: string;
    projectedBalance: number;
    income: number;
    expense: number;
  }> = [];

  let runningBalance = startingBalance;
  let totalFutureIncome = 0;
  let totalFutureExpense = 0;

  for (let i = 0; i <= days; i++) {
    const curDate = new Date(today);
    curDate.setDate(curDate.getDate() + i);

    const dStr = curDate.toISOString().split("T")[0];
    const dayIncome = dailyIncomeMap[dStr] || 0;
    const dayExpense = dailyExpenseMap[dStr] || 0;

    runningBalance += dayIncome - dayExpense;
    totalFutureIncome += dayIncome;
    totalFutureExpense += dayExpense;

    const dayNum = String(curDate.getDate()).padStart(2, "0");
    const monthNum = String(curDate.getMonth() + 1).padStart(2, "0");

    timeline.push({
      date: dStr,
      label: `${dayNum}/${monthNum}`,
      projectedBalance: runningBalance,
      income: dayIncome,
      expense: dayExpense
    });
  }

  return {
    days,
    currentBalance: startingBalance,
    projectedFinalBalance: runningBalance,
    totalFutureIncome,
    totalFutureExpense,
    timeline
  };
}

// ─── 2. CONCILIAÇÃO BANCÁRIA POR ARQUIVO (.OFX) ───────────────────────────────

export type OFXItem = {
  id: string;
  trntype: string;
  dtposted: string;
  trnamt: number;
  memo: string;
  matchStatus: "MATCHED" | "UNMATCHED" | "ALREADY_CLEARED";
  matchedTransactionId?: string;
  matchedDescription?: string;
};

export async function processOFXImport(walletId: string, ofxContent: string): Promise<OFXItem[]> {
  const trnRegex = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|$)/gi;
  let match;
  const rawItems: Array<{ trntype: string; dtposted: string; trnamt: number; memo: string; fitid: string }> = [];

  while ((match = trnRegex.exec(ofxContent)) !== null) {
    const block = match[1];
    const typeMatch = block.match(/<TRNTYPE>([^<\r\n]+)/i);
    const dateMatch = block.match(/<DTPOSTED>([^<\r\n]+)/i);
    const amtMatch = block.match(/<TRNAMT>([^<\r\n]+)/i);
    const fitidMatch = block.match(/<FITID>([^<\r\n]+)/i);
    const memoMatch = block.match(/<MEMO>([^<\r\n]+)/i) || block.match(/<NAME>([^<\r\n]+)/i);

    if (amtMatch && dateMatch) {
      const trnamt = parseFloat(amtMatch[1].trim());
      const rawDateStr = dateMatch[1].trim();
      const year = rawDateStr.substring(0, 4);
      const month = rawDateStr.substring(4, 6);
      const day = rawDateStr.substring(6, 8);
      const dtposted = `${year}-${month}-${day}`;
      const memo = memoMatch ? memoMatch[1].trim() : "Transação OFX";
      const fitid = fitidMatch ? fitidMatch[1].trim() : `${dtposted}-${Math.random().toString(36).substring(2, 7)}`;
      const trntype = typeMatch ? typeMatch[1].trim() : (trnamt < 0 ? "DEBIT" : "CREDIT");

      rawItems.push({ trntype, dtposted, trnamt, memo, fitid });
    }
  }

  const dbTransactions = await prisma.transaction.findMany({
    where: {
      walletId,
      deletedAt: null
    }
  });

  const parsedResults: OFXItem[] = [];

  for (const item of rawItems) {
    const ofxAbsAmt = Math.abs(item.trnamt);
    const ofxDateObj = new Date(item.dtposted);

    const matched = dbTransactions.find(t => {
      const dbAbsAmt = Math.abs(Number(t.amount));
      if (Math.abs(dbAbsAmt - ofxAbsAmt) > 0.05) return false;

      const dbDateObj = new Date(t.date.toISOString().split("T")[0]);
      const diffDays = Math.abs((dbDateObj.getTime() - ofxDateObj.getTime()) / (1000 * 3600 * 24));
      return diffDays <= 4;
    });

    let matchStatus: "MATCHED" | "UNMATCHED" | "ALREADY_CLEARED" = "UNMATCHED";
    let matchedTransactionId: string | undefined = undefined;
    let matchedDescription: string | undefined = undefined;

    if (matched) {
      matchedTransactionId = matched.id;
      matchedDescription = matched.description;
      if (matched.status === "COMPLETED" || matched.status === "PAID") {
        matchStatus = "ALREADY_CLEARED";
      } else {
        matchStatus = "MATCHED";
      }
    }

    parsedResults.push({
      id: item.fitid,
      trntype: item.trntype,
      dtposted: item.dtposted,
      trnamt: item.trnamt,
      memo: item.memo,
      matchStatus,
      matchedTransactionId,
      matchedDescription
    });
  }

  return parsedResults;
}

export async function bulkClearTransactions(transactionIds: string[]) {
  if (!transactionIds.length) return;
  await prisma.transaction.updateMany({
    where: { id: { in: transactionIds } },
    data: { status: "COMPLETED" }
  });
  revalidatePath("/dashboard");
  revalidatePath("/despesas");
  revalidatePath("/cartoes");
}

export async function createTransactionFromOFX(
  walletId: string,
  description: string,
  amount: number,
  dateStr: string,
  type: "INCOME" | "EXPENSE",
  categoryName?: string,
  tags?: string
) {
  let categoryId: string | undefined = undefined;
  if (categoryName) {
    let cat = await prisma.category.findFirst({ where: { name: categoryName } });
    if (!cat) {
      cat = await prisma.category.create({ data: { name: categoryName, color: getCategoryColor(categoryName) } });
    }
    categoryId = cat.id;
  }

  const newTx = await prisma.transaction.create({
    data: {
      walletId,
      categoryId,
      description,
      type,
      amount,
      date: new Date(dateStr),
      status: "COMPLETED",
      source: "OFX_IMPORT",
      tags: tags || null
    } as any
  });

  revalidatePath("/dashboard");
  revalidatePath("/despesas");
  revalidatePath("/cartoes");
  return newTx;
}

// ─── 4. TAGS E CENTRO DE CUSTOS ───────────────────────────────────────────────

export async function getAllTags() {
  const userId = await getActiveUserId();
  const txs = await prisma.transaction.findMany({
    where: {
      wallet: { userId },
      deletedAt: null
    }
  });

  const tagSet = new Set<string>();
  for (const t of txs) {
    const rawTags = (t as any).tags;
    if (rawTags) {
      const splitted = String(rawTags)
        .split(/[,;\s]+/)
        .map((s: string) => s.trim())
        .filter(Boolean);
      for (const tag of splitted) {
        const formatted = tag.startsWith("#") ? tag : `#${tag}`;
        tagSet.add(formatted);
      }
    }
  }

  return Array.from(tagSet).sort();
}

// ─── 5. EXPURGO / LIMPEZA DE ASSINATURAS DO BANCO DE DADOS ───────────────────

export async function purgeSubscriptionsDataAction() {
  const terms = ["Futvolei", "Internet", "Google IA"];

  let totalDeletedTx = 0;
  let totalDeletedSubs = 0;

  for (const term of terms) {
    const deletedTx = await prisma.transaction.deleteMany({
      where: {
        description: {
          contains: term,
          mode: "insensitive"
        }
      }
    });
    totalDeletedTx += deletedTx.count;

    const deletedSubs = await (prisma as any).subscription.deleteMany({
      where: {
        name: {
          contains: term,
          mode: "insensitive"
        }
      }
    });
    totalDeletedSubs += deletedSubs.count;
  }

  revalidatePath("/cartoes");
  revalidatePath("/despesas");
  revalidatePath("/dashboard");

  return {
    success: true,
    deletedTransactions: totalDeletedTx,
    deletedSubscriptions: totalDeletedSubs
  };
}

export async function getPaymentHistoryData(month: number, year: number) {
  const userId = await getActiveUserId();

  const wallets = await prisma.wallet.findMany({
    where: { userId },
    orderBy: { title: "asc" },
  });

  const monthName = getMonthName(month);
  const periodStr = `${monthName}/${year}`;

  const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const endOfMonth   = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const monthTransactions = await prisma.transaction.findMany({
    where: {
      wallet: { userId },
      date: { gte: startOfMonth, lte: endOfMonth },
      deletedAt: null,
    },
    include: { category: true },
  });

  const allPaidInvoices = await (prisma as any).invoicePayment.findMany({
    where: {
      wallet: { userId },
      month,
      year,
    },
  });
  const paidWalletIds = new Set(allPaidInvoices.map((p: any) => p.walletId));

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear  = month === 1 ? year - 1 : year;
  const startOfPrevMonth = new Date(Date.UTC(prevYear, prevMonth - 1, 1, 0, 0, 0));
  const endOfPrevMonth   = new Date(Date.UTC(prevYear, prevMonth, 0, 23, 59, 59, 999));

  const prevMonthTransactions = await prisma.transaction.findMany({
    where: {
      wallet: { userId },
      date: { gte: startOfPrevMonth, lte: endOfPrevMonth },
      deletedAt: null,
    },
  });

  let totalCreditPaid = 0;
  let totalDebitPix = 0;
  let totalTickets = 0;

  const historyItems: Array<{
    id: string;
    accountName: string;
    bankName: string;
    walletType: string;
    typeLabel: string;
    periodRef: string;
    amount: number;
    paidAmount?: number;
    pendingAmount?: number;
    status: "PAGO" | "AGUARDANDO PAGAMENTO" | "LIQUIDADO" | "AGUARDANDO LIQUIDAÇÃO" | "CONCLUÍDO" | "ZERADO";
    statusColor: "emerald" | "amber" | "slate";
    detailsUrl: string;
    cardBrand?: string;
    lastDigits?: string;
    holder?: string;
  }> = [];

  const cardsOverview = await getAllCardsOverview(month, year);
  const cardsOverviewMap = new Map(cardsOverview.map(c => [c.id, c]));

  for (const w of wallets) {
    const isCredit = w.walletType === "CREDIT_CARD";
    const isTicket = w.walletType === "TICKET";

    if (isCredit) {
      const wOverview = cardsOverviewMap.get(w.id);
      const invoiceAmount = wOverview ? wOverview.faturaAtual : 0;
      const isInvoicePaid = wOverview ? !!wOverview.isPaid : paidWalletIds.has(w.id);

      if (isInvoicePaid) {
        totalCreditPaid += invoiceAmount;
      }

      historyItems.push({
        id: w.id,
        accountName: w.title || w.bankName || "Cartão de Crédito",
        bankName: w.bankName || "Cartão de Crédito",
        walletType: "CREDIT_CARD",
        typeLabel: "Cartão de Crédito",
        periodRef: periodStr,
        amount: invoiceAmount,
        paidAmount: isInvoicePaid ? invoiceAmount : 0,
        pendingAmount: isInvoicePaid ? 0 : invoiceAmount,
        status: isInvoicePaid ? "PAGO" : invoiceAmount <= 0 ? "ZERADO" : "AGUARDANDO PAGAMENTO",
        statusColor: isInvoicePaid ? "emerald" : invoiceAmount <= 0 ? "slate" : "amber",
        detailsUrl: `/cartoes/${w.id}`,
        cardBrand: wOverview?.cardBrand || (w as any).cardBrand || undefined,
        lastDigits: wOverview?.lastDigits || (w as any).lastDigits || undefined,
        holder: wOverview?.holder || (w as any).holder || undefined,
      });
    } else if (isTicket) {
      const ticketExpensesList = monthTransactions
        .filter(t => t.walletId === w.id && t.type === "EXPENSE");

      const tExpensesPaid = ticketExpensesList
        .filter(t => t.status !== "PENDING")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const tExpensesPending = ticketExpensesList
        .filter(t => t.status === "PENDING")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const tExpensesTotal = tExpensesPaid + tExpensesPending;

      totalTickets += tExpensesPaid;

      const hasPending = tExpensesPending > 0;

      historyItems.push({
        id: w.id,
        accountName: w.title || w.bankName || "Benefício / Ticket",
        bankName: w.bankName || "Vale Refeição / Benefício",
        walletType: "TICKET",
        typeLabel: "Cartão Benefício / Ticket",
        periodRef: periodStr,
        amount: tExpensesTotal,
        paidAmount: tExpensesPaid,
        pendingAmount: tExpensesPending,
        status: tExpensesTotal <= 0 ? "ZERADO" : (hasPending ? "AGUARDANDO LIQUIDAÇÃO" : "CONCLUÍDO"),
        statusColor: tExpensesTotal <= 0 ? "slate" : (hasPending ? "amber" : "emerald"),
        detailsUrl: `/cartoes/${w.id}`,
        holder: (w as any).holder || undefined,
      });
    } else {
      // CONTA DÉBITO / PIX / CONTA CORRENTE
      const wExpensesList = monthTransactions
        .filter(t => t.walletId === w.id && t.type === "EXPENSE");

      const wExpensesPaid = wExpensesList
        .filter(t => t.status !== "PENDING")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const wExpensesPending = wExpensesList
        .filter(t => t.status === "PENDING")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const wExpensesTotal = wExpensesPaid + wExpensesPending;

      // O card do topo (Total Gastos Débito/PIX) só deve somar o que já foi baixado / liquidado!
      totalDebitPix += wExpensesPaid;

      const hasPending = wExpensesPending > 0;

      historyItems.push({
        id: w.id,
        accountName: w.title || w.bankName || "Conta Corrente",
        bankName: w.bankName || "Conta Corrente",
        walletType: "CONTA_CORRENTE",
        typeLabel: "Conta Débito / PIX",
        periodRef: periodStr,
        amount: wExpensesTotal,
        paidAmount: wExpensesPaid,
        pendingAmount: wExpensesPending,
        status: wExpensesTotal <= 0 ? "ZERADO" : (hasPending ? "AGUARDANDO LIQUIDAÇÃO" : "LIQUIDADO"),
        statusColor: wExpensesTotal <= 0 ? "slate" : (hasPending ? "amber" : "emerald"),
        detailsUrl: `/cartoes/${w.id}`,
        holder: (w as any).holder || undefined,
      });
    }
  }

  const totalGeral = totalCreditPaid + totalDebitPix + totalTickets;

  let prevCreditPaid = 0;
  try {
    const prevPaidInvoices = await (prisma as any).invoicePayment.findMany({
      where: { wallet: { userId }, month: prevMonth, year: prevYear },
    });
    prevCreditPaid = prevPaidInvoices.reduce((s: number, p: any) => s + Number(p.amount), 0);
  } catch (e) {}

  const prevDebitPix = prevMonthTransactions
    .filter(t => {
      const w = wallets.find(wall => wall.id === t.walletId);
      return w?.walletType === "CONTA_CORRENTE" && t.type === "EXPENSE" && t.status !== "PENDING";
    })
    .reduce((s, t) => s + Number(t.amount), 0);

  const prevTickets = prevMonthTransactions
    .filter(t => {
      const w = wallets.find(wall => wall.id === t.walletId);
      return w?.walletType === "TICKET" && t.type === "EXPENSE" && t.status !== "PENDING";
    })
    .reduce((s, t) => s + Number(t.amount), 0);

  const prevTotal = prevCreditPaid + prevDebitPix + prevTickets;

  let economyInsight = "";
  let economyPct = 0;
  let isEconomyPositive = true;

  if (prevTotal > 0) {
    const diff = totalGeral - prevTotal;
    economyPct = Math.abs(Math.round((diff / prevTotal) * 100));
    if (diff < 0) {
      isEconomyPositive = true;
      economyInsight = `Economia de ${economyPct}% em relação a ${getMonthName(prevMonth)}. Ótimo controle de saída!`;
    } else if (diff > 0) {
      isEconomyPositive = false;
      economyInsight = `Aumento de ${economyPct}% em relação a ${getMonthName(prevMonth)}. Monitore despesas variáveis.`;
    } else {
      economyInsight = `Mesmo volume de gastos totais de ${getMonthName(prevMonth)}. Padrão mantido.`;
    }
  } else {
    economyInsight = `Acompanhe seus lançamentos mensais para gerar comparativos automáticos de economia.`;
  }

  return {
    periodStr,
    month,
    year,
    metrics: {
      totalCreditPaid,
      totalDebitPix,
      totalGeral,
      economyInsight,
      economyPct,
      isEconomyPositive,
      prevTotal,
    },
    items: historyItems,
  };
}


