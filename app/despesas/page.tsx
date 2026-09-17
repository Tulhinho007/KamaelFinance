"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus, CreditCard, Wallet, Building2, Zap, X, ChevronRight,
  AlertCircle, CheckCircle2, Clock, Sparkles,
  BarChart3, Calendar, MoreHorizontal, Pencil, Trash2, Download,
  PieChart, Eye, Filter, ArrowUpRight, FileSpreadsheet, Layers, Check,
  HelpCircle, Repeat, Receipt, RotateCcw, Search, Copy
} from "lucide-react";
import { PeriodHeader } from "@/components/period-header";
import { usePeriod } from "@/components/period-context";
import { useModal } from "@/components/ui/custom-dialog-provider";
import {
  getAllCardsOverview, createNewCard, updateCardAccount, deleteCardAccount,
  payCardInvoiceAction, undoCardInvoicePaymentAction, getPaidInvoicesAction,
  getSalaryCycleSummary, getRealRevenueAction, getPendingRevenuesAction,
  getPendingExpensesAction, markExpenseAsPaidAction, undoExpensePaymentAction, getPaidExpensesAction,
  getRecurringExpensesAction, getUpcomingBillsWindowAction,
  getMonthlyCommitmentsAction, createCommitmentAction, payCommitmentAction,
  payBatchCommitmentsAction,
  undoCommitmentPaymentAction, updateCommitmentAction, deleteCommitmentAction,
  getMonthlyCashFlowRollForwardAction, MonthlyCashFlowRollForwardResult
} from "@/lib/actions";
import { getMonthName } from "@/lib/constants";
import { getInvoiceDueDateInfo } from "@/lib/invoice-utils";
import { NewPurchaseModal } from "@/components/new-purchase-modal";
import { CurrencyValue } from "@/components/currency-value";
import { CardContaFluxo } from "@/components/card-conta-fluxo";
import { CardSaldoPrevisto } from "@/components/card-saldo-previsto";
import { InjectBalanceModal, BalanceMovementOrigin } from "@/components/inject-balance-modal";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatCurrency = brl;

const MONTH_NAMES_LIST = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// ─── Constantes & Enums ───────────────────────────────────────────────────────
export const TIPOS_CARTAO = [
  { label: "Conta Bancária", value: "CONTA_CORRENTE" },
  { label: "Cartão de Crédito", value: "CREDIT_CARD" },
  { label: "Ticket / Benefício", value: "TICKET" }
];

// ─── Tipos ────────────────────────────────────────────────────────────────────
type CardOverview = {
  id: string;
  title: string;
  bankName: string;
  walletType: string;
  tipo?: string;
  saldoAtual?: number;
  gastoMes?: number;
  recargaMes?: number;
  holder?: string;
  agencia?: string;
  conta?: string;
  lastDigits: string;
  cardBrand: string;
  limitTotal: number;
  limitUsed: number;
  faturaAtual: number;
  vencimento: number;
  diaFechamento?: number;
  diaRecarga?: number;
  color: string;
  accountExpenses?: number;
  totalSpentInPeriod?: number;
  accountIncomes?: number;
  isAnnualView?: boolean;
  periodExpenseCount?: number;
  periodIncomeCount?: number;
  finalBalance?: number;
  monthExpense?: number;
  monthIncome?: number;
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
  if (type === "CREDIT_CARD" || type === "CREDITO") return CreditCard;
  if (type === "TICKET" || type === "BENEFICIO" || type === "BENEFÍCIO") return Zap;
  return Building2;
}

function walletLabel(type: string) {
  if (type === "CREDIT_CARD" || type === "CREDITO") return "Cartão de Crédito";
  if (type === "TICKET" || type === "BENEFICIO" || type === "BENEFÍCIO") return "Ticket / Benefício";
  return "Conta Bancária";
}

function walletBadgeStyle(type: string) {
  if (type === "CREDIT_CARD" || type === "CREDITO") return "bg-purple-500/20 text-purple-200 border-purple-400/30";
  if (type === "TICKET" || type === "BENEFICIO" || type === "BENEFÍCIO") return "bg-amber-500/20 text-amber-200 border-amber-400/30";
  return "bg-emerald-500/20 text-emerald-200 border-emerald-400/30";
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
      <div className="flex flex-col items-center justify-center p-6 text-slate-400 dark:text-slate-500">
        <div className="w-32 h-32 rounded-full border-4 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center">
          <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">R$ 0,00</span>
        </div>
        <p className="text-xs mt-3 font-medium">Nenhum pagamento liquidado no mês</p>
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
  const { selectedMonth, selectedYear, setPeriod } = usePeriod();

  const [selectedMonthFilter, setSelectedMonthFilter] = useState<number | null>(selectedMonth || 9);

  useEffect(() => {
    if (selectedMonth && selectedMonthFilter !== selectedMonth) {
      setSelectedMonthFilter(selectedMonth);
    }
  }, [selectedMonth]);

  const activeMonth = selectedMonthFilter ?? selectedMonth ?? (new Date().getMonth() + 1);
  const activeYear  = selectedYear ?? 2026;

  const [cards, setCards]         = useState<CardOverview[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selectedHolder, setSelectedHolder] = useState<string>("TODOS");

  // ── Navegação por Abas (Visão Geral / Contas Bancárias / Cartões de Crédito / Tickets) ──
  const [activeTab, setActiveTab] = useState<"overview" | "bank" | "credit" | "ticket">("overview");

  // ── Modais e Abas de Fatura ──────────────────────────────────────────────────
  const [modalMode, setModalMode]           = useState<"create" | "edit" | "delete" | null>(null);
  const [selectedCard, setSelectedCard]     = useState<CardOverview | null>(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);

  // Controle de Faturas Pagas / Pendentes & Modal de Pagamento
  const [invoiceTab, setInvoiceTab]                 = useState<"pending" | "paid">("pending");
  const [paidInvoicesList, setPaidInvoicesList]     = useState<any[]>([]);
  const [pendingExpensesList, setPendingExpensesList] = useState<any[]>([]);
  const [paidExpensesList, setPaidExpensesList]       = useState<any[]>([]);
  const [recurringExpensesList, setRecurringExpensesList] = useState<any[]>([]);
  const [windowBills, setWindowBills] = useState<{
    pendingBills: any[];
    paidBills: any[];
    upcomingCardInvoices: any[];
    paidCardInvoices: any[];
    receitasPendentesDoMes?: number;
    pendingRevenues?: any[];
    totals: {
      totalPendente: number;
      totalPago: number;
      totalGeral: number;
      pctGeralPago: number;
      receitasPendentes?: number;
    };
  } | null>(null);
  const [receitasPendentesMes, setReceitasPendentesMes] = useState<number>(0);
  const [monthlyRollForward, setMonthlyRollForward] = useState<MonthlyCashFlowRollForwardResult | null>(null);
  const [payModalCard, setPayModalCard]             = useState<{ id: string; title: string; amount: number; month: number; year: number } | null>(null);
  const [selectedPaymentWalletId, setSelectedPaymentWalletId] = useState<string>("NONE");
  const [isPayingInvoice, setIsPayingInvoice]       = useState(false);
  const [injectModalOpen, setInjectModalOpen]       = useState(false);
  const [injectOrigin, setInjectOrigin]             = useState<BalanceMovementOrigin>("DEPOSITO");
  const [injectTipoOperacao, setInjectTipoOperacao] = useState<"ENTRADA" | "SAIDA">("ENTRADA");

  // ── Central de Compromissos Fixos e Contas a Pagar do Mês ──
  const [mainView, setMainView] = useState<"compromissos" | "cartoes">("cartoes");
  const [commitmentsLoading, setCommitmentsLoading] = useState(true);
  const [commitmentsData, setCommitmentsData] = useState<{
    items: any[];
    totals: { totalMes: number; totalPendente: number; totalPago: number };
    contasBancarias: { id: string; banco: string; saldoAtual: number }[];
    cartoesCredito: { id: string; nome: string; limiteDisponivel: number; limiteTotal: number; faturaAtual: number }[];
  }>({
    items: [],
    totals: { totalMes: 0, totalPendente: 0, totalPago: 0 },
    contasBancarias: [],
    cartoesCredito: [],
  });

  const [commitmentStatusFilter, setCommitmentStatusFilter] = useState<"TODOS" | "PENDENTE" | "PAGO">("TODOS");
  const [commitmentSearch, setCommitmentSearch] = useState("");

  // Modal "+ Novo Boleto / Assinatura"
  const [newCommitmentModalOpen, setNewCommitmentModalOpen] = useState(false);
  const [savingCommitment, setSavingCommitment] = useState(false);
  const [newCommitmentDesc, setNewCommitmentDesc] = useState("");
  const [newCommitmentAmount, setNewCommitmentAmount] = useState("");
  const [newCommitmentDueDate, setNewCommitmentDueDate] = useState("");
  const [newCommitmentTipo, setNewCommitmentTipo] = useState<"BOLETO" | "ASSINATURA">("BOLETO");
  const [newCommitmentRecorrencia, setNewCommitmentRecorrencia] = useState<"MENSAL" | "UNICO">("MENSAL");
  const [newCommitmentCompMonth, setNewCommitmentCompMonth] = useState<number>(() => selectedMonthFilter || (new Date().getMonth() + 1));
  const [newCommitmentCompYear, setNewCommitmentCompYear] = useState<number>(() => selectedYear || 2026);

  // Modal de Baixa ("Confirmar Pagamento")
  const [payCommitmentItem, setPayCommitmentItem] = useState<any | null>(null);
  const [payingCommitment, setPayingCommitment] = useState(false);
  const [baixaForma, setBaixaForma] = useState<"SALDO_CONTA" | "DEBITO_AUTOMATICO" | "PIX" | "CARTAO_CREDITO" | "DINHEIRO">("SALDO_CONTA");
  const [baixaContaId, setBaixaContaId] = useState<string>("");
  const [baixaCartaoId, setBaixaCartaoId] = useState<string>("");
  const [baixaData, setBaixaData] = useState<string>(new Date().toISOString().split("T")[0]);

  // Seleção e Baixa em Lote ("Dar Baixa em Múltiplos")
  const [selectedCommitmentIds, setSelectedCommitmentIds] = useState<string[]>([]);
  const [batchBaixaModalOpen, setBatchBaixaModalOpen] = useState(false);
  const [payingBatchCommitment, setPayingBatchCommitment] = useState(false);
  const [batchBaixaForma, setBatchBaixaForma] = useState<"SALDO_CONTA" | "DEBITO_AUTOMATICO" | "PIX" | "CARTAO_CREDITO" | "DINHEIRO">("SALDO_CONTA");
  const [batchBaixaContaId, setBatchBaixaContaId] = useState<string>("");
  const [batchBaixaCartaoId, setBatchBaixaCartaoId] = useState<string>("");
  const [batchBaixaData, setBatchBaixaData] = useState<string>(new Date().toISOString().split("T")[0]);

  const openBatchBaixaModal = () => {
    setBatchBaixaForma("SALDO_CONTA");
    if (commitmentsData.contasBancarias.length > 0) {
      setBatchBaixaContaId(commitmentsData.contasBancarias[0].id);
    }
    if (commitmentsData.cartoesCredito.length > 0) {
      setBatchBaixaCartaoId(commitmentsData.cartoesCredito[0].id);
    }
    setBatchBaixaData(new Date().toISOString().split("T")[0]);
    setBatchBaixaModalOpen(true);
  };

  const handleEfetivarBaixaLote = async () => {
    if (selectedCommitmentIds.length === 0) return;
    if (["SALDO_CONTA", "DEBITO_AUTOMATICO", "PIX"].includes(batchBaixaForma) && !batchBaixaContaId) {
      showAlert("Selecione a conta corrente que será debitada.", { variant: "warning" });
      return;
    }
    if (batchBaixaForma === "CARTAO_CREDITO" && !batchBaixaCartaoId) {
      showAlert("Selecione o cartão de crédito para lançamento.", { variant: "warning" });
      return;
    }
    setPayingBatchCommitment(true);
    try {
      await payBatchCommitmentsAction({
        commitmentIds: selectedCommitmentIds,
        formaPagamento: batchBaixaForma,
        contaBancariaId: batchBaixaContaId,
        cartaoCreditoId: batchBaixaCartaoId,
        dataBaixa: batchBaixaData,
      });
      setBatchBaixaModalOpen(false);
      setSelectedCommitmentIds([]);
      await reloadAllData();
      showAlert("Baixa em lote confirmada com sucesso! O extrato da conta foi sincronizado.", { variant: "success" });
    } catch (err: any) {
      console.error(err);
      showAlert(err?.message || "Erro ao efetivar baixa em lote.", { variant: "error" });
    } finally {
      setPayingBatchCommitment(false);
    }
  };

  // Modal de Edição
  const [editCommitmentItem, setEditCommitmentItem] = useState<any | null>(null);
  const [editingCommitment, setEditingCommitment] = useState(false);
  const [editCommitmentDesc, setEditCommitmentDesc] = useState("");
  const [editCommitmentAmount, setEditCommitmentAmount] = useState("");
  const [editCommitmentDueDate, setEditCommitmentDueDate] = useState("");
  const [editCommitmentTipo, setEditCommitmentTipo] = useState<"BOLETO" | "ASSINATURA">("BOLETO");
  const [editCommitmentRecorrencia, setEditCommitmentRecorrencia] = useState<"MENSAL" | "UNICO">("MENSAL");
  const [editCommitmentCompMonth, setEditCommitmentCompMonth] = useState<number>(() => selectedMonthFilter || 9);
  const [editCommitmentCompYear, setEditCommitmentCompYear] = useState<number>(() => selectedYear || 2026);

  const openNewCommitmentModal = () => {
    setNewCommitmentDesc("");
    setNewCommitmentAmount("");
    setNewCommitmentDueDate("");
    setNewCommitmentTipo("BOLETO");
    setNewCommitmentRecorrencia("MENSAL");
    setNewCommitmentCompMonth(selectedMonthFilter || (new Date().getMonth() + 1));
    setNewCommitmentCompYear(selectedYear || 2026);
    setNewCommitmentModalOpen(true);
  };

  const handleSaveNewCommitment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommitmentDesc.trim() || !newCommitmentAmount || Number(newCommitmentAmount) <= 0 || !newCommitmentDueDate) {
      showAlert("Preencha todos os campos corretamente.", { variant: "warning" });
      return;
    }
    setSavingCommitment(true);
    try {
      await createCommitmentAction({
        description: newCommitmentDesc.trim(),
        amount: Number(newCommitmentAmount),
        dueDate: newCommitmentDueDate,
        tipo: newCommitmentTipo,
        recorrencia: newCommitmentRecorrencia,
        competenceMonth: newCommitmentCompMonth,
        competenceYear: newCommitmentCompYear,
      });
      setNewCommitmentModalOpen(false);
      setNewCommitmentDesc("");
      setNewCommitmentAmount("");
      setNewCommitmentDueDate("");
      setNewCommitmentTipo("BOLETO");
      setNewCommitmentRecorrencia("MENSAL");
      await reloadAllData();
      showAlert("Compromisso cadastrado com sucesso!", { variant: "success" });
    } catch (err: any) {
      console.error(err);
      showAlert(err?.message || "Erro ao salvar compromisso.", { variant: "error" });
    } finally {
      setSavingCommitment(false);
    }
  };

  const openBaixaModal = (item: any) => {
    setPayCommitmentItem(item);
    setBaixaForma("SALDO_CONTA");
    if (commitmentsData.contasBancarias.length > 0) {
      setBaixaContaId(commitmentsData.contasBancarias[0].id);
    }
    if (commitmentsData.cartoesCredito.length > 0) {
      setBaixaCartaoId(commitmentsData.cartoesCredito[0].id);
    }
    setBaixaData(new Date().toISOString().split("T")[0]);
  };

  const handleEfetivarBaixa = async () => {
    if (!payCommitmentItem) return;
    if (["SALDO_CONTA", "DEBITO_AUTOMATICO", "PIX"].includes(baixaForma) && !baixaContaId) {
      showAlert("Selecione a conta corrente que será debitada.", { variant: "warning" });
      return;
    }
    if (baixaForma === "CARTAO_CREDITO" && !baixaCartaoId) {
      showAlert("Selecione o cartão de crédito para lançamento.", { variant: "warning" });
      return;
    }
    setPayingCommitment(true);
    try {
      await payCommitmentAction({
        commitmentId: payCommitmentItem.id,
        formaPagamento: baixaForma,
        contaBancariaId: baixaContaId,
        cartaoCreditoId: baixaCartaoId,
        dataBaixa: baixaData,
      });
      setPayCommitmentItem(null);
      await reloadAllData();
      showAlert("Baixa confirmada com sucesso! O extrato da conta foi sincronizado.", { variant: "success" });
    } catch (err: any) {
      console.error(err);
      showAlert(err?.message || "Erro ao efetivar baixa.", { variant: "error" });
    } finally {
      setPayingCommitment(false);
    }
  };

  const handleUndoCommitment = async (commitmentId: string) => {
    try {
      await undoCommitmentPaymentAction(commitmentId);
      await reloadAllData();
      showAlert("Pagamento desfeito! O compromisso retornou para pendente.", { variant: "success" });
    } catch (err: any) {
      console.error(err);
      showAlert(err?.message || "Erro ao desfazer pagamento.", { variant: "error" });
    }
  };

  const handleDeleteCommitment = async (commitmentId: string) => {
    if (!confirm("Tem certeza que deseja excluir este compromisso?")) return;
    try {
      await deleteCommitmentAction(commitmentId);
      await reloadAllData();
      showAlert("Compromisso excluído com sucesso!", { variant: "success" });
    } catch (err: any) {
      console.error(err);
      showAlert(err?.message || "Erro ao excluir compromisso.", { variant: "error" });
    }
  };

  const [replicatingId, setReplicatingId] = useState<string | null>(null);

  const handleReplicateCommitment = async (itemOriginal: any) => {
    try {
      setReplicatingId(itemOriginal.id);

      // 1. Calcula o próximo mês de competência (Ex: de "2026-09" para "2026-10")
      let anoComp = itemOriginal.competenceYear;
      let mesComp = itemOriginal.competenceMonth;
      if (!anoComp || !mesComp) {
        if (itemOriginal.competencia && itemOriginal.competencia.includes("-")) {
          const parts = itemOriginal.competencia.split("-").map(Number);
          anoComp = parts[0];
          mesComp = parts[1];
        } else {
          anoComp = selectedYear || 2026;
          mesComp = selectedMonthFilter || 9;
        }
      }

      let novoAnoComp = anoComp;
      let novoMesComp = mesComp + 1;
      if (novoMesComp > 12) {
        novoMesComp = 1;
        novoAnoComp += 1;
      }

      // 2. Calcula o vencimento exato no mês seguinte mantendo o mesmo dia
      // (Ex: se vence em 06/10/2026, passa a vencer em 06/11/2026)
      const dueDateStr = itemOriginal.dueDateInput || (itemOriginal.dueDateRaw ? itemOriginal.dueDateRaw.split("T")[0] : "");
      let novoVencimento = "";
      if (dueDateStr && dueDateStr.includes("-")) {
        const [vYear, vMonth, vDay] = dueDateStr.split("-").map(Number);
        let nextVMonth = vMonth + 1;
        let nextVYear = vYear;
        if (nextVMonth > 12) {
          nextVMonth = 1;
          nextVYear += 1;
        }
        const maxDaysInNextMonth = new Date(nextVYear, nextVMonth, 0).getDate();
        const adjustedDay = Math.min(vDay, maxDaysInNextMonth);
        novoVencimento = `${nextVYear}-${String(nextVMonth).padStart(2, "0")}-${String(adjustedDay).padStart(2, "0")}`;
      } else {
        const now = new Date();
        const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 10);
        novoVencimento = nextDate.toISOString().split("T")[0];
      }

      // 3. Salva no banco via createCommitmentAction (nasce PENDENTE com novo ID)
      await createCommitmentAction({
        description: itemOriginal.description,
        amount: Number(itemOriginal.amount),
        dueDate: novoVencimento,
        tipo: itemOriginal.tipo || "BOLETO",
        recorrencia: itemOriginal.recorrencia || "MENSAL",
        competenceMonth: novoMesComp,
        competenceYear: novoAnoComp,
      });

      await reloadAllData();
      showAlert(
        `"${itemOriginal.description}" replicado com sucesso para a competência ${String(novoMesComp).padStart(2, "0")}/${novoAnoComp}!`,
        { variant: "success" }
      );
    } catch (err: any) {
      console.error("Erro ao replicar compromisso:", err);
      showAlert(err?.message || "Erro ao replicar compromisso para o mês seguinte.", { variant: "error" });
    } finally {
      setReplicatingId(null);
    }
  };

  const openEditCommitment = (item: any) => {
    setEditCommitmentItem(item);
    setEditCommitmentDesc(item.description);
    setEditCommitmentAmount(String(item.amount));
    setEditCommitmentDueDate(item.dueDateInput || item.dueDateRaw?.split("T")[0] || "");
    setEditCommitmentTipo(item.tipo || "BOLETO");
    setEditCommitmentRecorrencia(item.recorrencia || "MENSAL");
    setEditCommitmentCompMonth(item.competenceMonth || (item.dueDateRaw ? new Date(item.dueDateRaw).getUTCMonth() + 1 : (selectedMonthFilter || 9)));
    setEditCommitmentCompYear(item.competenceYear || (item.dueDateRaw ? new Date(item.dueDateRaw).getUTCFullYear() : (selectedYear || 2026)));
  };

  const handleSaveEditCommitment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCommitmentItem) return;
    if (!editCommitmentDesc.trim() || !editCommitmentAmount || Number(editCommitmentAmount) <= 0 || !editCommitmentDueDate) {
      showAlert("Preencha todos os campos obrigatórios.", { variant: "warning" });
      return;
    }
    setEditingCommitment(true);
    try {
      await updateCommitmentAction({
        id: editCommitmentItem.id,
        description: editCommitmentDesc.trim(),
        amount: Number(editCommitmentAmount),
        dueDate: editCommitmentDueDate,
        tipo: editCommitmentTipo,
        recorrencia: editCommitmentRecorrencia,
        competenceMonth: editCommitmentCompMonth,
        competenceYear: editCommitmentCompYear,
      });
      setEditCommitmentItem(null);
      await reloadAllData();
      showAlert("Compromisso atualizado com sucesso!", { variant: "success" });
    } catch (err: any) {
      console.error(err);
      showAlert(err?.message || "Erro ao atualizar compromisso.", { variant: "error" });
    } finally {
      setEditingCommitment(false);
    }
  };

  const reloadAllData = async () => {
    try {
      const [freshCards, freshPaidInv, freshRev, freshPending, freshPaidExp, freshRecurring, freshWindow, freshPendingRev, freshCommitments, freshRollForward] = await Promise.all([
        getAllCardsOverview(selectedMonthFilter, selectedYear),
        getPaidInvoicesAction(selectedMonthFilter, selectedYear),
        getRealRevenueAction(selectedMonthFilter, selectedYear),
        getPendingExpensesAction(selectedMonthFilter, selectedYear),
        getPaidExpensesAction(selectedMonthFilter, selectedYear),
        getRecurringExpensesAction(selectedMonthFilter, selectedYear),
        getUpcomingBillsWindowAction(selectedMonthFilter, selectedYear),
        getPendingRevenuesAction(selectedMonthFilter, selectedYear),
        getMonthlyCommitmentsAction(selectedMonthFilter, selectedYear),
        getMonthlyCashFlowRollForwardAction(selectedMonthFilter, selectedYear),
      ]);
      setCards(freshCards || []);
      setPaidInvoicesList(freshPaidInv || []);
      setRealRevenue(freshRev || 0);
      setPendingExpensesList(freshPending || []);
      setPaidExpensesList(freshPaidExp || []);
      setRecurringExpensesList(freshRecurring || []);
      setWindowBills(freshWindow || null);
      setReceitasPendentesMes(freshPendingRev?.total ?? freshWindow?.receitasPendentesDoMes ?? 0);
      setMonthlyRollForward(freshRollForward || null);
      if (freshCommitments) {
        setCommitmentsData(freshCommitments);
        if (freshCommitments.contasBancarias?.length > 0) {
          setBaixaContaId((prev) => prev || freshCommitments.contasBancarias[0].id);
        }
        if (freshCommitments.cartoesCredito?.length > 0) {
          setBaixaCartaoId((prev) => prev || freshCommitments.cartoesCredito[0].id);
        }
      }
      setCommitmentsLoading(false);
    } catch (e) {
      console.error("Erro ao recarregar dados de despesas:", e);
    }
  };

  const filteredCommitments = (commitmentsData?.items || []).filter((item: any) => {
    if (commitmentStatusFilter === "PENDENTE" && item.status !== "PENDING") return false;
    if (commitmentStatusFilter === "PAGO" && item.status !== "COMPLETED") return false;
    if (commitmentSearch.trim()) {
      const q = commitmentSearch.toLowerCase().trim();
      const matchDesc = (item.description || "").toLowerCase().includes(q);
      const matchTipo = (item.tipoLabel || "").toLowerCase().includes(q);
      const matchForma = (item.formaPagamentoLabel || "").toLowerCase().includes(q);
      if (!matchDesc && !matchTipo && !matchForma) return false;
    }
    return true;
  });

  const pendingCommitments = filteredCommitments.filter((c: any) => c.status === "PENDING");
  const allPendingSelected = pendingCommitments.length > 0 && pendingCommitments.every((c: any) => selectedCommitmentIds.includes(c.id));
  const selectedCommitmentItems = (commitmentsData?.items || []).filter((i: any) => selectedCommitmentIds.includes(i.id));
  const selectedTotalAmount = selectedCommitmentItems.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);

  const handleMarkBillPaid = async (billId: string) => {
    try {
      await markExpenseAsPaidAction(billId);
      await reloadAllData();
      showAlert("Conta liquidada com sucesso! O valor foi deduzido do saldo.", { variant: "success" });
    } catch (e) {
      console.error(e);
      showAlert("Erro ao liquidar conta.", { variant: "error" });
    }
  };

  const handleUndoBillPayment = async (billId: string) => {
    try {
      await undoExpensePaymentAction(billId);
      await reloadAllData();
      showAlert("Pagamento desfeito com sucesso.", { variant: "success" });
    } catch (e) {
      console.error(e);
      showAlert("Erro ao desfazer pagamento.", { variant: "error" });
    }
  };



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

  // ── Form de cartão / ticket (compartilhado entre criar e editar) ───────────
  const [formBank,        setFormBank]        = useState("");
  const [formType,        setFormType]        = useState("CREDIT_CARD");
  const [formHolder,      setFormHolder]      = useState("");
  const [formLimit,       setFormLimit]       = useState<number | "">("");
  const [formDiaFech,     setFormDiaFech]     = useState<number>(1);
  const [formDiaVenc,     setFormDiaVenc]     = useState<number>(10);
  const [formDiaRecarga,  setFormDiaRecarga]  = useState<number>(1);
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
      getPendingExpensesAction(monthParam, selectedYear),
      getPaidExpensesAction(monthParam, selectedYear),
      getRecurringExpensesAction(monthParam, selectedYear),
      getUpcomingBillsWindowAction(monthParam, selectedYear),
      getPendingRevenuesAction(monthParam, selectedYear),
      getMonthlyCommitmentsAction(monthParam, selectedYear),
      getMonthlyCashFlowRollForwardAction(monthParam, selectedYear),
    ])
      .then(([cardsRes, paidInvoicesRes, revenueRes, pendingExpRes, paidExpRes, recurringRes, windowRes, pendingRevRes, commitmentsRes, rollForwardRes]) => {
        if (!active) return;
        setCards(cardsRes || []);
        setPaidInvoicesList(paidInvoicesRes || []);
        setRealRevenue(revenueRes || 0);
        setPendingExpensesList(pendingExpRes || []);
        setPaidExpensesList(paidExpRes || []);
        setRecurringExpensesList(recurringRes || []);
        setWindowBills(windowRes || null);
        setReceitasPendentesMes(pendingRevRes?.total ?? windowRes?.receitasPendentesDoMes ?? 0);
        setMonthlyRollForward(rollForwardRes || null);
        if (commitmentsRes) {
          setCommitmentsData(commitmentsRes);
          if (commitmentsRes.contasBancarias?.length > 0) {
            setBaixaContaId((prev) => prev || commitmentsRes.contasBancarias[0].id);
          }
          if (commitmentsRes.cartoesCredito?.length > 0) {
            setBaixaCartaoId((prev) => prev || commitmentsRes.cartoesCredito[0].id);
          }
        }
        setCommitmentsLoading(false);
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

  // ── Separação dos 3 Pilares: Contas Bancárias, Cartões de Crédito e Tickets ─
  const bankAccounts = cards.filter(
    (c) => c.walletType === "CONTA_CORRENTE" || (c as any).tipo === "CONTA_CORRENTE" || c.walletType === "DEBITO" || c.walletType === "CONTA"
  );
  const creditCards  = cards.filter(
    (c) => c.walletType === "CREDIT_CARD" || (c as any).tipo === "CREDITO"
  );
  const ticketCards  = cards.filter(
    (c) => c.walletType === "TICKET" || (c as any).tipo === "TICKET" || (c as any).tipo === "BENEFICIO" || (c as any).tipo === "BENEFÍCIO"
  );
  const accountCards = bankAccounts;

  const contas = cards;

  // 1. Cálculo do saldo consolidado de todas as contas bancárias
  const contasBancarias = bankAccounts.map((c: any) => ({
    id: c.id,
    banco: c.bankName || c.title,
    saldo: Number(c.saldoAtual ?? c.finalBalance ?? c.limitTotal ?? 0),
  }));
  const saldoGeralDisponivel = contasBancarias.reduce((acc, conta) => acc + (Number(conta.saldo) || 0), 0);
  const saldoTotalContas = saldoGeralDisponivel;
  const saldoTotalConta   = saldoTotalContas;
  const totalFaturas      = creditCards.reduce((s, c) => s + c.faturaAtual, 0);
  const limiteConsolidado = creditCards.reduce((s, c) => s + (c.limitTotal - c.limitUsed), 0);

  // Helper preciso para verificar se a fatura do cartão está paga no período
  const isCardInvoicePaidForPeriod = (card: CardOverview) => {
    if (card.faturaAtual <= 0) return false;

    // Se estiver em modo anual, só é considerada paga se não houver saldo pendente
    if (card.isAnnualView || selectedMonthFilter === null) {
      return (card as any).faturaPendente <= 0 && Boolean((card as any).isPaid);
    }

    const currentMonth = Number(selectedMonthFilter);
    const billingM = (card as any).billingMonth || currentMonth;
    const billingY = (card as any).billingYear || selectedYear;

    return paidInvoicesList.some(
      p => p.walletId === card.id &&
           ((p.month === currentMonth && p.year === selectedYear) ||
            (p.month === billingM && p.year === billingY))
    ) || Boolean((card as any).isPaid);
  };

  const paidCreditCards = creditCards.filter(c => isCardInvoicePaidForPeriod(c));

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

  const parseDueDateMs = React.useCallback((dateStr?: string, rawDateStr?: string) => {
    if (rawDateStr) {
      const d = new Date(rawDateStr);
      if (!isNaN(d.getTime())) return d.getTime();
    }
    if (dateStr && typeof dateStr === "string") {
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]), 12, 0, 0).getTime();
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return d.getTime();
    }
    return 0;
  }, []);

  // 1. Faturas de Cartão a Vencer para o mês selecionado
  const upcomingCardBills = React.useMemo(() => {
    if (windowBills?.upcomingCardInvoices && windowBills.upcomingCardInvoices.length > 0) {
      return windowBills.upcomingCardInvoices.filter((c: any) => {
        return (!c.month || c.month === activeMonth) && (!c.year || c.year === selectedYear);
      });
    }

    return creditCards
      .filter(c => c.faturaAtual > 0 && !isCardInvoicePaidForPeriod(c))
      .map(c => {
        const dueDateInfo = getInvoiceDueDateInfo(
          (c as any).diaFechamento || 1,
          c.vencimento || 10,
          activeMonth,
          selectedYear
        );

        return {
          id:         c.id,
          title:      c.title,
          bankName:   c.bankName || c.title,
          vencimento: dueDateInfo.dateStr,
          valor:      c.faturaAtual,
          dueDateRaw: dueDateInfo.dueDate.toISOString(),
          dueDateMs:  dueDateInfo.dueDate.getTime(),
          status:     dueDateInfo.isPast ? ("vencido" as const) : ("aberto" as const),
          month:      activeMonth,
          billingMonth: dueDateInfo.billingMonth,
          billingYear:  dueDateInfo.billingYear,
          year:       selectedYear,
        };
      });
  }, [windowBills, creditCards, activeMonth, selectedYear, isCardInvoicePaidForPeriod]);

  // 2. Lista unificada para a seção "Contas e Faturas a Vencer" (exclusivamente Faturas de Cartão do mês selecionado)
  const unifiedUpcomingItems = React.useMemo(() => {
    return upcomingCardBills.map((bill: any) => {
      const dueMs = parseDueDateMs(bill.vencimento, bill.dueDateRaw);
      return {
        id: bill.id,
        itemType: "CARD_INVOICE" as const,
        description: `Fatura ${bill.title || bill.bankName}`,
        dueDate: bill.vencimento,
        dueDateMs: dueMs,
        amount: Number(bill.valor || 0),
        status: bill.status,
        paymentMethod: "CARTÃO DE CRÉDITO",
        bankName: bill.bankName || bill.title,
        isRecurring: false,
        month: bill.month || activeMonth,
        year: bill.year || selectedYear,
      };
    }).sort((a: any, b: any) => a.dueDateMs - b.dueDateMs);
  }, [upcomingCardBills, parseDueDateMs, activeMonth, selectedYear]);

  // 3. Faturas de Cartão Pagas no mês selecionado
  const filteredPaidCardInvoices = React.useMemo(() => {
    if (windowBills?.paidCardInvoices && windowBills.paidCardInvoices.length > 0) {
      return windowBills.paidCardInvoices.filter((item: any) => {
        return (!item.month || item.month === activeMonth) && (!item.year || item.year === selectedYear);
      });
    }
    return unifiedPaidInvoices.filter((item: any) => {
      return (Number(item.month) === activeMonth && Number(item.year) === selectedYear);
    });
  }, [windowBills, unifiedPaidInvoices, activeMonth, selectedYear]);

  // ── Contas e Faturas Pendentes / Pagas (Cálculo Corrigido com Roll-Forward) ──────────────────
  const totalFaturasPendentes = upcomingCardBills.reduce((s, b) => s + Number(b.valor || 0), 0);
  const totalPendentesMes = totalFaturasPendentes;
  const faturasDespesasPendentesDoMes = totalFaturasPendentes;
  const saldoAtual = saldoTotalContas;
  const receitasPendentesDoMes = windowBills?.receitasPendentesDoMes ?? receitasPendentesMes ?? 0;

  // Projeção Acumulada / Roll-Forward Contínuo
  const saldoHerdado = monthlyRollForward?.saldoHerdado ?? 0;
  const saldoPrevisto = monthlyRollForward
    ? monthlyRollForward.saldoPrevisto
    : (saldoAtual + receitasPendentesDoMes - faturasDespesasPendentesDoMes);

  const totalEntradasMes = monthlyRollForward
    ? monthlyRollForward.receitasMes
    : ((realRevenue || 0) + (receitasPendentesDoMes || 0));

  const pagoFaturasMes   = filteredPaidCardInvoices.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalPagoMes     = pagoFaturasMes;
  const totalGeralMes    = totalFaturasPendentes + pagoFaturasMes;

  const pctGeralPago = totalGeralMes > 0
    ? Math.min(100, Math.round((totalPagoMes / totalGeralMes) * 100))
    : (filteredPaidCardInvoices.length > 0 ? 100 : 0);

  const proximosVencimentos = totalPendentesMes;



  // ── Helpers de modal ─────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormBank("");
    setFormType(activeTab === "bank" ? "CONTA_CORRENTE" : activeTab === "ticket" ? "TICKET" : "CREDIT_CARD");
    setFormHolder("");
    setFormLimit("");
    setFormDiaFech(1);
    setFormDiaVenc(10);
    setFormDiaRecarga(1);
  };

  const openCreate = () => {
    resetForm();
    setSelectedCard(null);
    setModalMode("create");
  };

  const openEdit = (card: CardOverview) => {
    setSelectedCard(card);
    setFormBank(card.bankName || card.title);
    const resolvedType =
      card.walletType === "TICKET" || (card as any).tipo === "TICKET" || (card as any).tipo === "BENEFICIO"
        ? "TICKET"
        : card.walletType === "CONTA_CORRENTE" || (card as any).tipo === "CONTA_CORRENTE" || card.walletType === "DEBITO" || card.walletType === "CONTA"
        ? "CONTA_CORRENTE"
        : "CREDIT_CARD";
    setFormType(resolvedType);
    setFormHolder(card.holder || "");
    setFormLimit(
      resolvedType === "CREDIT_CARD"
        ? (card.limitTotal || "")
        : (card.saldoAtual ?? card.finalBalance ?? card.limitTotal ?? "")
    );
    setFormDiaFech((card as any).diaFechamento || 1);
    setFormDiaVenc(card.vencimento || 10);
    setFormDiaRecarga((card as any).diaFechamento || card.vencimento || 1);
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

  // ── Handler: Criar cartão ou conta ───────────────────────────────────────────
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
        agencia:        "",
        conta:          "",
        limitOrBalance: formLimit === "" ? 0 : Number(formLimit),
        diaFechamento:  formType === "CREDIT_CARD" ? formDiaFech : formDiaRecarga,
        diaVencimento:  formType === "CREDIT_CARD" ? formDiaVenc : formDiaRecarga,
        originType:     "ROLLOVER",
        targetMonth:    selectedMonthFilter || (new Date().getMonth() + 1),
        targetYear:     selectedYear,
      });
      const fresh = await getAllCardsOverview(selectedMonthFilter, selectedYear);
      setCards(fresh);

      if (formType === "CREDIT_CARD" || formType === "CREDITO") {
        setActiveTab("credit");
      } else if (formType === "TICKET") {
        setActiveTab("ticket");
      } else {
        setActiveTab("bank");
      }

      closeModal();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao cadastrar. Tente novamente.", { variant: "error" });
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
        agencia:        "",
        conta:          "",
        limitOrBalance: formLimit === "" ? 0 : Number(formLimit),
        diaFechamento:  formType === "CREDIT_CARD" ? formDiaFech : formType === "TICKET" ? formDiaRecarga : 1,
        diaVencimento:  formType === "CREDIT_CARD" ? formDiaVenc : formType === "TICKET" ? formDiaRecarga : 1,
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
              onClick={() => setPeriod(selectedMonthFilter || selectedMonth, selectedYear - 1)}
              className="p-1 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
              title="Ano Anterior"
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-black text-slate-800 dark:text-white px-2 tracking-wider">
              ANO {selectedYear}
            </span>
            <button
              onClick={() => setPeriod(selectedMonthFilter || selectedMonth, selectedYear + 1)}
              className="p-1 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
              title="Próximo Ano"
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Atalho "ANO ATUAL" */}
          <button
            onClick={() => {
              const now = new Date();
              setPeriod(now.getMonth() + 1, now.getFullYear());
              setSelectedMonthFilter(now.getMonth() + 1);
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
              const newM = val === "" ? null : Number(val);
              setSelectedMonthFilter(newM);
              if (newM !== null) {
                setPeriod(newM, selectedYear);
              }
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

      {/* ── 2. SELETOR DE VISÃO & CTA PRINCIPAL ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 -mt-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 w-full sm:w-auto">
          {/* 1º Botão: Meus Cartões & Contas (PRIMEIRO) */}
          <button
            onClick={() => setMainView("cartoes")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mainView === "cartoes"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/50 dark:border-slate-700"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Meus Cartões & Contas Cadastrados</span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {cards.length}
            </span>
          </button>

          {/* 2º Botão: Central de Compromissos (SEGUNDO) */}
          <button
            onClick={() => setMainView("compromissos")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mainView === "compromissos"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/50 dark:border-slate-700"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Central de Compromissos & Contas a Pagar</span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
              {commitmentsData.items.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {mainView === "cartoes" ? (
            <button
              onClick={openCreate}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Adicionar Cartão / Conta
            </button>
          ) : (
            <button
              onClick={openNewCommitmentModal}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Novo Boleto / Assinatura
            </button>
          )}
        </div>
      </div>

      {/* ── 2.1. CONTEÚDO: CENTRAL DE COMPROMISSOS FIXOS & CONTAS A PAGAR ─────── */}
      {mainView === "compromissos" && (
        <div className="flex flex-col gap-6">
          {/* Cards Resumo do Topo da Página */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: TOTAL DO MÊS */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    TOTAL DO MÊS
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/50">
                    <Receipt className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {brl(commitmentsData.totals.totalMes)}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Soma de todos os boletos e assinaturas do mês</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{commitmentsData.items.length} itens</span>
              </div>
            </div>

            {/* Card 2: A PAGAR (PENDENTES) - Laranja/Amarelo */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#131B2E] border border-amber-200/70 dark:border-amber-900/50 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                    A PAGAR (PENDENTES)
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/50 dark:border-amber-800/50">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                  {brl(commitmentsData.totals.totalPendente)}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>O que ainda precisa ser quitado no período</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {commitmentsData.items.filter(i => i.status === "PENDING").length} pendentes
                </span>
              </div>
            </div>

            {/* Card 3: PAGO NO MÊS - Verde */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#131B2E] border border-emerald-200/70 dark:border-emerald-900/50 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                    PAGO NO MÊS
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/50 dark:border-emerald-800/50">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {brl(commitmentsData.totals.totalPago)}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>O montante que já recebeu baixa</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {commitmentsData.items.filter(i => i.status === "COMPLETED").length} liquidados
                </span>
              </div>
            </div>
          </div>

          {/* Tabela de Compromissos */}
          <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
            {/* Header da Tabela com Filtros e Busca */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 w-full sm:w-auto">
                <button
                  onClick={() => setCommitmentStatusFilter("TODOS")}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    commitmentStatusFilter === "TODOS"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Todos ({commitmentsData.items.length})
                </button>
                <button
                  onClick={() => setCommitmentStatusFilter("PENDENTE")}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    commitmentStatusFilter === "PENDENTE"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400"
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  A Pagar ({commitmentsData.items.filter(i => i.status === "PENDING").length})
                </button>
                <button
                  onClick={() => setCommitmentStatusFilter("PAGO")}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    commitmentStatusFilter === "PAGO"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Pagos ({commitmentsData.items.filter(i => i.status === "COMPLETED").length})
                </button>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={commitmentSearch}
                    onChange={(e) => setCommitmentSearch(e.target.value)}
                    placeholder="Buscar boleto ou assinatura..."
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  {commitmentSearch && (
                    <button
                      onClick={() => setCommitmentSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 1. Visão Desktop/Tablet Médio: Tabela Tradicional Compacta */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse table-auto text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider bg-slate-50/50 dark:bg-slate-900/40">
                    <th className="py-2 px-1.5 w-7 text-center">
                      <input
                        type="checkbox"
                        checked={pendingCommitments.length > 0 && pendingCommitments.every((c: any) => selectedCommitmentIds.includes(c.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCommitmentIds(pendingCommitments.map((c: any) => c.id));
                          } else {
                            setSelectedCommitmentIds([]);
                          }
                        }}
                        disabled={pendingCommitments.length === 0}
                        className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-40"
                        title={pendingCommitments.length > 0 ? "Selecionar todas as pendentes" : "Nenhum compromisso pendente"}
                      />
                    </th>
                    <th className="py-2 px-2 whitespace-nowrap">Vencimento</th>
                    <th className="py-2 px-2">Descrição / Fornecedor</th>
                    <th className="py-2 px-1.5 whitespace-nowrap">Tipo</th>
                    <th className="py-2 px-2 text-right whitespace-nowrap">Valor</th>
                    <th className="py-2 px-1.5 text-center whitespace-nowrap">Status</th>
                    <th className="py-2 px-1.5 text-center whitespace-nowrap">Pagamento</th>
                    <th className="py-2 px-2 text-right whitespace-nowrap">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {filteredCommitments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          <p className="font-semibold text-sm text-slate-600 dark:text-slate-300">
                            Nenhum compromisso encontrado para este período.
                          </p>
                          <p className="text-xs text-slate-400 max-w-sm">
                            Cadastre contas fixas, boletos ou assinaturas para controlar prazos e dar baixa com débito automático no banco ou cartão.
                          </p>
                          <button
                            onClick={openNewCommitmentModal}
                            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Cadastrar Primeiro Boleto / Assinatura
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCommitments.map((item: any) => {
                      const isPaid = item.status === "COMPLETED";
                      const isSelected = selectedCommitmentIds.includes(item.id);
                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors group border-b border-slate-100 dark:border-slate-800/60 ${
                            isSelected
                              ? "bg-indigo-50/60 dark:bg-indigo-950/40"
                              : "hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                          }`}
                        >
                          {/* 0. Checkbox */}
                          <td className="py-1.5 px-1.5 text-center">
                            {!isPaid ? (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedCommitmentIds((prev) => [...prev, item.id]);
                                  } else {
                                    setSelectedCommitmentIds((prev) => prev.filter((id) => id !== item.id));
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            ) : (
                              <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                            )}
                          </td>

                          {/* 1. Vencimento */}
                          <td className="py-1.5 px-2 whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-[11px] sm:text-xs text-slate-800 dark:text-slate-200">
                                {item.dueDateFormatted}
                              </span>
                              <span
                                className={`inline-flex items-center w-max px-1 py-0.2 rounded text-[9px] font-bold border ${item.dueBadge.color}`}
                              >
                                {item.dueBadge.label}
                              </span>
                            </div>
                          </td>

                          {/* 2. Descrição / Fornecedor */}
                          <td className="py-1.5 px-2 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                                item.tipo === "ASSINATURA"
                                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              }`}>
                                {item.tipo === "ASSINATURA" ? <Zap className="w-2.5 h-2.5" /> : <Receipt className="w-2.5 h-2.5" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-slate-900 dark:text-white block text-xs truncate max-w-[150px] lg:max-w-[220px]">
                                  {item.description}
                                </span>
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="text-[9px] text-slate-400 dark:text-slate-500">
                                    {item.recorrenciaLabel}
                                  </span>
                                  <span className="inline-flex items-center text-[8px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/50 px-1 py-0 rounded">
                                    Ref: {item.competenciaLabel || `${item.competenceMonth}/${item.competenceYear}`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 3. Tipo */}
                          <td className="py-1.5 px-1.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                item.tipo === "ASSINATURA"
                                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                              }`}
                            >
                              {item.tipoLabel}
                            </span>
                          </td>

                          {/* 4. Valor */}
                          <td className="py-1.5 px-2 text-right whitespace-nowrap">
                            <span className="font-black text-slate-900 dark:text-white text-xs font-tnum tabular-nums">
                              {brl(item.amount)}
                            </span>
                          </td>

                          {/* 5. Status */}
                          <td className="py-1.5 px-1.5 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${
                                isPaid
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              }`}
                            >
                              {item.statusLabel}
                            </span>
                          </td>

                          {/* 6. Forma de Pagamento */}
                          <td className="py-1.5 px-1.5 text-center whitespace-nowrap">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                                {item.formaPagamentoLabel}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs font-bold">-</span>
                            )}
                          </td>

                          {/* 7. Ações */}
                          <td className="py-1.5 px-2 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-0.5">
                              {!isPaid ? (
                                <button
                                  onClick={() => openBaixaModal(item)}
                                  className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2 py-1 rounded-lg shadow-xs transition-colors cursor-pointer"
                                  title="Pagar / Dar Baixa"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Pagar / Baixar</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUndoCommitment(item.id)}
                                  className="inline-flex items-center gap-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 px-1.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] font-bold transition-colors cursor-pointer"
                                  title="Desfazer pagamento"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Desfazer</span>
                                </button>
                              )}

                              {/* Botão Replicar para o Mês Seguinte */}
                              <button
                                type="button"
                                disabled={replicatingId === item.id}
                                onClick={() => handleReplicateCommitment(item)}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                                title="Replicar compromisso para o próximo mês"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => openEditCommitment(item)}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                                title="Editar compromisso"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteCommitment(item.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors cursor-pointer"
                                title="Excluir compromisso"
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
                {/* ── 5. Totalizador / Linha de Rodapé na Tabela (tfoot) ── */}
                {filteredCommitments.length > 0 && (
                  <tfoot className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/70 text-xs font-bold">
                    <tr>
                      <td className="py-2 px-1.5 text-center text-slate-400">—</td>
                      <td className="py-2 px-2 text-slate-900 dark:text-white font-extrabold whitespace-nowrap">
                        TOTAL LISTADO
                        <span className="ml-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          ({filteredCommitments.length} {filteredCommitments.length === 1 ? "item" : "itens"})
                        </span>
                      </td>
                      <td className="py-2 px-2 text-slate-500 dark:text-slate-400 text-[10px]" colSpan={2}>
                        {filteredCommitments.filter((i: any) => i.status === "PENDING").length} a pagar • {filteredCommitments.filter((i: any) => i.status === "COMPLETED").length} pagos
                      </td>
                      <td className="py-2 px-2 text-right whitespace-nowrap">
                        <span className="font-black text-slate-900 dark:text-white text-xs sm:text-sm font-tnum tabular-nums">
                          {brl(filteredCommitments.reduce((sum: number, it: any) => sum + Number(it.amount || 0), 0))}
                        </span>
                      </td>
                      <td className="py-2 px-2" colSpan={3}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* 2. Visão Mobile (Celulares/Tablets pequenos): Lista de Cards Empilhados */}
            <div className="md:hidden p-3.5 space-y-3">
              {filteredCommitments.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="font-semibold text-xs text-slate-600 dark:text-slate-300">
                    Nenhum compromisso encontrado.
                  </p>
                </div>
              ) : (
                filteredCommitments.map((item: any) => {
                  const isPaid = item.status === "COMPLETED";
                  const isSelected = selectedCommitmentIds.includes(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-sm space-y-3 transition-all ${
                        isSelected
                          ? "border-indigo-500/50 bg-indigo-50/20 dark:bg-indigo-950/30 ring-1 ring-indigo-500/30"
                          : "border-slate-200/80 dark:border-slate-800"
                      }`}
                    >
                      {/* Topo do Card: Checkbox + Descrição + Status */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 min-w-0">
                          {!isPaid && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCommitmentIds((prev) => [...prev, item.id]);
                                } else {
                                  setSelectedCommitmentIds((prev) => prev.filter((id) => id !== item.id));
                                }
                              }}
                              className="w-4 h-4 mt-0.5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          )}
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                              {item.description}
                            </h4>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                              <span>{item.tipoLabel}</span>
                              <span>•</span>
                              <span>Ref: {item.competenciaLabel || `${item.competenceMonth}/${item.competenceYear}`}</span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider shrink-0 ${
                            isPaid
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {item.statusLabel}
                        </span>
                      </div>

                      {/* Informações de Vencimento e Prazo */}
                      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 text-xs">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            Venc: {item.dueDateFormatted}
                          </span>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${item.dueBadge.color}`}>
                          {item.dueBadge.label}
                        </span>
                      </div>

                      {/* Rodapé do Card: Valor e Ações Touch-Friendly */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Valor</span>
                          <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums font-tnum">
                            {brl(item.amount)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {!isPaid ? (
                            <button
                              onClick={() => openBaixaModal(item)}
                              className="min-h-[38px] px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Pagar</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUndoCommitment(item.id)}
                              className="min-h-[38px] px-3 text-slate-600 dark:text-slate-300 hover:text-amber-600 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Desfazer</span>
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={replicatingId === item.id}
                            onClick={() => handleReplicateCommitment(item)}
                            className="min-w-[38px] min-h-[38px] flex items-center justify-center p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors cursor-pointer"
                            title="Replicar para o próximo mês"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => openEditCommitment(item)}
                            className="min-w-[38px] min-h-[38px] flex items-center justify-center p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteCommitment(item.id)}
                            className="min-w-[38px] min-h-[38px] flex items-center justify-center p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── BARRA FLUTUANTE DE BAIXA EM LOTE ── */}
          {selectedCommitmentIds.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 dark:bg-[#131B2E]/95 border border-indigo-500/30 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs">
                  {selectedCommitmentIds.length} {selectedCommitmentIds.length === 1 ? "conta selecionada" : "contas selecionadas"}
                </span>
                <span className="text-emerald-400 font-black text-xs font-tnum tabular-nums">
                  ({brl(selectedTotalAmount)})
                </span>
              </div>
              <div className="h-4 w-px bg-slate-700" />
              <button
                onClick={openBatchBaixaModal}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-4 py-2 rounded-xl transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Pagar Selecionadas Juntas</span>
              </button>
              <button
                onClick={() => setSelectedCommitmentIds([])}
                className="text-slate-400 hover:text-white p-1 ml-1 cursor-pointer"
                title="Cancelar seleção"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── 2.2. CONTEÚDO: MEUS CARTÕES & CONTAS CADASTRADOS ─────────────────── */}
      {mainView === "cartoes" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full sm:w-auto">
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

      {/* ── 2.1. MÉTRICA SUPERIOR: SALDO DISPONÍVEL / CONTROLE RÁPIDO DE FLUXO ────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: Controle Rápido do Saldo em Conta / Caixa Geral */}
        <CardContaFluxo
          saldo={saldoGeralDisponivel}
          title="SALDO CONSOLIDADO (TODAS AS CONTAS)"
          subtitle="Soma dos saldos em conta corrente"
          onAdicionarSaldo={() => {
            setInjectTipoOperacao("ENTRADA");
            setInjectModalOpen(true);
          }}
          onRetirarSaldo={() => {
            setInjectTipoOperacao("SAIDA");
            setInjectModalOpen(true);
          }}
        />

        {/* Card 2: Saldo Previsto Pós-Contas com Memória de Cálculo */}
        <CardSaldoPrevisto
          saldoContas={saldoTotalContas}
          saldoHerdado={saldoHerdado}
          isFutureMonth={Boolean(monthlyRollForward?.isFutureMonth)}
          previousMonthLabel={monthlyRollForward?.previousMonthLabel}
          entradasMes={totalEntradasMes}
          faturasMes={monthlyRollForward?.faturasMes ?? totalFaturasPendentes}
          boletosMes={monthlyRollForward?.boletosMes ?? (commitmentsData?.totals?.totalPendente ?? 0)}
          saldoPrevisto={saldoPrevisto}
        />
      </div>

      {/* ── 3. NAVEGAÇÃO POR ABAS (VISÃO GERAL / CONTAS BANCÁRIAS / CARTÕES DE CRÉDITO / TICKETS) ── */}
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
          onClick={() => setActiveTab("bank")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "bank"
              ? "bg-slate-900 dark:bg-indigo-600 text-white shadow-md shadow-slate-900/30 dark:shadow-indigo-600/30"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Contas Bancárias</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === "bank" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
            {bankAccounts.length}
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
          onClick={() => setActiveTab("ticket")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "ticket"
              ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Tickets</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === "ticket" ? "bg-white/20 text-white" : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"}`}>
            {ticketCards.length}
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
        const displayedCards = activeTab === "bank"
          ? filteredCards.filter(c => c.walletType === "CONTA_CORRENTE" || (c as any).tipo === "CONTA_CORRENTE" || c.walletType === "DEBITO" || c.walletType === "CONTA")
          : activeTab === "credit"
          ? filteredCards.filter(c => c.walletType === "CREDIT_CARD" || (c as any).tipo === "CREDITO")
          : activeTab === "ticket"
          ? filteredCards.filter(c => c.walletType === "TICKET" || (c as any).tipo === "TICKET" || (c as any).tipo === "BENEFICIO")
          : filteredCards;

        const tabTitle = activeTab === "bank"
          ? "Minhas Contas Bancárias & Liquidez"
          : activeTab === "credit"
          ? "Meus Cartões de Crédito"
          : activeTab === "ticket"
          ? "Meus Tickets & Benefícios"
          : "Meus Cartões, Contas & Tickets";

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
                  {activeTab === "bank"
                    ? "Nenhuma conta bancária cadastrada nesta visualização."
                    : activeTab === "credit"
                    ? "Nenhum cartão de crédito cadastrado nesta visualização."
                    : activeTab === "ticket"
                    ? "Nenhum ticket ou benefício cadastrado nesta visualização."
                    : "Nenhuma conta, cartão ou ticket cadastrado."}
                </p>
                <button
                  onClick={openCreate}
                  className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs hover:bg-indigo-500 cursor-pointer"
                >
                  {activeTab === "bank"
                    ? "+ Adicionar Nova Conta Bancária"
                    : activeTab === "ticket"
                    ? "+ Adicionar Novo Ticket"
                    : "+ Adicionar Novo Cartão de Crédito"}
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
                    isPaid={isCardInvoicePaidForPeriod(card)}
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

      {/* ── 6. FATURAS A VENCER ────────────────── */}
      <section>
        <div className="bg-white dark:bg-[#131B2E] rounded-[28px] border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col gap-4">

          {/* Header da seção + Tabs (A Vencer vs Pagas) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Faturas a Vencer
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900/60">
                  {unifiedUpcomingItems.length}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Compromissos pendentes nos próximos dias
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setInvoiceTab("pending")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    invoiceTab === "pending"
                      ? "bg-white dark:bg-[#1A233A] text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  A Vencer ({unifiedUpcomingItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceTab("paid")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    invoiceTab === "paid"
                      ? "bg-white dark:bg-[#1A233A] text-emerald-600 dark:text-emerald-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Pagas ({filteredPaidCardInvoices.length})
                </button>
              </div>

              <Link
                href="/cartoes"
                className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors flex items-center gap-1"
              >
                Ver todas <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Conteúdo da Aba Ativa */}
          {invoiceTab === "pending" ? (
            unifiedUpcomingItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400/80" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Nenhuma fatura pendente para os próximos dias.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {unifiedUpcomingItems.map((fatura) => {
                  const cardName = fatura.bankName || fatura.description.replace(/^Fatura\s+/, "") || "Cartão";
                  const valorTotal = fatura.amount;
                  const dataVencimento = fatura.dueDate;
                  const isOverdue = fatura.status === "vencido";
                  const statusLabel = isOverdue ? "VENCIDA" : "PENDENTE";

                  return (
                    <div
                      key={`card-bill-${fatura.id}`}
                      onClick={() => {
                        setSelectedPaymentWalletId("NONE");
                        setPayModalCard({
                          id: fatura.id,
                          title: cardName,
                          amount: fatura.amount,
                          month: fatura.month || activeMonth,
                          year: fatura.year || selectedYear,
                        });
                      }}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group"
                      title="Clique para pagar ou ver detalhes da fatura"
                    >
                      {/* Lado Esquerdo: Ícone + Detalhes */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-sm shrink-0">
                          {/* Ícone de relógio Clock ou CreditCard */}
                          <Clock className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight truncate">
                            {cardName}
                          </h4>
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                            Vencimento: {dataVencimento}
                          </span>
                        </div>
                      </div>

                      {/* Lado Direito: Valor + Badge */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-sm font-bold text-slate-900 dark:text-white font-tnum tabular-nums">
                          {formatCurrency(valorTotal)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          isOverdue
                            ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        }`}>
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            filteredPaidCardInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                  Nenhuma fatura de cartão paga encontrada para este período.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {filteredPaidCardInvoices.map((paidItem: any) => {
                  const cardTitle = paidItem.cardTitle || paidItem.bankName || "Cartão";
                  const paidDate = paidItem.paidAt
                    ? new Date(paidItem.paidAt).toLocaleDateString("pt-BR")
                    : "Confirmado";

                  return (
                    <div
                      key={`paid-inv-${paidItem.id}`}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                    >
                      {/* Lado Esquerdo: Ícone + Detalhes */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight truncate">
                            {cardTitle}
                          </h4>
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-normal">
                            Fatura paga em {paidDate}
                            {paidItem.paymentWalletTitle ? ` • Débito: ${paidItem.paymentWalletTitle}` : ""}
                          </span>
                        </div>
                      </div>

                      {/* Lado Direito: Valor + Badge */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-sm font-bold text-slate-900 dark:text-white font-tnum tabular-nums">
                          {formatCurrency(paidItem.amount)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            PAGA
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUndoPayment(paidItem.walletId, paidItem.month, paidItem.year);
                            }}
                            className="text-[10px] font-semibold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Desfazer pagamento e reabrir fatura"
                          >
                            Desfazer
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </section>
        </div>
      )}

      {/* ── MODAIS DA CENTRAL DE COMPROMISSOS (RESPONSIVOS / BOTTOM SHEET MOBILE) ── */}

      {/* Modal 1: + Novo Boleto / Assinatura */}
      {newCommitmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/50">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Novo Boleto / Assinatura</h3>
              </div>
              <button
                onClick={() => setNewCommitmentModalOpen(false)}
                aria-label="Fechar"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewCommitment} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Aluguel, Netflix, Luz"
                  value={newCommitmentDesc}
                  onChange={(e) => setNewCommitmentDesc(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Mês de Referência / Competência */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Mês de Referência / Competência *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newCommitmentCompMonth}
                    onChange={(e) => setNewCommitmentCompMonth(Number(e.target.value))}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {MONTH_NAMES_LIST.map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={newCommitmentCompYear}
                    onChange={(e) => setNewCommitmentCompYear(Number(e.target.value))}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {[2024, 2025, 2026, 2027, 2028].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Mês financeiro a que o gasto pertence (ex: Setembro/2026 mesmo com vencimento em Outubro).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={newCommitmentAmount}
                    onChange={(e) => setNewCommitmentAmount(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Data de Vencimento</label>
                  <input
                    type="date"
                    value={newCommitmentDueDate}
                    onChange={(e) => setNewCommitmentDueDate(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Tipo</label>
                  <select
                    value={newCommitmentTipo}
                    onChange={(e) => setNewCommitmentTipo(e.target.value as any)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="BOLETO">Boleto / Conta Fixa</option>
                    <option value="ASSINATURA">Assinatura / Mensalidade</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Recorrência</label>
                  <select
                    value={newCommitmentRecorrencia}
                    onChange={(e) => setNewCommitmentRecorrencia(e.target.value as any)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="MENSAL">Repetir todo mês</option>
                    <option value="UNICO">Apenas neste mês</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingCommitment}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingCommitment ? "Salvando..." : "Salvar Compromisso"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Confirmar Pagamento / Baixa */}
      {payCommitmentItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Confirmar Pagamento</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Conta: <b>{payCommitmentItem.description}</b> ({brl(payCommitmentItem.amount)})
                </p>
              </div>
              <button
                onClick={() => setPayCommitmentItem(null)}
                aria-label="Fechar"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">Forma de Pagamento *</label>
                <select
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm bg-white cursor-pointer"
                  value={baixaForma}
                  onChange={(e) => setBaixaForma(e.target.value as any)}
                >
                  <option value="SALDO_CONTA">Saldo da Conta Corrente (Manual)</option>
                  <option value="DEBITO_AUTOMATICO">Débito Automático (Conta Corrente)</option>
                  <option value="PIX">Pix (Sai da Conta Corrente)</option>
                  <option value="CARTAO_CREDITO">Cartão de Crédito (Gera Fatura)</option>
                  <option value="DINHEIRO">Dinheiro em Espécie (Caixa Físico)</option>
                </select>
              </div>

              {/* Se pagar via Conta, Débito Automático ou Pix, seleciona qual banco debitar */}
              {["SALDO_CONTA", "DEBITO_AUTOMATICO", "PIX"].includes(baixaForma) && (
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">Qual Conta Corrente Debitar?</label>
                  <select
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm cursor-pointer"
                    value={baixaContaId}
                    onChange={(e) => setBaixaContaId(e.target.value)}
                  >
                    {commitmentsData.contasBancarias.map((conta) => (
                      <option key={conta.id} value={conta.id}>
                        {conta.banco} - Saldo: R$ {conta.saldoAtual.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Se pagar via Cartão de Crédito, escolhe qual cartão vai receber o lançamento */}
              {baixaForma === "CARTAO_CREDITO" && (
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">Qual Cartão de Crédito?</label>
                  <select
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm cursor-pointer"
                    value={baixaCartaoId}
                    onChange={(e) => setBaixaCartaoId(e.target.value)}
                  >
                    {commitmentsData.cartoesCredito.map((cartao) => (
                      <option key={cartao.id} value={cartao.id}>
                        {cartao.nome} - Limite Disp: R$ {cartao.limiteDisponivel.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">Data da Baixa</label>
                <input
                  type="date"
                  value={baixaData}
                  onChange={(e) => setBaixaData(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setPayCommitmentItem(null)}
                disabled={payingCommitment}
                className="w-1/2 min-h-[44px] py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleEfetivarBaixa}
                disabled={payingCommitment}
                className="w-1/2 min-h-[44px] py-2 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {payingCommitment ? "Processando..." : "Confirmar Baixa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Editar Compromisso */}
      {editCommitmentItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/50 dark:border-amber-800/50">
                  <Pencil className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Editar Compromisso</h3>
              </div>
              <button
                onClick={() => setEditCommitmentItem(null)}
                aria-label="Fechar"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCommitment} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Descrição</label>
                <input
                  type="text"
                  value={editCommitmentDesc}
                  onChange={(e) => setEditCommitmentDesc(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Mês de Referência / Competência */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Mês de Referência / Competência *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={editCommitmentCompMonth}
                    onChange={(e) => setEditCommitmentCompMonth(Number(e.target.value))}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {MONTH_NAMES_LIST.map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={editCommitmentCompYear}
                    onChange={(e) => setEditCommitmentCompYear(Number(e.target.value))}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {[2024, 2025, 2026, 2027, 2028].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Mês financeiro a que o gasto pertence (ex: Setembro/2026 mesmo com vencimento em Outubro).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editCommitmentAmount}
                    onChange={(e) => setEditCommitmentAmount(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Data de Vencimento</label>
                  <input
                    type="date"
                    value={editCommitmentDueDate}
                    onChange={(e) => setEditCommitmentDueDate(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Tipo</label>
                  <select
                    value={editCommitmentTipo}
                    onChange={(e) => setEditCommitmentTipo(e.target.value as any)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="BOLETO">Boleto / Conta Fixa</option>
                    <option value="ASSINATURA">Assinatura / Mensalidade</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Recorrência</label>
                  <select
                    value={editCommitmentRecorrencia}
                    onChange={(e) => setEditCommitmentRecorrencia(e.target.value as any)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="MENSAL">Repetir todo mês</option>
                    <option value="UNICO">Apenas neste mês</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditCommitmentItem(null)}
                  disabled={editingCommitment}
                  className="w-1/2 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editingCommitment}
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {editingCommitment ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Confirmar Pagamento / Baixa em Lote */}
      {batchBaixaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/50 dark:border-emerald-800/50">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Pagar Contas em Lote</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {selectedCommitmentIds.length} contas selecionadas • Total: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{brl(selectedTotalAmount)}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBatchBaixaModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mini resumo das contas selecionadas */}
            <div className="max-h-36 overflow-y-auto mb-4 divide-y divide-slate-100 dark:divide-slate-800/60 bg-slate-50 dark:bg-slate-950/50 rounded-xl p-2.5 border border-slate-200/60 dark:border-slate-800">
              {commitmentsData.items
                .filter((it: any) => selectedCommitmentIds.includes(it.id))
                .map((it: any) => (
                  <div key={it.id} className="py-1.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">{it.description}</span>
                    <span className="font-bold text-slate-900 dark:text-white font-tnum tabular-nums shrink-0">{brl(it.amount)}</span>
                  </div>
                ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">Forma de Pagamento *</label>
                <select
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm bg-white cursor-pointer"
                  value={batchBaixaForma}
                  onChange={(e) => setBatchBaixaForma(e.target.value as any)}
                >
                  <option value="SALDO_CONTA">Saldo da Conta Corrente (Manual)</option>
                  <option value="DEBITO_AUTOMATICO">Débito Automático (Conta Corrente)</option>
                  <option value="PIX">Pix (Sai da Conta Corrente)</option>
                  <option value="CARTAO_CREDITO">Cartão de Crédito (Gera Fatura)</option>
                  <option value="DINHEIRO">Dinheiro em Espécie (Caixa Físico)</option>
                </select>
              </div>

              {["SALDO_CONTA", "DEBITO_AUTOMATICO", "PIX"].includes(batchBaixaForma) && (
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">Qual Conta Corrente Debitar?</label>
                  <select
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm cursor-pointer"
                    value={batchBaixaContaId}
                    onChange={(e) => setBatchBaixaContaId(e.target.value)}
                  >
                    {commitmentsData.contasBancarias.map((conta: any) => (
                      <option key={conta.id} value={conta.id}>
                        {conta.banco} - Saldo: R$ {conta.saldoAtual.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {batchBaixaForma === "CARTAO_CREDITO" && (
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">Qual Cartão de Crédito?</label>
                  <select
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm cursor-pointer"
                    value={batchBaixaCartaoId}
                    onChange={(e) => setBatchBaixaCartaoId(e.target.value)}
                  >
                    {commitmentsData.cartoesCredito.map((cartao: any) => (
                      <option key={cartao.id} value={cartao.id}>
                        {cartao.nome} - Limite Disp: R$ {cartao.limiteDisponivel.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">Data da Baixa</label>
                <input
                  type="date"
                  value={batchBaixaData}
                  onChange={(e) => setBatchBaixaData(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setBatchBaixaModalOpen(false)}
                disabled={payingBatchCommitment}
                className="w-1/2 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleEfetivarBaixaLote}
                disabled={payingBatchCommitment}
                className="w-1/2 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{payingBatchCommitment ? "Processando..." : `Confirmar (${brl(selectedTotalAmount)})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAIS ─────────────────────────────────────────────────────────────── */}

      {/* Modal Criar / Editar */}
      {(modalMode === "create" || modalMode === "edit") && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white/97 dark:bg-slate-900/95 backdrop-blur-md rounded-[32px] border border-white/80 dark:border-slate-800 shadow-2xl w-[95%] sm:w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">

            {/* Header */}
            <div className="flex justify-between items-center px-7 pt-7 pb-5 border-b border-slate-100/60">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-md ${
                  formType === "CONTA_CORRENTE"
                    ? "bg-slate-900 text-white shadow-slate-900/20"
                    : formType === "TICKET"
                    ? "bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-amber-500/20"
                    : "bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-indigo-500/20"
                }`}>
                  {modalMode === "edit"
                    ? <Pencil className="w-4 h-4 text-white" />
                    : formType === "CONTA_CORRENTE"
                    ? <Building2 className="w-4 h-4 text-white" />
                    : formType === "TICKET"
                    ? <Zap className="w-4 h-4 text-white" />
                    : <CreditCard className="w-4 h-4 text-white" />
                  }
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">
                    {modalMode === "edit"
                      ? (formType === "CONTA_CORRENTE" ? "Editar Conta Bancária" : formType === "TICKET" ? "Editar Ticket" : "Editar Cartão")
                      : (formType === "CONTA_CORRENTE" ? "Nova Conta Bancária" : formType === "TICKET" ? "Novo Ticket" : "Novo Cartão")}
                  </h3>
                  <p className="text-[10px] font-semibold text-slate-400">
                    {modalMode === "edit"
                      ? `Atualizando: ${selectedCard?.title}`
                      : formType === "CONTA_CORRENTE"
                      ? "Cadastre sua conta onde entra dinheiro líquido (Salário, Pix, TED)"
                      : formType === "TICKET"
                      ? "Cadastre seu cartão ou benefício corporativo (VR/VA)"
                      : "Cadastre seu cartão de crédito pós-pago e limites"}
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
              {/* Instituição / Nome */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  {formType === "CONTA_CORRENTE"
                    ? "Banco / Instituição *"
                    : formType === "TICKET"
                    ? "Instituição / Nome do Ticket *"
                    : "Instituição / Nome do Cartão *"}
                </label>
                <input
                  required
                  type="text"
                  value={formBank}
                  onChange={e => setFormBank(e.target.value)}
                  placeholder={
                    formType === "CONTA_CORRENTE"
                      ? "Ex: Santander, Nubank, Itaú, Bradesco..."
                      : formType === "TICKET"
                      ? "Ex: Ticket Restaurante, Alelo, VR, Flash..."
                      : "Ex: Hypercard, Nubank Mastercard..."
                  }
                  className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-200 text-slate-700 placeholder:text-slate-300 transition-shadow"
                />
              </div>

              {/* Tipo — Segmented Control */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tipo *</label>
                <div className="flex gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                  {TIPOS_CARTAO.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormType(opt.value)}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        formType === opt.value
                          ? (opt.value === "CONTA_CORRENTE"
                              ? "bg-slate-900 text-white shadow-sm shadow-slate-900/20"
                              : opt.value === "TICKET"
                              ? "bg-amber-600 text-white shadow-sm shadow-amber-600/20"
                              : "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20")
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Titular */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Titular (Opcional)
                </label>
                <input
                  type="text"
                  value={formHolder}
                  onChange={e => setFormHolder(e.target.value)}
                  placeholder="Ex: Túlio Cavalcanti"
                  className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-200 text-slate-700 placeholder:text-slate-300 transition-shadow"
                />
              </div>

              {/* Campos para Conta Bancária */}
              {formType === "CONTA_CORRENTE" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Saldo em Conta / Saldo Atual (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formLimit}
                    onChange={e => setFormLimit(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0,00"
                    className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-200 text-slate-700 placeholder:text-slate-300"
                  />
                  <span className="text-[10px] text-slate-400">
                    O saldo real disponível nesta conta para pagamentos, Pix e transferências.
                  </span>
                </div>
              )}

              {/* Campos para Cartão de Crédito */}
              {formType === "CREDIT_CARD" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Limite Total do Cartão (R$) *
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
                </>
              )}

              {/* Campos para Ticket / Benefício */}
              {formType === "TICKET" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Saldo Atual Disponível (R$) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formLimit}
                      onChange={e => setFormLimit(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="0,00"
                      className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-200 text-slate-700 placeholder:text-slate-300"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Dia da Recarga Mensal
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={formDiaRecarga}
                      onChange={e => setFormDiaRecarga(Number(e.target.value))}
                      placeholder="Ex: Dia 1 ou 15"
                      className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-3.5 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-200 text-slate-700"
                    />
                  </div>
                </>
              )}

              {/* Preview visual */}
              {formBank && (
                <div
                  className="rounded-2xl p-4 flex items-center gap-3 transition-all duration-300"
                  style={{
                    background: formType === "CONTA_CORRENTE"
                      ? "linear-gradient(135deg, #1e293b, #0f172a)"
                      : formType === "TICKET"
                      ? "linear-gradient(135deg, #d97706, #b45309, #ea580c)"
                      : bankGradientStyle(formBank)
                  }}
                >
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    {React.createElement(walletIcon(formType), { className: "w-4 h-4 text-white" })}
                  </div>
                  <div>
                    <p className="text-xs font-black text-white leading-none">{formBank || "Nome da instituição"}</p>
                    <p className="text-[10px] font-bold text-white/80 mt-0.5">{formBank} · {walletLabel(formType)}</p>
                  </div>
                </div>
              )}

              {/* CTA */}
              <button
                type="submit"
                disabled={formSaving}
                className={`w-full py-3.5 rounded-2xl text-white font-extrabold text-xs tracking-wider shadow-lg transition-all mt-1 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${
                  formType === "CONTA_CORRENTE"
                    ? "bg-slate-900 hover:bg-slate-800 shadow-slate-900/25"
                    : formType === "TICKET"
                    ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-600/25"
                    : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-600/25"
                }`}
              >
                {formSaving
                  ? (modalMode === "edit" ? "SALVANDO..." : "CADASTRANDO...")
                  : (modalMode === "edit"
                      ? "SALVAR ALTERAÇÕES"
                      : (formType === "CONTA_CORRENTE"
                          ? "CADASTRAR CONTA BANCÁRIA"
                          : formType === "TICKET"
                          ? "CADASTRAR TICKET"
                          : "CADASTRAR CARTÃO"))
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
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">
                    {selectedCard.walletType === "CONTA_CORRENTE" || (selectedCard as any).tipo === "CONTA_CORRENTE"
                      ? "Excluir Conta Bancária"
                      : selectedCard.walletType === "TICKET" || (selectedCard as any).tipo === "TICKET"
                      ? "Excluir Ticket"
                      : "Excluir Cartão"}
                  </h3>
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
                Tem certeza que deseja excluir{" "}
                {selectedCard.walletType === "CONTA_CORRENTE" || (selectedCard as any).tipo === "CONTA_CORRENTE"
                  ? "a conta bancária "
                  : selectedCard.walletType === "TICKET" || (selectedCard as any).tipo === "TICKET"
                  ? "o ticket "
                  : "o cartão "}
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
                  {bankAccounts.map(bankAcc => (
                    <option key={bankAcc.id} value={bankAcc.id}>
                      {bankAcc.bankName || bankAcc.title} · Saldo: {brl(bankAcc.saldoAtual ?? bankAcc.finalBalance ?? bankAcc.limitTotal ?? 0)}
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
        onSuccess={reloadAllData}
      />

      {/* Modal Global: Adicionar Saldo / Retirar Saldo com Extrato Automático */}
      {injectModalOpen && (
        <InjectBalanceModal
          isOpen={injectModalOpen}
          onClose={() => setInjectModalOpen(false)}
          onSuccess={reloadAllData}
          tipoOperacao={injectTipoOperacao}
          contasBancarias={contasBancarias}
          walletId={
            contasBancarias[0]?.id ||
            cards.find((c: any) => c.walletType === "CONTA_CORRENTE" || c.tipo === "CONTA_CORRENTE" || c.walletType === "DEBITO")?.id ||
            cards[0]?.id || ""
          }
        />
      )}

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

  const isCredit = card.walletType === "CREDIT_CARD" || (card as any).tipo === "CREDITO";
  const isTicket = card.walletType === "TICKET" || (card as any).tipo === "TICKET" || (card as any).tipo === "BENEFICIO";
  const isBank   = !isCredit && !isTicket;

  const gradient = isBank
    ? "from-slate-800 via-slate-850 to-slate-900"
    : isTicket
    ? "from-amber-600 via-amber-700 to-orange-700"
    : bankColor(card.bankName || card.title);

  const Icon     = walletIcon(card.walletType);

  const isZero = card.faturaAtual === 0;
  const dueDateInfo = (card as any).vencimentoStr
    ? { dateStr: (card as any).vencimentoStr }
    : calculateNextDueDate(card.vencimento, selectedMonth || (new Date().getMonth() + 1), selectedYear, isPaid || isZero);

  const saldoAtualVal = card.saldoAtual ?? card.finalBalance ?? card.limitTotal ?? 0;
  const gastoMesVal = card.gastoMes ?? card.monthExpense ?? card.totalSpentInPeriod ?? card.accountExpenses ?? 0;
  const recargaMesVal = card.recargaMes ?? card.monthIncome ?? card.accountIncomes ?? 0;

  return (
    <div className="relative group">
      {/* Card clicável para navegação */}
      <Link href={`/cartoes/${card.id}`} className="block">
        <div className={`relative rounded-[28px] overflow-hidden h-52 bg-gradient-to-br ${gradient} p-5 flex flex-col justify-between cursor-pointer shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 border border-white/10`}>

          {/* Marca d'água sutil */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.12)_0%,_transparent_60%)] pointer-events-none" />

          {isBank ? (
            /* ── Layout Visual do Card de CONTA BANCÁRIA ── */
            <>
              {/* Topo da Conta: Nome + Titular + Badge CONTA BANCÁRIA */}
              <div className="flex justify-between items-start z-10">
                <div className="flex items-center gap-2 min-w-0 pr-8">
                  <div className="w-8.5 h-8.5 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/20 shadow-xs">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      CONTA BANCÁRIA
                    </span>
                    <h4 className="font-bold text-white text-base leading-tight truncate block drop-shadow-xs">
                      {card.bankName || card.title}
                    </h4>
                    {card.holder && (
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {card.holder}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pr-8 shrink-0">
                  <span className="text-[10px] uppercase px-2 py-0.5 bg-emerald-500/20 rounded font-extrabold text-emerald-300 border border-emerald-500/30 tracking-wider">
                    SALDO REAL
                  </span>
                </div>
              </div>

              {/* Centro: Saldo em Conta */}
              <div className="z-10 mt-3">
                <span className="text-xs uppercase font-bold tracking-wider block text-slate-400">
                  Saldo em Conta
                </span>
                <h3 className="text-2xl font-bold tracking-tight text-white mt-0.5 font-tnum tabular-nums">
                  {brl(saldoAtualVal)}
                </h3>
              </div>

              {/* Base: Entradas & Saídas */}
              <div className="z-10 mt-3 pt-3 border-t border-slate-700/60 flex justify-between items-center text-xs text-slate-300">
                <span>Entradas: <b className="text-emerald-400 font-bold">+{brl(recargaMesVal)}</b></span>
                <span>Saídas: <b className="text-rose-400 font-bold">-{brl(gastoMesVal)}</b></span>
              </div>
            </>
          ) : isTicket ? (
            /* ── Layout Visual do Card de TICKET ── */
            <>
              {/* Topo do Ticket: Nome + Badge TICKET */}
              <div className="flex justify-between items-start z-10">
                <div className="flex items-center gap-2 min-w-0 pr-8">
                  <div className="w-8.5 h-8.5 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/30 shadow-xs">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-white text-base leading-tight truncate block drop-shadow-xs">
                      {card.bankName || card.title}
                    </span>
                    {card.holder && (
                      <p className="text-[9px] font-semibold text-white/80 uppercase tracking-wide truncate mt-0.5">
                        👤 {card.holder}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pr-8 shrink-0">
                  <span className="text-xs uppercase px-2 py-0.5 bg-black/20 rounded font-extrabold text-white border border-white/10 tracking-wider">
                    TICKET
                  </span>
                </div>
              </div>

              {/* Centro: Saldo Disponível */}
              <div className="z-10 mt-3">
                <span className="text-xs opacity-80 uppercase font-bold tracking-wider block text-white/90">
                  SALDO DISPONÍVEL
                </span>
                <h3 className="text-2xl font-bold tracking-tight text-white mt-0.5 font-tnum tabular-nums">
                  {brl(saldoAtualVal)}
                </h3>
              </div>

              {/* Base: Gasto no mês & Recarga */}
              <div className="z-10 mt-3 pt-2 border-t border-white/20 flex justify-between items-center text-xs font-semibold text-white/95">
                <span>Gasto no mês: <strong className="font-bold">{brl(gastoMesVal)}</strong></span>
                <span>Recarga: <strong className="font-bold">{brl(recargaMesVal)}</strong></span>
              </div>
            </>
          ) : (
            /* ── Layout Visual do Card de CRÉDITO ── */
            <>
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

                {/* Dígitos */}
                <div className="text-right pr-8 shrink-0">
                  <p className="text-[9px] font-black text-white/80 uppercase tracking-wider">{card.cardBrand || "CARTÃO"}</p>
                  <p className="text-[10px] font-bold text-white/60 mt-0.5">{card.lastDigits || "**** ----"}</p>
                </div>
              </div>

              {/* Centro: Limite Disponível */}
              <div className="z-10 -mt-1">
                <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest block">
                  Disponível
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5 font-tnum tabular-nums">
                  {brl(card.limitTotal - card.limitUsed)}
                </h3>
              </div>

              {/* Base: Fatura + Vencimento + Barra */}
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
            </>
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
                {isBank ? "Editar Conta Bancária" : isTicket ? "Editar Ticket" : "Editar Cartão"}
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
                {isBank ? "Ajustar Saldo em Conta" : isTicket ? "Ajustar Saldo / Recarga" : "Ajustar Limite"}
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
                {isBank ? "Excluir Conta Bancária" : isTicket ? "Excluir Ticket" : "Excluir Cartão"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
