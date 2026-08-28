"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Pencil, ArrowLeft, X, Coins, AlertTriangle, CheckCircle2, ShieldCheck
} from "lucide-react";
import {
  getCategoryBudgetsOverviewAction,
  saveCategoryBudgetAction,
  CategoryBudgetOverview
} from "@/lib/budget-actions";
import { useModal } from "@/components/ui/custom-dialog-provider";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CategoryBudgetsPage() {
  const { showAlert } = useModal();

  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear]   = useState<number>(new Date().getFullYear());

  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState<any>(null);

  // Modal de edição do teto
  const [editingBudget, setEditingBudget] = useState<CategoryBudgetOverview | null>(null);
  const [editLimitAmount, setEditLimitAmount] = useState<number | "">("");
  const [saving, setSaving]                   = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getCategoryBudgetsOverviewAction(month, year);
      setData(res);
    } catch (e) {
      console.error("Erro ao carregar orçamentos:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [month, year]);

  const handleOpenEdit = (b: CategoryBudgetOverview) => {
    setEditingBudget(b);
    setEditLimitAmount(b.maxAmount > 0 ? b.maxAmount : "");
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudget) return;

    setSaving(true);
    try {
      await saveCategoryBudgetAction(
        editingBudget.categoryId,
        editLimitAmount === "" ? 0 : Number(editLimitAmount),
        month,
        year
      );
      await loadData();
      setEditingBudget(null);
    } catch (err) {
      console.error(err);
      showAlert("Erro ao salvar teto de gastos.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const MONTH_NAMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto flex flex-col gap-8 select-none font-sans text-slate-900 dark:text-white">

      {/* Header com Navegação e Seletor de Mês */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/planejamento"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Orçamento por Categorias (Teto de Gastos)
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium pl-11">
            Limites mensais recorrentes para controlar despesas por categoria em tempo real.
          </p>
        </div>

        {/* Seletor de Período */}
        <div className="flex items-center gap-3">
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {MONTH_NAMES.map((m, idx) => (
              <option key={idx + 1} value={idx + 1}>{m}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {[2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards de Resumo */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Orçado</span>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-tnum">{brl(data.summary.totalBudget)}</p>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Soma dos limites recorrentes</span>
          </div>

          <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Consumido</span>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 font-tnum">{brl(data.summary.totalSpent)}</p>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{data.summary.overallPercentage}% do teto total consumido</span>
          </div>

          <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Status dos Limites</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">
                {data.summary.exceededCount} estouradas
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                {data.summary.warningCount} em alerta
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Grid de Cards de Categorias */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 font-medium">Carregando orçamentos por categoria...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {data?.budgets.map((b: CategoryBudgetOverview) => {
            const hasLimit = b.maxAmount > 0;
            const isExceeded = b.status === "EXCEEDED";
            const isWarning = b.status === "WARNING";

            return (
              <div
                key={b.categoryId}
                onClick={() => handleOpenEdit(b)}
                className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-3 hover:border-indigo-500/40 transition-all cursor-pointer group"
              >
                <div>
                  {/* Cabeçalho do Card */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: b.categoryColor }}
                      />
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">{b.categoryName}</h3>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(b);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Editar Teto de Gastos"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Gastos vs Teto */}
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-lg font-black text-slate-900 dark:text-white font-tnum">
                      {brl(b.spentAmount)}
                    </span>
                    {hasLimit ? (
                      <span className="text-xs font-bold text-slate-400 font-tnum">
                        / {brl(b.maxAmount)}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                        Sem limite
                      </span>
                    )}
                  </div>

                  {/* Barra de Progresso Sutil com Feedback Imediato de Cores */}
                  <div className="mt-2.5 space-y-1.5">
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          !hasLimit
                            ? "bg-slate-300 dark:bg-slate-700 opacity-30"
                            : isExceeded
                            ? "bg-rose-500 animate-pulse"
                            : isWarning
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${hasLimit ? Math.min(100, b.percentage) : 0}%` }}
                      />
                    </div>

                    {hasLimit && (
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className={isExceeded ? "text-rose-500" : isWarning ? "text-amber-500" : "text-emerald-500"}>
                          {isExceeded ? "🚨 Teto Estourado" : isWarning ? "⚠️ Alerta (≥80%)" : "✓ Dentro do teto"}
                        </span>
                        <span className="text-slate-400 font-tnum">{b.percentage}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Edição do Teto Recorrente */}
      {editingBudget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Definir Teto para {editingBudget.categoryName}
              </h3>
              <button
                onClick={() => setEditingBudget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Limite Máximo Recorrente (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editLimitAmount}
                  onChange={e => setEditLimitAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Ex: 500.00"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Este teto será aplicado recorrentemente a todos os meses. Deixe em branco ou 0 para remover o teto.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBudget(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-extrabold text-xs shadow-md transition-all cursor-pointer"
                >
                  {saving ? "Salvando..." : "Salvar Teto Recorrente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
