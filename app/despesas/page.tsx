"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus, CreditCard, Wallet, Building2, Zap, X, ChevronRight,
  AlertCircle, CheckCircle2, Clock, Sparkles, TrendingDown, TrendingUp,
  BarChart3, Calendar, MoreHorizontal, Pencil, Trash2, Download,
  PieChart, Eye, Filter, ArrowUpRight, FileSpreadsheet, Layers, Check
} from "lucide-react";
import { PeriodHeader } from "@/components/period-header";
import { usePeriod } from "@/components/period-context";
import { useModal } from "@/components/ui/custom-dialog-provider";
import {
  getAllCardsOverview, createNewCard, updateCardAccount, deleteCardAccount,
  payCardInvoiceAction, undoCardInvoicePaymentAction, getPaidInvoicesAction
} from "@/lib/actions";
import { getSubscriptionsWithMonthlyStatusAction } from "@/lib/subscription-actions";
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
      <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
        <PieChart className="w-8 h-8 text-slate-300 mb-2" />
        <p className="text-xs font-semibold text-slate-400">Nenhum gasto acumulado no cartão para o gráfico.</p>
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
    <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
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
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Faturas</span>
          <span className="text-xs font-black text-slate-800 mt-0.5">{brl(totalExpenses)}</span>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
        {slices.map((slice, i) => (
          <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-100 shadow-2xs text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
              <span className="font-bold text-slate-700 truncate">{slice.name}</span>
            </div>
            <div className="text-right shrink-0 ml-2">
              <span className="font-black text-slate-800 block">{brl(slice.value)}</span>
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
  const { selectedMonth, selectedYear } = usePeriod();
  const { showAlert } = useModal();

  const [cards, setCards]         = useState<CardOverview[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selectedHolder, setSelectedHolder] = useState<string>("TODOS");

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

  // Resumo Unificado de Assinaturas
  const [subscriptionsSummary, setSubscriptionsSummary] = useState<{
    totalMonthlyAmount: number;
    totalPaidAmount: number;
    totalPendingAmount: number;
  }>({
    totalMonthlyAmount: 0,
    totalPaidAmount: 0,
    totalPendingAmount: 0,
  });

  const loadPaidInvoices = async () => {
    try {
      const list = await getPaidInvoicesAction(selectedMonth, selectedYear);
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
      const fresh = await getAllCardsOverview(selectedMonth, selectedYear);
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
      const fresh = await getAllCardsOverview(selectedMonth, selectedYear);
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
  const [formOrigin,      setFormOrigin]      = useState<"ROLLOVER" | "SALARIO" | "FREELANCE" | "INVESTIMENTO" | "APORTE">("ROLLOVER");
  const [formTargetMonth, setFormTargetMonth] = useState<number>(selectedMonth);
  const [formTargetYear,  setFormTargetYear]  = useState<number>(selectedYear);
  const [formSaving,      setFormSaving]      = useState(false);

  // ── Carrega dados ────────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    setLoading(true);
    getAllCardsOverview(selectedMonth, selectedYear)
      .then(data => { if (active) { setCards(data); setLoading(false); } })
      .catch(err  => { console.error(err); if (active) setLoading(false); });
    loadPaidInvoices();

    getSubscriptionsWithMonthlyStatusAction(selectedMonth, selectedYear)
      .then(res => {
        if (active && res?.summary) {
          setSubscriptionsSummary({
            totalMonthlyAmount: res.summary.totalMonthlyAmount || 0,
            totalPaidAmount: res.summary.totalPaidAmount || 0,
            totalPendingAmount: res.summary.totalPendingAmount || 0,
          });
        }
      })
      .catch(err => console.error("Erro ao carregar assinaturas para despesas:", err));

    return () => { active = false; };
  }, [selectedMonth, selectedYear]);

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

  // Cálculo da porcentagem de faturas pagas no mês
  const totalFaturasMes = totalFaturas + paidInvoicesList.reduce((s, p) => s + p.amount, 0);
  const pagoFaturasMes  = paidInvoicesList.reduce((s, p) => s + p.amount, 0);
  const pctFaturasPagas = totalFaturasMes > 0
    ? Math.round((pagoFaturasMes / totalFaturasMes) * 100)
    : (paidInvoicesList.length > 0 ? 100 : 0);

  // Soma de todas as faturas pendentes do mês (fatura > 0 e NÃO pagas)
  const proximosVencimentos = creditCards.reduce((s, c) => {
    if (c.faturaAtual > 0 && !(c as any).isPaid) return s + c.faturaAtual;
    return s;
  }, 0);

  // ── 1. Cálculo do Card 1 (Compromisso Total do Mês: Despesas vs Assinaturas) ──
  const despesasMesTotal = totalFaturasMes;
  const assinaturasMesTotal = subscriptionsSummary.totalMonthlyAmount;
  const compromissoTotalMes = despesasMesTotal + assinaturasMesTotal;

  const despesasPagas = pagoFaturasMes;
  const assinaturasPagas = subscriptionsSummary.totalPaidAmount;
  const totalPagoGeral = despesasPagas + assinaturasPagas;

  const despesasPendentes = proximosVencimentos;
  const assinaturasPendentes = subscriptionsSummary.totalPendingAmount;
  const totalPendenteGeral = despesasPendentes + assinaturasPendentes;

  const pctPagoGeral = compromissoTotalMes > 0
    ? Math.min(100, Math.round((totalPagoGeral / compromissoTotalMes) * 100))
    : 0;

  // ── 2. Cálculo do Card 2 (Planejamento Detalhado de Saídas: Crédito + Débito/PIX + Assinaturas) ──
  const creditoMesTotal = totalFaturasMes;
  const debitoMesTotal = accountCards.reduce((s, c) => s + (c.faturaAtual || 0), 0);

  const previsaoGeralGastos = creditoMesTotal + debitoMesTotal + assinaturasMesTotal;

  const creditoPago = pagoFaturasMes;
  const debitoPago = debitoMesTotal; // Débitos e saídas em conta ocorrem em tempo real
  const previsaoPagoGeral = creditoPago + debitoPago + assinaturasPagas;

  const creditoPendente = proximosVencimentos;
  const debitoPendente = 0;
  const previsaoPendenteGeral = creditoPendente + debitoPendente + assinaturasPendentes;

  const pctPrevisaoQuitada = previsaoGeralGastos > 0
    ? Math.min(100, Math.round((previsaoPagoGeral / previsaoGeralGastos) * 100))
    : 0;

  // ── Análise de urgência do Próximo Vencimento ─────────────────────────────────
  const openCreditCards = creditCards
    .filter(c => c.faturaAtual > 0 && !(c as any).isPaid)
    .map(c => {
      let daysDiff: number | null = null;
      const dateStr = (c as any).vencimentoStr || `${String(c.vencimento).padStart(2, "0")}/${String(selectedMonth).padStart(2, "0")}/${selectedYear}`;
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        const todayZero = new Date();
        todayZero.setHours(0, 0, 0, 0);
        const dueZero = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        dueZero.setHours(0, 0, 0, 0);
        const diffTime = dueZero.getTime() - todayZero.getTime();
        daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      return { ...c, dateStr, daysDiff };
    });

  const urgentInvoice = openCreditCards.length > 0
    ? [...openCreditCards].sort((a, b) => {
        if (a.daysDiff === null) return 1;
        if (b.daysDiff === null) return -1;
        return a.daysDiff - b.daysDiff;
      })[0]
    : null;

  const getKpi3Info = () => {
    if (!urgentInvoice) {
      return {
        subtitle: "Todas as faturas do mês estão pagas",
        badgeText: "✓ Faturas em dia",
        badgeClass: "text-emerald-600 bg-emerald-50 border-emerald-100",
        amountColor: "text-emerald-500",
        iconColor: "text-emerald-100",
      };
    }

    const { daysDiff, dateStr } = urgentInvoice;

    if (daysDiff !== null && daysDiff < 0) {
      const absDays = Math.abs(daysDiff);
      return {
        subtitle: `Fatura vencida há ${absDays} dia${absDays > 1 ? "s" : ""} (${dateStr})`,
        badgeText: `🚨 Vencida em ${dateStr}`,
        badgeClass: "text-rose-600 bg-rose-50 border-rose-100",
        amountColor: "text-rose-500",
        iconColor: "text-rose-100",
      };
    }

    if (daysDiff === 0) {
      return {
        subtitle: `Fatura vence HOJE (${dateStr})`,
        badgeText: "⚠️ Vence Hoje!",
        badgeClass: "text-amber-600 bg-amber-50 border-amber-100",
        amountColor: "text-amber-500",
        iconColor: "text-amber-100",
      };
    }

    if (daysDiff !== null && daysDiff <= 7) {
      return {
        subtitle: `Fatura vence em ${daysDiff} dia${daysDiff > 1 ? "s" : ""} (${dateStr})`,
        badgeText: "⚠️ Atenção ao prazo!",
        badgeClass: "text-amber-600 bg-amber-50 border-amber-100",
        amountColor: "text-amber-500",
        iconColor: "text-amber-100",
      };
    }

    return {
      subtitle: `Vencimento em ${daysDiff} dias (${dateStr})`,
      badgeText: `✓ Em dia (Falta ${daysDiff} dias)`,
      badgeClass: "text-indigo-600 bg-indigo-50 border-indigo-100",
      amountColor: "text-indigo-600",
      iconColor: "text-indigo-100",
    };
  };

  const kpi3 = getKpi3Info();

  // ── Próximas faturas (lista) — somente cartões de crédito com fatura > 0 e NÃO pagas ──
  const upcomingBills: UpcomingBill[] = creditCards
    .filter(c => c.faturaAtual > 0 && !(c as any).isPaid)
    .map(c => {
      const isPast = (c as any).isPast;
      const dateStr = (c as any).vencimentoStr || `${String(c.vencimento).padStart(2, "0")}/${String(selectedMonth).padStart(2, "0")}/${selectedYear}`;

      return {
        id:         c.id,
        title:      c.title,
        bankName:   c.bankName || c.title,
        vencimento: dateStr,
        valor:      c.faturaAtual,
        status:     isPast ? ("vencido" as const) : ("aberto" as const),
        month:      (c as any).billingMonth || selectedMonth,
        year:       (c as any).billingYear || selectedYear,
      };
    });

  // ── Helpers de modal ─────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormBank(""); setFormType("CREDIT_CARD"); setFormHolder("");
    setFormAgencia(""); setFormConta(""); setFormLimit(""); setFormDiaFech(1); setFormDiaVenc(10);
    setFormOrigin("ROLLOVER"); setFormTargetMonth(selectedMonth); setFormTargetYear(selectedYear);
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
    setFormTargetMonth(selectedMonth);
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
      const fresh = await getAllCardsOverview(selectedMonth, selectedYear);
      setCards(fresh);
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
      const fresh = await getAllCardsOverview(selectedMonth, selectedYear);
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
    <div className="p-6 md:p-10 max-w-6xl mx-auto flex flex-col gap-8 select-none relative">

      {/* ── 1. HEADER ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PeriodHeader
          title="Despesas & Contas"
          tagline="Gerencie seus cartões, contas bancárias e acompanhe seus gastos consolidados."
        />

        <button
          onClick={() => exportExpensesCSV(cards, paidInvoicesList, selectedMonth, selectedYear)}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-2xl font-extrabold text-xs shadow-md transition-all cursor-pointer self-start sm:self-auto shrink-0"
          title="Exportar dados do mês em planilha CSV"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Exportar Relatório</span>
        </button>
      </div>

      {/* ── 2. BOTÕES CTA ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 -mt-4">
        <button
          id="btn-adicionar-cartao"
          onClick={openCreate}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-3 rounded-2xl font-extrabold text-xs tracking-wider shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] border border-white/10 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Adicionar Cartão / Conta
        </button>
        <button
          onClick={() => setPurchaseModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/30 text-white px-5 py-3 rounded-2xl font-extrabold text-xs tracking-wider shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Lançar Despesa
        </button>
      </div>

      {/* ── 3. KPI CARDS (4 COLUNAS RESPONSIVAS + HERO UNIFICADO) ───────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* CARD HERO DE TOTAL UNIFICADO (DESPESAS + ASSINATURAS) */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-4 card-glow p-6 rounded-2xl bg-gradient-to-br from-indigo-950/90 via-slate-900/90 to-slate-950 border border-indigo-500/40 shadow-[0_0_30px_rgba(99,102,241,0.22)] relative overflow-hidden group flex flex-col justify-between">
          <Layers className="absolute -right-4 -bottom-4 w-36 h-36 text-indigo-500/10 pointer-events-none group-hover:scale-110 transition-transform duration-300" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            
            {/* LADO ESQUERDO: Título, Valor Consolidado e Detalhamento de Origem */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-400/30 shadow-xs flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" /> Compromisso Total do Mês
                </span>
                <span className="text-[10px] font-extrabold text-slate-400">
                  Unificado · {getMonthName(selectedMonth)}/{selectedYear}
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-3">
                <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight font-tnum">
                  {brl(compromissoTotalMes)}
                </h3>
                <span className="text-xs font-bold text-slate-400">
                  ({pctPagoGeral}% quitado até o momento)
                </span>
              </div>

              {/* Detalhamento Visual de Origem */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 shadow-inner">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                  <span className="text-xs font-semibold text-slate-300">📄 Despesas do Mês:</span>
                  <span className="text-xs font-black text-rose-400 font-tnum">{brl(despesasMesTotal)}</span>
                </div>

                <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 shadow-inner">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0 animate-pulse" />
                  <span className="text-xs font-semibold text-slate-300">🔄 Assinaturas do Mês:</span>
                  <span className="text-xs font-black text-purple-400 font-tnum">{brl(assinaturasMesTotal)}</span>
                </div>
              </div>
            </div>

            {/* LADO DIREITO: Progresso do Mês (Pago vs Pendente) */}
            <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 min-w-[280px] lg:max-w-xs space-y-3 shadow-xl">
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span className="text-slate-400 uppercase tracking-wider text-[10px]">Quitação do Mês</span>
                <span className="text-indigo-400 font-black font-tnum">{pctPagoGeral}%</span>
              </div>

              {/* Barra de Progresso */}
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 transition-all duration-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  style={{ width: `${pctPagoGeral}%` }}
                />
              </div>

              {/* Detalhamento Pago vs Pendente */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 text-center">
                  <span className="text-[9px] font-black text-emerald-400 uppercase block tracking-wider">Já Pago</span>
                  <span className="text-xs font-black text-emerald-400 font-tnum">{brl(totalPagoGeral)}</span>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-center">
                  <span className="text-[9px] font-black text-amber-400 uppercase block tracking-wider">Pendente</span>
                  <span className="text-xs font-black text-amber-400 font-tnum">{brl(totalPendenteGeral)}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* CARD 2: BANNER INFERIOR - PLANEJAMENTO DETALHADO DE SAÍDAS (CRÉDITO + DÉBITO/PIX + ASSINATURAS) */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-4 card-glow p-6 rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-950 to-indigo-950/80 border border-slate-800/90 shadow-[0_0_25px_rgba(30,41,59,0.3)] relative overflow-hidden group flex flex-col justify-between">
          <BarChart3 className="absolute -right-4 -bottom-4 w-36 h-36 text-emerald-500/10 pointer-events-none group-hover:scale-110 transition-transform duration-300" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            
            {/* LADO ESQUERDO: Título, Previsão Geral e Badges de 3 Fontes */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-400/30 shadow-xs flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-400" /> Planejamento Detalhado de Saídas
                </span>
                <span className="text-[10px] font-extrabold text-slate-400">
                  Previsão Geral de Gastos · {getMonthName(selectedMonth)}/{selectedYear}
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-3">
                <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight font-tnum">
                  {brl(previsaoGeralGastos)}
                </h3>
                <span className="text-xs font-bold text-slate-400">
                  ({pctPrevisaoQuitada}% liquidado)
                </span>
              </div>

              {/* Subtítulo / Badges em Pílula Horizontais Lado a Lado (3 Fontes de Gastos) */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <div className="flex items-center gap-2 bg-slate-950/90 px-3.5 py-2 rounded-xl border border-purple-500/30 shadow-inner">
                  <span className="text-xs">💳</span>
                  <span className="text-xs font-semibold text-slate-300">Crédito:</span>
                  <span className="text-xs font-black text-purple-400 font-tnum">{brl(creditoMesTotal)}</span>
                </div>

                <div className="flex items-center gap-2 bg-slate-950/90 px-3.5 py-2 rounded-xl border border-sky-500/30 shadow-inner">
                  <span className="text-xs">🏦</span>
                  <span className="text-xs font-semibold text-slate-300">Débito / PIX:</span>
                  <span className="text-xs font-black text-sky-400 font-tnum">{brl(debitoMesTotal)}</span>
                </div>

                <div className="flex items-center gap-2 bg-slate-950/90 px-3.5 py-2 rounded-xl border border-amber-500/30 shadow-inner">
                  <span className="text-xs">🔄</span>
                  <span className="text-xs font-semibold text-slate-300">Assinaturas:</span>
                  <span className="text-xs font-black text-amber-400 font-tnum">{brl(assinaturasMesTotal)}</span>
                </div>
              </div>
            </div>

            {/* LADO DIREITO (QUITAÇÃO CONSOLIDADA DAS 3 CATEGORIAS) */}
            <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 min-w-[280px] lg:max-w-xs space-y-3 shadow-xl">
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span className="text-slate-400 uppercase tracking-wider text-[10px]">Liquidado Geral</span>
                <span className="text-emerald-400 font-black font-tnum">{pctPrevisaoQuitada}%</span>
              </div>

              {/* Barra de Progresso */}
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 via-emerald-400 to-indigo-500 transition-all duration-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  style={{ width: `${pctPrevisaoQuitada}%` }}
                />
              </div>

              {/* Detalhamento Pago vs Pendente */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 text-center">
                  <span className="text-[9px] font-black text-emerald-400 uppercase block tracking-wider">Já Pago</span>
                  <span className="text-xs font-black text-emerald-400 font-tnum">{brl(previsaoPagoGeral)}</span>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-center">
                  <span className="text-[9px] font-black text-amber-400 uppercase block tracking-wider">Pendente</span>
                  <span className="text-xs font-black text-amber-400 font-tnum">{brl(previsaoPendenteGeral)}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* KPI 0 — Saldo Total em Conta */}
        <div className="card-glow p-5 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)] relative overflow-hidden group flex flex-col justify-between">
          <Building2 className="absolute -right-3 -bottom-3 w-20 h-20 text-emerald-500/10 pointer-events-none group-hover:scale-110 transition-transform duration-300" />
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block">Saldo Total em Conta</span>
          <span className="text-[9px] font-semibold text-secondary-light block mb-2">Consolidado · Contas & Débito</span>
          <p className="text-2xl font-black text-emerald-400 tracking-tight font-tnum">{brl(saldoTotalConta)}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-black text-emerald-300 bg-emerald-500/20 px-2 py-1 rounded-full border border-emerald-400/30 shadow-2xs w-fit">
            <TrendingUp className="w-3 h-3 text-emerald-400" /> +8.5% vs mês anterior
          </span>
        </div>

        {/* KPI 1 — Total em Faturas */}
        <div className="card-glow p-5 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)] relative overflow-hidden group flex flex-col justify-between">
          <TrendingDown className="absolute -right-3 -bottom-3 w-20 h-20 text-rose-500/10 pointer-events-none group-hover:scale-110 transition-transform duration-300" />
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block">Total em Faturas</span>
          <span className="text-[9px] font-semibold text-secondary-light block mb-2">Mês Atual · Cartões de Crédito</span>
          <p className="text-2xl font-black text-rose-400 tracking-tight font-tnum">{brl(totalFaturas)}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-black text-rose-300 bg-rose-500/20 px-2 py-1 rounded-full border border-rose-400/30 shadow-2xs w-fit">
            <TrendingDown className="w-3 h-3 text-rose-400" /> -3.2% vs mês anterior
          </span>
        </div>

        {/* KPI 2 — Limite Consolidado */}
        <div className="card-glow p-5 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)] relative overflow-hidden group flex flex-col justify-between">
          <Wallet className="absolute -right-3 -bottom-3 w-20 h-20 text-indigo-500/10 pointer-events-none group-hover:scale-110 transition-transform duration-300" />
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block">Limite Consolidado</span>
          <span className="text-[9px] font-semibold text-secondary-light block mb-2">Disponível em Crédito</span>
          <p className="text-2xl font-black text-indigo-400 tracking-tight font-tnum">{brl(limiteConsolidado)}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-black text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded-full border border-indigo-400/30 shadow-2xs w-fit">
            <CheckCircle2 className="w-3 h-3 text-indigo-400" /> Limite seguro
          </span>
        </div>

        {/* KPI 3 — Próximos Vencimentos */}
        <div className="card-glow p-5 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)] relative overflow-hidden group flex flex-col justify-between">
          <Calendar className="absolute -right-3 -bottom-3 w-20 h-20 text-amber-500/10 pointer-events-none group-hover:scale-110 transition-transform duration-300" />
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block">Próximos Vencimentos</span>
          <span className="text-[9px] font-semibold text-secondary-light block mb-2">{kpi3.subtitle}</span>
          <p className="text-2xl font-black text-amber-400 tracking-tight font-tnum">{brl(proximosVencimentos)}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-black text-amber-300 bg-amber-500/20 px-2 py-1 rounded-full border border-amber-400/30 shadow-2xs w-fit">
            <Clock className="w-3.5 h-3.5 text-amber-400" /> {kpi3.badgeText}
          </span>
        </div>
      </section>

      {/* ── 4. SEÇÃO DE DISTRIBUIÇÃO GRÁFICA (DONUT CHART DE CATEGORIAS) ──────── */}
      <section className="card-glow p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/30">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Distribuição dos Gastos por Cartão</h3>
              <p className="text-[10px] font-semibold text-secondary-light">Visão consolidada das faturas ativas no mês</p>
            </div>
          </div>
        </div>
        <CategoryDonutChart cards={cards} />
      </section>

      {/* ── 5. GRID DE CARTÕES E CONTAS COM FILTRO POR TITULAR ──────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Meus Cartões e Contas ({filteredCards.length})
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCards.map(card => (
              <CardTile
                key={card.id}
                card={card}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                isPaid={!!(card as any).isPaid}
                onTogglePaid={(id) => {
                  if ((card as any).isPaid) {
                    handleUndoPayment(id, (card as any).billingMonth || selectedMonth, (card as any).billingYear || selectedYear);
                  } else {
                    setSelectedPaymentWalletId("NONE");
                    setPayModalCard({
                      id,
                      title: card.title || card.bankName,
                      amount: card.faturaAtual,
                      month: (card as any).billingMonth || selectedMonth,
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

      {/* ── 6. GESTÃO DE FATURAS DE CARTÃO + BARRA DE PROGRESSO ────────────────── */}
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
                  Faturas Pagas ({paidInvoicesList.length})
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
                    className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 transition-colors group"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      bill.status === "vencido" ? "bg-rose-100 text-rose-500" : "bg-amber-100 text-amber-500"
                    }`}>
                      {bill.status === "vencido" ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-extrabold text-slate-800 truncate">{bill.title || bill.bankName}</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Vence em {bill.vencimento}</p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-800">{brl(bill.valor)}</p>
                        <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full block mt-0.5 ${
                          bill.status === "vencido" ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-amber-50 text-amber-600 border border-amber-100"
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
                        className="flex items-center gap-1 text-[10px] font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
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
            paidInvoicesList.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <Clock className="w-8 h-8 text-slate-300" />
                <p className="text-xs font-semibold text-slate-400">Nenhuma fatura paga encontrada para este mês.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {paidInvoicesList.map((paidItem: any) => (
                  <div
                    key={paidItem.id}
                    className="flex items-center gap-4 p-4 rounded-2xl border border-emerald-100 bg-emerald-50/20 hover:bg-emerald-50/40 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-extrabold text-slate-800 truncate">{paidItem.cardTitle}</p>
                      <p className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                        Pago em {new Date(paidItem.paidAt).toLocaleDateString("pt-BR")}
                      </p>
                      <p className="text-[9px] font-medium text-slate-400 truncate">
                        Débito: {paidItem.paymentWalletTitle}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-800">{brl(paidItem.amount)}</p>
                        <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full block mt-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200">
                          PAGO
                        </span>
                      </div>

                      <button
                        onClick={() => handleUndoPayment(paidItem.walletId, paidItem.month, paidItem.year)}
                        className="text-[10px] font-bold text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
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

      {/* ── MODAIS ─────────────────────────────────────────────────────────────── */}

      {/* Modal Criar / Editar */}
      {(modalMode === "create" || modalMode === "edit") && (
        <div className="fixed inset-0 bg-slate-900/15 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/97 backdrop-blur-md rounded-[32px] border border-white/80 shadow-2xl w-full max-w-md flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">

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
        <div className="fixed inset-0 bg-slate-900/15 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/97 backdrop-blur-md rounded-[32px] border border-white/80 shadow-2xl w-full max-w-sm flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">

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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md flex flex-col gap-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
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
          getAllCardsOverview(selectedMonth, selectedYear).then(setCards);
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
  selectedMonth: number;
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
    : calculateNextDueDate(card.vencimento, selectedMonth, selectedYear, isPaid || isZero);

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

          {/* Centro: Saldo / Limite Disponível */}
          <div className="z-10 -mt-1">
            <span className="text-[8px] font-bold text-white/50 uppercase tracking-widest block">
              {isCredit ? "Disponível" : "Saldo"}
            </span>
            <h3 className="text-xl font-black text-white tracking-tight mt-0.5">
              {brl(isCredit ? card.limitTotal - card.limitUsed : card.limitTotal)}
            </h3>
          </div>

          {/* Base: Fatura + Vencimento + Barra — exclusivo para Cartão de Crédito */}
          {isCredit && (
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
