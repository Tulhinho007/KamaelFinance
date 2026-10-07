"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  Wallet,
  Receipt,
  Plus,
  ArrowLeft,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  X,
  Search,
  Check,
  Repeat,
  Pencil,
  Trash2,
  Copy,
  MoreVertical,
  Zap,
  RotateCcw,
  RotateCw,
  Sparkles,
  Layers,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { usePeriod } from "@/components/period-context";
import { useModal } from "@/components/ui/custom-dialog-provider";
import {
  getGestaoCaixaPageDataAction,
  createNewCard,
  createBankAccountMovementAction,
  createCommitmentAction,
  payCommitmentAction,
  payBatchCommitmentsAction,
  updateCommitmentAction,
  deleteCommitmentAction,
  undoCommitmentPaymentAction,
  duplicateCommitmentToNextMonthAction,
} from "@/lib/actions";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MONTH_NAMES_LIST = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function GestaoCaixaContasPage() {
  const { selectedYear, prevYear, nextYear, goToCurrentYear } = usePeriod();
  const { showAlert } = useModal();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"TODOS" | "AGENDA" | "EXTRATO">("TODOS");

  // Dados consolidados
  const [accounts, setAccounts] = useState<any[]>([]);
  const [realizedTransactions, setRealizedTransactions] = useState<any[]>([]);
  const [pendingCommitments, setPendingCommitments] = useState<any[]>([]);
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);
  const [cartoesCredito, setCartoesCredito] = useState<any[]>([]);
  const [totals, setTotals] = useState({
    totalRealBalance: 0,
    totalPendentesAno: 0,
    saldoProjetado: 0,
    pendingCount: 0,
    realizedCount: 0,
  });

  // Filtros de Extrato
  const [extratoAccountFilter, setExtratoAccountFilter] = useState<string>("ALL");
  const [extratoSearch, setExtratoSearch] = useState("");
  const [showAllMovements, setShowAllMovements] = useState(false);

  // Filtros de Agenda a Pagar
  const [agendaSearch, setAgendaSearch] = useState("");
  const [selectedCommitmentIds, setSelectedCommitmentIds] = useState<string[]>([]);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Modais de Ação Rápida
  const [newCommitmentModalOpen, setNewCommitmentModalOpen] = useState(false);
  const [newMovementModalOpen, setNewMovementModalOpen] = useState(false);
  const [newAccountModalOpen, setNewAccountModalOpen] = useState(false);

  // Modal de Baixa / Pagamento
  const [payCommitmentItem, setPayCommitmentItem] = useState<any | null>(null);
  const [payingCommitment, setPayingCommitment] = useState(false);
  const [baixaForma, setBaixaForma] = useState<"SALDO_CONTA" | "DEBITO_AUTOMATICO" | "PIX" | "CARTAO_CREDITO" | "DINHEIRO">("SALDO_CONTA");
  const [baixaContaId, setBaixaContaId] = useState("");
  const [baixaCartaoId, setBaixaCartaoId] = useState("");
  const [baixaData, setBaixaData] = useState(new Date().toISOString().split("T")[0]);

  // Modal de Baixa em Lote
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [payingBatch, setPayingBatch] = useState(false);
  const [batchBaixaForma, setBatchBaixaForma] = useState<"SALDO_CONTA" | "DEBITO_AUTOMATICO" | "PIX" | "CARTAO_CREDITO" | "DINHEIRO">("SALDO_CONTA");
  const [batchBaixaContaId, setBatchBaixaContaId] = useState("");
  const [batchBaixaCartaoId, setBatchBaixaCartaoId] = useState("");
  const [batchBaixaData, setBatchBaixaData] = useState(new Date().toISOString().split("T")[0]);

  // Form: Novo Boleto / Assinatura
  const [savingCommitment, setSavingCommitment] = useState(false);
  const [newCommitmentDesc, setNewCommitmentDesc] = useState("");
  const [newCommitmentAmount, setNewCommitmentAmount] = useState("");
  const [newCommitmentDueDate, setNewCommitmentDueDate] = useState("");
  const [newCommitmentTipo, setNewCommitmentTipo] = useState<"BOLETO" | "ASSINATURA">("BOLETO");
  const [newCommitmentRecorrencia, setNewCommitmentRecorrencia] = useState<"MENSAL" | "UNICO">("MENSAL");
  const [newCommitmentCompMonth, setNewCommitmentCompMonth] = useState<number>(new Date().getMonth() + 1);
  const [newCommitmentCompYear, setNewCommitmentCompYear] = useState<number>(selectedYear || 2026);

  // Form: Movimentação Avulsa (Pix/Depósito/Débito)
  const [savingMovement, setSavingMovement] = useState(false);
  const [movWalletId, setMovWalletId] = useState("");
  const [movTipo, setMovTipo] = useState<"ENTRADA" | "SAIDA">("SAIDA");
  const [movDesc, setMovDesc] = useState("");
  const [movValor, setMovValor] = useState<number | "">("");
  const [movData, setMovData] = useState(new Date().toISOString().split("T")[0]);
  const [movMetodo, setMovMetodo] = useState("PIX");

  // Form: Nova Conta Bancária
  const [savingAccount, setSavingAccount] = useState(false);
  const [accBankName, setAccBankName] = useState("");
  const [accHolder, setAccHolder] = useState("");
  const [accInitialBalance, setAccInitialBalance] = useState<number | "">("");

  // Modal: Editar Compromisso
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editingCommitment, setEditingCommitment] = useState(false);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editTipo, setEditTipo] = useState<"BOLETO" | "ASSINATURA">("BOLETO");
  const [editRecorrencia, setEditRecorrencia] = useState<"MENSAL" | "UNICO">("MENSAL");
  const [editCompMonth, setEditCompMonth] = useState<number>(new Date().getMonth() + 1);
  const [editCompYear, setEditCompYear] = useState<number>(selectedYear || 2026);

  // Modal: Excluir Compromisso
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [deletingCommitment, setDeletingCommitment] = useState(false);

  // Carregar Dados Consolidados
  const loadData = async (active = true) => {
    try {
      setLoading(true);
      const data = await getGestaoCaixaPageDataAction(selectedYear);
      if (!active) return;
      setAccounts(data.accounts || []);
      setRealizedTransactions(data.realizedTransactions || []);
      setPendingCommitments(data.pendingCommitments || []);
      setContasBancarias(data.contasBancarias || []);
      setCartoesCredito(data.cartoesCredito || []);
      setTotals(data.totals);

      if (data.accounts?.length > 0 && !movWalletId) {
        setMovWalletId(data.accounts[0].id);
      }
      if (data.contasBancarias?.length > 0) {
        setBaixaContaId((prev) => prev || data.contasBancarias[0].id);
        setBatchBaixaContaId((prev) => prev || data.contasBancarias[0].id);
      }
      if (data.cartoesCredito?.length > 0) {
        setBaixaCartaoId((prev) => prev || data.cartoesCredito[0].id);
        setBatchBaixaCartaoId((prev) => prev || data.cartoesCredito[0].id);
      }
    } catch (err) {
      console.error("Erro ao carregar Gestão de Caixa & Contas:", err);
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
  }, [selectedYear]);

  // Fechar menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => setActiveActionMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Filtros da Agenda de Contas a Pagar (Apenas itens PENDENTES)
  const filteredPendingCommitments = useMemo(() => {
    return pendingCommitments.filter((item) => {
      if (!agendaSearch.trim()) return true;
      const q = agendaSearch.toLowerCase().trim();
      const matchDesc = (item.description || "").toLowerCase().includes(q);
      const matchType = (item.tipoLabel || "").toLowerCase().includes(q);
      const matchRef = (item.competenciaLabel || item.competenciaShort || "").toLowerCase().includes(q);
      return matchDesc || matchType || matchRef;
    });
  }, [pendingCommitments, agendaSearch]);

  // Filtros do Extrato Realizado (Movimentações que já aconteceram)
  const filteredRealizedMovements = useMemo(() => {
    return realizedTransactions.filter((tx) => {
      if (extratoAccountFilter !== "ALL" && tx.walletId !== extratoAccountFilter) {
        return false;
      }
      if (extratoSearch.trim()) {
        const q = extratoSearch.toLowerCase().trim();
        const matchDesc = (tx.description || "").toLowerCase().includes(q);
        const matchCat = (tx.category || "").toLowerCase().includes(q);
        const matchWallet = (tx.walletName || "").toLowerCase().includes(q);
        return matchDesc || matchCat || matchWallet;
      }
      return true;
    });
  }, [realizedTransactions, extratoAccountFilter, extratoSearch]);

  const displayedRealizedMovements = showAllMovements
    ? filteredRealizedMovements
    : filteredRealizedMovements.slice(0, 10);

  // Valor total das contas selecionadas para baixa em lote
  const selectedBatchTotal = useMemo(() => {
    return pendingCommitments
      .filter((it) => selectedCommitmentIds.includes(it.id))
      .reduce((sum, it) => sum + Number(it.amount || 0), 0);
  }, [pendingCommitments, selectedCommitmentIds]);

  // Handlers: Duplicar / Repetir no Mês Seguinte
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const handleDuplicateToNextMonth = async (item: any) => {
    setDuplicatingId(item.id);
    try {
      const res = await duplicateCommitmentToNextMonthAction(item.id);
      if (res.success) {
        showAlert(`Compromisso duplicado com sucesso para ${res.formattedTarget}!`, { variant: "success" });
        await loadData();
      }
    } catch (err: any) {
      console.error("Erro ao duplicar compromisso:", err);
      showAlert(err?.message || "Erro ao duplicar compromisso para o próximo mês.", { variant: "error" });
    } finally {
      setDuplicatingId(null);
    }
  };

  // Handlers: Pagamento / Baixa de Compromisso
  const handleOpenBaixaModal = (item: any) => {
    setPayCommitmentItem(item);
    setBaixaForma("SALDO_CONTA");
    if (contasBancarias.length > 0) {
      setBaixaContaId(contasBancarias[0].id);
    }
    setBaixaData(new Date().toISOString().split("T")[0]);
  };

  const handleConfirmBaixa = async () => {
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
      await loadData();
      showAlert("Conta liquidada com sucesso! Lançamento gerado no extrato.", { variant: "success" });
    } catch (err: any) {
      console.error(err);
      showAlert(err?.message || "Erro ao liquidar compromisso.", { variant: "error" });
    } finally {
      setPayingCommitment(false);
    }
  };

  // Handlers: Baixa em Lote
  const handleOpenBatchModal = () => {
    setBatchBaixaForma("SALDO_CONTA");
    if (contasBancarias.length > 0) {
      setBatchBaixaContaId(contasBancarias[0].id);
    }
    setBatchBaixaData(new Date().toISOString().split("T")[0]);
    setBatchModalOpen(true);
  };

  const handleConfirmBatchBaixa = async () => {
    if (selectedCommitmentIds.length === 0) return;
    if (["SALDO_CONTA", "DEBITO_AUTOMATICO", "PIX"].includes(batchBaixaForma) && !batchBaixaContaId) {
      showAlert("Selecione a conta corrente que será debitada.", { variant: "warning" });
      return;
    }
    setPayingBatch(true);
    try {
      await payBatchCommitmentsAction({
        commitmentIds: selectedCommitmentIds,
        formaPagamento: batchBaixaForma,
        contaBancariaId: batchBaixaContaId,
        cartaoCreditoId: batchBaixaCartaoId,
        dataBaixa: batchBaixaData,
      });
      setBatchModalOpen(false);
      setSelectedCommitmentIds([]);
      await loadData();
      showAlert(`${selectedCommitmentIds.length} contas liquidadas com sucesso!`, { variant: "success" });
    } catch (err: any) {
      console.error(err);
      showAlert(err?.message || "Erro ao liquidar contas em lote.", { variant: "error" });
    } finally {
      setPayingBatch(false);
    }
  };

  // Handler: Novo Boleto / Despesa a Pagar
  const handleSaveNewCommitment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommitmentDesc.trim() || !newCommitmentAmount || Number(newCommitmentAmount) <= 0 || !newCommitmentDueDate) {
      showAlert("Preencha todos os campos do compromisso.", { variant: "warning" });
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
      await loadData();
      showAlert("Boleto / Despesa agendada com sucesso!", { variant: "success" });
    } catch (err: any) {
      showAlert(err?.message || "Erro ao agendar compromisso.", { variant: "error" });
    } finally {
      setSavingCommitment(false);
    }
  };

  // Handler: Nova Movimentação Avulsa (Pix/Depósito)
  const handleSaveNewMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movWalletId || !movDesc.trim() || !movValor || Number(movValor) <= 0 || !movData) {
      showAlert("Preencha todos os campos da movimentação.", { variant: "warning" });
      return;
    }
    setSavingMovement(true);
    try {
      await createBankAccountMovementAction({
        walletId: movWalletId,
        type: movTipo,
        description: movDesc.trim(),
        amount: Number(movValor),
        dateStr: movData,
        movementType: movMetodo,
      });
      setNewMovementModalOpen(false);
      setMovDesc("");
      setMovValor("");
      await loadData();
      showAlert("Movimentação registrada com sucesso no extrato!", { variant: "success" });
    } catch (err: any) {
      showAlert(err?.message || "Erro ao registrar movimentação.", { variant: "error" });
    } finally {
      setSavingMovement(false);
    }
  };

  // Handler: Nova Conta Bancária
  const handleSaveNewAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accBankName.trim()) {
      showAlert("Informe o nome do banco ou instituição.", { variant: "warning" });
      return;
    }
    setSavingAccount(true);
    try {
      await createNewCard({
        bankName: accBankName.trim(),
        walletType: "CONTA_CORRENTE",
        alias: accBankName.trim(),
        holder: accHolder.trim() || undefined,
        limitOrBalance: Number(accInitialBalance) || 0,
        diaFechamento: 1,
        diaVencimento: 10,
        originType: "ROLLOVER",
        targetMonth: new Date().getMonth() + 1,
        targetYear: selectedYear,
      });
      setNewAccountModalOpen(false);
      setAccBankName("");
      setAccHolder("");
      setAccInitialBalance("");
      await loadData();
      showAlert("Conta bancária cadastrada com sucesso!", { variant: "success" });
    } catch (err: any) {
      showAlert(err?.message || "Erro ao cadastrar conta bancária.", { variant: "error" });
    } finally {
      setSavingAccount(false);
    }
  };

  // Handler: Editar Compromisso
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    setEditingCommitment(true);
    try {
      await updateCommitmentAction({
        id: editItem.id,
        description: editDesc.trim(),
        amount: Number(editAmount),
        dueDate: editDueDate,
        tipo: editTipo,
        recorrencia: editRecorrencia,
        competenceMonth: editCompMonth,
        competenceYear: editCompYear,
      });
      setEditItem(null);
      await loadData();
      showAlert("Compromisso atualizado com sucesso!", { variant: "success" });
    } catch (err: any) {
      showAlert(err?.message || "Erro ao editar compromisso.", { variant: "error" });
    } finally {
      setEditingCommitment(false);
    }
  };

  // Handler: Excluir Compromisso
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setDeletingCommitment(true);
    try {
      await deleteCommitmentAction(itemToDelete.id);
      setItemToDelete(null);
      await loadData();
      showAlert("Compromisso excluído com sucesso!", { variant: "success" });
    } catch (err: any) {
      showAlert(err?.message || "Erro ao excluir compromisso.", { variant: "error" });
    } finally {
      setDeletingCommitment(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto flex flex-col gap-8 select-none relative font-sans text-slate-900 dark:text-slate-100">
      
      {/* ── Top Header & Controles Globais ─────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <Link
          href="/"
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 w-fit transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o Dashboard
        </Link>

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Gestão de Caixa & Contas
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Controle unificado de saldo bancário real, agenda de obrigações a pagar e extrato de liquidação de {selectedYear}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Seletor Anual */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-2xl shadow-xs">
              <button
                type="button"
                onClick={prevYear}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Ano Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-xs font-black text-indigo-600 dark:text-indigo-400 tracking-wider tabular-nums">
                ANO {selectedYear}
              </span>
              <button
                type="button"
                onClick={nextYear}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Próximo Ano"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {selectedYear !== new Date().getFullYear() && (
                <button
                  type="button"
                  onClick={goToCurrentYear}
                  className="px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  Ano Atual
                </button>
              )}
            </div>

            {/* Botões Rápidos */}
            <button
              onClick={() => setNewCommitmentModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider shadow-sm shadow-indigo-600/25 transition-all hover:scale-[1.01] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Novo Boleto / Despesa a Pagar
            </button>
            <button
              onClick={() => setNewMovementModalOpen(true)}
              className="flex items-center gap-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Movimentação Avulsa (Pix/Depósito)
            </button>
          </div>
        </div>
      </div>

      {/* ── 1. Visão Geral Superior: 3 Cards Consolidados ────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {/* Card 1: Saldo Real em Conta */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                Saldo Real em Conta
              </span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/50">
                <Wallet className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${totals.totalRealBalance >= 0 ? "text-slate-900 dark:text-white" : "text-rose-500"}`}>
              {brl(totals.totalRealBalance)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>Saldo líquido atualizado disponível</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">{accounts.length} contas ativas</span>
          </div>
        </div>

        {/* Card 2: Compromissos Pendentes (Ano) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-amber-200/70 dark:border-amber-900/50 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                Compromissos Pendentes (Ano)
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/50 dark:border-amber-800/50">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight tabular-nums">
              {brl(totals.totalPendentesAno)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>Boletos & contas com status pendente</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {totals.pendingCount} {totals.pendingCount === 1 ? "conta a pagar" : "contas a pagar"}
            </span>
          </div>
        </div>

        {/* Card 3: Saldo Projetado */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-emerald-200/70 dark:border-emerald-900/50 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                Saldo Projetado
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/50 dark:border-emerald-800/50">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${totals.saldoProjetado >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
              {brl(totals.saldoProjetado)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>Saldo Real − Compromissos Pendentes</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">Livre pós-obrigações</span>
          </div>
        </div>
      </section>

      {/* ── Mini-Cards de Contas Correntes Cadastradas ───────────────────── */}
      {accounts.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Minhas Contas Bancárias ({accounts.length})
            </span>
            <button
              onClick={() => setNewAccountModalOpen(true)}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              + Adicionar Conta
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                onClick={() => setExtratoAccountFilter(extratoAccountFilter === acc.id ? "ALL" : acc.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  extratoAccountFilter === acc.id
                    ? "bg-indigo-50/70 dark:bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/20"
                    : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {acc.bankName}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                    {acc.walletType === "CONTA_CORRENTE" ? "CC" : "Conta"}
                  </span>
                </div>
                <p className="mt-1.5 text-base font-black text-slate-900 dark:text-white tabular-nums">
                  {brl(acc.saldoAtual)}
                </p>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {extratoAccountFilter === acc.id ? "✓ Filtrando extrato" : "Clique p/ filtrar extrato"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Seletor de Visualização / Abas ──────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <button
            onClick={() => setActiveTab("TODOS")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "TODOS"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Visão Completa
          </button>
          <button
            onClick={() => setActiveTab("AGENDA")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "AGENDA"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400"
            }`}
          >
            <Clock className="w-3 h-3" />
            Agenda a Pagar ({totals.pendingCount})
          </button>
          <button
            onClick={() => setActiveTab("EXTRATO")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "EXTRATO"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            Extrato Realizado ({totals.realizedCount})
          </button>
        </div>
      </div>

      {/* ── SEÇÃO A: AGENDA DE CONTAS A PAGAR (Apenas itens PENDENTES) ───── */}
      {(activeTab === "TODOS" || activeTab === "AGENDA") && (
        <section className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-50/40 dark:bg-slate-950/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/50 dark:border-amber-800/50">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  Agenda de Contas a Pagar
                  <span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                    Apenas Pendentes ({filteredPendingCommitments.length})
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Boletos, assinaturas e despesas a quitar. Ao pagar, o débito entra automaticamente no extrato.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={agendaSearch}
                  onChange={(e) => setAgendaSearch(e.target.value)}
                  placeholder="Buscar conta pendente..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors"
                />
                {agendaSearch && (
                  <button
                    onClick={() => setAgendaSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabela de Pendentes */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider bg-slate-50/50 dark:bg-slate-950/40">
                  <th className="py-2.5 px-3 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={filteredPendingCommitments.length > 0 && filteredPendingCommitments.every((c) => selectedCommitmentIds.includes(c.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCommitmentIds(filteredPendingCommitments.map((c) => c.id));
                        } else {
                          setSelectedCommitmentIds([]);
                        }
                      }}
                      disabled={filteredPendingCommitments.length === 0}
                      className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-amber-600 focus:ring-amber-500 cursor-pointer disabled:opacity-40"
                    />
                  </th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Vencimento</th>
                  <th className="py-2.5 px-3">Descrição / Fornecedor</th>
                  <th className="py-2.5 px-2 whitespace-nowrap">Tipo</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Valor</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Ação Rápida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredPendingCommitments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500/80 dark:text-emerald-400/80" />
                        <p className="font-semibold text-xs text-slate-600 dark:text-slate-300">
                          Nenhum compromisso pendente no ano de {selectedYear}.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Todas as obrigações cadastradas já foram quitadas ou não há lançamentos futuros.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPendingCommitments.map((item) => {
                    const isSelected = selectedCommitmentIds.includes(item.id);
                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors group ${
                          isSelected
                            ? "bg-amber-50/60 dark:bg-amber-950/30"
                            : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center">
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
                            className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                              {item.dueDateFormatted}
                            </span>
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold border ${item.dueBadge?.color || "bg-amber-50 text-amber-700 border-amber-200"}`}>
                                {item.dueBadge?.label || "A Vencer"}
                              </span>
                              {(item.competenciaLabel || item.competenciaShort) && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70">
                                  Ref: {item.competenciaLabel || item.competenciaShort}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                              item.tipo === "ASSINATURA"
                                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            }`}>
                              {item.tipo === "ASSINATURA" ? <Zap className="w-3 h-3" /> : <Receipt className="w-3 h-3" />}
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[220px]">
                              {item.description}
                            </span>
                          </div>
                        </td>

                        <td className="py-2.5 px-2 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {item.tipoLabel || "Boleto"}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono tabular-nums font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                          {brl(item.amount)}
                        </td>

                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                            Pendente
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenBaixaModal(item)}
                              className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all cursor-pointer"
                              title="Pagar conta e lançar no extrato"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Pagar / Baixar</span>
                            </button>

                            {/* Menu 3 Pontos */}
                            <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => setActiveActionMenuId(activeActionMenuId === item.id ? null : item.id)}
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                              {activeActionMenuId === item.id && (
                                <div className="absolute right-0 z-30 mt-1 w-44 rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 py-1 text-left">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      setEditItem(item);
                                      setEditDesc(item.description);
                                      setEditAmount(String(item.amount));
                                      setEditDueDate(item.dueDate ? item.dueDate.split("T")[0] : "");
                                      setEditTipo(item.tipo || "BOLETO");
                                      setEditRecorrencia(item.recorrencia || "MENSAL");
                                      setEditCompMonth(item.competenceMonth || new Date().getMonth() + 1);
                                      setEditCompYear(item.competenceYear || selectedYear);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Editar</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={duplicatingId === item.id}
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      handleDuplicateToNextMonth(item);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                  >
                                    <RotateCw className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>Repetir no próximo mês</span>
                                  </button>
                                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      setItemToDelete(item);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Excluir</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── SEÇÃO B: EXTRATO DA CONTA (Movimentações Realizadas) ─────────── */}
      {(activeTab === "TODOS" || activeTab === "EXTRATO") && (
        <section className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-50/40 dark:bg-slate-950/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/50">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  Extrato da Conta (Movimentações Realizadas)
                  <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {filteredRealizedMovements.length} {filteredRealizedMovements.length === 1 ? "operação" : "operações"}
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Movimentações estritamente executadas (Pix, depósitos, débitos e boletos liquidados).
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Filtro por Conta */}
              <select
                value={extratoAccountFilter}
                onChange={(e) => setExtratoAccountFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-white font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">Todas as Contas</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.bankName}
                  </option>
                ))}
              </select>

              <div className="relative flex-1 md:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={extratoSearch}
                  onChange={(e) => setExtratoSearch(e.target.value)}
                  placeholder="Buscar no extrato..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                {extratoSearch && (
                  <button
                    onClick={() => setExtratoSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabela do Extrato */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider bg-slate-50/50 dark:bg-slate-950/40">
                  <th className="py-2.5 px-4 whitespace-nowrap">Data</th>
                  <th className="py-2.5 px-4">Descrição</th>
                  <th className="py-2.5 px-3">Conta / Banco</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Categoria / Método</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {displayedRealizedMovements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      Nenhuma movimentação realizada encontrada para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  displayedRealizedMovements.map((tx) => {
                    const isIncome = tx.type === "INCOME";
                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2.5 px-4 whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                          {tx.date ? tx.date.split("T")[0].split("-").reverse().join("/") : "-"}
                        </td>

                        <td className="py-2.5 px-4 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                              isIncome ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                            }`}>
                              {isIncome ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[260px]">
                              {tx.description}
                            </span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                          {tx.walletName}
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {tx.category}
                            </span>
                            <span className="text-[9px] font-bold uppercase text-slate-400">
                              {tx.paymentMethod}
                            </span>
                          </div>
                        </td>

                        <td className="py-2.5 px-4 text-right whitespace-nowrap font-mono tabular-nums font-black text-xs sm:text-sm">
                          <span className={isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                            {isIncome ? "+" : "-"}{brl(tx.amount)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Botão de Expansão (10 Últimas ou Todas) */}
          {filteredRealizedMovements.length > 10 && (
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-center">
              <button
                type="button"
                onClick={() => setShowAllMovements(!showAllMovements)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors cursor-pointer"
              >
                {showAllMovements ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Recolher para as 10 últimas movimentações</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Ver todas as {filteredRealizedMovements.length} movimentações realizadas</span>
                  </>
                )}
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── Barra Flutuante de Baixa em Lote ────────────────────────────── */}
      {selectedCommitmentIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 dark:bg-[#131B2E]/95 border border-indigo-500/30 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs">
              {selectedCommitmentIds.length} {selectedCommitmentIds.length === 1 ? "conta selecionada" : "contas selecionadas"}
            </span>
            <span className="text-emerald-400 font-black text-xs font-tnum tabular-nums">
              ({brl(selectedBatchTotal)})
            </span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <button
            onClick={handleOpenBatchModal}
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

      {/* ── Modal 1: + Novo Boleto / Despesa a Pagar ────────────────────── */}
      {newCommitmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50">
                  <Receipt className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Novo Boleto / Despesa a Pagar</h3>
              </div>
              <button
                onClick={() => setNewCommitmentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewCommitment} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Descrição *</label>
                <input
                  type="text"
                  placeholder="Ex: Aluguel, CPFL Energia, Internet"
                  value={newCommitmentDesc}
                  onChange={(e) => setNewCommitmentDesc(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Valor (R$) *</label>
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
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Vencimento *</label>
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
                {savingCommitment ? "Salvando..." : "Salvar e Agendar"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 2: + Movimentação Avulsa (Pix/Depósito) ───────────────── */}
      {newMovementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center border border-slate-200">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Movimentação Avulsa (Pix / Depósito)</h3>
              </div>
              <button
                onClick={() => setNewMovementModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewMovement} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMovTipo("SAIDA")}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    movTipo === "SAIDA" ? "bg-rose-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Saída / Débito / Pix Enviado
                </button>
                <button
                  type="button"
                  onClick={() => setMovTipo("ENTRADA")}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    movTipo === "ENTRADA" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Entrada / Pix Recebido
                </button>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Qual Conta? *</label>
                <select
                  value={movWalletId}
                  onChange={(e) => setMovWalletId(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm cursor-pointer"
                  required
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.bankName} (Saldo: R$ {a.saldoAtual.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Descrição *</label>
                <input
                  type="text"
                  placeholder="Ex: Pix Mercado, Transferência, Depósito Salário"
                  value={movDesc}
                  onChange={(e) => setMovDesc(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0,00"
                    value={movValor}
                    onChange={(e) => setMovValor(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Data da Operação *</label>
                  <input
                    type="date"
                    value={movData}
                    onChange={(e) => setMovData(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Método</label>
                <select
                  value={movMetodo}
                  onChange={(e) => setMovMetodo(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm cursor-pointer"
                >
                  <option value="PIX">Pix</option>
                  <option value="DEBITO">Cartão de Débito</option>
                  <option value="TED_DOC">TED / Transferência</option>
                  <option value="DINHEIRO">Depósito em Espécie</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={savingMovement}
                className="w-full py-2.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingMovement ? "Registrando..." : "Registrar no Extrato"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 3: Confirmar Pagamento / Baixa ────────────────────────── */}
      {payCommitmentItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirmar Pagamento</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Conta: <b>{payCommitmentItem.description}</b> ({brl(payCommitmentItem.amount)})
                </p>
              </div>
              <button
                onClick={() => setPayCommitmentItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
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

              {["SALDO_CONTA", "DEBITO_AUTOMATICO", "PIX"].includes(baixaForma) && (
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">Qual Conta Corrente Debitar?</label>
                  <select
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm cursor-pointer"
                    value={baixaContaId}
                    onChange={(e) => setBaixaContaId(e.target.value)}
                  >
                    {contasBancarias.map((conta) => (
                      <option key={conta.id} value={conta.id}>
                        {conta.banco} - Saldo: R$ {conta.saldoAtual.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {baixaForma === "CARTAO_CREDITO" && (
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">Qual Cartão de Crédito?</label>
                  <select
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm cursor-pointer"
                    value={baixaCartaoId}
                    onChange={(e) => setBaixaCartaoId(e.target.value)}
                  >
                    {cartoesCredito.map((cartao) => (
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
                className="w-1/2 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmBaixa}
                disabled={payingCommitment}
                className="w-1/2 py-2 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {payingCommitment ? "Processando..." : "Confirmar Baixa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 4: Baixa em Lote ──────────────────────────────────────── */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/50">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Pagar Contas em Lote</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {selectedCommitmentIds.length} contas selecionadas • Total: <strong className="text-emerald-600 font-bold">{brl(selectedBatchTotal)}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBatchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">Qual Conta Corrente Debitar?</label>
                <select
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm cursor-pointer"
                  value={batchBaixaContaId}
                  onChange={(e) => setBatchBaixaContaId(e.target.value)}
                >
                  {contasBancarias.map((conta: any) => (
                    <option key={conta.id} value={conta.id}>
                      {conta.banco} - Saldo: R$ {conta.saldoAtual.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

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
                onClick={() => setBatchModalOpen(false)}
                disabled={payingBatch}
                className="w-1/2 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmBatchBaixa}
                disabled={payingBatch}
                className="w-1/2 py-2 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {payingBatch ? "Processando..." : "Confirmar Baixa em Lote"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 5: Nova Conta Bancária ────────────────────────────────── */}
      {newAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Nova Conta Bancária</h3>
              </div>
              <button
                onClick={() => setNewAccountModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewAccount} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Nome do Banco / Conta *</label>
                <input
                  type="text"
                  placeholder="Ex: Santander, Nubank, Itaú Personalité"
                  value={accBankName}
                  onChange={(e) => setAccBankName(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Titular (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Túlio Cavalcanti"
                  value={accHolder}
                  onChange={(e) => setAccHolder(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Saldo Atual Inicial (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={accInitialBalance}
                  onChange={(e) => setAccInitialBalance(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={savingAccount}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingAccount ? "Cadastrando..." : "Cadastrar Conta"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 6: Editar Compromisso ─────────────────────────────────── */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Editar Compromisso</h3>
              <button onClick={() => setEditItem(null)} className="text-slate-400 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Descrição</label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Vencimento</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="w-1/2 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editingCommitment}
                  className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {editingCommitment ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 7: Excluir Compromisso ────────────────────────────────── */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Excluir Compromisso</h3>
                <p className="text-xs text-slate-500">Esta ação não poderá ser desfeita.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Tem certeza que deseja excluir <strong>{itemToDelete.description}</strong> ({brl(itemToDelete.amount)})?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingCommitment}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {deletingCommitment ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
