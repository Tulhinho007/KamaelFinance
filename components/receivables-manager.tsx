"use client";

import React, { useState, useEffect } from "react";
import {
  HandCoins,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2,
  Wallet,
  ArrowDownRight,
  TrendingUp,
  Search,
  X,
  Loader2,
  AlertCircle
} from "lucide-react";
import {
  getReceivablesAction,
  createReceivableAction,
  receiveReceivableInstallmentAction,
  deleteReceivableInstallmentAction,
  deleteReceivableAction,
  getWalletsAction
} from "@/lib/actions";
import { useModal } from "@/components/ui/custom-dialog-provider";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDateDisplay = (dateStr?: string | null) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

export type ReceivableItem = {
  id: string;
  title: string;
  startDate: string;
  dueDate: string | null;
  totalAmount: number;
  receivedAmount: number;
  remainingAmount: number;
  pct: number;
  status: string; // "ACTIVE" | "COMPLETED"
  completedAt: string | null;
  history: {
    id: string;
    date: string;
    amount: number;
    walletId: string | null;
    walletTitle: string;
    transactionId: string | null;
  }[];
};

export function ReceivablesManager() {
  const { showAlert, showConfirm } = useModal();
  const [receivables, setReceivables] = useState<ReceivableItem[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"ativos" | "quitados" | "todos">("ativos");
  const [searchTerm, setSearchTerm] = useState("");

  // Expansão de histórico individual de cada card
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  // Modal Novo Valor a Receber
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newDebtor, setNewDebtor] = useState("");
  const [newTotal, setNewTotal] = useState<number | "">("");
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [newDueDate, setNewDueDate] = useState("");
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Modal Abater / Receber Parcela
  const [selectedReceivable, setSelectedReceivable] = useState<ReceivableItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentWalletId, setPaymentWalletId] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recs, wls] = await Promise.all([
        getReceivablesAction(),
        getWalletsAction()
      ]);
      setReceivables(recs);
      const nonCredit = (wls || []).filter((w: any) => w.walletType !== "CREDIT_CARD");
      setWallets(nonCredit);
      if (nonCredit.length > 0 && !paymentWalletId) {
        setPaymentWalletId(nonCredit[0].id);
      }
    } catch (err) {
      console.error("Erro ao carregar valores a receber:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Criação de Nova Cobrança
  const handleCreateReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim() || !newTotal || Number(newTotal) <= 0) {
      showAlert("Por favor, preencha a descrição e o valor acordado.", { variant: "warning" });
      return;
    }

    try {
      setIsSubmittingNew(true);
      await createReceivableAction({
        description: newDesc.trim(),
        debtor: newDebtor.trim() || undefined,
        totalAmount: Number(newTotal),
        startDate: newStartDate,
        dueDate: newDueDate || undefined,
      });

      setNewDesc("");
      setNewDebtor("");
      setNewTotal("");
      setNewDueDate("");
      setIsCreateModalOpen(false);
      showAlert("Valor a receber cadastrado com sucesso!", { variant: "success" });
      await loadData();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao cadastrar valor a receber.", { variant: "error" });
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Abrir Modal de Pagamento
  const openPaymentModal = (item: ReceivableItem) => {
    setSelectedReceivable(item);
    setPaymentAmount(item.remainingAmount > 0 ? item.remainingAmount : "");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    if (wallets.length > 0) {
      setPaymentWalletId(wallets[0].id);
    }
    setPaymentNotes("");
  };

  // Confirmar Recebimento de Parcela
  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceivable) return;

    const val = Number(paymentAmount);
    if (!val || val <= 0) {
      showAlert("Informe um valor válido para a parcela recebida.", { variant: "warning" });
      return;
    }
    if (!paymentWalletId) {
      showAlert("Selecione a conta bancária de destino do valor.", { variant: "warning" });
      return;
    }

    try {
      setIsSubmittingPayment(true);
      await receiveReceivableInstallmentAction({
        receivableId: selectedReceivable.id,
        amount: val,
        date: paymentDate,
        walletId: paymentWalletId,
        notes: paymentNotes.trim() || undefined,
      });

      const selectedWallet = wallets.find(w => w.id === paymentWalletId);
      setSelectedReceivable(null);
      showAlert(`Parcela de ${brl(val)} registrada com sucesso e creditada em "${selectedWallet?.title || "Conta"}".`, {
        variant: "success"
      });
      await loadData();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao registrar parcela recebida.", { variant: "error" });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Excluir Parcela
  const handleDeleteInstallment = async (installmentId: string, amount: number) => {
    const confirmed = await showConfirm(
      `Deseja estornar esta parcela de ${brl(amount)}? O saldo da conta bancária de destino será estornado automaticamente.`,
      {
        title: "Estornar Parcela",
        variant: "danger",
        confirmText: "Estornar",
      }
    );
    if (!confirmed) return;

    try {
      await deleteReceivableInstallmentAction(installmentId);
      showAlert("Parcela estornada com sucesso.", { variant: "success" });
      await loadData();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao estornar parcela.", { variant: "error" });
    }
  };

  // Excluir Cobrança Inteira
  const handleDeleteReceivable = async (item: ReceivableItem) => {
    const confirmed = await showConfirm(
      `Deseja remover o registro "${item.title}"?`,
      {
        title: "Excluir Valor a Receber",
        variant: "danger",
        confirmText: "Excluir",
      }
    );
    if (!confirmed) return;

    try {
      await deleteReceivableAction(item.id);
      showAlert("Registro excluído com sucesso.", { variant: "success" });
      await loadData();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao excluir registro.", { variant: "error" });
    }
  };

  // Cálculos Consolidados
  const totalGeralAcordado = receivables.reduce((acc, r) => acc + r.totalAmount, 0);
  const totalGeralRecebido = receivables.reduce((acc, r) => acc + r.receivedAmount, 0);
  const totalGeralRestante = receivables.reduce((acc, r) => acc + r.remainingAmount, 0);
  const percentualGeral = totalGeralAcordado > 0
    ? Math.min(100, Math.round((totalGeralRecebido / totalGeralAcordado) * 100))
    : 0;

  // Filtragem dos Cards
  const filteredReceivables = receivables.filter(item => {
    const matchesFilter =
      filterTab === "todos"
        ? true
        : filterTab === "ativos"
        ? item.status !== "COMPLETED" && item.remainingAmount > 0
        : item.status === "COMPLETED" || item.remainingAmount <= 0;

    const matchesSearch =
      !searchTerm ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* ── 1. HEADER COM RESUMO & BOTÃO + NOVO VALOR A RECEBER ─────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <HandCoins className="w-5 h-5 text-emerald-500" /> Valores a Receber & Cobranças
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Acompanhe vendas parceladas, empréstimos a terceiros e abata parcelas com crédito automático em conta.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary-glow py-2.5 px-4 text-xs font-black flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>+ Novo Valor a Receber</span>
        </button>
      </div>

      {/* ── 2. CARDS RESUMO DO MÓDULO (3 CARDS) ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Card 1: Total Acordado */}
        <div className="card-glow p-5 bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-lg dark:shadow-black/20 flex flex-col justify-between space-y-2 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
              Total Acordado
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight font-tnum">
              {brl(totalGeralAcordado)}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1">
              Soma de todas as cobranças ({receivables.length} {receivables.length === 1 ? "registro" : "registros"})
            </p>
          </div>
        </div>

        {/* Card 2: Já Recebido com Barra Embutida */}
        <div className="card-glow p-5 bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-lg dark:shadow-black/20 flex flex-col justify-between space-y-2 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
              Total Já Recebido
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-tnum">
                {brl(totalGeralRecebido)}
              </p>
              <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/30">
                {percentualGeral}% quitado
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 bg-emerald-500"
                style={{ width: `${percentualGeral}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Saldo Restante Pendente */}
        <div className="card-glow p-5 bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-lg dark:shadow-black/20 flex flex-col justify-between space-y-2 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
              Saldo Restante a Receber
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-500/30">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight font-tnum">
              {brl(totalGeralRestante)}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1">
              {receivables.filter(r => r.remainingAmount > 0).length} cobranças com saldo em aberto
            </p>
          </div>
        </div>

      </div>

      {/* ── 3. FILTROS & BUSCA ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 self-start">
          <button
            type="button"
            onClick={() => setFilterTab("ativos")}
            className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
              filterTab === "ativos"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/80 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Em Aberto ({receivables.filter(r => r.remainingAmount > 0).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("quitados")}
            className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
              filterTab === "quitados"
                ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200/80 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Quitados ({receivables.filter(r => r.status === "COMPLETED" || r.remainingAmount <= 0).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("todos")}
            className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
              filterTab === "todos"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Todos ({receivables.length})
          </button>
        </div>

        {/* Campo de Busca */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por descrição ou pessoa..."
            className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 pl-9 pr-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* ── 4. LISTA DE CARDS DE ACOMPANHAMENTO ───────────────────────────────── */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
          <p className="text-xs font-bold text-slate-400">Carregando cobranças...</p>
        </div>
      ) : filteredReceivables.length === 0 ? (
        <div className="card-glow p-12 text-center flex flex-col items-center justify-center gap-3 bg-white dark:bg-zinc-900/60 rounded-3xl border border-slate-200/80 dark:border-white/[0.08]">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <HandCoins className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">Nenhum registro encontrado</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            {searchTerm
              ? "Nenhum valor a receber corresponde à sua pesquisa."
              : filterTab === "quitados"
              ? "Você ainda não possui valores totalmente quitados."
              : "Cadastre parcelamentos de vendas ou cobranças para controlar pagamentos parciais."}
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary-glow py-2 px-4 text-xs font-bold mt-2"
          >
            + Novo Valor a Receber
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReceivables.map(item => {
            const isCompleted = item.status === "COMPLETED" || item.remainingAmount <= 0;
            const isExpanded = expandedIds.includes(item.id);

            return (
              <div
                key={item.id}
                className={`card-glow p-5 bg-white dark:bg-zinc-900/70 backdrop-blur-md rounded-3xl border transition-all space-y-4 ${
                  isCompleted
                    ? "border-emerald-500/30 bg-emerald-50/10 dark:bg-emerald-950/10"
                    : "border-slate-200/80 dark:border-white/[0.08] hover:border-indigo-400/50"
                }`}
              >
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                      isCompleted
                        ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30"
                        : "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30"
                    }`}>
                      <HandCoins className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          Início: {formatDateDisplay(item.startDate)}
                        </span>
                        {item.dueDate && (
                          <span>• Limite: {formatDateDisplay(item.dueDate)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge & Ações */}
                  <div className="flex items-center gap-1.5">
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        Quitado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/30">
                        <Clock className="w-3 h-3" />
                        Em Aberto
                      </span>
                    )}

                    <button
                      onClick={() => handleDeleteReceivable(item)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Excluir Registro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Barra de Progresso Visual */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-extrabold">
                    <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Progresso de Quitação
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-black">
                      {item.pct}% quitado
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-500 to-teal-400"
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>

                {/* 3 Valores em Destaque no Card */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/80 text-center">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      Total
                    </span>
                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-tnum">
                      {brl(item.totalAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                      Já Recebido
                    </span>
                    <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 font-tnum">
                      {brl(item.receivedAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-rose-500 dark:text-rose-400 block">
                      Restante
                    </span>
                    <span className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400 font-tnum">
                      {brl(item.remainingAmount)}
                    </span>
                  </div>
                </div>

                {/* Botão de Ação: + Abater / Receber Parcela */}
                {!isCompleted && (
                  <button
                    onClick={() => openPaymentModal(item)}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ArrowDownRight className="w-4 h-4 text-emerald-200" />
                    <span>+ Abater / Receber Parcela</span>
                  </button>
                )}

                {/* Mini-histórico Expansível */}
                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2">
                  <button
                    type="button"
                    onClick={() => toggleExpand(item.id)}
                    className="w-full flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white py-1 cursor-pointer transition-colors"
                  >
                    <span>
                      Histórico de pagamentos ({item.history.length} {item.history.length === 1 ? "parcela recebida" : "parcelas recebidas"})
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 space-y-1.5 animate-in fade-in duration-200">
                      {item.history.length === 0 ? (
                        <p className="text-[10px] text-slate-400 text-center py-2">
                          Nenhuma parcela recebida ainda.
                        </p>
                      ) : (
                        item.history.map((h, idx) => (
                          <div
                            key={h.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black flex items-center justify-center">
                                {item.history.length - idx}
                              </span>
                              <div>
                                <span className="font-extrabold text-slate-800 dark:text-slate-200 font-tnum">
                                  +{brl(h.amount)}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium block">
                                  {formatDateDisplay(h.date)} • Creditado em {h.walletTitle}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteInstallment(h.id, h.amount)}
                              className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors cursor-pointer"
                              title="Estornar parcela"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: + NOVO VALOR A RECEBER ───────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-5 text-slate-900 dark:text-white">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <HandCoins className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Novo Valor a Receber</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateReceivable} className="space-y-4">
              {/* Descrição */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Descrição da Venda / Cobrança *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Ex: Venda PC, Empréstimo, Freela Design..."
                  className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Devedor / Pessoa */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Devedor / Pessoa (Opcional)
                </label>
                <input
                  type="text"
                  value={newDebtor}
                  onChange={e => setNewDebtor(e.target.value)}
                  placeholder="Ex: Primo, João Silva, Cliente X..."
                  className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Valor Total Acordado */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Valor Total Acordado (R$) *
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={newTotal}
                  onChange={e => setNewTotal(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Ex: 1700,00"
                  className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-tnum"
                />
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Data da Venda / Início
                  </label>
                  <input
                    type="date"
                    required
                    value={newStartDate}
                    onChange={e => setNewStartDate(e.target.value)}
                    className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Previsão / Limite
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={e => setNewDueDate(e.target.value)}
                    className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNew}
                  className="btn-primary-glow flex-1 py-2.5 text-xs font-black disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {isSubmittingNew ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-white" />
                      <span>Cadastrar Cobrança</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: + ABATER / RECEBER PARCELA ─────────────────────────────────── */}
      {selectedReceivable && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-5 text-slate-900 dark:text-white">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Receber Parcela</h3>
                  <p className="text-[10px] text-slate-400 font-bold truncate max-w-xs">{selectedReceivable.title}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReceivable(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Banner de Saldo Restante */}
            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  Saldo Restante:
                </span>
              </div>
              <span className="text-xs font-black text-amber-900 dark:text-amber-200 font-tnum">
                {brl(selectedReceivable.remainingAmount)}
              </span>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4">
              {/* Valor Pago */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                    Valor Recebido (R$) *
                  </label>
                  {selectedReceivable.remainingAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(selectedReceivable.remainingAmount)}
                      className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Quitar Tudo ({brl(selectedReceivable.remainingAmount)})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  required
                  autoFocus
                  min="0.01"
                  step="0.01"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-black text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-tnum"
                />
              </div>

              {/* Conta Bancária de Destino */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Conta de Destino (Onde o dinheiro caiu) *
                </label>
                <select
                  required
                  value={paymentWalletId}
                  onChange={e => setPaymentWalletId(e.target.value)}
                  className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">Selecione a conta bancária...</option>
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.title} ({brl(Number(w.currentBalance || 0))})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Este valor será injetado automaticamente como entrada (+ Receita) no extrato desta conta.
                </p>
              </div>

              {/* Data do Pagamento */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Data do Pagamento *
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              {/* Anotações */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Observações (Opcional)
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  placeholder="Ex: Parcela 2 via Pix, Pagamento parcial..."
                  className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReceivable(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="btn-primary-glow flex-1 py-2.5 text-xs font-black disabled:opacity-60 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500"
                >
                  {isSubmittingPayment ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Confirmar Recebimento</span>
                    </>
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
