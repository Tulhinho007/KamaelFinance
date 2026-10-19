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
  ChevronRight,
  ChevronLeft,
  X,
  Search,
  Check,
  Pencil,
  Trash2,
  MoreVertical,
  RotateCcw,
  RotateCw,
  CreditCard,
  Wifi,
  Activity,
  Calendar,
} from "lucide-react";
import { usePeriod } from "@/components/period-context";
import { useModal } from "@/components/ui/custom-dialog-provider";
import {
  getGestaoCaixaPageDataAction,
  createNewCard,
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

const formatBRL = brl;

const MONTH_NAMES_LIST = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const CATEGORIAS_COMUNS = [
  "Moradia & Aluguel",
  "Energia Elétrica",
  "Água & Saneamento",
  "Internet & TV",
  "Telefonia / Celular",
  "Assinatura / Streaming",
  "Lazer & Esporte (Futevôlei, etc.)",
  "Educação & Cursos",
  "Saúde & Plano",
  "Transporte & Combustível",
  "Alimentação & Mercado",
  "Parcela / Financiamento",
  "Fatura de Cartão",
  "Outros Fixos",
];

// Helper para ícones visuais modernos por categoria ou nome
const getBillIcon = (title: string, category?: string, tipo?: string) => {
  const text = `${title} ${category || ""} ${tipo || ""}`.toLowerCase();
  if (text.includes("fatura") || text.includes("cartão") || text.includes("cartao")) {
    return CreditCard;
  }
  if (text.includes("internet") || text.includes("wifi") || text.includes("fibra") || text.includes("banda")) {
    return Wifi;
  }
  if (text.includes("futebol") || text.includes("futevôlei") || text.includes("futevolei") || text.includes("esporte") || text.includes("academia")) {
    return Activity;
  }
  if (text.includes("aluguel") || text.includes("condomínio") || text.includes("condominio") || text.includes("moradia")) {
    return Building2;
  }
  if (text.includes("luz") || text.includes("energia") || text.includes("cpfl") || text.includes("enel") || text.includes("cemig")) {
    return Receipt;
  }
  return Calendar;
};

// Cores e Iniciais elegantes para os bancos cadastrados
const getBankStyle = (name: string = "") => {
  const lower = name.toLowerCase();
  if (lower.includes("nubank") || lower.includes("nu")) {
    return { iconBg: "bg-purple-600 text-white", initials: "NU" };
  }
  if (lower.includes("inter")) {
    return { iconBg: "bg-orange-500 text-white", initials: "INT" };
  }
  if (lower.includes("itau") || lower.includes("itaú")) {
    return { iconBg: "bg-amber-600 text-white", initials: "ITAU" };
  }
  if (lower.includes("bradesco")) {
    return { iconBg: "bg-red-600 text-white", initials: "BRA" };
  }
  if (lower.includes("santander")) {
    return { iconBg: "bg-red-700 text-white", initials: "SAN" };
  }
  if (lower.includes("caixa")) {
    return { iconBg: "bg-blue-600 text-white", initials: "CEF" };
  }
  if (lower.includes("brasil") || lower.includes("bb")) {
    return { iconBg: "bg-yellow-500 text-slate-950", initials: "BB" };
  }
  if (lower.includes("c6")) {
    return { iconBg: "bg-zinc-800 text-white", initials: "C6" };
  }
  if (lower.includes("btg")) {
    return { iconBg: "bg-slate-900 text-white", initials: "BTG" };
  }
  if (lower.includes("mercado") || lower.includes("mp")) {
    return { iconBg: "bg-sky-500 text-white", initials: "MP" };
  }
  if (lower.includes("picpay")) {
    return { iconBg: "bg-emerald-600 text-white", initials: "PIC" };
  }
  if (lower.includes("sicoob") || lower.includes("sicredi")) {
    return { iconBg: "bg-teal-700 text-white", initials: "SIC" };
  }

  const initials = (name || "CC")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 3)
    .join("")
    .toUpperCase();
  return { iconBg: "bg-indigo-600 text-white", initials: initials || "CON" };
};

export type AgendaPeriodFilter = "ALL" | "CURRENT_MONTH" | "NEXT_MONTH" | "CUSTOM";

export default function GestaoCaixaContasPage() {
  const { selectedYear, prevYear, nextYear } = usePeriod();
  const { showAlert } = useModal();

  const [loading, setLoading] = useState(true);

  // Dados consolidados
  const [accounts, setAccounts] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);
  const [cartoesCredito, setCartoesCredito] = useState<any[]>([]);
  const [totals, setTotals] = useState({
    totalRealBalance: 0,
    totalReceitasAno: 0,
    totalRealizedIncome: 0,
    totalPendingIncome: 0,
    receitasParaProjecao: 0,
    totalPendentesAno: 0,
    saldoProjetado: 0,
    pendingCount: 0,
    realizedCount: 0,
  });

  // Filtros de Agenda de Contas Fixas
  const [agendaPeriodFilter, setAgendaPeriodFilter] = useState<AgendaPeriodFilter>("CURRENT_MONTH");
  const [agendaSearch, setAgendaSearch] = useState("");
  const [selectedCommitmentIds, setSelectedCommitmentIds] = useState<string[]>([]);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Modais
  const [newCommitmentModalOpen, setNewCommitmentModalOpen] = useState(false);
  const [newAccountModalOpen, setNewAccountModalOpen] = useState(false);

  // Modal de Baixa / Pagamento (com seleção de conta bancária)
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

  // Form: Nova Conta Fixa / Boleto
  const [savingCommitment, setSavingCommitment] = useState(false);
  const [newCommitmentDesc, setNewCommitmentDesc] = useState("");
  const [newCommitmentAmount, setNewCommitmentAmount] = useState("");
  const [newCommitmentDueDate, setNewCommitmentDueDate] = useState("");
  const [newCommitmentCategory, setNewCommitmentCategory] = useState("Moradia & Aluguel");
  const [newCommitmentCustomCat, setNewCommitmentCustomCat] = useState("");
  const [newCommitmentWalletId, setNewCommitmentWalletId] = useState("");

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
  const [editCategory, setEditCategory] = useState("");
  const [editWalletId, setEditWalletId] = useState<string>("");

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
      const allList = (data.allCommitments && data.allCommitments.length > 0)
        ? data.allCommitments
        : (data.pendingCommitments || []);
      setBills(allList);
      setContasBancarias(data.contasBancarias || []);
      setCartoesCredito(data.cartoesCredito || []);
      setTotals(data.totals);

      const initialBankAccounts = (data.accounts?.length > 0 ? data.accounts : data.contasBancarias) || [];
      if (initialBankAccounts.length > 0) {
        setBaixaContaId((prev) => prev || initialBankAccounts[0].id);
        setBatchBaixaContaId((prev) => prev || initialBankAccounts[0].id);
        setNewCommitmentWalletId((prev) => prev || initialBankAccounts[0].id);
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

  // Helpers de data e competência
  const currentMonthNum = new Date().getMonth() + 1;
  const currentYearNum = new Date().getFullYear();

  const nextMonthDate = new Date(currentYearNum, currentMonthNum, 1);
  const nextMonthNum = nextMonthDate.getMonth() + 1;
  const nextYearNum = nextMonthDate.getFullYear();

  // Helper para extrair mês e ano do vencimento da conta
  const getItemDueDateParts = (item: any): { month: number; year: number } | null => {
    if (item.dueDateInput && typeof item.dueDateInput === "string") {
      const parts = item.dueDateInput.split("-");
      if (parts.length >= 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(y) && !isNaN(m)) return { year: y, month: m };
      }
    }
    if (item.dueDateFormatted && typeof item.dueDateFormatted === "string") {
      const parts = item.dueDateFormatted.split("/");
      if (parts.length === 3) {
        const m = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m)) return { year: y, month: m };
      }
    }
    if (item.dueDateRaw) {
      const d = new Date(item.dueDateRaw);
      if (!isNaN(d.getTime())) {
        return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
      }
    }
    if (item.competenceYear && item.competenceMonth) {
      return { year: Number(item.competenceYear), month: Number(item.competenceMonth) };
    }
    return null;
  };

  const matchesAgendaPeriod = (item: any): boolean => {
    if (agendaPeriodFilter === "ALL") return true;
    const due = getItemDueDateParts(item);
    if (!due) return false;
    if (agendaPeriodFilter === "CURRENT_MONTH") {
      return due.month === currentMonthNum && due.year === currentYearNum;
    }
    if (agendaPeriodFilter === "NEXT_MONTH") {
      return due.month === nextMonthNum && due.year === nextYearNum;
    }
    return true;
  };

  // Saldo Geral consolidado
  const totalSaldoGeral = useMemo(() => {
    if (accounts.length > 0) {
      return accounts.reduce((sum, a) => sum + Number(a.saldoAtual || 0), 0);
    }
    return totals.totalRealBalance || 0;
  }, [accounts, totals.totalRealBalance]);

  // Lista filtrada de contas fixas
  const filteredBills = useMemo(() => {
    const list = bills.filter((item) => {
      if (!matchesAgendaPeriod(item)) return false;
      if (!agendaSearch.trim()) return true;
      const q = agendaSearch.toLowerCase().trim();
      const matchDesc = (item.description || "").toLowerCase().includes(q);
      const matchType = (item.tipoLabel || "").toLowerCase().includes(q);
      const matchCat = (item.category || "").toLowerCase().includes(q);
      const matchRef = (item.competenciaLabel || item.competenciaShort || "").toLowerCase().includes(q);
      return matchDesc || matchType || matchCat || matchRef;
    });

    return list.slice().sort((a, b) => {
      const partsA = getItemDueDateParts(a);
      const partsB = getItemDueDateParts(b);
      if (partsA && partsB) {
        if (partsA.year !== partsB.year) return partsA.year - partsB.year;
        if (partsA.month !== partsB.month) return partsA.month - partsB.month;
      }
      const tA = a.dueDateRaw ? new Date(a.dueDateRaw).getTime() : 0;
      const tB = b.dueDateRaw ? new Date(b.dueDateRaw).getTime() : 0;
      return tA - tB;
    });
  }, [
    bills,
    agendaSearch,
    agendaPeriodFilter,
    currentMonthNum,
    currentYearNum,
    nextMonthNum,
    nextYearNum,
  ]);

  // Total das contas pendentes no filtro atual
  const pendingBillsTotal = useMemo(() => {
    return filteredBills
      .filter((b) => b.status === "PENDING" || b.status === "PENDENTE")
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  }, [filteredBills]);

  // Sobra prevista após contas pendentes
  const sobraPrevista = totalSaldoGeral - pendingBillsTotal;

  // Obter o nome do mês (ex: Julho, Agosto, Setembro) para exibição na tabela de contas
  const getBillMonthName = (item: any): string => {
    const parts = getItemDueDateParts(item);
    if (parts && parts.month >= 1 && parts.month <= 12) {
      return MONTH_NAMES_LIST[parts.month - 1];
    }
    if (item.competenceMonth && item.competenceMonth >= 1 && item.competenceMonth <= 12) {
      return MONTH_NAMES_LIST[item.competenceMonth - 1];
    }
    if (item.competenciaLabel) {
      const p = item.competenciaLabel.split("/")[0];
      if (p) return p.trim();
    }
    return "-";
  };

  // Toggle de status de pagamento: se pendente abre o modal para selecionar conta; se pago, desfaz
  const toggleBillStatus = async (billId: string) => {
    const target = bills.find((b) => b.id === billId);
    if (!target) return;

    const isCurrentlyPaid = target.status === "COMPLETED" || target.status === "PAID" || target.status === "PAGO";

    if (!isCurrentlyPaid) {
      // Quando estiver pendente, o clique no status abre o modal para o usuário selecionar a conta bancária
      handleOpenBaixaModal(target);
      return;
    }

    // Se já estiver pago, desmarca (desfaz a baixa) com atualização otimista imediata
    setBills((prev) =>
      prev.map((b) => (b.id === billId ? { ...b, status: "PENDING" } : b))
    );

    try {
      const res = await undoCommitmentPaymentAction(billId);
      if (res && (res as any).error) {
        throw new Error((res as any).error);
      }
      showAlert("Baixa desfeita com sucesso!", { variant: "info" });
      await loadData(false);
    } catch (err: any) {
      // Reverter se falhar
      setBills((prev) =>
        prev.map((b) => (b.id === billId ? { ...b, status: "COMPLETED" } : b))
      );
      showAlert(err?.message || "Erro ao alterar status da conta.", { variant: "error" });
    }
  };

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

  // Handlers: Pagamento / Baixa de Compromisso (Abre modal de seleção de conta)
  const handleOpenBaixaModal = (item: any) => {
    setPayCommitmentItem(item);
    setBaixaForma("SALDO_CONTA");
    const listContas = accounts.length > 0 ? accounts : contasBancarias;
    if (listContas.length > 0) {
      const defaultId = (item.walletId && listContas.some((c: any) => c.id === item.walletId))
        ? item.walletId
        : listContas[0].id;
      setBaixaContaId(defaultId);
    }
    setBaixaData(new Date().toISOString().split("T")[0]);
  };

  const handleConfirmBaixa = async () => {
    if (!payCommitmentItem) return;
    const isInvoice = Boolean(payCommitmentItem.isCardInvoice || payCommitmentItem.tipo === "FATURA_CARTAO");

    if (isInvoice) {
      if (!baixaContaId) {
        showAlert("Selecione a conta corrente que será debitada.", { variant: "warning" });
        return;
      }
    } else {
      if (["SALDO_CONTA", "DEBITO_AUTOMATICO", "PIX"].includes(baixaForma) && !baixaContaId) {
        showAlert("Selecione a conta corrente que será debitada.", { variant: "warning" });
        return;
      }
      if (baixaForma === "CARTAO_CREDITO" && !baixaCartaoId) {
        showAlert("Selecione o cartão de crédito para lançamento.", { variant: "warning" });
        return;
      }
    }

    setPayingCommitment(true);
    try {
      await payCommitmentAction({
        commitmentId: payCommitmentItem.id,
        formaPagamento: isInvoice ? "SALDO_CONTA" : baixaForma,
        contaBancariaId: baixaContaId,
        cartaoCreditoId: baixaCartaoId,
        dataBaixa: baixaData,
        faturaId: payCommitmentItem.faturaId,
      });
      setPayCommitmentItem(null);
      await loadData();
      showAlert(
        isInvoice
          ? "Fatura liquidada com sucesso! Limite restaurado e lançamento gerado no extrato."
          : "Conta liquidada com sucesso! Lançamento gerado no extrato.",
        { variant: "success" }
      );
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
    const listContas = accounts.length > 0 ? accounts : contasBancarias;
    if (listContas.length > 0) {
      setBatchBaixaContaId((prev) => prev || listContas[0].id);
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
    const count = selectedCommitmentIds.length;
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
      showAlert(`${count} ${count === 1 ? "conta liquidada" : "contas liquidadas"} com sucesso!`, { variant: "success" });
    } catch (err: any) {
      console.error(err);
      showAlert(err?.message || "Erro ao liquidar contas em lote.", { variant: "error" });
    } finally {
      setPayingBatch(false);
    }
  };

  // Handler: Novo Boleto / Conta Fixa
  const handleSaveNewCommitment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommitmentDesc.trim() || !newCommitmentAmount || Number(newCommitmentAmount) <= 0 || !newCommitmentDueDate) {
      showAlert("Preencha todos os campos obrigatórios.", { variant: "warning" });
      return;
    }
    setSavingCommitment(true);
    try {
      const finalCategory = (newCommitmentCategory === "OUTRO" ? newCommitmentCustomCat : newCommitmentCategory) || "Conta Fixa";
      await createCommitmentAction({
        description: newCommitmentDesc.trim(),
        amount: Number(newCommitmentAmount),
        dueDate: newCommitmentDueDate,
        categoryName: finalCategory.trim(),
        walletId: newCommitmentWalletId || (accounts[0]?.id ?? contasBancarias[0]?.id),
        tipo: "BOLETO",
        recorrencia: "MENSAL",
      });
      setNewCommitmentModalOpen(false);
      setNewCommitmentDesc("");
      setNewCommitmentAmount("");
      setNewCommitmentDueDate("");
      setNewCommitmentCategory("Moradia & Aluguel");
      setNewCommitmentCustomCat("");
      await loadData();
      showAlert("Conta fixa agendada com sucesso!", { variant: "success" });
    } catch (err: any) {
      showAlert(err?.message || "Erro ao agendar conta fixa.", { variant: "error" });
    } finally {
      setSavingCommitment(false);
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
        tipo: editItem.tipo || "BOLETO",
        recorrencia: editItem.recorrencia || "MENSAL",
        walletId: editWalletId || undefined,
      });
      setEditItem(null);
      await loadData();
      showAlert("Conta fixa atualizada com sucesso!", { variant: "success" });
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
      showAlert("Conta fixa excluída com sucesso!", { variant: "success" });
    } catch (err: any) {
      showAlert(err?.message || "Erro ao excluir conta fixa.", { variant: "error" });
    } finally {
      setDeletingCommitment(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 min-h-screen text-slate-800 dark:text-slate-100 font-sans">
      {/* NAVEGAÇÃO & CONTROLES COMPACTOS NO TOPO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <Link
          href="/"
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para o Dashboard</span>
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor Anual Compacto */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-2 py-1 rounded-xl shadow-xs">
            <button
              type="button"
              onClick={prevYear}
              className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Ano Anterior"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-1 text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wider tabular-nums">
              {selectedYear}
            </span>
            <button
              type="button"
              onClick={nextYear}
              className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Próximo Ano"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* CABEÇALHO COM CARDS DE TOPO: SALDO GERAL DISPONÍVEL & SOBRA PREVISTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <span className="text-xs font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
            Saldo Geral Disponível
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatBRL(totalSaldoGeral)}
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Sobra prevista após contas pendentes:{" "}
            <span className={`font-semibold ${sobraPrevista >= 0 ? "text-slate-700 dark:text-slate-300" : "text-rose-600 dark:text-rose-400"}`}>
              {formatBRL(sobraPrevista)}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setNewAccountModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            <Plus size={16} />
            <span>+ Nova Conta</span>
          </button>
          <button
            onClick={() => setNewCommitmentModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            <Plus size={16} />
            <span>+ Nova Conta Fixa / Boleto</span>
          </button>
        </div>
      </div>

      {/* BLOCO ESTILO APP: LISTA DE CONTAS CORRENTES */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
              Contas Correntes
            </h2>
          </div>
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
            {formatBRL(totalSaldoGeral)}
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {accounts.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              <p>Nenhuma conta bancária cadastrada.</p>
              <button
                type="button"
                onClick={() => setNewAccountModalOpen(true)}
                className="mt-2 text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
              >
                + Adicionar primeira conta
              </button>
            </div>
          ) : (
            accounts.map((acc) => {
              const bankStyle = getBankStyle(acc.bankName || acc.title);

              return (
                <div
                  key={acc.id}
                  className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${bankStyle.iconBg} shadow-sm shrink-0`}>
                      {bankStyle.initials}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white text-sm">
                        {acc.bankName || acc.title}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        {acc.holder ? `Titular: ${acc.holder}` : "Conta Corrente"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${Number(acc.saldoAtual || 0) >= 0 ? "text-slate-900 dark:text-white" : "text-rose-600 dark:text-rose-400"}`}>
                      {formatBRL(Number(acc.saldoAtual || 0))}
                    </span>
                    <ChevronRight size={16} className="text-slate-300 dark:text-slate-600" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* BLOCO: TABELA DE CONTAS FIXAS & BOLETOS DO MÊS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Topo do Card de Contas */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/50 dark:border-amber-800/50 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Contas Fixas & Boletos
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Despesas recorrentes e compromissos do mês
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 px-3 py-1 rounded-lg">
              A Pagar: <strong className="font-semibold">{formatBRL(pendingBillsTotal)}</strong>
            </div>
          </div>
        </div>

        {/* Barra de Filtros e Busca de Contas */}
        <div className="px-5 py-3 border-b border-slate-100/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 flex flex-wrap items-center justify-between gap-2.5">
          {/* Pílulas de Período */}
          <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setAgendaPeriodFilter("CURRENT_MONTH")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                agendaPeriodFilter === "CURRENT_MONTH"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Mês Atual
            </button>
            <button
              type="button"
              onClick={() => setAgendaPeriodFilter("NEXT_MONTH")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                agendaPeriodFilter === "NEXT_MONTH"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Próximo Mês
            </button>
            <button
              type="button"
              onClick={() => setAgendaPeriodFilter("ALL")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                agendaPeriodFilter === "ALL"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Todas ({selectedYear})
            </button>
          </div>

          {/* Busca Rápida */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={agendaSearch}
              onChange={(e) => setAgendaSearch(e.target.value)}
              placeholder="Buscar conta fixa..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-7 py-1 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {agendaSearch && (
              <button
                type="button"
                onClick={() => setAgendaSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Tabela de Contas Fixas */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50/70 dark:bg-slate-950/40 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3 w-12 text-center">Status</th>
                <th className="px-4 py-3">Mês</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 w-16 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500/80" />
                      <p className="font-semibold text-xs text-slate-600 dark:text-slate-300">
                        Nenhuma conta encontrada para o filtro selecionado.
                      </p>
                      <button
                        type="button"
                        onClick={() => setNewCommitmentModalOpen(true)}
                        className="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        + Cadastrar uma conta fixa
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => {
                  const IconComponent = getBillIcon(bill.description, bill.category, bill.tipo);
                  const isPaid = bill.status === "COMPLETED" || bill.status === "PAID" || bill.status === "PAGO";

                  return (
                    <tr key={bill.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group">
                      <td className="px-5 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => toggleBillStatus(bill.id)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                            isPaid 
                              ? "bg-emerald-500 text-white shadow-sm hover:bg-emerald-600" 
                              : "border-2 border-slate-300 dark:border-slate-600 hover:border-slate-400 bg-white dark:bg-slate-800"
                          }`}
                          title={isPaid ? "Clique para desmarcar (desfazer baixa)" : "Clique para selecionar conta e liquidar"}
                        >
                          {isPaid && <Check size={14} strokeWidth={3} />}
                        </button>
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 text-xs font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
                          <span>{getBillMonthName(bill)}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                            <IconComponent size={15} />
                          </div>
                          <span className={`font-medium ${isPaid ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-100"}`}>
                            {bill.description}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {bill.category || bill.tipoLabel || "Conta Fixa"}
                      </td>

                      <td className="px-4 py-3.5 text-right font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {formatBRL(bill.amount)}
                      </td>

                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setActiveActionMenuId(activeActionMenuId === bill.id ? null : bill.id)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {activeActionMenuId === bill.id && (
                            <div className="absolute right-0 z-30 mt-1 w-48 rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 py-1 text-left">
                              {bill.isCardInvoice ? (
                                <>
                                  <Link
                                    href={`/cartoes/${bill.cardWalletId || bill.walletId}`}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center gap-2 cursor-pointer"
                                  >
                                    <CreditCard className="w-3.5 h-3.5" />
                                    <span>Ver Fatura no Cartão</span>
                                  </Link>
                                  {isPaid ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        toggleBillStatus(bill.id);
                                      }}
                                      className="w-full text-left px-3 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2 cursor-pointer"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                      <span>Desfazer pagamento</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        handleOpenBaixaModal(bill);
                                      }}
                                      className="w-full text-left px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2 cursor-pointer"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Liquidar fatura</span>
                                    </button>
                                  )}
                                </>
                              ) : (
                                <>
                                  {isPaid ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        toggleBillStatus(bill.id);
                                      }}
                                      className="w-full text-left px-3 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2 cursor-pointer"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                      <span>Desfazer pagamento</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        handleOpenBaixaModal(bill);
                                      }}
                                      className="w-full text-left px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2 cursor-pointer"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Liquidar conta</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      setEditItem(bill);
                                      setEditDesc(bill.description || "");
                                      setEditAmount(String(bill.amount || ""));
                                      const rawDue = bill.dueDateInput || (bill.dueDateRaw ? bill.dueDateRaw.split("T")[0] : (bill.dueDate ? bill.dueDate.split("T")[0] : ""));
                                      setEditDueDate(rawDue);
                                      setEditCategory(bill.category || "");
                                      setEditWalletId(bill.walletId || (accounts[0]?.id ?? contasBancarias[0]?.id ?? ""));
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Editar</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={duplicatingId === bill.id}
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      handleDuplicateToNextMonth(bill);
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
                                      setItemToDelete(bill);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Excluir</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
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

      {/* ── Modal 1: + Nova Conta Fixa / Boleto ────────────────────────────── */}
      {newCommitmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/50">
                  <Receipt className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Nova Conta Fixa / Boleto</h3>
              </div>
              <button
                onClick={() => setNewCommitmentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewCommitment} className="space-y-4">
              {/* 1. Descrição */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Descrição *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Luz, Internet, Futevôlei, Aluguel"
                  value={newCommitmentDesc}
                  onChange={(e) => setNewCommitmentDesc(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* 2. Valor & Vencimento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={newCommitmentAmount}
                    onChange={(e) => setNewCommitmentAmount(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    Vencimento *
                  </label>
                  <input
                    type="date"
                    value={newCommitmentDueDate}
                    onChange={(e) => setNewCommitmentDueDate(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* 3. Categoria */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Categoria *
                </label>
                <select
                  value={newCommitmentCategory}
                  onChange={(e) => setNewCommitmentCategory(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {CATEGORIAS_COMUNS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="OUTRO">Outra categoria (Digitar)...</option>
                </select>

                {newCommitmentCategory === "OUTRO" && (
                  <input
                    type="text"
                    placeholder="Digite o nome da categoria..."
                    value={newCommitmentCustomCat}
                    onChange={(e) => setNewCommitmentCustomCat(e.target.value)}
                    className="mt-2 w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    required
                  />
                )}
              </div>

              {/* 4. Banco Vinculado */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Banco Vinculado *
                </label>
                <select
                  value={newCommitmentWalletId}
                  onChange={(e) => setNewCommitmentWalletId(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {(accounts.length > 0 ? accounts : contasBancarias).map((acc: any) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bankName || acc.banco || acc.title} - Saldo: {brl(Number(acc.saldoAtual ?? 0))}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={savingCommitment}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {savingCommitment ? "Salvando..." : "Cadastrar Conta Fixa"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 2: Confirmar Pagamento / Baixa (Seleciona a Conta) ──────── */}
      {payCommitmentItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {payCommitmentItem.isCardInvoice ? "Liquidar Fatura de Cartão" : "Confirmar Pagamento"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {payCommitmentItem.isCardInvoice ? "Fatura: " : "Conta: "} <b>{payCommitmentItem.description}</b> ({brl(payCommitmentItem.amount)})
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
              {payCommitmentItem.isCardInvoice ? (
                <>
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 text-xs text-purple-700 dark:text-purple-300">
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Sincronização de Fatura</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-purple-600 dark:text-purple-400">
                      Ao liquidar, o limite do cartão é restabelecido e o saldo é debitado da conta bancária escolhida abaixo.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">
                      Qual Conta Bancária Usar para Pagar? *
                    </label>
                    <select
                      className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm cursor-pointer"
                      value={baixaContaId}
                      onChange={(e) => setBaixaContaId(e.target.value)}
                    >
                      {(accounts.length > 0 ? accounts : contasBancarias).map((conta: any) => (
                        <option key={conta.id} value={conta.id}>
                          {conta.bankName || conta.banco || conta.title} - Saldo: {brl(Number(conta.saldoAtual ?? 0))}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">
                      Data do Pagamento *
                    </label>
                    <input
                      type="date"
                      value={baixaData}
                      onChange={(e) => setBaixaData(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">
                      Qual Conta Usar para Pagar? *
                    </label>
                    <select
                      className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm cursor-pointer"
                      value={baixaContaId}
                      onChange={(e) => setBaixaContaId(e.target.value)}
                    >
                      {(accounts.length > 0 ? accounts : contasBancarias).map((conta: any) => (
                        <option key={conta.id} value={conta.id}>
                          {conta.bankName || conta.banco || conta.title} - Saldo: {brl(Number(conta.saldoAtual ?? 0))}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">
                      Forma de Pagamento
                    </label>
                    <select
                      className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm bg-white cursor-pointer"
                      value={baixaForma}
                      onChange={(e) => setBaixaForma(e.target.value as any)}
                    >
                      <option value="SALDO_CONTA">Saldo da Conta Corrente (Manual)</option>
                      <option value="DEBITO_AUTOMATICO">Débito Automático</option>
                      <option value="PIX">Pix</option>
                      <option value="DINHEIRO">Dinheiro em Espécie</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">
                      Data do Pagamento *
                    </label>
                    <input
                      type="date"
                      value={baixaData}
                      onChange={(e) => setBaixaData(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayCommitmentItem(null)}
                  disabled={payingCommitment}
                  className="w-1/2 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBaixa}
                  disabled={payingCommitment}
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {payingCommitment ? "Processando..." : "Confirmar Pagamento"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 3: Nova Conta Bancária ─────────────────────────────────── */}
      {newAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center border border-slate-200">
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
                  placeholder="Ex: Santander, Nubank, Itaú"
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
                className="w-full py-2.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingAccount ? "Cadastrando..." : "Cadastrar Conta"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 4: Editar Conta Fixa ────────────────────────────────────── */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Editar Conta Fixa</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Alterar descrição, valor, vencimento ou banco
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Descrição *
                </label>
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
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    Vencimento *
                  </label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Banco Vinculado
                </label>
                <select
                  value={editWalletId}
                  onChange={(e) => setEditWalletId(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {(accounts.length > 0 ? accounts : contasBancarias).map((conta: any) => (
                    <option key={conta.id} value={conta.id}>
                      {conta.bankName || conta.banco || conta.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="w-1/2 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editingCommitment}
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                >
                  {editingCommitment ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 5: Excluir Conta Fixa ──────────────────────────────────── */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Excluir Conta Fixa</h3>
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

      {/* ── Modal 6: Baixa em Lote ───────────────────────────────────────── */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Baixa em Lote</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Liquidar {selectedCommitmentIds.length} conta(s) selecionada(s)
                </p>
              </div>
              <button
                onClick={() => setBatchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Qual Conta Bancária Debitar? *
                </label>
                <select
                  value={batchBaixaContaId}
                  onChange={(e) => setBatchBaixaContaId(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm cursor-pointer"
                >
                  {(accounts.length > 0 ? accounts : contasBancarias).map((conta: any) => (
                    <option key={conta.id} value={conta.id}>
                      {conta.bankName || conta.banco || conta.title} - Saldo: {brl(Number(conta.saldoAtual ?? 0))}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Data da Baixa *
                </label>
                <input
                  type="date"
                  value={batchBaixaData}
                  onChange={(e) => setBatchBaixaData(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBatchModalOpen(false)}
                  disabled={payingBatch}
                  className="w-1/2 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBatchBaixa}
                  disabled={payingBatch}
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {payingBatch ? "Liquidando..." : "Confirmar Baixa"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
