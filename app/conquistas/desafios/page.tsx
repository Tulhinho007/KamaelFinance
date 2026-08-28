"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Trophy, Target, Zap, Utensils, CheckCircle2, Sparkles, Plus, Award } from "lucide-react";
import {
  getUserChallengesOverviewAction,
  startChallengeAction,
  checkinChallengeAction,
  AVAILABLE_CHALLENGES
} from "@/lib/challenge-actions";
import { useModal } from "@/components/ui/custom-dialog-provider";

export default function ChallengesPage() {
  const { showAlert } = useModal();

  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState<any>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getUserChallengesOverviewAction();
      setData(res);
    } catch (e) {
      console.error("Erro ao carregar desafios:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStartChallenge = async (code: string) => {
    setProcessingId(code);
    try {
      await startChallengeAction(code);
      await loadData();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao aceitar desafio.", { variant: "error" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCheckin = async (userChallengeId: string) => {
    setProcessingId(userChallengeId);
    try {
      const res = await checkinChallengeAction(userChallengeId);
      if (res.isCompleted) {
        showAlert("🏆 PARABÉNS! Você concluiu este desafio e desbloqueou uma nova conquista!", { variant: "success" });
      }
      await loadData();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao registrar progresso.", { variant: "error" });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto flex flex-col gap-8 select-none font-sans text-slate-900 dark:text-white">

      {/* Header com XP Total */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Desafios Financeiros & Conquistas
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Aceite desafios de economia, acumule pontos de experiência (XP) e conquiste badges no seu perfil.
          </p>
        </div>

        {data && (
          <div className="px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-black text-sm flex items-center gap-2 self-start md:self-auto">
            <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
            <span>{data.totalXP} XP Acumulados</span>
          </div>
        )}
      </div>

      {loading || !data ? (
        <div className="py-12 text-center text-xs text-slate-400 font-medium">Carregando desafios gamificados...</div>
      ) : (
        <div className="space-y-8">

          {/* Seção 1: Desafios Em Andamento */}
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-500" />
              Seus Desafios Ativos ({data.activeChallenges.length})
            </h2>

            {data.activeChallenges.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                <Target className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-400">Você ainda não possui nenhum desafio em andamento.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Escolha um desafio no catálogo abaixo para começar!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {data.activeChallenges.map((ac: any) => (
                  <div
                    key={ac.id}
                    className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                          {ac.category} • {ac.difficulty}
                        </span>

                        <span className="text-xs font-black text-amber-500 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" /> +{ac.xpEarned} XP
                        </span>
                      </div>

                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white mt-2">{ac.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{ac.description}</p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-400">Progresso:</span>
                        <span className="text-slate-900 dark:text-white font-tnum">
                          Etapa {ac.currentStep} de {ac.totalSteps} ({ac.pct}%)
                        </span>
                      </div>

                      <div className="w-full h-3 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 rounded-full"
                          style={{ width: `${ac.pct}%` }}
                        />
                      </div>

                      {ac.status === "COMPLETED" ? (
                        <div className="w-full py-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-black text-xs rounded-xl text-center border border-emerald-200 dark:border-emerald-800/60">
                          ✓ Desafio Concluído! (+{ac.xpEarned} XP)
                        </div>
                      ) : (
                        <button
                          onClick={() => handleCheckin(ac.id)}
                          disabled={processingId === ac.id}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl text-center shadow-md transition-all cursor-pointer"
                        >
                          {processingId === ac.id ? "Registrando..." : "＋ Fazer Check-in da Etapa"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seção 2: Catálogo de Desafios Disponíveis */}
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-500" />
              Catálogo de Desafios
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {AVAILABLE_CHALLENGES.map((cat: any) => {
                const isAlreadyActive = data.activeChallenges.some((ac: any) => ac.challengeCode === cat.code);

                return (
                  <div
                    key={cat.code}
                    className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                          {cat.difficulty}
                        </span>

                        <span className="text-xs font-black text-amber-500 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" /> +{cat.xpReward} XP
                        </span>
                      </div>

                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white mt-2">{cat.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{cat.description}</p>
                    </div>

                    <button
                      onClick={() => handleStartChallenge(cat.code)}
                      disabled={isAlreadyActive || processingId === cat.code}
                      className={`w-full py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                        isAlreadyActive
                          ? "bg-slate-100 dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-800"
                          : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md hover:opacity-90"
                      }`}
                    >
                      {isAlreadyActive ? "✓ Desafio Ativo" : processingId === cat.code ? "Iniciando..." : "Aceitar Desafio"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seção 3: Galeria de Badges / Conquistas */}
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-500" />
              Galeria de Badges Desbloqueados ({data.badges.length})
            </h2>

            {data.badges.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400 font-medium">
                Complete desafios para desbloquear seus primeiros troféus!
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {data.badges.map((b: any) => (
                  <div
                    key={b.id}
                    className="bg-white dark:bg-[#131B2E] border border-amber-500/30 dark:border-amber-500/30 rounded-2xl p-4 text-center space-y-2 shadow-sm"
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">{b.title}</h4>
                    <span className="text-[10px] text-slate-400 block font-medium">Desbloqueado em {b.unlockedAt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
