"use client";

import React from "react";
import { Award, Medal, Trophy, Crown, Lock } from "lucide-react";

interface GoalGamificationBadgesProps {
  pct: number;
  compact?: boolean;
}

export function GoalGamificationBadges({ pct, compact = false }: GoalGamificationBadgesProps) {
  const milestones = [
    {
      pctRequired: 25,
      title: "Primeiro Passo",
      badge: "25%",
      icon: Award,
      unlockedBg: "bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100 border-amber-500/40 shadow-amber-900/20",
      colorText: "text-amber-500",
    },
    {
      pctRequired: 50,
      title: "Meio Caminho",
      badge: "50%",
      icon: Medal,
      unlockedBg: "bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500 text-white border-slate-300/40 shadow-slate-500/20",
      colorText: "text-slate-400",
    },
    {
      pctRequired: 75,
      title: "Quase Lá",
      badge: "75%",
      icon: Trophy,
      unlockedBg: "bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 text-yellow-950 border-yellow-300/40 shadow-yellow-500/20",
      colorText: "text-yellow-500",
    },
    {
      pctRequired: 100,
      title: "Meta Concluída",
      badge: "100%",
      icon: Crown,
      unlockedBg: "bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white border-white/30 shadow-indigo-500/30",
      colorText: "text-indigo-400",
    },
  ];

  if (compact) {
    const highestUnlocked = [...milestones].reverse().find((m) => pct >= m.pctRequired);
    if (!highestUnlocked) return null;
    const IconComp = highestUnlocked.icon;
    return (
      <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full border shadow-xs ${highestUnlocked.unlockedBg}`}>
        <IconComp className="w-3 h-3" />
        <span>{highestUnlocked.title} ({highestUnlocked.badge})</span>
      </span>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-1 sm:gap-1.5 w-full">
      {milestones.map((m) => {
        const isUnlocked = pct >= m.pctRequired;
        const IconComp = m.icon;

        return (
          <div
            key={m.pctRequired}
            className={`relative flex items-center justify-center gap-1 px-1 py-1 rounded-xl border text-[9px] font-extrabold w-full transition-all duration-300 text-center ${
              isUnlocked
                ? `${m.unlockedBg} shadow-xs scale-100`
                : "bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-200/60 dark:border-slate-800 opacity-60"
            }`}
            title={isUnlocked ? `Conquista desbloqueada: ${m.title} (${m.badge})` : `Bloqueado: Requer ${m.badge} da meta`}
          >
            {isUnlocked ? (
              <IconComp className="w-3 h-3 shrink-0" />
            ) : (
              <Lock className="w-2.5 h-2.5 shrink-0 text-slate-400" />
            )}
            <span className="truncate">{m.badge}</span>
          </div>
        );
      })}
    </div>
  );
}
