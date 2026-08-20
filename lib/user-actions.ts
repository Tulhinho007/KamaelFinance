"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { sanitizeInputString, validateEmailHygiene } from "@/lib/security-hygiene";
import { recordAuditLog } from "@/lib/auth-brute-force";

function hashPassword(password: string): string {
  const salt = process.env.AUTH_SALT || "kamael_finance_salt_2026";
  return crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
}

export interface UserFilterInput {
  search?: string;
  status?: string;
}

export interface UserInput {
  name: string;
  email: string;
  phone?: string;
  status?: string;
  role?: "MASTER" | "MEMBRO";
  newPassword?: string;
}

export async function getUsers(filters?: UserFilterInput) {
  // 100% direto do banco de dados
  const where: Prisma.UserWhereInput = {};

  if (filters?.search && filters.search.trim() !== "") {
    const term = sanitizeInputString(filters.search.trim());
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
    ];
  }

  if (filters?.status && filters.status !== "TODOS") {
    where.status = sanitizeInputString(filters.status);
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name || "Sem Nome",
    email: u.email || "",
    phone: u.phone || "",
    status: u.status || "ATIVO",
    role: (u.role === "MASTER" ? "MASTER" : "MEMBRO") as "MASTER" | "MEMBRO",
    createdAt: u.createdAt.toISOString(),
  }));
}

export async function createUserAction(data: UserInput) {
  try {
    // 1. Controller Hygiene Layer
    const emailCheck = validateEmailHygiene(data.email);
    if (!emailCheck.valid) {
      return { success: false, error: emailCheck.error };
    }

    const cleanName = sanitizeInputString(data.name || "");
    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: "Nome completo deve ter no mínimo 2 caracteres." };
    }

    const cleanEmail = data.email.toLowerCase().trim();
    const cleanPhone = data.phone ? sanitizeInputString(data.phone) : "";

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existing) {
      return { success: false, error: "Este e-mail já está cadastrado no sistema." };
    }

    const userRole = data.role === "MASTER" ? "MASTER" : "MEMBRO";

    // Hasha a senha se fornecida pelo administrador
    const hashedPassword = data.newPassword && data.newPassword.length >= 6
      ? hashPassword(data.newPassword)
      : null;

    const user = await prisma.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        status: data.status || "ATIVO",
        role: userRole,
        password: hashedPassword,
        tokenVersion: 1,
      },
    });

    // Cria a carteira padrão para o usuário criado pelo MASTER
    await prisma.wallet.create({
      data: {
        userId: user.id,
        title: "Conta Principal",
        walletType: "CONTA_CORRENTE",
        initialBalance: 0,
      },
    });

    await recordAuditLog({
      userId: user.id,
      action: "USER_CREATED",
      details: `Novo usuário criado via painel executivo (${userRole}) por administrador.${
        hashedPassword ? " Senha definida pelo administrador." : " Sem senha inicial."
      }`,
    });

    revalidatePath("/usuarios");
    return { success: true, user };
  } catch (error: any) {
    console.error("Erro ao criar usuário:", error);
    return { success: false, error: error.message || "Erro ao criar usuário" };
  }
}

export async function updateUserAction(id: string, data: Partial<UserInput>) {
  try {
    const updateData: Prisma.UserUpdateInput = {};

    if (data.name !== undefined) {
      const cleanName = sanitizeInputString(data.name);
      if (!cleanName || cleanName.length < 2) {
        return { success: false, error: "Nome completo é obrigatório." };
      }
      updateData.name = cleanName;
    }

    if (data.email !== undefined) {
      const emailCheck = validateEmailHygiene(data.email);
      if (!emailCheck.valid) {
        return { success: false, error: emailCheck.error };
      }
      const cleanEmail = data.email.toLowerCase().trim();
      const existing = await prisma.user.findFirst({
        where: { email: cleanEmail, NOT: { id } },
      });
      if (existing) {
        return { success: false, error: "Este e-mail já pertence a outro usuário." };
      }
      updateData.email = cleanEmail;
    }

    if (data.phone !== undefined) {
      updateData.phone = sanitizeInputString(data.phone);
    }

    let tokenNeedsBump = false;

    if (data.status !== undefined) {
      const cleanStatus = sanitizeInputString(data.status);
      updateData.status = cleanStatus;
      if (cleanStatus === "INATIVO") {
        tokenNeedsBump = true;
      }
    }

    if (data.role !== undefined) {
      updateData.role = data.role === "MASTER" ? "MASTER" : "MEMBRO";
      tokenNeedsBump = true;
    }

    // Redefinição de senha pelo administrador
    if (data.newPassword) {
      if (data.newPassword.length < 6) {
        return { success: false, error: "A nova senha deve ter no mínimo 6 caracteres." };
      }
      updateData.password = hashPassword(data.newPassword);
      tokenNeedsBump = true; // Invalida sessões existentes por segurança
    }

    if (tokenNeedsBump) {
      updateData.tokenVersion = { increment: 1 };
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Audit Log
    await recordAuditLog({
      userId: user.id,
      action: "USER_UPDATED",
      details: `Usuário atualizado. Status: ${user.status}, Função: ${user.role}${
        data.newPassword ? ". Senha redefinida pelo administrador." : ""
      }`,
    });

    revalidatePath("/usuarios");
    return { success: true, user };
  } catch (error: any) {
    console.error("Erro ao atualizar usuário:", error);
    return { success: false, error: error.message || "Erro ao atualizar usuário" };
  }
}

export async function deleteUserAction(id: string) {
  try {
    if (!id || typeof id !== "string") {
      return { success: false, error: "ID de usuário inválido." };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { email: true, name: true },
    });

    // Exclusão em cascata dos registros vinculados
    await prisma.$transaction([
      prisma.transaction.deleteMany({
        where: { wallet: { userId: id } },
      }),
      prisma.wallet.deleteMany({
        where: { userId: id },
      }),
      prisma.goalHistory.deleteMany({
        where: { goal: { userId: id } },
      }),
      prisma.goal.deleteMany({
        where: { userId: id },
      }),
      prisma.user.delete({
        where: { id },
      }),
    ]);

    // Audit Log
    await recordAuditLog({
      userId: null,
      action: "USER_DELETED",
      details: `Usuário excluído do sistema: ${targetUser?.email || id}`,
    });

    revalidatePath("/usuarios");
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao excluir usuário:", error);
    if (error?.code === "P2003") {
      return {
        success: false,
        error: "Não foi possível excluir o usuário pois existem registros vinculados a ele.",
      };
    }
    return {
      success: false,
      error: error?.message || "Erro ao excluir usuário no servidor.",
    };
  }
}

// ── GERENCIAMENTO DE CONVITES (WHITELIST) ───────────────────────────────────

export async function getAllowedEmails() {
  const entries = await (prisma as any).allowedEmail.findMany({
    orderBy: { createdAt: "desc" },
  });
  return entries;
}

export async function addAllowedEmail(email: string) {
  const emailCheck = validateEmailHygiene(email);
  if (!emailCheck.valid) {
    return { success: false, error: emailCheck.error };
  }
  const cleanEmail = email.toLowerCase().trim();

  // Verifica se já está cadastrado como usuário
  const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (existingUser) {
    return { success: false, error: "Este e-mail já tem uma conta ativa no sistema." };
  }

  try {
    await (prisma as any).allowedEmail.upsert({
      where: { email: cleanEmail },
      update: { used: false }, // Permite reenvio de convite se necessário
      create: { email: cleanEmail },
    });
    revalidatePath("/usuarios");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Erro ao adicionar convite: " + error.message };
  }
}

export async function removeAllowedEmail(id: string) {
  try {
    await (prisma as any).allowedEmail.delete({ where: { id } });
    revalidatePath("/usuarios");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Erro ao remover convite: " + error.message };
  }
}
