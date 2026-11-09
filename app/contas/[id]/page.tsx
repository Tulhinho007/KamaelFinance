"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  ArrowLeft,
  SlidersHorizontal,
  Plus,
  Search,
  X,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  Activity,
  Calendar,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Wallet,
  Receipt,
  CreditCard,
  DollarSign,
} from "lucide-react";
import { usePeriod } from "@/components/period-context";
import { useModal } from "@/components/ui/custom-dialog-provider";
import { parseCurrencyInput } from "@/lib/constants";
import {
  getBankAccountDataById,
  createBankAccountMovementAction,
  updateBankAccountMovementAction,
  deleteBankAccountMovementAction,
  setExactBankAccountBalanceAction,
} from "@/lib/actions";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDateBR = (dateStr?: string | null) => {
  if (!dateStr) return "-";
  const clean = dateStr.split("T")[0];
  const parts = clean.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return clean;
};

const getBankStyle = (name: string = "") => {
  const lower = name.toLowerCase();
  if (lower.includes("picpay")) {
    return {
      iconBg: "bg-emerald-600 text-white",
      initials: "PIC",
      badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    };
  }
  if (lower.includes("santander")) {
    return {
      iconBg: "bg-red-700 text-white",
      initials: "SAN",
      badgeBg: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
    };
  }
  if (lower.includes("nubank") || lower.includes("nu")) {
    return {
      iconBg: "bg-purple-600 text-white",
      initials: "NU",
      badgeBg: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800",
    };
  }
  if (lower.includes("inter")) {
    return {
      iconBg: "bg-orange-500 text-white",
      initials: "INT",
      badgeBg: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800",
    };
  }
  if (lower.includes("itau") || lower.includes("itaú")) {
    return {
      iconBg: "bg-amber-600 text-white",
      initials: "ITAU",
      badgeBg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
    };
  }
  if (lower.includes("bradesco")) {
    return {
      iconBg: "bg-red-600 text-white",
      initials: "BRA",
      badgeBg: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
    };
  }
  if (lower.includes("caixa")) {
    return {
      iconBg: "bg-blue-600 text-white",
      initials: "CEF",
      badgeBg: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
    };
  }
  if (lower.includes("brasil") || lower.includes("bb")) {
    return {
      iconBg: "bg-yellow-500 text-slate-950",
      initials: "BB",
      badgeBg: "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800",
    };
  }
  if (lower.includes("c6")) {
    return {
      iconBg: "bg-zinc-800 text-white",
      initials: "C6",
      badgeBg: "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    };
  }
  if (lower.includes("mercado") || lower.includes("mp")) {
    return {
      iconBg: "bg-sky-500 text-white",
      initials: "MP",
      badgeBg: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800",
    };
  }
  return {
    iconBg: "bg-indigo-600 text-white",
    initials: (name.substring(0, 3) || "BCO").toUpperCase(),
    badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800",
  };
};

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const MONTH_SHORTS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

interface BankAccountData {
  wallet: {
    id: string;
    title: string;
    bankName: string;
    walletType: string;
    holder: string;
    agencia?: string;
    conta?: string;
    initialBalance: number;
    currentRealBalance: number;
  };
  metrics: {
    currentRealBalance: number;
    periodIncome: number;
    periodExpense: number;
    periodNet: number;
    yearIncome: number;
    yearExpense: number;
    yearNet: number;
    totalTransactionsCount: number;
  };
  transactions: Array<{
    id: string;
    type: "INCOME" | "EXPENSE";
    description: string;
    amount: number;
    date: string;
    paymentDate: string | null;
    category: string;
    categoryColor: string;
    status: string;
    paymentMethod: string | null;
    tags: string | null;
  }>;
  otherAccounts: Array<{
    id: string;
    title: string;
    bankName: string;
    balance: number;
    walletType: string;
  }>;
}

export default function BankAccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params?.id as string;

  const { selectedMonth, selectedYear, setPeriod, setYear } = usePeriod();
  const { showAlert, showConfirm } = useModal();

  const [data, setData] = useState<BankAccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPeriodMode, setFilterPeriodMode] = useState<"MONTH" | "YEAR">("MONTH");

  // Modal Ajustar Saldo
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [exactBalanceInput, setExactBalanceInput] = useState("");
  const [savingAdjustment, setSavingAdjustment] = useState(false);

  // Modal Nova/Editar Movimentação
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [editingMovementId, setEditingMovementId] = useState<string | null>(null);
  const [movementType, setMovementType] = useState<"ENTRADA" | "SAIDA">("ENTRADA");
  const [movementDesc, setMovementDesc] = useState("");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementDate, setMovementDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [movementCategoryKind, setMovementCategoryKind] = useState("PIX_RECEBIDO");
  const [savingMovement, setSavingMovement] = useState(false);

  // Carregar dados da conta
  const loadAccountData = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const res = await getBankAccountDataById(accountId, selectedMonth, selectedYear);
      if (!res) {
        showAlert("Conta bancária não encontrada ou não autorizada.", { variant: "warning" });
        router.replace("/contas");
        return;
      }

      // Se for cartão de crédito legítimo, redireciona para a rota de cartões
      if (res.wallet.walletType === "CREDIT_CARD" || res.wallet.walletType === "CARTAO_CREDITO") {
        router.replace(`/cartoes/${res.wallet.id}`);
        return;
      }

      setData(res);
    } catch (err) {
      console.error("Erro ao carregar dados da conta bancária:", err);
      showAlert("Não foi possível carregar os dados da conta.", { variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [accountId, selectedMonth, selectedYear, router, showAlert]);

  useEffect(() => {
    loadAccountData();
  }, [loadAccountData]);

  // Abertura do modal de Ajuste de Saldo
  const handleOpenAdjustModal = () => {
    if (!data) return;
    const current = Number(data.wallet.currentRealBalance || 0);
    setExactBalanceInput(current.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setManageModalOpen(true);
  };

  // Salvar ajuste de saldo
  const handleSaveExactBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    const targetExact = parseCurrencyInput(exactBalanceInput);
    if (isNaN(targetExact)) {
      showAlert("Informe um valor de saldo válido.", { variant: "warning" });
      return;
    }

    const currentBal = Number(data.wallet.currentRealBalance || 0);
    const diff = Math.round((targetExact - currentBal) * 100) / 100;
    if (diff === 0) {
      showAlert("O valor digitado é exatamente igual ao saldo atual da conta.", { variant: "info" });
      setManageModalOpen(false);
      return;
    }

    setSavingAdjustment(true);
    try {
      const res = await setExactBankAccountBalanceAction({
        contaId: data.wallet.id,
        novoSaldo: targetExact,
        descricao: `Ajuste para saldo real (${formatBRL(targetExact)})`,
      });

      if (res && res.success) {
        showAlert(`Saldo de ${data.wallet.bankName} ajustado com sucesso para ${formatBRL(targetExact)}!`, {
          variant: "success",
        });
        setManageModalOpen(false);
        await loadAccountData();
      } else {
        showAlert("Erro ao ajustar saldo. Tente novamente.", { variant: "danger" });
      }
    } catch (err) {
      console.error("Erro ao ajustar saldo:", err);
      showAlert("Falha ao salvar novo saldo.", { variant: "danger" });
    } finally {
      setSavingAdjustment(false);
    }
  };

  // Abertura do modal de Nova Movimentação
  const handleOpenNewMovement = (type: "ENTRADA" | "SAIDA" = "ENTRADA") => {
    setEditingMovementId(null);
    setMovementType(type);
    setMovementDesc("");
    setMovementAmount("");
    setMovementDate(new Date().toISOString().split("T")[0]);
    setMovementCategoryKind(type === "ENTRADA" ? "PIX_RECEBIDO" : "BOLETO");
    setMovementModalOpen(true);
  };

  // Abertura do modal de Edição de Movimentação
  const handleOpenEditMovement = (tx: any) => {
    setEditingMovementId(tx.id);
    setMovementType(tx.type === "INCOME" ? "ENTRADA" : "SAIDA");
    setMovementDesc(tx.description || "");
    setMovementAmount(Number(tx.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setMovementDate(tx.date ? tx.date.split("T")[0] : new Date().toISOString().split("T")[0]);
    setMovementCategoryKind(tx.tags || (tx.type === "INCOME" ? "PIX_RECEBIDO" : "BOLETO"));
    setMovementModalOpen(true);
  };

  // Salvar Nova ou Editar Movimentação
  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    const amountNum = parseCurrencyInput(movementAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showAlert("Informe um valor válido e maior que zero.", { variant: "warning" });
      return;
    }

    if (!movementDesc.trim()) {
      showAlert("Informe uma descrição para o lançamento.", { variant: "warning" });
      return;
    }

    setSavingMovement(true);
    try {
      if (editingMovementId) {
        await updateBankAccountMovementAction({
          transactionId: editingMovementId,
          type: movementType,
          description: movementDesc.trim(),
          amount: amountNum,
          dateStr: movementDate,
          movementType: movementCategoryKind,
        });
        showAlert("Lançamento atualizado com sucesso!", { variant: "success" });
      } else {
        await createBankAccountMovementAction({
          walletId: data.wallet.id,
          type: movementType,
          description: movementDesc.trim(),
          amount: amountNum,
          dateStr: movementDate,
          movementType: movementCategoryKind,
        });
        showAlert("Movimentação registrada com sucesso!", { variant: "success" });
      }

      setMovementModalOpen(false);
      await loadAccountData();
    } catch (err: any) {
      console.error("Erro ao salvar movimentação:", err);
      showAlert(err?.message || "Erro ao salvar movimentação.", { variant: "danger" });
    } finally {
      setSavingMovement(false);
    }
  };

  // Excluir Movimentação
  const handleDeleteMovement = async (txId: string, desc: string) => {
    const confirmed = await showConfirm(
      `Deseja realmente excluir a movimentação "${desc}"? O saldo da conta será recalculado automaticamente.`,
      { title: "Excluir Movimentação", confirmText: "Sim, excluir", cancelText: "Cancelar" }
    );
    if (!confirmed) return;

    try {
      const res = await deleteBankAccountMovementAction(txId);
      if (res && res.success) {
        showAlert("Movimentação excluída com sucesso!", { variant: "success" });
        await loadAccountData();
      } else {
        showAlert(res?.error || "Erro ao excluir movimentação.", { variant: "danger" });
      }
    } catch (err) {
      console.error("Erro ao excluir movimentação:", err);
      showAlert("Falha ao excluir movimentação.", { variant: "danger" });
    }
  };

  // Filtragem de transações na tabela
  const filteredTransactions = useMemo(() => {
    if (!data?.transactions) return [];

    return data.transactions.filter((tx) => {
      // Filtro de Tipo (Todas / Entradas / Saídas)
      if (filterType === "INCOME" && tx.type !== "INCOME") return false;
      if (filterType === "EXPENSE" && tx.type !== "EXPENSE") return false;

      // Filtro de Período (Mês Selecionado vs Ano Todo)
      const d = tx.paymentDate || tx.date;
      if (d) {
        const txDate = new Date(d);
        const txYear = txDate.getUTCFullYear();
        const txMonth = txDate.getUTCMonth() + 1;

        if (txYear !== selectedYear) return false;
        if (filterPeriodMode === "MONTH" && txMonth !== selectedMonth) return false;
      }

      // Filtro de Busca por Texto
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchDesc = (tx.description || "").toLowerCase().includes(q);
        const matchCat = (tx.category || "").toLowerCase().includes(q);
        const matchTag = (tx.tags || "").toLowerCase().includes(q);
        if (!matchDesc && !matchCat && !matchTag) return false;
      }

      return true;
    });
  }, [data?.transactions, filterType, filterPeriodMode, selectedMonth, selectedYear, searchTerm]);

  // Subtotais da tabela filtrada
  const tableSummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of filteredTransactions) {
      if (tx.type === "INCOME") income += tx.amount;
      else expense += tx.amount;
    }
    return {
      income,
      expense,
      net: income - expense,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400 text-sm">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="font-semibold">Carregando dados da conta bancária...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const bankStyle = getBankStyle(data.wallet.bankName || data.wallet.title);
  const currentBalance = Number(data.wallet.currentRealBalance || 0);

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 pb-20">
      {/* ── BARRA SUPERIOR DE NAVEGAÇÃO ─────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#0b0f19]/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <Link
              href="/contas"
              className="text-xs font-semibold text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Contas Correntes
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {data.wallet.bankName || data.wallet.title}
            </span>
          </div>

          {/* Atalho rápido entre contas bancárias */}
          {data.otherAccounts.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                Alternar conta:
              </span>
              <div className="flex items-center gap-1">
                {data.otherAccounts.map((other) => {
                  const oStyle = getBankStyle(other.bankName || other.title);
                  return (
                    <Link
                      key={other.id}
                      href={`/contas/${other.id}`}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5"
                      title={`Ir para ${other.bankName || other.title}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${oStyle.iconBg}`} />
                      <span>{other.bankName || other.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* ── CABEÇALHO DA CONTA COM AÇÕES RÁPIDAS ─────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-black text-xl sm:text-2xl shadow-md ${bankStyle.iconBg} shrink-0`}>
              {bankStyle.initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {data.wallet.bankName || data.wallet.title}
                </h1>
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${bankStyle.badgeBg}`}>
                  Conta Corrente
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 px-2 py-0.5 rounded-full">
                  Tempo Real
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Titular: <span className="font-semibold text-slate-700 dark:text-slate-300">{data.wallet.holder || "Titular"}</span>
                {data.wallet.agencia && <span> • Agência: {data.wallet.agencia}</span>}
                {data.wallet.conta && <span> • Conta: {data.wallet.conta}</span>}
              </p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={handleOpenAdjustModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all shadow-xs cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Ajustar Saldo</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenNewMovement("ENTRADA")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Novo Lançamento</span>
            </button>
          </div>
        </div>

        {/* ── BARRA DE SELEÇÃO DE PERÍODO (MÊS / ANO) ─────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ano:</span>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5">
              {[2025, 2026, 2027].map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYear(y)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    selectedYear === y
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* Filtro Mês a Mês ou Ano Todo */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none">
            {MONTH_SHORTS.map((name, idx) => {
              const mNum = idx + 1;
              const isSelected = filterPeriodMode === "MONTH" && selectedMonth === mNum;
              return (
                <button
                  key={mNum}
                  type="button"
                  onClick={() => {
                    setPeriod(mNum, selectedYear);
                    setFilterPeriodMode("MONTH");
                  }}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {name}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setFilterPeriodMode(filterPeriodMode === "YEAR" ? "MONTH" : "YEAR")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                filterPeriodMode === "YEAR"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Ano Todo
            </button>
          </div>
        </div>

        {/* ── 4 CARDS DE INDICADORES (KPIS) ───────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: Saldo Atual em Tempo Real */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Saldo Atual (Hoje)
              </span>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 px-2 py-0.5 rounded-full">
                Liquidado
              </span>
            </div>
            <p className={`text-2xl sm:text-3xl font-black tracking-tight mt-2 tabular-nums ${currentBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {formatBRL(currentBalance)}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Disponibilidade imediata na conta
            </p>
          </div>

          {/* Card 2: Entradas no Período */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {filterPeriodMode === "MONTH" ? `Entradas (${MONTH_SHORTS[selectedMonth - 1]})` : `Entradas (${selectedYear})`}
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black tracking-tight mt-2 tabular-nums text-emerald-600 dark:text-emerald-400">
              +{formatBRL(filterPeriodMode === "MONTH" ? data.metrics.periodIncome : data.metrics.yearIncome)}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Depósitos e receitas creditadas
            </p>
          </div>

          {/* Card 3: Saídas no Período */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {filterPeriodMode === "MONTH" ? `Saídas (${MONTH_SHORTS[selectedMonth - 1]})` : `Saídas (${selectedYear})`}
              </span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black tracking-tight mt-2 tabular-nums text-rose-600 dark:text-rose-400">
              -{formatBRL(filterPeriodMode === "MONTH" ? data.metrics.periodExpense : data.metrics.yearExpense)}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Despesas e débitos liquidados
            </p>
          </div>

          {/* Card 4: Balanço do Período */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Resultado Líquido
              </span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            {(() => {
              const net = filterPeriodMode === "MONTH" ? data.metrics.periodNet : data.metrics.yearNet;
              return (
                <>
                  <p className={`text-2xl sm:text-3xl font-black tracking-tight mt-2 tabular-nums ${net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {net >= 0 ? "+" : ""}{formatBRL(net)}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Entradas subtraídas das saídas
                  </p>
                </>
              );
            })()}
          </div>
        </div>

        {/* ── EXTRATO DA CONTA: TABELA EXCLUSIVA ─────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Barra de Filtros e Busca */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Extrato de Movimentações</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {tableSummary.count} lançamentos
                </span>
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Histórico exclusivo de transações vinculadas a esta conta bancária
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Abas de Tipo */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setFilterType("ALL")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    filterType === "ALL"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("INCOME")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    filterType === "INCOME"
                      ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Entradas
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("EXPENSE")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    filterType === "EXPENSE"
                      ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Saídas
                </button>
              </div>

              {/* Campo de Busca */}
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar lançamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Data</th>
                  <th className="py-3 px-5">Descrição</th>
                  <th className="py-3 px-5">Categoria</th>
                  <th className="py-3 px-5">Tipo</th>
                  <th className="py-3 px-5 text-right">Valor</th>
                  <th className="py-3 px-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-600 stroke-1" />
                        <p className="font-semibold text-sm">Nenhuma movimentação encontrada</p>
                        <p className="text-xs text-slate-400">
                          {searchTerm
                            ? "Tente refinar sua busca ou limpar os filtros."
                            : "Esta conta ainda não possui movimentações para o período selecionado."}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleOpenNewMovement("ENTRADA")}
                          className="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          + Registrar primeiro lançamento
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isIncome = tx.type === "INCOME";
                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                      >
                        {/* Status */}
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Liquidado</span>
                          </span>
                        </td>

                        {/* Data */}
                        <td className="py-3.5 px-5 whitespace-nowrap text-slate-600 dark:text-slate-400 font-medium">
                          {formatDateBR(tx.paymentDate || tx.date)}
                        </td>

                        {/* Descrição */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {tx.description}
                            </span>
                            {tx.tags && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                {tx.tags}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Categoria */}
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: tx.categoryColor || (isIncome ? "#10B981" : "#EF4444") }}
                            />
                            <span>{tx.category}</span>
                          </span>
                        </td>

                        {/* Tipo */}
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          {isIncome ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                              <span>Entrada</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              <span>Saída</span>
                            </span>
                          )}
                        </td>

                        {/* Valor */}
                        <td className="py-3.5 px-5 text-right whitespace-nowrap font-bold tabular-nums">
                          <span className={isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                            {isIncome ? "+" : "-"}{formatBRL(tx.amount)}
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditMovement(tx)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Editar movimentação"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMovement(tx.id, tx.description)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir movimentação"
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

          {/* Rodapé da Tabela com Subtotais */}
          {filteredTransactions.length > 0 && (
            <div className="p-4 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">
                Totais ({filteredTransactions.length} itens no extrato)
              </span>
              <div className="flex items-center gap-6 font-bold tabular-nums">
                <div>
                  <span className="text-slate-400 font-medium mr-1.5">Entradas:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">+{formatBRL(tableSummary.income)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium mr-1.5">Saídas:</span>
                  <span className="text-rose-600 dark:text-rose-400">-{formatBRL(tableSummary.expense)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium mr-1.5">Balanço:</span>
                  <span className={tableSummary.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                    {tableSummary.net >= 0 ? "+" : ""}{formatBRL(tableSummary.net)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── MODAL: AJUSTAR SALDO DA CONTA ───────────────────────────────── */}
      {manageModalOpen && (
        <div
          onClick={() => setManageModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${bankStyle.iconBg} shadow-sm shrink-0`}>
                  {bankStyle.initials}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Ajustar Saldo - {data.wallet.bankName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Definir o saldo exato verificado no app do banco
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManageModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Saldo Atual */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 mb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Saldo Atual no Sistema
                </span>
                <p className={`text-2xl font-black mt-0.5 tabular-nums ${currentBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {formatBRL(currentBalance)}
                </p>
              </div>
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                Tempo Real
              </span>
            </div>

            <form onSubmit={handleSaveExactBalance} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 block mb-1.5">
                  Qual é o saldo atual no banco?
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 400,00"
                    value={exactBalanceInput}
                    onChange={(e) => setExactBalanceInput(e.target.value.replace(/[^0-9.,-]/g, ""))}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white pl-11 pr-3 py-3 rounded-xl text-lg font-bold focus:outline-none focus:border-emerald-500 shadow-2xs"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  O sistema criará automaticamente a transação de conciliação para igualar o saldo da conta a este valor.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setManageModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAdjustment || exactBalanceInput.trim() === ""}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
                >
                  {savingAdjustment ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Confirmar Saldo Real</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: NOVA / EDITAR MOVIMENTAÇÃO ─────────────────────────── */}
      {movementModalOpen && (
        <div
          onClick={() => setMovementModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingMovementId ? "Editar Lançamento" : "Nova Movimentação em Conta"}
              </h3>
              <button
                type="button"
                onClick={() => setMovementModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="space-y-4">
              {/* Toggle Entrada vs Saída */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1.5">
                  Tipo de Movimentação
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setMovementType("ENTRADA");
                      setMovementCategoryKind("PIX_RECEBIDO");
                    }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      movementType === "ENTRADA"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>Entrada (+)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMovementType("SAIDA");
                      setMovementCategoryKind("BOLETO");
                    }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      movementType === "SAIDA"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Saída (-)</span>
                  </button>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Descrição do Lançamento
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pix recebido, Pagamento conta de luz..."
                  value={movementDesc}
                  onChange={(e) => setMovementDesc(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-3 py-2.5 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500"
                  required
                  autoFocus
                />
              </div>

              {/* Valor e Data */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={movementAmount}
                    onChange={(e) => setMovementAmount(e.target.value.replace(/[^0-9.,]/g, ""))}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-3 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500 tabular-nums"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    value={movementDate}
                    onChange={(e) => setMovementDate(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-3 py-2.5 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Categoria / Operação */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Natureza da Operação
                </label>
                <select
                  value={movementCategoryKind}
                  onChange={(e) => setMovementCategoryKind(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-3 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {movementType === "ENTRADA" ? (
                    <>
                      <option value="PIX_RECEBIDO">Pix / Transferência Recebida</option>
                      <option value="SALARIO">Salário / Remuneração</option>
                      <option value="INJECAO">Ajuste de Saldo / Depósito</option>
                      <option value="OUTROS">Outras Entradas</option>
                    </>
                  ) : (
                    <>
                      <option value="BOLETO">Pagamento de Boleto</option>
                      <option value="FATURA_CARTAO">Pagamento de Fatura</option>
                      <option value="PIX_ENVIADO">Pix / Transferência Enviada</option>
                      <option value="DEBITO_AUTOMATICO">Débito Automático</option>
                      <option value="SAQUE">Saque em Dinheiro</option>
                      <option value="OUTROS">Outras Despesas</option>
                    </>
                  )}
                </select>
              </div>

              {/* Botões */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMovementModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMovement}
                  className={`flex-1 py-3 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-md flex items-center justify-center gap-2 ${
                    movementType === "ENTRADA" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {savingMovement ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>{editingMovementId ? "Salvar Alterações" : "Registrar Lançamento"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
