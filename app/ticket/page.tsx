"use client";

import React, { useState, useEffect } from "react";
import {
  Trash2, X, Edit2, DollarSign, Wallet, TrendingDown, Settings, Plus, Sparkles, Calendar, Zap, AlertCircle, CheckCircle2, Minus
} from "lucide-react";
import { usePeriod } from "@/components/period-context";
import { PeriodHeader } from "@/components/period-header";
import { getTicketData, saveTicketCarga, addTicketCarga, removeTicketCarga, createTicketExpense, updateTicketExpense, deleteTicketExpense, deleteBatchPurchasesAction } from "@/lib/actions";

import { CATEGORIES } from "@/lib/constants";
import { useModal } from "@/components/ui/custom-dialog-provider";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type TicketExpense = {
  id: string;
  description: string;
  category?: string;
  amount: number;
  date: string; // YYYY-MM-DD
};

export default function TicketAlimentacaoPage() {
  const { selectedMonth, selectedYear } = usePeriod();
  const { showAlert } = useModal();

  // Dados do Ticket
  const [walletId, setWalletId] = useState<string | null>(null);
  const [saldoDisponivel, setSaldoDisponivel] = useState(0);
  const [saldoInicial, setSaldoInicial] = useState(0);

  // Lista de lançamentos do Ticket
  const [expenses, setExpenses] = useState<TicketExpense[]>([]);
  const [loading, setLoading] = useState(true);

  // Múltipla Seleção (Exclusão em Lote)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchDeleteModalOpen, setBatchDeleteModalOpen] = useState(false);
  const [deletingBatch, setDeletingBatch] = useState(false);

  // Estados dos Modais
  const [modalType, setModalType] = useState<"carga" | "cargaRemove" | "cargaSet" | "expense" | "edit" | "delete" | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<TicketExpense | null>(null);

  // Form Fields State
  const [formCarga, setFormCarga] = useState<number | "">("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("Alimentação");
  const [formAmount, setFormAmount] = useState<number | "">("");
  const [formDate, setFormDate] = useState("");

  // --- CARREGAMENTO DO BANCO DE DADOS ---
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getTicketData(selectedMonth, selectedYear);
      setWalletId(data.walletId);
      setSaldoDisponivel(data.saldoDisponivel);
      setSaldoInicial(data.saldoInicial);
      setExpenses(data.expenses);
    } catch (err) {
      console.error("Erro ao obter dados do ticket:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  // Os gastos já vêm filtrados do backend pelo período selecionado
  const filteredExpenses = expenses;

  // --- Cálculos de Saldo Acumulado ---
  const totalUtilizado = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const saldoAtual = saldoDisponivel; // Saldo Final do mês M/Y com Rollover

  const baseBalance = saldoInicial > 0 ? saldoInicial : (saldoAtual + totalUtilizado);
  const usagePct = baseBalance > 0 ? Math.min(100, Math.round((totalUtilizado / baseBalance) * 100)) : 0;
  const remainingPct = 100 - usagePct;

  // --- Handlers do CRUD ---
  const handleAddCarga = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formCarga === "" || isNaN(Number(formCarga))) return;
    const val = Number(formCarga);
    if (val <= 0 || !walletId) return;
    try {
      await addTicketCarga(walletId, val);
      setSaldoDisponivel(prev => prev + val);
      setModalType(null);
      setFormCarga("");
    } catch (err) {
      console.error(err);
      showAlert("Erro ao adicionar carga.", { variant: "error" });
    }
  };

  const handleRemoveCarga = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formCarga === "" || isNaN(Number(formCarga))) return;
    const val = Number(formCarga);
    if (val <= 0 || !walletId) return;
    try {
      await removeTicketCarga(walletId, val);
      setSaldoDisponivel(prev => prev - val);
      setModalType(null);
      setFormCarga("");
    } catch (err) {
      console.error(err);
      showAlert("Erro ao remover carga.", { variant: "error" });
    }
  };

  const handleSetCarga = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formCarga === "" || isNaN(Number(formCarga))) return;
    const val = Number(formCarga);
    if (val < 0 || !walletId) return;
    try {
      await saveTicketCarga(walletId, val);
      setSaldoDisponivel(val);
      setModalType(null);
      setFormCarga("");
    } catch (err) {
      console.error(err);
      showAlert("Erro ao redefinir saldo total.", { variant: "error" });
    }
  };

  const openExpenseModal = () => {
    setFormDescription("");
    setFormCategory("Alimentação");
    setFormAmount("");
    const defaultDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
    setFormDate(defaultDate);
    setModalType("expense");
  };

  const handleExpenseAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(formAmount);
    if (!formDescription || val <= 0 || !formDate || !walletId) return;

    try {
      await createTicketExpense(walletId, formDescription, formCategory, val, formDate);
      await loadData();
      setModalType(null);
    } catch (err) {
      console.error(err);
      showAlert("Erro ao lançar gasto.", { variant: "error" });
    }
  };

  const openEditModal = (exp: TicketExpense) => {
    setSelectedExpense(exp);
    setFormDescription(exp.description);
    setFormCategory(exp.category || "Alimentação");
    setFormAmount(exp.amount);
    setFormDate(exp.date);
    setModalType("edit");
  };

  const handleExpenseEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(formAmount);
    if (!selectedExpense || !formDescription || val <= 0 || !formDate) return;

    try {
      await updateTicketExpense(selectedExpense.id, formDescription, formCategory, val, formDate);
      await loadData();
      setModalType(null);
    } catch (err) {
      console.error(err);
      showAlert("Erro ao editar gasto.", { variant: "error" });
    }
  };

  const handleDelete = async () => {
    if (!selectedExpense) return;
    try {
      await deleteTicketExpense(selectedExpense.id);
      setExpenses(prev => prev.filter(item => item.id !== selectedExpense.id));
      setModalType(null);
    } catch (err) {
      console.error(err);
      showAlert("Erro ao excluir gasto.", { variant: "error" });
    }
  };

  const selectedTotalAmount = React.useMemo(() => {
    if (selectedIds.length === 0) return 0;
    return expenses.filter(e => selectedIds.includes(e.id)).reduce((acc, e) => acc + e.amount, 0);
  }, [expenses, selectedIds]);

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setDeletingBatch(true);
    try {
      const count = selectedIds.length;
      await deleteBatchPurchasesAction(selectedIds);
      await loadData();
      setSelectedIds([]);
      setBatchDeleteModalOpen(false);
      showAlert(`${count} ${count === 1 ? "despesa excluída" : "despesas excluídas"} com sucesso!`, { variant: "success" });
    } catch (err) {
      console.error(err);
      showAlert("Erro ao excluir despesas selecionadas.", { variant: "error" });
    } finally {
      setDeletingBatch(false);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto flex flex-col gap-8 relative select-none">
      
      {/* 1. HEADER INTEGRADO */}
      <PeriodHeader 
        title="Ticket Alimentação" 
        tagline="Gestão de saldo e uso do cartão alimentação." 
      />

      {/* 2. BOTÕES DE AÇÃO */}
      <div className="flex flex-wrap justify-end gap-3 -mt-4">
        {/* CTA 1: Adicionar Carga */}
        <button 
          onClick={() => {
            setFormCarga("");
            setModalType("carga");
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-lg shadow-emerald-600/20 transition-all font-extrabold text-xs tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4 text-white" />
          ADICIONAR CARGA
        </button>

        {/* CTA 1.5: Remover Carga */}
        <button 
          onClick={() => {
            setFormCarga("");
            setModalType("cargaRemove");
          }}
          className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-3 rounded-2xl shadow-lg shadow-rose-500/20 transition-all font-extrabold text-xs tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02]"
        >
          <Minus className="w-4 h-4 text-white" />
          REMOVER CARGA
        </button>

        {/* CTA 3: Lançar Gasto */}
        <button 
          onClick={openExpenseModal}
          className="bg-white border border-emerald-200 hover:bg-emerald-50/50 text-emerald-600 px-5 py-3 rounded-2xl shadow-sm transition-all font-extrabold text-xs tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4 text-emerald-600" />
          LANÇAR GASTO
        </button>
      </div>

      {/* 3. TOPO: CARD VERDE + 3 KPIS */}
      <section className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        
        {/* Card Tile Verde (Esquerda) */}
        <div className="lg:col-span-1 rounded-[28px] overflow-hidden bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-900 p-5 flex flex-col justify-between shadow-xl border border-white/10 relative h-52">
          {/* Marca d'água */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.12)_0%,_transparent_60%)] pointer-events-none" />

          {/* Topo do card */}
          <div className="flex justify-between items-start z-10">
            <div>
              <p className="text-[10px] font-black text-white/90 uppercase tracking-widest">Ticket Alimentação</p>
              <p className="text-[9px] font-bold text-emerald-200/60 mt-0.5">TICKET · SALDO ATUAL</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* Valor Saldo Atual */}
          <div className="z-10 -mt-1">
            <h3 className="text-2xl font-black text-white tracking-tight">
              {brl(saldoAtual)}
            </h3>
          </div>

          {/* Rodapé e Barra de Progresso */}
          <div className="z-10 flex flex-col gap-1.5">
            <div className="h-1.5 w-full bg-white/15 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-400 rounded-full transition-all duration-700" 
                style={{ width: `${remainingPct}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[9px] font-extrabold text-white/70 tracking-wider uppercase">
              <span>DISPONÍVEL: {brl(saldoDisponivel)}</span>
              <span className="text-emerald-300">ALIMENTAÇÃO</span>
            </div>
          </div>
        </div>

        {/* 3 KPI Cards (Direita) */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-5">
          
          {/* KPI 1 — Carga Mensal */}
          <div className="bg-white rounded-[28px] border border-white/80 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.03)] flex flex-col justify-between relative overflow-hidden h-52">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Carga Mensal</span>
              <span className="bg-emerald-50 text-emerald-600 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-100 uppercase">
                Limite
              </span>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 mb-1">Saldo Total Disponível</p>
              <p className="text-2xl font-black text-slate-800 tracking-tight">{brl(saldoDisponivel)}</p>
            </div>
            <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2 text-[9px] font-bold text-slate-400">
              Valor carregado no período
            </div>
          </div>

          {/* KPI 2 — Consumo */}
          <div className="bg-white rounded-[28px] border border-white/80 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.03)] flex flex-col justify-between relative overflow-hidden h-52">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Consumo</span>
              <span className="bg-amber-50 text-amber-600 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-100 uppercase">
                Utilizado
              </span>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 mb-1">Total Utilizado</p>
              <p className="text-2xl font-black text-amber-500 tracking-tight">{brl(totalUtilizado)}</p>
            </div>
            <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2 text-[9px] font-bold text-slate-400">
              {usagePct}% do saldo consumido
            </div>
          </div>

          {/* KPI 3 — Saldo Real */}
          <div className="bg-white rounded-[28px] border border-white/80 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.03)] flex flex-col justify-between relative overflow-hidden h-52">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo Real</span>
              <span className="bg-emerald-50 text-emerald-600 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-100 uppercase">
                Restante
              </span>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 mb-1">Saldo Atual</p>
              <p className="text-2xl font-black text-emerald-500 tracking-tight">{brl(saldoAtual)}</p>
            </div>
            <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2 text-[9px] font-bold text-slate-400">
              Disponível para compras
            </div>
          </div>

        </div>

      </section>

      {/* 4. TABELA: USO DO CARTÃO ALIMENTAÇÃO */}
      <section className="flex flex-col gap-4">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Uso do Cartão Alimentação
        </h2>

        <div className="bg-white rounded-[28px] border border-white/80 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.03)] flex flex-col gap-4">
          
          {loading ? (
            <div className="py-12 text-center text-xs font-semibold text-slate-400 animate-pulse">
              Carregando lançamentos do Ticket...
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-300" />
              <p className="text-xs font-semibold text-slate-400">Nenhum gasto registrado para este período.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredExpenses.length > 0 && filteredExpenses.every(exp => selectedIds.includes(exp.id))}
                        onChange={() => {
                          const allSelected = filteredExpenses.every(exp => selectedIds.includes(exp.id));
                          if (allSelected) {
                            setSelectedIds(prev => prev.filter(id => !filteredExpenses.some(exp => exp.id === id)));
                          } else {
                            const newIds = Array.from(new Set([...selectedIds, ...filteredExpenses.map(exp => exp.id)]));
                            setSelectedIds(newIds);
                          }
                        }}
                        className="w-4 h-4 rounded bg-slate-100 border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        title="Selecionar Todos"
                      />
                    </th>
                    <th className="pb-3">Data</th>
                    <th className="pb-3">Descrição</th>
                    <th className="pb-3">Categoria</th>
                    <th className="pb-3 text-right">Valor</th>
                    <th className="pb-3 text-center whitespace-nowrap">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id} className={`hover:bg-slate-50/60 transition-colors ${selectedIds.includes(exp.id) ? "bg-emerald-50/40" : ""}`}>
                      <td className="py-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(exp.id)}
                          onChange={() => {
                            setSelectedIds(prev =>
                              prev.includes(exp.id) ? prev.filter(id => id !== exp.id) : [...prev, exp.id]
                            );
                          }}
                          className="w-4 h-4 rounded bg-slate-100 border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 text-[10px] font-bold text-slate-400">
                        {formatDateDisplay(exp.date)}
                      </td>
                      <td className="py-3.5 font-extrabold text-slate-800">
                        {exp.description}
                      </td>
                      <td className="py-3.5">
                        <span className="bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold">
                          {exp.category || "Alimentação"}
                        </span>
                      </td>
                      <td className="py-3.5 text-right font-black text-slate-800">
                        {brl(exp.amount)}
                      </td>
                      <td className="py-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                          <button
                            onClick={() => openEditModal(exp)}
                            className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setSelectedExpense(exp); setModalType("delete"); }}
                            className="p-1.5 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-100">
                    <td colSpan={4} className="pt-4 font-black text-slate-800 text-xs uppercase tracking-wider">
                      TOTAL UTILIZADO
                    </td>
                    <td className="pt-4 text-right font-black text-slate-800 text-sm">
                      {brl(totalUtilizado)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

        </div>
      </section>

      {/* ── MODAIS ─────────────────────────────────────────────────────────────── */}

      {/* Modal 1: Adicionar Carga (Soma ao saldo) */}
      {modalType === "carga" && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-sm flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-800">Adicionar Carga ao Ticket</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Soma o valor digitado ao saldo atual.</p>
              </div>
              <button onClick={() => setModalType(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddCarga} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Valor a Somar (R$)</label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formCarga}
                  onChange={e => setFormCarga(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setModalType(null)} className="flex-1 py-3 text-xs font-extrabold text-slate-500 bg-slate-100 rounded-2xl">CANCELAR</button>
                <button type="submit" className="flex-1 py-3 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-lg shadow-emerald-600/25">SOMAR CARGA</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 1.5: Remover/Subtrair Carga */}
      {modalType === "cargaRemove" && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-sm flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-800">Remover Carga do Ticket</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Subtrai o valor digitado do saldo atual.</p>
              </div>
              <button onClick={() => setModalType(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRemoveCarga} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Valor a Subtrair (R$)</label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formCarga}
                  onChange={e => setFormCarga(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setModalType(null)} className="flex-1 py-3 text-xs font-extrabold text-slate-500 bg-slate-100 rounded-2xl">CANCELAR</button>
                <button type="submit" className="flex-1 py-3 text-xs font-extrabold text-white bg-rose-500 hover:bg-rose-600 rounded-2xl shadow-lg shadow-rose-500/25">SUBTRAIR CARGA</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Lançar Gasto */}
      {modalType === "expense" && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-md flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800">Lançar Gasto no Ticket</h3>
              <button onClick={() => setModalType(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleExpenseAdd} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Descrição *</label>
                <input
                  required
                  type="text"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Ex: Almoço, Lanche, Mercado..."
                  className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-200 text-slate-700"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Categoria *</label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Valor (R$) *</label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-200 text-slate-700"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Data *</label>
                <input
                  required
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-200 text-slate-700"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setModalType(null)} className="flex-1 py-3 text-xs font-extrabold text-slate-500 bg-slate-100 rounded-2xl">CANCELAR</button>
                <button type="submit" className="flex-1 py-3 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-lg shadow-emerald-600/25">REGISTRAR GASTO</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Editar Gasto */}
      {modalType === "edit" && selectedExpense && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-md flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800">Editar Gasto no Ticket</h3>
              <button onClick={() => setModalType(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleExpenseEdit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Descrição *</label>
                <input
                  required
                  type="text"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-200 text-slate-700"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Categoria *</label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Valor (R$) *</label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-200 text-slate-700"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Data *</label>
                <input
                  required
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-200 text-slate-700"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setModalType(null)} className="flex-1 py-3 text-xs font-extrabold text-slate-500 bg-slate-100 rounded-2xl">CANCELAR</button>
                <button type="submit" className="flex-1 py-3 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-lg shadow-emerald-600/25">SALVAR ALTERAÇÕES</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Excluir Gasto */}
      {modalType === "delete" && selectedExpense && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-sm flex flex-col gap-5 text-center shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-black text-slate-800">Excluir Lançamento</h3>
            <p className="text-xs font-semibold text-slate-500">Tem certeza que deseja excluir "{selectedExpense.description}"?</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setModalType(null)} className="flex-1 py-3 text-xs font-extrabold text-slate-500 bg-slate-100 rounded-2xl">CANCELAR</button>
              <button onClick={handleDelete} className="flex-1 py-3 text-xs font-extrabold text-white bg-rose-500 hover:bg-rose-600 rounded-2xl shadow-lg shadow-rose-500/25">EXCLUIR</button>
            </div>
          </div>
        </div>
      )}

      {/* ── BARRA DE AÇÕES EM LOTE (FLOATING ACTION BAR) ───────────────────── */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl px-6 py-3.5 flex items-center gap-6 animate-in slide-in-from-bottom-5 duration-200 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black text-xs">
              {selectedIds.length}
            </div>
            <div>
              <p className="text-xs font-black text-white">
                {selectedIds.length} {selectedIds.length === 1 ? "despesa selecionada" : "despesas selecionadas"}
              </p>
              <p className="text-[10px] text-slate-400 font-bold">
                Soma Total: <strong className="text-white">{brl(selectedTotalAmount)}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={() => setBatchDeleteModalOpen(true)}
              className="px-4 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Excluir Selecionadas
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL CUSTOMIZADO DE CONFIRMAÇÃO DE EXCLUSÃO EM LOTE ────────────── */}
      {batchDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4 text-center shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Excluir {selectedIds.length} {selectedIds.length === 1 ? "despesa" : "despesas"}?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium leading-relaxed">
                Tem certeza que deseja excluir <strong className="text-slate-900 dark:text-white font-black">{selectedIds.length} despesas</strong> no valor total de <strong className="text-rose-600 dark:text-rose-400 font-black">{brl(selectedTotalAmount)}</strong>?
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setBatchDeleteModalOpen(false)}
                className="flex-1 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={deletingBatch}
                className="flex-1 py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-500 rounded-xl cursor-pointer shadow-lg shadow-rose-600/30"
              >
                {deletingBatch ? "Excluindo..." : "Confirmar Exclusão"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

