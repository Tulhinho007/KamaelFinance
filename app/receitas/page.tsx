"use client";

import React, { useState, useEffect } from "react";
import {
  Search, Plus, X, Edit2, Trash2, Coins, CheckCircle2, Clock
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
};

// Sugestões predefinidas para as descrições de receita
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

// Função auxiliar para definir cores das Badges das Descrições (Jogo de Cores)
const getDescriptionBadgeStyle = (desc: string) => {
  const d = desc.toLowerCase();
  
  if (d.includes("salário") || d.includes("extras") || d.includes("férias") || d.includes("comissão")) {
    return "bg-emerald-50 text-emerald-600 border border-emerald-100/50 shadow-sm shadow-emerald-500/5";
  }
  if (d.includes("refeição") || d.includes("ticket") || d.includes("alimentação") || d.includes("transporte")) {
    return "bg-amber-50 text-amber-600 border border-amber-100/50 shadow-sm shadow-amber-500/5";
  }
  if (d.includes("bônus") || d.includes("plr") || d.includes("rendimento") || d.includes("investimento") || d.includes("dividendo")) {
    return "bg-indigo-50 text-indigo-600 border border-indigo-100/50 shadow-sm shadow-indigo-500/5";
  }
  if (d.includes("freelance") || d.includes("bico")) {
    return "bg-blue-50 text-blue-600 border border-blue-100/50 shadow-sm shadow-blue-500/5";
  }
  if (d.includes("reembolso") || d.includes("cashback") || d.includes("venda") || d.includes("ir") || d.includes("presente") || d.includes("pix")) {
    return "bg-teal-50 text-teal-600 border border-teal-100/50 shadow-sm shadow-teal-500/5";
  }
  
  return "bg-slate-50 text-slate-600 border border-slate-100 shadow-sm shadow-slate-500/5";
};

export default function ReceitasPage() {
  const { selectedMonth, selectedYear } = usePeriod();
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados dos Filtros Locais
  const [searchQuery, setSearchQuery] = useState("");

  // Estados dos Modais
  const [selectedRevenue, setSelectedRevenue] = useState<Revenue | null>(null);
  const [modalType, setModalType] = useState<"create" | "edit" | "delete" | null>(null);

  // Form Fields State
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState(0);
  const [formDate, setFormDate] = useState("");

  // --- CARREGAMENTO DO BANCO DE DADOS ---
  useEffect(() => {
    let active = true;
    setLoading(true);
    getRevenues(selectedMonth, selectedYear)
      .then((data) => {
        if (active) {
          setRevenues(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Erro ao obter receitas do banco:", err);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedMonth, selectedYear]);

  // Filtra as receitas pela busca
  const filteredRevenues = revenues.filter((rev) => {
    return rev.description.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalReceived = filteredRevenues
    .filter(r => r.status !== "PENDING")
    .reduce((sum, r) => sum + r.amount, 0);

  const totalPending = filteredRevenues
    .filter(r => r.status === "PENDING")
    .reduce((sum, r) => sum + r.amount, 0);

  const totalFiltered = filteredRevenues.reduce((sum, r) => sum + r.amount, 0);

  // Auxiliar para extrair partes de data no formato AAAA-MM-DD
  function formatDateParts(dateStr: string) {
    const parts = dateStr.split("-"); // [AAAA, MM, DD]
    return [parts[2], parts[1], parts[0]]; // [DD, MM, AAAA]
  }

  // Formata data ISO para exibição na tabela
  const formatDateDisplay = (dateStr: string) => {
    const [day, month, year] = formatDateParts(dateStr);
    return `${day}/${month}/${year}`;
  };

  // --- Handlers de Status ---
  const handleToggleStatus = async (revId: string) => {
    try {
      await toggleTransactionStatusAction(revId);
      const fresh = await getRevenues(selectedMonth, selectedYear);
      setRevenues(fresh);
    } catch (err) {
      console.error(err);
      alert("Erro ao alterar status da receita.");
    }
  };

  // --- Handlers do CRUD ---

  const openCreateModal = () => {
    setFormDescription("");
    setFormAmount(0);
    // Sugere a data do período selecionado
    const defaultDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
    setFormDate(defaultDate);
    setModalType("create");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!formDescription || formAmount <= 0 || !formDate) return;

    try {
      await createRevenueAction(formDescription, formAmount, formDate);
      // Recarrega do banco para garantir que a data está dentro do período selecionado
      const fresh = await getRevenues(selectedMonth, selectedYear);
      setRevenues(fresh);
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
    e.stopPropagation();
    if (!selectedRevenue || !formDescription || formAmount <= 0 || !formDate) return;

    try {
      await updateRevenueAction(selectedRevenue.id, formDescription, formAmount, formDate);
      // Recarrega do banco após edição
      const fresh = await getRevenues(selectedMonth, selectedYear);
      setRevenues(fresh);
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

  const handleDelete = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!selectedRevenue) return;
    try {
      await deleteRevenueAction(selectedRevenue.id);
      // Recarrega do banco após exclusão
      const fresh = await getRevenues(selectedMonth, selectedYear);
      setRevenues(fresh);
      setModalType(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir receita do banco de dados.");
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto flex flex-col gap-8 relative select-none">

      {/* Datalist global para os inputs auto-complete */}
      <datalist id="descricoes-sugestoes">
        {DESCRIPTIONS_LIST.map((desc) => (
          <option key={desc} value={desc} />
        ))}
      </datalist>

      {/* 1. TOP BAR INTEGRADO (Header global com seletor de período) */}
      <PeriodHeader 
        title="Receitas" 
        tagline="Controle e otimize as fontes de entrada do Kamael Finance." 
        badge="Gestão" 
      />

      {/* 2. BOTÃO NOVA RECEITA E FILTRO DE BUSCA LOCAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Busca por Palavra-chave com Auto-Complete */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-4" />
          <input
            type="text"
            list="descricoes-sugestoes"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar receitas..."
            className="pl-11 pr-4 py-2.5 text-xs font-medium bg-white border border-white/80 rounded-full shadow-[0_5px_15px_rgba(0,0,0,0.01)] text-slate-700 w-48 sm:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all placeholder-slate-400"
          />
        </div>

        {/* Botão + NOVA RECEITA */}
        <button 
          onClick={openCreateModal}
          className="bg-white border border-emerald-100 hover:bg-emerald-50/50 text-emerald-600 px-5 py-3 rounded-2xl shadow-[0_10px_20px_rgba(16,185,129,0.05)] hover:shadow-[0_12px_22px_rgba(16,185,129,0.08)] transition-all font-extrabold text-xs tracking-wider flex items-center justify-center gap-1.5 self-start sm:self-auto border-white/80"
        >
          <Plus className="w-4.5 h-4.5 text-emerald-600" />
          <span>NOVA RECEITA</span>
        </button>

      </div>

      {/* 3. TABELA DE RECEITAS UNIFICADA */}
      <section className="flex flex-col gap-6">
        <div className="bg-white rounded-[28px] border border-white/80 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.03)] flex flex-col gap-4">
          
          {/* Cabeçalho da Tabela */}
          <div className="flex justify-between items-center pb-3 border-b border-slate-100/50">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)] text-emerald-500">
                <Coins className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">Lançamentos Consolidados</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Recebido: {brl(totalReceived)}
              </span>
              {totalPending > 0 && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  A Receber: {brl(totalPending)}
                </span>
              )}
            </div>
          </div>

          {/* Tabela de Receitas */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 font-extrabold uppercase tracking-wider border-b border-slate-50/50">
                  <th className="px-4 py-2.5 font-extrabold">Descrição</th>
                  <th className="px-4 py-2.5 font-extrabold">Data</th>
                  <th className="px-4 py-2.5 font-extrabold text-right">Valor</th>
                  <th className="px-4 py-2.5 font-extrabold text-center">Status / Recebimento</th>
                  <th className="px-4 py-2.5 text-center whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-indigo-600 font-bold animate-pulse text-xs uppercase tracking-wider">
                      Carregando receitas do banco...
                    </td>
                  </tr>
                ) : filteredRevenues.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-medium">
                      Nenhuma receita registrada com os filtros ativos.
                    </td>
                  </tr>
                ) : (
                  filteredRevenues.map((rev) => {
                    const isReceived = rev.status !== "PENDING";
                    return (
                      <tr
                        key={rev.id}
                        className={`transition-colors ${
                          isReceived ? "bg-emerald-50/20 hover:bg-emerald-50/40" : "hover:bg-slate-50/30"
                        }`}
                      >
                        {/* Descrição com Jogo de Cores (Capsule Badges) */}
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider ${getDescriptionBadgeStyle(rev.description)}`}>
                            {rev.description}
                          </span>
                        </td>
                        
                        <td className="px-4 py-3 text-slate-400 font-medium">{formatDateDisplay(rev.date)}</td>
                        <td className={`px-4 py-3 text-right font-bold ${isReceived ? "text-emerald-700" : "text-slate-700"}`}>
                          {brl(rev.amount)}
                        </td>

                        {/* Botão de Status (Toggle Marcar como RECEBIDO) */}
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggleStatus(rev.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition-all shadow-xs cursor-pointer ${
                              isReceived
                                ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20"
                                : "bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200"
                            }`}
                            title={isReceived ? "Clique para desmarcar" : "Clique para marcar como recebido"}
                          >
                            {isReceived ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                <span>Recebido</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>Marcar como RECEBIDO</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                            <button
                              onClick={() => openEditModal(rev)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-all"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(rev)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-50 transition-all"
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
              
              {/* Linha Consolidada de Total */}
              {!loading && filteredRevenues.length > 0 && (
                <tfoot>
                  <tr className="border-t border-slate-100 font-bold text-slate-700 bg-slate-50/20">
                    <td colSpan={2} className="px-4 py-3 font-extrabold text-slate-500 uppercase tracking-wider">
                      CONSOLIDADO / TOTAL
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-800 text-sm">
                      {brl(totalFiltered)}
                    </td>
                    <td colSpan={2} className="px-4 py-3 text-center text-[10px] font-bold text-slate-400">
                      Recebido: <span className="text-emerald-600 font-black">{brl(totalReceived)}</span> | A Receber: <span className="text-amber-600 font-black">{brl(totalPending)}</span>
                    </td>
                  </tr>
                </tfoot>
              )}

            </table>
          </div>

        </div>
      </section>

      {/* --- MODAIS DE CRUD (Soft UI Glass) --- */}

      {modalType && (
        <div 
          onClick={() => setModalType(null)}
          className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          
          {/* Modal Container */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white/95 backdrop-blur-md rounded-[28px] border border-white/80 p-6 shadow-2xl max-w-sm w-full flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200"
          >
            
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-100/50">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                {modalType === "create" && "Nova Receita"}
                {modalType === "edit" && "Editar Receita"}
                {modalType === "delete" && "Excluir Receita"}
              </h3>
              <button 
                type="button"
                onClick={() => setModalType(null)}
                className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Criar / Editar Formulário */}
            {(modalType === "create" || modalType === "edit") && (
              <form onSubmit={modalType === "create" ? handleCreate : handleEdit} className="flex flex-col gap-4">
                
                {/* Descrição (Combobox via Datalist) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Descrição</label>
                  <input
                    type="text"
                    list="descricoes-sugestoes"
                    required
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Selecione ou digite a descrição..."
                    className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-100 text-slate-700 placeholder-slate-400"
                  />
                </div>

                {/* Valor */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor (R$)</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={formAmount || ""}
                    onChange={(e) => setFormAmount(Number(e.target.value))}
                    placeholder="Ex: 1500"
                    className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-100 text-slate-700"
                  />
                </div>

                {/* Data */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-100 text-slate-700"
                  />
                </div>

                {/* Botão de Envio */}
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-indigo-600/25 transition-all mt-2"
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
                    className="flex-1 py-3 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:text-slate-700 text-slate-500 font-extrabold text-xs tracking-wider transition-all"
                  >
                    CANCELAR
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex-1 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-rose-500/20 transition-all"
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
