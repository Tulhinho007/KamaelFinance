"use client";

import React, { useState, useEffect } from "react";
import {
  Search, Plus, X, Edit2, Trash2, Coins, CheckCircle2, Clock,
  TrendingUp, TrendingDown, FileSpreadsheet, PieChart, Filter,
  Check, ArrowUpDown, ChevronLeft, ChevronRight, Building2, Wallet
} from "lucide-react";
import { usePeriod } from "@/components/period-context";
import { PeriodHeader } from "@/components/period-header";
import {
  getRevenues, createRevenueAction, updateRevenueAction, deleteRevenueAction, toggleTransactionStatusAction
} from "@/lib/actions";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Revenue = {
  id: string;
  description: string;
  amount: number;
  status?: string;
  date: string; // YYYY-MM-DD
  category?: string;
  account?: string;
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
  "Vale Refeição / Ticket Alimentação",
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

// Helper para categorizar a receita a partir da descrição se não estiver definida
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

// Helper para estilo visual da badge por Categoria
const getCategoryBadgeStyle = (cat: string) => {
  switch (cat) {
    case "Salário":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200/60";
    case "Investimentos":
      return "bg-indigo-50 text-indigo-700 border border-indigo-200/60";
    case "Freelance":
      return "bg-blue-50 text-blue-700 border border-blue-200/60";
    case "Bônus / PLR":
      return "bg-purple-50 text-purple-700 border border-purple-200/60";
    case "Benefícios / VR":
      return "bg-amber-50 text-amber-700 border border-amber-200/60";
    case "Reembolso":
      return "bg-teal-50 text-teal-700 border border-teal-200/60";
    default:
      return "bg-slate-50 text-slate-700 border border-slate-200/60";
  }
};

// Helper para exportar CSV de receitas
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

// ─── Componente Donut Chart de Fontes de Renda ──────────────────────────────
function RevenueDonutChart({ list }: { list: Revenue[] }) {
  const total = list.reduce((s, r) => s + r.amount, 0);

  // Agrupa valores por Categoria
  const categoryTotals: Record<string, number> = {};
  list.forEach(r => {
    const cat = getCategoryName(r.description, r.category);
    categoryTotals[cat] = (categoryTotals[cat] || 0) + r.amount;
  });

  const categoriesData = Object.entries(categoryTotals).map(([name, value]) => ({
    name,
    value,
  })).sort((a, b) => b.value - a.value);

  if (categoriesData.length === 0 || total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
        <PieChart className="w-8 h-8 text-slate-300 mb-2" />
        <p className="text-xs font-semibold text-slate-400">Nenhuma receita registrada neste mês para exibir no gráfico.</p>
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

  return (
    <div className="flex flex-col md:flex-row items-center gap-6 p-5 bg-white rounded-[28px] border border-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)]">
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
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Previsto</span>
          <span className="text-xs font-black text-slate-800 mt-0.5">{brl(total)}</span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 w-full">
        {slices.map((slice, i) => (
          <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 shadow-2xs text-xs">
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
export default function ReceitasPage() {
  const { selectedMonth, selectedYear } = usePeriod();
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [loading, setLoading]   = useState(true);

  // Filtros Locais
  const [searchQuery, setSearchQuery]       = useState("");
  const [statusFilter, setStatusFilter]     = useState<"ALL" | "RECEIVED" | "PENDING">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Seleção em lote (Bulk Select)
  const [selectedIds, setSelectedIds]       = useState<string[]>([]);

  // Paginação
  const [currentPage, setCurrentPage]       = useState(1);
  const itemsPerPage = 10;

  // Estados dos Modais
  const [selectedRevenue, setSelectedRevenue] = useState<Revenue | null>(null);
  const [modalType, setModalType]             = useState<"create" | "edit" | "delete" | null>(null);

  // Form Fields State
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount]           = useState(0);
  const [formDate, setFormDate]               = useState("");

  // --- CARREGAMENTO DO BANCO DE DADOS ---
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getRevenues(selectedMonth, selectedYear);
      setRevenues(data);
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

  // --- FILTRAGEM ---
  const filteredRevenues = revenues.filter((rev) => {
    const matchesSearch = rev.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" ? true :
      statusFilter === "RECEIVED" ? rev.status !== "PENDING" :
      rev.status === "PENDING";
    
    const catName = getCategoryName(rev.description, rev.category);
    const matchesCategory = categoryFilter === "ALL" ? true : catName === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // --- PAGINAÇÃO ---
  const totalPages = Math.ceil(filteredRevenues.length / itemsPerPage) || 1;
  const paginatedRevenues = filteredRevenues.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // --- KPIs DE TOP ---
  const totalPrevisto = revenues.reduce((s, r) => s + r.amount, 0);
  const totalReceived = revenues
    .filter(r => r.status !== "PENDING")
    .reduce((s, r) => s + r.amount, 0);
  const totalPending  = revenues
    .filter(r => r.status === "PENDING")
    .reduce((s, r) => s + r.amount, 0);

  // --- SELEÇÃO EM LOTE ---
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
    try {
      await Promise.all(selectedIds.map(id => toggleTransactionStatusAction(id)));
      await loadData();
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar status em lote.");
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Deseja realmente excluir ${selectedIds.length} receita(s) selecionada(s)?`)) return;
    try {
      await Promise.all(selectedIds.map(id => deleteRevenueAction(id)));
      await loadData();
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir receitas em lote.");
    }
  };

  // --- HANDLERS INDIVIDUAIS ---
  const handleToggleStatus = async (revId: string) => {
    try {
      await toggleTransactionStatusAction(revId);
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao alterar status da receita.");
    }
  };

  const openCreateModal = () => {
    setFormDescription("");
    setFormAmount(0);
    const defaultDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
    setFormDate(defaultDate);
    setModalType("create");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription || formAmount <= 0 || !formDate) return;
    try {
      await createRevenueAction(formDescription, formAmount, formDate);
      await loadData();
      setModalType(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao cadastrar receita no banco de dados.");
    }
  };

  const openEditModal = (rev: Revenue) => {
    setSelectedRevenue(rev);
    setFormDescription(rev.description);
    setFormAmount(rev.amount);
    setFormDate(rev.date);
    setModalType("edit");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRevenue || !formDescription || formAmount <= 0 || !formDate) return;
    try {
      await updateRevenueAction(selectedRevenue.id, formDescription, formAmount, formDate);
      await loadData();
      setModalType(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao editar receita no banco de dados.");
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
      alert("Erro ao excluir receita do banco de dados.");
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto flex flex-col gap-8 relative select-none">

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

      {/* ── 2. CARDS KPI NO TOPO (RESUMO FINANCEIRO) ─────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1 — Receita Total Prevista */}
        <div className="bg-white rounded-[28px] border border-white/80 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.03)] relative overflow-hidden group hover:shadow-[0_15px_40px_rgba(99,102,241,0.08)] transition-all duration-300">
          <Coins className="absolute -right-3 -bottom-3 w-20 h-20 text-indigo-100/70 pointer-events-none group-hover:scale-110 transition-transform duration-300" />
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Receita Total Prevista</span>
          <span className="text-[9px] font-bold text-slate-400 block mb-2">Mês Atual · Entradas Consolidadas</span>
          <p className="text-2xl font-black text-slate-800 tracking-tight">{brl(totalPrevisto)}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
            <TrendingUp className="w-3 h-3" /> +5.2% vs mês anterior
          </span>
        </div>

        {/* Card 2 — Total Recebido */}
        <div className="bg-white rounded-[28px] border border-white/80 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.03)] relative overflow-hidden group hover:shadow-[0_15px_40px_rgba(16,185,129,0.08)] transition-all duration-300">
          <CheckCircle2 className="absolute -right-3 -bottom-3 w-20 h-20 text-emerald-100 pointer-events-none group-hover:scale-110 transition-transform duration-300" />
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Total Recebido</span>
          <span className="text-[9px] font-bold text-slate-400 block mb-2">Liquidado em Conta</span>
          <p className="text-2xl font-black text-emerald-600 tracking-tight">{brl(totalReceived)}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Entradas Confirmadas
          </span>
        </div>

        {/* Card 3 — A Receber / Pendente */}
        <div className="bg-white rounded-[28px] border border-white/80 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.03)] relative overflow-hidden group hover:shadow-[0_15px_40px_rgba(245,158,11,0.08)] transition-all duration-300">
          <Clock className="absolute -right-3 -bottom-3 w-20 h-20 text-amber-100 pointer-events-none group-hover:scale-110 transition-transform duration-300" />
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">A Receber / Pendente</span>
          <span className="text-[9px] font-bold text-slate-400 block mb-2">Aguardando Liquidação</span>
          <p className="text-2xl font-black text-amber-500 tracking-tight">{brl(totalPending)}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
            <Clock className="w-3 h-3 text-amber-500" /> A Pagar no Prazo
          </span>
        </div>
      </section>

      {/* ── 3. SEÇÃO DONUT CHART DE FONTES DE RENDA ────────────────────────────── */}
      <RevenueDonutChart list={revenues} />

      {/* ── 4. BARRA DE BUSCA, FILTROS E AÇÕES ──────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Busca + Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Input Busca */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
            <input
              type="text"
              list="descricoes-sugestoes"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Buscar receitas..."
              className="pl-10 pr-4 py-2.5 text-xs font-semibold bg-white border border-slate-200/80 rounded-2xl shadow-2xs text-slate-700 w-48 sm:w-60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Filter Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
            className="px-3.5 py-2.5 text-xs font-semibold bg-white border border-slate-200/80 rounded-2xl shadow-2xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
          >
            <option value="ALL">Todos os Status</option>
            <option value="RECEIVED">Status: Recebido</option>
            <option value="PENDING">Status: A Receber (Pendente)</option>
          </select>

          {/* Filter Categoria Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            className="px-3.5 py-2.5 text-xs font-semibold bg-white border border-slate-200/80 rounded-2xl shadow-2xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
          >
            <option value="ALL">Todas as Categorias</option>
            {CATEGORIES_LIST.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Botão Exportar CSV & Botão Nova Receita */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => exportRevenuesCSV(filteredRevenues, selectedMonth, selectedYear)}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-2xl font-extrabold text-xs shadow-2xs transition-all cursor-pointer"
            title="Exportar receitas em CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar CSV</span>
          </button>

          <button 
            onClick={openCreateModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl shadow-md shadow-emerald-600/20 transition-all font-extrabold text-xs tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>NOVA RECEITA</span>
          </button>
        </div>

      </div>

      {/* ── 5. PAINEL DE AÇÕES EM LOTE (BULK ACTIONS BAR) ──────────────────────── */}
      {selectedIds.length > 0 && (
        <div className="bg-emerald-900 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-150">
          <span className="text-xs font-extrabold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            {selectedIds.length} receita(s) selecionada(s)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkMarkAsReceived}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Marcar como Recebido
            </button>
            <button
              onClick={handleBulkDelete}
              className="bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir Selecionados
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-slate-300 hover:text-white p-1 ml-2"
              title="Cancelar seleção"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── 6. TABELA DE RECEITAS REDESENHADA ───────────────────────────────────── */}
      <section className="bg-white rounded-[28px] border border-white/80 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.03)] flex flex-col gap-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 font-extrabold uppercase tracking-wider border-b border-slate-100">
                <th className="px-3 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredRevenues.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Conta de Destino</th>
                <th className="px-4 py-3 text-right">Data</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-emerald-600 font-bold animate-pulse text-xs uppercase tracking-wider">
                    Carregando receitas do banco...
                  </td>
                </tr>
              ) : paginatedRevenues.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400 font-medium">
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
                      className={`transition-colors ${
                        isSelected ? "bg-indigo-50/40" :
                        isReceived ? "bg-emerald-50/15 hover:bg-emerald-50/30" : "hover:bg-slate-50/50"
                      }`}
                    >
                      {/* Checkbox de Seleção */}
                      <td className="px-3 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(rev.id)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Descrição */}
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {rev.description}
                      </td>

                      {/* Categoria (Badge Separada) */}
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${getCategoryBadgeStyle(catName)}`}>
                          {catName}
                        </span>
                      </td>

                      {/* Conta de Destino */}
                      <td className="px-4 py-3.5 text-slate-600 font-semibold flex items-center gap-1.5 mt-1">
                        <Wallet className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{rev.account || "Conta Principal"}</span>
                      </td>

                      {/* Data */}
                      <td className="px-4 py-3.5 text-right font-medium text-slate-500">
                        {rev.date.split("-").reverse().join("/")}
                      </td>

                      {/* Valor Alinhado à Direita */}
                      <td className={`px-4 py-3.5 text-right font-black font-tnum tabular-nums text-sm ${isReceived ? "text-emerald-700" : "text-slate-800"}`}>
                        {brl(rev.amount)}
                      </td>

                      {/* Status / Botão Dinâmico */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => handleToggleStatus(rev.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition-all shadow-2xs cursor-pointer ${
                            isReceived
                              ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20"
                              : "bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200"
                          }`}
                          title={isReceived ? "Clique para reabrir" : "Clique para marcar como recebido"}
                        >
                          {isReceived ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              <span>Recebido</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>Marcar RECEBIDO</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(rev)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(rev)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
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

        {/* CONTROLES DE PAGINAÇÃO */}
        {filteredRevenues.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs font-medium text-slate-500">
            <div>
              Mostrando <span className="font-bold text-slate-800">{((currentPage - 1) * itemsPerPage) + 1}</span> até{" "}
              <span className="font-bold text-slate-800">{Math.min(currentPage * itemsPerPage, filteredRevenues.length)}</span> de{" "}
              <span className="font-bold text-slate-800">{filteredRevenues.length}</span> lançamentos
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-bold text-slate-700 bg-slate-100 rounded-lg text-xs">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── MODAIS DE CRUD (SOFT UI GLASS) ────────────────────────────────────── */}
      {modalType && (
        <div 
          onClick={() => setModalType(null)}
          className="fixed inset-0 bg-slate-900/15 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white/95 backdrop-blur-md rounded-[28px] border border-white/80 p-6 shadow-2xl max-w-sm w-full flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-100/60">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                {modalType === "create" && "Nova Receita"}
                {modalType === "edit" && "Editar Receita"}
                {modalType === "delete" && "Excluir Receita"}
              </h3>
              <button 
                type="button"
                onClick={() => setModalType(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Criar / Editar Formulário */}
            {(modalType === "create" || modalType === "edit") && (
              <form onSubmit={modalType === "create" ? handleCreate : handleEdit} className="flex flex-col gap-4">
                
                {/* Descrição */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Descrição *</label>
                  <input
                    type="text"
                    list="descricoes-sugestoes"
                    required
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Selecione ou digite a descrição..."
                    className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 placeholder-slate-400"
                  />
                </div>

                {/* Valor */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor (R$) *</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={formAmount || ""}
                    onChange={(e) => setFormAmount(Number(e.target.value))}
                    placeholder="Ex: 1500"
                    className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700"
                  />
                </div>

                {/* Data */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700"
                  />
                </div>

                {/* Botão de Envio */}
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-emerald-600/25 transition-all mt-2 cursor-pointer"
                >
                  {modalType === "create" ? "ADICIONAR RECEITA" : "SALVAR ALTERAÇÕES"}
                </button>

              </form>
            )}

            {/* Modal de Exclusão */}
            {modalType === "delete" && selectedRevenue && (
              <div className="flex flex-col gap-4 text-center">
                <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                  Tem certeza que deseja excluir a receita <strong className="text-slate-800 font-bold">"{selectedRevenue.description}"</strong>?<br/>
                  Isso removerá definitivamente o lançamento financeiro da carteira.
                </p>

                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="flex-1 py-3 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:text-slate-700 text-slate-500 font-extrabold text-xs tracking-wider transition-all cursor-pointer"
                  >
                    CANCELAR
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex-1 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-rose-500/20 transition-all cursor-pointer"
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
