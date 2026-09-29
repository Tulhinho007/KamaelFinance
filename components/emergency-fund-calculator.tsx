"use client";

import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  Calendar,
  Percent,
  Flame,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Info,
  Building2,
  Briefcase,
  UserCheck
} from "lucide-react";
import {
  calculateEmergencyFund,
  EmploymentProfile,
  formatBRL
} from "@/lib/financial-engine";

interface EmergencyFundCalculatorProps {
  onApplyAsGoal?: (data: { title: string; targetAmount: number; currentAmount: number }) => void;
}

export function EmergencyFundCalculator({ onApplyAsGoal }: EmergencyFundCalculatorProps) {
  const [cost, setCost] = useState<number>(5000);
  const [profile, setProfile] = useState<EmploymentProfile>("clt");
  const [savings, setSavings] = useState<number>(10000);

  const result = useMemo(() => {
    return calculateEmergencyFund(cost, profile, savings);
  }, [cost, profile, savings]);

  const PROFILES = [
    {
      id: "public_servant" as EmploymentProfile,
      name: "Servidor Público",
      icon: UserCheck,
      months: 4,
      desc: "Alta estabilidade estatutária. Foco exclusivo em imprevistos pontuais de saúde ou reparos.",
      badge: "3 a 4 meses",
      color: "border-sky-500/40 text-sky-400 bg-sky-500/10",
    },
    {
      id: "clt" as EmploymentProfile,
      name: "Trabalhador CLT",
      icon: Building2,
      months: 6,
      desc: "Estabilidade moderada com FGTS e aviso prévio. Período seguro para recolocação no mercado.",
      badge: "6 meses",
      color: "border-indigo-500/40 text-indigo-400 bg-indigo-500/10",
    },
    {
      id: "freelancer" as EmploymentProfile,
      name: "Autônomo / PJ",
      icon: Briefcase,
      months: 12,
      desc: "Alta volatilidade e sazonalidade de faturamento. Exige blindagem robusta contra quebras de contratos.",
      badge: "12 meses",
      color: "border-amber-500/40 text-amber-400 bg-amber-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* ── HEADER DA FERRAMENTA ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-sky-950/40 via-indigo-950/30 to-slate-900/50 border border-sky-500/20 rounded-3xl p-5 sm:p-6">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.25)] shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Blindagem Patrimonial
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                • Simulador Oficial
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
              Calculadora de Reserva de Emergência
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Dimensione a proteção ideal do seu custo de vida antes de direcionar recursos para investimentos de maior risco.
            </p>
          </div>
        </div>

        {onApplyAsGoal && (
          <button
            type="button"
            onClick={() =>
              onApplyAsGoal({
                title: "Reserva de Emergência",
                targetAmount: result.targetAmount,
                currentAmount: result.currentSavings,
              })
            }
            className="inline-flex items-center justify-center gap-2 px-4.5 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-black tracking-wide shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 transition-all cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>Transformar em Meta do Meu Painel</span>
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </button>
        )}
      </div>

      {/* ── 4 CARDS DE KPI DE BLINDAGEM ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 — Meta Ideal */}
        <div className="bg-white dark:bg-[#131B2E] border border-sky-200 dark:border-sky-500/30 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-sky-600 dark:text-sky-400 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Meta Ideal da Reserva</span>
            <ShieldCheck className="w-5 h-5 text-sky-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {formatBRL(result.targetAmount)}
          </div>
          <div className="mt-2 text-xs text-sky-700 dark:text-sky-300 font-bold">
            {result.recommendedMonths} meses de custo fixo
          </div>
        </div>

        {/* KPI 2 — Cobertura Atual */}
        <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Cobertura Atual</span>
            <Calendar className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            {result.coverageMonths} <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">meses</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {formatBRL(result.currentSavings)} guardados
          </div>
        </div>

        {/* KPI 3 — Progresso da Meta */}
        <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Progresso da Blindagem</span>
            <Percent className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {result.coveragePercentage}%
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {result.isFullyFunded ? "Blindagem total atingida" : "Em construção ativa"}
          </div>
        </div>

        {/* KPI 4 — Restante ou Superávit */}
        <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">
              {result.isFullyFunded ? "Superávit Livre" : "Valor Restante"}
            </span>
            <Flame className="w-5 h-5 text-amber-500" />
          </div>
          <div
            className={`text-2xl sm:text-3xl font-black tracking-tight ${
              result.isFullyFunded ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
            }`}
          >
            {formatBRL(result.isFullyFunded ? result.surplusAmount : result.remainingAmount)}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {result.isFullyFunded ? "Disponível para aportes de risco/ações" : "Necessário para fechar a meta"}
          </div>
        </div>
      </div>

      {/* ── PAINEL DE CONTROLES E SELEÇÃO DE PERFIL ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Lado Esquerdo: Controles Interativos */}
        <div className="lg:col-span-7 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 space-y-6 shadow-sm">
          
          {/* Perfil Profissional */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                1. Selecione seu Perfil de Trabalho
              </h4>
              <span className="text-xs font-semibold text-slate-500">Estabilidade vs Risco</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              A estabilidade da sua fonte de renda determina o número seguro de meses de cobertura.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PROFILES.map((p) => {
                const isSelected = profile === p.id;
                const IconComp = p.icon;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProfile(p.id)}
                    className={`flex flex-col text-left p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? "bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-500/80 ring-2 ring-sky-400/20 dark:ring-sky-500/20 text-slate-900 dark:text-white"
                        : "bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2 w-full">
                      <div className="flex items-center gap-2">
                        <IconComp className={`w-4 h-4 ${isSelected ? "text-sky-400" : "text-slate-400"}`} />
                        <span className="font-bold text-xs">{p.name}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                        isSelected 
                          ? "bg-sky-100 dark:bg-sky-500/30 text-sky-700 dark:text-sky-300" 
                          : "bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}>
                        {p.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                      {p.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sliders e Inputs de Valores */}
          <div className="space-y-5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            
            {/* Custo Fixo de Vida */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Custo Fixo de Vida Mensal (R$)
                </label>
                <span className="text-sm font-black text-sky-600 dark:text-sky-400">
                  {formatBRL(cost)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                Aluguel, contas essenciais, supermercado, saúde e parcelas fixas indispensáveis.
              </p>
              <input
                type="number"
                min="0"
                step="200"
                value={cost}
                onChange={(e) => setCost(Math.max(0, Number(e.target.value)))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-bold focus:outline-none focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900"
              />
              <input
                type="range"
                min="1000"
                max="30000"
                step="250"
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                className="w-full mt-2.5 accent-sky-500 cursor-pointer"
              />
            </div>

            {/* Saldo Atual Guardado */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Saldo Atual Guardado na Reserva (R$)
                </label>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {formatBRL(savings)}
                </span>
              </div>
              <input
                type="number"
                min="0"
                step="500"
                value={savings}
                onChange={(e) => setSavings(Math.max(0, Number(e.target.value)))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-bold focus:outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900"
              />
              <input
                type="range"
                min="0"
                max={Math.max(100000, result.targetAmount * 1.5)}
                step="500"
                value={savings}
                onChange={(e) => setSavings(Number(e.target.value))}
                className="w-full mt-2.5 accent-emerald-500 cursor-pointer"
              />
            </div>

          </div>

        </div>

        {/* Lado Direito: Diagnóstico & Recomendações */}
        <div className="lg:col-span-5 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                Diagnóstico de Blindagem
              </h4>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                  result.coveragePercentage >= 100
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                    : result.coveragePercentage >= 50
                    ? "bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/30"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                }`}
              >
                {result.statusLabel}
              </span>
            </div>

            {/* Barra de Progresso Visual */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Progresso da Blindagem</span>
                <span className="text-slate-900 dark:text-white font-extrabold">{result.coveragePercentage}%</span>
              </div>
              <div className="w-full h-4 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    result.coveragePercentage >= 100
                      ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                      : result.coveragePercentage >= 50
                      ? "bg-gradient-to-r from-sky-500 to-emerald-400"
                      : "bg-gradient-to-r from-amber-500 to-sky-500"
                  }`}
                  style={{ width: `${Math.min(100, result.coveragePercentage)}%` }}
                />
              </div>
            </div>

            {/* Recomendação de Consultoria */}
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4.5 space-y-2">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Recomendação de Blindagem
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {result.recommendationText}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Onde Alocar */}
          <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-500/20 rounded-2xl p-4 mt-6 text-xs text-sky-900 dark:text-sky-200">
            <strong className="block text-sky-800 dark:text-sky-300 font-bold mb-1">
              Onde alocar esta reserva?
            </strong>
            Priorize 100% liquidez diária (D+0) com baixo risco de crédito e sem oscilação negativa:
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-600 dark:text-slate-300">
              <li>Tesouro Selic (Tesouro Direto com liquidez soberana)</li>
              <li>CDB de Bancos Sólidos com Liquidez Diária a 100%+ do CDI</li>
              <li>Contas remuneradas garantidas pelo FGC</li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}
