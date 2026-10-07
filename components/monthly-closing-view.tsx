"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Receipt,
  PieChart,
  Wallet,
  ArrowUpRight,
  Layers,
  Sparkles,
  BarChart3,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { usePeriod } from "@/components/period-context";
import {
  getMonthlyClosingExpensesAction,
  MonthlyClosingExpensesData,
  CardClosingItem,
  AccountClosingItem,
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
  const isCurrentMonth =
    selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear();

  const creditShare =
    data && data.totalExpense > 0
      ? Math.round((data.creditTotal / data.totalExpense) * 100)
      : 0;
  const debitShare =
    data && data.totalExpense > 0 ? 100 - creditShare : 0;

  // Encontra o valor máximo para a escala do gráfico de 6 meses
  const maxHistoryTotal =
    data && data.history6Months.length > 0
      ? Math.max(...data.history6Months.map((h) => h.total), 1)
      : 1;

  return (
    <div className="flex flex-col gap-6 md:gap-8 font-sans text-slate-900 dark:text-slate-100">
      
      {/* ── 1. Seletor de Período ──────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block">
              Período de Fechamento
            </span>
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              {MONTH_NAMES[selectedMonth - 1]} de {selectedYear}
            </h2>
          </div>
        </div>

        {/* Controles de Navegação */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5">
            <select
              value={selectedMonth}
              onChange={(e) => setPeriod(Number(e.target.value), selectedYear)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setPeriod(selectedMonth, Number(e.target.value))}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={nextMonth}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {!isCurrentMonth && (
            <button
              type="button"
              onClick={goToCurrentMonth}
              className="px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-colors cursor-pointer ml-1"
            >
              Mês Atual
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Card de Destaque Superior ────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-950/80 border border-indigo-700/50 px-2.5 py-0.5 rounded-full">
                Consolidado Mensal
              </span>
              <span className="text-xs text-slate-400">
                • {MONTH_NAMES[selectedMonth - 1]}/{selectedYear}
              </span>
            </div>

            <h1 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Total Geral Desembolsado no Mês
            </h1>

            <div className="text-3xl sm:text-5xl font-black tracking-tight text-white font-tnum tabular-nums mt-1">
              {loading ? (
                <div className="h-12 w-64 bg-slate-800 rounded-xl animate-pulse" />
              ) : (
                brl(data?.totalExpense || 0)
              )}
            </div>

            <p className="text-xs text-slate-400 max-w-xl">
              Soma de todas as compras lançadas nas faturas de cartão de crédito e todas as saídas liquidadas das contas correntes no período.
            </p>
          </div>

          {/* Cards dos Dois Modais (Crédito vs Débito) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-auto shrink-0">
            {/* Bloco Crédito */}
            <div className="bg-white/5 border border-indigo-500/20 rounded-2xl p-4 flex flex-col gap-1 backdrop-blur-xs min-w-[200px]">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                Cartão de Crédito
              </span>
              <span className="text-xl font-black text-indigo-100 tabular-nums">
                {loading ? "..." : brl(data?.creditTotal || 0)}
              </span>
              <span className="text-[11px] font-bold text-indigo-300/80">
                {creditShare}% do desembolso mensal
              </span>
            </div>

            {/* Bloco Débito & Pix */}
            <div className="bg-white/5 border border-emerald-500/20 rounded-2xl p-4 flex flex-col gap-1 backdrop-blur-xs min-w-[200px]">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                Débito & Pix (Contas)
              </span>
              <span className="text-xl font-black text-emerald-100 tabular-nums">
                {loading ? "..." : brl(data?.debitTotal || 0)}
              </span>
              <span className="text-[11px] font-bold text-emerald-300/80">
                {debitShare}% do desembolso mensal
              </span>
            </div>
          </div>
        </div>

        {/* Barra proporcional de divisão de modalidade */}
        {!loading && data && data.totalExpense > 0 && (
          <div className="relative z-10 mt-6 pt-5 border-t border-slate-800/80 flex flex-col gap-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-indigo-300 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                Crédito: {creditShare}%
              </span>
              <span className="text-emerald-300 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Débito / Pix: {debitShare}%
              </span>
            </div>
            <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${creditShare}%` }}
                className="h-full bg-indigo-500 transition-all duration-500"
                title={`Crédito: ${creditShare}%`}
              />
              <div
                style={{ width: `${debitShare}%` }}
                className="h-full bg-emerald-500 transition-all duration-500"
                title={`Débito: ${debitShare}%`}
              />
            </div>
          </div>
        )}
      </section>

      {/* ── 3. Painel Comparativo (Grid de 2 Colunas) ────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ── BLOCO 1: CRÉDITO ──────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900/80 rounded-3xl border border-indigo-100 dark:border-indigo-950/60 p-5 sm:p-6 shadow-xs flex flex-col gap-5">
          <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  Gastos em Cartão de Crédito
                </h3>
                <p className="text-xs text-slate-400">
                  Faturas de compras e parcelas correspondentes ao mês
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] font-black uppercase text-indigo-500 block">
                Total Crédito
              </span>
              <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                {loading ? "..." : brl(data?.creditTotal || 0)}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
              <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
            </div>
          ) : !data || data.creditCards.length === 0 || data.creditTotal === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-semibold flex flex-col items-center justify-center gap-2">
              <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-700" />
              <span>Nenhum gasto registrado em cartões de crédito neste período.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {data.creditCards.map((card) => {
                const isExpanded = !!expandedCards[card.walletId];
                return (
                  <div
                    key={card.walletId}
                    className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-950/40 hover:border-indigo-500/30 transition-all flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                            {card.name}
                          </h4>
                          {card.bankName && (
                            <span className="text-[10px] font-bold text-slate-400 block truncate">
                              {card.bankName} • {card.count} {card.count === 1 ? "compra" : "compras"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums block">
                          {brl(card.total)}
                        </span>
                        <span className="inline-block text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800/40">
                          {card.percentage}% do crédito
                        </span>
                      </div>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="w-full bg-slate-200/70 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, card.percentage)}%` }}
                      />
                    </div>

                    {/* Botão de Expansão de Itens */}
                    {card.transactions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleCard(card.walletId)}
                        className="flex items-center justify-between pt-1 text-[11px] font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                      >
                        <span>
                          {isExpanded
                            ? "Ocultar lançamentos da fatura"
                            : `Ver ${card.transactions.length} lançamentos da fatura`}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}

                    {/* Lista Expandida de Lançamentos */}
                    {isExpanded && card.transactions.length > 0 && (
                      <div className="mt-2 border-t border-slate-200/70 dark:border-slate-800/80 pt-2 flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                        {card.transactions.map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
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

        {/* ── BLOCO 2: DÉBITO & PIX ─────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900/80 rounded-3xl border border-emerald-100 dark:border-emerald-950/60 p-5 sm:p-6 shadow-xs flex flex-col gap-5">
          <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  Gastos em Débito & Pix (Contas)
                </h3>
                <p className="text-xs text-slate-400">
                  Saídas efetivadas diretamente de contas bancárias
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 block">
                Total Débito
              </span>
              <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                {loading ? "..." : brl(data?.debitTotal || 0)}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
              <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
            </div>
          ) : !data || data.bankAccounts.length === 0 || data.debitTotal === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-semibold flex flex-col items-center justify-center gap-2">
              <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-700" />
              <span>Nenhuma saída registrada em contas bancárias neste período.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {data.bankAccounts.map((account) => {
                const isExpanded = !!expandedAccounts[account.walletId];
                return (
                  <div
                    key={account.walletId}
                    className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-950/40 hover:border-emerald-500/30 transition-all flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                            {account.name}
                          </h4>
                          {account.bankName && (
                            <span className="text-[10px] font-bold text-slate-400 block truncate">
                              {account.bankName} • {account.count} {account.count === 1 ? "saída" : "saídas"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums block">
                          {brl(account.total)}
                        </span>
                        <span className="inline-block text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
                          {account.percentage}% do débito
                        </span>
                      </div>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="w-full bg-slate-200/70 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 dark:bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, account.percentage)}%` }}
                      />
                    </div>

                    {/* Botão de Expansão de Itens */}
                    {account.transactions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleAccount(account.walletId)}
                        className="flex items-center justify-between pt-1 text-[11px] font-bold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                      >
                        <span>
                          {isExpanded
                            ? "Ocultar lançamentos da conta"
                            : `Ver ${account.transactions.length} saídas da conta`}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}

                    {/* Lista Expandida de Lançamentos */}
                    {isExpanded && account.transactions.length > 0 && (
                      <div className="mt-2 border-t border-slate-200/70 dark:border-slate-800/80 pt-2 flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                        {account.transactions.map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
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

      </section>

      {/* ── 4. Histórico Rápido (Últimos 6 Meses) ─────────────────────────────── */}
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
                      ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-xs"
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

    </div>
  );
}
