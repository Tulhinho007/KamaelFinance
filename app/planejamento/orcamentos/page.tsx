"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Pencil, ArrowLeft, X, Plus, PieChart, AlertTriangle, CheckCircle2
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
        editLimitAmount === "" ? 0 : Number(editLimitAmount)
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
    <div className="p-6 md:p-10 max-w-5xl mx-auto flex flex-col gap-8 select-none font-sans text-slate-900 dark:text-white">

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
            Limites mensais fixos recorrentes para controlar despesas por categoria em tempo real.
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

      {/* Painel Central Minimalista: Lista de Linhas com Barras Horizontais */}
      <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
            Categorias de Despesa ({data?.budgets?.length || 0})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Acompanhe o consumo mensal em relação ao teto fixo recorrente de cada categoria.
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 font-medium">Carregando orçamentos por categoria...</div>
        ) : (
          <div className="space-y-2.5">
            {data?.budgets.map((b: CategoryBudgetOverview) => {
              const hasLimit = b.maxAmount > 0;
              const isExceeded = b.status === "EXCEEDED";
              const isWarning = b.status === "WARNING";

              return (
                <div
                  key={b.categoryId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 hover:border-indigo-500/30 transition-all group"
                >
                  {/* Nome da Categoria + Cor */}
                  <div className="flex items-center gap-3 w-48 shrink-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: b.categoryColor }}
                    />
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {b.categoryName}
                    </span>
                  </div>

                  {/* Central: Barra de Progresso Horizontal */}
                  {hasLimit ? (
                    <div className="flex-1 space-y-1 min-w-[160px]">
                      <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300/40 dark:border-slate-700/50">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            isExceeded
                              ? "bg-rose-500 animate-pulse"
                              : isWarning
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(100, b.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-[160px] text-left sm:text-center">
                      <span className="text-[11px] font-semibold text-slate-400 italic">
                        Sem limite setado
                      </span>
                    </div>
                  )}

                  {/* Direita: Valores + Porcentagem + Botão Lápis / + Criar Teto */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 w-52 shrink-0">
                    {hasLimit ? (
                      <>
                        <div className="text-right">
                          <span className="font-black text-xs text-slate-900 dark:text-white font-tnum block">
                            {brl(b.spentAmount)} / {brl(b.maxAmount)}
                          </span>
                          <span className={`text-[10px] font-extrabold ${isExceeded ? "text-rose-500" : isWarning ? "text-amber-500" : "text-emerald-500"}`}>
                            {b.percentage}% {isExceeded ? "(Estourado)" : isWarning ? "(Alerta)" : "(OK)"}
                          </span>
                        </div>

                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 opacity-80 group-hover:opacity-100"
                          title="Editar Teto Recorrente"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="font-black text-xs text-slate-900 dark:text-white font-tnum">
                          {brl(b.spentAmount)}
                        </span>

                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-extrabold text-[11px] border border-indigo-200/60 dark:border-indigo-800/60 hover:bg-indigo-100 transition-all cursor-pointer shrink-0"
                        >
                          + Criar teto
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
                  Este teto é fixo e recorrente para a categoria. Deixe 0 ou em branco para remover o teto.
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
