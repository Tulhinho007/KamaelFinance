"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Search,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Copy,
  TrendingDown,
  Sparkles,
  X,
  PieChart,
  Filter,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Zap,
  HelpCircle
} from "lucide-react";
import { usePeriod } from "@/components/period-context";
import { PeriodHeader } from "@/components/period-header";
import {
  getMonthlyBudgetDataAction,
  updateCategoryBudgetAction,
  copyBudgetsFromPreviousMonthAction,
  batchUpdateCategoryBudgetsAction,
  MonthlyBudgetOverview,
  CategoryBudgetItem
} from "@/lib/budget-actions";

const brl = (v: number) =>
  (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function OrcamentosPage() {
  const { selectedMonth, selectedYear } = usePeriod();

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<MonthlyBudgetOverview | null>(null);

  // Modal Explicativo (Help Modal)
  const [helpModalOpen, setHelpModalOpen] = useState<boolean>(false);

  // Filtros (Padronizado para exibir apenas categorias COM LIMITE por padrao)
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "WITH_LIMIT" | "WARNING" | "DANGER" | "NO_LIMIT"
  >("WITH_LIMIT");

  // State do Modal de Edição de Limite Individual
  const [editingCategory, setEditingCategory] =
    useState<CategoryBudgetItem | null>(null);
  const [inputLimit, setInputLimit] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [copying, setCopying] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // State do Modal de Gestão em Lote
  const [bulkModalOpen, setBulkModalOpen] = useState<boolean>(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);
  const [bulkInputLimit, setBulkInputLimit] = useState<string>("");
  const [bulkSaving, setBulkSaving] = useState<boolean>(false);

  const fetchBudgetData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMonthlyBudgetDataAction({
        month: selectedMonth,
        year: selectedYear,
      });
      setData(res);
    } catch (err) {
      console.error("Erro ao buscar orçamentos:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchBudgetData();
  }, [fetchBudgetData]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenEditModal = (cat: CategoryBudgetItem) => {
    setEditingCategory(cat);
    setInputLimit(cat.budgetLimit > 0 ? cat.budgetLimit.toString() : "");
  };

  const handleSaveBudget = async () => {
    if (!editingCategory) return;
    setSaving(true);
    try {
      const val = parseFloat(inputLimit.replace(",", ".")) || 0;
      const res = await updateCategoryBudgetAction({
        categoryId: editingCategory.categoryId,
        maxAmount: val,
        month: selectedMonth,
        year: selectedYear,
      });

      if (res.success) {
        showToast(
          val > 0
            ? `Teto para ${editingCategory.categoryName} atualizado com sucesso!`
            : `Teto de ${editingCategory.categoryName} removido.`
        );
        setEditingCategory(null);
        await fetchBudgetData();
      } else {
        alert(res.error || "Erro ao salvar.");
      }
    } catch (err) {
      console.error("Erro ao salvar limite:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyFromPrevious = async () => {
    setCopying(true);
    try {
      const res = await copyBudgetsFromPreviousMonthAction({
        month: selectedMonth,
        year: selectedYear,
      });
      if (res.success) {
        showToast(
          `${res.count} orçamentos copiados do mês anterior com sucesso!`
        );
        await fetchBudgetData();
      } else {
        alert(res.error || "Erro ao copiar orçamentos.");
      }
    } catch (err) {
      console.error("Erro ao copiar orçamentos:", err);
    } finally {
      setCopying(false);
    }
  };

  // Handler de Aplicação / Remoção de Limites em Lote
  const handleBatchSaveBudget = async (maxAmountValue: number) => {
    if (bulkSelectedIds.length === 0) {
      alert("Selecione ao menos uma categoria para aplicar as alterações em lote.");
      return;
    }
    setBulkSaving(true);
    try {
      const res = await batchUpdateCategoryBudgetsAction({
        categoryIds: bulkSelectedIds,
        maxAmount: maxAmountValue,
        month: selectedMonth,
        year: selectedYear,
      });

      if (res.success) {
        showToast(
          maxAmountValue > 0
            ? `Limite de ${brl(maxAmountValue)} aplicado para ${res.count} categorias!`
            : `Limites de ${res.count} categorias removidos com sucesso.`
        );
        setBulkModalOpen(false);
        setBulkSelectedIds([]);
        setBulkInputLimit("");
        await fetchBudgetData();
      } else {
        alert(res.error || "Erro ao salvar alterações em lote.");
      }
    } catch (err) {
      console.error("Erro ao salvar em lote:", err);
    } finally {
      setBulkSaving(false);
    }
  };

  // Filtragem e Ordenação por Gasto Real Decrescente
  const filteredCategories = (data?.categories || [])
    .filter((cat) => {
      const matchesSearch = cat.categoryName
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      let matchesStatus = true;
      if (statusFilter === "WITH_LIMIT") matchesStatus = cat.budgetLimit > 0;
      else if (statusFilter === "WARNING") matchesStatus = cat.status === "WARNING";
      else if (statusFilter === "DANGER") matchesStatus = cat.status === "DANGER";
      else if (statusFilter === "NO_LIMIT") matchesStatus = cat.status === "NO_LIMIT";

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => b.spentAmount - a.spentAmount);

  const getStatusBadge = (status: CategoryBudgetItem["status"], pct: number) => {
    if (status === "DANGER") {
      return (
        <span className="inline-flex items-center gap-1 bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
          <AlertCircle className="w-3 h-3" />
          Excedido ({pct}%)
        </span>
      );
    }
    if (status === "WARNING") {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-3 h-3" />
          Alerta ({pct}%)
        </span>
      );
    }
    if (status === "OK") {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-3 h-3" />
          Dentro do Teto ({pct}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-[10px] px-2.5 py-0.5 rounded-full">
        Sem Limite
      </span>
    );
  };

  const getProgressBarColor = (status: CategoryBudgetItem["status"]) => {
    if (status === "DANGER") return "bg-rose-500";
    if (status === "WARNING") return "bg-amber-500";
    if (status === "OK") return "bg-emerald-500";
    return "bg-slate-300 dark:bg-slate-700";
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200 text-xs font-bold">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Header com PeriodHeader e Botão de Ajuda */}
      <PeriodHeader
        title="Orçamento Mensal"
        tagline="Defina tetos de gastos por categoria e monitore o seu limite financeiro."
        badge="PLANEJAMENTO"
      >
        <button
          type="button"
          onClick={() => setHelpModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold transition-all cursor-pointer shadow-2xs"
          title="Entenda como funciona o orçamento mensal"
        >
          <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
          <span>❓ Como funciona?</span>
        </button>
      </PeriodHeader>

      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-14 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
            <div className="h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
            <div className="h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          </div>
        </div>
      ) : (
        <>
          {/* Card Resumo do Teto Geral */}
          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-4 max-w-2xl">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                    Teto Geral de Gastos do Mês
                  </h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Limite Total Planejado
                    </span>
                    <span className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
                      {brl(data?.budgetTotal || 0)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Gasto Real Atual
                    </span>
                    <span className="text-lg sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">
                      {brl(data?.spentTotal || 0)}
                    </span>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Saldo Restante
                    </span>
                    <span
                      className={`text-lg sm:text-2xl font-black ${
                        (data?.remainingTotal || 0) < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {brl(data?.remainingTotal || 0)}
                    </span>
                  </div>
                </div>

                {/* Barra de Progresso do Teto Geral */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-400">
                    <span>Progresso Geral do Orçamento</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {data?.overallPercentage || 0}% util.
                    </span>
                  </div>

                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(
                        data?.overallStatus || "OK"
                      )}`}
                      style={{
                        width: `${Math.min(data?.overallPercentage || 0, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Botões de Ação Rápida */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setBulkSelectedIds([]);
                    setBulkInputLimit("");
                    setBulkModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>⚡ Gestão em Lote</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyFromPrevious}
                  disabled={copying}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 border border-slate-200/80 dark:border-slate-700"
                >
                  <Copy className="w-4 h-4 text-indigo-500" />
                  {copying ? "Copiando..." : "Copiar do Mês Anterior"}
                </button>
              </div>
            </div>
          </div>

          {/* Bar de Busca e Filtros */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar categoria..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === "ALL"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Todas
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("WITH_LIMIT")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === "WITH_LIMIT"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Com Limite
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("WARNING")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === "WARNING"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100"
                }`}
              >
                Alerta (&ge;80%)
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("DANGER")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === "DANGER"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100"
                }`}
              >
                Excedidas (&gt;100%)
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("NO_LIMIT")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === "NO_LIMIT"
                    ? "bg-slate-700 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Sem Limite
              </button>
            </div>
          </div>

          {/* Grid de Categorias com Limite */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((cat) => (
              <div
                key={cat.categoryId}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800/80 rounded-2xl p-5 shadow-2xs transition-all duration-150 flex flex-col justify-between space-y-4 group relative"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
                      style={{ backgroundColor: cat.categoryColor }}
                    >
                      <PieChart className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {cat.categoryName}
                      </h4>
                      <div className="mt-0.5">
                        {getStatusBadge(cat.status, cat.percentage)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(cat)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-xl transition-all cursor-pointer shrink-0"
                    title="Editar Teto"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>

                {/* Dados de Gasto vs Teto */}
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-extrabold text-slate-900 dark:text-slate-100">
                      {brl(cat.spentAmount)}
                    </span>
                    <span className="font-semibold text-slate-400">
                      / {cat.budgetLimit > 0 ? brl(cat.budgetLimit) : "Sem teto"}
                    </span>
                  </div>

                  {/* Barra de Progresso Proporcional */}
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(
                        cat.status
                      )}`}
                      style={{
                        width: `${
                          cat.budgetLimit > 0
                            ? Math.min(cat.percentage, 100)
                            : cat.spentAmount > 0
                            ? 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] font-semibold pt-1">
                    {cat.budgetLimit > 0 ? (
                      cat.remainingAmount < 0 ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                          Excedido em {brl(Math.abs(cat.remainingAmount))}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Restam {brl(cat.remainingAmount)}
                        </span>
                      )
                    ) : (
                      <span className="text-slate-400 font-medium">
                        Clique no lápis para definir um limite
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredCategories.length === 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <Filter className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                Nenhuma categoria encontrada com os filtros aplicados.
              </p>
            </div>
          )}
        </>
      )}

      {/* Modal de Configuração de Teto por Categoria */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setEditingCategory(null)}
          />

          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-md space-y-5 animate-in zoom-in-95 duration-150 z-10">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
                  style={{ backgroundColor: editingCategory.categoryColor }}
                >
                  <PieChart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                    {editingCategory.categoryName}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Definir teto máximo para este mês
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                  Limite Máximo do Mês (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={inputLimit}
                    onChange={(e) => setInputLimit(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-extrabold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Presets Rápidos */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400 block">
                  Atalhos Rápidos:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {[200, 500, 1000, 1500, 2000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setInputLimit(preset.toString())}
                      className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      {brl(preset)}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setInputLimit("0")}
                    className="px-3 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-bold hover:bg-rose-100 transition-all cursor-pointer"
                  >
                    Remover Teto
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveBudget}
                disabled={saving}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-sm shadow-indigo-600/30 transition-all cursor-pointer"
              >
                {saving ? "Salvando..." : "Salvar Teto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gestão em Lote de Limites */}
      {bulkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
                  <Zap className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                    Gestão em Lote de Tetos de Gastos
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Aplique ou remova limites para múltiplas categorias de uma vez
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              {/* Seleção Múltipla / Checkbox Header */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={
                      (data?.categories || []).length > 0 &&
                      (data?.categories || []).every((cat) => bulkSelectedIds.includes(cat.categoryId))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setBulkSelectedIds((data?.categories || []).map((cat) => cat.categoryId));
                      } else {
                        setBulkSelectedIds([]);
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Selecionar Todas as Categorias ({(data?.categories || []).length})</span>
                </label>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                  {bulkSelectedIds.length} selecionadas
                </span>
              </div>

              {/* Lista Scrollável de Categorias */}
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {(data?.categories || []).map((cat) => {
                  const isChecked = bulkSelectedIds.includes(cat.categoryId);
                  return (
                    <label
                      key={cat.categoryId}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800"
                          : "bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBulkSelectedIds((prev) => [...prev, cat.categoryId]);
                            } else {
                              setBulkSelectedIds((prev) => prev.filter((id) => id !== cat.categoryId));
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                        />
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.categoryColor }} />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{cat.categoryName}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 block">
                          Teto: {cat.budgetLimit > 0 ? brl(cat.budgetLimit) : "Sem teto"}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Campo para o Novo Teto de Gastos */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                  Valor do Teto para as Selecionadas (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={bulkInputLimit}
                    onChange={(e) => setBulkInputLimit(e.target.value)}
                    placeholder="Ex: 500,00"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-extrabold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Presets Rápidos em Lote */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400 block">
                  Atalhos de Valor:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {[200, 500, 1000, 1500, 2000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setBulkInputLimit(preset.toString())}
                      className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      {brl(preset)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer com Ação 1 (Aplicar Limite) e Ação 2 (Remover Limite em Lote) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  handleBatchSaveBudget(0);
                }}
                disabled={bulkSaving || bulkSelectedIds.length === 0}
                className="w-full sm:w-auto px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                Remover Limite em Lote
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const val = parseFloat(bulkInputLimit.replace(",", ".")) || 0;
                    handleBatchSaveBudget(val);
                  }}
                  disabled={bulkSaving || bulkSelectedIds.length === 0}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {bulkSaving ? "Salvando..." : "Aplicar Limite em Lote"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Explicativo (Help Modal) */}
      {helpModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-xl w-full space-y-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Header do Modal */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Como funciona o Orçamento Mensal?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Entenda como monitorar seus tetos de gastos e manter suas finanças sob controle.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setHelpModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Seção 1: Visão Geral */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <span>📌</span> Visão Geral (Topo)
              </h4>

              <div className="grid grid-cols-1 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 space-y-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    🔵 Limite Total Planejado
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    Soma de todas as metas/tetos de gastos definidos para o mês corrente.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 space-y-1">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block">
                    🟣 Gasto Real Atual
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    Soma de todas as despesas reais registradas no seu extrato no mês.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 space-y-1">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                    🟢 Saldo Restante
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    Valor total que você ainda pode gastar até o fim do mês sem estourar seu planejamento.
                  </p>
                </div>
              </div>
            </div>

            {/* Seção 2: Status dos Cards de Categoria */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <span>🏷️</span> Status dos Cards de Categoria
              </h4>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 block">
                      Dentro do Teto (Verde)
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      Gastos sob controle. Exibe quanto ainda resta para gastar na categoria.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/60">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-300 block">
                      Excedido (Vermelho)
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      O limite da categoria foi ultrapassado. Mostra o valor excedido e a porcentagem atingida.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-400 mt-1 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Sem Limite (Cinza)
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      Categoria sem valor máximo estipulado. Clique no lápis ✏️ para definir um teto.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setHelpModalOpen(false)}
                className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
              >
                Entendi, fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
