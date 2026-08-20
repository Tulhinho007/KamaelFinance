"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";
import {
  isHoneypotTriggered,
  sanitizeInputString,
  validateEmailHygiene,
  validatePasswordHygiene,
} from "@/lib/security-hygiene";
import {
  checkLockoutStatus,
  recordFailedAttempt,
  resetFailedAttempts,
  recordAuditLog,
  verifyTokenVersion,
} from "@/lib/auth-brute-force";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tokenVersion?: number;
}

const COOKIE_NAME = "kamael_session";

function hashPassword(password: string): string {
  const salt = process.env.AUTH_SALT || "kamael_finance_salt_2026";
  return crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
}

export async function getCurrentUserAction(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME)?.value;
    if (!sessionCookie) return null;

    const parsed = JSON.parse(sessionCookie) as SessionUser;
    if (!parsed?.id) return null;

    const isValidToken = await verifyTokenVersion(parsed.id, parsed.tokenVersion || 1);
    if (!isValidToken) {
      cookieStore.delete(COOKIE_NAME);
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: parsed.id },
      select: { id: true, name: true, email: true, role: true, status: true, tokenVersion: true },
    });

    if (!user || user.status === "INATIVO") return null;

    return {
      id: user.id,
      name: user.name || "Usuário",
      email: user.email || "",
      role: user.role || "MEMBRO",
      tokenVersion: user.tokenVersion || 1,
    };
  } catch (error) {
    return null;
  }
}

export async function loginAction(data: {
  email: string;
  password?: string;
  hp_website?: string;
  hp_confirm?: string;
}) {
  try {
    // 1. Controller Layer: Check Honeypot (Proteção de Bot)
    if (isHoneypotTriggered(data)) {
      await recordAuditLog({
        userId: null,
        action: "BOT_ATTACK_PREVENTED",
        details: `Honeypot ativado na tentativa de login para e-mail: ${data.email}`,
      });
      // Rejeição silenciosa para enganar o bot
      return { success: false, error: "Acesso indisponível no momento." };
    }

    // 2. Hygiene Controller: Email
    const emailCheck = validateEmailHygiene(data.email);
    if (!emailCheck.valid) {
      return { success: false, error: emailCheck.error };
    }

    const cleanEmail = data.email.toLowerCase().trim();

    // 3. Service Layer: Brute Force Lockout Check
    const lockoutCheck = await checkLockoutStatus(cleanEmail);
    if (lockoutCheck.isLocked) {
      return { success: false, error: lockoutCheck.message };
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      const failedResult = await recordFailedAttempt(cleanEmail);
      return { success: false, error: failedResult.message || "E-mail ou senha incorretos." };
    }

    if (user.status === "INATIVO") {
      return { success: false, error: "Esta conta está inativa. Contate o administrador." };
    }

    // 4. Verificação de Senha com Hash PBKDF2/Bcrypt
    let isPasswordValid = false;

    if (user.password) {
      const inputHash = hashPassword(data.password || "");
      if (user.password === inputHash || user.password === data.password) {
        isPasswordValid = true;
      }
    } else if (data.password) {
      // Se a conta ainda não possuía senha definida no banco
      const newHash = hashPassword(data.password);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: newHash },
      });
      isPasswordValid = true;
    }

    if (!isPasswordValid) {
      const failedResult = await recordFailedAttempt(cleanEmail);
      return { success: false, error: failedResult.message || "E-mail ou senha incorretos." };
    }

    // Reseta falhas e salva log de sucesso
    await resetFailedAttempts(user.id);
    await recordAuditLog({
      userId: user.id,
      action: "LOGIN_SUCCESS",
      details: "Login efetuado com sucesso.",
    });

    const sessionData: SessionUser = {
      id: user.id,
      name: user.name || "Usuário Executivo",
      email: user.email || cleanEmail,
      role: user.role || "MEMBRO",
      tokenVersion: user.tokenVersion || 1,
    };

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 dias
      path: "/",
    });

    return { success: true, user: sessionData };
  } catch (error: any) {
    console.error("Erro no loginAction:", error);
    return { success: false, error: error.message || "Erro ao efetuar login." };
  }
}

export async function registerAction(data: {
  name?: string;
  email: string;
  password?: string;
  phone?: string;
  hp_website?: string;
  hp_confirm?: string;
}) {
  try {
    // 1. Controller Layer: Check Honeypot
    if (isHoneypotTriggered(data)) {
      await recordAuditLog({
        userId: null,
        action: "BOT_ATTACK_PREVENTED",
        details: `Honeypot ativado no cadastro para e-mail: ${data.email}`,
      });
      return { success: false, error: "Registro indisponível." };
    }

    // 2. Hygiene Controllers: Email (obrigatório), Nome (opcional)
    const cleanName = data.name ? sanitizeInputString(data.name) : null;

    const emailCheck = validateEmailHygiene(data.email);
    if (!emailCheck.valid) {
      return { success: false, error: emailCheck.error };
    }

    const cleanEmail = data.email.toLowerCase().trim();

    if (data.password) {
      const passCheck = validatePasswordHygiene(data.password);
      if (!passCheck.valid) {
        return { success: false, error: passCheck.error };
      }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return { success: false, error: "Este e-mail já está cadastrado. Faça login." };
    }

    // 3. ⛔ WHITELIST: Verifica se o e-mail está autorizado a se cadastrar
    // O PRIMEIRO usuário do sistema (MASTER) sempre pode se cadastrar sem convite.
    const countUsers = await prisma.user.count();
    if (countUsers > 0) {
      const allowedEntry = await (prisma as any).allowedEmail.findUnique({
        where: { email: cleanEmail },
      });
      if (!allowedEntry) {
        await recordAuditLog({
          userId: null,
          action: "REGISTER_BLOCKED",
          details: `E-mail não autorizado tentou se cadastrar: ${cleanEmail}`,
        });
        return {
          success: false,
          error: "Cadastro restrito. Solicite um convite ao administrador do sistema.",
        };
      }
      if (allowedEntry.used) {
        return {
          success: false,
          error: "Este convite já foi utilizado. Solicite um novo convite.",
        };
      }
    }

    // Criptografa a senha com PBKDF2/Bcrypt Hash
    const hashedPassword = data.password ? hashPassword(data.password) : null;

    // Primeiro usuário é MASTER, os demais são MEMBRO
    const role = countUsers === 0 ? "MASTER" : "MEMBRO";

    // Nome: usa o fornecido ou deriva do email (parte antes do @)
    const finalName = cleanName && cleanName.length >= 2
      ? cleanName
      : cleanEmail.split("@")[0];

    const newUser = await prisma.user.create({
      data: {
        name: finalName,
        email: cleanEmail,
        password: hashedPassword,
        phone: data.phone ? sanitizeInputString(data.phone) : null,
        status: "ATIVO",
        role: role,
        tokenVersion: 1,
      },
    });

    // Marca o convite como utilizado
    if (countUsers > 0) {
      await (prisma as any).allowedEmail.update({
        where: { email: cleanEmail },
        data: { used: true },
      });
    }

    // Cria automaticamente a carteira padrão inicial para o novo usuário
    await prisma.wallet.create({
      data: {
        userId: newUser.id,
        title: "Conta Principal",
        walletType: "CONTA_CORRENTE",
        initialBalance: 0,
      },
    });

    await recordAuditLog({
      userId: newUser.id,
      action: "REGISTER_SUCCESS",
      details: `Novo usuário cadastrado com sucesso. Função: ${role}`,
    });

    // Define a sessão de login imediatamente
    const sessionData: SessionUser = {
      id: newUser.id,
      name: newUser.name || finalName,
      email: newUser.email || cleanEmail,
      role: newUser.role,
      tokenVersion: newUser.tokenVersion || 1,
    };

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 dias
      path: "/",
    });

    return { success: true, user: sessionData };
  } catch (error: any) {
    console.error("Erro no registerAction:", error);
    return { success: false, error: error.message || "Erro ao registrar conta." };
  }
}

export async function logoutAction() {
  const currentUser = await getCurrentUserAction();
  if (currentUser) {
    await recordAuditLog({
      userId: currentUser.id,
      action: "LOGOUT",
      details: "Usuário encerrou a sessão.",
    });
  }

  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect("/login");
}
