"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getActiveUserId } from "@/lib/actions";

export async function criarAnotacao(
  userIdParam?: string,
  data?: { titulo?: string; categoria?: string; anoReferencia?: number }
) {
  const userId = userIdParam || (await getActiveUserId());
  const nova = await prisma.anotacao.create({
    data: {
      userId,
      titulo: data?.titulo || "Sem título",
      conteudo: "",
      categoria: data?.categoria || "Estratégia",
      anoReferencia: data?.anoReferencia || new Date().getFullYear(),
    },
  });

  revalidatePath("/anotacoes");
  return nova;
}

export async function salvarConteudoAnotacao(
  id: string,
  titulo: string,
  conteudo: string,
  categoria: string,
  anoReferencia?: number
) {
  const updateData: any = {
    titulo: titulo || "Sem título",
    conteudo: conteudo ?? "",
    categoria: categoria || "Geral",
    updatedAt: new Date(),
  };
  if (anoReferencia) {
    updateData.anoReferencia = anoReferencia;
  }

  const atualizada = await prisma.anotacao.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/anotacoes");
  return atualizada;
}

export async function alternarFixadaAnotacao(id: string) {
  const nota = await prisma.anotacao.findUnique({
    where: { id },
    select: { fixada: true },
  });
  if (!nota) return null;

  const atualizada = await prisma.anotacao.update({
    where: { id },
    data: {
      fixada: !nota.fixada,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/anotacoes");
  return atualizada;
}

export async function excluirAnotacao(id: string) {
  await prisma.anotacao.delete({
    where: { id },
  });

  revalidatePath("/anotacoes");
  return { success: true };
}

export async function getAnotacoes(ano?: number, categoria?: string) {
  const userId = await getActiveUserId();
  const anoAtual = new Date().getFullYear();
  const anoReferencia = ano || anoAtual;

  return await prisma.anotacao.findMany({
    where: {
      userId,
      anoReferencia,
      ...(categoria && categoria !== "Todas" ? { categoria } : {}),
    },
    orderBy: [
      { fixada: "desc" },
      { updatedAt: "desc" },
    ],
  });
}

