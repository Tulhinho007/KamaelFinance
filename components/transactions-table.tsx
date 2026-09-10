"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Repeat,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export type TransactionStatus =
  | "PAID"
  | "PENDING"
  | "CANCELLED"
  | "OVERDUE"
  | "pago"
  | "pendente"
  | "cancelado"
  | "vencido"
  | string;

export type TransactionType = "EXPENSE" | "INCOME" | "TRANSFER" | "DEBIT" | "CREDIT" | string;

export interface Transaction {
  id: string;
  date: string | Date;
  description: string;
  category?: string | { name: string; color?: string | null } | null;
  type?: TransactionType;
  installment?:
    | {
        current: number;
        total: number;
      }
    | string
    | null;
  amount: number | string | unknown;
  status: TransactionStatus;
  paymentMethod?: string;
  account?: string;
  referenceMonth?: string; // Formato "YYYY-MM" (ex: "2026-08") ou formatado (ex: "Agosto/2026")
  repeatNextMonth?: boolean;
  isRecurring?: boolean;
  competenceDate?: string | Date;
  competenceMonth?: number;
  competenceYear?: number;
}

export interface TransactionsTableProps {
  title?: string;
  subtitle?: string;
  transactions?: Transaction[];
  isLoading?: boolean;
  onView?: (transaction: Transaction) => void;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  showSearch?: boolean;
  showFilters?: boolean;
  showSummary?: boolean;
  itemsPerPage?: number;
}

// ─── Helpers de Formatação ───────────────────────────────────────────────────

export const formatBRL = (val: unknown): string => {
  const num = typeof val === "number" ? val : Number(val) || 0;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export const formatDate = (d: string | Date): string => {
  if (!d) return "—";
  if (typeof d === "string") {
    const clean = d.split("T")[0];
    const parts = clean.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return String(d);
  return dateObj.toLocaleDateString("pt-BR", { timeZone: "UTC" });
};

export const formatReferenceMonth = (
  ref?: string | Date | null,
  compM?: number,
  compY?: number
): string | null => {
  const months = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];

  if (ref) {
    if (typeof ref === "string" && ref.includes("/")) return ref;
    const str = typeof ref === "string" ? ref.split("T")[0] : ref.toISOString().split("T")[0];
    const parts = str.split("-");
    if (parts.length >= 2) {
      const mIdx = Number(parts[1]) - 1;
      const mName = months[mIdx] || parts[1];
      return `${mName}/${parts[0]}`;
    }
  }

  if (compM && compY) {
    const mName = months[compM - 1] || String(compM);
    return `${mName}/${compY}`;
  }

  return null;
};

export const hasDifferentReferenceMonth = (tx: Transaction): boolean => {
  if (tx.referenceMonth) return true;
  if (!tx.competenceDate && !tx.competenceMonth) return false;

  const txDateStr = typeof tx.date === "string" ? tx.date.split("T")[0] : tx.date.toISOString().split("T")[0];
  const txMonth = txDateStr.substring(0, 7);

  let compMonth = "";
  if (tx.competenceYear && tx.competenceMonth) {
    compMonth = `${tx.competenceYear}-${String(tx.competenceMonth).padStart(2, "0")}`;
  } else if (tx.competenceDate) {
    const cStr = typeof tx.competenceDate === "string" ? tx.competenceDate : tx.competenceDate.toISOString();
    compMonth = cStr.split("T")[0].substring(0, 7);
  }

  return Boolean(compMonth && compMonth !== txMonth);
};

export const getStatusConfig = (status: TransactionStatus) => {
  const s = String(status || "").toLowerCase();

  // Status Positivo / Pago (Verde)
  if (s === "paid" || s === "pago" || s === "recebido" || s === "concluido" || s === "completed") {
    return {
      label: "Pago",
      pillClass: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
      dotClass: "bg-emerald-500",
      icon: CheckCircle2,
    };
  }

  // Status Negativo / Pendente (Amarelo/Laranja)
  if (s === "pending" || s === "pendente" || s === "aberto" || s === "aguardando") {
    return {
      label: "Pendente",
      pillClass: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
      dotClass: "bg-amber-500",
      icon: Clock,
    };
  }

  // Status Cancelado / Red (Vermelho)
  if (s === "cancelled" || s === "cancelado" || s === "vencido" || s === "overdue" || s === "estornado") {
    return {
      label: s.includes("vencid") ? "Vencido" : "Cancelado",
      pillClass: "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
      dotClass: "bg-rose-500",
      icon: AlertCircle,
    };
  }

  return {
    label: String(status),
    pillClass: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
    dotClass: "bg-slate-400",
    icon: CheckCircle2,
  };
};

// ─── Sub-componente: Linha da Tabela (TransactionRow) ─────────────────────────

export interface TransactionRowProps {
  tx: Transaction;
  onView?: (transaction: Transaction) => void;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
}

export function TransactionRow({ tx, onView, onEdit, onDelete }: TransactionRowProps) {
  const categoryName =
    typeof tx.category === "string"
      ? tx.category
      : tx.category?.name || "Sem categoria";

  const isExpense =
    tx.type === "EXPENSE" ||
    tx.type === "DEBIT" ||
    (!tx.type && Number(tx.amount) < 0);

  const statusConfig = getStatusConfig(tx.status);

  // Mês de Referência
  const refMonthLabel = formatReferenceMonth(
    tx.referenceMonth || (tx.competenceDate ? String(tx.competenceDate) : null),
    tx.competenceMonth,
    tx.competenceYear
  );
  const showRefBadge = hasDifferentReferenceMonth(tx) && refMonthLabel;

  // Repetição no próximo mês / Recorrência
  const isRepeating = Boolean(tx.repeatNextMonth || tx.isRecurring);

  // Tratamento da Tag de Tipo / Parcela
  let typeLabel = "À vista";
  if (tx.installment) {
    if (typeof tx.installment === "string") {
      typeLabel = tx.installment.toLowerCase().includes("parcela")
        ? tx.installment
        : `Parcela ${tx.installment}`;
    } else if (typeof tx.installment === "object") {
      typeLabel = `Parcela ${tx.installment.current}/${tx.installment.total}`;
    }
  } else if (tx.type === "INCOME") {
    typeLabel = "Receita";
  } else if (tx.type === "TRANSFER") {
    typeLabel = "Transferência";
  } else if (tx.paymentMethod) {
    typeLabel = tx.paymentMethod;
  }

  return (
    <tr className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors group">
      {/* 1. DATA */}
      <td className="py-3.5 sm:py-4 px-4 text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums whitespace-nowrap">
        {formatDate(tx.date)}
      </td>

      {/* 2. DESCRIÇÃO / CATEGORIA (com Badge de Mês de Referência e Indicador de Repetição) */}
      <td className="py-3.5 sm:py-4 px-4 min-w-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-800 dark:text-slate-100 text-sm font-semibold truncate leading-snug">
              {tx.description}
            </span>

            {/* Badge de Mês de Referência */}
            {showRefBadge && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0"
                title={`Mês de Referência / Competência: ${refMonthLabel}`}
              >
                <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                Ref. {refMonthLabel}
              </span>
            )}

            {/* Indicador de Repetição no Próximo Mês */}
            {isRepeating && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 shrink-0"
                title="Repetir despesa no próximo mês (recorrente)"
              >
                <Repeat className="w-3 h-3 text-purple-500 shrink-0" />
                <span>Repete</span>
              </span>
            )}
          </div>

          <span className="text-xs text-slate-400 dark:text-slate-500 font-normal truncate">
            {categoryName}
          </span>
        </div>
      </td>

      {/* 3. TIPO / PARCELA */}
      <td className="py-3.5 sm:py-4 px-4 whitespace-nowrap">
        <span className="rounded-full px-3 py-1 text-xs font-medium inline-flex items-center gap-1.5 border bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700">
          {typeLabel}
        </span>
      </td>

      {/* 4. VALOR */}
      <td className="py-3.5 sm:py-4 px-4 text-right whitespace-nowrap">
        <span
          className={`text-sm font-semibold tabular-nums font-tnum ${
            isExpense ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-slate-100"
          }`}
        >
          {isExpense ? `- ${formatBRL(Math.abs(Number(tx.amount)))}` : formatBRL(Number(tx.amount))}
        </span>
      </td>

      {/* 5. STATUS */}
      <td className="py-3.5 sm:py-4 px-4 text-center whitespace-nowrap">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium inline-flex items-center gap-1.5 border ${statusConfig.pillClass}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusConfig.dotClass}`} />
          {statusConfig.label}
        </span>
      </td>

      {/* 6. AÇÕES */}
      <td className="py-3.5 sm:py-4 px-4 text-center whitespace-nowrap">
        <div className="flex items-center justify-center gap-1.5">
          {/* Visualizar */}
          <button
            type="button"
            onClick={() => onView?.(tx)}
            title="Visualizar detalhes"
            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex items-center justify-center cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Editar */}
          <button
            type="button"
            onClick={() => onEdit?.(tx)}
            title="Editar transação"
            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex items-center justify-center cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {/* Excluir com tom destrutivo */}
          <button
            type="button"
            onClick={() => onDelete?.(tx)}
            title="Excluir transação"
            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors flex items-center justify-center cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Componente Principal: TransactionsTable ──────────────────────────────────

export function TransactionsTable({
  title = "Extrato de Transações",
  subtitle,
  transactions = [],
  isLoading = false,
  onView,
  onEdit,
  onDelete,
  showSearch = true,
  showFilters = true,
  showSummary = true,
  itemsPerPage = 10,
}: TransactionsTableProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  // Filtragem
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchesQuery =
        !query ||
        t.description.toLowerCase().includes(query.toLowerCase()) ||
        (typeof t.category === "string" && t.category.toLowerCase().includes(query.toLowerCase())) ||
        (typeof t.category === "object" && t.category?.name?.toLowerCase().includes(query.toLowerCase()));

      if (!matchesQuery) return false;
      if (statusFilter === "ALL") return true;

      const s = String(t.status || "").toLowerCase();
      if (statusFilter === "PAID") return s === "paid" || s === "pago" || s === "completed" || s === "recebido";
      if (statusFilter === "PENDING") return s === "pending" || s === "pendente" || s === "aberto";
      if (statusFilter === "CANCELLED") return s === "cancelled" || s === "cancelado" || s === "vencido" || s === "overdue";
      return true;
    });
  }, [transactions, query, statusFilter]);

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  // Totalizador
  const totalAmount = useMemo(() => {
    return filtered.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  }, [filtered]);

  return (
    <div className="bg-white dark:bg-[#131B2E] rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm p-6 transition-all">
      {/* ── Top Header com Título, Busca e Filtros ─────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-slate-800 dark:text-slate-100 text-base sm:text-lg font-bold tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-normal mt-0.5">
            {subtitle || `${filtered.length} transações encontradas`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Campo de Busca */}
          {showSearch && (
            <div className="relative flex items-center min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar descrição ou categoria..."
                className="w-full pl-9 pr-3.5 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          )}

          {/* Filtro Rápido de Status */}
          {showFilters && (
            <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("ALL");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  statusFilter === "ALL"
                    ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("PAID");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  statusFilter === "PAID"
                    ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
                }`}
              >
                Pagos
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("PENDING");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  statusFilter === "PENDING"
                    ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs"
                    : "text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400"
                }`}
              >
                Pendentes
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabela Responsiva ──────────────────────────────────────────────── */}
      <div className="overflow-x-auto w-full -mx-6 px-6 sm:mx-0 sm:px-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase select-none">
              <th className="py-3 px-4 w-[110px]">Data</th>
              <th className="py-3 px-4 min-w-[220px]">Descrição / Categoria</th>
              <th className="py-3 px-4 min-w-[140px]">Tipo / Parcela</th>
              <th className="py-3 px-4 text-right min-w-[120px]">Valor</th>
              <th className="py-3 px-4 text-center min-w-[120px]">Status</th>
              <th className="py-3 px-4 text-center min-w-[120px]">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs font-medium">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-indigo-600 animate-spin" />
                    Carregando extrato...
                  </div>
                </td>
              </tr>
            ) : paginatedTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs font-medium">
                  Nenhuma transação encontrada no período.
                </td>
              </tr>
            ) : (
              paginatedTransactions.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Rodapé / Paginação e Resumo ────────────────────────────────────── */}
      {showSummary && (
        <div className="pt-5 mt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400 dark:text-slate-500 font-normal">
            Mostrando{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {filtered.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
            </span>{" "}
            a{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {Math.min(currentPage * itemsPerPage, filtered.length)}
            </span>{" "}
            de{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {filtered.length}
            </span>{" "}
            registros
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Total consolidado:{" "}
              <span className="text-slate-900 dark:text-white font-bold font-tnum tabular-nums">
                {formatBRL(totalAmount)}
              </span>
            </span>

            {/* Controles de Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-3">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-medium text-slate-500 px-1">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Próxima página"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const TableRow = TransactionRow;
export default TransactionsTable;
