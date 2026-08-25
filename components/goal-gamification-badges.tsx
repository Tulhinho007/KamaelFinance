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
      unlockedBg: "bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]",
      colorText: "text-amber-300",
    },
    {
      pctRequired: 50,
      title: "Meio Caminho",
      badge: "50%",
      icon: Medal,
      unlockedBg: "bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.25)]",
      colorText: "text-cyan-300",
    },
    {
      pctRequired: 75,
      title: "Quase Lá",
      badge: "75%",
      icon: Trophy,
      unlockedBg: "bg-purple-500/20 text-purple-300 border-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.25)]",
      colorText: "text-purple-300",
    },
    {
      pctRequired: 100,
      title: "Meta Concluída",
      badge: "100%",
      icon: Crown,
      unlockedBg: "bg-emerald-500/25 text-emerald-300 border-emerald-400/60 shadow-[0_0_15px_rgba(16,185,129,0.35)] animate-pulse",
      colorText: "text-emerald-300",
    },
  ];

  if (compact) {
    const highestUnlocked = [...milestones].reverse().find((m) => pct >= m.pctRequired);
    if (!highestUnlocked) return null;
    const IconComp = highestUnlocked.icon;
    return (
      <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border ${highestUnlocked.unlockedBg}`}>
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
            className={`relative flex items-center justify-center gap-1 px-1.5 py-1 rounded-xl border text-[9px] font-black w-full transition-all duration-300 text-center ${
              isUnlocked
                ? `${m.unlockedBg} scale-100`
                : "bg-slate-800/40 text-slate-400 border-slate-700/60 opacity-70"
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
