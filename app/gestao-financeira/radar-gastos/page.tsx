"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Radar,
  ShoppingBag,
  DollarSign,
  PieChart,
  Sliders,
  Sparkles,
  CreditCard,
  Wallet,
  Building2,
  AlertCircle,
  CheckCircle2,
  Zap,
  TrendingDown,
  ChevronRight,
  Info
} from "lucide-react";
import { usePeriod } from "@/components/period-context";
import { PeriodHeader } from "@/components/period-header";
import {
  getRadarExpensesAction,
  RadarOverviewData
} from "@/lib/radar-actions";

const brl = (v: number) =>
  (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PRESET_LIMITS = [20, 30, 50, 80, 100, 150];

export default function RadarGastosPage() {
  const { selectedMonth, selectedYear } = usePeriod();
  const [maxLimit, setMaxLimit] = useState<number>(50);
  const [customInput, setCustomInput] = useState<string>("50");
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<RadarOverviewData | null>(null);

  const fetchRadarData = useCallback(
    async (limitVal: number) => {
      setLoading(true);
      try {
        const res = await getRadarExpensesAction({
          month: selectedMonth,
          year: selectedYear,
          maxAmount: limitVal,
        });
        setData(res);
      } catch (err) {
        console.error("Falha ao carregar dados do Radar:", err);
      } finally {
        setLoading(false);
      }
    },
    [selectedMonth, selectedYear]
  );

  useEffect(() => {
    fetchRadarData(maxLimit);
  }, [fetchRadarData, maxLimit]);

  const handleSelectPreset = (limit: number) => {
    setMaxLimit(limit);
    setCustomInput(limit.toString());
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setMaxLimit(num);
    }
  };

  const getWalletBadgeIcon = (walletType: string) => {
    if (walletType === "CREDIT_CARD") {
      return <CreditCard className="w-3 h-3 text-indigo-500" />;
    }
    if (walletType === "TICKET") {
      return <Zap className="w-3 h-3 text-amber-500" />;
    }
    return <Wallet className="w-3 h-3 text-emerald-500" />;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Cabeçalho Executivo de Período */}
      <PeriodHeader
        title="Radar de Pequenos Gastos"
        tagline="Descubra o impacto real dos pequenos gastos acumulados no seu orçamento."
        badge="GESTÃO"
      />

      {/* Bar de Controle & Parametrização do Limite */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs transition-all duration-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Limite de Valor Considerado &quot;Pequeno Gasto&quot;
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Transações de saída com valor até este limite serão mapeadas pelo Radar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:inline-block">
              Presets:
            </span>
            {PRESET_LIMITS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  maxLimit === preset
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 ring-2 ring-indigo-600/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Até {brl(preset)}
              </button>
            ))}

            <div className="relative flex items-center ml-1">
              <span className="absolute left-3 text-xs font-bold text-slate-400">
                R$
              </span>
              <input
                type="number"
                min="1"
                step="5"
                value={customInput}
                onChange={handleCustomInputChange}
                className="w-24 pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                placeholder="Outro"
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        /* Loading Skeleton */
        <div className="space-y-6 animate-pulse">
          <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
            <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
            <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          </div>
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      ) : (
        <>
          {/* Card Principal de Destaque / Highlight Radar */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 border border-indigo-800/40 p-6 sm:p-8 text-white shadow-xl">
            {/* Glow / Light effect */}
            <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold uppercase tracking-wider backdrop-blur-xs">
                  <Radar className="w-3.5 h-3.5 text-indigo-300 animate-pulse" />
                  Insight do Mês
                </div>

                <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-snug">
                  Você gastou{" "}
                  <span className="text-amber-400 underline decoration-amber-400/40 decoration-wavy underline-offset-4">
                    {brl(data?.totalRadarAmount || 0)}
                  </span>{" "}
                  em compras abaixo de{" "}
                  <span className="text-indigo-300 font-bold">
                    {brl(maxLimit)}
                  </span>{" "}
                  neste mês.
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                  {data && data.percentOfTotalBudget > 0 ? (
                    <>
                      Essas pequenas transações parecem inofensivas individualmente, mas já representam{" "}
                      <strong className="text-white font-extrabold">
                        {data.percentOfTotalBudget}%
                      </strong>{" "}
                      de todas as suas despesas no mês ({brl(data.totalAllExpenses)} no total).
                    </>
                  ) : (
                    "Nenhuma despesa pequena identificada neste período com o limite atual."
                  )}
                </p>

                {/* Progress bar visual */}
                {data && data.totalAllExpenses > 0 && (
                  <div className="pt-2 space-y-1.5">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-300">
                      <span>Proporção do Orçamento Gasto</span>
                      <span>{data.percentOfTotalBudget}% do total</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-indigo-500/30">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(data.percentOfTotalBudget, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
                <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center text-amber-300 shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-200 block">
                      Total do Radar
                    </span>
                    <span className="text-lg font-black text-white">
                      {brl(data?.totalRadarAmount || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cards de Métricas Rápidas (3 Cards Pequenos) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. Qtd de Compras */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center gap-4 hover:border-indigo-500/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Qtd. de Compras Feitas
                </p>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                  {data?.countRadar || 0}
                </h3>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {data?.countRadar === 1
                    ? "1 transação encontrada"
                    : `${data?.countRadar || 0} transações abaixo de ${brl(maxLimit)}`}
                </p>
              </div>
            </div>

            {/* 2. Valor Médio por Compra */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center gap-4 hover:border-indigo-500/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Valor Médio por Compra
                </p>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                  {brl(data?.averageRadarAmount || 0)}
                </h3>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Média de gasto individual
                </p>
              </div>
            </div>

            {/* 3. % do Total do Orçamento */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center gap-4 hover:border-indigo-500/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                <PieChart className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  % do Total do Orçamento
                </p>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                  {data?.percentOfTotalBudget || 0}%
                </h3>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Do total de saídas no mês
                </p>
              </div>
            </div>
          </div>

          {/* Lista de Transações (Feed Agrupado por Data) */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Lançamentos Identificados
                </h3>
                <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {data?.countRadar || 0}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                Ordenado por data decrescente
              </span>
            </div>

            {data && data.groupedTransactions.length > 0 ? (
              <div className="space-y-6">
                {data.groupedTransactions.map((group) => (
                  <div key={group.dateKey} className="space-y-3">
                    {/* Header do Grupo de Data */}
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-indigo-500" />
                      <h4 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        {group.dateDisplay}
                      </h4>
                      <div className="flex-1 border-t border-slate-200/80 dark:border-slate-800" />
                    </div>

                    {/* Cards de Transações do Grupo */}
                    <div className="grid grid-cols-1 gap-2.5">
                      {group.transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800/80 rounded-2xl p-4 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs group"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Ícone de Categoria com Cor */}
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
                              style={{
                                backgroundColor: tx.categoryColor || "#6366F1",
                              }}
                            >
                              <ShoppingBag className="w-5 h-5" />
                            </div>

                            <div className="min-w-0">
                              <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {tx.description}
                              </h5>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  {tx.categoryName}
                                </span>

                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                  {getWalletBadgeIcon(tx.walletType)}
                                  {tx.bankName || tx.walletTitle}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                            <div className="text-right">
                              <span className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400 block">
                                -{brl(tx.amount)}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 block">
                                Despesa Registrada
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* State Vazio */
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="max-w-md mx-auto space-y-2">
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Nenhum pequeno gasto abaixo de {brl(maxLimit)} detectado neste mês!
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    Excelente controle financeiro! Você não possui compras de baixo valor cadastradas no período selecionado ou pode ajustar o limite no filtro acima.
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
