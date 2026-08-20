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

export async function getEventProjects() {
  const userId = await getActiveUserId();

  let projects = await db.eventProject.findMany({
    where: { userId },
    include: {
      items: {
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  // Se o usuário não tiver nenhum projeto de planejamento, criamos um projeto demonstrativo
  if (projects.length === 0) {
    const sampleProject = await db.eventProject.create({
      data: {
        userId,
        title: "Viagem Imaginelegend",
        dateStr: "26/10/2026 a 28/10/2026",
        startDate: new Date("2026-10-26T00:00:00Z"),
        endDate: new Date("2026-10-28T00:00:00Z"),
        status: "Em Planejamento",
        notes: "Roteiro de viagem para o festival Imaginelegend 2026.\n\n- Passagens de ônibus leito garantidas\n- Check-in no hotel a partir das 14h\n- Documentos necessários: RG ou CNH atualizada e voucher de reserva",
        items: {
          create: [
            {
              description: "Ingresso do Festival (Pass VIP)",
              minAmount: 350.00,
              maxAmount: 450.00,
              paidAmount: 450.00,
              isPaid: true,
              notes: "Ingresso antecipado garantido"
            },
            {
              description: "Passagem de Ônibus (Ida e Volta)",
              minAmount: 120.00,
              maxAmount: 180.00,
              paidAmount: 0,
              isPaid: false,
              notes: "Empresa Cometa - Saída da Rodoviária"
            },
            {
              description: "Hotel 3 Diárias (Quarto Duplo)",
              minAmount: 400.00,
              maxAmount: 550.00,
              paidAmount: 0,
              isPaid: false,
              notes: "Reserva com cancelamento grátis até 5 dias antes"
            },
            {
              description: "Alimentação & Gastos Locais",
              minAmount: 200.00,
              maxAmount: 300.00,
              paidAmount: 0,
              isPaid: false,
              notes: "Estimativa de R$ 100/dia para alimentação"
            }
          ]
        }
      },
      include: {
        items: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    projects = [sampleProject];
  }

  return projects.map((p: any) => ({
    id: p.id,
    title: p.title,
    dateStr: p.dateStr || "",
    startDate: p.startDate ? p.startDate.toISOString().split("T")[0] : null,
    endDate: p.endDate ? p.endDate.toISOString().split("T")[0] : null,
    status: p.status || "Em Planejamento",
    notes: p.notes || "",
    items: (p.items || []).map((i: any) => ({
      id: i.id,
      description: i.description,
      minAmount: i.minAmount ? Number(i.minAmount) : null,
      maxAmount: Number(i.maxAmount),
      paidAmount: Number(i.paidAmount || 0),
      isPaid: Boolean(i.isPaid),
      notes: i.notes || "",
      transactionId: i.transactionId || null,
    }))
  }));
}

export async function createEventProjectAction(data: {
  title: string;
  dateStr?: string;
  startDate?: string | null;
  endDate?: string | null;
  status?: string;
  notes?: string;
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
    }
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
  }
) {
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.dateStr !== undefined) updateData.dateStr = data.dateStr;
  if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
  if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.notes !== undefined) updateData.notes = data.notes;

  const updated = await db.eventProject.update({
    where: { id },
    data: updateData,
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
  }
) {
  const isPaid = data.isPaid || false;
  const paidVal = isPaid ? (data.paidAmount ?? data.maxAmount) : (data.paidAmount ?? 0);

  const item = await db.eventItem.create({
    data: {
      projectId,
      description: data.description,
      minAmount: data.minAmount || null,
      maxAmount: data.maxAmount,
      paidAmount: paidVal,
      isPaid,
      notes: data.notes || "",
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
  }
) {
  const item = await db.eventItem.findUnique({ where: { id } });
  if (!item) throw new Error("Item não encontrado");

  const updateData: any = {};
  if (data.description !== undefined) updateData.description = data.description;
  if (data.minAmount !== undefined) updateData.minAmount = data.minAmount;
  if (data.maxAmount !== undefined) updateData.maxAmount = data.maxAmount;
  if (data.notes !== undefined) updateData.notes = data.notes;

  if (data.isPaid !== undefined) {
    updateData.isPaid = data.isPaid;
    if (data.isPaid) {
      const targetMax = data.maxAmount ?? Number(item.maxAmount);
      updateData.paidAmount = data.paidAmount !== undefined && data.paidAmount !== null && data.paidAmount > 0 
        ? data.paidAmount 
        : (Number(item.paidAmount) > 0 ? Number(item.paidAmount) : targetMax);
    } else {
      updateData.paidAmount = 0;
    }
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

export async function toggleItemPaidAction(id: string, customPaidAmount?: number) {
  const current = await db.eventItem.findUnique({
    where: { id },
    select: { isPaid: true, maxAmount: true, paidAmount: true }
  });

  if (!current) throw new Error("Item não encontrado");

  const nextPaidState = !current.isPaid;
  let newPaidAmount = 0;

  if (nextPaidState) {
    if (customPaidAmount !== undefined && customPaidAmount > 0) {
      newPaidAmount = customPaidAmount;
    } else if (Number(current.paidAmount) > 0) {
      newPaidAmount = Number(current.paidAmount);
    } else {
      newPaidAmount = Number(current.maxAmount);
    }
  }

  const updated = await db.eventItem.update({
    where: { id },
    data: {
      isPaid: nextPaidState,
      paidAmount: newPaidAmount,
    }
  });

  revalidatePath("/planejamento");
  return updated;
}

export async function convertItemToExpenseAction(
  itemId: string,
  walletId: string,
  categoryName?: string,
  customDate?: string,
  actualPaidAmount?: number
) {
  const item = await db.eventItem.findUnique({
    where: { id: itemId },
    include: { project: true }
  });

  if (!item) throw new Error("Item de planejamento não encontrado");

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

  const transaction = await prisma.transaction.create({
    data: {
      walletId,
      categoryId,
      description: `[${item.project.title}] ${item.description}`,
      type: "EXPENSE",
      amount: finalPaid,
      date: txDate,
      source: "PLANNING",
      status: "COMPLETED",
      tags: `#${item.project.title.toLowerCase().replace(/\s+/g, "")}`,
    }
  });

  await db.eventItem.update({
    where: { id: itemId },
    data: {
      isPaid: true,
      paidAmount: finalPaid,
      transactionId: transaction.id
    }
  });

  revalidatePath("/planejamento");
  revalidatePath("/despesas");
  revalidatePath("/cartoes");
  revalidatePath("/dashboard");

  return transaction;
}
