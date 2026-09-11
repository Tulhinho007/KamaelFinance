"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Repeat,
  Pencil,
  Trash2,
  CopyPlus,
  CreditCard,
  Inbox,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface CreditCardTransaction {
  id: string;
  description: string;
  category?: string | { name: string; color?: string | null } | null;
  amount: number;
  date: string | Date;
  purchaseDate?: string | Date | null;
  competenceDate?: string | Date | null;
  type?: "INCOME" | "EXPENSE" | string;
  status?: "PAID" | "PENDING" | "COMPLETED" | "pago" | "pendente" | "aberta" | string;
  isPaid?: boolean;
  installmentLabel?: string;
  currentInstallment?: number;
  installmentsCount?: number;
  isRecurring?: boolean;
  repeatNextMonth?: boolean;
  tags?: string | null;
  subtype?: "vista" | "parcelado" | "assinatura" | string;
}

export interface CreditCardInvoiceTableProps {
  transactions: CreditCardTransaction[];
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  onEdit?: (transaction: CreditCardTransaction) => void;
  onDelete?: (transaction: CreditCardTransaction) => void;
  onDuplicate?: (transaction: CreditCardTransaction) => void;
  onToggleStatus?: (id: string) => void;
  togglingId?: string | null;
  dateColumnHeader?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

/** Extrai chave YYYY-MM-DD para agrupamento */
const getDateKey = (dateVal?: string | Date | null): string => {
  if (!dateVal) return "SEM_DATA";
  try {
    if (typeof dateVal === "string") {
      return dateVal.split("T")[0];
    }
    if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
      const y = dateVal.getFullYear();
      const m = String(dateVal.getMonth() + 1).padStart(2, "0");
      const d = String(dateVal.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  } catch {
    // fallback
  }
  return String(dateVal);
};

/** Formata rótulo do dia para cabeçalho do grupo (ex: 08 DE SET ou HOJE) */
const formatDayHeaderLabel = (dateKey: string): string => {
  if (!dateKey || dateKey === "SEM_DATA") return "Sem Data";

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

  if (dateKey === todayKey) return "HOJE";
  if (dateKey === yesterdayKey) return "ONTEM";

  const parts = dateKey.split("-");
  if (parts.length === 3) {
    const day = parts[2];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const monthShorts = [
      "JAN", "FEV", "MAR", "ABR", "MAI", "JUN",
      "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"
    ];
    const monthStr = monthShorts[monthIndex] || parts[1];
    return `${day} DE ${monthStr}`;
  }

  return dateKey.toUpperCase();
};

/** Formata data para dd/mm/aaaa */
const formatDate = (dateVal?: string | Date | null): string => {
  if (!dateVal) return "-";
  try {
    const raw = typeof dateVal === "string" ? dateVal.split("T")[0] : dateVal.toISOString().split("T")[0];
    const parts = raw.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  } catch {
    // fallback
  }
  return String(dateVal);
};

/** Formata competência / referência (ex: Ref. Set/2026) */
const formatReference = (compVal?: string | Date | null): string | null => {
  if (!compVal) return null;
  try {
    const raw = typeof compVal === "string" ? compVal.split("T")[0] : compVal.toISOString().split("T")[0];
    const parts = raw.split("-");
    if (parts.length >= 2) {
      const monthShorts = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const mIdx = Number(parts[1]) - 1;
      return `${monthShorts[mIdx] || parts[1]}/${parts[0]}`;
    }
  } catch {
    // fallback
  }
  return null;
};

/** Verifica se a competência difere do mês da compra */
const isDifferentCompetence = (
  dateVal?: string | Date | null,
  compVal?: string | Date | null
): boolean => {
  if (!dateVal || !compVal) return false;
  try {
    const d = typeof dateVal === "string" ? dateVal.split("T")[0] : dateVal.toISOString().split("T")[0];
    const c = typeof compVal === "string" ? compVal.split("T")[0] : compVal.toISOString().split("T")[0];
    const dParts = d.split("-");
    const cParts = c.split("-");
    if (dParts.length < 2 || cParts.length < 2) return false;
    return dParts[0] !== cParts[0] || dParts[1] !== cParts[1];
  } catch {
    return false;
  }
};

/** Formata moeda brasileira */
const formatBRL = (val: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);
};

export function CreditCardInvoiceTable({
  transactions = [],
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleStatus,
  togglingId,
  dateColumnHeader = "Data Compra",
  isLoading = false,
  emptyMessage = "Nenhum lançamento encontrado para esta fatura.",
  className,
}: CreditCardInvoiceTableProps) {
  const hasSelection = Boolean(onToggleSelect);
  const isAllSelected =
    transactions.length > 0 && selectedIds.length === transactions.length;
  const isPartiallySelected =
    selectedIds.length > 0 && selectedIds.length < transactions.length;

  // Agrupamento de transações por dia e cálculo do consolidado diário
  const groupedTransactions = useMemo(() => {
    const groupsMap = new Map<
      string,
      {
        dateKey: string;
        dateLabel: string;
        transactions: CreditCardTransaction[];
        totalExpense: number;
        totalIncome: number;
      }
    >();

    for (const tx of transactions) {
      const txDate = tx.purchaseDate || tx.date;
      const dateKey = getDateKey(txDate);

      if (!groupsMap.has(dateKey)) {
        groupsMap.set(dateKey, {
          dateKey,
          dateLabel: formatDayHeaderLabel(dateKey),
          transactions: [],
          totalExpense: 0,
          totalIncome: 0,
        });
      }

      const group = groupsMap.get(dateKey)!;
      group.transactions.push(tx);

      const isIncome = tx.type === "INCOME";
      const amount = typeof tx.amount === "number" ? tx.amount : Number(tx.amount) || 0;
      if (isIncome) {
        group.totalIncome += amount;
      } else {
        group.totalExpense += amount;
      }
    }

    // Ordena os grupos por data decrescente (mais recente primeiro)
    return Array.from(groupsMap.values()).sort((a, b) => {
      if (a.dateKey === "SEM_DATA") return 1;
      if (b.dateKey === "SEM_DATA") return -1;
      return b.dateKey.localeCompare(a.dateKey);
    });
  }, [transactions]);

  // ── Accordion por Data: Estado local de dias expandidos ─────────────────────
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  // Inicialização: Deixa apenas os 2 dias mais recentes (índices 0 e 1) abertos por padrão
  useEffect(() => {
    if (groupedTransactions.length === 0) return;
    setExpandedDays((prev) => {
      const next: Record<string, boolean> = { ...prev };
      groupedTransactions.forEach((group, index) => {
        if (next[group.dateKey] === undefined) {
          next[group.dateKey] = index < 2; // HOJE e ONTEM (os dois primeiros mais recentes)
        }
      });
      return next;
    });
  }, [groupedTransactions]);

  const isDayExpanded = (dateKey: string, index: number): boolean => {
    return expandedDays[dateKey] !== undefined ? expandedDays[dateKey] : index < 2;
  };

  const toggleDay = (dateKey: string, index: number) => {
    const current = isDayExpanded(dateKey, index);
    setExpandedDays((prev) => ({
      ...prev,
      [dateKey]: !current,
    }));
  };

  const allExpanded =
    groupedTransactions.length > 0 &&
    groupedTransactions.every((g, idx) => isDayExpanded(g.dateKey, idx));

  const toggleExpandAll = () => {
    const nextState = !allExpanded;
    const next: Record<string, boolean> = {};
    groupedTransactions.forEach((g) => {
      next[g.dateKey] = nextState;
    });
    setExpandedDays(next);
  };

  const containerClasses = [
    "max-h-[580px] overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700",
    className !== undefined
      ? className
      : "bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm w-full"
  ].join(" ");

  return (
    <div className={containerClasses}>
      {/* Barra de Ações Rápidas: Expandir / Recolher Todos */}
      {groupedTransactions.length > 0 && (
        <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 text-xs select-none">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Extrato diário ({groupedTransactions.length} {groupedTransactions.length === 1 ? "dia" : "dias"})
          </span>
          <button
            type="button"
            onClick={toggleExpandAll}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-2.5 py-1 rounded-lg shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700/60"
          >
            {allExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Recolher Todos</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Expandir Todos</span>
              </>
            )}
          </button>
        </div>
      )}
      <table className="w-full table-fixed border-collapse text-left">
        {/* Cabeçalho */}
        <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900 shadow-sm border-b border-slate-200 dark:border-slate-800">
          <tr>
            {hasSelection && (
              <th className="w-9 px-2 py-2.5 text-center bg-white dark:bg-slate-900">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isPartiallySelected;
                  }}
                  onChange={onToggleSelectAll}
                  aria-label="Selecionar todos os lançamentos"
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                />
              </th>
            )}
            <th className="w-24 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider py-2.5 px-3 text-left whitespace-nowrap bg-white dark:bg-slate-900">
              {dateColumnHeader}
            </th>
            <th className="w-[32%] max-w-0 truncate text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-2.5 px-3 text-left bg-white dark:bg-slate-900">
              Descrição
            </th>
            <th className="w-28 truncate text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-2.5 px-3 text-left bg-white dark:bg-slate-900">
              Categoria
            </th>
            <th className="w-28 text-right font-semibold whitespace-nowrap text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300 py-2.5 px-3 bg-white dark:bg-slate-900">
              Valor
            </th>
            <th className="w-28 text-center whitespace-nowrap text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-2.5 px-3 bg-white dark:bg-slate-900">
              Status
            </th>
            <th className="w-24 text-right whitespace-nowrap text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-2.5 px-3 bg-white dark:bg-slate-900">
              Ações
            </th>
          </tr>
        </thead>

        {/* Corpo da Tabela */}
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {isLoading ? (
            <tr>
              <td
                colSpan={hasSelection ? 7 : 6}
                className="py-12 px-4 text-center text-sm text-slate-400 dark:text-slate-500"
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-medium">Carregando lançamentos...</p>
                </div>
              </td>
            </tr>
          ) : transactions.length === 0 ? (
            <tr>
              <td
                colSpan={hasSelection ? 7 : 6}
                className="py-14 px-4 text-center text-sm text-slate-400 dark:text-slate-500"
              >
                <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-inner">
                    <Inbox className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Nenhuma despesa listada
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {emptyMessage}
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            groupedTransactions.map((group, groupIndex) => {
              const isExpanded = isDayExpanded(group.dateKey, groupIndex);
              const txCount = group.transactions.length;
              const countText = `${txCount} ${txCount === 1 ? "compra" : "compras"}`;

              return (
                <React.Fragment key={group.dateKey}>
                  {/* Linha Divisória de Data (Cabeçalho do Dia com Toggle Accordion) */}
                  <tr
                    onClick={() => toggleDay(group.dateKey, groupIndex)}
                    className="bg-slate-50/90 dark:bg-slate-900/80 border-y border-slate-200/80 dark:border-slate-800 cursor-pointer hover:bg-slate-100/90 dark:hover:bg-slate-800/90 transition-colors select-none group"
                    title={`Clique para ${isExpanded ? "recolher" : "expandir"} os lançamentos deste dia`}
                  >
                    <td colSpan={hasSelection ? 7 : 6} className="px-3 py-2">
                      <div className="flex items-center justify-between">
                        {/* Lado Esquerdo: Ícone Chevron + Data Formatada + Contador */}
                        <div className="flex items-center gap-2">
                          <span className="p-0.5 rounded text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                !isExpanded ? "-rotate-90 text-slate-400" : "rotate-0 text-indigo-600 dark:text-indigo-400"
                              }`}
                            />
                          </span>
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                            {group.dateLabel}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                            ({countText})
                          </span>
                        </div>

                        {/* Lado Direito: Total Gasto / Recebido no dia */}
                        <div className="flex items-center gap-3">
                          {group.totalIncome > 0 && (
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                              + {formatBRL(group.totalIncome)}
                            </span>
                          )}
                          {(group.totalExpense > 0 || group.totalIncome === 0) && (
                            <span className="text-[11px] font-bold text-rose-500 dark:text-rose-400 tabular-nums">
                              - {formatBRL(group.totalExpense)}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Transações do Dia (Renderizadas somente se expandido) */}
                  {isExpanded &&
                    group.transactions.map((tx) => {
                  const isSelected = selectedIds.includes(tx.id);
                  const txDate = tx.purchaseDate || tx.date;
                  const dateFormatted = formatDate(txDate);

                  // Tratamento de parcelas e descrição
                  const match = tx.description.match(/\((\d+)\/(\d+)\)/);
                  const cleanDesc = tx.description.replace(/\s*\(\d+\/\d+\)$/, "").trim();
                  const currInst = tx.currentInstallment || (match ? Number(match[1]) : null);
                  const totalInst = tx.installmentsCount || (match ? Number(match[2]) : null);
                  const displayInstallment =
                    tx.installmentLabel || (currInst && totalInst ? `${currInst}/${totalInst}` : null);

                  // Mês de referência
                  const diffComp = isDifferentCompetence(txDate, tx.competenceDate);
                  const refBadge = diffComp ? formatReference(tx.competenceDate) : null;

                  // Indicador de repetição / recorrência
                  const isRepeating = Boolean(
                    tx.isRecurring ||
                    tx.repeatNextMonth ||
                    tx.subtype === "assinatura" ||
                    (tx.tags && tx.tags.toLowerCase().includes("recorrente"))
                  );

                  // Categoria
                  const categoryName =
                    typeof tx.category === "string"
                      ? tx.category
                      : tx.category?.name || "Geral";

                  // Status
                  const normalizedStatus = (tx.status || (tx.isPaid ? "PAID" : "PENDING")).toUpperCase();
                  const isPaid = normalizedStatus === "PAID" || normalizedStatus === "COMPLETED" || normalizedStatus === "PAGO" || normalizedStatus === "RECEBIDO";
                  const isOpen = normalizedStatus === "OPEN" || normalizedStatus === "ABERTA";

                  return (
                    <tr
                      key={tx.id}
                      className={`border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? "bg-indigo-50/60 dark:bg-indigo-950/20" : ""
                      }`}
                    >
                      {/* Checkbox de Seleção */}
                      {hasSelection && (
                        <td className="w-9 px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSelect && onToggleSelect(tx.id)}
                            aria-label={`Selecionar ${cleanDesc}`}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                          />
                        </td>
                      )}

                      {/* 1. DATA (exibição discreta) */}
                      <td className="w-24 py-2 px-3 text-xs text-slate-500 dark:text-slate-400 text-left whitespace-nowrap tabular-nums">
                        {dateFormatted}
                      </td>

                      {/* 2. DESCRIÇÃO + BADGES (limitado para não estourar layout) */}
                      <td className="w-[32%] max-w-0 py-2 px-3 text-left">
                        <div className="max-w-full min-w-0">
                          <span
                            className="block truncate text-xs font-medium text-slate-900 dark:text-white"
                            title={cleanDesc}
                          >
                            {cleanDesc}
                          </span>

                          {/* Badges auxiliares */}
                          {(displayInstallment || refBadge || isRepeating) && (
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              {/* Badge de Parcela */}
                              {displayInstallment && (
                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                  Parcela {displayInstallment}
                                </span>
                              )}

                              {/* Badge de Mês de Referência */}
                              {refBadge && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap"
                                  title={`Mês de Referência: ${refBadge}`}
                                >
                                  Ref. {refBadge}
                                </span>
                              )}

                              {/* Badge de Repetição */}
                              {isRepeating && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 whitespace-nowrap"
                                  title="Repete no próximo mês"
                                >
                                  <Repeat className="w-2.5 h-2.5 text-purple-500" />
                                  <span>Repete</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 3. CATEGORIA */}
                      <td className="w-28 py-2 px-3 text-left truncate">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 truncate max-w-full"
                          title={categoryName}
                        >
                          {categoryName}
                        </span>
                      </td>

                      {/* 4. VALOR */}
                      <td className="w-28 py-2 px-3 text-right font-semibold whitespace-nowrap">
                        <span
                          className={`text-xs font-semibold tabular-nums ${
                            tx.type === "INCOME"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-slate-900 dark:text-slate-100"
                          }`}
                        >
                          {tx.type === "INCOME" ? `+ ${formatBRL(tx.amount)}` : `- ${formatBRL(tx.amount)}`}
                        </span>
                      </td>

                      {/* 5. STATUS */}
                      <td className="w-28 py-2 px-3 text-center whitespace-nowrap">
                        {onToggleStatus ? (
                          <button
                            type="button"
                            disabled={togglingId === tx.id}
                            onClick={() => onToggleStatus(tx.id)}
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium inline-flex items-center gap-1 transition-all cursor-pointer select-none hover:opacity-80 active:scale-95 ${
                              isPaid
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                                : isOpen
                                ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20"
                                : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                            } ${togglingId === tx.id ? "opacity-60 cursor-wait" : ""}`}
                            title={isPaid ? (tx.type === "INCOME" ? "Clique para alterar status para Pendente" : "Clique para alterar status para Pendente") : "Clique para alterar status para Pago/Recebido"}
                          >
                            {isPaid ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            ) : isOpen ? (
                              <AlertCircle className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                            ) : (
                              <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                            )}
                            <span className="truncate">{isPaid ? (tx.type === "INCOME" ? "Recebido" : "Pago") : (isOpen ? "Aberta" : "Pendente")}</span>
                            <ChevronDown className="w-2.5 h-2.5 opacity-60 shrink-0" />
                          </button>
                        ) : isPaid ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 rounded-full px-2 py-0.5 text-[11px] font-medium inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>{tx.type === "INCOME" ? "Recebido" : "Pago"}</span>
                          </span>
                        ) : isOpen ? (
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 rounded-full px-2 py-0.5 text-[11px] font-medium inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span>Aberta</span>
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 rounded-full px-2 py-0.5 text-[11px] font-medium inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>Pendente</span>
                          </span>
                        )}
                      </td>

                      {/* 6. AÇÕES */}
                      <td className="w-24 py-2 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          {onDuplicate && (
                            <button
                              type="button"
                              onClick={() => onDuplicate(tx)}
                              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                              title="Duplicar para o próximo mês"
                              aria-label="Duplicar lançamento"
                            >
                              <CopyPlus className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {onEdit && (
                            <button
                              type="button"
                              onClick={() => onEdit(tx)}
                              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                              title="Editar"
                              aria-label="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {onDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete(tx)}
                              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 dark:hover:border-rose-800 transition-colors cursor-pointer"
                              title="Excluir"
                              aria-label="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })
        )}
        </tbody>
      </table>
    </div>
  );
}

export default CreditCardInvoiceTable;
