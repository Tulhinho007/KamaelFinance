import { prisma } from "@/lib/prisma";

/**
 * Service Layer: Auth & Brute Force Guard
 * Gerencia a contagem de falhas de login (lockout após 10 tentativas),
 * verificação de TokenVersion e registro de logs de auditoria.
 */

const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_DURATION_MINUTES = 15;

/**
 * Registra uma tentativa de login com falha para o e-mail/usuário.
 * Incrementa o contador failedAttempts e ativa lockout se atingir 10 tentativas.
 */
export async function recordFailedAttempt(
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ isLocked: boolean; remainingAttempts: number; message?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      await recordAuditLog({
        userId: null,
        action: "LOGIN_FAILED_UNKNOWN_EMAIL",
        details: `Tentativa de login com e-mail não cadastrado: ${email}`,
        ipAddress,
        userAgent,
      });
      return { isLocked: false, remainingAttempts: MAX_FAILED_ATTEMPTS };
    }

    const now = new Date();

    // Se já estava em lockout mas o tempo expirou, reseta o contador
    let currentAttempts = user.failedAttempts || 0;
    if (user.lockoutUntil && user.lockoutUntil < now) {
      currentAttempts = 0;
    }

    const newAttempts = currentAttempts + 1;
    let lockoutUntil: Date | null = null;
    let isLocked = false;

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      isLocked = true;
      lockoutUntil = new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: newAttempts,
        lockoutUntil: lockoutUntil,
      },
    });

    await recordAuditLog({
      userId: user.id,
      action: isLocked ? "ACCOUNT_LOCKED" : "LOGIN_FAILED",
      details: isLocked
        ? `Conta bloqueada por ${LOCKOUT_DURATION_MINUTES} minutos após 10 tentativas incorretas.`
        : `Tentativa de login incorreta ${newAttempts}/${MAX_FAILED_ATTEMPTS}`,
      ipAddress,
      userAgent,
    });

    const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - newAttempts);
    const message = isLocked
      ? `Conta bloqueada temporariamente devido a 10 tentativas incorretas. Tente novamente em ${LOCKOUT_DURATION_MINUTES} minutos.`
      : `E-mail ou senha incorretos. Restam ${remaining} tentativas antes do bloqueio da conta.`;

    return { isLocked, remainingAttempts: remaining, message };
  } catch (error) {
    console.error("Erro no recordFailedAttempt:", error);
    return { isLocked: false, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }
}

/**
 * Zera as tentativas falhas após um login bem-sucedido.
 */
export async function resetFailedAttempts(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        failedAttempts: 0,
        lockoutUntil: null,
      },
    });
  } catch (error) {
    console.error("Erro no resetFailedAttempts:", error);
  }
}

/**
 * Verifica se o usuário está atualmente bloqueado por Brute-Force.
 */
export async function checkLockoutStatus(email: string): Promise<{ isLocked: boolean; message?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !user.lockoutUntil) {
      return { isLocked: false };
    }

    const now = new Date();
    if (user.lockoutUntil > now) {
      const minutesRemaining = Math.ceil((user.lockoutUntil.getTime() - now.getTime()) / (1000 * 60));
      return {
        isLocked: true,
        message: `Conta temporariamente bloqueada por segurança. Tente novamente em ${minutesRemaining} minutos.`,
      };
    }

    return { isLocked: false };
  } catch (error) {
    return { isLocked: false };
  }
}

/**
 * Valida se a versão do token da sessão atual é válida perante o banco de dados.
 */
export async function verifyTokenVersion(userId: string, tokenVersionInSession: number): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tokenVersion: true, status: true },
    });

    if (!user || user.status === "INATIVO") return false;
    return (user.tokenVersion || 1) === tokenVersionInSession;
  } catch (error) {
    return false;
  }
}

/**
 * Registra um evento no Log de Auditoria
 */
export async function recordAuditLog(params: {
  userId?: string | null;
  action: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        details: params.details || null,
        ipAddress: params.ipAddress || "127.0.0.1",
        userAgent: params.userAgent || "Unknown",
      },
    });
  } catch (error) {
    console.error("Erro ao gravar AuditLog:", error);
  }
}
