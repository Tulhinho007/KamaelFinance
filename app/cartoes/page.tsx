"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Calendar,
  Plus,
  ChevronRight,
  CheckCircle2,
  Clock,
  Zap,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  Pencil,
  Trash2,
  X,
  Repeat,
  DollarSign,
  Tag,
  Search,
  Filter,
  BarChart3,
  CalendarDays,
  Sparkles,
  Check,
} from "lucide-react";
import { PeriodHeader } from "@/components/period-header";
import { usePeriod } from "@/components/period-context";
import {
  getCreditCardsPageDataAction,
  createNewCard,
  deleteCardPurchase,
} from "@/lib/actions";
import { NewPurchaseModal } from "@/components/new-purchase-modal";
import { EditCardTransactionModal } from "@/components/edit-card-transaction-modal";
import { useModal } from "@/components/ui/custom-dialog-provider";
import { MONTH_NAMES } from "@/lib/constants";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDateBR = (dateStr?: string | null) => {
  if (!dateStr) return "-";
  const clean = dateStr.split("T")[0];
  const parts = clean.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

// Cores para as categorias na visualização segmentada
const CATEGORY_COLORS: Record<string, string> = {
  "Lazer": "#8b5cf6",
  "Alimentação": "#f59e0b",
  "Vestuário": "#ec4899",
  "Transporte": "#06b6d4",
  "Saúde": "#10b981",
  "Educação": "#3b82f6",
  "Moradia": "#6366f1",
  "Assinaturas": "#a855f7",
  "Supermercado": "#84cc16",
  "Viagem": "#f97316",
  "Outros": "#64748b",
};

const PALETTE = [
  "#6366f1", "#f59e0b", "#ec4899", "#10b981", "#8b5cf6",
  "#06b6d4", "#f97316", "#84cc16", "#14b8a6", "#64748b"
];

function getCategoryColor(name: string, index: number): string {
  if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
  return PALETTE[index % PALETTE.length];
}

// Helper: Diagnóstico inteligente do ciclo da fatura do cartão
function getInvoiceCycleStatus(card: any, selectedMonth: number, selectedYear: number) {
  const now = new Date();
  now.setHours(12, 0, 0, 0);

  // 1. Fatura Paga
  if (card.isPaid) {
    return {
      status: "PAGA",
      badgeLabel: "✓ Fatura Paga",
      badgeSub: card.paidAt ? `Pago em ${formatDateBR(card.paidAt)}` : undefined,
      badgeClass: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800",
      description: "Esta fatura já foi liquidada.",
    };
  }

  // Mês e ano reais de vencimento da fatura (M+1 da competência de compras)
  const billingMonth = card.billingMonth || (selectedMonth === 12 ? 1 : selectedMonth + 1);
  const billingYear = card.billingYear || (selectedMonth === 12 ? selectedYear + 1 : selectedYear);

  const fechamento = card.diaFechamento || 1;
  const vencimento = card.vencimento || 10;

  // Determinar quando ocorre o fechamento desta fatura:
  // Se fechamento <= vencimento (ex: fecha dia 07 e vence dia 10): fecha no mesmo mês do vencimento (ex: 07/11)
  // Se fechamento > vencimento (ex: fecha dia 25 e vence dia 05): fecha no mês anterior ao vencimento (ex: 25/10)
  let closingMonth = billingMonth;
  let closingYear = billingYear;
  if (fechamento > vencimento) {
    closingMonth = billingMonth === 1 ? 12 : billingMonth - 1;
    closingYear = billingMonth === 1 ? billingYear - 1 : billingYear;
  }

  const maxClosingDays = new Date(closingYear, closingMonth, 0).getDate();
  const safeClosingDay = Math.min(fechamento, maxClosingDays);
  const closingDate = new Date(closingYear, closingMonth - 1, safeClosingDay, 23, 59, 59);

  const maxDueDays = new Date(billingYear, billingMonth, 0).getDate();
  const safeDueDay = Math.min(vencimento, maxDueDays);
  const dueDate = new Date(billingYear, billingMonth - 1, safeDueDay, 23, 59, 59);

  // 2. Fatura Vencida (data de vencimento já passou e não foi paga)
  if (now > dueDate) {
    return {
      status: "VENCIDA",
      badgeLabel: "🚨 Fatura Vencida",
      badgeSub: `Venceu dia ${String(safeDueDay).padStart(2, "0")}/${String(billingMonth).padStart(2, "0")}`,
      badgeClass: "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800",
      description: `Venceu no dia ${String(safeDueDay).padStart(2, "0")}/${String(billingMonth).padStart(2, "0")}/${billingYear}.`,
    };
  }

  // 3. Fatura Fechada (data de fechamento já passou, mas ainda não venceu)
  if (now >= closingDate && now <= dueDate) {
    const diffMs = dueDate.getTime() - now.getTime();
    const daysToDue = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const dueText = daysToDue === 0 ? "Vence hoje!" : `Vence em ${daysToDue} ${daysToDue === 1 ? "dia" : "dias"}`;

    return {
      status: "FECHADA",
      badgeLabel: "Fatura Fechada (Aguardando Pagamento)",
      badgeSub: dueText,
      badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30",
      description: `Fechou dia ${String(safeClosingDay).padStart(2, "0")}/${String(closingMonth).padStart(2, "0")}. Vence dia ${String(safeDueDay).padStart(2, "0")}/${String(billingMonth).padStart(2, "0")}.`,
    };
  }

  // 4. Fatura Aberta (em compras, data atual antes do fechamento)
  const diffMs = closingDate.getTime() - now.getTime();
  const daysToClosing = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const subText = daysToClosing <= 1 ? "Fecha em breve" : `Fecha dia ${String(safeClosingDay).padStart(2, "0")}/${String(closingMonth).padStart(2, "0")}`;

  return {
    status: "ABERTA",
    badgeLabel: "Fatura Aberta (Em compras)",
    badgeSub: subText,
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30",
    description: `Compras entram nesta fatura até dia ${String(safeClosingDay).padStart(2, "0")}/${String(closingMonth).padStart(2, "0")}. Vencimento em ${String(safeDueDay).padStart(2, "0")}/${String(billingMonth).padStart(2, "0")}.`,
  };
}

// Helper: Cronograma completo de parcelas
function getInstallmentSchedule(tx: any, baseMonth: number, baseYear: number) {
  const current = tx.currentInstallment || 1;
  const total = tx.installmentsCount || 1;
  const amount = Number(tx.amount || 0);

  const schedule = [];
  for (let i = 1; i <= total; i++) {
    const monthOffset = i - current;
    let m = baseMonth + monthOffset;
    let y = baseYear;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    while (m > 12) {
      m -= 12;
      y += 1;
    }

    schedule.push({
      num: i,
      month: m,
      year: y,
      monthName: MONTH_NAMES[m - 1] || `Mês ${m}`,
      label: `${MONTH_NAMES[m - 1] || m}/${y}`,
      amount,
      isPast: i < current,
      isCurrent: i === current,
      isFuture: i > current,
    });
  }

  const remainingCount = Math.max(0, total - current);
  const remainingAmount = remainingCount * amount;
  const lastItem = schedule[schedule.length - 1];

  return {
    total,
    current,
    installmentAmount: amount,
    totalAmount: total * amount,
    remainingCount,
    remainingAmount,
    endsAtLabel: lastItem?.label || "-",
    schedule,
  };
}

export default function CartoesPage() {
  const router = useRouter();
  const { selectedMonth, selectedYear } = usePeriod();
  const { showAlert } = useModal();

  const [cards, setCards] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totals, setTotals] = useState({
    totalLimit: 0,
    totalAvailable: 0,
    totalInvoices: 0,
  });
  const [loading, setLoading] = useState(true);

  // Modais
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [newCardModalOpen, setNewCardModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [txToEdit, setTxToEdit] = useState<any | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Formulário Novo Cartão
  const [cardFormBank, setCardFormBank] = useState("");
  const [cardFormHolder, setCardFormHolder] = useState("");
  const [cardFormLimit, setCardFormLimit] = useState<number | "">("");
  const [cardFormDiaFech, setCardFormDiaFech] = useState(1);
  const [cardFormDiaVenc, setCardFormDiaVenc] = useState(10);
  const [cardFormSaving, setCardFormSaving] = useState(false);

  // Estados de Filtro e Busca da Tabela
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [cardFilter, setCardFilter] = useState("ALL");

  // Estado do Modal de Cronograma de Parcelas
  const [viewingInstallmentTx, setViewingInstallmentTx] = useState<any | null>(null);

  // Categorias disponíveis nas compras carregadas
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      if (t.category) set.add(t.category);
    }
    return Array.from(set).sort();
  }, [transactions]);

  // Totalizadores e Agrupamento por Categoria para barra segmentada e badges
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { total: number; count: number; color?: string }>();
    for (const tx of transactions) {
      const cat = tx.category || "Outros";
      const current = map.get(cat) || { total: 0, count: 0, color: tx.categoryColor };
      current.total += Number(tx.amount || 0);
      current.count += 1;
      if (tx.categoryColor && !current.color) current.color = tx.categoryColor;
      map.set(cat, current);
    }

    const totalInvoice = transactions.reduce((s, t) => s + Number(t.amount || 0), 0);

    const list = Array.from(map.entries()).map(([name, data]) => ({
      name,
      total: data.total,
      count: data.count,
      color: data.color || "#6366f1",
      percentage: totalInvoice > 0 ? (data.total / totalInvoice) * 100 : 0,
    }));

    return list.sort((a, b) => b.total - a.total);
  }, [transactions]);

  // Transações filtradas por Busca, Categoria, Tipo e Cartão
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Busca textual
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchDesc = (tx.description || "").toLowerCase().includes(q);
        const matchCat = (tx.category || "").toLowerCase().includes(q);
        const matchCard = (tx.walletName || "").toLowerCase().includes(q);
        if (!matchDesc && !matchCat && !matchCard) return false;
      }

      // 2. Filtro de Categoria
      if (categoryFilter !== "ALL" && tx.category !== categoryFilter) {
        return false;
      }

      // 3. Filtro de Tipo
      if (typeFilter === "VISTA") {
        if ((tx.installmentsCount && tx.installmentsCount > 1) || tx.isRecurring) return false;
      } else if (typeFilter === "PARCELADO") {
        if (!tx.installmentsCount || tx.installmentsCount <= 1) return false;
      } else if (typeFilter === "RECORRENTE") {
        if (!tx.isRecurring) return false;
      }

      // 4. Filtro de Cartão
      if (cardFilter !== "ALL" && tx.walletId !== cardFilter) {
        return false;
      }

      return true;
    });
  }, [transactions, searchQuery, categoryFilter, typeFilter, cardFilter]);

  const loadData = async (active = true) => {
    try {
      setLoading(true);
      const data = await getCreditCardsPageDataAction(selectedMonth, selectedYear);
      if (!active) return;
      setCards(data.cards || []);
      setTransactions(data.transactions || []);
      setTotals(data.totals || { totalLimit: 0, totalAvailable: 0, totalInvoices: 0 });
    } catch (err) {
      console.error("Erro ao carregar módulo de cartões:", err);
    } finally {
      if (active) setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    loadData(active);
    return () => {
      active = false;
    };
  }, [selectedMonth, selectedYear]);

  // Handler: Criar Novo Cartão de Crédito
  const handleCreateNewCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardFormBank.trim()) {
      showAlert("Por favor, informe o nome ou instituição do cartão.", { variant: "warning" });
      return;
    }
    const limitNum = Number(cardFormLimit);
    if (isNaN(limitNum) || limitNum < 0) {
      showAlert("Por favor, informe um limite válido.", { variant: "warning" });
      return;
    }
    setCardFormSaving(true);
    try {
      await createNewCard({
        bankName: cardFormBank.trim(),
        walletType: "CREDIT_CARD",
        alias: cardFormBank.trim(),
        holder: cardFormHolder.trim() || undefined,
        limitOrBalance: limitNum,
        diaFechamento: cardFormDiaFech,
        diaVencimento: cardFormDiaVenc,
        originType: "ROLLOVER",
        targetMonth: selectedMonth || new Date().getMonth() + 1,
        targetYear: selectedYear,
      });

      showAlert("Cartão de crédito cadastrado com sucesso!", { variant: "success" });
      setNewCardModalOpen(false);
      setCardFormBank("");
      setCardFormHolder("");
      setCardFormLimit("");
      setCardFormDiaFech(1);
      setCardFormDiaVenc(10);
      await loadData();
    } catch (err: any) {
      console.error("Erro ao cadastrar cartão:", err);
      showAlert(err?.message || "Erro ao cadastrar cartão de crédito.", { variant: "error" });
    } finally {
      setCardFormSaving(false);
    }
  };

  // Handler: Confirmar Exclusão de Compra
  const handleConfirmDelete = async (deleteAllFuture = false) => {
    if (!txToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteCardPurchase(txToDelete.id, { cascadeAllInstallments: deleteAllFuture });
      if (res.success) {
        showAlert(
          deleteAllFuture && res.deletedCount && res.deletedCount > 1
            ? `${res.deletedCount} parcelas excluídas com sucesso!`
            : "Lançamento excluído com sucesso!",
          { variant: "success" }
        );
        setDeleteModalOpen(false);
        setTxToDelete(null);
        await loadData();
        router.refresh();
      } else {
        showAlert(res.error || "Erro ao excluir lançamento.", { variant: "error" });
      }
    } catch (err: any) {
      showAlert(err?.message || "Erro ao excluir lançamento.", { variant: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto flex flex-col gap-8 select-none relative font-sans text-slate-900 dark:text-slate-100">
      
      {/* Top Header & Controles */}
      <div className="flex flex-col gap-3">
        <Link
          href="/"
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 w-fit transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o Dashboard
        </Link>
        <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <PeriodHeader
              title="Cartões de Crédito"
              tagline="Gestão dedicada de limites, faturas e compras parceladas no crédito."
            />
          </div>
          <div className="flex items-center gap-2.5 self-start 2xl:self-center shrink-0">
            <button
              onClick={() => setNewCardModalOpen(true)}
              className="inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-3.5 py-2.5 rounded-xl font-bold text-xs tracking-wide shadow-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-slate-500" />
              Novo Cartão
            </button>
            <button
              onClick={() => setPurchaseModalOpen(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider shadow-sm shadow-indigo-600/25 transition-all hover:scale-[1.01] cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              + Lançar Compra no Cartão
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Superiores Exclusivos de Cartões de Crédito */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs relative overflow-hidden">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
            Limite Total Contratado
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1 tabular-nums">
            {brl(totals.totalLimit)}
          </p>
          <span className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded-full border border-indigo-200/50 dark:border-indigo-800/40">
            <ShieldCheck className="w-3 h-3 text-indigo-500" /> {cards.length} {cards.length === 1 ? "cartão cadastrado" : "cartões cadastrados"}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs relative overflow-hidden">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
            Limite Disponível Real
          </span>
          <p className={`text-2xl font-black tracking-tight mt-1 tabular-nums ${totals.totalAvailable < 0 ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"}`}>
            {brl(totals.totalAvailable)}
          </p>
          <span className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/40">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Livre para novas compras
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs relative overflow-hidden">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
            Total de Faturas Abertas
          </span>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight mt-1 tabular-nums">
            {brl(totals.totalInvoices)}
          </p>
          <span className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 rounded-full border border-rose-200/50 dark:border-rose-800/40">
            <Clock className="w-3 h-3 text-rose-500" /> Comprometido no período
          </span>
        </div>
      </section>

      {/* Grid de Cartões de Crédito */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Meus Cartões de Crédito ({cards.length})
          </h2>
          <button
            onClick={() => setNewCardModalOpen(true)}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Novo Cartão
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="h-56 bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
            <div className="h-56 bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
          </div>
        ) : cards.length === 0 ? (
          <div className="py-16 text-center border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/60 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Nenhum cartão de crédito cadastrado</p>
              <p className="text-xs text-slate-400">Cadastre seu primeiro cartão para gerenciar limites e faturas.</p>
            </div>
            <button
              onClick={() => setNewCardModalOpen(true)}
              className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              + Cadastrar Novo Cartão
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {cards.map((card) => {
              const available = Math.max(0, card.limitTotal - card.limitUsed);
              const usagePct = card.limitTotal > 0 ? Math.min(100, Math.round((card.limitUsed / card.limitTotal) * 100)) : 0;
              const fechamento = card.diaFechamento || 1;
              const melhorDia = card.melhorDiaCompra || (fechamento % 31) + 1;
              const cycle = getInvoiceCycleStatus(card, selectedMonth || new Date().getMonth() + 1, selectedYear);

              return (
                <div
                  key={card.id}
                  className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between gap-4 relative overflow-hidden group hover:border-indigo-500/40 transition-all"
                >
                  {/* Top Bar do Card */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {card.title}
                        </h3>
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {card.bankName}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${cycle.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cycle.status === "ABERTA" ? "animate-pulse bg-blue-500" : cycle.status === "FECHADA" ? "bg-amber-500" : cycle.status === "PAGA" ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {cycle.status === "ABERTA" ? "Fatura Aberta" : cycle.status === "FECHADA" ? "Fatura Fechada" : cycle.status === "PAGA" ? "Fatura Paga" : "Fatura Vencida"}
                        </span>
                      </div>
                      {card.holder && (
                        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-1">
                          Titular: {card.holder}
                        </p>
                      )}
                    </div>

                    <Link
                      href={`/cartoes/${card.id}`}
                      prefetch={false}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <span>Ver Fatura</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Métricas de Limite & Fatura */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 text-xs">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                        Limite Total
                      </span>
                      <p className="font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5 text-xs sm:text-sm">
                        {brl(card.limitTotal)}
                      </p>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                        Disponível
                      </span>
                      <p className={`font-extrabold tabular-nums mt-0.5 text-xs sm:text-sm ${available < 0 ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {brl(available)}
                      </p>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                        Fatura Atual
                      </span>
                      <p className={`font-extrabold tabular-nums mt-0.5 text-xs sm:text-sm ${card.faturaAtual <= 0 ? "text-slate-900 dark:text-white" : card.isPaid ? "text-emerald-600 dark:text-emerald-400" : card.isPast ? "text-rose-500" : "text-amber-600 dark:text-amber-400"}`}>
                        {brl(card.faturaAtual)}
                      </p>
                    </div>
                  </div>

                  {/* Datas do Cartão */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-t border-slate-100 dark:border-slate-800/80 pt-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block">Fechamento</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">Dia {String(fechamento).padStart(2, "0")}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-500" />
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block">Melhor Dia</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">Dia {String(melhorDia).padStart(2, "0")}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block">Vencimento</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">Dia {String(card.vencimento || 10).padStart(2, "0")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Alerta Visual do Ciclo da Fatura */}
                  <div
                    title={cycle.description}
                    className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl text-xs border ${
                      cycle.status === "PAGA"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50"
                        : cycle.status === "VENCIDA"
                        ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/50"
                        : cycle.status === "FECHADA"
                        ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/50"
                        : "bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${cycle.status === "ABERTA" ? "animate-pulse bg-blue-500" : cycle.status === "FECHADA" ? "bg-amber-500" : cycle.status === "PAGA" ? "bg-emerald-500" : "bg-rose-500"}`} />
                      <span className="font-bold text-[11px] truncate">{cycle.badgeLabel}</span>
                    </div>
                    {cycle.badgeSub && (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-white/80 dark:bg-slate-900/70 shrink-0">
                        {cycle.badgeSub}
                      </span>
                    )}
                  </div>

                  {/* Barra de progresso do limite */}
                  <div className="flex flex-col gap-1">
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          usagePct >= 90 ? "bg-rose-500" : usagePct >= 70 ? "bg-amber-500" : "bg-indigo-600"
                        }`}
                        style={{ width: `${usagePct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500">
                      <span>Uso do limite: {usagePct}%</span>
                      <span>Restante: {100 - usagePct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Seção "Faturas a Vencer / Extrato do Cartão" */}
      <section className="flex flex-col gap-4">
        {/* Item 3: Totalizadores e Agrupamento por Categoria */}
        {categoryBreakdown.length > 0 && (
          <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 tracking-wide">
                  Distribuição de Gastos por Categoria
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  ({categoryBreakdown.length} {categoryBreakdown.length === 1 ? "categoria" : "categorias"})
                </span>
              </div>
              {categoryFilter !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setCategoryFilter("ALL")}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Limpar filtro de categoria (mostrar todas)
                </button>
              )}
            </div>

            {/* Barra Horizontal Segmentada Proporcional */}
            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden gap-0.5 p-0.5">
              {categoryBreakdown.map((item, idx) => (
                <div
                  key={item.name}
                  className="h-full rounded-xs transition-all duration-300 hover:opacity-80 cursor-pointer"
                  style={{
                    width: `${Math.max(item.percentage, 2)}%`,
                    backgroundColor: getCategoryColor(item.name, idx),
                  }}
                  title={`${item.name}: ${brl(item.total)} (${item.percentage.toFixed(1)}%) • Clique para filtrar`}
                  onClick={() => setCategoryFilter(categoryFilter === item.name ? "ALL" : item.name)}
                />
              ))}
            </div>

            {/* Badges / Pílulas de Resumo com Valor e Percentual */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar flex-wrap">
              {categoryBreakdown.map((item, idx) => {
                const isSelected = categoryFilter === item.name;
                const color = getCategoryColor(item.name, idx);
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setCategoryFilter(isSelected ? "ALL" : item.name)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-950 dark:border-white shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/70 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                    title={`Clique para filtrar compras de ${item.name}`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span>{item.name}:</span>
                    <span className="font-extrabold">{brl(item.total)}</span>
                    <span className={`text-[10px] ${isSelected ? "text-slate-300 dark:text-slate-600" : "text-slate-400"}`}>
                      ({item.percentage.toFixed(0)}%)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Item 1: Cabeçalho com Busca Rápida e Filtros */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Faturas a Vencer / Extrato do Cartão ({filteredTransactions.length}
              {filteredTransactions.length !== transactions.length ? ` de ${transactions.length}` : ""})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Compras e parcelas ativas no período selecionado.
            </p>
          </div>

          {/* Controles de Busca e Filtros */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Campo de Pesquisa Rápida */}
            <div className="relative min-w-[190px] sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar compra..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                  title="Limpar busca"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filtro por Categoria */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="py-1.5 pl-2.5 pr-7 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition-colors"
              >
                <option value="ALL">Todas as categorias</option>
                {availableCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Filtro por Tipo */}
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="py-1.5 pl-2.5 pr-7 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition-colors"
              >
                <option value="ALL">Todos os tipos</option>
                <option value="VISTA">À vista</option>
                <option value="PARCELADO">Parcelado</option>
                <option value="RECORRENTE">Recorrente</option>
              </select>
            </div>

            {/* Filtro por Cartão (quando mais de 1) */}
            {cards.length > 1 && (
              <div className="relative">
                <select
                  value={cardFilter}
                  onChange={(e) => setCardFilter(e.target.value)}
                  className="py-1.5 pl-2.5 pr-7 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition-colors"
                >
                  <option value="ALL">Todos os cartões</option>
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>{c.bankName || c.alias}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Botão Limpar Filtros quando algum estiver ativo */}
            {(searchQuery || categoryFilter !== "ALL" || typeFilter !== "ALL" || cardFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("ALL");
                  setTypeFilter("ALL");
                  setCardFilter("ALL");
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Limpar todos os filtros"
              >
                <X className="w-3 h-3" />
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Tabela do Extrato */}
        <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  <th className="py-3 px-4">DATA</th>
                  <th className="py-3 px-4">DESCRIÇÃO</th>
                  <th className="py-3 px-4">CARTÃO</th>
                  <th className="py-3 px-4">CATEGORIA</th>
                  <th className="py-3 px-4">PARCELA</th>
                  <th className="py-3 px-4 text-right">VALOR</th>
                  <th className="py-3 px-4 text-center w-24">AÇÃO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      {transactions.length === 0 ? (
                        "Nenhuma compra no cartão registrada para o período selecionado."
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span>Nenhuma compra encontrada com os filtros aplicados.</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery("");
                              setCategoryFilter("ALL");
                              setTypeFilter("ALL");
                              setCardFilter("ALL");
                            }}
                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            Limpar filtros de pesquisa
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isInstallment = tx.installmentsCount && tx.installmentsCount > 1;
                    const isLastInstallment = isInstallment && (tx.currentInstallment || 1) === tx.installmentsCount;

                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                      >
                        <td className="py-3 px-4 font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDateBR(tx.purchaseDate || tx.date)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {tx.description}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                            <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                            {tx.walletName}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {tx.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isInstallment ? (
                            <button
                              type="button"
                              onClick={() => setViewingInstallmentTx(tx)}
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer border group/badge ${
                                isLastInstallment
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 shadow-xs"
                                  : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 shadow-xs"
                              }`}
                              title="Clique para ver o cronograma completo das parcelas"
                            >
                              {isLastInstallment ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  <span>{tx.currentInstallment || 1}/{tx.installmentsCount} • Última parcela</span>
                                </>
                              ) : (
                                <>
                                  <CalendarDays className="w-3 h-3 text-indigo-500" />
                                  <span>{tx.currentInstallment || 1}/{tx.installmentsCount}</span>
                                </>
                              )}
                            </button>
                          ) : tx.isRecurring ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:purple-400">
                              <Repeat className="w-3 h-3" /> Recorrente
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">À vista</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-black tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
                          {brl(tx.amount)}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setTxToEdit(tx);
                                setEditModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                              title="Editar lançamento"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTxToDelete(tx);
                                setDeleteModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                              title="Excluir lançamento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Modal: Novo Cartão de Crédito */}
      {newCardModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Novo Cartão de Crédito</h3>
                  <p className="text-[11px] text-slate-400">Cadastre limites e datas de faturamento</p>
                </div>
              </div>
              <button
                onClick={() => setNewCardModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewCard} className="flex flex-col gap-4 mt-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Nome do Cartão / Instituição *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: HyperCard, Nubank Mastercard, XP Visa Infinite"
                  value={cardFormBank}
                  onChange={(e) => setCardFormBank(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Titular (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Túlio Cavalcanti"
                  value={cardFormHolder}
                  onChange={(e) => setCardFormHolder(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Limite Total do Cartão (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0,00"
                  value={cardFormLimit}
                  onChange={(e) => setCardFormLimit(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Dia de Fechamento *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={cardFormDiaFech}
                    onChange={(e) => setCardFormDiaFech(Number(e.target.value))}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Dia de Vencimento *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={cardFormDiaVenc}
                    onChange={(e) => setCardFormDiaVenc(Number(e.target.value))}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={cardFormSaving}
                className="mt-2 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {cardFormSaving ? "Cadastrando..." : "Confirmar Cadastro do Cartão"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Exclusão com Suporte a Cascata para Parceladas */}
      {deleteModalOpen && txToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200 text-center flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-500 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Excluir Lançamento</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Deseja excluir a compra <strong className="text-slate-800 dark:text-slate-200">"{txToDelete.description}"</strong> de {brl(txToDelete.amount)}?
              </p>
            </div>

            {txToDelete.installmentGroupId || (txToDelete.installmentsCount && txToDelete.installmentsCount > 1) ? (
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleConfirmDelete(true)}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  {isDeleting ? "Excluindo..." : "Excluir Esta e Todas as Próximas Parcelas"}
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleConfirmDelete(false)}
                  className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Excluir Apenas Esta Parcela
                </button>
                <button
                  type="button"
                  onClick={() => { setDeleteModalOpen(false); setTxToDelete(null); }}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-1 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setDeleteModalOpen(false); setTxToDelete(null); }}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleConfirmDelete(false)}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  {isDeleting ? "Excluindo..." : "Excluir"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Lançar Compra no Cartão */}
      <NewPurchaseModal
        isOpen={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        onSuccess={loadData}
      />

      {/* Modal: Editar Lançamento do Cartão */}
      <EditCardTransactionModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setTxToEdit(null);
        }}
        transaction={txToEdit}
        cards={cards}
        onSuccess={async () => {
          await loadData();
          router.refresh();
        }}
      />

      {/* Modal: Cronograma Completo de Parcelas */}
      {viewingInstallmentTx && (() => {
        const scheduleData = getInstallmentSchedule(viewingInstallmentTx, selectedMonth, selectedYear);
        const progressPct = Math.round((scheduleData.current / scheduleData.total) * 100);

        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg p-6 flex flex-col gap-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden">
              {/* Header do Modal */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 shrink-0">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                        {viewingInstallmentTx.description}
                      </h3>
                      {scheduleData.current === scheduleData.total && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shrink-0">
                          Última parcela
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>{viewingInstallmentTx.walletName}</span>
                      <span>•</span>
                      <span>{viewingInstallmentTx.category}</span>
                      {viewingInstallmentTx.purchaseDate && (
                        <>
                          <span>•</span>
                          <span>Comprado em {formatDateBR(viewingInstallmentTx.purchaseDate)}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingInstallmentTx(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mini Cards de Resumo */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Valor da Parcela
                  </span>
                  <span className="text-xs font-black text-slate-900 dark:text-white mt-0.5 block">
                    {brl(scheduleData.installmentAmount)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Total: {brl(scheduleData.totalAmount)}
                  </span>
                </div>
                <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-2xl border border-indigo-100/60 dark:border-indigo-900/30">
                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">
                    Restante a Pagar
                  </span>
                  <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 mt-0.5 block">
                    {brl(scheduleData.remainingAmount)}
                  </span>
                  <span className="text-[10px] text-indigo-600/70 dark:text-indigo-400/70">
                    {scheduleData.remainingCount} {scheduleData.remainingCount === 1 ? "parcela" : "parcelas"}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Término Previsto
                  </span>
                  <span className="text-xs font-black text-slate-900 dark:text-white mt-0.5 block">
                    {scheduleData.endsAtLabel}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {progressPct}% concluído
                  </span>
                </div>
              </div>

              {/* Barra de Progresso do Parcelamento */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                  <span>Progresso do Parcelamento</span>
                  <span>Parcela {scheduleData.current} de {scheduleData.total} ({progressPct}%)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      progressPct === 100 ? "bg-emerald-500" : "bg-indigo-600"
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Lista Cronológica das Parcelas */}
              <div className="flex flex-col gap-2 flex-1 overflow-hidden">
                <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Cronograma Mês a Mês
                </span>
                <div className="overflow-y-auto max-h-56 pr-1 divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl">
                  {scheduleData.schedule.map((item) => (
                    <div
                      key={item.num}
                      className={`flex items-center justify-between p-3 text-xs transition-colors ${
                        item.isCurrent
                          ? "bg-indigo-50/70 dark:bg-indigo-950/40 font-bold"
                          : item.isPast
                          ? "bg-slate-50/40 dark:bg-slate-900/40 opacity-75"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                            item.isCurrent
                              ? "bg-indigo-600 text-white"
                              : item.isPast
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                              : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {item.isPast ? <Check className="w-3.5 h-3.5" /> : item.num}
                        </span>
                        <div>
                          <span className="text-slate-800 dark:text-slate-200 block">
                            Parcela {item.num} de {scheduleData.total}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Competência: {item.monthName} / {item.year}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                          {brl(item.amount)}
                        </span>
                        {item.isCurrent && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-600 text-white">
                            Fatura Atual
                          </span>
                        )}
                        {item.isPast && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                            Faturada
                          </span>
                        )}
                        {item.isFuture && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                            Futura
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer do Modal */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingInstallmentTx(null)}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
