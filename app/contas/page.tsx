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

const MONTH_TABS = [
  { num: 1, short: "Jan", full: "Janeiro" },
  { num: 2, short: "Fev", full: "Fevereiro" },
  { num: 3, short: "Mar", full: "Março" },
  { num: 4, short: "Abr", full: "Abril" },
  { num: 5, short: "Mai", full: "Maio" },
  { num: 6, short: "Jun", full: "Junho" },
  { num: 7, short: "Jul", full: "Julho" },
  { num: 8, short: "Ago", full: "Agosto" },
  { num: 9, short: "Set", full: "Setembro" },
  { num: 10, short: "Out", full: "Outubro" },
  { num: 11, short: "Nov", full: "Novembro" },
  { num: 12, short: "Dez", full: "Dezembro" },
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

// Mock padrão inicial para testes imediatos e exibição fluida
const DEFAULT_INITIAL_ACCOUNTS = [
  { id: "mock-acc-1", bankName: "Picpay", title: "Picpay", saldoAtual: 0.19, holder: "Túlio Cavalcanti" },
  { id: "mock-acc-2", bankName: "Santander", title: "Santander", saldoAtual: 2450.0, holder: "Túlio Cavalcanti" },
  { id: "mock-acc-3", bankName: "Nubank", title: "Nubank", saldoAtual: 890.5, holder: "Túlio Cavalcanti" },
];

const DEFAULT_INITIAL_BILLS = [
  {
    id: "mock-bill-1",
    description: "Treino Futevôlei",
    amount: 150.0,
    category: "Lazer & Esporte (Futevôlei, etc.)",
    tipoLabel: "Assinatura / Mensalidade",
    tipo: "ASSINATURA",
    startMonth: 10,
    dueDay: 10,
    competenceMonth: 10,
    competenceYear: 2026,
    status: "PENDING",
  },
  {
    id: "mock-bill-2",
    description: "Internet Tim",
    amount: 119.9,
    category: "Internet & TV",
    tipoLabel: "Boleto / Conta Fixa",
    tipo: "BOLETO",
    startMonth: 9,
    dueDay: 15,
    competenceMonth: 9,
    competenceYear: 2026,
    status: "PENDING",
  },
  {
    id: "mock-bill-3",
    description: "Fatura Santander",
    amount: 820.0,
    category: "Fatura de Cartão",
    tipoLabel: "Fatura de Cartão",
    tipo: "BOLETO",
    startMonth: 10,
    dueDay: 20,
    competenceMonth: 10,
    competenceYear: 2026,
    status: "PENDING",
  },
  {
    id: "mock-bill-4",
    description: "Aluguel & Condomínio",
    amount: 1600.0,
    category: "Moradia & Aluguel",
    tipoLabel: "Boleto / Conta Fixa",
    tipo: "BOLETO",
    startMonth: 1,
    dueDay: 5,
    competenceMonth: 1,
    competenceYear: 2026,
    status: "PENDING",
  },
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

export default function GestaoCaixaContasPage() {
  const { selectedYear, prevYear, nextYear } = usePeriod();
  const { showAlert } = useModal();

  const [loading, setLoading] = useState(true);

  // Mês selecionado no navegador fluido (1 a 12 ou "ALL")
  const currentMonthNum = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState<number | "ALL">(currentMonthNum);

  // Controle de status de pagamento independente por mês: chave `${billId}_${month}`
  const [paidByMonth, setPaidByMonth] = useState<Record<string, boolean>>({});

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

  // Filtros de Busca e Seleção
  const [agendaSearch, setAgendaSearch] = useState("");
  const [selectedCommitmentIds, setSelectedCommitmentIds] = useState<string[]>([]);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Modais
  const [newCommitmentModalOpen, setNewCommitmentModalOpen] = useState(false);
  const [newAccountModalOpen, setNewAccountModalOpen] = useState(false);

  // Modal de Baixa / Pagamento (com seleção de conta bancária)
  const [payCommitmentItem, setPayCommitmentItem] = useState<any | null>(null);
  const [payMonth, setPayMonth] = useState<number>(currentMonthNum);
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
  const [newCommitmentMonth, setNewCommitmentMonth] = useState<number>(currentMonthNum);
  const [newCommitmentDueDay, setNewCommitmentDueDay] = useState<string>("10");
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
      const loadedAccounts = (data.accounts?.length > 0 ? data.accounts : data.contasBancarias) || [];
      setAccounts(loadedAccounts.length > 0 ? loadedAccounts : DEFAULT_INITIAL_ACCOUNTS);

      const allList = (data.allCommitments && data.allCommitments.length > 0)
        ? data.allCommitments
        : (data.pendingCommitments || []);
      
      const finalList = allList.length > 0 ? allList : DEFAULT_INITIAL_BILLS;
      setBills(finalList);

      // Preenche paidByMonth com os itens que já vieram como pagos do banco
      const initialPaid: Record<string, boolean> = {};
      finalList.forEach((b: any) => {
        if (b.status === "COMPLETED" || b.status === "PAID" || b.status === "PAGO") {
          const m = b.competenceMonth || currentMonthNum;
          initialPaid[`${b.id}_${m}`] = true;
        }
      });
      setPaidByMonth((prev) => ({ ...initialPaid, ...prev }));

      setContasBancarias(data.contasBancarias || []);
      setCartoesCredito(data.cartoesCredito || []);
      setTotals(data.totals);

      const initialBankAccounts = loadedAccounts.length > 0 ? loadedAccounts : DEFAULT_INITIAL_ACCOUNTS;
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
      setAccounts((prev) => prev.length > 0 ? prev : DEFAULT_INITIAL_ACCOUNTS);
      setBills((prev) => prev.length > 0 ? prev : DEFAULT_INITIAL_BILLS);
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

  // Fechar menus de ação ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => setActiveActionMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

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

  // Helper central para determinar mês de início da recorrência e dia fixo
  const getBillStartMonthAndDay = (bill: any): { startMonth: number; dueDay: number; startYear: number } => {
    let startMonth = 1;
    let dueDay = 10;
    let startYear = selectedYear;

    if (bill.startMonth != null) {
      startMonth = Number(bill.startMonth);
    } else if (bill.competenceMonth != null) {
      startMonth = Number(bill.competenceMonth);
    } else {
      const parts = getItemDueDateParts(bill);
      if (parts) {
        startMonth = parts.month;
        startYear = parts.year;
      }
    }

    if (bill.dueDay != null) {
      dueDay = Number(bill.dueDay);
    } else if (bill.recurringDay != null) {
      dueDay = Number(bill.recurringDay);
    } else {
      if (bill.dueDateInput) {
        const p = bill.dueDateInput.split("-");
        if (p.length === 3) dueDay = parseInt(p[2], 10) || 10;
      } else if (bill.dueDateFormatted) {
        const p = bill.dueDateFormatted.split("/");
        if (p.length === 3) dueDay = parseInt(p[0], 10) || 10;
      }
    }

    if (isNaN(startMonth) || startMonth < 1 || startMonth > 12) startMonth = 1;
    if (isNaN(dueDay) || dueDay < 1 || dueDay > 31) dueDay = 10;

    return { startMonth, dueDay, startYear };
  };

  // Saldo Geral consolidado
  const totalSaldoGeral = useMemo(() => {
    if (accounts.length > 0) {
      return accounts.reduce((sum, a) => sum + Number(a.saldoAtual || 0), 0);
    }
    return totals.totalRealBalance || 0;
  }, [accounts, totals.totalRealBalance]);

  // Lista filtrada de contas fixas projetadas
  const filteredBills = useMemo(() => {
    return bills.filter((item) => {
      // Se for fatura de cartão específica e estiver num mês diferente, não exibe
      if (selectedMonth !== "ALL" && item.isCardInvoice && item.competenceMonth && item.competenceMonth !== selectedMonth) {
        return false;
      }

      if (!agendaSearch.trim()) return true;
      const q = agendaSearch.toLowerCase().trim();
      const matchDesc = (item.description || "").toLowerCase().includes(q);
      const matchType = (item.tipoLabel || "").toLowerCase().includes(q);
      const matchCat = (item.category || "").toLowerCase().includes(q);
      const matchRef = (item.competenciaLabel || item.competenciaShort || "").toLowerCase().includes(q);
      return matchDesc || matchType || matchCat || matchRef;
    }).slice().sort((a, b) => {
      const dayA = getBillStartMonthAndDay(a).dueDay;
      const dayB = getBillStartMonthAndDay(b).dueDay;
      return dayA - dayB;
    });
  }, [bills, selectedMonth, agendaSearch, selectedYear]);

  // Total das contas pendentes no mês selecionado (contas anteriores ao início NÃO somam)
  const pendingBillsTotal = useMemo(() => {
    return filteredBills
      .filter((b) => {
        const { startMonth } = getBillStartMonthAndDay(b);
        if (selectedMonth !== "ALL") {
          // Se o mês selecionado for ANTERIOR ao início: NÃO SOMA!
          if (selectedMonth < startMonth) return false;
          const isPaid = Boolean(
            paidByMonth[`${b.id}_${selectedMonth}`] ??
            (b.competenceMonth === selectedMonth && (b.status === "COMPLETED" || b.status === "PAID" || b.status === "PAGO"))
          );
          return !isPaid;
        } else {
          const m = b.competenceMonth || startMonth || currentMonthNum;
          const isPaid = Boolean(
            paidByMonth[`${b.id}_${m}`] ??
            (b.status === "COMPLETED" || b.status === "PAID" || b.status === "PAGO")
          );
          return !isPaid;
        }
      })
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  }, [filteredBills, selectedMonth, paidByMonth, currentMonthNum]);

  // Sobra prevista após contas pendentes
  const sobraPrevista = totalSaldoGeral - pendingBillsTotal;

  // Navegação de mês
  const handlePrevMonth = () => {
    if (selectedMonth === "ALL") {
      setSelectedMonth(currentMonthNum);
    } else if (selectedMonth > 1) {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === "ALL") {
      setSelectedMonth(currentMonthNum);
    } else if (selectedMonth < 12) {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Toggle de status de pagamento: independente por mês
  const toggleBillStatus = async (billId: string, month: number) => {
    const target = bills.find((b) => b.id === billId);
    if (!target) return;

    const currentStatusPaid = Boolean(
      paidByMonth[`${billId}_${month}`] ??
      (target.competenceMonth === month && (target.status === "COMPLETED" || target.status === "PAID" || target.status === "PAGO"))
    );

    if (!currentStatusPaid) {
      // Quando estiver pendente, o clique no status abre o modal para o usuário selecionar a conta bancária
      setPayMonth(month);
      handleOpenBaixaModal(target);
      return;
    }

    // Se já estiver pago, desmarca com atualização otimista imediata para aquele mês
    setPaidByMonth((prev) => ({
      ...prev,
      [`${billId}_${month}`]: false,
    }));

    if (!target.id.startsWith("mock-") && !target.id.startsWith("local-") && (target.competenceMonth === month || !target.competenceMonth)) {
      try {
        const res = await undoCommitmentPaymentAction(billId);
        if (res && (res as any).error) {
          throw new Error((res as any).error);
        }
        showAlert(`Baixa desfeita para ${MONTH_NAMES_LIST[month - 1]}!`, { variant: "info" });
        await loadData(false);
      } catch (err: any) {
        setPaidByMonth((prev) => ({
          ...prev,
          [`${billId}_${month}`]: true,
        }));
        showAlert(err?.message || "Erro ao alterar status da conta.", { variant: "error" });
      }
    } else {
      showAlert(`Status alterado para pendente em ${MONTH_NAMES_LIST[month - 1]}!`, { variant: "info" });
    }
  };

  // Handlers: Duplicar / Repetir no Mês Seguinte
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const handleDuplicateToNextMonth = async (item: any) => {
    setDuplicatingId(item.id);
    try {
      if (!item.id.startsWith("mock-") && !item.id.startsWith("local-")) {
        const res = await duplicateCommitmentToNextMonthAction(item.id);
        if (res.success) {
          showAlert(`Compromisso duplicado com sucesso para ${res.formattedTarget}!`, { variant: "success" });
          await loadData();
        }
      } else {
        showAlert("Compromisso replicado para o próximo mês com sucesso!", { variant: "success" });
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
    const listContas = accounts.length > 0 ? accounts : contasBancarias;
    if (listContas.length > 0) {
      setBaixaContaId((prev) => prev || listContas[0].id);
    }
    setBaixaData(new Date().toISOString().split("T")[0]);
  };

  const handleConfirmBaixa = async () => {
    if (!payCommitmentItem) return;

    // Atualização otimista independente no mês da baixa
    setPaidByMonth((prev) => ({
      ...prev,
      [`${payCommitmentItem.id}_${payMonth}`]: true,
    }));

    if (!payCommitmentItem.id.startsWith("mock-") && !payCommitmentItem.id.startsWith("local-")) {
      setPayingCommitment(true);
      try {
        if (payCommitmentItem.isCardInvoice) {
          if (!baixaContaId) {
            showAlert("Selecione a conta que será utilizada para debitar o pagamento da fatura.", { variant: "warning" });
            return;
          }
          await payCommitmentAction({
            commitmentId: payCommitmentItem.id,
            formaPagamento: "SALDO_CONTA",
            contaBancariaId: baixaContaId,
            dataBaixa: baixaData,
          });
        } else {
          await payCommitmentAction({
            commitmentId: payCommitmentItem.id,
            formaPagamento: baixaForma,
            contaBancariaId: baixaContaId,
            cartaoCreditoId: baixaCartaoId,
            dataBaixa: baixaData,
          });
        }
        setPayCommitmentItem(null);
        await loadData(false);
        showAlert(`Conta liquidada com sucesso para ${MONTH_NAMES_LIST[payMonth - 1]}!`, { variant: "success" });
      } catch (err: any) {
        console.error(err);
        setPaidByMonth((prev) => ({
          ...prev,
          [`${payCommitmentItem.id}_${payMonth}`]: false,
        }));
        showAlert(err?.message || "Erro ao liquidar compromisso.", { variant: "error" });
      } finally {
        setPayingCommitment(false);
      }
    } else {
      setPayCommitmentItem(null);
      showAlert(`Conta liquidada com sucesso para ${MONTH_NAMES_LIST[payMonth - 1]}!`, { variant: "success" });
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

  // Handler: Novo Boleto / Conta Fixa (NENHUM CAMPO OBRIGATÓRIO PARA SALVAR)
  const handleSaveNewCommitment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCommitment(true);
    try {
      const finalDesc = newCommitmentDesc.trim() || "Conta Fixa";
      const finalAmount = Number(newCommitmentAmount) || 0;
      const chosenMonth = Number(newCommitmentMonth) || (selectedMonth === "ALL" ? currentMonthNum : selectedMonth);
      const chosenDay = parseInt(newCommitmentDueDay, 10) || 10;
      const finalDueDate = `${selectedYear}-${String(chosenMonth).padStart(2, "0")}-${String(chosenDay).padStart(2, "0")}`;
      const finalCategory = (newCommitmentCategory === "OUTRO" ? newCommitmentCustomCat : newCommitmentCategory)?.trim() || "Moradia & Aluguel";
      const availableWallets = accounts.length > 0 ? accounts : contasBancarias;
      const chosenWalletId = newCommitmentWalletId || (availableWallets[0]?.id ?? undefined);

      await createCommitmentAction({
        description: finalDesc,
        amount: finalAmount,
        dueDate: finalDueDate,
        categoryName: finalCategory,
        walletId: chosenWalletId,
        tipo: "BOLETO",
        recorrencia: "MENSAL",
        competenceMonth: chosenMonth,
        competenceYear: selectedYear,
      });

      // Adiciona localmente para feedback instantâneo
      const newLocalItem = {
        id: `local-${Date.now()}`,
        description: finalDesc,
        amount: finalAmount,
        category: finalCategory,
        tipoLabel: "Boleto / Conta Fixa",
        tipo: "BOLETO",
        recorrencia: "MENSAL",
        startMonth: chosenMonth,
        dueDay: chosenDay,
        competenceMonth: chosenMonth,
        competenceYear: selectedYear,
        status: "PENDING",
      };
      setBills((prev) => [newLocalItem, ...prev]);

      setNewCommitmentModalOpen(false);
      setNewCommitmentDesc("");
      setNewCommitmentAmount("");
      setNewCommitmentMonth(selectedMonth === "ALL" ? currentMonthNum : selectedMonth);
      setNewCommitmentDueDay("10");
      setNewCommitmentCategory("Moradia & Aluguel");
      setNewCommitmentCustomCat("");

      await loadData(false);
      showAlert("Conta fixa cadastrada com sucesso!", { variant: "success" });
    } catch (err: any) {
      showAlert(err?.message || "Erro ao cadastrar conta fixa.", { variant: "error" });
    } finally {
      setSavingCommitment(false);
    }
  };

  // Handler: Nova Conta Bancária (NENHUM CAMPO OBRIGATÓRIO)
  const handleSaveNewAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAccount(true);
    try {
      const bankName = accBankName.trim() || "Conta Bancária";
      const initialBal = Number(accInitialBalance) || 0;
      await createNewCard({
        bankName,
        walletType: "CONTA_CORRENTE",
        alias: bankName,
        holder: accHolder.trim() || undefined,
        limitOrBalance: initialBal,
        diaFechamento: 1,
        diaVencimento: 10,
        originType: "ROLLOVER",
        targetMonth: new Date().getMonth() + 1,
        targetYear: selectedYear,
      });

      const newLocalAcc = {
        id: `local-acc-${Date.now()}`,
        bankName,
        title: bankName,
        holder: accHolder.trim() || undefined,
        saldoAtual: initialBal,
      };
      setAccounts((prev) => [...prev, newLocalAcc]);

      setNewAccountModalOpen(false);
      setAccBankName("");
      setAccHolder("");
      setAccInitialBalance("");
      await loadData(false);
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
      const finalDesc = editDesc.trim() || "Conta Fixa";
      const finalAmount = Number(editAmount) || 0;
      const finalDueDate = editDueDate || `${selectedYear}-${String(currentMonthNum).padStart(2, "0")}-10`;

      if (!editItem.id.startsWith("mock-") && !editItem.id.startsWith("local-")) {
        await updateCommitmentAction({
          id: editItem.id,
          description: finalDesc,
          amount: finalAmount,
          dueDate: finalDueDate,
          tipo: editItem.tipo || "BOLETO",
          recorrencia: editItem.recorrencia || "MENSAL",
          walletId: editWalletId || undefined,
        });
      }

      setBills((prev) =>
        prev.map((b) =>
          b.id === editItem.id
            ? { ...b, description: finalDesc, amount: finalAmount, dueDateInput: finalDueDate }
            : b
        )
      );

      setEditItem(null);
      await loadData(false);
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
      if (!itemToDelete.id.startsWith("mock-") && !itemToDelete.id.startsWith("local-")) {
        await deleteCommitmentAction(itemToDelete.id);
      }
      setBills((prev) => prev.filter((b) => b.id !== itemToDelete.id));
      setItemToDelete(null);
      await loadData(false);
      showAlert("Conta fixa excluída com sucesso!", { variant: "success" });
    } catch (err: any) {
      showAlert(err?.message || "Erro ao excluir conta fixa.", { variant: "error" });
    } finally {
      setDeletingCommitment(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 min-h-screen text-slate-800 dark:text-slate-100 font-sans">
      {/* ── 1. TOPO DA PÁGINA: NAVEGAÇÃO & CARDS ───────────────────────────── */}
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

      {/* CARD: SALDO GERAL DISPONÍVEL & SOBRA PREVISTA */}
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
            onClick={() => {
              setNewCommitmentMonth(selectedMonth === "ALL" ? currentMonthNum : selectedMonth);
              setNewCommitmentModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            <Plus size={16} />
            <span>+ Nova Conta Fixa</span>
          </button>
        </div>
      </div>

      {/* ── 2. LISTA DE CONTAS CORRENTES (BANCOS) ─────────────────────────── */}
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
                    <span className={`font-bold text-sm ${Number(acc.saldoAtual || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
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

      {/* ── 3 & 4. TABELA DE CONTAS FIXAS RECORRENTES & SELETOR DE MESES ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Topo da Seção de Contas Fixas */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/50 dark:border-amber-800/50 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Contas Fixas Recorrentes
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Projeção automática e controle mensal independente
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 px-3 py-1.5 rounded-lg shadow-xs">
              A Pagar: <strong className="font-bold">{formatBRL(pendingBillsTotal)}</strong>
            </div>
          </div>
        </div>

        {/* ── 3. SELETOR DE MESES FLUIDO COM PILLS E NAVEGADOR ───────────── */}
        <div className="px-5 py-3 border-b border-slate-100/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 space-y-2.5">
          {/* Navegador com setas e nome do mês */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                disabled={selectedMonth === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer text-slate-600 dark:text-slate-300 transition-colors"
                title="Mês anterior"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="text-sm font-bold text-slate-800 dark:text-white min-w-[140px] text-center tracking-wide">
                {selectedMonth === "ALL" ? `Ano Todo (${selectedYear})` : `${MONTH_NAMES_LIST[selectedMonth - 1]} / ${selectedYear}`}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                disabled={selectedMonth === 12}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer text-slate-600 dark:text-slate-300 transition-colors"
                title="Próximo mês"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {selectedMonth !== currentMonthNum && (
                <button
                  type="button"
                  onClick={() => setSelectedMonth(currentMonthNum)}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Ir para Mês Atual ({MONTH_NAMES_LIST[currentMonthNum - 1]})
                </button>
              )}

              {/* Busca Rápida */}
              <div className="relative w-44 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={agendaSearch}
                  onChange={(e) => setAgendaSearch(e.target.value)}
                  placeholder="Buscar conta..."
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
          </div>

          {/* Abas / Pills dos 12 meses do ano */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {MONTH_TABS.map((m) => {
              const isSelected = selectedMonth === m.num;
              const isCurrent = m.num === currentMonthNum;
              return (
                <button
                  key={m.num}
                  type="button"
                  onClick={() => setSelectedMonth(m.num)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? "bg-emerald-600 text-white shadow-xs font-bold"
                      : isCurrent
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span>{m.short}</span>
                  {isCurrent && (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-emerald-200/60 dark:bg-emerald-800/60 text-emerald-800 dark:text-emerald-200"
                      }`}
                    >
                      Atual
                    </span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setSelectedMonth("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedMonth === "ALL"
                  ? "bg-emerald-600 text-white shadow-xs font-bold"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Ano Todo
            </button>
          </div>
        </div>

        {/* ── 4. TABELA DE CONTAS FIXAS RECORRENTES ────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50/70 dark:bg-slate-950/40 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3 w-12 text-center">Status</th>
                <th className="px-4 py-3">Vencimento</th>
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
                        onClick={() => {
                          setNewCommitmentMonth(selectedMonth === "ALL" ? currentMonthNum : selectedMonth);
                          setNewCommitmentModalOpen(true);
                        }}
                        className="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        + Cadastrar uma conta fixa
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => {
                  const { startMonth, dueDay } = getBillStartMonthAndDay(bill);
                  const activeMonth = selectedMonth === "ALL" ? (bill.competenceMonth || startMonth || currentMonthNum) : selectedMonth;
                  const isPriorToStart = selectedMonth !== "ALL" && selectedMonth < startMonth;

                  const isPaid = !isPriorToStart && Boolean(
                    paidByMonth[`${bill.id}_${activeMonth}`] ??
                    (bill.competenceMonth === activeMonth && (bill.status === "COMPLETED" || bill.status === "PAID" || bill.status === "PAGO"))
                  );

                  const IconComponent = getBillIcon(bill.description, bill.category, bill.tipo);

                  return (
                    <tr
                      key={`${bill.id}_${activeMonth}`}
                      className={`transition-colors group ${
                        isPriorToStart
                          ? "opacity-40 select-none bg-slate-50/30 dark:bg-slate-900/30"
                          : "hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      {/* 1. Status (Checkbox ou Indicador de Sem Recorrência) */}
                      <td className="px-5 py-3.5 text-center">
                        {isPriorToStart ? (
                          <div
                            title="Sem recorrência neste mês"
                            className="w-6 h-6 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 mx-auto flex items-center justify-center text-slate-300 dark:text-slate-600 text-xs select-none"
                          >
                            -
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleBillStatus(bill.id, activeMonth)}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                              isPaid
                                ? "bg-emerald-500 text-white shadow-xs hover:bg-emerald-600"
                                : "border-2 border-slate-300 dark:border-slate-600 hover:border-slate-400 bg-white dark:bg-slate-800"
                            }`}
                            title={isPaid ? "Clique para desmarcar (desfazer baixa)" : "Clique para selecionar conta e liquidar"}
                          >
                            {isPaid && <Check size={14} strokeWidth={3} />}
                          </button>
                        )}
                      </td>

                      {/* 2. Vencimento (Dia / Recorrência) */}
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 text-xs font-semibold whitespace-nowrap">
                        {isPriorToStart ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-200/60 dark:border-slate-700/60">
                            Sem recorrência neste mês
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
                            <span>
                              Dia {dueDay} ({MONTH_NAMES_LIST[activeMonth - 1]?.slice(0, 3)} / {selectedYear})
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 3. Descrição */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                            <IconComponent size={15} />
                          </div>
                          <span
                            className={`font-medium ${
                              isPriorToStart
                                ? "text-slate-400 dark:text-slate-500"
                                : isPaid
                                ? "line-through text-slate-400 dark:text-slate-500"
                                : "text-slate-800 dark:text-slate-100"
                            }`}
                          >
                            {bill.description}
                          </span>
                        </div>
                      </td>

                      {/* 4. Categoria */}
                      <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {bill.category || bill.tipoLabel || "Conta Fixa"}
                      </td>

                      {/* 5. Valor (R$) */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        {isPriorToStart ? (
                          <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                            Sem recorrência
                          </span>
                        ) : (
                          <span
                            className={`font-semibold ${
                              isPaid
                                ? "text-slate-400 dark:text-slate-500 line-through"
                                : "text-slate-800 dark:text-slate-100"
                            }`}
                          >
                            {formatBRL(bill.amount)}
                          </span>
                        )}
                      </td>

                      {/* 6. Ações */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {isPriorToStart ? (
                          <span className="text-slate-300 dark:text-slate-600 text-xs">-</span>
                        ) : (
                          <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setActiveActionMenuId(activeActionMenuId === bill.id ? null : bill.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Ações"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {activeActionMenuId === bill.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 py-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    toggleBillStatus(bill.id, activeMonth);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer"
                                >
                                  {isPaid ? <RotateCcw size={14} /> : <Check size={14} />}
                                  <span>{isPaid ? "Desmarcar Baixa" : "Liquidar Agora"}</span>
                                </button>

                                {!bill.isCardInvoice && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        handleDuplicateToNextMonth(bill);
                                      }}
                                      disabled={duplicatingId === bill.id}
                                      className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer disabled:opacity-50"
                                    >
                                      <RotateCw size={14} className={duplicatingId === bill.id ? "animate-spin" : ""} />
                                      <span>Repetir no Mês Seguinte</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        setEditItem(bill);
                                        setEditDesc(bill.description);
                                        setEditAmount(String(bill.amount));
                                        setEditDueDate(bill.dueDateInput || "");
                                        setEditCategory(bill.category || "");
                                        setEditWalletId(bill.walletId || "");
                                      }}
                                      className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer"
                                    >
                                      <Pencil size={14} />
                                      <span>Editar Conta</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        setItemToDelete(bill);
                                      }}
                                      className="w-full text-left px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 text-rose-600 dark:text-rose-400 cursor-pointer"
                                    >
                                      <Trash2 size={14} />
                                      <span>Excluir Conta</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. MODAL: + NOVA CONTA FIXA / BOLETO ──────────────────────────── */}
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
                  Descrição
                </label>
                <input
                  type="text"
                  placeholder="Ex: Treino Futevôlei, Internet Tim, Fatura do Cartão"
                  value={newCommitmentDesc}
                  onChange={(e) => setNewCommitmentDesc(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* 2. Valor & Mês */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={newCommitmentAmount}
                    onChange={(e) => setNewCommitmentAmount(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    Mês
                  </label>
                  <select
                    value={newCommitmentMonth}
                    onChange={(e) => setNewCommitmentMonth(Number(e.target.value))}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {MONTH_TABS.map((m) => (
                      <option key={m.num} value={m.num}>
                        {m.full} {m.num === currentMonthNum ? "(Atual)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Dia do Vencimento & Categoria */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    Dia do Vencimento
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="10"
                    value={newCommitmentDueDay}
                    onChange={(e) => setNewCommitmentDueDay(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    Categoria
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
                </div>
              </div>

              {newCommitmentCategory === "OUTRO" && (
                <div>
                  <input
                    type="text"
                    placeholder="Digite o nome da categoria..."
                    value={newCommitmentCustomCat}
                    onChange={(e) => setNewCommitmentCustomCat(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* 4. Banco Vinculado */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Banco Vinculado
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

      {/* ── 6. MODAL: CONFIRMAR PAGAMENTO / BAIXA (SELECIONA A CONTA) ─────── */}
      {payCommitmentItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {payCommitmentItem.isCardInvoice ? "Liquidar Fatura de Cartão" : "Confirmar Pagamento"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {payCommitmentItem.isCardInvoice ? "Fatura: " : "Conta: "} <b>{payCommitmentItem.description}</b> ({brl(payCommitmentItem.amount)}) - Mês: <b>{MONTH_NAMES_LIST[payMonth - 1]}</b>
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
                      Qual Conta Bancária Usar para Pagar?
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
                      Data da Liquidação
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
                      Qual Conta Bancária Usar para Pagar?
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
                      Data do Pagamento
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

      {/* ── 7. MODAL: NOVA CONTA BANCÁRIA ─────────────────────────────────── */}
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
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Nome do Banco / Conta
                </label>
                <input
                  type="text"
                  placeholder="Ex: Santander, Nubank, Itaú"
                  value={accBankName}
                  onChange={(e) => setAccBankName(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Titular (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Túlio Cavalcanti"
                  value={accHolder}
                  onChange={(e) => setAccHolder(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Saldo Atual Inicial (R$)
                </label>
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

      {/* ── 8. MODAL: EDITAR CONTA FIXA ───────────────────────────────────── */}
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
                  Descrição
                </label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    Vencimento
                  </label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
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

      {/* ── 9. MODAL: EXCLUIR CONTA FIXA ─────────────────────────────────── */}
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

      {/* ── 10. MODAL: BAIXA EM LOTE ──────────────────────────────────────── */}
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
                  Qual Conta Bancária Debitar?
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
                  Data da Baixa
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
