"use client";

import React from "react";
import { Sparkles, Trophy, Award, Medal, Crown, X, ArrowRight } from "lucide-react";

interface GoalCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalTitle: string;
  milestonePct: number;
}

export function GoalCelebrationModal({
  isOpen,
  onClose,
  goalTitle,
  milestonePct,
}: GoalCelebrationModalProps) {
  if (!isOpen) return null;

  const getMilestoneData = () => {
    switch (milestonePct) {
      case 25:
        return {
          title: "Primeiro Passo Conquistado! 🏅",
          subtitle: "Você atingiu 25% da sua meta!",
          badge: "Bronze - 25%",
          icon: Award,
          gradient: "from-amber-600 to-amber-800",
          message: "O começo é a parte mais importante. Mantenha os aportes recorrentes para manter o ritmo!"
        };
      case 50:
        return {
          title: "Metade do Caminho Concluído! 🥈",
          subtitle: "Você alcançou 50% da sua meta!",
          badge: "Prata - 50%",
          icon: Medal,
          gradient: "from-slate-400 to-slate-600",
          message: "Você já percorreu metade de toda a jornada! O objetivo está cada vez mais próximo."
        };
      case 75:
        return {
          title: "Reta Final! Quase lá! 🥇",
          subtitle: "75% da meta concluídos com sucesso!",
          badge: "Ouro - 75%",
          icon: Trophy,
          gradient: "from-amber-400 via-yellow-500 to-amber-600",
          message: "Falta muito pouco! Mantenha a disciplina nos últimos aportes para celebrar a conquista final."
        };
      case 100:
      default:
        return {
          title: "PARABÉNS! META CONCLUÍDA! 🏆🎉",
          subtitle: "100% do seu objetivo conquistado!",
          badge: "Diamante - 100%",
          icon: Crown,
          gradient: "from-indigo-600 via-purple-600 to-pink-500",
          message: "Sensacional! Você atingiu seu objetivo estratégico com maestria. Seu foco financeiro deu frutos extraordinários!"
        };
    }
  };

  const data = getMilestoneData();
  const IconComp = data.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-3 sm:p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-[95%] sm:w-full max-w-md max-h-[90vh] overflow-y-auto text-center select-none relative">
        
        {/* Banner com gradiente e confetes */}
        <div className={`bg-gradient-to-r ${data.gradient} p-8 text-white flex flex-col items-center relative overflow-hidden`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25)_0%,_transparent_70%)] pointer-events-none" />
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center mb-4 shadow-xl animate-bounce">
            <IconComp className="w-8 h-8 text-white" />
          </div>

          <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30 mb-2 inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-yellow-300" /> {data.badge}
          </span>

          <h2 className="text-xl font-black tracking-tight drop-shadow-sm">
            {data.title}
          </h2>
          <p className="text-xs font-bold text-white/90 mt-1">
            {data.subtitle}
          </p>
        </div>

        {/* Corpo com detalhes da Meta */}
        <div className="p-6 flex flex-col gap-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Meta Celebrada
            </span>
            <p className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
              "{goalTitle}"
            </p>
          </div>

          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed px-2">
            {data.message}
          </p>

          <button
            onClick={onClose}
            className={`w-full py-3.5 rounded-2xl bg-gradient-to-r ${data.gradient} text-white font-extrabold text-xs tracking-wider shadow-lg transition-all hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2 mt-2`}
          >
            <span>Continuar Evoluindo</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
