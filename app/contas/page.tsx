"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  Home,
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
  Zap,
  Smartphone,
  Trophy,
  FileText,
  Droplet,
  Car,
  ShoppingCart,
  Utensils,
  HeartPulse,
  GraduationCap,
  SlidersHorizontal,
  History,
  ArrowDownRight,
  ArrowUpRight,
  Equal,
  Minus,
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
  recordBankAccountMovementAction,
  setExactBankAccountBalanceAction,
} from "@/lib/actions";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatBRL = brl;

export interface BalanceAdjustmentRecord {
  id: string;
  date: string;
  type: "ENTRADA" | "SAIDA" | "AJUSTE";
  amount: number;
  diff: number;
  description: string;
  previousBalance: number;
  resultingBalance: number;
}

const getAccountSavedHistory = (accId: string): BalanceAdjustmentRecord[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`kamael_acc_history_${accId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveAccountHistory = (accId: string, history: BalanceAdjustmentRecord[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`kamael_acc_history_${accId}`, JSON.stringify(history.slice(0, 50)));
  } catch {}
};

export interface BankAccountItem {
  id: string;
  name: string;
  bankName: string;
  title: string;
  balance: number;
  saldoAtual: number;
  color: string;
  initials: string;
  holder?: string;
  history: BalanceAdjustmentRecord[];
}

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
const DEFAULT_INITIAL_ACCOUNTS: BankAccountItem[] = [
  {
    id: "mock-acc-1",
    name: "Picpay",
    bankName: "Picpay",
    title: "Picpay",
    balance: 0.19,
    saldoAtual: 0.19,
    holder: "Túlio Cavalcanti",
    color: "bg-emerald-600 text-white",
    initials: "PIC",
    history: [
      {
        id: "hist-pic-1",
        date: "19/10/2026, 11:20",
        type: "ENTRADA",
        amount: 50.0,
        diff: 50.0,
        description: "Pix recebido",
        previousBalance: 0.0,
        resultingBalance: 50.0,
      },
      {
        id: "hist-pic-2",
        date: "19/10/2026, 12:45",
        type: "SAIDA",
        amount: 49.81,
        diff: -49.81,
        description: "Transferência almoço",
        previousBalance: 50.0,
        resultingBalance: 0.19,
      },
    ],
  },
  {
    id: "mock-acc-2",
    name: "Santander",
    bankName: "Santander",
    title: "Santander",
    balance: 2450.0,
    saldoAtual: 2450.0,
    holder: "Túlio Cavalcanti",
    color: "bg-red-700 text-white",
    initials: "SAN",
    history: [
      {
        id: "hist-san-1",
        date: "18/10/2026, 09:30",
        type: "AJUSTE",
        amount: 2450.0,
        diff: 2450.0,
        description: "Conferência de saldo do app",
        previousBalance: 0.0,
        resultingBalance: 2450.0,
      },
    ],
  },
  {
    id: "mock-acc-3",
    name: "Nubank",
    bankName: "Nubank",
    title: "Nubank",
    balance: 890.5,
    saldoAtual: 890.5,
    holder: "Túlio Cavalcanti",
    color: "bg-purple-600 text-white",
    initials: "NU",
    history: [],
  },
];

const DEFAULT_INITIAL_BILLS = [
  {
    id: "mock-bill-1",
    description: "Treino - Futevôlei",
    amount: 150.0,
    category: "Lazer & Esporte (Futevôlei, etc.)",
    tipoLabel: "Assinatura / Mensalidade",
    tipo: "ASSINATURA",
    startMonth: 10,
    dueDay: 10,
    competenceMonth: 10,
    competenceYear: 2026,
    bank: "Santander",
    status: "PENDING",
  },
  {
    id: "mock-bill-2",
    description: "Internet Tim Live",
    amount: 119.9,
    category: "Internet & TV",
    tipoLabel: "Boleto / Conta Fixa",
    tipo: "BOLETO",
    startMonth: 9,
    dueDay: 15,
    competenceMonth: 9,
    competenceYear: 2026,
    bank: "Santander",
    status: "PENDING",
  },
  {
    id: "mock-bill-3",
    description: "2 Parcela Fonte Bira",
    amount: 820.0,
    category: "Parcela / Financiamento",
    tipoLabel: "Boleto / Conta Fixa",
    tipo: "BOLETO",
    startMonth: 10,
    dueDay: 20,
    competenceMonth: 10,
    competenceYear: 2026,
    bank: "Picpay",
    status: "PENDING",
  },
  {
    id: "mock-bill-4",
    description: "Energia Elétrica - Luz",
    amount: 280.0,
    category: "Energia Elétrica",
    tipoLabel: "Boleto / Conta Fixa",
    tipo: "BOLETO",
    startMonth: 1,
    dueDay: 5,
    competenceMonth: 1,
    competenceYear: 2026,
    bank: "Santander",
    status: "PENDING",
  },
];

// Helper para ícones visuais modernos e contextuais por descrição ou categoria
const getBillIcon = (title: string, category?: string, tipo?: string) => {
  const text = `${title} ${category || ""} ${tipo || ""}`.toLowerCase();
  
  // 1. Energia / Luz
  if (
    text.includes("luz") ||
    text.includes("energia") ||
    text.includes("eletric") ||
    text.includes("enel") ||
    text.includes("cpfl") ||
    text.includes("cemig") ||
    text.includes("ceb") ||
    text.includes("light") ||
    text.includes("neoenergia")
  ) {
    return Zap;
  }

  // 2. Telefonia / Celular / Tim / Claro / Vivo
  if (
    text.includes("tim") ||
    text.includes("claro") ||
    text.includes("vivo") ||
    text.includes("oi ") ||
    text.includes("celular") ||
    text.includes("telefone") ||
    text.includes("telefonia")
  ) {
    return Smartphone;
  }

  // 3. Internet / Wifi / Banda Larga / Streaming
  if (
    text.includes("internet") ||
    text.includes("wifi") ||
    text.includes("fibra") ||
    text.includes("banda") ||
    text.includes("streaming") ||
    text.includes("netflix") ||
    text.includes("spotify")
  ) {
    return Wifi;
  }

  // 4. Esporte / Futevôlei / Futebol / Academia / Treino
  if (
    text.includes("futebol") ||
    text.includes("futevôlei") ||
    text.includes("futevolei") ||
    text.includes("treino") ||
    text.includes("esporte") ||
    text.includes("academia") ||
    text.includes("crossfit") ||
    text.includes("natação") ||
    text.includes("natacao")
  ) {
    return Trophy;
  }

  // 5. Cartão de Crédito / Faturas
  if (
    text.includes("fatura") ||
    text.includes("cartão") ||
    text.includes("cartao") ||
    text.includes("credit") ||
    text.includes("card")
  ) {
    return CreditCard;
  }

  // 6. Parcelas / Financiamentos / Empréstimos / Contratos / Fonte
  if (
    text.includes("parcela") ||
    text.includes("fonte") ||
    text.includes("bira") ||
    text.includes("financiamento") ||
    text.includes("empréstimo") ||
    text.includes("emprestimo") ||
    text.includes("contrato") ||
    text.includes("iptu") ||
    text.includes("ipva")
  ) {
    return FileText;
  }

  // 7. Aluguel & Moradia / Condomínio
  if (
    text.includes("aluguel") ||
    text.includes("condomínio") ||
    text.includes("condominio") ||
    text.includes("moradia") ||
    text.includes("imobili") ||
    text.includes("apto") ||
    text.includes("apartamento")
  ) {
    return Building2;
  }

  // 8. Água / Saneamento
  if (
    text.includes("água") ||
    text.includes("agua") ||
    text.includes("saneamento") ||
    text.includes("sabesp") ||
    text.includes("cedae") ||
    text.includes("copasa")
  ) {
    return Droplet;
  }

  // 9. Veículo / Transporte / Combustível
  if (
    text.includes("carro") ||
    text.includes("combustível") ||
    text.includes("combustivel") ||
    text.includes("gasolina") ||
    text.includes("uber") ||
    text.includes("transporte") ||
    text.includes("mecânic") ||
    text.includes("mecanic")
  ) {
    return Car;
  }

  // 10. Mercado / Compras
  if (
    text.includes("mercado") ||
    text.includes("supermercado") ||
    text.includes("feira") ||
    text.includes("compras")
  ) {
    return ShoppingCart;
  }

  // 11. Alimentação / Refeição
  if (
    text.includes("aliment") ||
    text.includes("refeição") ||
    text.includes("refeicao") ||
    text.includes("restaurante") ||
    text.includes("ifood")
  ) {
    return Utensils;
  }

  // 12. Saúde & Farmácia
  if (
    text.includes("saúde") ||
    text.includes("saude") ||
    text.includes("médic") ||
    text.includes("medic") ||
    text.includes("unimed") ||
    text.includes("farmácia") ||
    text.includes("farmacia") ||
    text.includes("remédio") ||
    text.includes("remedio") ||
    text.includes("odonto")
  ) {
    return HeartPulse;
  }

  // 13. Educação
  if (
    text.includes("educa") ||
    text.includes("faculdade") ||
    text.includes("escola") ||
    text.includes("curso") ||
    text.includes("colégio") ||
    text.includes("colegio")
  ) {
    return GraduationCap;
  }

  return Calendar;
};

// Helper para obter o nome limpo e elegante do banco vinculado a uma conta fixa
const getBillBankName = (bill: any, accountsList: any[] = []): string => {
  if (bill.bank) return bill.bank;
  if (bill.wallet?.bankName) return bill.wallet.bankName;
  if (bill.wallet?.title && bill.wallet.title !== "Conta Principal") return bill.wallet.title;
  if (bill.walletTitle && bill.walletTitle !== "Conta Principal") return bill.walletTitle;

  if (bill.walletId) {
    const match = accountsList.find((a) => a.id === bill.walletId);
    if (match) {
      const name = match.bankName || match.banco || match.title;
      if (name && name !== "Conta Principal") return name;
    }
  }

  const d = (bill.description || "").toLowerCase();
  if (d.includes("santander")) return "Santander";
  if (d.includes("picpay")) return "Picpay";
  if (d.includes("nubank") || d.includes("nu ")) return "Nubank";
  if (d.includes("inter")) return "Inter";
  if (d.includes("itaú") || d.includes("itau")) return "Itaú";
  if (d.includes("bradesco")) return "Bradesco";
  if (d.includes("brasil") || d.includes("bb")) return "Banco do Brasil";

  for (const acc of accountsList) {
    const bName = acc.bankName || acc.banco || acc.title;
    if (bName && bName !== "Conta Principal" && d.includes(bName.toLowerCase())) return bName;
  }

  if (accountsList.length > 0) {
    const firstName = accountsList[0].bankName || accountsList[0].banco || accountsList[0].title;
    if (firstName && firstName !== "Conta Principal") return firstName;
  }

  return "Santander";
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
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>("ALL");
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
  const [editCategory, setEditCategory] = useState("");
  const [editWalletId, setEditWalletId] = useState<string>("");

  // Modal: Excluir Compromisso
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [deletingCommitment, setDeletingCommitment] = useState(false);

  // Modal: Gerenciar Saldo da Conta Bancária
  const [managingAccount, setManagingAccount] = useState<any | null>(null);
  const [manageTab, setManageTab] = useState<"EXATO" | "RAPIDO" | "HISTORICO">("EXATO");
  const [exactBalanceInput, setExactBalanceInput] = useState<string>("");
  const [exactReasonInput, setExactReasonInput] = useState<string>("");
  const [quickAdjustType, setQuickAdjustType] = useState<"ENTRADA" | "SAIDA">("ENTRADA");
  const [quickAmountInput, setQuickAmountInput] = useState<string>("");
  const [quickDescriptionInput, setQuickDescriptionInput] = useState<string>("");
  const [savingAdjustment, setSavingAdjustment] = useState<boolean>(false);

  // Carregar Dados Consolidados
  const loadData = async (active = true) => {
    try {
      setLoading(true);
      const data = await getGestaoCaixaPageDataAction(selectedYear);
      if (!active) return;
      const loadedAccounts = (data.accounts?.length > 0 ? data.accounts : data.contasBancarias) || [];
      if (loadedAccounts.length > 0) {
        setAccounts((prev) => {
          return loadedAccounts.map((a: any) => {
            const existing = prev.find((p) => p.id === a.id);
            const bankStyle = getBankStyle(a.bankName || a.title);
            const savedHist = getAccountSavedHistory(a.id);
            const hist = (existing && existing.history && existing.history.length > 0)
              ? existing.history
              : (savedHist.length > 0 ? savedHist : []);
            const bal = (existing && existing.history && existing.history.length > 0)
              ? Number(existing.balance ?? existing.saldoAtual ?? 0)
              : Number(a.saldoAtual ?? a.balance ?? 0);
            return {
              ...a,
              id: a.id,
              name: a.bankName || a.title || "Conta Bancária",
              bankName: a.bankName || a.title || "Conta Bancária",
              title: a.title || a.bankName || "Conta Bancária",
              balance: bal,
              saldoAtual: bal,
              color: bankStyle.iconBg,
              initials: bankStyle.initials,
              holder: a.holder || existing?.holder,
              history: hist,
            };
          });
        });
      } else {
        setAccounts((prev) => (prev.length > 0 ? prev : DEFAULT_INITIAL_ACCOUNTS));
      }

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
      return accounts.reduce((sum, a) => sum + Number(a.balance ?? a.saldoAtual ?? 0), 0);
    }
    return totals.totalRealBalance || 0;
  }, [accounts, totals.totalRealBalance]);

  // Lista de bancos disponíveis para o filtro rápido
  const allRegisteredWallets = useMemo(() => {
    return accounts.length > 0 ? accounts : contasBancarias;
  }, [accounts, contasBancarias]);

  const availableBankNames = useMemo(() => {
    const set = new Set<string>();
    allRegisteredWallets.forEach((w) => {
      const name = w.bankName || w.banco || w.title;
      if (name && name !== "Conta Principal") set.add(name);
    });
    bills.forEach((b) => {
      const bank = getBillBankName(b, allRegisteredWallets);
      if (bank && bank !== "Conta Principal") set.add(bank);
    });
    if (set.size === 0) {
      set.add("Santander");
      set.add("Picpay");
    }
    return Array.from(set).sort();
  }, [allRegisteredWallets, bills]);

  // Lista filtrada de contas fixas projetadas (por mês, busca e banco selecionado)
  const filteredBills = useMemo(() => {
    return bills.filter((item) => {
      // Se for fatura de cartão específica e estiver num mês diferente, não exibe
      if (selectedMonth !== "ALL" && item.isCardInvoice && item.competenceMonth && item.competenceMonth !== selectedMonth) {
        return false;
      }

      // Filtro por Banco selecionado
      if (selectedBankFilter !== "ALL") {
        const bank = getBillBankName(item, allRegisteredWallets);
        if (bank.toLowerCase() !== selectedBankFilter.toLowerCase()) {
          return false;
        }
      }

      if (!agendaSearch.trim()) return true;
      const q = agendaSearch.toLowerCase().trim();
      const bank = getBillBankName(item, allRegisteredWallets).toLowerCase();
      const matchBank = bank.includes(q);
      const matchDesc = (item.description || "").toLowerCase().includes(q);
      const matchType = (item.tipoLabel || "").toLowerCase().includes(q);
      const matchCat = (item.category || "").toLowerCase().includes(q);
      const matchRef = (item.competenciaLabel || item.competenciaShort || "").toLowerCase().includes(q);
      return matchDesc || matchType || matchCat || matchRef || matchBank;
    }).slice().sort((a, b) => {
      const dayA = getBillStartMonthAndDay(a).dueDay;
      const dayB = getBillStartMonthAndDay(b).dueDay;
      return dayA - dayB;
    });
  }, [bills, selectedMonth, selectedBankFilter, agendaSearch, selectedYear, allRegisteredWallets]);

  // Total das contas pendentes no mês selecionado (geral para cálculo da Sobra Prevista)
  const monthPendingBillsTotal = useMemo(() => {
    return bills
      .filter((b) => {
        if (selectedMonth !== "ALL" && b.isCardInvoice && b.competenceMonth && b.competenceMonth !== selectedMonth) {
          return false;
        }
        const { startMonth } = getBillStartMonthAndDay(b);
        if (selectedMonth !== "ALL") {
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
  }, [bills, selectedMonth, paidByMonth, currentMonthNum]);

  // Total das contas pendentes filtradas para exibição no card de A Pagar da tabela
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

  // Sobra prevista após contas pendentes (com saldo geral)
  const sobraPrevista = totalSaldoGeral - monthPendingBillsTotal;

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
      const finalCategory = (newCommitmentCategory === "OUTRO" ? newCommitmentCustomCat : newCommitmentCategory)?.trim() || "Moradia & Aluguel";
      const availableWallets = accounts.length > 0 ? accounts : contasBancarias;
      const chosenWallet = availableWallets.find((w: any) => w.id === newCommitmentWalletId) || availableWallets[0];
      const chosenWalletId = chosenWallet?.id ?? undefined;
      const chosenBankName = chosenWallet?.bankName || chosenWallet?.banco || chosenWallet?.title || "Santander";

      await createCommitmentAction({
        description: finalDesc,
        amount: finalAmount,
        categoryName: finalCategory,
        walletId: chosenWalletId,
        bank: chosenBankName,
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
        competenceMonth: chosenMonth,
        competenceYear: selectedYear,
        walletId: chosenWalletId,
        walletTitle: chosenBankName,
        bank: chosenBankName,
        status: "PENDING",
      };
      setBills((prev) => [newLocalItem, ...prev]);

      setNewCommitmentModalOpen(false);
      setNewCommitmentDesc("");
      setNewCommitmentAmount("");
      setNewCommitmentMonth(selectedMonth === "ALL" ? currentMonthNum : selectedMonth);
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

      const chosenWallet = (accounts.length > 0 ? accounts : contasBancarias).find((w: any) => w.id === editWalletId);
      const chosenBank = chosenWallet?.bankName || chosenWallet?.banco || chosenWallet?.title || "Santander";

      if (!editItem.id.startsWith("mock-") && !editItem.id.startsWith("local-")) {
        await updateCommitmentAction({
          id: editItem.id,
          description: finalDesc,
          amount: finalAmount,
          tipo: editItem.tipo || "BOLETO",
          recorrencia: editItem.recorrencia || "MENSAL",
          walletId: editWalletId || undefined,
        });
      }

      setBills((prev) =>
        prev.map((b) =>
          b.id === editItem.id
            ? { ...b, description: finalDesc, amount: finalAmount, walletId: editWalletId, bank: chosenBank, walletTitle: chosenBank }
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

  // Handlers: Gerenciar Saldo da Conta Bancária
  const handleOpenManageModal = (acc: any) => {
    setManagingAccount(acc);
    setManageTab("EXATO");
    const currentVal = Number(acc.balance ?? acc.saldoAtual ?? 0);
    setExactBalanceInput(currentVal > 0 ? String(currentVal) : "");
    setExactReasonInput("");
    setQuickAdjustType("ENTRADA");
    setQuickAmountInput("");
    setQuickDescriptionInput("");
  };

  const handleConfirmExactBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingAccount) return;

    const targetExact = parseFloat(exactBalanceInput.replace(",", "."));
    if (isNaN(targetExact)) {
      showAlert("Informe um valor de saldo válido.", { variant: "warning" });
      return;
    }

    const currentBal = Number(managingAccount.balance ?? managingAccount.saldoAtual ?? 0);
    const diff = Math.round((targetExact - currentBal) * 100) / 100;

    if (diff === 0) {
      showAlert("O saldo digitado é idêntico ao saldo atual da conta.", { variant: "info" });
      return;
    }

    setSavingAdjustment(true);
    try {
      const now = new Date();
      const dateFormatted = now.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const newRecord: BalanceAdjustmentRecord = {
        id: `adj-${Date.now()}`,
        date: dateFormatted,
        type: "AJUSTE",
        amount: Math.abs(diff),
        diff,
        description: exactReasonInput.trim() || `Ajuste para saldo real (${formatBRL(targetExact)})`,
        previousBalance: currentBal,
        resultingBalance: targetExact,
      };

      const updatedHistory = [newRecord, ...(managingAccount.history || [])];
      saveAccountHistory(managingAccount.id, updatedHistory);

      const updatedAccount = {
        ...managingAccount,
        balance: targetExact,
        saldoAtual: targetExact,
        history: updatedHistory,
      };

      // Atualização Reativa Imediata do Dashboard (Conta, Saldo Geral e Sobra Prevista)
      setAccounts((prev) =>
        prev.map((acc) => (acc.id === managingAccount.id ? updatedAccount : acc))
      );
      setContasBancarias((prev) =>
        prev.map((acc) => (acc.id === managingAccount.id ? { ...acc, saldoAtual: targetExact, balance: targetExact } : acc))
      );
      setManagingAccount(updatedAccount);
      setExactReasonInput("");

      showAlert(`Saldo de ${managingAccount.bankName || managingAccount.title || managingAccount.name} atualizado para ${formatBRL(targetExact)}!`, { variant: "success" });

      if (!managingAccount.id.startsWith("mock-") && !managingAccount.id.startsWith("local-")) {
        await setExactBankAccountBalanceAction({
          contaId: managingAccount.id,
          novoSaldo: targetExact,
          descricao: newRecord.description,
        }).catch((err) => console.error("Erro ao sincronizar saldo no banco:", err));
      }
    } catch (err: any) {
      console.error(err);
      showAlert(err?.message || "Erro ao atualizar saldo.", { variant: "error" });
    } finally {
      setSavingAdjustment(false);
    }
  };

  const handleConfirmQuickAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingAccount) return;

    const val = parseFloat(quickAmountInput.replace(",", "."));
    if (isNaN(val) || val <= 0) {
      showAlert("Informe um valor válido maior que zero.", { variant: "warning" });
      return;
    }

    const currentBal = Number(managingAccount.balance ?? managingAccount.saldoAtual ?? 0);
    const diff = quickAdjustType === "ENTRADA" ? val : -val;
    const resulting = Math.round((currentBal + diff) * 100) / 100;

    setSavingAdjustment(true);
    try {
      const now = new Date();
      const dateFormatted = now.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const newRecord: BalanceAdjustmentRecord = {
        id: `adj-${Date.now()}`,
        date: dateFormatted,
        type: quickAdjustType,
        amount: val,
        diff,
        description: quickDescriptionInput.trim() || (quickAdjustType === "ENTRADA" ? "Adição de dinheiro ao saldo" : "Retirada / Abatimento de saldo"),
        previousBalance: currentBal,
        resultingBalance: resulting,
      };

      const updatedHistory = [newRecord, ...(managingAccount.history || [])];
      saveAccountHistory(managingAccount.id, updatedHistory);

      const updatedAccount = {
        ...managingAccount,
        balance: resulting,
        saldoAtual: resulting,
        history: updatedHistory,
      };

      // Atualização Reativa Imediata do Dashboard (Conta, Saldo Geral e Sobra Prevista)
      setAccounts((prev) =>
        prev.map((acc) => (acc.id === managingAccount.id ? updatedAccount : acc))
      );
      setContasBancarias((prev) =>
        prev.map((acc) => (acc.id === managingAccount.id ? { ...acc, saldoAtual: resulting, balance: resulting } : acc))
      );
      setManagingAccount(updatedAccount);
      setQuickAmountInput("");
      setQuickDescriptionInput("");

      showAlert(`Ajuste de ${quickAdjustType === "ENTRADA" ? "+" : "-"}${formatBRL(val)} realizado com sucesso!`, { variant: "success" });

      if (!managingAccount.id.startsWith("mock-") && !managingAccount.id.startsWith("local-")) {
        const todayYmd = new Date().toISOString().split("T")[0];
        await recordBankAccountMovementAction({
          contaId: managingAccount.id,
          valor: val,
          dataOperacao: todayYmd,
          descricao: newRecord.description,
          tipoOperacao: quickAdjustType,
        }).catch((err) => console.error("Erro ao sincronizar ajuste no banco:", err));
      }
    } catch (err: any) {
      console.error(err);
      showAlert(err?.message || "Erro ao realizar ajuste de saldo.", { variant: "error" });
    } finally {
      setSavingAdjustment(false);
    }
  };

  const handleDeleteHistoryRecord = async (recordId: string) => {
    if (!managingAccount) return;
    const targetRecord = (managingAccount.history || []).find((r: any) => r.id === recordId);
    if (!targetRecord) return;

    const currentBal = Number(managingAccount.balance ?? managingAccount.saldoAtual ?? 0);
    // Reversão do valor: inverte o sinal do diff
    const revertedBalance = Math.round((currentBal - targetRecord.diff) * 100) / 100;
    const updatedHistory = (managingAccount.history || []).filter((r: any) => r.id !== recordId);
    saveAccountHistory(managingAccount.id, updatedHistory);

    const updatedAccount = {
      ...managingAccount,
      balance: revertedBalance,
      saldoAtual: revertedBalance,
      history: updatedHistory,
    };

    setAccounts((prev) =>
      prev.map((acc) => (acc.id === managingAccount.id ? updatedAccount : acc))
    );
    setContasBancarias((prev) =>
      prev.map((acc) => (acc.id === managingAccount.id ? { ...acc, saldoAtual: revertedBalance, balance: revertedBalance } : acc))
    );
    setManagingAccount(updatedAccount);

    showAlert("Ajuste excluído e saldo revertido com sucesso!", { variant: "info" });

    if (!managingAccount.id.startsWith("mock-") && !managingAccount.id.startsWith("local-")) {
      try {
        const wasEntrada = targetRecord.diff > 0;
        const todayYmd = new Date().toISOString().split("T")[0];
        await recordBankAccountMovementAction({
          contaId: managingAccount.id,
          valor: Math.abs(targetRecord.diff),
          dataOperacao: todayYmd,
          descricao: `Reversão: ${targetRecord.description}`,
          tipoOperacao: wasEntrada ? "SAIDA" : "ENTRADA",
        }).catch((err) => console.error("Erro ao reverter no backend:", err));
      } catch (err: any) {
        console.error("Erro ao reverter no backend:", err);
      }
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
            <span className={`font-bold ${sobraPrevista >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
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
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
              (Clique para gerenciar saldo e ver histórico)
            </span>
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
              const bankStyle = getBankStyle(acc.bankName || acc.title || acc.name);
              const bName = acc.bankName || acc.title || acc.name || "";
              const currentBal = Number(acc.balance ?? acc.saldoAtual ?? 0);
              const isSelectedFilter = selectedBankFilter.toLowerCase() === bName.toLowerCase();

              return (
                <div
                  key={acc.id}
                  onClick={() => handleOpenManageModal(acc)}
                  className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer select-none group"
                  title={`Clique para gerenciar saldo de ${bName}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${bankStyle.iconBg} shadow-sm shrink-0`}>
                      {bankStyle.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 dark:text-white text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {bName}
                        </p>
                        {isSelectedFilter && (
                          <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                            Filtrado
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        {acc.holder ? `Titular: ${acc.holder}` : "Conta Corrente"}
                        {acc.history && acc.history.length > 0 && (
                          <span className="ml-1.5 text-slate-400 dark:text-slate-500">
                            • {acc.history.length} {acc.history.length === 1 ? "ajuste" : "ajustes"}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`font-bold text-sm tabular-nums ${currentBal >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {formatBRL(currentBal)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenManageModal(acc);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/50 text-slate-700 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300 border border-slate-200/80 hover:border-emerald-300 dark:border-slate-700/80 dark:hover:border-emerald-800/80 transition-all cursor-pointer shadow-2xs group/btn"
                      title={`Ajustar saldo de ${bName}`}
                    >
                      <SlidersHorizontal size={13} className="text-emerald-600 dark:text-emerald-400 group-hover/btn:rotate-90 transition-transform duration-200" />
                      <span>Ajustar Saldo</span>
                    </button>
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

        {/* ── 3. SELETOR DE MESES FLUIDO COM PILLS E FILTRO DE BANCO ─────── */}
        <div className="px-5 py-3 border-b border-slate-100/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 space-y-2.5">
          {/* Ano centralizado acima da régua de botões dos meses */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Ano {selectedYear}
            </span>

            {selectedMonth !== currentMonthNum && (
              <button
                type="button"
                onClick={() => setSelectedMonth(currentMonthNum)}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Ir para Mês Atual ({MONTH_NAMES_LIST[currentMonthNum - 1]})
              </button>
            )}
          </div>

          {/* Abas / Pills dos 12 meses do ano + Ano Todo */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
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

          {/* Linha de Filtros: Filtro de Banco + Busca Rápida */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-200/40 dark:border-slate-800/40">
            <div className="flex items-center gap-2">
              {selectedBankFilter !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setSelectedBankFilter("ALL")}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 transition-colors cursor-pointer"
                  title="Clique para limpar filtro de banco"
                >
                  <span>Filtrado: {selectedBankFilter}</span>
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
              {/* Filtro Rápido por Banco (Select simples) */}
              <select
                value={selectedBankFilter}
                onChange={(e) => setSelectedBankFilter(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium shadow-2xs"
                title="Filtrar por Banco"
              >
                <option value="ALL">Todos os Bancos</option>
                {availableBankNames.map((bName) => (
                  <option key={bName} value={bName}>
                    {bName}
                  </option>
                ))}
              </select>

              {/* Busca Rápida */}
              <div className="relative flex-1 sm:w-52">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={agendaSearch}
                  onChange={(e) => setAgendaSearch(e.target.value)}
                  placeholder="Buscar conta..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors shadow-2xs"
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
        </div>

        {/* ── 4. TABELA DE CONTAS FIXAS RECORRENTES ────────────────────────── */}
        <div className="w-full overflow-hidden">
          <table className="w-full table-auto text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50/70 dark:bg-slate-950/40 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="w-12 px-2 py-3 text-center">Status</th>
                <th className="w-auto px-4 py-3">Descrição</th>
                <th className="w-44 px-4 py-3 text-left text-sm text-slate-500 dark:text-slate-400">Categoria</th>
                <th className="w-32 px-4 py-3 text-right font-medium">Valor</th>
                <th className="w-12 px-2 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
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
                  const { startMonth } = getBillStartMonthAndDay(bill);
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
                      <td className="w-12 px-2 py-3.5 text-center">
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
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer mx-auto ${
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

                      {/* 2. Descrição com Ícone Contextual & Banco como subtítulo */}
                      <td className="w-auto px-4 py-3.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                            <IconComponent size={15} />
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span
                              className={`font-semibold text-sm leading-tight truncate ${
                                isPriorToStart
                                  ? "text-slate-400 dark:text-slate-500"
                                  : isPaid
                                  ? "line-through text-slate-400 dark:text-slate-500"
                                  : "text-slate-900 dark:text-slate-100"
                              }`}
                            >
                              {bill.description}
                            </span>
                            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                              <CreditCard size={11} className="text-slate-400 shrink-0" />
                              <span className="truncate">{getBillBankName(bill, allRegisteredWallets)}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Categoria */}
                      <td className="w-44 px-4 py-3.5 text-left text-sm text-slate-500 dark:text-slate-400 truncate">
                        {bill.category || bill.tipoLabel || "Conta Fixa"}
                      </td>

                      {/* 4. Valor (R$) */}
                      <td className="w-32 px-4 py-3.5 text-right font-medium whitespace-nowrap">
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

                      {/* 5. Ações */}
                      <td className="w-12 px-2 py-3.5 text-center whitespace-nowrap">
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

              {/* 3. Categoria */}
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
                    Alterar descrição, valor ou banco
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

      {/* ── 11. MODAL: GERENCIAR SALDO DA CONTA BANCÁRIA ────────────────── */}
      {managingAccount && (
        <div
          onClick={() => setManagingAccount(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
          >
            {/* Topo do Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${getBankStyle(managingAccount.bankName || managingAccount.title || managingAccount.name).iconBg} shadow-sm shrink-0`}>
                  {getBankStyle(managingAccount.bankName || managingAccount.title || managingAccount.name).initials}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Gerenciar Saldo - {managingAccount.bankName || managingAccount.title || managingAccount.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {managingAccount.holder ? `Titular: ${managingAccount.holder}` : "Conta Corrente"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManagingAccount(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Card de Destaque: Saldo Atual da Conta */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100/60 dark:from-slate-950/50 dark:to-slate-900/40 border border-slate-200/80 dark:border-slate-800 mb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Saldo Atual no Sistema
                </span>
                <p className={`text-2xl sm:text-3xl font-black mt-0.5 tabular-nums ${Number(managingAccount.balance ?? managingAccount.saldoAtual ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {formatBRL(Number(managingAccount.balance ?? managingAccount.saldoAtual ?? 0))}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 block">
                  Saldo Geral Disponível
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                  {formatBRL(totalSaldoGeral)}
                </span>
              </div>
            </div>

            {/* As 3 Abas Diretas de Ajuste */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-4">
              <button
                type="button"
                onClick={() => setManageTab("EXATO")}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  manageTab === "EXATO"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <Equal size={14} />
                <span className="truncate">1. Saldo Exato</span>
              </button>
              <button
                type="button"
                onClick={() => setManageTab("RAPIDO")}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  manageTab === "RAPIDO"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <Plus size={14} />
                <span className="truncate">2. Adicionar / Retirar</span>
              </button>
              <button
                type="button"
                onClick={() => setManageTab("HISTORICO")}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  manageTab === "HISTORICO"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <History size={14} />
                <span className="truncate">3. Histórico</span>
                {(managingAccount.history?.length || 0) > 0 && (
                  <span className="ml-0.5 text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded-full font-bold">
                    {managingAccount.history.length}
                  </span>
                )}
              </button>
            </div>

            {/* ABA 1: DEFINIR SALDO EXATO */}
            {manageTab === "EXATO" && (
              <form onSubmit={handleConfirmExactBalance} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-300 leading-relaxed">
                  <strong>A forma mais rápida:</strong> digite o saldo real que você vê agora no aplicativo do banco (ex: <strong>60,00</strong>). O sistema substituirá o saldo na hora e calculará a diferença no histórico.
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 block mb-1.5">
                    Qual é o saldo real atual no banco?
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="60,00"
                      value={exactBalanceInput}
                      onChange={(e) => setExactBalanceInput(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white pl-11 pr-3 py-3 rounded-xl text-lg font-bold focus:outline-none focus:border-emerald-500 transition-colors shadow-2xs"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Indicador de Diferença Calculada */}
                {exactBalanceInput !== "" && !isNaN(parseFloat(exactBalanceInput)) && (
                  <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                    parseFloat(exactBalanceInput) - Number(managingAccount.balance ?? managingAccount.saldoAtual ?? 0) >= 0
                      ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300"
                      : "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300"
                  }`}>
                    <span className="font-medium">Diferença calculada no histórico:</span>
                    <span className="font-bold text-sm tabular-nums">
                      {parseFloat(exactBalanceInput) - Number(managingAccount.balance ?? managingAccount.saldoAtual ?? 0) >= 0 ? "+" : ""}
                      {formatBRL(parseFloat(exactBalanceInput) - Number(managingAccount.balance ?? managingAccount.saldoAtual ?? 0))}
                    </span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    Motivo / Observação (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Conferência do app Santander, saldo real em conta..."
                    value={exactReasonInput}
                    onChange={(e) => setExactReasonInput(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingAdjustment || exactBalanceInput === ""}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-sm flex items-center justify-center gap-2"
                >
                  <Check size={16} strokeWidth={3} />
                  <span>{savingAdjustment ? "Salvando..." : "Salvar Novo Saldo"}</span>
                </button>
              </form>
            )}

            {/* ABA 2: ADICIONAR OU RETIRAR (+ / -) */}
            {manageTab === "RAPIDO" && (
              <form onSubmit={handleConfirmQuickAdjust} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 block mb-1.5">
                    Operação Desejada
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setQuickAdjustType("ENTRADA")}
                      className={`py-3 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                        quickAdjustType === "ENTRADA"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500"
                      }`}
                    >
                      <ArrowDownRight size={16} />
                      <span>[ + Adicionar Dinheiro ]</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuickAdjustType("SAIDA")}
                      className={`py-3 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                        quickAdjustType === "SAIDA"
                          ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-500"
                      }`}
                    >
                      <ArrowUpRight size={16} />
                      <span>[ - Retirar / Abater ]</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 block mb-1">
                    Valor (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={quickAmountInput}
                      onChange={(e) => setQuickAmountInput(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white pl-11 pr-3 py-3 rounded-xl text-lg font-bold focus:outline-none focus:border-emerald-500 transition-colors shadow-2xs"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Prévia do Saldo Resultante */}
                {quickAmountInput !== "" && !isNaN(parseFloat(quickAmountInput)) && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Saldo Resultante no Banco:</span>
                    <span className="font-bold text-sm text-slate-900 dark:text-white tabular-nums">
                      {formatBRL(
                        Number(managingAccount.balance ?? managingAccount.saldoAtual ?? 0) +
                          (quickAdjustType === "ENTRADA" ? parseFloat(quickAmountInput) : -parseFloat(quickAmountInput))
                      )}
                    </span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    Motivo / Descrição (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Pix avulso, Saque, Correção..."
                    value={quickDescriptionInput}
                    onChange={(e) => setQuickDescriptionInput(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingAdjustment || quickAmountInput === ""}
                  className={`w-full py-3 text-white font-bold text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 ${
                    quickAdjustType === "ENTRADA" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  <Check size={16} strokeWidth={3} />
                  <span>
                    {savingAdjustment
                      ? "Salvando..."
                      : quickAdjustType === "ENTRADA"
                      ? "Confirmar Adição ao Saldo"
                      : "Confirmar Retirada do Saldo"}
                  </span>
                </button>
              </form>
            )}

            {/* ABA 3: HISTÓRICO RECENTE DE AJUSTES */}
            {manageTab === "HISTORICO" && (
              <div className="space-y-3">
                {(!managingAccount.history || managingAccount.history.length === 0) ? (
                  <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs space-y-2 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <History className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold text-slate-600 dark:text-slate-400">Nenhum ajuste registrado ainda.</p>
                    <p className="text-[11px] text-slate-400">Os ajustes manuais feitos nesta conta aparecerão aqui em formato de extrato.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto pr-1 space-y-2">
                    {managingAccount.history.map((record: any) => {
                      const isEntrada = record.diff > 0 || record.type === "ENTRADA";

                      return (
                        <div
                          key={record.id}
                          className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60 flex items-start justify-between gap-3"
                        >
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                                  record.type === "AJUSTE"
                                    ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60"
                                    : isEntrada
                                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                                    : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60"
                                }`}
                              >
                                {record.type === "AJUSTE" ? "Ajuste manual" : isEntrada ? "+ Entrada" : "- Saída"}
                              </span>
                              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                {record.date}
                              </span>
                            </div>

                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {record.description}
                            </p>

                            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                              <span>
                                Valor: <strong className={isEntrada ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-rose-600 dark:text-rose-400 font-bold"}>
                                  {isEntrada ? "+" : ""}{formatBRL(record.diff ?? record.amount)}
                                </strong>
                              </span>
                              <span>•</span>
                              <span>
                                Saldo resultante: <strong className="font-semibold text-slate-700 dark:text-slate-300">{formatBRL(record.resultingBalance)}</strong>
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteHistoryRecord(record.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                            title="Excluir este ajuste e reverter o saldo"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
