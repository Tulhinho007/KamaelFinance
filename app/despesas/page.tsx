"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus, CreditCard, Wallet, Building2, Zap, X, ChevronRight,
  AlertCircle, CheckCircle2, Clock, Sparkles,
  BarChart3, Calendar, MoreHorizontal, Pencil, Trash2, Download,
  PieChart, Eye, Filter, ArrowUpRight, FileSpreadsheet, Layers, Check,
  HelpCircle
} from "lucide-react";
import { PeriodHeader } from "@/components/period-header";
import { usePeriod } from "@/components/period-context";
import { useModal } from "@/components/ui/custom-dialog-provider";
import {
  getAllCardsOverview, createNewCard, updateCardAccount, deleteCardAccount,
  payCardInvoiceAction, undoCardInvoicePaymentAction, getPaidInvoicesAction,
  getSalaryCycleSummary, getRealRevenueAction
} from "@/lib/actions";
import { getMonthName } from "@/lib/constants";
import { getInvoiceDueDateInfo } from "@/lib/invoice-utils";
import { NewPurchaseModal } from "@/components/new-purchase-modal";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ─── Tipos ────────────────────────────────────────────────────────────────────
type CardOverview = {
  id: string;
  title: string;
  bankName: string;
  walletType: string;
  holder?: string;
  agencia?: string;
  conta?: string;
  lastDigits: string;
  cardBrand: string;
  limitTotal: number;
  limitUsed: number;
  faturaAtual: number;
  vencimento: number;
  color: string;
  accountExpenses?: number;
  totalSpentInPeriod?: number;
  accountIncomes?: number;
  isAnnualView?: boolean;
  periodExpenseCount?: number;
  periodIncomeCount?: number;
  finalBalance?: number;
};

type UpcomingBill = {
  id: string;
  title?: string;
  bankName: string;
  vencimento: string;
  valor: number;
  status: "pago" | "aberto" | "vencido";
  month: number;
  year: number;
};

// ─── Paleta de cores dos bancos (Tailwind classes p/ CardTile) ───────────────
const BANK_COLORS: Record<string, string> = {
  nubank:    "from-violet-700 via-purple-700 to-indigo-700",
  itau:      "from-orange-500 via-amber-500 to-yellow-500",
  bradesco:  "from-red-600 via-rose-600 to-pink-600",
  santander: "from-red-700 via-red-600 to-rose-500",
  inter:     "from-orange-400 via-amber-400 to-yellow-400",
  caixa:     "from-blue-700 via-blue-600 to-sky-600",
  btg:       "from-slate-700 via-slate-800 to-slate-900",
  c6:        "from-slate-900 via-zinc-800 to-slate-800",
  default:   "from-indigo-600 via-purple-600 to-violet-600",
};

// ─── Gradientes CSS inline para o Preview do modal ───────────────────────────
const BANK_GRADIENT_STYLES: Record<string, string> = {
  nubank:    "linear-gradient(135deg, #6d28d9, #7e22ce, #4338ca)",
  itau:      "linear-gradient(135deg, #f97316, #f59e0b, #eab308)",
  bradesco:  "linear-gradient(135deg, #dc2626, #e11d48, #ec4899)",
  santander: "linear-gradient(135deg, #b91c1c, #dc2626, #f43f5e)",
  inter:     "linear-gradient(135deg, #fb923c, #fbbf24, #facc15)",
  caixa:     "linear-gradient(135deg, #1d4ed8, #2563eb, #0ea5e9)",
  btg:       "linear-gradient(135deg, #334155, #1e293b, #0f172a)",
  c6:        "linear-gradient(135deg, #18181b, #27272a, #1e293b)",
  default:   "linear-gradient(135deg, #4f46e5, #9333ea, #7c3aed)",
};

function bankColor(bankName: string): string {
  const key = bankName.toLowerCase().replace(/\s/g, "");
  for (const k of Object.keys(BANK_COLORS)) {
    if (key.includes(k)) return BANK_COLORS[k];
  }
  return BANK_COLORS.default;
}

function bankGradientStyle(bankName: string): string {
  const key = bankName.toLowerCase().replace(/\s/g, "");
  for (const k of Object.keys(BANK_GRADIENT_STYLES)) {
    if (key.includes(k)) return BANK_GRADIENT_STYLES[k];
  }
  return BANK_GRADIENT_STYLES.default;
}

// ─── Projeção da Data do Próximo Vencimento ─────────────────────────────────
function calculateNextDueDate(
  vencimentoDay: number,
  selectedMonth: number,
  selectedYear: number,
  isPaidOrZero: boolean
): { dateStr: string; isPast: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let vencMonth = selectedMonth;
  let vencYear  = selectedYear;

  let vencDate = new Date(vencYear, vencMonth - 1, vencimentoDay);
  vencDate.setHours(0, 0, 0, 0);

  if (vencDate < today && isPaidOrZero) {
    vencMonth += 1;
    if (vencMonth > 12) {
      vencMonth = 1;
      vencYear += 1;
    }
    vencDate = new Date(vencYear, vencMonth - 1, vencimentoDay);
    vencDate.setHours(0, 0, 0, 0);
  }

  const isPast = vencDate < today;
  const dateStr = `${String(vencimentoDay).padStart(2, "0")}/${String(vencMonth).padStart(2, "0")}/${vencYear}`;

  return { dateStr, isPast };
}

function walletIcon(type: string) {
  if (type === "CREDIT_CARD") return CreditCard;
  if (type === "TICKET")      return Zap;
  return Building2;
}

function walletLabel(type: string) {
  if (type === "CREDIT_CARD")    return "Cartão de Crédito";
  if (type === "TICKET")         return "VA / VR / Benefício";
  if (type === "CONTA_CORRENTE") return "Conta Corrente";
  return "Carteira";
}

function walletBadgeStyle(type: string) {
  if (type === "CREDIT_CARD")    return "bg-purple-500/20 text-purple-200 border-purple-400/30";
  if (type === "CONTA_CORRENTE") return "bg-emerald-500/20 text-emerald-200 border-emerald-400/30";
  if (type === "TICKET")         return "bg-teal-500/20 text-teal-200 border-teal-400/30";
  return "bg-white/20 text-white border-white/30";
}

// ─── Exportador CSV ──────────────────────────────────────────────────────────
function exportExpensesCSV(cards: CardOverview[], paidList: any[], month: number, year: number) {
  const headers = ["Tipo", "Nome / Banco", "Titular", "Limite / Saldo Total", "Fatura / Uso Atual", "Fechamento / Vencimento"];
  const rows = cards.map(c => [
    `"${walletLabel(c.walletType)}"`,
    `"${c.bankName || c.title}"`,
    `"${c.holder || "N/A"}"`,
    c.limitTotal.toFixed(2),
    c.faturaAtual.toFixed(2),
    c.vencimento ? `"Dia ${c.vencimento}"` : '"N/A"'
  ]);

  const csvString = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `Relatorio_Despesas_${String(month).padStart(2, "0")}_${year}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─── Componente Donut Chart de Gastos por Categoria ─────────────────────────
function CategoryDonutChart({ cards }: { cards: CardOverview[] }) {
  const creditCards = cards.filter(c => c.walletType === "CREDIT_CARD");
  const totalExpenses = creditCards.reduce((s, c) => s + c.faturaAtual, 0);

  const categoriesData = creditCards
    .filter(c => c.faturaAtual > 0)
    .map(c => ({
      name: c.title || c.bankName,
      value: c.faturaAtual,
    }));

  if (categoriesData.length === 0 || totalExpenses === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
        <PieChart className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Nenhum gasto acumulado no cartão para o gráfico.</p>
      </div>
    );
  }

  const PALETTE = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#f43f5e"];
  let cumulative = 0;

  const slices = categoriesData.map((item, i) => {
    const percentage = item.value / totalExpenses;
    const angle = percentage * 360;
    const startAngle = cumulative;
    cumulative += angle;
    return {
      ...item,
      color: PALETTE[i % PALETTE.length],
      percentage: Math.round(percentage * 100),
      startAngle,
      angle,
    };
  });

  return (
    <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-slate-50/50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800">
      {/* SVG Donut */}
      <div className="relative w-36 h-36 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
          {slices.map((slice, i) => {
            const dashArray = `${(slice.angle / 360) * 283} 283`;
            const dashOffset = -((slice.startAngle / 360) * 283);
            return (
              <circle
                key={i}
                cx="50"
                cy="50"
                r="45"
                fill="transparent"
                stroke={slice.color}
                strokeWidth="10"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                className="transition-all duration-300 hover:opacity-80 cursor-pointer"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Faturas</span>
          <span className="text-xs font-black text-slate-900 dark:text-white mt-0.5">{brl(totalExpenses)}</span>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
        {slices.map((slice, i) => (
          <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xs text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{slice.name}</span>
            </div>
            <div className="text-right shrink-0 ml-2">
              <span className="font-black text-slate-900 dark:text-white block">{brl(slice.value)}</span>
              <span className="text-[9px] font-bold text-slate-400">{slice.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function DespesasPage() {
  const { showAlert } = useModal();

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<number | null>(null); // null = Todos os Meses (Visão Anual)

  const [cards, setCards]         = useState<CardOverview[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selectedHolder, setSelectedHolder] = useState<string>("TODOS");

  // ── Navegação por Abas (Visão Geral / Cartões de Crédito / Contas & Débito) ──
  const [activeTab, setActiveTab] = useState<"overview" | "credit" | "debit">("overview");

  // ── Modais e Abas de Fatura ──────────────────────────────────────────────────
  const [modalMode, setModalMode]           = useState<"create" | "edit" | "delete" | null>(null);
  const [selectedCard, setSelectedCard]     = useState<CardOverview | null>(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);

  // Controle de Faturas Pagas / Pendentes & Modal de Pagamento
  const [invoiceTab, setInvoiceTab]         = useState<"pending" | "paid">("pending");
  const [paidInvoicesList, setPaidInvoicesList] = useState<any[]>([]);
  const [payModalCard, setPayModalCard]     = useState<{ id: string; title: string; amount: number; month: number; year: number } | null>(null);
  const [selectedPaymentWalletId, setSelectedPaymentWalletId] = useState<string>("NONE");
  const [isPayingInvoice, setIsPayingInvoice] = useState(false);



  // Previsão do Mês Seguinte (Mês + 1)
  const [nextMonthData, setNextMonthData] = useState<{
    nextMonthName: string;
    nextCreditTotal: number;
    nextSubscriptionsTotal: number;
    nextGastosConsumoTotal: number;
    nextSaidasContaTotal: number;
  }>({
    nextMonthName: "",
    nextCreditTotal: 0,
    nextSubscriptionsTotal: 0,
    nextGastosConsumoTotal: 0,
    nextSaidasContaTotal: 0,
  });

  // Ciclo Salarial / Receitas
  const [totalReceitaMes, setTotalReceitaMes] = useState<number>(0);
  const [totalSaldoAnterior, setTotalSaldoAnterior] = useState<number>(0);
  const [showSalaryCycleInfo, setShowSalaryCycleInfo] = useState<boolean>(false);
  const [realRevenue, setRealRevenue] = useState<number>(0);

  const loadPaidInvoices = async () => {
    try {
      const list = await getPaidInvoicesAction(selectedMonthFilter, selectedYear);
      setPaidInvoicesList(list);
    } catch (e) {
      console.error("Erro ao carregar faturas pagas:", e);
    }
  };

  const handleConfirmPayment = async () => {
    if (!payModalCard) return;
    setIsPayingInvoice(true);
    try {
      await payCardInvoiceAction(
        payModalCard.id,
        payModalCard.month,
        payModalCard.year,
        payModalCard.amount,
        selectedPaymentWalletId
      );
      const fresh = await getAllCardsOverview(selectedMonthFilter, selectedYear);
      setCards(fresh);
      await loadPaidInvoices();
      setPayModalCard(null);
    } catch (e) {
      console.error(e);
      showAlert("Erro ao registrar pagamento da fatura.", { variant: "error" });
    } finally {
      setIsPayingInvoice(false);
    }
  };

  const handleUndoPayment = async (cardWalletId: string, month: number, year: number) => {
    try {
      await undoCardInvoicePaymentAction(cardWalletId, month, year);
      const fresh = await getAllCardsOverview(selectedMonthFilter, selectedYear);
      setCards(fresh);
      await loadPaidInvoices();
    } catch (e) {
      console.error(e);
      showAlert("Erro ao desfazer pagamento da fatura.", { variant: "error" });
    }
  };

  // ── Form de cartão (compartilhado entre criar e editar) ─────────────────────
  const [formBank,        setFormBank]        = useState("");
  const [formType,        setFormType]        = useState("CREDIT_CARD");
  const [formHolder,      setFormHolder]      = useState("");
  const [formAgencia,     setFormAgencia]     = useState("");
  const [formConta,       setFormConta]       = useState("");
  const [formLimit,       setFormLimit]       = useState<number | "">("");
  const [formDiaFech,     setFormDiaFech]     = useState<number>(1);
  const [formDiaVenc,     setFormDiaVenc]     = useState<number>(10);
  const [formOrigin,      setFormOrigin]      = useState<"ROLLOVER" | "SALARIO" | "RECARGA" | "FREELANCE" | "INVESTIMENTO" | "APORTE">("ROLLOVER");
  const [formTargetMonth, setFormTargetMonth] = useState<number>(selectedMonthFilter || (new Date().getMonth() + 1));
  const [formTargetYear,  setFormTargetYear]  = useState<number>(selectedYear);
  const [formSaving,      setFormSaving]      = useState(false);

  // ── Carrega dados em modo Anual ou Mensal ─────────────────────────────────
  useEffect(() => {
    let active = true;
    setLoading(true);

    const monthParam = selectedMonthFilter;

    Promise.all([
      getAllCardsOverview(monthParam, selectedYear),
      getPaidInvoicesAction(monthParam, selectedYear),
      getRealRevenueAction(monthParam, selectedYear),
    ])
      .then(([cardsRes, paidInvoicesRes, revenueRes]) => {
        if (!active) return;
        setCards(cardsRes || []);
        setPaidInvoicesList(paidInvoicesRes || []);
        setRealRevenue(revenueRes || 0);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro ao carregar dados de despesas:", err);
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [selectedMonthFilter, selectedYear]);

  // ── Titulares únicos para o filtro rápido ────────────────────────────────────
  const uniqueHolders = Array.from(
    new Set(cards.map(c => c.holder).filter(Boolean))
  ) as string[];

  const filteredCards = cards.filter(
    c => selectedHolder === "TODOS" || c.holder === selectedHolder
  );

  // ── KPIs consolidados ────────────────────────────────────────────────────────
  const creditCards  = cards.filter(c => c.walletType === "CREDIT_CARD");
  const accountCards = cards.filter(c => c.walletType !== "CREDIT_CARD");

  const saldoTotalConta   = accountCards.reduce((s, c) => s + c.limitTotal, 0);
  const totalFaturas      = creditCards.reduce((s, c) => s + c.faturaAtual, 0);
  const limiteConsolidado = creditCards.reduce((s, c) => s + (c.limitTotal - c.limitUsed), 0);

  // Cartões com fatura paga e sincronização unificada
  const paidCardIds = new Set(paidInvoicesList.map(p => p.walletId));
  const paidCreditCards = creditCards.filter(c => (c as any).isPaid || paidCardIds.has(c.id));

  const unifiedPaidInvoices = [...paidInvoicesList];
  paidCreditCards.forEach(c => {
    if (!unifiedPaidInvoices.some(p => p.walletId === c.id)) {
      unifiedPaidInvoices.push({
        id: `paid-${c.id}`,
        walletId: c.id,
        cardTitle: c.title,
        bankName: c.bankName || c.title,
        month: (c as any).billingMonth || selectedMonthFilter || 1,
        year: (c as any).billingYear || selectedYear,
        amount: (c as any).paidAmount > 0 ? (c as any).paidAmount : c.faturaAtual,
        paidAt: (c as any).paidAt || new Date().toISOString(),
        paymentWalletId: null,
        paymentWalletTitle: "Conta Bancária",
      });
    }
  });

  // Faturas A Vencer (cartões de crédito com fatura > 0 e NÃO pagas)
  const upcomingBills: UpcomingBill[] = creditCards
    .filter(c => c.faturaAtual > 0 && !(c as any).isPaid && !paidCardIds.has(c.id))
    .map(c => {
      const isPast = (c as any).isPast;
      const dateStr = (c as any).vencimentoStr || `${String(c.vencimento).padStart(2, "0")}/${String(selectedMonthFilter || 1).padStart(2, "0")}/${selectedYear}`;

      return {
        id:         c.id,
        title:      c.title,
        bankName:   c.bankName || c.title,
        vencimento: dateStr,
        valor:      c.faturaAtual,
        status:     isPast ? ("vencido" as const) : ("aberto" as const),
        month:      (c as any).billingMonth || selectedMonthFilter || 1,
        year:       (c as any).billingYear || selectedYear,
      };
    });

  // Cálculo da porcentagem de faturas pagas no mês
  const pagoFaturasMes    = unifiedPaidInvoices.reduce((s, p) => s + Number(p.amount), 0);
  const pendenteFaturasMes = upcomingBills.reduce((s, b) => s + Number(b.valor), 0);
  const totalFaturasMes   = pagoFaturasMes + pendenteFaturasMes;

  const pctFaturasPagas = totalFaturasMes > 0
    ? Math.min(100, Math.round((pagoFaturasMes / totalFaturasMes) * 100))
    : (unifiedPaidInvoices.length > 0 ? 100 : 0);

  const proximosVencimentos = pendenteFaturasMes;



  // ── Helpers de modal ─────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormBank(""); setFormType("CREDIT_CARD"); setFormHolder("");
    setFormAgencia(""); setFormConta(""); setFormLimit(""); setFormDiaFech(1); setFormDiaVenc(10);
    setFormOrigin("ROLLOVER"); setFormTargetMonth(selectedMonthFilter || (new Date().getMonth() + 1)); setFormTargetYear(selectedYear);
  };

  const openCreate = () => {
    resetForm();
    setSelectedCard(null);
    setModalMode("create");
  };

  const openEdit = (card: CardOverview) => {
    setSelectedCard(card);
    setFormBank(card.bankName || card.title);
    setFormType(card.walletType);
    setFormHolder(card.holder || "");
    setFormAgencia(card.agencia || "");
    setFormConta(card.conta || "");
    setFormLimit(card.limitTotal);
    setFormDiaFech((card as any).diaFechamento || 1);
    setFormDiaVenc(card.vencimento);
    setFormOrigin("ROLLOVER");
    setFormTargetMonth(selectedMonthFilter || (new Date().getMonth() + 1));
    setFormTargetYear(selectedYear);
    setModalMode("edit");
  };

  const openDelete = (card: CardOverview) => {
    setSelectedCard(card);
    setModalMode("delete");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedCard(null);
    resetForm();
  };

  // ── Handler: Criar cartão ────────────────────────────────────────────────────
  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBank) return;
    setFormSaving(true);
    try {
      await createNewCard({
        bankName:       formBank,
        walletType:     formType,
        alias:          formBank,
        holder:         formHolder,
        agencia:        formAgencia,
        conta:          formConta,
        limitOrBalance: formLimit === "" ? 0 : Number(formLimit),
        diaFechamento:  formDiaFech,
        diaVencimento:  formDiaVenc,
        originType:     formOrigin,
        targetMonth:    formTargetMonth,
        targetYear:     formTargetYear,
      });
      const fresh = await getAllCardsOverview(selectedMonthFilter, selectedYear);
      setCards(fresh);

      if (formType === "CREDIT_CARD") {
        setActiveTab("credit");
      } else {
        setActiveTab("debit");
      }

      closeModal();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao cadastrar cartão. Tente novamente.", { variant: "error" });
    } finally {
      setFormSaving(false);
    }
  };

  // ── Handler: Editar cartão ───────────────────────────────────────────────────
  const handleEditCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard || !formBank) return;
    setFormSaving(true);
    try {
      await updateCardAccount(selectedCard.id, {
        bankName:       formBank,
        walletType:     formType,
        alias:          formBank,
        holder:         formHolder,
        agencia:        formAgencia,
        conta:          formConta,
        limitOrBalance: formLimit === "" ? 0 : Number(formLimit),
        diaFechamento:  formDiaFech,
        diaVencimento:  formDiaVenc,
      });
      const fresh = await getAllCardsOverview(selectedMonthFilter, selectedYear);
      setCards(fresh);
      closeModal();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao atualizar cartão. Tente novamente.", { variant: "error" });
    } finally {
      setFormSaving(false);
    }
  };

  // ── Handler: Excluir cartão ──────────────────────────────────────────────────
  const handleDeleteCard = async () => {
    if (!selectedCard) return;
    setFormSaving(true);
    try {
      await deleteCardAccount(selectedCard.id);
      setCards(prev => prev.filter(c => c.id !== selectedCard.id));
      closeModal();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao excluir cartão. Tente novamente.", { variant: "error" });
    } finally {
      setFormSaving(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-6xl mx-auto flex flex-col gap-6 md:gap-8 select-none relative">

      {/* ── 1. HEADER ANUAL & NAVEGAÇÃO ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Despesas & Contas
            </h1>
            <span className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {selectedMonthFilter === null ? `VISÃO ANUAL – ${selectedYear}` : `${getMonthName(selectedMonthFilter)}/${selectedYear}`}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {selectedMonthFilter === null
              ? `Consolidado dos lançamentos e faturas do ano de ${selectedYear}.`
              : `Lançamentos do mês de ${getMonthName(selectedMonthFilter)} de ${selectedYear}.`}
          </p>
        </div>

        {/* Seletor de Período no Topo (Navegação Anual + Filtro por Mês) */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          
          {/* Navegador de Ano: [< ANO 2026 >] */}
          <div className="flex items-center bg-slate-50 dark:bg-slate-900 px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <button
              onClick={() => setSelectedYear(prev => prev - 1)}
              className="p-1 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
              title="Ano Anterior"
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-black text-slate-800 dark:text-white px-2 tracking-wider">
              ANO {selectedYear}
            </span>
            <button
              onClick={() => setSelectedYear(prev => prev + 1)}
              className="p-1 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
              title="Próximo Ano"
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Atalho "ANO ATUAL" */}
          <button
            onClick={() => {
              setSelectedYear(new Date().getFullYear());
              setSelectedMonthFilter(null);
            }}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 dark:bg-indigo-950/60 dark:border-indigo-800/60 dark:text-indigo-300 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
          >
            ANO ATUAL
          </button>

          {/* Dropdown de Filtro Opcional por Mês */}
          <select
            value={selectedMonthFilter === null ? "" : selectedMonthFilter}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedMonthFilter(val === "" ? null : Number(val));
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer shadow-xs"
          >
            <option value="">Todos os Meses (Visão Anual)</option>
            {[
              "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
              "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
            ].map((mName, idx) => (
              <option key={idx + 1} value={idx + 1}>{mName}</option>
            ))}
          </select>

          <button
            onClick={() => exportExpensesCSV(cards, paidInvoicesList, selectedMonthFilter || 12, selectedYear)}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
            title="Exportar relatório CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* ── 2. BOTÕES CTA ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 -mt-4 w-full sm:w-auto">
        <button
          id="btn-adicionar-cartao"
          onClick={openCreate}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white px-5 py-3 rounded-2xl font-bold text-xs tracking-wider shadow-sm transition-all hover:scale-[1.01] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Adicionar Cartão / Conta
        </button>
        <button
          onClick={() => setPurchaseModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-bold text-xs tracking-wider shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.01] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Lançar Despesa
        </button>
      </div>

      {/* ── 2.1. MÉTRICA SUPERIOR: SALDO DISPONÍVEL / RECEITA REAL ──────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="flex flex-col justify-between h-full p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#131B2E] border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden group relative">
          {/* Topo: Título e Ícone */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Saldo Disponível
            </span>
            <div className="shrink-0 p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" title="Total de entradas e receitas confirmadas no período">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>

          {/* Meio: Valor em Destaque */}
          <div className="py-2 my-auto flex items-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white font-tnum tabular-nums">
              {brl(realRevenue)}
            </h2>
          </div>

          {/* Base: Indicador Verde */}
          <div className="min-h-[36px] flex items-center mt-auto pt-2.5 border-t border-slate-100 dark:border-slate-800 w-full overflow-hidden">
            <p className="text-green-600 dark:text-emerald-400 font-semibold text-xs inline-flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+ {brl(realRevenue)}</span>
              <span className="text-slate-400 font-normal">Entradas no Mês</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. NAVEGAÇÃO POR ABAS (VISÃO GERAL / CARTÕES DE CRÉDITO / CONTAS & DÉBITO) ── */}
      <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 p-1.5 sm:p-2 rounded-2xl shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "overview"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Visão Geral</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === "overview" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
            {cards.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("credit")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "credit"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Cartões de Crédito</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === "credit" ? "bg-white/20 text-white" : "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"}`}>
            {creditCards.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("debit")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "debit"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Contas & Débito</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === "debit" ? "bg-white/20 text-white" : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"}`}>
            {accountCards.length}
          </span>
        </button>
      </div>

      {/* ── 4. SEÇÃO DE DISTRIBUIÇÃO GRÁFICA (DONUT CHART - EXIBIDO EXCLUSIVAMENTE EM CRÉDITO) ──────── */}
      {activeTab === "credit" && (
        <section className="card-glow p-6 flex flex-col gap-4 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 rounded-xl border border-indigo-200 dark:border-indigo-400/30">
                <PieChart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Distribuição dos Gastos por Cartão</h3>
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Visão consolidada das faturas ativas no mês</p>
              </div>
            </div>
          </div>
          <CategoryDonutChart cards={cards} />
        </section>
      )}

      {/* ── 5. GRID DE CARTÕES E CONTAS COM FILTRO POR TITULAR ──────────────────── */}
      {(() => {
        const displayedCards = activeTab === "credit"
          ? filteredCards.filter(c => c.walletType === "CREDIT_CARD")
          : activeTab === "debit"
          ? filteredCards.filter(c => c.walletType !== "CREDIT_CARD")
          : filteredCards;

        const tabTitle = activeTab === "credit"
          ? "Meus Cartões de Crédito"
          : activeTab === "debit"
          ? "Minhas Contas e Carteiras de Débito"
          : "Meus Cartões e Contas";

        return (
          <section className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {tabTitle} ({displayedCards.length})
              </h2>

              {/* Filtro Rápido por Titular (Pills) */}
              {uniqueHolders.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase mr-1 flex items-center gap-1 shrink-0">
                    <Filter className="w-3 h-3" /> Titular:
                  </span>
                  <button
                    onClick={() => setSelectedHolder("TODOS")}
                    className={`px-3 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer shrink-0 ${
                      selectedHolder === "TODOS"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800"
                    }`}
                  >
                    Todos ({cards.length})
                  </button>
                  {uniqueHolders.map(h => (
                    <button
                      key={h}
                      onClick={() => setSelectedHolder(h)}
                      className={`px-3 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer shrink-0 ${
                        selectedHolder === h
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800"
                      }`}
                    >
                      👤 {h}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-[28px] border border-slate-50 h-52 animate-pulse" />
                ))}
              </div>
            ) : displayedCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-white dark:bg-[#131B2E] rounded-[28px] border border-slate-200 dark:border-slate-800 p-6">
                <Building2 className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {activeTab === "credit"
                    ? "Nenhum cartão de crédito cadastrado nesta visualização."
                    : activeTab === "debit"
                    ? "Nenhuma conta corrente ou de débito cadastrada nesta visualização."
                    : "Nenhum cartão ou conta cadastrado."}
                </p>
                <button
                  onClick={openCreate}
                  className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs hover:bg-indigo-500 cursor-pointer"
                >
                  + Adicionar Novo Item
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {displayedCards.map(card => (
                  <CardTile
                    key={card.id}
                    card={card}
                    selectedMonth={selectedMonthFilter}
                    selectedYear={selectedYear}
                    isPaid={!!(card as any).isPaid}
                    onTogglePaid={(id) => {
                      if ((card as any).isPaid) {
                        handleUndoPayment(id, (card as any).billingMonth || selectedMonthFilter || 1, (card as any).billingYear || selectedYear);
                      } else {
                        setSelectedPaymentWalletId("NONE");
                        setPayModalCard({
                          id,
                          title: card.title || card.bankName,
                          amount: card.faturaAtual,
                          month: (card as any).billingMonth || selectedMonthFilter || 1,
                          year: (card as any).billingYear || selectedYear,
                        });
                      }
                    }}
                    onEdit={openEdit}
                    onDelete={openDelete}
                  />
                ))}

                {/* Card de Adição */}
                <button
                  onClick={openCreate}
                  className="group flex flex-col items-center justify-center gap-3 rounded-[28px] border-2 border-dashed border-slate-200 hover:border-indigo-300 bg-white/40 hover:bg-indigo-50/30 h-52 transition-all duration-300 hover:shadow-[0_10px_30px_rgba(99,102,241,0.08)] cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors duration-300">
                    <Plus className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 transition-colors duration-300" />
                  </div>
                  <div className="text-center px-4">
                    <p className="text-xs font-bold text-slate-400 group-hover:text-indigo-500 transition-colors duration-300 leading-relaxed">
                      Adicionar novo<br/>cartão ou conta bancária
                    </p>
                  </div>
                </button>
              </div>
            )}
          </section>
        );
      })()}

      {/* ── 6. GESTÃO DE FATURAS DE CARTÃO (EXIBIDO EM VISÃO GERAL E CRÉDITO) ────────────────── */}
      {(activeTab === "overview" || activeTab === "credit") && (
        <section>
        <div className="bg-white rounded-[28px] border border-white/80 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.03)] flex flex-col gap-5">

          {/* Header da seção + Tabs (A Vencer vs Pagas) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black tracking-widest text-slate-500 uppercase">
                Calendário Financeiro
              </span>
              <h3 className="text-base font-extrabold text-slate-800 mt-2">
                Gestão de Faturas de Cartão
              </h3>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                Status de pagamento por cartão e conta bancária
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setInvoiceTab("pending")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    invoiceTab === "pending"
                      ? "bg-white text-indigo-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  A Vencer ({upcomingBills.length})
                </button>
                <button
                  onClick={() => setInvoiceTab("paid")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    invoiceTab === "paid"
                      ? "bg-white text-emerald-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Faturas Pagas ({unifiedPaidInvoices.length})
                </button>
              </div>

              {cards.length > 0 && (
                <Link
                  href="/cartoes"
                  className="flex items-center gap-1.5 text-[10px] font-extrabold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-3 py-2 rounded-xl transition-all"
                >
                  Detalhes
                  <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>

          {/* Barra de Progresso Visual de Pagamento das Faturas do Mês */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-600 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                Progresso de Pagamento das Faturas
              </span>
              <span className="text-indigo-600 font-extrabold">{pctFaturasPagas}% pago</span>
            </div>
            <div className="w-full bg-slate-200/80 h-2.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${pctFaturasPagas}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-semibold text-slate-400">
              <span>Pago: {brl(pagoFaturasMes)}</span>
              <span>Total Faturas: {brl(totalFaturasMes)}</span>
            </div>
          </div>

          {/* Conteúdo da Aba Ativa */}
          {invoiceTab === "pending" ? (
            upcomingBills.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <p className="text-xs font-semibold text-slate-400">Nenhuma fatura pendente a vencer neste mês.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {upcomingBills.map(bill => (
                  <div
                    key={bill.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/70 transition-colors group"
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        bill.status === "vencido" ? "bg-rose-100 text-rose-500 dark:bg-rose-950/60 dark:text-rose-400" : "bg-amber-100 text-amber-500 dark:bg-amber-950/60 dark:text-amber-400"
                      }`}>
                        {bill.status === "vencido" ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">{bill.title || bill.bankName}</p>
                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Vence em {bill.vencimento}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-black text-slate-800 dark:text-white font-tnum">{brl(bill.valor)}</p>
                        <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block sm:block mt-0.5 ${
                          bill.status === "vencido" ? "bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900" : "bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900"
                        }`}>
                          {bill.status === "vencido" ? "Vencida" : "Em Aberto"}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedPaymentWalletId("NONE");
                          setPayModalCard({
                            id: bill.id,
                            title: bill.title || bill.bankName,
                            amount: bill.valor,
                            month: bill.month,
                            year: bill.year,
                          });
                        }}
                        className="flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 px-3 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
                        title="Efetuar pagamento da fatura"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Pagar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            unifiedPaidInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <Clock className="w-8 h-8 text-slate-300" />
                <p className="text-xs font-semibold text-slate-400">Nenhuma fatura paga encontrada para este mês.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {unifiedPaidInvoices.map((paidItem: any) => (
                  <div
                    key={paidItem.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/20 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/40 transition-colors group"
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">{paidItem.cardTitle}</p>
                        <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                          Pago em {new Date(paidItem.paidAt).toLocaleDateString("pt-BR")}
                        </p>
                        <p className="text-[9px] font-medium text-slate-400 truncate">
                          Débito: {paidItem.paymentWalletTitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-black text-slate-800 dark:text-white font-tnum">{brl(paidItem.amount)}</p>
                        <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block sm:block mt-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          PAGO
                        </span>
                      </div>

                      <button
                        onClick={() => handleUndoPayment(paidItem.walletId, paidItem.month, paidItem.year)}
                        className="text-[10px] font-bold text-slate-500 hover:text-rose-600 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950 border border-slate-200 dark:border-slate-700 hover:border-rose-200 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
                        title="Desfazer pagamento e reabrir fatura"
                      >
                        Desfazer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </section>
      )}

      {/* ── MODAIS ─────────────────────────────────────────────────────────────── */}

      {/* Modal Criar / Editar */}
      {(modalMode === "create" || modalMode === "edit") && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white/97 dark:bg-slate-900/95 backdrop-blur-md rounded-[32px] border border-white/80 dark:border-slate-800 shadow-2xl w-[95%] sm:w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">

            {/* Header */}
            <div className="flex justify-between items-center px-7 pt-7 pb-5 border-b border-slate-100/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
                  {modalMode === "edit"
                    ? <Pencil className="w-4 h-4 text-white" />
                    : <CreditCard className="w-4 h-4 text-white" />
                  }
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">
                    {modalMode === "edit" ? "Editar Cartão / Conta" : "Novo Cartão / Conta"}
                  </h3>
                  <p className="text-[10px] font-semibold text-slate-400">
                    {modalMode === "edit"
                      ? `Atualizando: ${selectedCard?.title}`
                      : "Preencha os dados do seu cartão ou conta"}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulário */}
            <form
              onSubmit={modalMode === "edit" ? handleEditCard : handleCreateCard}
              className="flex flex-col gap-5 px-7 py-6 overflow-y-auto max-h-[70vh]"
            >
              {/* Instituição */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Instituição / Banco *
                </label>
                <input
                  required
                  type="text"
                  value={formBank}
                  onChange={e => setFormBank(e.target.value)}
                  placeholder="Ex: Nubank, Itaú, Bradesco..."
                  className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-200 text-slate-700 placeholder:text-slate-300 transition-shadow"
                />
              </div>

              {/* Tipo — Segmented Control */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tipo *</label>
                <div className="flex gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                  {[
                    { value: "CREDIT_CARD",    label: "Cartão de Crédito" },
                    { value: "CONTA_CORRENTE", label: "Conta Corrente"    },
                    { value: "TICKET",         label: "VA / VR"           },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormType(opt.value)}
                      className={`flex-1 py-2 text-[10px] font-bold rounded-xl transition-all cursor-pointer ${
                        formType === opt.value
                          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Titular do Cartão */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Titular do Cartão
                </label>
                <input
                  type="text"
                  value={formHolder}
                  onChange={e => setFormHolder(e.target.value)}
                  placeholder="Ex: Túlio Cavalcanti"
                  className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-200 text-slate-700 placeholder:text-slate-300 transition-shadow"
                />
              </div>

              {/* Agência e Conta (Editável em ambos os modos) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Agência</label>
                  <input
                    type="text"
                    value={formAgencia}
                    onChange={e => setFormAgencia(e.target.value)}
                    placeholder="0001"
                    className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-3.5 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-200 text-slate-700 placeholder:text-slate-300"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nº da Conta</label>
                  <input
                    type="text"
                    value={formConta}
                    onChange={e => setFormConta(e.target.value)}
                    placeholder="00000-0"
                    className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-3.5 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-200 text-slate-700 placeholder:text-slate-300"
                  />
                </div>
              </div>

              {/* Limite / Saldo */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  {formType === "CREDIT_CARD" ? "Limite Total do Cartão (R$)" : "Saldo Inicial / Aporte (R$)"}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formLimit}
                  onChange={e => setFormLimit(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-200 text-slate-700 placeholder:text-slate-300"
                />
              </div>

              {/* Origem do Saldo Inicial e Mês de Aplicação (para Conta Corrente e VA/VR) */}
              {formType !== "CREDIT_CARD" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Origem do Saldo / Entrada
                    </label>
                    <select
                      value={formOrigin}
                      onChange={e => setFormOrigin(e.target.value as any)}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="ROLLOVER">Saldo do Mês Anterior (Rollover Automático)</option>
                      <option value="SALARIO">Injeção de Capital / Salário</option>
                      <option value="RECARGA">Recarga de Saldo</option>
                      <option value="FREELANCE">Renda Extra / Freelance</option>
                      <option value="INVESTIMENTO">Resgate de Investimento</option>
                      <option value="APORTE">Outra Fonte / Aporte Direto</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Mês de Aplicação
                      </label>
                      <select
                        value={formTargetMonth}
                        onChange={e => setFormTargetMonth(Number(e.target.value))}
                        className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-3.5 py-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        {[
                          "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                          "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
                        ].map((m, i) => (
                          <option key={m} value={i + 1}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Ano de Aplicação
                      </label>
                      <select
                        value={formTargetYear}
                        onChange={e => setFormTargetYear(Number(e.target.value))}
                        className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-3.5 py-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        {Array.from({ length: 11 }, (_, i) => 2020 + i).map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Dia de Fechamento & Dia de Vencimento (somente Cartão de Crédito) */}
              {formType === "CREDIT_CARD" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Dia de Fechamento
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={formDiaFech}
                      onChange={e => setFormDiaFech(Number(e.target.value))}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-3.5 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-200 text-slate-700"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Dia de Vencimento
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={formDiaVenc}
                      onChange={e => setFormDiaVenc(Number(e.target.value))}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-3.5 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-200 text-slate-700"
                    />
                  </div>
                </div>
              )}

              {/* Preview visual */}
              {formBank && (
                <div
                  className="rounded-2xl p-4 flex items-center gap-3 transition-all duration-300"
                  style={{ background: bankGradientStyle(formBank) }}
                >
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    {React.createElement(walletIcon(formType), { className: "w-4 h-4 text-white" })}
                  </div>
                  <div>
                    <p className="text-xs font-black text-white leading-none">{formBank || "Nome da instituição"}</p>
                    <p className="text-[10px] font-bold text-white/70 mt-0.5">{formBank} · {walletLabel(formType)}</p>
                  </div>
                </div>
              )}

              {/* CTA */}
              <button
                type="submit"
                disabled={formSaving}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-indigo-600/25 transition-all mt-1 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {formSaving
                  ? (modalMode === "edit" ? "SALVANDO..." : "CADASTRANDO...")
                  : (modalMode === "edit" ? "SALVAR ALTERAÇÕES" : "CADASTRAR CARTÃO / CONTA")
                }
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {modalMode === "delete" && selectedCard && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white/97 dark:bg-slate-900/95 backdrop-blur-md rounded-[32px] border border-white/80 dark:border-slate-800 shadow-2xl w-[95%] sm:w-full max-w-sm max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">

            {/* Header */}
            <div className="flex justify-between items-center px-7 pt-7 pb-5 border-b border-slate-100/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-rose-100 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">Excluir Cartão</h3>
                  <p className="text-[10px] font-semibold text-slate-400">Esta ação não poderá ser desfeita</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Corpo */}
            <div className="px-7 py-6 flex flex-col gap-6">
              <p className="text-xs font-semibold text-slate-500 leading-relaxed text-center">
                Tem certeza que deseja excluir o cartão{" "}
                <strong className="text-slate-800 font-black">"{selectedCard.title}"</strong>?
                <br />
                <span className="text-rose-500 font-bold">Todos os dados e lançamentos serão removidos permanentemente.</span>
              </p>

              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  className="flex-1 py-3 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-500 hover:text-slate-700 font-extrabold text-xs tracking-wider transition-all cursor-pointer"
                >
                  CANCELAR
                </button>
                <button
                  onClick={handleDeleteCard}
                  disabled={formSaving}
                  className="flex-1 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-rose-500/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {formSaving ? "EXCLUINDO..." : "EXCLUIR"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAB IA */}
      <button className="fixed bottom-8 right-8 z-40 bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white px-5 py-4 rounded-full shadow-lg shadow-indigo-600/30 hover:scale-105 hover:shadow-xl hover:shadow-indigo-600/40 transition-all flex items-center gap-2 font-bold text-sm tracking-tight border border-white/20 cursor-pointer">
        <Sparkles className="w-4.5 h-4.5 animate-pulse" />
        <span>Kama IA</span>
      </button>

      {/* Modal Confirmar Pagamento de Fatura com Seleção de Conta */}
      {payModalCard && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 w-[95%] sm:w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col gap-5 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Efetuar Pagamento de Fatura</h3>
                  <p className="text-[10px] font-medium text-slate-400">{payModalCard.title} · Mês {String(payModalCard.month).padStart(2, "0")}/{payModalCard.year}</p>
                </div>
              </div>
              <button onClick={() => setPayModalCard(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-500">Valor Total da Fatura</span>
                <span className="text-lg font-black text-slate-900">{brl(payModalCard.amount)}</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Conta para Débito (Opcional)</label>
                <select
                  value={selectedPaymentWalletId}
                  onChange={e => setSelectedPaymentWalletId(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="NONE">Sem débito direto em conta (Somente marcar como Paga)</option>
                  {cards.filter(c => c.walletType === "CONTA_CORRENTE" || c.walletType === "TICKET").map(bankAcc => (
                    <option key={bankAcc.id} value={bankAcc.id}>
                      {bankAcc.title} ({bankAcc.bankName}) · Saldo: {brl(bankAcc.limitTotal)}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400">
                  {selectedPaymentWalletId !== "NONE"
                    ? "O valor será debitado automaticamente no extrato da conta selecionada."
                    : "A fatura será baixada como PAGA sem lançar saída em conta corrente."}
                </p>
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setPayModalCard(null)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isPayingInvoice}
                  onClick={handleConfirmPayment}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isPayingInvoice ? "Gravando..." : "Confirmar Pagamento"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Global: Lançar Despesa */}
      <NewPurchaseModal
        isOpen={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        onSuccess={() => {
          getAllCardsOverview(selectedMonthFilter, selectedYear).then(setCards);
        }}
      />

    </div>
  );
}

// ─── Sub-componente: Card Tile com Menu Contextual (...) e Badges Distintas ─────────
function CardTile({
  card,
  selectedMonth,
  selectedYear,
  isPaid,
  onTogglePaid,
  onEdit,
  onDelete,
}: {
  card: CardOverview;
  selectedMonth: number | null;
  selectedYear: number;
  isPaid: boolean;
  onTogglePaid: (id: string) => void;
  onEdit: (card: CardOverview) => void;
  onDelete: (card: CardOverview) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const usagePct = card.limitTotal > 0
    ? Math.min(100, Math.round((card.limitUsed / card.limitTotal) * 100))
    : 0;

  const usageColor =
    usagePct >= 90 ? "bg-rose-500" :
    usagePct >= 70 ? "bg-amber-500" :
    "bg-indigo-500";

  const gradient = bankColor(card.bankName || card.title);
  const Icon     = walletIcon(card.walletType);
  const isCredit = card.walletType === "CREDIT_CARD";

  const isZero = card.faturaAtual === 0;
  const dueDateInfo = (card as any).vencimentoStr
    ? { dateStr: (card as any).vencimentoStr }
    : calculateNextDueDate(card.vencimento, selectedMonth || (new Date().getMonth() + 1), selectedYear, isPaid || isZero);

  const isYearlyFilter = selectedMonth === null || selectedMonth === undefined || card.isAnnualView;
  const accountSpentInPeriod = card.totalSpentInPeriod ?? card.accountExpenses ?? 0;
  const accountIncomes = card.accountIncomes ?? 0;

  return (
    <div className="relative group">
      {/* Card clicável para navegação */}
      <Link href={`/cartoes/${card.id}`} className="block">
        <div className={`relative rounded-[28px] overflow-hidden h-52 bg-gradient-to-br ${gradient} p-5 flex flex-col justify-between cursor-pointer shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 border border-white/10`}>

          {/* Marca d'água sutil */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.12)_0%,_transparent_60%)] pointer-events-none" />

          {/* Topo: Banco + Titular + Badge de Tipo */}
          <div className="flex justify-between items-start z-10">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8.5 h-8.5 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/20">
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] font-black text-white/90 leading-none truncate">{card.bankName || card.title}</p>
                </div>
                <span className={`inline-block mt-1 text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full border backdrop-blur-xs ${walletBadgeStyle(card.walletType)}`}>
                  {walletLabel(card.walletType)}
                </span>
                {card.holder && (
                  <p className="text-[9px] font-extrabold text-white/95 uppercase tracking-wide mt-0.5 drop-shadow-sm truncate">
                    👤 {card.holder}
                  </p>
                )}
              </div>
            </div>

            {/* Agência, Conta e Dígitos */}
            <div className="text-right pr-8 shrink-0">
              <p className="text-[9px] font-black text-white/80 uppercase tracking-wider">{card.cardBrand || "CARTÃO"}</p>
              {(card.agencia || card.conta) && (
                <p className="text-[9px] font-bold text-white/90 mt-0.5">
                  {card.agencia ? `Ag: ${card.agencia}` : ""} {card.conta ? `Cc: ${card.conta}` : ""}
                </p>
              )}
              <p className="text-[10px] font-bold text-white/60 mt-0.5">{card.lastDigits || "**** ----"}</p>
            </div>
          </div>

          {/* Centro: Saldo / Limite Disponível & Gasto no Período */}
          {isCredit ? (
            <div className="z-10 -mt-1">
              <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest block">
                Disponível
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5 font-tnum tabular-nums">
                {brl(card.limitTotal - card.limitUsed)}
              </h3>
            </div>
          ) : (
            <div className="z-10 my-auto flex flex-col justify-center space-y-1.5">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-white/80 block">
                  Saldo Atual
                </span>
                <p className="text-xl sm:text-2xl font-black tracking-tight text-white font-tnum tabular-nums mt-0.5">
                  {brl(card.finalBalance ?? card.limitTotal)}
                </p>
              </div>

              {/* Bloco dinâmico de gasto conforme o filtro */}
              <div className="flex items-center justify-between pt-1.5 border-t border-white/15 text-xs">
                <span className="text-white/80 text-[10px] font-bold uppercase tracking-wider">
                  {isYearlyFilter ? "Gasto no Ano:" : "Gasto no Mês:"}
                </span>
                <span className="font-black text-white text-xs font-tnum tabular-nums">
                  {brl(accountSpentInPeriod)}
                </span>
              </div>
            </div>
          )}

          {/* Base: Fatura + Vencimento + Barra (Crédito) OU Detalhamento de Saídas/Entradas (Débito/Conta) */}
          {isCredit ? (
            <div className="z-10 flex flex-col gap-1">
              <div className="flex justify-between items-center text-[9px] font-bold text-white/70">
                <span>Fatura: <span className="text-white font-black">{brl(card.faturaAtual)}</span></span>
                <span>
                  {isPaid ? (
                    <span className="text-emerald-300 font-extrabold bg-white/20 px-2 py-0.5 rounded-full">✓ Fatura Paga</span>
                  ) : isZero ? (
                    <span className="text-white/80 font-bold">Fatura Zerada</span>
                  ) : (
                    <>Vence <span className="text-white font-black">{dueDateInfo.dateStr}</span></>
                  )}
                </span>
              </div>

              <div className="flex justify-between text-[8px] font-extrabold text-white/60 uppercase tracking-wider">
                <span>Fech: Dia {String((card as any).diaFechamento || 1).padStart(2, "0")}</span>
                <span>Melhor Dia: Dia {String((card as any).melhorDiaCompra || 2).padStart(2, "0")}</span>
              </div>

              <div className="flex flex-col gap-0.5">
                <div className="h-1.5 w-full bg-white/15 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${usageColor} rounded-full transition-all duration-700`}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
                <span className="text-[8px] font-bold text-white/50">{usagePct}% do limite utilizado</span>
              </div>
            </div>
          ) : (
            /* Rodapé / Detalhe Adicional para equilibrar perfeitamente o card com o cartão de crédito roxo ao lado */
            <div className="z-10 flex flex-col gap-1.5 pt-2 border-t border-white/15">
              <div className="flex justify-between items-center text-[9px] font-bold">
                <span className="text-white/85">
                  Saídas: <strong className="text-white font-black">{brl(accountSpentInPeriod)}</strong>
                </span>
                <span className="text-emerald-300 font-bold">
                  Entradas: <strong className="text-white font-black">{brl(accountIncomes)}</strong>
                </span>
              </div>

              <div className="flex justify-between items-center text-[8px] font-extrabold text-white/75 uppercase tracking-wider">
                <span className="bg-white/15 px-2 py-0.5 rounded-full border border-white/20 backdrop-blur-xs">
                  Ref: {isYearlyFilter ? `${selectedYear}` : `${String(selectedMonth || (new Date().getMonth() + 1)).padStart(2, "0")}/${selectedYear}`}
                </span>
                <span>
                  {card.periodExpenseCount !== undefined
                    ? `${card.periodExpenseCount} ${card.periodExpenseCount === 1 ? 'saída' : 'saídas'}`
                    : "Conta Ativa"}
                </span>
              </div>
            </div>
          )}
        </div>
      </Link>

      {/* ── Menu Contextual (...) de Ações ── */}
      <div
        className="absolute top-3 right-3 z-20"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); setMenuOpen(prev => !prev); }}
          className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
            menuOpen
              ? "bg-white/30 text-white"
              : "bg-white/10 group-hover:bg-white/25 text-white/80 group-hover:text-white border border-white/20"
          }`}
          title="Opções do cartão"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={e => { e.stopPropagation(); setMenuOpen(false); }}
            />
            <div className="absolute top-9 right-0 z-20 bg-white rounded-2xl border border-slate-100 shadow-xl py-1.5 w-52 animate-in fade-in zoom-in-95 duration-150">
              <Link
                href={`/cartoes/${card.id}`}
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors text-left"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-500" />
                Ver Extrato & Detalhes
              </Link>
              
              <button
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen(false);
                  onEdit(card);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors text-left cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-400" />
                Editar Cartão
              </button>

              <button
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen(false);
                  onEdit(card);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors text-left cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                Ajustar Limite / Saldo
              </button>

              {isCredit && card.faturaAtual > 0 && (
                <>
                  <div className="h-px bg-slate-100 mx-3 my-1" />
                  <button
                    onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenuOpen(false);
                      onTogglePaid(card.id);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition-colors text-left cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isPaid ? "Desmarcar Paga" : "Pagar Fatura"}
                  </button>
                </>
              )}

              <div className="h-px bg-slate-100 mx-3 my-1" />
              
              <button
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDelete(card);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir Cartão
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
