"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  clearAccountAdjustmentsAction,
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
    balance: 625.18,
    saldoAtual: 625.18,
    holder: "Túlio Cavalcanti",
    color: "bg-emerald-600 text-white",
    initials: "PIC",
    history: [
      {
        id: "hist-pic-1",
        date: "22/10/2026, 11:21",
        type: "AJUSTE",
        amount: 624.99,
        diff: 624.99,
        description: "Emprestimo",
        previousBalance: 0.19,
        resultingBalance: 625.18,
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
  {
    id: "mock-acc-4",
    name: "HyperCard",
    bankName: "HyperCard",
    title: "HyperCard",
    balance: 0.0,
    saldoAtual: 0.0,
    holder: "Túlio Cavalcanti",
    color: "bg-rose-700 text-white",
    initials: "HIP",
    history: [],
  },
];

// Interface para as contas e faturas
export interface BillItem {
  id: string;
  description: string;
  category: string;
  bank: string;
  amount: number;
  tipoLabel: string;
  tipo?: string;
  dueDay?: number;
  status?: "PENDING" | "COMPLETED" | "PAID" | "PAGO" | string;
  isCardInvoice?: boolean;
  walletId?: string;
  walletTitle?: string;
  paymentWalletId?: string;
  paidWalletId?: string;
  startMonth?: string;
  competenceMonth?: number;
  competenceYear?: number;
  month?: string;
  recorrencia?: string;
  recorrenciaLabel?: string;
  [key: string]: any;
}

// Faturas HyperCard por Mês de Competência (Agosto a Dezembro de 2026)
export const DEFAULT_HYPERCARD_INVOICES: BillItem[] = [
  {
    id: "invoice-hypercard-2026-08",
    description: "Fatura HyperCard",
    amount: 419.74,
    category: "Fatura de Cartão",
    tipoLabel: "Fatura de Cartão",
    tipo: "FATURA_CARTAO",
    bank: "HyperCard",
    dueDay: 10,
    status: "PAID",
    isCardInvoice: true,
    competenceMonth: 8,
    competenceYear: 2026,
    month: "2026-08",
  },
  {
    id: "invoice-hypercard-2026-09",
    description: "Fatura HyperCard",
    amount: 839.42,
    category: "Fatura de Cartão",
    tipoLabel: "Fatura de Cartão",
    tipo: "FATURA_CARTAO",
    bank: "HyperCard",
    dueDay: 10,
    status: "PAID",
    isCardInvoice: true,
    competenceMonth: 9,
    competenceYear: 2026,
    month: "2026-09",
  },
  {
    id: "invoice-hypercard-2026-10",
    description: "Fatura HyperCard",
    amount: 554.16,
    category: "Fatura de Cartão",
    tipoLabel: "Fatura de Cartão",
    tipo: "FATURA_CARTAO",
    bank: "HyperCard",
    dueDay: 10,
    status: "PENDING",
    isCardInvoice: true,
    competenceMonth: 10,
    competenceYear: 2026,
    month: "2026-10",
  },
  {
    id: "invoice-hypercard-2026-11",
    description: "Fatura HyperCard",
    amount: 114.69,
    category: "Fatura de Cartão",
    tipoLabel: "Fatura de Cartão",
    tipo: "FATURA_CARTAO",
    bank: "HyperCard",
    dueDay: 10,
    status: "PENDING",
    isCardInvoice: true,
    competenceMonth: 11,
    competenceYear: 2026,
    month: "2026-11",
  },
  {
    id: "invoice-hypercard-2026-12",
    description: "Fatura HyperCard",
    amount: 75.75,
    category: "Fatura de Cartão",
    tipoLabel: "Fatura de Cartão",
    tipo: "FATURA_CARTAO",
    bank: "HyperCard",
    dueDay: 10,
    status: "PENDING",
    isCardInvoice: true,
    competenceMonth: 12,
    competenceYear: 2026,
    month: "2026-12",
  },
];

export const DEFAULT_PAID_INVOICES: BillItem[] = DEFAULT_HYPERCARD_INVOICES.filter(
  (inv) => inv.status === "PAID"
);

// Lista única das contas fixas (pertencentes estritamente ao mês de Outubro/2026, sem recorrência para outros meses)
export const DEFAULT_MONTH_BILLS: BillItem[] = [
  {
    id: "bill-tim-celular-2026-10",
    description: "Tim Celular",
    amount: 30.99,
    category: "Boleto / Conta Fixa",
    tipoLabel: "Boleto / Conta Fixa",
    tipo: "BOLETO",
    bank: "",
    dueDay: 10,
    status: "PENDING",
    month: "2026-10",
    startMonth: "2026-10",
    competenceMonth: 10,
    competenceYear: 2026,
    recorrencia: "UNICO",
    recorrenciaLabel: "Apenas neste mês",
  },
  {
    id: "bill-treino-futevolei-2026-10",
    description: "Treino – Futevôlei",
    amount: 100.0,
    category: "Lazer & Esporte",
    tipoLabel: "Assinatura / Mensalidade",
    tipo: "ASSINATURA",
    bank: "",
    dueDay: 10,
    status: "PENDING",
    month: "2026-10",
    startMonth: "2026-10",
    competenceMonth: 10,
    competenceYear: 2026,
    recorrencia: "UNICO",
    recorrenciaLabel: "Apenas neste mês",
  },
  {
    id: "bill-internet-tim-live-2026-10",
    description: "Internet Tim Live",
    amount: 105.56,
    category: "Internet & TV",
    tipoLabel: "Boleto / Conta Fixa",
    tipo: "BOLETO",
    bank: "",
    dueDay: 15,
    status: "PENDING",
    month: "2026-10",
    startMonth: "2026-10",
    competenceMonth: 10,
    competenceYear: 2026,
    recorrencia: "UNICO",
    recorrenciaLabel: "Apenas neste mês",
  },
  {
    id: "bill-2-parcela-fonte-bira-2026-10",
    description: "2 Parcela Fonte Bira",
    amount: 100.0,
    category: "Boleto / Conta Fixa",
    tipoLabel: "Boleto / Conta Fixa",
    tipo: "BOLETO",
    bank: "",
    dueDay: 20,
    status: "PENDING",
    month: "2026-10",
    startMonth: "2026-10",
    competenceMonth: 10,
    competenceYear: 2026,
    recorrencia: "UNICO",
    recorrenciaLabel: "Apenas neste mês",
  },
  {
    id: "bill-pagamento-camila-2026-10",
    description: "Pagamento Camila",
    amount: 300.0,
    category: "Assinatura / Mensalidade",
    tipoLabel: "Assinatura / Mensalidade",
    tipo: "ASSINATURA",
    bank: "",
    dueDay: 5,
    status: "PENDING",
    month: "2026-10",
    startMonth: "2026-10",
    competenceMonth: 10,
    competenceYear: 2026,
    recorrencia: "UNICO",
    recorrenciaLabel: "Apenas neste mês",
  },
];

// Aliases para compatibilidade de tipagem
export type AnyBill = BillItem;
export const DEFAULT_INITIAL_BILLS: BillItem[] = [
  ...DEFAULT_HYPERCARD_INVOICES,
  ...DEFAULT_MONTH_BILLS,
];

// ── HELPER DE MÊS ESTRITO (YYYY-MM) ──────────────────────────────────────────
export const getBillMonth = (bill: any): string => {
  if (bill.month && typeof bill.month === "string" && bill.month.includes("-")) {
    return bill.month;
  }
  if (bill.competenceYear && bill.competenceMonth) {
    return `${bill.competenceYear}-${String(bill.competenceMonth).padStart(2, "0")}`;
  }
  if (bill.startMonth && typeof bill.startMonth === "string" && bill.startMonth.includes("-")) {
    return bill.startMonth;
  }
  return "2026-10";
};

// ── PERSISTÊNCIA DEFINITIVA DE EXCLUSÃO E EDIÇÃO NO LOCALSTORAGE ─────────────
const DELETED_BILLS_STORAGE_KEY = "kamael_deleted_bills_v2";
const EDITED_BILLS_STORAGE_KEY = "kamael_edited_bills_v1";
const PAID_ACCOUNTS_STORAGE_KEY = "kamael_paid_accounts_v1";

export const getDeletedBillIds = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DELETED_BILLS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const addDeletedBillId = (id: string) => {
  if (typeof window === "undefined") return;
  try {
    const current = getDeletedBillIds();
    const updated = [...current];
    if (id && !updated.includes(id)) {
      updated.push(id);
    }
    localStorage.setItem(DELETED_BILLS_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
};

export const removeDeletedBillId = (id: string) => {
  if (typeof window === "undefined") return;
  try {
    const current = getDeletedBillIds();
    const updated = current.filter((item) => item !== id);
    localStorage.setItem(DELETED_BILLS_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
};

export const isBillDeleted = (id: string, deletedList?: string[]): boolean => {
  const list = deletedList || getDeletedBillIds();
  if (!list || list.length === 0) return false;
  return Boolean(id && list.includes(id));
};

export const getEditedBills = (): Record<string, Partial<BillItem>> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(EDITED_BILLS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveEditedBill = (id: string, data: Partial<BillItem>) => {
  if (typeof window === "undefined") return;
  try {
    const current = getEditedBills();
    current[id] = { ...(current[id] || {}), ...data };
    if (data.description) {
      const norm = normalizeBillTitle(data.description);
      current[norm] = { ...(current[norm] || {}), ...data };
    }
    localStorage.setItem(EDITED_BILLS_STORAGE_KEY, JSON.stringify(current));
  } catch {}
};

export const getSavedPaidAccounts = (): Record<string, string> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PAID_ACCOUNTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const savePaidAccountForBill = (billId: string, month: number, accountId: string) => {
  if (typeof window === "undefined") return;
  try {
    const current = getSavedPaidAccounts();
    current[billId] = accountId;
    current[`${billId}_${month}`] = accountId;
    localStorage.setItem(PAID_ACCOUNTS_STORAGE_KEY, JSON.stringify(current));
  } catch {}
};

export const removePaidAccountForBill = (billId: string, month: number) => {
  if (typeof window === "undefined") return;
  try {
    const current = getSavedPaidAccounts();
    delete current[billId];
    delete current[`${billId}_${month}`];
    localStorage.setItem(PAID_ACCOUNTS_STORAGE_KEY, JSON.stringify(current));
  } catch {}
};

// Helper para normalizar descrições e evitar duplicidades indesejadas
export function normalizeBillTitle(desc: string): string {
  const d = (desc || "").toLowerCase().trim();
  if (d.includes("treino") && (d.includes("futev") || d.includes("futvolei"))) return "Treino – Futevôlei";
  if (d.includes("tim") && (d.includes("celular") || d.includes("telefone"))) return "Tim Celular";
  if (d.includes("tim") && d.includes("live")) return "Internet Tim Live";
  if (d.includes("bira") || d.includes("fonte bira")) return "2 Parcela Fonte Bira";
  if (d.includes("camila")) return "Pagamento Camila";
  if (d.includes("hypercard") || d.includes("hipercard")) return "Fatura HyperCard";
  return desc.trim();
}

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

  // 14. Pessoal / Camila
  if (text.includes("camila")) {
    return HeartPulse;
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
  if (d.includes("hypercard") || d.includes("hipercard") || d.includes("hiper")) return "HyperCard";
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

  return "";
};

// Cores e Iniciais elegantes para os bancos cadastrados
const getBankStyle = (name: string = "") => {
  const lower = name.toLowerCase();
  if (lower.includes("hypercard") || lower.includes("hipercard") || lower.includes("hiper")) {
    return { iconBg: "bg-rose-700 text-white", initials: "HIP" };
  }
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
  const { selectedYear, prevYear, nextYear, setYear, goToCurrentMonth } = usePeriod();
  const { showAlert } = useModal();
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  // Mês selecionado no navegador fluido (1 a 12 ou "ALL")
  const currentMonthNum = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState<number | "ALL">(currentMonthNum);

  // Controle de status de pagamento
  const [paidBills, setPaidBills] = useState<Record<string, boolean>>({
    "invoice-hypercard-2026-08": true,
    "invoice-hypercard-2026-08_8": true,
    "invoice-hypercard-2026-09": true,
    "invoice-hypercard-2026-09_9": true,
  });
  const [paidByMonth, setPaidByMonth] = useState<Record<string, boolean>>({
    "invoice-hypercard-2026-08_8": true,
    "invoice-hypercard-2026-09_9": true,
  });

  // Dados consolidados
  const [accounts, setAccounts] = useState<any[]>([]);
  const [bills, setBills] = useState<BillItem[]>([]);
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

  // Limpeza de histórico legado de ajustes das contas
  useEffect(() => {
    if (typeof window !== "undefined") {
      const resetKey = "kamael_acc_history_cleared_v2";
      if (!localStorage.getItem(resetKey)) {
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith("kamael_acc_history_")) {
            localStorage.removeItem(k);
          }
        });
        localStorage.setItem(resetKey, "true");
      }
    }
  }, []);

  // Modal de Baixa / Pagamento (com seleção de conta bancária)
  const [payCommitmentItem, setPayCommitmentItem] = useState<any | null>(null);
  const [payMonth, setPayMonth] = useState<number>(currentMonthNum);
  const [payingCommitment, setPayingCommitment] = useState(false);
  const [baixaForma, setBaixaForma] = useState<"SALDO_CONTA" | "DEBITO_AUTOMATICO" | "PIX" | "CARTAO_CREDITO" | "DINHEIRO">("SALDO_CONTA");
  const [baixaContaId, setBaixaContaId] = useState("");
  const [baixaCartaoId, setBaixaCartaoId] = useState("");
  const [baixaData, setBaixaData] = useState(new Date().toISOString().split("T")[0]);
  const [paidAccountByBill, setPaidAccountByBill] = useState<Record<string, string>>(() => getSavedPaidAccounts());

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

  // Estado para Edição de Registro no Histórico de Ajustes
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editRecordDesc, setEditRecordDesc] = useState<string>("");
  const [editRecordAmount, setEditRecordAmount] = useState<string>("");
  const [editRecordType, setEditRecordType] = useState<"ENTRADA" | "SAIDA" | "AJUSTE">("AJUSTE");
  const [editRecordDirection, setEditRecordDirection] = useState<"ENTRADA" | "SAIDA">("ENTRADA");
  const [editRecordDate, setEditRecordDate] = useState<string>("");
  const [savingEditRecord, setSavingEditRecord] = useState<boolean>(false);

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
            const bal = Number(a.saldoAtual ?? a.balance ?? 0);
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
      
      // Consolidação completa respeitando o ano selecionado, faturas reais e persistência do usuário:
      const deletedIds = getDeletedBillIds();
      const editedBills = getEditedBills();

      // 1. Inicializa com as faturas (Ago-Dez) e contas fixas padrão (filtrando as excluídas pelo usuário)
      // Apenas para 2026! Para 2027 em diante, não deve carregar dados padrão de 2026.
      const initialBills = selectedYear === 2026 ? DEFAULT_INITIAL_BILLS : [];
      const consolidated: BillItem[] = initialBills
        .filter((b) => !isBillDeleted(b.id, deletedIds))
        .map((b) => {
          const item = { ...b };
          // Aplica edições salvas
          const edit = editedBills[item.id] || editedBills[normalizeBillTitle(item.description)];
          if (edit) {
            if (edit.description) item.description = edit.description;
            if (edit.amount !== undefined) item.amount = Number(edit.amount);
            if (edit.category) item.category = edit.category;
            if (edit.bank) item.bank = edit.bank;
            if (edit.walletId) item.walletId = edit.walletId;
          }
          return item;
        });

      // 2. Mescla os compromissos e faturas reais retornados do banco de dados para o selectedYear
      allList.forEach((dbItem: any) => {
        if (isBillDeleted(dbItem.id, deletedIds)) return;
        const normTitle = normalizeBillTitle(dbItem.description || "");
        const isCard = Boolean(
          dbItem.isCardInvoice ||
          dbItem.tipo === "FATURA_CARTAO" ||
          (dbItem.category || "").toLowerCase().includes("fatura") ||
          normTitle.toLowerCase().includes("fatura") ||
          normTitle.toLowerCase().includes("hypercard")
        );

        if (isCard) {
          const cMonth = Number(
            dbItem.competenceMonth ||
            (dbItem.competencia ? dbItem.competencia.split("-")[1] : 0)
          );
          const cYear = Number(
            dbItem.competenceYear ||
            (dbItem.competencia ? dbItem.competencia.split("-")[0] : selectedYear)
          );
          if (!cMonth) return;
          const monthKey = `${cYear}-${String(cMonth).padStart(2, "0")}`;

          // Localiza se já existe uma fatura cadastrada para este mesmo mês e ano
          const matchCard = consolidated.find(
            (c) =>
              (c.isCardInvoice || c.tipo === "FATURA_CARTAO") &&
              (c.month === monthKey || (c.competenceMonth === cMonth && (c.competenceYear === cYear || !c.competenceYear)))
          );

          if (matchCard) {
            matchCard.id = dbItem.id;
            if (Number(dbItem.amount) > 0) matchCard.amount = Number(dbItem.amount);
            if (dbItem.walletId) matchCard.walletId = dbItem.walletId;
            if (dbItem.status === "COMPLETED" || dbItem.status === "PAID" || dbItem.status === "PAGO") {
              matchCard.status = "PAID";
            }
          } else {
            // Nova fatura vinda do banco de dados
            consolidated.push({
              id: dbItem.id,
              description: `Fatura ${dbItem.bank || "Cartão"} – ${MONTH_NAMES_LIST[cMonth - 1]}/${cYear}`,
              amount: Number(dbItem.amount || 0),
              category: "Fatura de Cartão",
              tipoLabel: "Fatura de Cartão",
              tipo: "FATURA_CARTAO",
              bank: dbItem.bank || "HyperCard",
              dueDay: Number(dbItem.dueDay || 10),
              status: (dbItem.status === "COMPLETED" || dbItem.status === "PAID" || dbItem.status === "PAGO") ? "PAID" : "PENDING",
              isCardInvoice: true,
              competenceMonth: cMonth,
              competenceYear: cYear,
              month: monthKey,
              walletId: dbItem.walletId,
            });
          }
        } else {
          // Conta Fixa com mês estrito (YYYY-MM)
          let sMonth = `${selectedYear}-10`;
          if (dbItem.month && typeof dbItem.month === "string" && dbItem.month.includes("-")) {
            sMonth = dbItem.month;
          } else if (dbItem.competenceYear && dbItem.competenceMonth) {
            sMonth = `${dbItem.competenceYear}-${String(dbItem.competenceMonth).padStart(2, "0")}`;
          } else if (dbItem.startMonth && typeof dbItem.startMonth === "string" && dbItem.startMonth.includes("-")) {
            sMonth = dbItem.startMonth;
          }

          // Localiza se já existe este mesmo item cadastrado no MESMO mês
          const match = consolidated.find(
            (c) => !c.isCardInvoice && c.tipo !== "FATURA_CARTAO" && normalizeBillTitle(c.description) === normTitle && getBillMonth(c) === sMonth
          );
          if (match) {
            match.id = dbItem.id;
            if (dbItem.walletId) match.walletId = dbItem.walletId;
            if (dbItem.status === "COMPLETED" || dbItem.status === "PAID" || dbItem.status === "PAGO") {
              match.status = "PAID";
            }
          } else {
            consolidated.push({
              id: dbItem.id,
              description: dbItem.description,
              amount: Number(dbItem.amount || 0),
              category: dbItem.category || "Outros Fixos",
              tipoLabel: dbItem.tipoLabel || "Boleto / Conta Fixa",
              tipo: dbItem.tipo || "BOLETO",
              bank: getBillBankName(dbItem, loadedAccounts),
              dueDay: Number(dbItem.dueDay || 10),
              status: (dbItem.status === "COMPLETED" || dbItem.status === "PAID" || dbItem.status === "PAGO") ? "PAID" : "PENDING",
              startMonth: sMonth,
              month: sMonth,
              competenceMonth: Number(sMonth.split("-")[1]),
              competenceYear: Number(sMonth.split("-")[0]),
              recorrencia: "UNICO",
              recorrenciaLabel: "Apenas neste mês",
            });
          }
        }
      });

      setBills(consolidated);

      // Sincroniza status de pagamento
      const freshPaid: Record<string, boolean> = {
        "invoice-hypercard-2026-08": true,
        "invoice-hypercard-2026-08_8": true,
        "invoice-hypercard-2026-09": true,
        "invoice-hypercard-2026-09_9": true,
      };
      consolidated.forEach((b) => {
        const m = b.competenceMonth || (b.month ? Number(b.month.split("-")[1]) : 10);
        if (b.status === "COMPLETED" || b.status === "PAID" || b.status === "PAGO") {
          freshPaid[b.id] = true;
          freshPaid[`${b.id}_${m}`] = true;
        }
      });
      setPaidBills((prev) => ({ ...prev, ...freshPaid }));
      setPaidByMonth((prev) => ({ ...prev, ...freshPaid }));

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
  // Helper central para determinar mês de início da recorrência e dia fixo
  const getBillStartMonthAndDay = (bill: any): { startMonth: number; dueDay: number; startYear: number; startMonthStr: string } => {
    let startMonth = 10;
    let dueDay = Number(bill.dueDay || 10);
    let startYear = 2026;
    let startMonthStr = "2026-10";

    if (bill.startMonth && typeof bill.startMonth === "string" && bill.startMonth.includes("-")) {
      startMonthStr = bill.startMonth;
      const parts = bill.startMonth.split("-");
      startYear = parseInt(parts[0], 10) || 2026;
      startMonth = parseInt(parts[1], 10) || 10;
    } else if (bill.month && typeof bill.month === "string" && bill.month.includes("-")) {
      startMonthStr = bill.month;
      const parts = bill.month.split("-");
      startYear = parseInt(parts[0], 10) || 2026;
      startMonth = parseInt(parts[1], 10) || 10;
    } else if (bill.competenceYear && bill.competenceMonth) {
      startYear = Number(bill.competenceYear);
      startMonth = Number(bill.competenceMonth);
      startMonthStr = `${startYear}-${String(startMonth).padStart(2, "0")}`;
    }

    if (isNaN(startMonth) || startMonth < 1 || startMonth > 12) startMonth = 10;
    if (isNaN(dueDay) || dueDay < 1 || dueDay > 31) dueDay = 10;
    if (isNaN(startYear)) startYear = 2026;

    return { startMonth, dueDay, startYear, startMonthStr };
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

  // Lista filtrada de contas por Mês, Ano, Banco e Busca
  const filteredBills = useMemo(() => {
    const activeYear = selectedYear;
    const selectedYearMonth =
      selectedMonth === "ALL"
        ? null
        : `${activeYear}-${String(selectedMonth).padStart(2, "0")}`;

    const deletedIds = getDeletedBillIds();

    return bills.filter((item: any) => {
      // 0. Filtro definitivo de exclusão pelo usuário (estritamente por ID)
      if (isBillDeleted(item.id, deletedIds)) return false;

      // 1. Filtro estrito por Mês e Ano:
      // Cada conta pertence única e exclusivamente ao seu month (YYYY-MM), sem replicação para meses posteriores
      const itemMonthKey = getBillMonth(item);

      if (selectedYearMonth) {
        if (itemMonthKey !== selectedYearMonth) {
          return false;
        }
      } else {
        // Modo "ALL" (Ano Todo): exibe apenas itens pertencentes ao selectedYear
        if (!itemMonthKey.startsWith(`${activeYear}-`)) {
          return false;
        }
      }

      // 2. Filtro por Banco selecionado
      if (selectedBankFilter !== "ALL") {
        const bank = getBillBankName(item, allRegisteredWallets);
        if (bank.toLowerCase() !== selectedBankFilter.toLowerCase()) {
          return false;
        }
      }

      // 3. Busca por texto
      if (!agendaSearch.trim()) return true;
      const q = agendaSearch.toLowerCase().trim();
      const bank = getBillBankName(item, allRegisteredWallets).toLowerCase();
      const matchBank = bank.includes(q);
      const matchDesc = (item.description || "").toLowerCase().includes(q);
      const matchType = (item.tipoLabel || "").toLowerCase().includes(q);
      const matchCat = (item.category || "").toLowerCase().includes(q);
      return matchDesc || matchType || matchCat || matchBank;
    }).slice().sort((a, b) => {
      const dayA = a.dueDay || 10;
      const dayB = b.dueDay || 10;
      return dayA - dayB;
    });
  }, [bills, selectedMonth, selectedYear, selectedBankFilter, agendaSearch, allRegisteredWallets]);

  // Total das contas pendentes do período selecionado (A Pagar)
  const pendingBillsTotal = useMemo(() => {
    const activeMonthNum = selectedMonth === "ALL" ? currentMonthNum : selectedMonth;
    return filteredBills
      .filter((b: any) => {
        const isPaid = Boolean(
          paidBills[`${b.id}_${activeMonthNum}`] ??
          paidBills[b.id] ??
          paidByMonth[`${b.id}_${activeMonthNum}`] ??
          (b.status === "COMPLETED" || b.status === "PAID" || b.status === "PAGO")
        );
        return !isPaid;
      })
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  }, [filteredBills, paidBills, paidByMonth, selectedMonth, currentMonthNum]);

  const monthPendingBillsTotal = pendingBillsTotal;

  // Sobra prevista após contas pendentes (com saldo geral)
  const sobraPrevista = totalSaldoGeral - pendingBillsTotal;

  // Toggle de status de pagamento
  const toggleBillStatus = async (billId: string, month?: number) => {
    const activeMonth = month ?? (selectedMonth === "ALL" ? currentMonthNum : selectedMonth);
    const target = bills.find((b) => b.id === billId);
    if (!target) return;

    const currentStatusPaid = Boolean(
      paidBills[`${billId}_${activeMonth}`] ??
      paidBills[billId] ??
      paidByMonth[`${billId}_${activeMonth}`] ??
      (target.status === "COMPLETED" || target.status === "PAID" || target.status === "PAGO")
    );

    if (!currentStatusPaid) {
      // Quando estiver pendente, o clique no status abre o modal para o usuário selecionar a conta bancária
      setPayMonth(activeMonth);
      handleOpenBaixaModal(target);
      return;
    }

    // ── REVERTER DE PAGO PARA PENDENTE (UNCHECK / DESMARCAR) ──
    const billAmount = Number(target.amount || 0);

    const targetAccountId =
      paidAccountByBill[`${billId}_${activeMonth}`] ||
      paidAccountByBill[billId] ||
      target.paidWalletId ||
      target.paymentWalletId ||
      target.walletId ||
      accounts[0]?.id;

    const refundedAccount = accounts.find((a) => a.id === targetAccountId);
    const bankNameRefunded = refundedAccount?.bankName || refundedAccount?.title || "Conta Bancária";

    // 1. Atualização otimista imediata
    setPaidBills((prev) => ({
      ...prev,
      [billId]: false,
      [`${billId}_${activeMonth}`]: false,
    }));
    setPaidByMonth((prev) => ({
      ...prev,
      [`${billId}_${activeMonth}`]: false,
    }));
    setBills((prev) =>
      prev.map((b) => (b.id === billId ? { ...b, status: "PENDING", paid: false } : b))
    );

    // Remove do mapa de contas pagas e do localStorage
    removePaidAccountForBill(billId, activeMonth);
    setPaidAccountByBill((prev) => {
      const next = { ...prev };
      delete next[billId];
      delete next[`${billId}_${activeMonth}`];
      return next;
    });

    // Estorna o valor de volta no saldo do banco utilizado
    if (targetAccountId && billAmount > 0) {
      setAccounts((prev) =>
        prev.map((acc) => {
          if (acc.id === targetAccountId) {
            const currentBal = Number(acc.balance ?? acc.saldoAtual ?? 0);
            const newBal = currentBal + billAmount;
            return { ...acc, balance: newBal, saldoAtual: newBal };
          }
          return acc;
        })
      );
      setContasBancarias((prev) =>
        prev.map((acc) => {
          if (acc.id === targetAccountId) {
            const currentBal = Number(acc.saldoAtual ?? acc.balance ?? 0);
            const newBal = currentBal + billAmount;
            return { ...acc, saldoAtual: newBal, balance: newBal };
          }
          return acc;
        })
      );
    }

    // 2. Requisição ao backend se for item real do banco
    const isDbUuid =
      target.id &&
      target.id.length >= 32 &&
      !target.id.startsWith("mock-") &&
      !target.id.startsWith("local-") &&
      !target.id.startsWith("bill-") &&
      !target.id.startsWith("invoice-");

    if (isDbUuid) {
      try {
        await undoCommitmentPaymentAction(billId);
      } catch (err: any) {
        console.warn("Aviso ao desfazer baixa no backend:", err);
      }
    }

    showAlert(`Baixa desfeita! ${formatBRL(billAmount)} estornado para ${bankNameRefunded}.`, { variant: "info" });
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
    const listContas = accounts.length > 0 ? accounts : contasBancarias;
    if (listContas.length > 0) {
      setBaixaContaId(listContas[0].id);
    }
  };

  const handleConfirmBaixa = async () => {
    if (!payCommitmentItem) return;

    const itemToPay = payCommitmentItem;
    const itemAmount = Number(itemToPay.amount || 0);

    const availableAccounts = accounts.length > 0 ? accounts : contasBancarias;
    const chosenAccountId = baixaContaId || availableAccounts[0]?.id;

    if (!chosenAccountId) {
      showAlert("Selecione a conta bancária de onde sairá o pagamento.", { variant: "warning" });
      return;
    }

    const chosenAccount = availableAccounts.find((a) => a.id === chosenAccountId);
    const chosenBankName = chosenAccount?.bankName || chosenAccount?.title || "Conta Bancária";

    // 1. Atualização Otimista Instantânea (0ms delay na UI - sem F5)
    setPaidBills((prev) => ({
      ...prev,
      [itemToPay.id]: true,
      [`${itemToPay.id}_${payMonth}`]: true,
    }));
    setPaidByMonth((prev) => ({
      ...prev,
      [`${itemToPay.id}_${payMonth}`]: true,
    }));

    // Salva o vínculo da conta bancária utilizada para este pagamento
    savePaidAccountForBill(itemToPay.id, payMonth, chosenAccountId);
    setPaidAccountByBill((prev) => ({
      ...prev,
      [itemToPay.id]: chosenAccountId,
      [`${itemToPay.id}_${payMonth}`]: chosenAccountId,
    }));

    // Subtrai automaticamente o valor da conta do saldo do banco selecionado
    if (chosenAccountId && itemAmount > 0) {
      setAccounts((prev) =>
        prev.map((acc) => {
          if (acc.id === chosenAccountId) {
            const current = Number(acc.balance ?? acc.saldoAtual ?? 0);
            const newBal = current - itemAmount;
            return {
              ...acc,
              balance: newBal,
              saldoAtual: newBal,
            };
          }
          return acc;
        })
      );
      setContasBancarias((prev) =>
        prev.map((acc) => {
          if (acc.id === chosenAccountId) {
            const current = Number(acc.saldoAtual ?? acc.balance ?? 0);
            const newBal = current - itemAmount;
            return {
              ...acc,
              saldoAtual: newBal,
              balance: newBal,
            };
          }
          return acc;
        })
      );
    }

    setBills((prev) =>
      prev.map((b) =>
        b.id === itemToPay.id
          ? {
              ...b,
              status: "COMPLETED",
              paid: true,
              walletId: chosenAccountId,
              bank: chosenBankName,
              paidWalletId: chosenAccountId,
            }
          : b
      )
    );

    // Fecha o modal imediatamente para resposta visual instantânea
    setPayCommitmentItem(null);
    showAlert(`Pagamento de ${formatBRL(itemAmount)} confirmado via ${chosenBankName}!`, { variant: "success" });

    // 2. Se for item real do backend, dispara requisição no servidor
    const isDbUuid =
      itemToPay.id &&
      itemToPay.id.length >= 32 &&
      !itemToPay.id.startsWith("mock-") &&
      !itemToPay.id.startsWith("local-") &&
      !itemToPay.id.startsWith("bill-") &&
      !itemToPay.id.startsWith("invoice-");

    if (isDbUuid) {
      setPayingCommitment(true);
      try {
        await payCommitmentAction({
          commitmentId: itemToPay.id,
          formaPagamento: "SALDO_CONTA",
          contaBancariaId: chosenAccountId,
          dataBaixa: new Date().toISOString().split("T")[0],
          deductFromBalance: true,
        });
        router.refresh();
      } catch (err: any) {
        console.warn("Aviso ao persistir baixa no backend:", err);
      } finally {
        setPayingCommitment(false);
      }
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
      const targetMonthKey = `${selectedYear || 2026}-${String(chosenMonth).padStart(2, "0")}`;
      const newBillId = `bill-${Date.now()}-${targetMonthKey}`;

      removeDeletedBillId(newBillId);

      // Adiciona localmente para feedback instantâneo (com mês estrito)
      const newLocalItem: BillItem = {
        id: newBillId,
        description: finalDesc,
        amount: finalAmount,
        category: finalCategory,
        tipoLabel: "Boleto / Conta Fixa",
        tipo: "BOLETO",
        month: targetMonthKey,
        startMonth: targetMonthKey,
        competenceMonth: chosenMonth,
        competenceYear: selectedYear,
        walletId: undefined,
        walletTitle: "",
        bank: "",
        status: "PENDING",
        recorrencia: "UNICO",
        recorrenciaLabel: "Apenas neste mês",
      };
      setBills((prev) => [newLocalItem, ...prev]);

      try {
        await createCommitmentAction({
          description: finalDesc,
          amount: finalAmount,
          categoryName: finalCategory,
          walletId: undefined,
          bank: "",
          tipo: "BOLETO",
          recorrencia: "UNICO",
          competenceMonth: chosenMonth,
          competenceYear: selectedYear,
        });
      } catch (dbErr) {
        console.warn("Item gravado localmente, backend:", dbErr);
      }

      setNewCommitmentModalOpen(false);
      setNewCommitmentDesc("");
      setNewCommitmentAmount("");
      setNewCommitmentMonth(selectedMonth === "ALL" ? currentMonthNum : selectedMonth);
      setNewCommitmentCategory("Moradia & Aluguel");
      setNewCommitmentCustomCat("");

      showAlert("Conta cadastrada com sucesso para este mês!", { variant: "success" });
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

      // Salva edições localmente para persistência definitiva imediata
      saveEditedBill(editItem.id, {
        description: finalDesc,
        amount: finalAmount,
        walletId: editWalletId,
        bank: chosenBank,
      });

      const isDbUuid =
        editItem.id &&
        editItem.id.length >= 32 &&
        !editItem.id.includes("-acc-") &&
        !editItem.id.startsWith("mock-") &&
        !editItem.id.startsWith("local-") &&
        !editItem.id.startsWith("bill-") &&
        !editItem.id.startsWith("invoice-");

      if (isDbUuid) {
        try {
          await updateCommitmentAction({
            id: editItem.id,
            description: finalDesc,
            amount: finalAmount,
            tipo: editItem.tipo || "BOLETO",
            recorrencia: editItem.recorrencia || "MENSAL",
            walletId: editWalletId || undefined,
          });
        } catch (dbErr) {
          console.warn("Item editado localmente, falha no banco:", dbErr);
        }
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

  // Handler: Exclusão Definitiva (com persistência no localStorage e banco estritamente por ID)
  const handleDelete = async (id: string) => {
    const target = bills.find((b) => b.id === id);
    if (!target) return;

    // 1. Grava no localStorage estritamente pelo ID
    addDeletedBillId(id);

    // 2. Remove do estado bills estritamente pelo ID do mês selecionado
    setBills((prev) => prev.filter((b) => b.id !== id));

    // 3. Se for fatura de cartão ou compromisso no banco, dispara rota de exclusão no backend
    const isCardInvoice = target.isCardInvoice || target.tipo === "FATURA_CARTAO" || target.id.startsWith("invoice-");
    const isDbUuid =
      target &&
      target.id &&
      target.id.length >= 32 &&
      !target.id.includes("-acc-") &&
      !target.id.startsWith("mock-") &&
      !target.id.startsWith("local-") &&
      !target.id.startsWith("bill-");

    if (isCardInvoice || isDbUuid) {
      try {
        await deleteCommitmentAction(target.id);
      } catch (dbErr) {
        console.warn("Item removido localmente:", dbErr);
      }
    }

    await loadData(false);
    showAlert("Conta fixa excluída com sucesso!", { variant: "success" });
  };

  // Handler: Confirmação do Modal de Exclusão
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setDeletingCommitment(true);
    try {
      await handleDelete(itemToDelete.id);
      setItemToDelete(null);
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
    setEditingRecordId(null);
    const currentVal = Number(acc.balance ?? acc.saldoAtual ?? 0);
    setExactBalanceInput("");
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
        if (updatedHistory.length === 0) {
          await clearAccountAdjustmentsAction(managingAccount.id);
          await loadData(false);
        }
      } catch (err: any) {
        console.error("Erro ao sincronizar exclusão de ajuste:", err);
      }
    }
  };

  const handleClearAllAdjustments = async () => {
    if (!managingAccount) return;
    setSavingAdjustment(true);
    try {
      saveAccountHistory(managingAccount.id, []);
      if (typeof window !== "undefined") {
        localStorage.removeItem(`kamael_acc_history_${managingAccount.id}`);
      }

      if (!managingAccount.id.startsWith("mock-") && !managingAccount.id.startsWith("local-")) {
        const res = await clearAccountAdjustmentsAction(managingAccount.id);
        const newBal = Number(res.updatedBalance ?? 0);
        const updatedAccount = {
          ...managingAccount,
          balance: newBal,
          saldoAtual: newBal,
          history: [],
        };
        setManagingAccount(updatedAccount);
        setAccounts((prev) => prev.map((acc) => (acc.id === managingAccount.id ? updatedAccount : acc)));
        setContasBancarias((prev) => prev.map((acc) => (acc.id === managingAccount.id ? { ...acc, saldoAtual: newBal, balance: newBal } : acc)));
      } else {
        const updatedAccount = {
          ...managingAccount,
          history: [],
        };
        setManagingAccount(updatedAccount);
        setAccounts((prev) => prev.map((acc) => (acc.id === managingAccount.id ? updatedAccount : acc)));
      }
      showAlert("Histórico e ajustes desta conta zerados com sucesso!", { variant: "success" });
      await loadData(false);
    } catch (err: any) {
      console.error(err);
      showAlert(err?.message || "Erro ao limpar histórico de ajustes.", { variant: "error" });
    } finally {
      setSavingAdjustment(false);
    }
  };

  const handleStartEditHistoryRecord = (record: BalanceAdjustmentRecord) => {
    setEditingRecordId(record.id);
    setEditRecordDesc(record.description || "");
    const amountVal = record.amount ?? Math.abs(record.diff ?? 0);
    setEditRecordAmount(amountVal ? String(amountVal).replace(".", ",") : "");
    const isPos = record.diff != null ? record.diff >= 0 : record.type !== "SAIDA";
    setEditRecordDirection(isPos ? "ENTRADA" : "SAIDA");
    setEditRecordType(record.type || "AJUSTE");
    setEditRecordDate(record.date || "");
  };

  const handleCancelEditHistoryRecord = () => {
    setEditingRecordId(null);
  };

  const handleSaveEditedRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingAccount || !editingRecordId) return;

    const targetRecord = (managingAccount.history || []).find(
      (r: BalanceAdjustmentRecord) => r.id === editingRecordId
    );
    if (!targetRecord) return;

    const parsedAmount = parseFloat(editRecordAmount.replace(",", "."));
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      showAlert("Informe um valor válido maior ou igual a zero.", { variant: "warning" });
      return;
    }

    setSavingEditRecord(true);
    try {
      const oldDiff = Number(
        targetRecord.diff ?? (targetRecord.type === "SAIDA" ? -targetRecord.amount : targetRecord.amount)
      );
      const newDiff = editRecordDirection === "ENTRADA" ? parsedAmount : -parsedAmount;
      const balanceDelta = Math.round((newDiff - oldDiff) * 100) / 100;

      const currentBal = Number(managingAccount.balance ?? managingAccount.saldoAtual ?? 0);
      const newAccountBalance = Math.round((currentBal + balanceDelta) * 100) / 100;

      const prevBal = Number(targetRecord.previousBalance ?? (currentBal - oldDiff));
      const newResultingBalance = Math.round((prevBal + newDiff) * 100) / 100;

      const updatedRecord: BalanceAdjustmentRecord = {
        ...targetRecord,
        description: editRecordDesc.trim() || targetRecord.description || "Ajuste de saldo",
        type: editRecordType,
        amount: parsedAmount,
        diff: newDiff,
        date: editRecordDate.trim() || targetRecord.date,
        previousBalance: prevBal,
        resultingBalance: newResultingBalance,
      };

      const updatedHistory = (managingAccount.history || []).map((r: BalanceAdjustmentRecord) =>
        r.id === editingRecordId ? updatedRecord : r
      );
      saveAccountHistory(managingAccount.id, updatedHistory);

      const updatedAccount = {
        ...managingAccount,
        balance: newAccountBalance,
        saldoAtual: newAccountBalance,
        history: updatedHistory,
      };

      setAccounts((prev) =>
        prev.map((acc) => (acc.id === managingAccount.id ? updatedAccount : acc))
      );
      setContasBancarias((prev) =>
        prev.map((acc) =>
          acc.id === managingAccount.id
            ? { ...acc, saldoAtual: newAccountBalance, balance: newAccountBalance }
            : acc
        )
      );
      setManagingAccount(updatedAccount);
      setEditingRecordId(null);

      showAlert("Registro de histórico atualizado com sucesso!", { variant: "success" });

      if (
        !managingAccount.id.startsWith("mock-") &&
        !managingAccount.id.startsWith("local-") &&
        balanceDelta !== 0
      ) {
        await setExactBankAccountBalanceAction({
          contaId: managingAccount.id,
          novoSaldo: newAccountBalance,
          descricao: `Ajuste após edição de histórico: ${updatedRecord.description}`,
        }).catch((err) => console.error("Erro ao sincronizar saldo no backend:", err));
      }
    } catch (err: any) {
      console.error(err);
      showAlert(err?.message || "Erro ao salvar alterações no histórico.", { variant: "error" });
    } finally {
      setSavingEditRecord(false);
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
          {/* Botão de Retorno Rápido ao Mês Atual */}
          <button
            type="button"
            onClick={() => {
              setSelectedMonth(currentMonthNum);
              if (setYear) setYear(2026);
              if (goToCurrentMonth) goToCurrentMonth();
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 ${
              selectedYear !== 2026 || selectedMonth !== currentMonthNum
                ? "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 shadow-emerald-600/20 shadow-sm"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
            title="Voltar para o Mês e Ano Atual"
          >
            <RotateCcw size={13} className={selectedYear !== 2026 || selectedMonth !== currentMonthNum ? "text-white" : "text-emerald-500"} />
            <span>Mês Atual ({MONTH_NAMES_LIST[currentMonthNum - 1]})</span>
          </button>

          {/* Seletor Interativo de Ano */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-1 rounded-xl shadow-xs">
            <button
              type="button"
              onClick={() => {
                if (prevYear) prevYear();
                else if (setYear) setYear(selectedYear - 1);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Ano Anterior"
            >
              <ChevronLeft size={14} />
            </button>

            <select
              value={selectedYear}
              onChange={(e) => {
                const y = Number(e.target.value);
                if (setYear) setYear(y);
              }}
              className="bg-transparent font-bold text-xs text-slate-800 dark:text-slate-100 border-none focus:outline-none cursor-pointer px-1.5 py-0.5 tracking-wider tabular-nums"
              title="Selecionar Ano"
            >
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                <option key={y} value={y} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-semibold">
                  {y}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                if (nextYear) nextYear();
                else if (setYear) setYear(selectedYear + 1);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/90 hover:border-emerald-300 dark:border-emerald-800/80 transition-all cursor-pointer shadow-2xs group/btn"
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

      {/* ── 3 & 4. TABELA DE CONTAS FIXAS & DESPESAS DO MÊS ──────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative min-h-[350px]">
        {/* Topo da Seção de Contas Fixas */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/50 dark:border-amber-800/50 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {selectedMonth === "ALL"
                  ? `Contas Fixas & Despesas do Ano (${selectedYear})`
                  : `Contas Fixas & Despesas do Mês (${MONTH_NAMES_LIST[selectedMonth - 1]} / ${selectedYear})`}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {selectedMonth === "ALL"
                  ? `Visão consolidada de todas as despesas do ano de ${selectedYear}`
                  : `Gestão simplificada das despesas de ${MONTH_NAMES_LIST[selectedMonth - 1]}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 px-3 py-1.5 rounded-lg shadow-xs">
              A Pagar: <strong className="font-bold">{formatBRL(pendingBillsTotal)}</strong>
            </div>
          </div>
        </div>

        {/* ── SELETOR DE MESES FLUIDO COM PILLS E FILTRO DE BANCO ─────── */}
        <div className="px-5 py-3 border-b border-slate-100/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 space-y-2.5">
          {/* Indicador de Ano & Atalho para Mês Atual */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Ano {selectedYear}
            </span>

            {(selectedMonth !== currentMonthNum || selectedYear !== 2026) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedMonth(currentMonthNum);
                  if (setYear) setYear(2026);
                  if (goToCurrentMonth) goToCurrentMonth();
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline cursor-pointer transition-colors"
                title="Voltar para Mês Atual (Outubro/2026)"
              >
                <RotateCcw size={12} />
                <span>Ir para Mês Atual ({MONTH_NAMES_LIST[currentMonthNum - 1]})</span>
              </button>
            )}
          </div>

          {/* Abas / Pills dos 12 meses do ano + Ano Todo */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {MONTH_TABS.map((m) => {
              const isSelected = selectedMonth === m.num;
              const isCurrent = m.num === currentMonthNum && selectedYear === 2026;
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

        {/* ── 4. TABELA DE CONTAS FIXAS & DESPESAS DO MÊS ───────────────────── */}
        <div className="w-full relative min-h-[350px]">
          <table className="w-full table-auto text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50/70 dark:bg-slate-950/40 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="w-12 px-2 py-3 text-center">Status</th>
                <th className="w-auto px-4 py-3">Descrição</th>
                <th className="w-44 px-4 py-3 text-left text-sm text-slate-500 dark:text-slate-400">Categoria</th>
                <th className="w-32 px-4 py-3 text-right font-medium">Valor</th>
                <th className="w-20 px-3 py-3 text-center">Ações</th>
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
                  const activeMonth = selectedMonth === "ALL" ? (bill.competenceMonth || currentMonthNum) : selectedMonth;
                  const isPaid = Boolean(
                    paidBills[`${bill.id}_${activeMonth}`] ??
                    paidBills[bill.id] ??
                    paidByMonth[`${bill.id}_${activeMonth}`] ??
                    (bill.status === "COMPLETED" || bill.status === "PAID" || bill.status === "PAGO")
                  );

                  const IconComponent = getBillIcon(bill.description, bill.category, bill.tipo);

                  return (
                    <tr
                      key={`${bill.id}_${activeMonth}`}
                      className="transition-colors group hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                    >
                      {/* 1. Status (Checkbox para Liquidar ou Desfazer) */}
                      <td className="w-12 px-2 py-3.5 text-center">
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
                                isPaid
                                  ? "line-through text-slate-400 dark:text-slate-500"
                                  : "text-slate-900 dark:text-slate-100"
                              }`}
                            >
                              {bill.isCardInvoice || bill.tipo === "FATURA_CARTAO"
                                ? `Fatura HyperCard – ${MONTH_NAMES_LIST[(bill.competenceMonth || activeMonth) - 1]}/${bill.competenceYear || selectedYear}`
                                : bill.description}
                            </span>
                            {isPaid ? (
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                <Check size={12} className="stroke-[3] text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span className="truncate">
                                  Pago via {(() => {
                                    const paidAccId = paidAccountByBill[`${bill.id}_${activeMonth}`] || paidAccountByBill[bill.id] || bill.paidWalletId || bill.walletId;
                                    const matchAcc = (accounts.length > 0 ? accounts : contasBancarias).find((a: any) => a.id === paidAccId);
                                    return matchAcc?.bankName || matchAcc?.banco || matchAcc?.title || bill.bank || "Conta Bancária";
                                  })()}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                                <CreditCard size={11} className="text-slate-400 shrink-0" />
                                <span className="truncate italic">
                                  {bill.isCardInvoice || bill.tipo === "FATURA_CARTAO"
                                    ? "Fatura HyperCard"
                                    : "A definir no pagamento"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. Categoria */}
                      <td className="w-44 px-4 py-3.5 text-left text-sm text-slate-500 dark:text-slate-400 truncate">
                        {bill.category || bill.tipoLabel || "Conta Fixa"}
                      </td>

                      {/* 4. Valor (R$) */}
                      <td className="w-32 px-4 py-3.5 text-right font-medium whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            isPaid
                              ? "text-slate-400 dark:text-slate-500 line-through"
                              : "text-slate-800 dark:text-slate-100"
                          }`}
                        >
                          {formatBRL(bill.amount)}
                        </span>
                      </td>

                      {/* 5. Ações (Botões Diretos na Linha - Sem Menu Dropdown) */}
                      <td className="w-20 px-3 py-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const descToEdit = bill.isCardInvoice || bill.tipo === "FATURA_CARTAO"
                                ? `Fatura HyperCard – ${MONTH_NAMES_LIST[(bill.competenceMonth || activeMonth) - 1]}/${bill.competenceYear || selectedYear}`
                                : bill.description;
                              setEditItem({ ...bill, description: descToEdit });
                              setEditDesc(descToEdit);
                              setEditAmount(String(bill.amount));
                              setEditCategory(bill.category || (bill.isCardInvoice ? "Fatura de Cartão" : "Conta Fixa"));
                              setEditWalletId(bill.walletId || "");
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Editar Conta"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const descToDelete = bill.isCardInvoice || bill.tipo === "FATURA_CARTAO"
                                ? `Fatura HyperCard – ${MONTH_NAMES_LIST[(bill.competenceMonth || activeMonth) - 1]}/${bill.competenceYear || selectedYear}`
                                : bill.description;
                              setItemToDelete({ ...bill, description: descToDelete });
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Excluir Conta"
                          >
                            <Trash2 size={15} />
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

      {/* ── 6. MINI-MODAL: CONFIRMAR PAGAMENTO (SELECIONA CONTA & ABATE SALDO AUTOMATICAMENTE) ─────── */}
      {payCommitmentItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/50 shrink-0">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                    Confirmar Pagamento – {payCommitmentItem.description}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    Baixa e conciliação bancária direta
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayCommitmentItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Card Destaque: Valor da Conta */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-4 text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                  Valor da Conta
                </span>
                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {formatBRL(payCommitmentItem.amount)}
                </span>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Mês de Referência: <b>{MONTH_NAMES_LIST[(payMonth || currentMonthNum) - 1]}/{selectedYear}</b>
                </div>
              </div>

              {/* Select Obrigatório: De qual conta saiu o pagamento? */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 block mb-1.5">
                  De qual conta saiu o pagamento? <span className="text-rose-500">*</span>
                </label>
                <select
                  className="w-full border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-3 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  value={baixaContaId}
                  onChange={(e) => setBaixaContaId(e.target.value)}
                  required
                >
                  {(accounts.length > 0 ? accounts : contasBancarias).map((conta: any) => {
                    const bankName = conta.bankName || conta.banco || conta.title || "Conta";
                    const bal = Number(conta.saldoAtual ?? conta.balance ?? 0);
                    return (
                      <option key={conta.id} value={conta.id}>
                        {bankName} - {formatBRL(bal)}
                      </option>
                    );
                  })}
                </select>
                <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  O valor será debitado automaticamente do saldo do banco selecionado.
                </p>
              </div>

              {/* Botões Cancelar e Confirmar */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setPayCommitmentItem(null)}
                  disabled={payingCommitment}
                  className="w-1/2 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBaixa}
                  disabled={payingCommitment}
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-md shadow-emerald-600/20 text-sm flex items-center justify-center gap-1.5"
                >
                  <Check size={16} strokeWidth={2.5} />
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
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-2xl max-w-xl w-full shadow-2xl animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
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
                onClick={() => {
                  setManageTab("EXATO");
                  setEditingRecordId(null);
                }}
                className={`py-2.5 px-2 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center leading-tight whitespace-normal ${
                  manageTab === "EXATO"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <Equal size={14} className="shrink-0" />
                <span>1. Definir Saldo Exato</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setManageTab("RAPIDO");
                  setEditingRecordId(null);
                }}
                className={`py-2.5 px-2 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center leading-tight whitespace-normal ${
                  manageTab === "RAPIDO"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <Plus size={14} className="shrink-0" />
                <span>2. Adicionar ou Retirar</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setManageTab("HISTORICO");
                  setEditingRecordId(null);
                }}
                className={`py-2.5 px-2 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center leading-tight whitespace-normal ${
                  manageTab === "HISTORICO"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <History size={14} className="shrink-0" />
                <span>3. Histórico de Ajustes</span>
                {(managingAccount.history?.length || 0) > 0 && (
                  <span className="ml-0.5 text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded-full font-bold shrink-0">
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
                      type="text"
                      inputMode="decimal"
                      placeholder="Ex: 60,00"
                      value={exactBalanceInput}
                      onChange={(e) => setExactBalanceInput(e.target.value.replace(/[^0-9.,]/g, ""))}
                      className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white pl-11 pr-3 py-3 rounded-xl text-lg font-bold focus:outline-none focus:border-emerald-500 transition-colors shadow-2xs"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Indicador de Diferença Calculada */}
                {exactBalanceInput !== "" && !isNaN(parseFloat(exactBalanceInput.replace(",", "."))) && (
                  <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                    parseFloat(exactBalanceInput.replace(",", ".")) - Number(managingAccount.balance ?? managingAccount.saldoAtual ?? 0) >= 0
                      ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300"
                      : "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300"
                  }`}>
                    <span className="font-medium">Diferença calculada no histórico:</span>
                    <span className="font-bold text-sm tabular-nums">
                      {parseFloat(exactBalanceInput.replace(",", ".")) - Number(managingAccount.balance ?? managingAccount.saldoAtual ?? 0) >= 0 ? "+" : ""}
                      {formatBRL(parseFloat(exactBalanceInput.replace(",", ".")) - Number(managingAccount.balance ?? managingAccount.saldoAtual ?? 0))}
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
                  disabled={savingAdjustment || exactBalanceInput.trim() === ""}
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
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={quickAmountInput}
                      onChange={(e) => setQuickAmountInput(e.target.value.replace(/[^0-9.,]/g, ""))}
                      className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white pl-11 pr-3 py-3 rounded-xl text-lg font-bold focus:outline-none focus:border-emerald-500 transition-colors shadow-2xs"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Prévia do Saldo Resultante */}
                {quickAmountInput !== "" && !isNaN(parseFloat(quickAmountInput.replace(",", "."))) && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Saldo Resultante no Banco:</span>
                    <span className="font-bold text-sm text-slate-900 dark:text-white tabular-nums">
                      {formatBRL(
                        Number(managingAccount.balance ?? managingAccount.saldoAtual ?? 0) +
                          (quickAdjustType === "ENTRADA"
                            ? parseFloat(quickAmountInput.replace(",", "."))
                            : -parseFloat(quickAmountInput.replace(",", ".")))
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
                  <>
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {managingAccount.history.length} {managingAccount.history.length === 1 ? "ajuste registrado" : "ajustes registrados"}
                      </span>
                      <button
                        type="button"
                        onClick={handleClearAllAdjustments}
                        disabled={savingAdjustment}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 rounded-lg transition-colors cursor-pointer"
                        title="Zerar todos os ajustes desta conta"
                      >
                        <Trash2 size={12} />
                        <span>Zerar Todos os Ajustes</span>
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto pr-1 space-y-2.5">
                      {managingAccount.history.map((record: any) => {
                        const isEntrada = record.diff != null ? record.diff > 0 : record.type === "ENTRADA";
                        const isEditingThis = editingRecordId === record.id;

                        if (isEditingThis) {
                          const pAmt = parseFloat(editRecordAmount.replace(",", "."));
                          const hasValidAmt = !isNaN(pAmt) && pAmt >= 0;
                          const oldDiff = Number(
                            record.diff ?? (record.type === "SAIDA" ? -record.amount : record.amount)
                          );
                          const nDiff = editRecordDirection === "ENTRADA" ? pAmt : -pAmt;
                          const delta = hasValidAmt ? Math.round((nDiff - oldDiff) * 100) / 100 : 0;
                          const curBal = Number(managingAccount.balance ?? managingAccount.saldoAtual ?? 0);
                          const projBal = Math.round((curBal + delta) * 100) / 100;

                          return (
                            <form
                              key={record.id}
                              onSubmit={handleSaveEditedRecord}
                              className="p-4 rounded-xl bg-white dark:bg-slate-900 border-2 border-emerald-500/80 shadow-md space-y-3 transition-all animate-in fade-in-50 duration-150"
                            >
                              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                    <Pencil size={12} />
                                  </div>
                                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                                    Editar Registro de Histórico
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleCancelEditHistoryRecord}
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors cursor-pointer"
                                  title="Cancelar edição"
                                >
                                  <X size={15} />
                                </button>
                              </div>

                              {/* Tipo de Registro e Direção */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                                  Tipo de Movimentação
                                </label>
                                <div className="grid grid-cols-3 gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setEditRecordType("AJUSTE")}
                                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                                      editRecordType === "AJUSTE"
                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                                    }`}
                                  >
                                    Ajuste manual
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditRecordType("ENTRADA");
                                      setEditRecordDirection("ENTRADA");
                                    }}
                                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                                      editRecordType === "ENTRADA"
                                        ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                                    }`}
                                  >
                                    + Entrada
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditRecordType("SAIDA");
                                      setEditRecordDirection("SAIDA");
                                    }}
                                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                                      editRecordType === "SAIDA"
                                        ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                                    }`}
                                  >
                                    - Saída
                                  </button>
                                </div>

                                {editRecordType === "AJUSTE" && (
                                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setEditRecordDirection("ENTRADA")}
                                      className={`py-1 px-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
                                        editRecordDirection === "ENTRADA"
                                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 font-bold"
                                          : "bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-slate-200 dark:border-slate-700"
                                      }`}
                                    >
                                      + Aumenta saldo (Entrada)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditRecordDirection("SAIDA")}
                                      className={`py-1 px-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
                                        editRecordDirection === "SAIDA"
                                          ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700 font-bold"
                                          : "bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-slate-200 dark:border-slate-700"
                                      }`}
                                    >
                                      - Diminui saldo (Saída)
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Descrição / Motivo */}
                              <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                                  Descrição / Motivo
                                </label>
                                <input
                                  type="text"
                                  value={editRecordDesc}
                                  onChange={(e) => setEditRecordDesc(e.target.value)}
                                  placeholder="Ex: Empréstimo, Depósito..."
                                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 transition-colors"
                                  required
                                  autoFocus
                                />
                              </div>

                              {/* Valor e Data */}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                                    Valor (R$)
                                  </label>
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                      R$
                                    </span>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={editRecordAmount}
                                      onChange={(e) => setEditRecordAmount(e.target.value.replace(/[^0-9.,]/g, ""))}
                                      placeholder="0,00"
                                      className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white pl-8 pr-2.5 py-2 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500 transition-colors"
                                      required
                                    />
                                  </div>
                                </div>

                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                      Data / Hora
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const now = new Date();
                                        setEditRecordDate(
                                          now.toLocaleString("pt-BR", {
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })
                                        );
                                      }}
                                      className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                                    >
                                      Agora
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    value={editRecordDate}
                                    onChange={(e) => setEditRecordDate(e.target.value)}
                                    placeholder="DD/MM/AAAA, HH:mm"
                                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-2.5 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                                  />
                                </div>
                              </div>

                              {/* Impacto no Saldo */}
                              {hasValidAmt && (
                                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[11px] flex items-center justify-between">
                                  <span className="text-slate-500">Impacto no saldo:</span>
                                  <span className="font-bold tabular-nums">
                                    {delta !== 0 ? (
                                      <span className={delta > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                                        {delta > 0 ? "+" : ""}{formatBRL(delta)} → Novo saldo: {formatBRL(projBal)}
                                      </span>
                                    ) : (
                                      <span className="text-slate-600 dark:text-slate-400">
                                        Sem mudança de saldo ({formatBRL(curBal)})
                                      </span>
                                    )}
                                  </span>
                                </div>
                              )}

                              {/* Botões de Ação */}
                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={handleCancelEditHistoryRecord}
                                  disabled={savingEditRecord}
                                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer transition-colors"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="submit"
                                  disabled={savingEditRecord || editRecordAmount.trim() === ""}
                                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                                >
                                  <Check size={14} strokeWidth={2.5} />
                                  <span>{savingEditRecord ? "Salvando..." : "Salvar Alterações"}</span>
                                </button>
                              </div>
                            </form>
                          );
                        }

                        return (
                          <div
                            key={record.id}
                            className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60 flex items-start justify-between gap-3 transition-all hover:border-slate-300 dark:hover:border-slate-700"
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

                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 break-words">
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

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEditHistoryRecord(record)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                                title="Editar este registro"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteHistoryRecord(record.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title="Excluir este ajuste e reverter o saldo"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
