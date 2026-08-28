"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

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
    // Ignora erro em estático
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

export type ChallengeCatalogItem = {
  code: string;
  title: string;
  description: string;
  category: "ECONOMIA" | "HÁBITO" | "APORTE";
  difficulty: "INICIANTE" | "INTERMEDIÁRIO" | "AVANÇADO";
  totalSteps: number;
  xpReward: number;
  badgeCode: string;
  badgeTitle: string;
  badgeIcon: string;
};

export const AVAILABLE_CHALLENGES: ChallengeCatalogItem[] = [
  {
    code: "52_WEEKS",
    title: "Desafio das 52 Semanas",
    description: "Guarde um valor progressivo toda semana por 1 ano e acumule R$ 1.378,00 ou mais.",
    category: "ECONOMIA",
    difficulty: "INTERMEDIÁRIO",
    totalSteps: 52,
    xpReward: 1000,
    badgeCode: "SAVER_52",
    badgeTitle: "Mestre das 52 Semanas",
    badgeIcon: "Trophy",
  },
  {
    code: "NO_DELIVERY_30",
    title: "30 Dias sem Delivery",
    description: "Cozinhe em casa e evite pedir refeições por aplicativos durante 30 dias consecutivos.",
    category: "HÁBITO",
    difficulty: "INICIANTE",
    totalSteps: 30,
    xpReward: 500,
    badgeCode: "NO_DELIVERY_HERO",
    badgeTitle: "Mestre da Cozinha",
    badgeIcon: "Utensils",
  },
  {
    code: "ZERO_SPEND_WEEK",
    title: "Semana do Zero Gasto Supérfluo",
    description: "Passe 7 dias gastando apenas com o essencial (contas e mercado), zerando supérfluos.",
    category: "HÁBITO",
    difficulty: "INICIANTE",
    totalSteps: 7,
    xpReward: 300,
    badgeCode: "ZERO_SPENDER",
    badgeTitle: "Foco Total",
    badgeIcon: "Zap",
  },
];

export async function getUserChallengesOverviewAction() {
  const userId = await getActiveUserId();

  const userChallenges = await (prisma as any).userChallenge.findMany({
    where: { userId },
    orderBy: { startDate: "desc" }
  });

  const userBadges = await (prisma as any).userBadge.findMany({
    where: { userId },
    orderBy: { unlockedAt: "desc" }
  });

  const activeChallenges = userChallenges.map((uc: any) => {
    const info = AVAILABLE_CHALLENGES.find(c => c.code === uc.challengeCode) || {
      title: uc.title,
      description: "Desafio financeiro",
      category: "ECONOMIA" as const,
      difficulty: "INICIANTE" as const,
      totalSteps: uc.totalSteps,
      xpReward: uc.xpEarned || 500,
      badgeCode: "GENERIC",
      badgeTitle: "Conquista",
      badgeIcon: "Target"
    };

    const pct = Math.min(100, Math.round((uc.currentStep / uc.totalSteps) * 100));

    return {
      id: uc.id,
      challengeCode: uc.challengeCode,
      title: uc.title || info.title,
      description: info.description,
      category: info.category,
      difficulty: info.difficulty,
      currentStep: uc.currentStep,
      totalSteps: uc.totalSteps,
      status: uc.status,
      pct,
      xpEarned: uc.xpEarned,
      startDate: uc.startDate.toISOString().split("T")[0],
    };
  });

  const totalXP = userBadges.length * 500 + activeChallenges.filter((c: any) => c.status === "COMPLETED").reduce((s: any, c: any) => s + c.xpEarned, 0);

  return {
    activeChallenges,
    catalog: AVAILABLE_CHALLENGES,
    badges: userBadges.map((b: any) => ({
      id: b.id,
      badgeCode: b.badgeCode,
      title: b.title,
      description: b.description,
      iconName: b.iconName,
      unlockedAt: b.unlockedAt.toISOString().split("T")[0]
    })),
    totalXP
  };
}

export async function startChallengeAction(challengeCode: string) {
  const userId = await getActiveUserId();

  const challengeInfo = AVAILABLE_CHALLENGES.find(c => c.code === challengeCode);
  if (!challengeInfo) throw new Error("Desafio não encontrado no catálogo.");

  const existing = await (prisma as any).userChallenge.findFirst({
    where: { userId, challengeCode, status: "ACTIVE" }
  });

  if (existing) return existing;

  const created = await (prisma as any).userChallenge.create({
    data: {
      userId,
      challengeCode,
      title: challengeInfo.title,
      totalSteps: challengeInfo.totalSteps,
      currentStep: 1,
      status: "ACTIVE",
      xpEarned: challengeInfo.xpReward,
    }
  });

  revalidatePath("/conquistas/desafios");
  return created;
}

export async function checkinChallengeAction(userChallengeId: string) {
  const userId = await getActiveUserId();

  const challenge = await (prisma as any).userChallenge.findUnique({
    where: { id: userChallengeId, userId }
  });

  if (!challenge) throw new Error("Desafio não encontrado.");

  const nextStep = challenge.currentStep + 1;
  const isCompleted = nextStep >= challenge.totalSteps;

  const updated = await (prisma as any).userChallenge.update({
    where: { id: userChallengeId },
    data: {
      currentStep: Math.min(challenge.totalSteps, nextStep),
      status: isCompleted ? "COMPLETED" : "ACTIVE",
      completedAt: isCompleted ? new Date() : null,
    }
  });

  if (isCompleted) {
    const info = AVAILABLE_CHALLENGES.find(c => c.code === challenge.challengeCode);
    if (info) {
      await (prisma as any).userBadge.upsert({
        where: {
          userId_badgeCode: {
            userId,
            badgeCode: info.badgeCode,
          }
        },
        create: {
          userId,
          badgeCode: info.badgeCode,
          title: info.badgeTitle,
          description: info.description,
          iconName: info.badgeIcon,
        },
        update: {}
      });
    }
  }

  revalidatePath("/conquistas/desafios");
  return { updated, isCompleted };
}
