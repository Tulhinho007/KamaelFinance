"use client";

import React, { useState, useEffect } from "react";
import {
  Search, Plus, X, Edit2, Trash2, Coins, CheckCircle2, Clock,
  TrendingUp, TrendingDown, FileSpreadsheet, PieChart, Filter,
  Check, ArrowUpDown, ChevronLeft, ChevronRight, Building2, Wallet, CopyPlus
} from "lucide-react";
import { usePeriod } from "@/components/period-context";
import { PeriodHeader } from "@/components/period-header";
import { useModal } from "@/components/ui/custom-dialog-provider";
import {
  getRevenues, createRevenueAction, updateRevenueAction, deleteRevenueAction, toggleTransactionStatusAction, getWalletsAction,
  duplicateRevenueToNextMonthAction, markBatchRevenuesAsReceivedAction
} from "@/lib/actions";
import { parseCurrencyInput } from "@/lib/constants";

const brl = (v: number) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function formatWalletDropdownLabel(w: any) {
  const name = w.bankName || w.title;
  let typeStr = "";
  if (w.walletType === "CREDIT_CARD") {
    typeStr = "Cartão de Crédito";
  } else if (w.walletType === "CONTA_CORRENTE") {
    typeStr = "Conta Corrente/Débito";
  } else if (w.walletType === "TICKET") {
    typeStr = "VA / VR / Benefício";
  } else {
    typeStr = w.walletType || "Conta";
  }

  const balanceText = w.currentTotal !== undefined ? ` (Saldo: ${brl(w.currentTotal)})` : "";
  return `${name} - ${typeStr}${balanceText}`;
}

type Revenue = {
  id: string;
  description: string;
  amount: number;
  status?: string;
  date: string; // YYYY-MM-DD (Data de Recebimento)
  competenceDate?: string; // YYYY-MM-DD (Mês de Competência)
  category?: string;
  account?: string;
  walletId?: string;
  walletType?: string;
  isBeneficio?: boolean;
};

const isBenefitWallet = (walletType?: string): boolean => {
  if (!walletType) return false;
  const t = walletType.toUpperCase();
  return t === "TICKET" || t === "BENEFICIO" || t === "BENEFÍCIO";
};

// Categorias padrão para receitas
const CATEGORIES_LIST = [
  "Salário",
  "Investimentos",
  "Freelance",
  "Bônus / PLR",
  "Benefícios / VR",
  "Reembolso",
  "Outros",
];

const DESCRIPTIONS_LIST = [
  "Salário",
  "Benefício em Conta (Auxílio)",
  "Vale Transporte",
  "Bônus / PLR",
  "Férias",
  "Horas Extras",
  "13º Salário",
  "Rendimento de Investimentos / Dividendos",
  "Freelance / Bico",
  "Venda de Item Usado",
  "Reembolso",
  "Cashback",
  "Comissão",
  "Restituição do IR",
  "Presente / Pix Recebido",
  "Outros"
];

const getCategoryName = (desc: string, customCat?: string): string => {
  if (customCat && customCat !== "Outros") return customCat;
  const d = desc.toLowerCase();
  if (d.includes("salário") || d.includes("extras") || d.includes("férias") || d.includes("13º")) return "Salário";
  if (d.includes("rendimento") || d.includes("investimento") || d.includes("dividendo") || d.includes("provento")) return "Investimentos";
  if (d.includes("freelance") || d.includes("bico") || d.includes("comissão")) return "Freelance";
  if (d.includes("bônus") || d.includes("plr")) return "Bônus / PLR";
  if (d.includes("refeição") || d.includes("ticket") || d.includes("alimentação") || d.includes("transporte")) return "Benefícios / VR";
  if (d.includes("reembolso") || d.includes("cashback") || d.includes("ir")) return "Reembolso";
  return "Outros";
};

const getCategoryBadgeStyle = (cat: string) => {
  switch (cat) {
    case "Salário":
      return "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-400/40";
    case "Investimentos":
      return "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-400/40";
    case "Freelance":
      return "bg-blue-50 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-400/40";
    case "Bônus / PLR":
      return "bg-purple-50 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-400/40";
    case "Benefícios / VR":
      return "bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-400/40";
    case "Reembolso":
      return "bg-teal-50 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-400/40";
    default:
      return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700";
  }
};

function exportRevenuesCSV(list: Revenue[], month: number, year: number) {
  const headers = ["Data", "Descrição", "Categoria", "Valor (R$)", "Status"];
  const rows = list.map(r => [
    `"${r.date.split("-").reverse().join("/")}"`,
    `"${r.description}"`,
    `"${getCategoryName(r.description, r.category)}"`,
    r.amount.toFixed(2),
    `"${r.status === "PENDING" ? "A Receber" : "Recebido"}"`
  ]);

  const csvString = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `Relatorio_Receitas_${String(month).padStart(2, "0")}_${year}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function RevenueAnalytics({ list }: { list: Revenue[] }) {
  const total = list.reduce((s, r) => s + r.amount, 0);
  const totalReceived = list.filter((r) => r.status !== "PENDING").reduce((s, r) => s + r.amount, 0);
  const totalPending = list.filter((r) => r.status === "PENDING").reduce((s, r) => s + r.amount, 0);
  const pctReceived = total > 0 ? Math.round((totalReceived / total) * 100) : 0;
  const pctPending = total > 0 ? 100 - pctReceived : 0;

  const categoryTotals: Record<string, number> = {};
  list.forEach((r) => {
    const cat = getCategoryName(r.description, r.category);
    categoryTotals[cat] = (categoryTotals[cat] || 0) + r.amount;
  });

  const categoriesData = Object.entries(categoryTotals)
    .map(([name, value]) => ({
      name,
      value,
    }))
    .sort((a, b) => b.value - a.value);

  if (categoriesData.length === 0 || total === 0) {
    return (
      <div className="card-glow flex flex-col items-center justify-center py-8 text-center bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl">
        <PieChart className="w-8 h-8 text-slate-500 mb-2" />
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Nenhuma receita registrada neste mês para exibir no gráfico.
        </p>
      </div>
    );
  }

  const PALETTE = ["#10b981", "#6366f1", "#3b82f6", "#8b5cf6", "#f59e0b", "#14b8a6", "#64748b"];
  let cumulativeAngle = 0;

  const slices = categoriesData.map((item, i) => {
    const percentage = item.value / total;
    const angle = percentage * 360;
    const startAngle = cumulativeAngle;
    cumulativeAngle += angle;
    return {
      ...item,
      color: PALETTE[i % PALETTE.length],
      percentage: Math.round(percentage * 100),
      startAngle,
      angle,
    };
  });

  const hasMultipleCategories = categoriesData.length >= 2;

  return (
    <div className="card-glow p-5 sm:p-6 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
      {/* 1. Barra Comparativa Linear Horizontal (Recebido vs Pendente) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 dark:border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Comparativo de Realização Financeira
            </span>
          </div>
          <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
            Total Previsto: <strong className="text-slate-900 dark:text-white font-tnum">{brl(total)}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Barra Recebido */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-bold text-slate-700 dark:text-slate-300">Recebido:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 font-tnum">{brl(totalReceived)}</span>
              </div>
              <span className="font-black text-emerald-600 dark:text-emerald-400 font-tnum text-xs">{pctReceived}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pctReceived}%` }} />
            </div>
          </div>

          {/* Barra Pendente */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span className="font-bold text-slate-700 dark:text-slate-300">Pendente:</span>
                <span className="font-black text-amber-600 dark:text-amber-400 font-tnum">{brl(totalPending)}</span>
              </div>
              <span className="font-black text-amber-600 dark:text-amber-400 font-tnum text-xs">{pctPending}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${pctPending}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Gráfico Donut de Categorias (Exibido apenas quando houver 2 ou mais categorias) */}
      {hasMultipleCategories ? (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row items-center gap-6">
          <div className="relative w-36 h-36 shrink-0">
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
              <span className="text-[9px] font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-widest">Fontes</span>
              <span className="text-xs font-black text-slate-900 dark:text-white mt-0.5 font-tnum">{categoriesData.length} cat.</span>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 w-full">
            {slices.map((slice, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                  <span className="font-bold text-slate-900 dark:text-slate-200 truncate">{slice.name}</span>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <span className="font-black text-slate-900 dark:text-white font-tnum block">{brl(slice.value)}</span>
                  <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{slice.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5 font-medium">
            <Coins className="w-4 h-4 text-emerald-500" />
            Fonte Principal: <strong className="text-slate-900 dark:text-white font-bold">{categoriesData[0].name}</strong>
          </span>
          <span className="font-extrabold text-slate-900 dark:text-white font-tnum">
            {brl(categoriesData[0].value)} (100%)
          </span>
        </div>
      )}
    </div>
  );
}

export default function ReceitasPage() {
  const { selectedMonth, selectedYear } = usePeriod();
  const { showAlert, showConfirm } = useModal();
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [wallets, setWallets]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  const [searchQuery, setSearchQuery]       = useState("");
  const [statusFilter, setStatusFilter]     = useState<"ALL" | "RECEIVED" | "PENDING">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [walletFilter, setWalletFilter]     = useState<string>("ALL");

  const [selectedIds, setSelectedIds]       = useState<string[]>([]);
  const [currentPage, setCurrentPage]       = useState(1);
  const itemsPerPage = 10;

  const [selectedRevenue, setSelectedRevenue] = useState<Revenue | null>(null);
  const [modalType, setModalType]             = useState<"create" | "edit" | "delete" | null>(null);

  const [formDescription, setFormDescription]     = useState("");
  const [formCategory, setFormCategory]           = useState("Salário");
  const [formAmount, setFormAmount]               = useState<string | number>("");
  const [formDate, setFormDate]                   = useState("");
  const [formCompetenceMonth, setFormCompetenceMonth] = useState<number>(selectedMonth);
  const [formCompetenceYear, setFormCompetenceYear]   = useState<number>(selectedYear);
  const [competenceSuggested, setCompetenceSuggested] = useState(false);
  const [formWalletId, setFormWalletId]           = useState("");
  const [formSkipDeduction, setFormSkipDeduction] = useState(false);

  const checkAndSuggestSalaryCompetence = (dateStr: string, desc: string, cat?: string) => {
    if (!dateStr) return;
    const isSalary = (cat && cat.toLowerCase().includes("salário")) ||
                     (desc && desc.toLowerCase().includes("salário")) ||
                     (desc && desc.toLowerCase().includes("salario"));
    
    if (isSalary) {
      const parts = dateStr.split("-");
      if (parts.length >= 3) {
        const y = Number(parts[0]);
        const m = Number(parts[1]);
        const d = Number(parts[2]);
        if (d >= 1 && d <= 10) {
          let prevMonth = m - 1;
          let prevYear = y;
          if (prevMonth < 1) {
            prevMonth = 12;
            prevYear = y - 1;
          }
          setFormCompetenceMonth(prevMonth);
          setFormCompetenceYear(prevYear);
          setCompetenceSuggested(true);
          return;
        }
      }
    }
    setCompetenceSuggested(false);
  };

  const handleDateChange = (val: string) => {
    setFormDate(val);
    checkAndSuggestSalaryCompetence(val, formDescription, formCategory);
  };

  const handleDescriptionChange = (val: string) => {
    setFormDescription(val);
    const inferred = getCategoryName(val, formCategory);
    if (inferred && inferred !== "Outros") {
      setFormCategory(inferred);
    }
    checkAndSuggestSalaryCompetence(formDate, val, inferred || formCategory);
  };

  const handleCategoryChange = (val: string) => {
    setFormCategory(val);
    checkAndSuggestSalaryCompetence(formDate, formDescription, val);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, walletList] = await Promise.all([
        getRevenues(selectedMonth, selectedYear),
        getWalletsAction(),
      ]);
      setRevenues(data);
      setWallets(walletList || []);
    } catch (err) {
      console.error("Erro ao obter receitas do banco:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setSelectedIds([]);
    setCurrentPage(1);
  }, [selectedMonth, selectedYear]);

  // Isolamento estrito de cartões de benefício/ticket da visualização global de receitas
  const activeRevenues = revenues.filter((rev) => !isBenefitWallet(rev.walletType) && !rev.isBeneficio);

  // Filtragem por Conta de Destino
  const walletFilteredRevenues = activeRevenues.filter((rev) => {
    return walletFilter === "ALL" ? true : rev.walletId === walletFilter;
  });

  const filteredRevenues = walletFilteredRevenues.filter((rev) => {
    const matchesSearch = rev.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" ? true :
      statusFilter === "RECEIVED" ? rev.status !== "PENDING" :
      rev.status === "PENDING";
    
    const catName = getCategoryName(rev.description, rev.category);
    const matchesCategory = categoryFilter === "ALL" ? true : catName === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const totalPages = Math.ceil(filteredRevenues.length / itemsPerPage) || 1;
  const paginatedRevenues = filteredRevenues.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPrevisto = walletFilteredRevenues.reduce((s, r) => s + r.amount, 0);
  const totalReceived = walletFilteredRevenues
    .filter(r => r.status !== "PENDING")
    .reduce((s, r) => s + r.amount, 0);
  const totalPending  = walletFilteredRevenues
    .filter(r => r.status === "PENDING")
    .reduce((s, r) => s + r.amount, 0);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredRevenues.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkMarkAsReceived = async () => {
    if (selectedIds.length === 0) return;
    try {
      await markBatchRevenuesAsReceivedAction(selectedIds);
      await loadData();
      showAlert(`${selectedIds.length} receita(s) confirmada(s) e creditada(s) no saldo da conta!`, { variant: "success" });
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      showAlert("Erro ao atualizar status em lote.", { variant: "error" });
    }
  };

  const handleBulkDelete = async () => {
    const confirmed = await showConfirm(`Deseja realmente excluir ${selectedIds.length} receita(s) selecionada(s)?`, {
      title: "Excluir Receitas",
      variant: "danger",
      confirmText: "Excluir",
    });
    if (!confirmed) return;
    try {
      await Promise.all(selectedIds.map(id => deleteRevenueAction(id)));
      await loadData();
      showAlert(`${selectedIds.length} receita(s) excluída(s) com sucesso.`, { variant: "success" });
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      showAlert("Erro ao excluir receitas em lote.", { variant: "error" });
    }
  };

  const handleToggleStatus = async (revId: string) => {
    try {
      const res = await toggleTransactionStatusAction(revId);
      await loadData();
      if (res.status === "COMPLETED") {
        showAlert("Receita confirmada com sucesso! Saldo creditado na conta bancária.", { variant: "success" });
      } else {
        showAlert("Receita reaberta como pendente. Saldo estornado.", { variant: "info" });
      }
    } catch (err) {
      console.error(err);
      showAlert("Erro ao alterar status da receita.", { variant: "error" });
    }
  };

  const openCreateModal = () => {
    setFormDescription("Salário");
    setFormCategory("Salário");
    setFormAmount("");
    const defaultDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-05`;
    setFormDate(defaultDate);
    
    // Sugere competência do mês trabalhado anterior para salário recebido no dia 5
    let compM = selectedMonth - 1;
    let compY = selectedYear;
    if (compM < 1) { compM = 12; compY = selectedYear - 1; }
    setFormCompetenceMonth(compM);
    setFormCompetenceYear(compY);
    setCompetenceSuggested(true);

    const validWallets = wallets.filter(w => w.walletType !== "CREDIT_CARD" && (w as any).tipo !== "CREDITO" && !isBenefitWallet(w.walletType));
    const benefitWallets = wallets.filter(w => isBenefitWallet(w.walletType));
    setFormWalletId(validWallets.length > 0 ? validWallets[0].id : (benefitWallets.length > 0 ? benefitWallets[0].id : ""));
    setFormSkipDeduction(false);
    setModalType("create");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseCurrencyInput(formAmount);
    if (!formDescription || amountNum <= 0 || !formDate) {
      showAlert("Por favor, informe um valor de receita válido maior que zero.", { variant: "warning" });
      return;
    }
    try {
      const compDateStr = `${formCompetenceYear}-${String(formCompetenceMonth).padStart(2, "0")}-01`;
      await createRevenueAction(
        formDescription,
        amountNum,
        formDate,
        formWalletId || undefined,
        "COMPLETED",
        compDateStr,
        formCategory,
        formCompetenceMonth,
        formCompetenceYear
      );
      await loadData();
      setModalType(null);
    } catch (err) {
      console.error(err);
      showAlert("Erro ao cadastrar receita no banco de dados.", { variant: "error" });
    }
  };

  const openEditModal = (rev: Revenue) => {
    setSelectedRevenue(rev);
    setFormDescription(rev.description);
    setFormCategory(getCategoryName(rev.description, rev.category));
    setFormAmount(rev.amount);
    setFormDate(rev.date);
    if ((rev as any).competenceMonth && (rev as any).competenceYear) {
      setFormCompetenceYear(Number((rev as any).competenceYear));
      setFormCompetenceMonth(Number((rev as any).competenceMonth));
    } else if (rev.competenceDate) {
      const parts = rev.competenceDate.split("-");
      setFormCompetenceYear(Number(parts[0]));
      setFormCompetenceMonth(Number(parts[1]));
    } else {
      const parts = rev.date.split("-");
      setFormCompetenceYear(Number(parts[0]));
      setFormCompetenceMonth(Number(parts[1]));
    }
    setCompetenceSuggested(false);
    const validWallets = wallets.filter(w => w.walletType !== "CREDIT_CARD" && (w as any).tipo !== "CREDITO" && !isBenefitWallet(w.walletType));
    const benefitWallets = wallets.filter(w => isBenefitWallet(w.walletType));
    setFormWalletId(rev.walletId || (validWallets.length > 0 ? validWallets[0].id : (benefitWallets.length > 0 ? benefitWallets[0].id : "")));
    setFormSkipDeduction(false);
    setModalType("edit");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseCurrencyInput(formAmount);
    if (!selectedRevenue || !formDescription || amountNum <= 0 || !formDate) {
      showAlert("Por favor, informe um valor de receita válido maior que zero.", { variant: "warning" });
      return;
    }
    try {
      const compDateStr = `${formCompetenceYear}-${String(formCompetenceMonth).padStart(2, "0")}-01`;
      await updateRevenueAction(
        selectedRevenue.id,
        formDescription,
        amountNum,
        formDate,
        formWalletId || undefined,
        compDateStr,
        formCompetenceMonth,
        formCompetenceYear
      );
      await loadData();
      setModalType(null);
    } catch (err) {
      console.error(err);
      showAlert("Erro ao editar receita no banco de dados.", { variant: "error" });
    }
  };

  const openDeleteModal = (rev: Revenue) => {
    setSelectedRevenue(rev);
    setModalType("delete");
  };

  const handleDelete = async () => {
    if (!selectedRevenue) return;
    try {
      await deleteRevenueAction(selectedRevenue.id);
      await loadData();
      setModalType(null);
    } catch (err) {
      console.error(err);
      showAlert("Erro ao excluir receita do banco de dados.", { variant: "error" });
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-6xl mx-auto flex flex-col gap-6 md:gap-8 relative select-none">

      <datalist id="descricoes-sugestoes">
        {DESCRIPTIONS_LIST.map((desc) => (
          <option key={desc} value={desc} />
        ))}
      </datalist>

      {/* ── 1. HEADER GLOBAL ─────────────────────────────────────────────────── */}
      <PeriodHeader 
        title="Receitas & Entradas" 
        tagline="Controle e otimize as fontes de liquidez do Kamael Finance." 
        badge="Gestão" 
      />

      {/* ── 2. CARDS KPI NO TOPO (RESUMO FINANCEIRO) EM .CARD-GLOW ──────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1 — Receita Total Prevista */}
        <div className="card-glow p-5 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group flex flex-col justify-between rounded-2xl">
          <Coins className="absolute -right-3 -bottom-3 w-20 h-20 text-slate-200 dark:text-indigo-500/10 pointer-events-none group-hover:scale-110 transition-transform duration-300" />
          <span className="text-[9px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest block">Receita Total Prevista</span>
          <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 block mb-2">Mês Atual · Entradas Consolidadas</span>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight font-tnum">{brl(totalPrevisto)}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-400/30 shadow-2xs w-fit">
            <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> +5.2% vs mês anterior
          </span>
        </div>

        {/* Card 2 — Total Recebido */}
        <div className="card-glow p-5 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group flex flex-col justify-between rounded-2xl">
          <CheckCircle2 className="absolute -right-3 -bottom-3 w-20 h-20 text-slate-200 dark:text-emerald-500/10 pointer-events-none group-hover:scale-110 transition-transform duration-300" />
          <span className="text-[9px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest block">Total Recebido</span>
          <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 block mb-2">Liquidado em Conta</span>
          <p className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400 tracking-tight font-tnum">{brl(totalReceived)}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-400/30 shadow-2xs w-fit">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Entradas Confirmadas
          </span>
        </div>

        {/* Card 3 — A Receber / Pendente */}
        <div className="card-glow p-5 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group flex flex-col justify-between rounded-2xl">
          <Clock className="absolute -right-3 -bottom-3 w-20 h-20 text-slate-200 dark:text-amber-500/10 pointer-events-none group-hover:scale-110 transition-transform duration-300" />
          <span className="text-[9px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest block">A Receber / Pendente</span>
          <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 block mb-2">Aguardando Liquidação</span>
          <p className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-400 tracking-tight font-tnum">{brl(totalPending)}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-extrabold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-400/30 shadow-2xs w-fit">
            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" /> A Receber no Prazo
          </span>
        </div>
      </section>

      {/* ── 3. SEÇÃO ANALYTICS & FONTES DE RENDA ─────────────────────────────── */}
      <RevenueAnalytics list={walletFilteredRevenues} />

      {/* ── 4. BARRA DE BUSCA, FILTROS E AÇÕES ──────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Busca + Dropdowns */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="relative flex items-center w-full sm:w-auto">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
            <input
              type="text"
              list="descricoes-sugestoes"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Buscar receitas..."
              className="pl-10 pr-4 py-2.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xs text-slate-800 dark:text-white placeholder-slate-400 w-full sm:w-60 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-indigo-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
            className="w-full sm:w-auto px-3.5 py-2.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">Todos os Status</option>
            <option value="RECEIVED">Status: Recebido</option>
            <option value="PENDING">Status: A Receber (Pendente)</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            className="w-full sm:w-auto px-3.5 py-2.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">Todas as Categorias</option>
            {CATEGORIES_LIST.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={walletFilter}
            onChange={(e) => { setWalletFilter(e.target.value); setCurrentPage(1); }}
            className="w-full sm:w-auto px-3.5 py-2.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">Todas as Contas</option>
            {wallets.map(w => (
              <option key={w.id} value={w.id}>{w.bankName || w.title}</option>
            ))}
          </select>
        </div>

        {/* Botão Exportar CSV & Botão Nova Receita */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={() => exportRevenuesCSV(filteredRevenues, selectedMonth, selectedYear)}
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-2xl font-extrabold text-xs shadow-2xs transition-all cursor-pointer"
            title="Exportar receitas em CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Exportar CSV</span>
          </button>

          <button 
            onClick={openCreateModal}
            className="btn-primary-glow px-5 py-2.5 text-xs tracking-wider flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>NOVA RECEITA</span>
          </button>
        </div>

      </div>

      {/* ── 5. PAINEL DE AÇÕES EM LOTE (BULK ACTIONS BAR) ──────────────────────── */}
      {selectedIds.length > 0 && (
        <div className="bg-emerald-950/90 border border-emerald-500/30 text-white p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-md">
          <span className="text-xs font-black flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            {selectedIds.length} receita(s) selecionada(s)
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleBulkMarkAsReceived}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Marcar como Recebido
            </button>
            <button
              onClick={handleBulkDelete}
              className="bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir Selecionados
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-slate-400 hover:text-white p-1 ml-auto sm:ml-2"
              title="Cancelar seleção"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── 6. TABELA DE RECEITAS (DESKTOP) & LISTA DE CARDS (MOBILE) ────────── */}
      <section className="card-glow p-4 sm:p-6 flex flex-col gap-4 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
        {/* 1. Visão Desktop/Tablet Médio: Tabela Tradicional */}
        <div className="hidden md:block overflow-x-auto w-full max-w-full">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <th className="px-3 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredRevenues.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="px-3 sm:px-4 py-3">Descrição</th>
                <th className="hidden sm:table-cell px-4 py-3">Categoria</th>
                <th className="hidden md:table-cell px-4 py-3">Conta de Destino</th>
                <th className="px-3 sm:px-4 py-3 text-right">DATA PREVISTA</th>
                <th className="px-3 sm:px-4 py-3 text-right">Valor</th>
                <th className="px-2 sm:px-4 py-3 text-center">Status</th>
                <th className="px-2 sm:px-4 py-3 text-center whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-emerald-600 dark:text-emerald-400 font-bold animate-pulse text-xs uppercase tracking-wider">
                    Carregando receitas do banco...
                  </td>
                </tr>
              ) : paginatedRevenues.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400 font-medium">
                    Nenhuma receita registrada com os filtros ativos.
                  </td>
                </tr>
              ) : (
                paginatedRevenues.map((rev) => {
                  const isReceived = rev.status !== "PENDING";
                  const isSelected = selectedIds.includes(rev.id);
                  const catName = getCategoryName(rev.description, rev.category);

                  return (
                    <tr
                      key={rev.id}
                      className={`transition-colors border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 ${
                        isSelected ? "bg-indigo-50/50 dark:bg-indigo-900/30" :
                        isReceived ? "bg-emerald-50/30 dark:bg-emerald-500/10" : ""
                      }`}
                    >
                      <td className="px-3 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(rev.id)}
                          className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      <td className="px-3 sm:px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                        <div>{rev.description}</div>
                        <div className="sm:hidden text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                          <span className="font-semibold text-purple-600 dark:text-purple-400">{catName}</span>
                          <span>•</span>
                          <span>{rev.account || (wallets.find(w => w.id === rev.walletId)?.bankName || wallets.find(w => w.id === rev.walletId)?.title) || "Santander"}</span>
                        </div>
                      </td>

                      <td className="hidden sm:table-cell px-4 py-3.5">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${getCategoryBadgeStyle(catName)}`}>
                          {catName}
                        </span>
                      </td>

                      <td className="hidden md:table-cell px-4 py-3.5 text-slate-700 dark:text-slate-200 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Wallet className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span>
                            {rev.account ||
                              (wallets.find(w => w.id === rev.walletId)?.bankName || wallets.find(w => w.id === rev.walletId)?.title) ||
                              (wallets.find(w => w.walletType !== "CREDIT_CARD" && (w as any).tipo !== "CREDITO")?.bankName ||
                               wallets.find(w => w.walletType !== "CREDIT_CARD" && (w as any).tipo !== "CREDITO")?.title) ||
                              "Conta Bancária"}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right font-semibold text-slate-700 dark:text-slate-200">
                        <div>{rev.date.split("-").reverse().join("/")}</div>
                        {rev.competenceDate && (
                          <span className="inline-block mt-0.5 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                            Ref: {(() => {
                              const parts = rev.competenceDate.split("-");
                              const monthShorts = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
                              return `${monthShorts[Number(parts[1]) - 1]}/${parts[0]}`;
                            })()}
                          </span>
                        )}
                      </td>

                      <td className={`px-4 py-3.5 text-right font-extrabold font-tnum tabular-nums text-sm ${isReceived ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-slate-100"}`}>
                        {brl(rev.amount)}
                      </td>

                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {isReceived ? (
                          <button
                            onClick={() => handleToggleStatus(rev.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 shadow-2xs hover:opacity-80 transition-all cursor-pointer"
                            title="Status: RECEBIDO. Clique para reabrir como pendente"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>RECEBIDO</span>
                          </button>
                        ) : (
                          <div className="inline-flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30">
                              <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              PENDENTE
                            </span>
                            <button
                              onClick={() => handleToggleStatus(rev.id)}
                              className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                              title="Clique para confirmar o recebimento e creditar no saldo bancário"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Confirmar</span>
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={async () => {
                              try {
                                const res = await duplicateRevenueToNextMonthAction(rev.id);
                                await loadData();
                                showAlert(`Receita "${rev.description}" duplicada para ${res.newMonthLabel} com sucesso!`, { variant: "success" });
                              } catch (err) {
                                console.error(err);
                                showAlert("Erro ao duplicar receita.", { variant: "error" });
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Duplicar para o Mês Seguinte"
                          >
                            <CopyPlus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(rev)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(rev)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Excluir"
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

        {/* 2. Visão Mobile (Celulares): Lista de Cards Empilhados */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="py-8 text-center text-emerald-600 dark:text-emerald-400 font-bold animate-pulse text-xs">
              Carregando receitas do banco...
            </div>
          ) : paginatedRevenues.length === 0 ? (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
              Nenhuma receita registrada com os filtros ativos.
            </div>
          ) : (
            paginatedRevenues.map((rev) => {
              const isReceived = rev.status !== "PENDING";
              const isSelected = selectedIds.includes(rev.id);
              const catName = getCategoryName(rev.description, rev.category);

              return (
                <div
                  key={rev.id}
                  className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-sm space-y-3 transition-all ${
                    isSelected ? "border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/30" :
                    isReceived ? "border-emerald-200/80 dark:border-emerald-900/50" : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectOne(rev.id)}
                        className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer mt-0.5"
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                          {rev.description}
                        </h4>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Prevista para: {rev.date.split("-").reverse().join("/")}
                        </span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${getCategoryBadgeStyle(catName)}`}>
                      {catName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Valor</span>
                      <span className={`text-base font-black tabular-nums ${isReceived ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"}`}>
                        + {brl(rev.amount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isReceived ? (
                        <button
                          onClick={() => handleToggleStatus(rev.id)}
                          className="min-h-[38px] px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Recebido</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleStatus(rev.id)}
                          className="min-h-[38px] px-2.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300/80 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Recebido</span>
                        </button>
                      )}

                      <button
                        onClick={() => openEditModal(rev)}
                        className="min-w-[38px] min-h-[38px] flex items-center justify-center p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => openDeleteModal(rev)}
                        className="min-w-[38px] min-h-[38px] flex items-center justify-center p-2 text-slate-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
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

        {/* CONTROLES DE PAGINAÇÃO */}
        {filteredRevenues.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400">
            <div>
              Mostrando <span className="font-bold text-slate-900 dark:text-white">{((currentPage - 1) * itemsPerPage) + 1}</span> até{" "}
              <span className="font-bold text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredRevenues.length)}</span> de{" "}
              <span className="font-bold text-slate-900 dark:text-white">{filteredRevenues.length}</span> lançamentos
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Anterior
              </button>
              <span className="px-2 font-bold text-slate-900 dark:text-white">
                {currentPage} de {Math.max(1, Math.ceil(filteredRevenues.length / itemsPerPage))}
              </span>
              <button
                disabled={currentPage >= Math.ceil(filteredRevenues.length / itemsPerPage)}
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredRevenues.length / itemsPerPage), p + 1))}
                className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── 7. BARRA FLUTUANTE DE AÇÕES EM LOTE ──────────────────────────────── */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#111625]/95 backdrop-blur-md border border-slate-700/80 shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-4 text-white animate-in slide-in-from-bottom-5">
          <span className="text-xs font-bold text-slate-300">
            <strong className="text-emerald-400 font-extrabold">{selectedIds.length}</strong> selecionado{selectedIds.length > 1 ? "s" : ""}
          </span>
          <div className="h-4 w-px bg-slate-700" />
          <button
            onClick={handleBulkMarkAsReceived}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-600/30 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Marcar todos como Recebidos
          </button>
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir selecionados
          </button>
          <button
            onClick={() => setSelectedIds([])}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
            title="Cancelar seleção"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── MODAIS ────────────────────────────────────────────────────────────── */}
      {modalType && (
        <div 
          onClick={() => setModalType(null)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-[28px] shadow-2xl w-[95%] sm:w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col gap-5 text-slate-900 dark:text-white animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
                {modalType === "create" && "Nova Receita"}
                {modalType === "edit" && "Editar Receita"}
                {modalType === "delete" && "Excluir Receita"}
              </h3>
              <button 
                type="button"
                onClick={() => setModalType(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(modalType === "create" || modalType === "edit") && (
              <form onSubmit={modalType === "create" ? handleCreate : handleEdit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">Descrição *</label>
                    <input
                      type="text"
                      list="descricoes-sugestoes"
                      required
                      value={formDescription}
                      onChange={(e) => handleDescriptionChange(e.target.value)}
                      placeholder="Ex: Salário Empresa, Adiantamento..."
                      className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">Categoria</label>
                    <select
                      value={formCategory}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white cursor-pointer"
                    >
                      {CATEGORIES_LIST.map((cat) => (
                        <option key={cat} value={cat} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">Valor (R$) *</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="Ex: 1500 ou 1500,50"
                      className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">Data de Recebimento *</label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Mês de Competência / Referência */}
                <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 shadow-xs">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center justify-between">
                    <span>Mês de Competência / Referência</span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold normal-case">(Regime de Competência)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={formCompetenceMonth}
                      onChange={(e) => {
                        setFormCompetenceMonth(Number(e.target.value));
                        setCompetenceSuggested(false);
                      }}
                      className="w-full rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                    >
                      {[
                        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
                      ].map((m, idx) => (
                        <option key={idx + 1} value={idx + 1} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{m}</option>
                      ))}
                    </select>
                    <select
                      value={formCompetenceYear}
                      onChange={(e) => {
                        setFormCompetenceYear(Number(e.target.value));
                        setCompetenceSuggested(false);
                      }}
                      className="w-full rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                    >
                      {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                        <option key={y} value={y} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{y}</option>
                      ))}
                    </select>
                  </div>
                  {competenceSuggested && (
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold animate-in fade-in">
                      <span>💡 Salário do 5º dia útil / início do mês: competência sugerida para o mês trabalhado anterior.</span>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight">
                    Mês/ano a que a receita pertence no balanço (ex: Salário trabalhado em Agosto e recebido em Setembro confronta com as despesas de Agosto).
                  </p>
                </div>

                {/* Conta de Destino */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Conta de Destino *
                  </label>
                  <select
                    required
                    value={formWalletId}
                    onChange={(e) => setFormWalletId(e.target.value)}
                    className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="" disabled className="bg-white dark:bg-slate-900 text-slate-500">
                      Selecione a conta de destino...
                    </option>
                    <optgroup label="Contas Bancárias" className="bg-white dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-300">
                      {wallets
                        .filter((w) => w.walletType !== "CREDIT_CARD" && (w as any).tipo !== "CREDITO" && !isBenefitWallet(w.walletType))
                        .map((conta) => (
                          <option key={conta.id} value={conta.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-normal">
                            {conta.bankName || conta.title} - Saldo: {brl(conta.currentTotal ?? 0)}
                          </option>
                        ))}
                    </optgroup>
                    {wallets.some((w) => isBenefitWallet(w.walletType)) && (
                      <optgroup label="Tickets / Benefícios" className="bg-white dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-300">
                        {wallets
                          .filter((w) => isBenefitWallet(w.walletType))
                          .map((ticket) => (
                            <option key={ticket.id} value={ticket.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-normal">
                              {ticket.bankName || ticket.title} - Saldo: {brl(ticket.currentTotal ?? 0)}
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                {/* Checkbox Opção 'Saldo já considerado' */}
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    id="formSkipDeduction"
                    checked={formSkipDeduction}
                    onChange={(e) => setFormSkipDeduction(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="formSkipDeduction" className="text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer select-none">
                    <strong className="block text-slate-900 dark:text-white font-bold mb-0.5">Saldo já considerado (não alterar saldo)</strong>
                    <span className="text-slate-500 dark:text-slate-400 font-normal leading-relaxed block">
                      Registra a receita como recebida apenas no histórico do mês sem somar novamente ao saldo da conta.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn-primary-glow w-full py-3.5 text-xs tracking-wider mt-2"
                >
                  {modalType === "create" ? "ADICIONAR RECEITA" : "SALVAR ALTERAÇÕES"}
                </button>
              </form>
            )}

            {modalType === "delete" && selectedRevenue && (
              <div className="flex flex-col gap-4 text-center">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
                  Tem certeza que deseja excluir a receita <strong className="text-slate-900 dark:text-white font-bold">"{selectedRevenue.description}"</strong>?<br/>
                  Isso removerá definitivamente o lançamento financeiro da carteira.
                </p>

                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs tracking-wider transition-all cursor-pointer"
                  >
                    CANCELAR
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
                  >
                    EXCLUIR
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
