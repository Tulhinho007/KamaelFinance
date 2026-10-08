"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Receipt,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  FileSpreadsheet,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { usePeriod } from "@/components/period-context";
import {
  getMonthlyClosingExpensesAction,
  MonthlyClosingExpensesData,
  MonthlyClosingHistoryRecord,
} from "@/lib/radar-actions";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const brl = (v: number) =>
  (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDateBR = (dateStr?: string | null) => {
  if (!dateStr) return "-";
  const clean = dateStr.split("T")[0];
  const parts = clean.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
};

export function MonthlyClosingView() {
  const {
    selectedMonth,
    selectedYear,
    prevMonth,
    nextMonth,
    setPeriod,
    goToCurrentMonth,
  } = usePeriod();

  const [data, setData] = useState<MonthlyClosingExpensesData | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal de Detalhamento da Competência
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getMonthlyClosingExpensesAction({
        month: selectedMonth,
        year: selectedYear,
      });
      setData(res);
    } catch (err) {
      console.error("Erro ao carregar fechamento mensal:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAccount = (id: string) => {
    setExpandedAccounts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const now = new Date();
  const nowMonth = now.getMonth() + 1;
  const nowYear = now.getFullYear();

  const isCurrentMonth = selectedMonth === nowMonth && selectedYear === nowYear;
  const isPastMonth = selectedYear < nowYear || (selectedYear === nowYear && selectedMonth < nowMonth);

  // Escala para o gráfico de 6 meses
  const maxHistoryTotal =
    data && data.history6Months.length > 0
      ? Math.max(...data.history6Months.map((h) => h.total), 1)
      : 1;

  // Percentuais de modalidade para o modal de detalhamento
  const creditShare =
    data && data.totalExpense > 0
      ? Math.round((data.creditTotal / data.totalExpense) * 100)
      : 0;
  const debitShare =
    data && data.totalExpense > 0 ? 100 - creditShare : 0;

  const handleOpenDetailModal = (month: number, year: number) => {
    if (month !== selectedMonth || year !== selectedYear) {
      setPeriod(month, year);
    }
    setDetailModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 font-sans text-slate-900 dark:text-slate-100">

      {/* ── 1. Card de Destaque Superior: Seletor / Visualizador de Competência ───────── */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6">
          {/* Topo do Card: Seletor de Competência & Badge de Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Navegação Rápida de Competência */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prevMonth}
                className="p-2 rounded-xl border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer shadow-xs"
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5">
                <select
                  value={selectedMonth}
                  onChange={(e) => setPeriod(Number(e.target.value), selectedYear)}
                  className="bg-slate-800/90 border border-slate-700 text-xs font-bold rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1} className="bg-slate-900 text-white">
                      {name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setPeriod(selectedMonth, Number(e.target.value))}
                  className="bg-slate-800/90 border border-slate-700 text-xs font-bold rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y} className="bg-slate-900 text-white">
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={nextMonth}
                className="p-2 rounded-xl border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer shadow-xs"
                title="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {!isCurrentMonth && (
                <button
                  type="button"
                  onClick={goToCurrentMonth}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ml-1 shadow-xs"
                >
                  Mês Atual
                </button>
              )}
            </div>

            {/* Badge Dinâmica de Status da Competência */}
            <div className="flex items-center gap-2">
              {isCurrentMonth ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Em Aberto / Parcial
                </span>
              ) : isPastMonth ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Fechado / Consolidado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-800 text-slate-300 border border-slate-700">
                  <Clock className="w-3.5 h-3.5" />
                  Previsto
                </span>
              )}
            </div>
          </div>

          {/* Centro: Total Geral Desembolsado & Explicação */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">
                Total Geral Desembolsado na Competência
              </span>

              <div className="text-3xl sm:text-5xl font-black tracking-tight text-white font-tnum tabular-nums">
                {loading ? (
                  <div className="h-12 w-64 bg-slate-800/80 rounded-2xl animate-pulse" />
                ) : (
                  brl(data?.totalExpense || 0)
                )}
              </div>

              {/* Aviso explicativo dinâmico */}
              {isCurrentMonth ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-1.5 w-fit mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Mês em andamento — sujeito a alterações até o fechamento.</span>
                </div>
              ) : isPastMonth ? (
                <p className="text-xs text-slate-400 mt-1">
                  Competência finalizada — todos os desembolsos apurados e consolidados.
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-1">
                  Competência futura — lançamentos preliminares e previsões programadas.
                </p>
              )}
            </div>

            {/* Ação Rápida: Abrir Detalhamento */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDetailModalOpen(true)}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider shadow-sm shadow-indigo-600/30 transition-all hover:scale-[1.01] cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                Ver Detalhamento do Mês
              </button>
            </div>
          </div>

          {/* Rodapé do Card: Comparativo com o Mês Anterior */}
          {!loading && data && (
            <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-3 text-xs">
              {data.diffPercentage !== null ? (
                <>
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-black text-xs border ${
                      data.diffPercentage > 0
                        ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                        : data.diffPercentage < 0
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : "bg-slate-800 text-slate-300 border-slate-700"
                    }`}
                  >
                    {data.diffPercentage > 0 ? (
                      <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                    ) : data.diffPercentage < 0 ? (
                      <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                    ) : null}
                    <span>
                      {data.diffPercentage > 0 ? `+${data.diffPercentage}%` : `${data.diffPercentage}%`} vs mês anterior
                    </span>
                  </div>

                  <span className="text-slate-400 text-xs">
                    {data.diffPercentage > 0
                      ? `(+${brl(data.diffAmount)} em relação ao mês anterior: ${brl(data.previousMonthTotal)})`
                      : data.diffPercentage < 0
                      ? `(-${brl(Math.abs(data.diffAmount))} em relação ao mês anterior: ${brl(data.previousMonthTotal)})`
                      : `(Desembolso idêntico ao mês anterior: ${brl(data.previousMonthTotal)})`}
                  </span>
                </>
              ) : (
                <span className="text-slate-400 text-xs">
                  Sem base de comparação anterior para esta competência.
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── 2. Histórico de Fechamentos Mensais (Tabela de Competências) ──────── */}
      <section className="bg-white dark:bg-slate-900/80 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                Histórico de Fechamentos Mensais
              </h3>
              <p className="text-xs text-slate-400">
                Consulta consolidada de competências, desembolsos e evolução comparativa de {selectedYear}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold">
              Ano {selectedYear}
            </span>
          </div>
        </div>

        {/* Tabela de Fechamentos */}
        {loading ? (
          <div className="flex flex-col gap-2.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : !data || data.monthlyClosingsHistory.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-semibold flex flex-col items-center justify-center gap-2">
            <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-700" />
            <span>Nenhum fechamento registrado para este período.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider bg-slate-50/50 dark:bg-slate-950/40">
                  <th className="py-3 px-3.5 whitespace-nowrap">Competência</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Total Geral Desembolsado</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Comparativo vs. Mês Anterior</th>
                  <th className="py-3 px-3.5 text-center whitespace-nowrap">Status</th>
                  <th className="py-3 px-3.5 text-right whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {data.monthlyClosingsHistory.map((item) => {
                  const isSelected = item.month === selectedMonth && item.year === selectedYear;
                  const isCurrent = item.isCurrent;

                  return (
                    <tr
                      key={`${item.year}-${item.month}`}
                      className={`transition-all ${
                        isCurrent
                          ? "bg-amber-50/50 dark:bg-amber-950/20 ring-1 ring-amber-500/30 border-l-4 border-l-amber-500"
                          : isSelected
                          ? "bg-indigo-50/60 dark:bg-indigo-950/30 border-l-4 border-l-indigo-600"
                          : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      {/* 1. Competência */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`font-black text-xs ${isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-900 dark:text-white"}`}>
                            {item.label}
                          </span>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 uppercase tracking-wide">
                              ● Mês Atual
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Total Geral Desembolsado */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-black text-sm text-slate-900 dark:text-white tabular-nums">
                            {brl(item.totalExpense)}
                          </span>
                          <span className="text-[10px] text-slate-400 tabular-nums">
                            Crédito: {brl(item.creditTotal)} • Débito: {brl(item.debitTotal)}
                          </span>
                        </div>
                      </td>

                      {/* 3. Comparativo com o Mês Anterior */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        {item.diffPercentage !== null ? (
                          <div className="flex items-center gap-1.5 font-bold">
                            {item.diffPercentage > 0 ? (
                              <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                                <TrendingUp className="w-3.5 h-3.5" />
                                +{item.diffPercentage}% (+{brl(item.diffAmount)})
                              </span>
                            ) : item.diffPercentage < 0 ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <TrendingDown className="w-3.5 h-3.5" />
                                {item.diffPercentage}% (-{brl(Math.abs(item.diffAmount))})
                              </span>
                            ) : (
                              <span className="text-slate-500 dark:text-slate-400 font-medium">
                                Estável (0%)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* 4. Status */}
                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                        {item.status === "CLOSED" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            🟢 Fechado
                          </span>
                        ) : item.status === "OPEN" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            🟡 Em Aberto
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                            ⚪ Previsto
                          </span>
                        )}
                      </td>

                      {/* 5. Ações: Selecionar e Detalhar */}
                      <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {isSelected ? (
                            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                              ✓ Selecionado
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPeriod(item.month, item.year)}
                              className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                            >
                              Selecionar
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(item.month, item.year)}
                            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
                            title="Abrir detalhamento desta competência"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── 3. Gráfico: Evolução dos Últimos 6 Meses (Crédito vs. Débito) ────────── */}
      <section className="bg-white dark:bg-slate-900/80 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Evolução dos Últimos 6 Meses (Crédito vs. Débito)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparativo de gastos mês a mês discriminando o peso de cada modalidade.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
              <span className="w-3 h-3 rounded-md bg-indigo-500 inline-block" /> Crédito
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block" /> Débito / Pix
            </span>
          </div>
        </div>

        {loading ? (
          <div className="h-44 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
        ) : !data || data.history6Months.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            Nenhum histórico disponível para o período.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2">
            {data.history6Months.map((item, idx) => {
              const isSelected = item.month === selectedMonth && item.year === selectedYear;
              const creditH = maxHistoryTotal > 0 ? (item.creditTotal / maxHistoryTotal) * 100 : 0;
              const debitH = maxHistoryTotal > 0 ? (item.debitTotal / maxHistoryTotal) * 100 : 0;

              return (
                <div
                  key={idx}
                  onClick={() => setPeriod(item.month, item.year)}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-xs ring-1 ring-indigo-500/20"
                      : "border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-extrabold ${isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"}`}>
                      {item.label}
                    </span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    )}
                  </div>

                  {/* Barras visuais */}
                  <div className="h-24 flex items-end justify-center gap-2 pt-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
                    {/* Barra Crédito */}
                    <div className="w-3 bg-slate-200 dark:bg-slate-800 h-full rounded-full overflow-hidden flex items-end">
                      <div
                        className="w-full bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ height: `${Math.max(4, creditH)}%` }}
                        title={`Crédito: ${brl(item.creditTotal)}`}
                      />
                    </div>
                    {/* Barra Débito */}
                    <div className="w-3 bg-slate-200 dark:bg-slate-800 h-full rounded-full overflow-hidden flex items-end">
                      <div
                        className="w-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ height: `${Math.max(4, debitH)}%` }}
                        title={`Débito: ${brl(item.debitTotal)}`}
                      />
                    </div>
                  </div>

                  {/* Totais do Mês */}
                  <div className="flex flex-col gap-0.5 text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-black">
                      Total
                    </span>
                    <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums">
                      {brl(item.total)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 4. Modal de Detalhamento da Competência ─────────────────────────── */}
      {detailModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Cabeçalho do Modal */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Detalhamento de Fechamento • {MONTH_NAMES[selectedMonth - 1]}/{selectedYear}
                    </h3>
                    {isCurrentMonth ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        Em Aberto
                      </span>
                    ) : (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Fechado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Discriminação completa de faturas de cartão de crédito e contas bancárias.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Subtotais Rápidos no Modal */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-5 sm:p-6 pb-2 bg-slate-50/50 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800">
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Total Geral</span>
                <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                  {brl(data?.totalExpense || 0)}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-950">
                <span className="text-[10px] font-black uppercase text-indigo-500 block">Cartão de Crédito</span>
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {brl(data?.creditTotal || 0)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">{creditShare}% do total</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-950">
                <span className="text-[10px] font-black uppercase text-emerald-500 block">Débito & Pix</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {brl(data?.debitTotal || 0)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">{debitShare}% do total</span>
              </div>
            </div>

            {/* Conteúdo com Scroll: Listas de Cartões e Contas */}
            <div className="p-5 sm:p-6 overflow-y-auto max-h-[55vh] flex flex-col gap-6">
              
              {/* Seção Cartões */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                  Cartões de Crédito ({data?.creditCards.length || 0})
                </h4>

                {!data || data.creditCards.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    Nenhum lançamento no cartão neste mês.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {data.creditCards.map((card) => {
                      const isExpanded = !!expandedCards[card.walletId];
                      return (
                        <div
                          key={card.walletId}
                          className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-950/40"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">
                                {card.name}
                              </h5>
                              <span className="text-[10px] text-slate-400">
                                {card.bankName || "Cartão"} • {card.count} {card.count === 1 ? "compra" : "compras"}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums block">
                                {brl(card.total)}
                              </span>
                              <span className="text-[10px] text-indigo-500 font-bold">
                                {card.percentage}% do crédito
                              </span>
                            </div>
                          </div>

                          {card.transactions.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleCard(card.walletId)}
                              className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] font-bold text-slate-500 hover:text-indigo-600 transition-colors w-full cursor-pointer"
                            >
                              <span>
                                {isExpanded
                                  ? "Ocultar lançamentos da fatura"
                                  : `Ver ${card.transactions.length} lançamentos`}
                              </span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}

                          {isExpanded && card.transactions.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                              {card.transactions.map((tx) => (
                                <div
                                  key={tx.id}
                                  className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                      {formatDateBR(tx.date)}
                                    </span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                      {tx.description}
                                    </span>
                                    {tx.installment && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                                        {tx.installment}
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap ml-2">
                                    {brl(tx.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Seção Contas Bancárias */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                  Contas Bancárias ({data?.bankAccounts.length || 0})
                </h4>

                {!data || data.bankAccounts.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    Nenhuma saída bancária neste mês.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {data.bankAccounts.map((acc) => {
                      const isExpanded = !!expandedAccounts[acc.walletId];
                      return (
                        <div
                          key={acc.walletId}
                          className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-950/40"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">
                                {acc.name}
                              </h5>
                              <span className="text-[10px] text-slate-400">
                                {acc.bankName || "Conta"} • {acc.count} {acc.count === 1 ? "saída" : "saídas"}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums block">
                                {brl(acc.total)}
                              </span>
                              <span className="text-[10px] text-emerald-500 font-bold">
                                {acc.percentage}% do débito
                              </span>
                            </div>
                          </div>

                          {acc.transactions.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleAccount(acc.walletId)}
                              className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] font-bold text-slate-500 hover:text-emerald-600 transition-colors w-full cursor-pointer"
                            >
                              <span>
                                {isExpanded
                                  ? "Ocultar saídas da conta"
                                  : `Ver ${acc.transactions.length} saídas`}
                              </span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}

                          {isExpanded && acc.transactions.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                              {acc.transactions.map((tx) => (
                                <div
                                  key={tx.id}
                                  className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                      {formatDateBR(tx.date)}
                                    </span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                      {tx.description}
                                    </span>
                                    {tx.paymentMethod && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                        {tx.paymentMethod}
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap ml-2">
                                    {brl(tx.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-950/30">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Fechar Detalhamento
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
