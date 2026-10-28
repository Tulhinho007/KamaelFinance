"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { extractCategoryAndNotes, detectCategory } from "./planning-utils";

const db = prisma as any;

import { getActiveUserId } from "@/lib/actions";

export async function getEventProjects() {
  const userId = await getActiveUserId();
  if (!userId) return [];

  const projects = await db.eventProject.findMany({
    where: { userId },
    include: {
      items: {
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return projects.map((p: any) => ({
    id: p.id,
    title: p.title,
    dateStr: p.dateStr || "",
    startDate: p.startDate ? p.startDate.toISOString().split("T")[0] : null,
    endDate: p.endDate ? p.endDate.toISOString().split("T")[0] : null,
    status: p.status || "Em Planejamento",
    notes: p.notes || "",
    checklist: p.checklist || null,
    items: (p.items || []).map((i: any) => {
      const { category: savedCat, cleanNotes } = extractCategoryAndNotes(i.notes || "");
      const category = savedCat || detectCategory(i.description, i.notes || "");
      return {
        id: i.id,
        description: i.description,
        minAmount: i.minAmount ? Number(i.minAmount) : null,
        maxAmount: Number(i.maxAmount),
        paidAmount: Number(i.paidAmount || 0),
        isPaid: Boolean(i.isPaid),
        notes: cleanNotes,
        rawNotes: i.notes || "",
        category,
        transactionId: i.transactionId || null,
      };
    })
  }));
}

export async function createEventProjectAction(data: {
  title: string;
  dateStr?: string;
  startDate?: string | null;
  endDate?: string | null;
  status?: string;
  notes?: string;
  checklist?: any;
}) {
  const userId = await getActiveUserId();

  const project = await db.eventProject.create({
    data: {
      userId,
      title: data.title,
      dateStr: data.dateStr || "",
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      status: data.status || "Em Planejamento",
      notes: data.notes || "",
      checklist: data.checklist || null,
    } as any
  });

  revalidatePath("/planejamento");
  return project;
}

export async function updateEventProjectAction(
  id: string,
  data: {
    title?: string;
    dateStr?: string;
    startDate?: string | null;
    endDate?: string | null;
    status?: string;
    notes?: string;
    checklist?: any;
  }
) {
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.dateStr !== undefined) updateData.dateStr = data.dateStr;
  if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
  if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.checklist !== undefined) updateData.checklist = data.checklist;

  const updated = await db.eventProject.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/planejamento");
  return updated;
}

export async function updateEventProjectChecklistAction(id: string, checklist: any[]) {
  const updated = await db.eventProject.update({
    where: { id },
    data: { checklist } as any,
  });

  revalidatePath("/planejamento");
  return updated;
}

export async function toggleEventProjectStatusAction(id: string) {
  const project = await db.eventProject.findUnique({ where: { id } });
  if (!project) throw new Error("Projeto não encontrado.");

  const isCompleted = project.status === "COMPLETED" || project.status === "Concluído";
  const newStatus = isCompleted ? "Em Planejamento" : "COMPLETED";

  const updated = await db.eventProject.update({
    where: { id },
    data: { status: newStatus },
  });

  revalidatePath("/planejamento");
  return updated;
}

export async function deleteEventProjectAction(id: string) {
  await db.eventProject.delete({
    where: { id },
  });

  revalidatePath("/planejamento");
}

export async function createEventItemAction(
  projectId: string,
  data: {
    description: string;
    minAmount?: number | null;
    maxAmount: number;
    paidAmount?: number | null;
    isPaid?: boolean;
    notes?: string;
    category?: string;
  }
) {
  const isPaid = data.isPaid || false;
  const paidVal = isPaid ? (data.paidAmount ?? data.maxAmount) : (data.paidAmount ?? 0);
  let finalNotes = (data.notes || "").trim();
  if (data.category && data.category.trim()) {
    finalNotes = finalNotes ? `${finalNotes} [cat:${data.category.trim()}]` : `[cat:${data.category.trim()}]`;
  }

  const item = await db.eventItem.create({
    data: {
      projectId,
      description: data.description,
      minAmount: data.minAmount || null,
      maxAmount: data.maxAmount,
      paidAmount: paidVal,
      isPaid,
      notes: finalNotes,
    }
  });

  revalidatePath("/planejamento");
  return item;
}

export async function updateEventItemAction(
  id: string,
  data: {
    description?: string;
    minAmount?: number | null;
    maxAmount?: number;
    paidAmount?: number | null;
    isPaid?: boolean;
    notes?: string | null;
    category?: string;
  }
) {
  const item = await db.eventItem.findUnique({ where: { id } });
  if (!item) throw new Error("Item não encontrado");

  const updateData: any = {};
  if (data.description !== undefined) updateData.description = data.description;
  if (data.minAmount !== undefined) updateData.minAmount = data.minAmount;
  if (data.maxAmount !== undefined) updateData.maxAmount = data.maxAmount;

  if (data.notes !== undefined || data.category !== undefined) {
    let baseNotes = data.notes !== undefined ? (data.notes || "") : (item.notes || "");
    // Remove qualquer tag [cat:...] existente
    baseNotes = baseNotes.replace(/\[cat:[^\]]+\]/gi, "").trim();
    const catToSave = data.category !== undefined ? data.category.trim() : "";
    if (catToSave) {
      baseNotes = baseNotes ? `${baseNotes} [cat:${catToSave}]` : `[cat:${catToSave}]`;
    }
    updateData.notes = baseNotes;
  }

  if (data.isPaid !== undefined) {
    updateData.isPaid = data.isPaid;
    // Ao MARCAR como pago: define paidAmount se ainda não tiver valor
    if (data.isPaid && data.paidAmount === undefined) {
      const currentPaid = Number(item.paidAmount);
      if (currentPaid <= 0) {
        updateData.paidAmount = Number(item.maxAmount);
      }
      // Se já há paidAmount salvo, preserva-o
    }
    // Ao DESMARCAR como pago: paidAmount é PRESERVADO (não zeramos)
  } else if (data.paidAmount !== undefined) {
    updateData.paidAmount = data.paidAmount;
  }

  const updated = await db.eventItem.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/planejamento");
  return updated;
}

export async function deleteEventItemAction(id: string) {
  await db.eventItem.delete({
    where: { id }
  });

  revalidatePath("/planejamento");
}

export async function toggleItemPaidAction(id: string) {
  const current = await db.eventItem.findUnique({
    where: { id },
    select: { isPaid: true, maxAmount: true, paidAmount: true }
  });

  if (!current) throw new Error("Item não encontrado");

  const nextPaidState = !current.isPaid;
  const updateData: any = { isPaid: nextPaidState };

  // Ao MARCAR como pago: se não houver paidAmount, usa o maxAmount como padrão
  // Ao DESMARCAR como pago: paidAmount é PRESERVADO (não zeramos)
  if (nextPaidState && Number(current.paidAmount) <= 0) {
    updateData.paidAmount = Number(current.maxAmount);
  }

  const updated = await db.eventItem.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/planejamento");
  return updated;
}

export async function convertItemToExpenseAction(
  itemId: string,
  walletId: string,
  categoryName?: string,
  customDate?: string,
  actualPaidAmount?: number,
  installmentsCount?: number
) {
  const userId = await getActiveUserId();
  if (!userId) throw new Error("Não autorizado: Sessão de usuário inválida.");

  const item = await db.eventItem.findFirst({
    where: { id: itemId, project: { userId } },
    include: { project: true }
  });

  if (!item) throw new Error("Item de planejamento não encontrado ou não pertence ao usuário");

  const targetWallet = await prisma.wallet.findFirst({ where: { id: walletId, userId } });
  if (!targetWallet) throw new Error("Carteira não encontrada ou não pertence ao usuário autenticado.");

  let categoryId: string | undefined = undefined;

  if (categoryName) {
    const cat = await prisma.category.findFirst({
      where: { name: { contains: categoryName, mode: "insensitive" } }
    });
    if (cat) categoryId = cat.id;
  }

  const txDate = customDate ? new Date(customDate) : new Date();

  const finalPaid = actualPaidAmount && actualPaidAmount > 0 
    ? actualPaidAmount 
    : (Number(item.paidAmount) > 0 ? Number(item.paidAmount) : Number(item.maxAmount));

  const numInstallments = installmentsCount && installmentsCount > 1 ? installmentsCount : 1;
  const projectTag = `#${item.project.title.toLowerCase().replace(/\s+/g, "")}`;
  const baseDescription = `[${item.project.title}] ${item.description}`;

  let firstTransactionId: string | null = null;

  if (numInstallments > 1) {
    const groupId = crypto.randomUUID();
    const baseInstallment = Math.floor((finalPaid / numInstallments) * 100) / 100;
    const remainder = Math.round((finalPaid - baseInstallment * numInstallments) * 100) / 100;

    const transactionsData = [];
    for (let i = 1; i <= numInstallments; i++) {
      const instDate = new Date(txDate);
      instDate.setMonth(instDate.getMonth() + (i - 1));

      const instAmount = i === 1 ? baseInstallment + remainder : baseInstallment;
      const instDesc = `${baseDescription} (${i}/${numInstallments})`;

      transactionsData.push({
        userId,
        walletId,
        categoryId,
        description: instDesc,
        type: "EXPENSE" as const,
        amount: instAmount,
        installmentsCount: numInstallments,
        currentInstallment: i,
        installmentGroupId: groupId,
        date: instDate,
        source: "PLANNING",
        status: "COMPLETED",
        tags: projectTag,
      });
    }

    const createdTxs = await Promise.all(
      transactionsData.map(tx => (prisma.transaction as any).create({ data: tx }))
    );
    firstTransactionId = createdTxs[0]?.id || null;
  } else {
    const transaction = await (prisma.transaction as any).create({
      data: {
        userId,
        walletId,
        categoryId,
        description: baseDescription,
        type: "EXPENSE",
        amount: finalPaid,
        installmentsCount: 1,
        date: txDate,
        source: "PLANNING",
        status: "COMPLETED",
        tags: projectTag,
      }
    });
    firstTransactionId = transaction.id;
  }

  // Se a carteira for conta bancária corrente / débito / investimento / ticket (não cartão de crédito), debita automaticamente do saldo
  if (targetWallet && targetWallet.walletType !== "CREDIT_CARD") {
    await prisma.wallet.update({
      where: { id: walletId },
      data: { currentBalance: { decrement: finalPaid } } as any,
    }).catch(err => console.error("Erro ao decrementar saldo da conta:", err));
  }

  await db.eventItem.update({
    where: { id: itemId },
    data: {
      isPaid: true,
      paidAmount: finalPaid,
      transactionId: firstTransactionId
    }
  });

  revalidatePath("/planejamento");
  revalidatePath("/despesas");
  revalidatePath("/cartoes");
  revalidatePath("/dashboard");
  revalidatePath("/contas");
  revalidatePath("/extrato");
  revalidatePath("/transacoes");

  return { success: true };
}
