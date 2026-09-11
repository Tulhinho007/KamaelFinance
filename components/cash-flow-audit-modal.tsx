"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Receipt,
  Info,
} from "lucide-react";
import { CurrencyValue } from "@/components/currency-value";

export interface CashFlowAuditItem {
  id: string;
  name: string;
  amount: number;
  rawDate: string;
  dateFormatted: string;
  source?: string;
  category?: string;
  isBill?: boolean;
}

export interface CashFlowAuditHorizonData {
  saldoInicial: number;
  totalEntradas: number;
  totalSaidas: number;
  saldoProjetado: number;
  incomes: CashFlowAuditItem[];
  expenses: CashFlowAuditItem[];
}

interface CashFlowAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  horizon: "D+30" | "D+60";
  auditData: CashFlowAuditHorizonData | null;
}

export function CashFlowAuditModal({
  isOpen,
  onClose,
  horizon,
  auditData,
}: CashFlowAuditModalProps) {
  const [activeTab, setActiveTab] = useState<"expenses" | "incomes">("expenses");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !auditData) return null;

  const daysLabel = horizon === "D+30" ? "30 dias" : "60 dias";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#111625] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col text-slate-900 dark:text-white animate-in zoom-in-95 duration-150">
        
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                horizon === "D+30"
                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40"
                  : "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/40"
              }`}
            >
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Auditoria da Projeção
                </h3>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                    horizon === "D+30"
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/60"
                      : "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60"
                  }`}
                >
                  {horizon} ({daysLabel})
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Demonstrativo de cálculo e lançamentos considerados nos próximos {daysLabel}.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto">
          
          {/* 1. Fórmula Resumida em Destaque */}
          <div className="flex flex-col gap-2">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
              <span>Fórmula:</span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold">
                Saldo Atual + Entradas Previstas - Contas & Faturas a Vencer = Projeção
              </span>
            </div>

            {/* Grid dos 4 blocos da decomposição matemática */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Saldo Inicial */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Saldo Inicial
                </span>
                <div className="my-1">
                  <CurrencyValue
                    value={auditData.saldoInicial}
                    className="text-sm sm:text-base font-black text-slate-900 dark:text-white tabular-nums font-tnum"
                  />
                </div>
                <span className="text-[9px] text-slate-400 font-medium">
                  Contas hoje
                </span>
              </div>

              {/* (+) Entradas Previstas */}
              <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  (+) Entradas
                </span>
                <div className="my-1">
                  <CurrencyValue
                    value={auditData.totalEntradas}
                    prefix="+"
                    className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums font-tnum"
                  />
                </div>
                <span className="text-[9px] text-emerald-600/80 dark:text-emerald-400 font-medium">
                  {auditData.incomes.length} {auditData.incomes.length === 1 ? "receita" : "receitas"}
                </span>
              </div>

              {/* (-) Saídas Previstas */}
              <div className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                  (-) Saídas
                </span>
                <div className="my-1">
                  <CurrencyValue
                    value={auditData.totalSaidas}
                    prefix="-"
                    className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400 tabular-nums font-tnum"
                  />
                </div>
                <span className="text-[9px] text-rose-600/80 dark:text-rose-400 font-medium">
                  {auditData.expenses.length} {auditData.expenses.length === 1 ? "compromisso" : "compromissos"}
                </span>
              </div>

              {/* (=) Saldo Projetado */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                  auditData.saldoProjetado < 0
                    ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50"
                    : horizon === "D+30"
                    ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200/70 dark:border-indigo-900/50"
                    : "bg-purple-50/70 dark:bg-purple-950/40 border-purple-200/70 dark:border-purple-900/50"
                }`}
              >
                <span
                  className={`text-[10px] font-black uppercase tracking-wider ${
                    auditData.saldoProjetado < 0
                      ? "text-rose-700 dark:text-rose-300"
                      : horizon === "D+30"
                      ? "text-indigo-700 dark:text-indigo-300"
                      : "text-purple-700 dark:text-purple-300"
                  }`}
                >
                  (=) Saldo {horizon}
                </span>
                <div className="my-1">
                  <CurrencyValue
                    value={auditData.saldoProjetado}
                    className={`text-sm sm:text-base font-black tabular-nums font-tnum ${
                      auditData.saldoProjetado < 0
                        ? "text-rose-600 dark:text-rose-400"
                        : horizon === "D+30"
                        ? "text-indigo-600 dark:text-indigo-300"
                        : "text-purple-600 dark:text-purple-300"
                    }`}
                  />
                </div>
                <span
                  className={`text-[9px] font-bold ${
                    auditData.saldoProjetado < 0 ? "text-rose-500" : "text-slate-400"
                  }`}
                >
                  {auditData.saldoProjetado < 0 ? "Saldo negativo" : "Estimado"}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Lista Discriminada de Transações Consideradas na Janela */}
          <div className="flex flex-col gap-2">
            {/* Toggle Abas (Saídas vs Entradas) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab("expenses")}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  activeTab === "expenses"
                    ? "bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <span>Saídas na Janela</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === "expenses"
                      ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/60"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {auditData.expenses.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("incomes")}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  activeTab === "incomes"
                    ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <span>Entradas na Janela</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === "incomes"
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/60"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {auditData.incomes.length}
                </span>
              </button>
            </div>

            {/* Container da Lista com Scroll */}
            <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 divide-y divide-slate-100 dark:divide-slate-800/80">
              {activeTab === "expenses" ? (
                auditData.expenses.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 font-medium">
                    Nenhuma fatura ou saída prevista para esta janela.
                  </div>
                ) : (
                  auditData.expenses.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 sm:p-3 flex items-center justify-between gap-3 hover:bg-slate-100/60 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                            item.isBill
                              ? "bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/60"
                              : "bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/60"
                          }`}
                        >
                          {item.isBill ? (
                            <CreditCard className="w-3.5 h-3.5" />
                          ) : (
                            <Receipt className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {item.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                            <span className="font-semibold text-slate-500 dark:text-slate-400">
                              {item.dateFormatted}
                            </span>
                            {item.source && (
                              <>
                                <span>•</span>
                                <span className="truncate">{item.source}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <CurrencyValue
                          value={item.amount}
                          prefix="-"
                          className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400 tabular-nums font-tnum"
                        />
                      </div>
                    </div>
                  ))
                )
              ) : auditData.incomes.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-medium">
                  Nenhuma receita prevista para esta janela.
                </div>
              ) : (
                auditData.incomes.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 sm:p-3 flex items-center justify-between gap-3 hover:bg-slate-100/60 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/60">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {item.name}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                          <span className="font-semibold text-slate-500 dark:text-slate-400">
                            {item.dateFormatted}
                          </span>
                          {item.source && (
                            <>
                              <span>•</span>
                              <span className="truncate">{item.source}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <CurrencyValue
                        value={item.amount}
                        prefix="+"
                        className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums font-tnum"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="line-clamp-1">
              Valores calculados em tempo real com base no saldo e lançamentos agendados.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
