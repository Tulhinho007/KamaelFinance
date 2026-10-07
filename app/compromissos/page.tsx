"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Receipt,
  Plus,
  Clock,
  CheckCircle2,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Pencil,
  Trash2,
  Copy,
  MoreVertical,
  Check,
  Zap,
  Repeat,
  Building2,
  CreditCard,
} from "lucide-react";
import { usePeriod } from "@/components/period-context";
import { useModal } from "@/components/ui/custom-dialog-provider";
import {
  getMonthlyCommitmentsAction,
  createCommitmentAction,
  payCommitmentAction,
  payBatchCommitmentsAction,
  undoCommitmentPaymentAction,
  updateCommitmentAction,
  deleteCommitmentAction,
} from "@/lib/actions";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MONTH_NAMES_LIST = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function CompromissosPage() {
  const { selectedYear, setYear, prevYear, nextYear, goToCurrentYear } = usePeriod();
  const { showAlert } = useModal();

  const [loading, setLoading] = useState(true);
  const [commitmentsData, setCommitmentsData] = useState<{
    items: any[];
    totals: { totalMes: number; totalAno?: number; totalPendente: number; totalPago: number };
    contasBancarias: { id: string; banco: string; saldoAtual: number }[];
    cartoesCredito: { id: string; nome: string; limiteDisponivel: number; limiteTotal: number; faturaAtual: number }[];
  }>({
    items: [],
    totals: { totalMes: 0, totalAno: 0, totalPendente: 0, totalPago: 0 },
    contasBancarias: [],
    cartoesCredito: [],
  });

  const [statusFilter, setStatusFilter] = useState<"TODOS" | "PENDENTE" | "PAGO">("TODOS");
  const [searchTerm, setSearchTerm] = useState("");
  const [showPaidItems, setShowPaidItems] = useState(false);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Modais
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newTipo, setNewTipo] = useState<"BOLETO" | "ASSINATURA">("BOLETO");
  const [newRecorrencia, setNewRecorrencia] = useState<"MENSAL" | "UNICO">("MENSAL");
  const [newCompMonth, setNewCompMonth] = useState<number>(new Date().getMonth() + 1);
  const [newCompYear, setNewCompYear] = useState<number>(selectedYear || 2026);

  // Baixa Individual
  const [payItem, setPayItem] = useState<any | null>(null);
  const [paying, setPaying] = useState(false);
  const [baixaForma, setBaixaForma] = useState<"SALDO_CONTA" | "DEBITO_AUTOMATICO" | "PIX" | "CARTAO_CREDITO" | "DINHEIRO">("SALDO_CONTA");
  const [baixaContaId, setBaixaContaId] = useState("");
  const [baixaCartaoId, setBaixaCartaoId] = useState("");
  const [baixaData, setBaixaData] = useState(new Date().toISOString().split("T")[0]);

  // Seleção e Baixa em Lote
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [payingBatch, setPayingBatch] = useState(false);
  const [batchBaixaForma, setBatchBaixaForma] = useState<"SALDO_CONTA" | "DEBITO_AUTOMATICO" | "PIX" | "CARTAO_CREDITO" | "DINHEIRO">("SALDO_CONTA");
  const [batchBaixaContaId, setBatchBaixaContaId] = useState("");
  const [batchBaixaCartaoId, setBatchBaixaCartaoId] = useState("");
  const [batchBaixaData, setBatchBaixaData] = useState(new Date().toISOString().split("T")[0]);

  // Edição
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editing, setEditing] = useState(false);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editTipo, setEditTipo] = useState<"BOLETO" | "ASSINATURA">("BOLETO");
  const [editRecorrencia, setEditRecorrencia] = useState<"MENSAL" | "UNICO">("MENSAL");
  const [editCompMonth, setEditCompMonth] = useState<number>(new Date().getMonth() + 1);
  const [editCompYear, setEditCompYear] = useState<number>(selectedYear || 2026);

  // Exclusão
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Replicação
  const [replicatingId, setReplicatingId] = useState<string | null>(null);

  // Carregar dados de compromissos anuais
  const loadData = async (active = true) => {
    try {
      setLoading(true);
      // Chamada anual para trazer todos os meses do ano selecionado
      const data = await getMonthlyCommitmentsAction("ALL", selectedYear);
      if (!active) return;
      setCommitmentsData(data);
      if (data.contasBancarias?.length > 0) {
        setBaixaContaId((prev) => prev || data.contasBancarias[0].id);
        setBatchBaixaContaId((prev) => prev || data.contasBancarias[0].id);
      }
      if (data.cartoesCredito?.length > 0) {
        setBaixaCartaoId((prev) => prev || data.cartoesCredito[0].id);
        setBatchBaixaCartaoId((prev) => prev || data.cartoesCredito[0].id);
      }
    } catch (err) {
      console.error("Erro ao carregar compromissos:", err);
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

  // Itens filtrados pelo ano selecionado
  const yearItems = useMemo(() => {
    return (commitmentsData?.items || []).filter((item: any) => {
      if (item.competenceYear && item.competenceYear === selectedYear) return true;
      if (item.dueDate && typeof item.dueDate === "string") {
        return item.dueDate.startsWith(String(selectedYear));
      }
      return true;
    });
  }, [commitmentsData?.items, selectedYear]);

  // Totais do Ano
  const yearTotals = useMemo(() => {
    const totalAno = yearItems.reduce((sum: number, it: any) => sum + Number(it.amount || 0), 0);
    const totalPendente = yearItems
      .filter((i: any) => i.status === "PENDING")
      .reduce((sum: number, it: any) => sum + Number(it.amount || 0), 0);
    const totalPago = yearItems
      .filter((i: any) => i.status === "COMPLETED")
      .reduce((sum: number, it: any) => sum + Number(it.amount || 0), 0);

    return {
      totalAno,
      totalPendente,
      totalPago,
      totalCount: yearItems.length,
      pendingCount: yearItems.filter((i: any) => i.status === "PENDING").length,
      paidCount: yearItems.filter((i: any) => i.status === "COMPLETED").length,
    };
  }, [yearItems]);

  // Busca e separação Pendentes / Pagos
  const searchFilteredItems = useMemo(() => {
    return yearItems.filter((item: any) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchDesc = (item.description || "").toLowerCase().includes(q);
        const matchType = (item.tipoLabel || "").toLowerCase().includes(q);
        const matchRef = (item.competenciaLabel || item.competenciaShort || "").toLowerCase().includes(q);
        return matchDesc || matchType || matchRef;
      }
      return true;
    });
  }, [yearItems, searchTerm]);

  const pendingList = useMemo(() => {
    return searchFilteredItems
      .filter((i: any) => i.status === "PENDING")
      .sort((a: any, b: any) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  }, [searchFilteredItems]);

  const paidList = useMemo(() => {
    return searchFilteredItems
      .filter((i: any) => i.status === "COMPLETED")
      .sort((a: any, b: any) => (b.dueDate || "").localeCompare(a.dueDate || ""));
  }, [searchFilteredItems]);

  const paidCount = paidList.length;
  const paidTotal = paidList.reduce((s: number, it: any) => s + Number(it.amount || 0), 0);

  const selectedTotalAmount = useMemo(() => {
    return (commitmentsData?.items || [])
      .filter((it: any) => selectedIds.includes(it.id))
      .reduce((sum: number, it: any) => sum + Number(it.amount || 0), 0);
  }, [commitmentsData?.items, selectedIds]);

  // Fechar menus de ação ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => setActiveActionMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Handlers
  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim() || !newAmount || Number(newAmount) <= 0 || !newDueDate) {
      showAlert("Preencha todos os campos obrigatórios.", { variant: "warning" });
      return;
    }
    setSavingNew(true);
    try {
      await createCommitmentAction({
        description: newDesc.trim(),
        amount: Number(newAmount),
        dueDate: newDueDate,
        tipo: newTipo,
        recorrencia: newRecorrencia,
        competenceMonth: newCompMonth,
        competenceYear: newCompYear,
      });
      setNewModalOpen(false);
      setNewDesc("");
      setNewAmount("");
      setNewDueDate("");
      setNewTipo("BOLETO");
      setNewRecorrencia("MENSAL");
      await loadData();
      showAlert("Compromisso cadastrado com sucesso!", { variant: "success" });
    } catch (err: any) {
      showAlert(err?.message || "Erro ao cadastrar compromisso.", { variant: "error" });
    } finally {
      setSavingNew(false);
    }
  };

  const openBaixaModal = (item: any) => {
    setPayItem(item);
    setBaixaForma("SALDO_CONTA");
    if (commitmentsData.contasBancarias?.length > 0) {
      setBaixaContaId(commitmentsData.contasBancarias[0].id);
    }
    if (commitmentsData.cartoesCredito?.length > 0) {
      setBaixaCartaoId(commitmentsData.cartoesCredito[0].id);
    }
    setBaixaData(new Date().toISOString().split("T")[0]);
  };

  const handleEfetivarBaixa = async () => {
    if (!payItem) return;
    if (["SALDO_CONTA", "DEBITO_AUTOMATICO", "PIX"].includes(baixaForma) && !baixaContaId) {
      showAlert("Selecione a conta corrente que será debitada.", { variant: "warning" });
      return;
    }
    if (baixaForma === "CARTAO_CREDITO" && !baixaCartaoId) {
      showAlert("Selecione o cartão de crédito para lançamento.", { variant: "warning" });
      return;
    }
    setPaying(true);
    try {
      await payCommitmentAction({
        commitmentId: payItem.id,
        formaPagamento: baixaForma,
        contaBancariaId: baixaContaId,
        cartaoCreditoId: baixaCartaoId,
        dataBaixa: baixaData,
      });
      setPayItem(null);
      await loadData();
      showAlert("Baixa confirmada com sucesso!", { variant: "success" });
    } catch (err: any) {
      showAlert(err?.message || "Erro ao efetivar baixa.", { variant: "error" });
    } finally {
      setPaying(false);
    }
  };

  const handleUndoPayment = async (id: string) => {
    try {
      await undoCommitmentPaymentAction(id);
      await loadData();
      showAlert("Pagamento desfeito com sucesso!", { variant: "success" });
    } catch (err: any) {
      showAlert(err?.message || "Erro ao desfazer pagamento.", { variant: "error" });
    }
  };

  const openBatchBaixaModal = () => {
    setBatchBaixaForma("SALDO_CONTA");
    if (commitmentsData.contasBancarias?.length > 0) {
      setBatchBaixaContaId(commitmentsData.contasBancarias[0].id);
    }
    if (commitmentsData.cartoesCredito?.length > 0) {
      setBatchBaixaCartaoId(commitmentsData.cartoesCredito[0].id);
    }
    setBatchBaixaData(new Date().toISOString().split("T")[0]);
    setBatchModalOpen(true);
  };

  const handleEfetivarBaixaLote = async () => {
    if (selectedIds.length === 0) return;
    if (["SALDO_CONTA", "DEBITO_AUTOMATICO", "PIX"].includes(batchBaixaForma) && !batchBaixaContaId) {
      showAlert("Selecione a conta corrente que será debitada.", { variant: "warning" });
      return;
    }
    if (batchBaixaForma === "CARTAO_CREDITO" && !batchBaixaCartaoId) {
      showAlert("Selecione o cartão de crédito para lançamento.", { variant: "warning" });
      return;
    }
    setPayingBatch(true);
    try {
      await payBatchCommitmentsAction({
        commitmentIds: selectedIds,
        formaPagamento: batchBaixaForma,
        contaBancariaId: batchBaixaContaId,
        cartaoCreditoId: batchBaixaCartaoId,
        dataBaixa: batchBaixaData,
      });
      setBatchModalOpen(false);
      setSelectedIds([]);
      await loadData();
      showAlert("Baixa em lote confirmada com sucesso!", { variant: "success" });
    } catch (err: any) {
      showAlert(err?.message || "Erro ao efetivar baixa em lote.", { variant: "error" });
    } finally {
      setPayingBatch(false);
    }
  };

  const openEditModal = (item: any) => {
    setEditItem(item);
    setEditDesc(item.description);
    setEditAmount(String(item.amount));
    setEditDueDate(item.dueDate ? item.dueDate.split("T")[0] : "");
    setEditTipo(item.tipo || "BOLETO");
    setEditRecorrencia(item.recorrencia || "MENSAL");
    setEditCompMonth(item.competenceMonth || new Date().getMonth() + 1);
    setEditCompYear(item.competenceYear || selectedYear || 2026);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    setEditing(true);
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
      setEditing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      await deleteCommitmentAction(itemToDelete.id);
      setItemToDelete(null);
      await loadData();
      showAlert("Compromisso excluído com sucesso!", { variant: "success" });
    } catch (err: any) {
      showAlert(err?.message || "Erro ao excluir compromisso.", { variant: "error" });
    } finally {
      setDeleting(false);
    }
  };

  const handleReplicate = async (item: any) => {
    setReplicatingId(item.id);
    try {
      let nextMonth = (item.competenceMonth || 1) + 1;
      let nextYear = item.competenceYear || selectedYear || 2026;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      }
      let nextDueDate = item.dueDate;
      if (item.dueDate && item.dueDate.includes("-")) {
        const parts = item.dueDate.split("-");
        const day = parts[2] ? parts[2].split("T")[0] : "10";
        nextDueDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-${day}`;
      }
      await createCommitmentAction({
        description: item.description,
        amount: Number(item.amount),
        dueDate: nextDueDate,
        tipo: item.tipo,
        recorrencia: item.recorrencia,
        competenceMonth: nextMonth,
        competenceYear: nextYear,
      });
      await loadData();
      showAlert(`Compromisso replicado para ${MONTH_NAMES_LIST[nextMonth - 1]}/${nextYear}!`, { variant: "success" });
    } catch (err: any) {
      showAlert(err?.message || "Erro ao replicar compromisso.", { variant: "error" });
    } finally {
      setReplicatingId(null);
    }
  };

  // Renderizador de Linha da Tabela
  const renderRow = (item: any) => {
    const isPaid = item.status === "COMPLETED";
    const isSelected = selectedIds.includes(item.id);
    const isRecurring = item.recorrencia === "MENSAL" || item.isRecurring;

    return (
      <tr
        key={item.id}
        className={`transition-colors group border-b border-slate-100 dark:border-slate-800/60 ${
          isSelected
            ? "bg-indigo-50/60 dark:bg-indigo-950/40"
            : "hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
        }`}
      >
        <td className="py-2.5 px-3 text-center">
          {!isPaid ? (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedIds((prev) => [...prev, item.id]);
                } else {
                  setSelectedIds((prev) => prev.filter((id) => id !== item.id));
                }
              }}
              className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          ) : (
            <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
          )}
        </td>

        <td className="py-2.5 px-3 whitespace-nowrap">
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
              {item.dueDateFormatted}
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${item.dueBadge?.color || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                {item.dueBadge?.label || "A Vencer"}
              </span>
              {(item.competenciaLabel || item.competenciaShort) && (
                <span
                  title={`Mês de Referência: ${item.competenciaLabel || item.competenciaShort}`}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/50"
                >
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
            <div className="min-w-0 flex-1 flex items-center gap-1.5">
              <span className="font-bold text-slate-900 dark:text-white block text-xs truncate max-w-[200px] lg:max-w-[320px]">
                {item.description}
              </span>
              {isRecurring && (
                <span title="Compromisso recorrente mensal" className="inline-flex shrink-0">
                  <Repeat className="w-3 h-3 text-indigo-500/80 dark:text-indigo-400/80" />
                </span>
              )}
            </div>
          </div>
        </td>

        <td className="py-2.5 px-2 whitespace-nowrap">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border ${
              item.tipo === "ASSINATURA"
                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
            }`}
          >
            {item.tipoLabel || (item.tipo === "ASSINATURA" ? "Assinatura" : "Boleto")}
          </span>
        </td>

        <td className="py-2.5 px-3 text-right whitespace-nowrap">
          <span className="font-mono tabular-nums font-black text-slate-900 dark:text-white text-xs sm:text-sm">
            {brl(item.amount)}
          </span>
        </td>

        <td className="py-2.5 px-3 text-center whitespace-nowrap">
          {isPaid ? (
            <div className="flex flex-col items-center gap-0.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                <Check className="w-2.5 h-2.5" /> {item.statusLabel || "Pago"}
              </span>
              {item.formaPagamentoLabel && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  {item.formaPagamentoLabel}
                </span>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
              {item.statusLabel || "Pendente"}
            </span>
          )}
        </td>

        <td className="py-2.5 px-3 text-right whitespace-nowrap">
          <div className="flex items-center justify-end gap-1.5">
            {!isPaid ? (
              <button
                onClick={() => openBaixaModal(item)}
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white transition-all cursor-pointer shadow-2xs"
                title="Pagar / Dar Baixa"
              >
                <Check className="w-3 h-3" />
                <span>Pagar</span>
              </button>
            ) : (
              <button
                onClick={() => handleUndoPayment(item.id)}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] font-bold transition-colors cursor-pointer"
                title="Desfazer pagamento"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Desfazer</span>
              </button>
            )}

            <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setActiveActionMenuId(activeActionMenuId === item.id ? null : item.id)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                title="Mais opções"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
              {activeActionMenuId === item.id && (
                <div className="absolute right-0 z-30 mt-1 w-48 rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 py-1 text-left">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveActionMenuId(null);
                      openEditModal(item);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-400" />
                    <span>Editar Compromisso</span>
                  </button>
                  <button
                    type="button"
                    disabled={replicatingId === item.id}
                    onClick={() => {
                      setActiveActionMenuId(null);
                      handleReplicate(item);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Replicar p/ Próximo Mês</span>
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
                    <span>Excluir Compromisso</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto flex flex-col gap-8 select-none relative font-sans text-slate-900 dark:text-slate-100">
      {/* Top Header & Seletor Anual */}
      <div className="flex flex-col gap-3">
        <Link
          href="/"
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 w-fit transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o Dashboard
        </Link>
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Receipt className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Central de Contas a Pagar & Boletos
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Gestão anual de contas fixas, boletos, assinaturas e obrigações a liquidar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Seletor Anual */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-2xl shadow-xs">
              <button
                onClick={prevYear}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Ano Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-xs font-black text-indigo-600 dark:text-indigo-400 tracking-wider">
                ANO {selectedYear}
              </span>
              <button
                onClick={nextYear}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Próximo Ano"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {selectedYear !== new Date().getFullYear() && (
                <button
                  onClick={goToCurrentYear}
                  className="px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  Ano Atual
                </button>
              )}
            </div>

            <button
              onClick={() => {
                setNewDesc("");
                setNewAmount("");
                setNewDueDate("");
                setNewTipo("BOLETO");
                setNewRecorrencia("MENSAL");
                setNewCompMonth(new Date().getMonth() + 1);
                setNewCompYear(selectedYear || 2026);
                setNewModalOpen(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider shadow-sm shadow-indigo-600/25 transition-all hover:scale-[1.01] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Novo Boleto / Assinatura
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Superiores: Total do Ano, A Pagar (Pendentes), Pago no Ano */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                TOTAL DO ANO
              </span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/50">
                <Receipt className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
              {brl(yearTotals.totalAno)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>Soma de todos os compromissos do ano</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">{yearTotals.totalCount} itens</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-amber-200/70 dark:border-amber-900/50 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                A PAGAR (PENDENTES)
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/50 dark:border-amber-800/50">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight tabular-nums">
              {brl(yearTotals.totalPendente)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>Total pendente a quitar no ano</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {yearTotals.pendingCount} pendentes
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-emerald-200/70 dark:border-emerald-900/50 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                PAGO NO ANO
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/50 dark:border-emerald-800/50">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
              {brl(yearTotals.totalPago)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>Total liquidado no ano</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {yearTotals.paidCount} liquidados
            </span>
          </div>
        </div>
      </section>

      {/* Tabela de Compromissos */}
      <section className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
        {/* Controles de Filtros e Busca */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => setStatusFilter("TODOS")}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "TODOS"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Todos ({yearTotals.totalCount})
            </button>
            <button
              onClick={() => setStatusFilter("PENDENTE")}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                statusFilter === "PENDENTE"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400"
              }`}
            >
              <Clock className="w-3 h-3" />
              A Pagar ({yearTotals.pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter("PAGO")}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                statusFilter === "PAGO"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Pagos ({yearTotals.paidCount})
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar boleto ou assinatura..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Listagem em Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-auto text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider bg-slate-50/50 dark:bg-slate-950/40">
                <th className="py-2.5 px-3 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={pendingList.length > 0 && pendingList.every((c: any) => selectedIds.includes(c.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(pendingList.map((c: any) => c.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    disabled={pendingList.length === 0}
                    className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-40"
                    title={pendingList.length > 0 ? "Selecionar todas as pendentes" : "Nenhum compromisso pendente"}
                  />
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap">Vencimento</th>
                <th className="py-2.5 px-3">Descrição / Fornecedor</th>
                <th className="py-2.5 px-2 whitespace-nowrap">Tipo</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Valor</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-semibold text-slate-500">Carregando compromissos...</p>
                    </div>
                  </td>
                </tr>
              ) : statusFilter === "PENDENTE" ? (
                pendingList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500/80 dark:text-emerald-400/80" />
                        <p className="font-semibold text-sm text-slate-600 dark:text-slate-300">
                          Nenhum compromisso pendente a pagar em {selectedYear}.
                        </p>
                        <p className="text-xs text-slate-400">
                          Todas as contas cadastradas já foram quitadas.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pendingList.map(renderRow)
                )
              ) : statusFilter === "PAGO" ? (
                paidList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Clock className="w-8 h-8 text-amber-500/80 dark:text-amber-400/80" />
                        <p className="font-semibold text-sm text-slate-600 dark:text-slate-300">
                          Nenhum compromisso pago em {selectedYear}.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paidList.map(renderRow)
                )
              ) : (
                // Modo TODOS: Pendentes em destaque + Pagos recolhíveis em acordeão
                <>
                  {pendingList.length === 0 && paidList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          <p className="font-semibold text-sm text-slate-600 dark:text-slate-300">
                            Nenhum compromisso encontrado para o ano de {selectedYear}.
                          </p>
                          <button
                            onClick={() => setNewModalOpen(true)}
                            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Cadastrar Primeiro Boleto / Assinatura
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {pendingList.length === 0 && paidList.length > 0 && (
                        <tr>
                          <td colSpan={7} className="py-3 px-4 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20">
                            🎉 Todos os compromissos deste ano já foram pagos!
                          </td>
                        </tr>
                      )}

                      {/* 1. Compromissos Pendentes em Destaque */}
                      {pendingList.map(renderRow)}

                      {/* 2. Seção Expansível para os Pagos */}
                      {paidList.length > 0 && (
                        <tr className="bg-slate-50/70 dark:bg-slate-900/50 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td colSpan={7} className="p-2 sm:p-2.5">
                            <button
                              type="button"
                              onClick={() => setShowPaidItems(!showPaidItems)}
                              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer shadow-xs group"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform">
                                  {showPaidItems ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </div>
                                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                                  {showPaidItems ? "Ocultar compromissos já pagos" : "Ver compromissos já pagos"}
                                </span>
                                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                  ({paidCount} {paidCount === 1 ? "item pago" : "itens pagos"} — {brl(paidTotal)})
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                <span>{showPaidItems ? "Recolher" : "Expandir"}</span>
                                {showPaidItems ? (
                                  <ChevronDown className="w-3 h-3" />
                                ) : (
                                  <ChevronRight className="w-3 h-3" />
                                )}
                              </div>
                            </button>
                          </td>
                        </tr>
                      )}

                      {/* 3. Itens Pagos quando abertos */}
                      {showPaidItems && paidList.map(renderRow)}
                    </>
                  )}
                </>
              )}
            </tbody>

            {/* Totalizador de Rodapé */}
            {(pendingList.length > 0 || paidList.length > 0) && (
              <tfoot className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-950/70 text-xs font-bold">
                <tr>
                  <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                  <td className="py-2.5 px-3 text-slate-900 dark:text-white font-extrabold whitespace-nowrap">
                    TOTAL LISTADO
                    <span className="ml-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      ({statusFilter === "PENDENTE"
                        ? `${pendingList.length} itens`
                        : statusFilter === "PAGO"
                        ? `${paidList.length} itens`
                        : `${yearTotals.totalCount} itens`}
                      )
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[10px]" colSpan={2}>
                    {yearTotals.pendingCount} a pagar • {yearTotals.paidCount} pagos
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <span className="font-mono tabular-nums font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                      {brl(
                        statusFilter === "PENDENTE"
                          ? yearTotals.totalPendente
                          : statusFilter === "PAGO"
                          ? yearTotals.totalPago
                          : yearTotals.totalAno
                      )}
                    </span>
                  </td>
                  <td className="py-2.5 px-3" colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* Barra Flutuante de Baixa em Lote */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 dark:bg-[#131B2E]/95 border border-indigo-500/30 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs">
              {selectedIds.length} {selectedIds.length === 1 ? "conta selecionada" : "contas selecionadas"}
            </span>
            <span className="text-emerald-400 font-black text-xs font-tnum tabular-nums">
              ({brl(selectedTotalAmount)})
            </span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <button
            onClick={openBatchBaixaModal}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-4 py-2 rounded-xl transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Pagar Selecionadas Juntas</span>
          </button>
          <button
            onClick={() => setSelectedIds([])}
            className="text-slate-400 hover:text-white p-1 ml-1 cursor-pointer"
            title="Cancelar seleção"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal: Novo Compromisso */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/50">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Novo Boleto / Assinatura</h3>
              </div>
              <button
                onClick={() => setNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNew} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Descrição *</label>
                <input
                  type="text"
                  placeholder="Ex: Aluguel, Netflix, Luz, Financiamento"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
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
                    value={newCompMonth}
                    onChange={(e) => setNewCompMonth(Number(e.target.value))}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {MONTH_NAMES_LIST.map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={newCompYear}
                    onChange={(e) => setNewCompYear(Number(e.target.value))}
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
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Data de Vencimento *</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Tipo</label>
                  <select
                    value={newTipo}
                    onChange={(e) => setNewTipo(e.target.value as any)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="BOLETO">Boleto / Conta Fixa</option>
                    <option value="ASSINATURA">Assinatura / Mensalidade</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Recorrência</label>
                  <select
                    value={newRecorrencia}
                    onChange={(e) => setNewRecorrencia(e.target.value as any)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="MENSAL">Repetir todo mês</option>
                    <option value="UNICO">Apenas neste mês</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingNew}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingNew ? "Salvando..." : "Salvar Compromisso"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Baixa / Pagamento */}
      {payItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirmar Pagamento</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Conta: <b>{payItem.description}</b> ({brl(payItem.amount)})
                </p>
              </div>
              <button
                onClick={() => setPayItem(null)}
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
                    {commitmentsData.contasBancarias.map((conta) => (
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
                    {commitmentsData.cartoesCredito.map((cartao) => (
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
                onClick={() => setPayItem(null)}
                disabled={paying}
                className="w-1/2 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleEfetivarBaixa}
                disabled={paying}
                className="w-1/2 py-2 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {paying ? "Processando..." : "Confirmar Baixa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Baixa em Lote */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/50 dark:border-emerald-800/50">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Pagar Contas em Lote</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {selectedIds.length} contas selecionadas • Total: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{brl(selectedTotalAmount)}</strong>
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
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">Forma de Pagamento *</label>
                <select
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm bg-white cursor-pointer"
                  value={batchBaixaForma}
                  onChange={(e) => setBatchBaixaForma(e.target.value as any)}
                >
                  <option value="SALDO_CONTA">Saldo da Conta Corrente (Manual)</option>
                  <option value="DEBITO_AUTOMATICO">Débito Automático (Conta Corrente)</option>
                  <option value="PIX">Pix (Sai da Conta Corrente)</option>
                  <option value="CARTAO_CREDITO">Cartão de Crédito (Gera Fatura)</option>
                  <option value="DINHEIRO">Dinheiro em Espécie (Caixa Físico)</option>
                </select>
              </div>

              {["SALDO_CONTA", "DEBITO_AUTOMATICO", "PIX"].includes(batchBaixaForma) && (
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">Qual Conta Corrente Debitar?</label>
                  <select
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm cursor-pointer"
                    value={batchBaixaContaId}
                    onChange={(e) => setBatchBaixaContaId(e.target.value)}
                  >
                    {commitmentsData.contasBancarias.map((conta: any) => (
                      <option key={conta.id} value={conta.id}>
                        {conta.banco} - Saldo: R$ {conta.saldoAtual.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {batchBaixaForma === "CARTAO_CREDITO" && (
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">Qual Cartão de Crédito?</label>
                  <select
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm cursor-pointer"
                    value={batchBaixaCartaoId}
                    onChange={(e) => setBatchBaixaCartaoId(e.target.value)}
                  >
                    {commitmentsData.cartoesCredito.map((cartao: any) => (
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
                onClick={handleEfetivarBaixaLote}
                disabled={payingBatch}
                className="w-1/2 py-2 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {payingBatch ? "Processando..." : "Confirmar Baixa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Compromisso */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/50 dark:border-amber-800/50">
                  <Pencil className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Editar Compromisso</h3>
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
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Descrição</label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
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
                    value={editCompMonth}
                    onChange={(e) => setEditCompMonth(Number(e.target.value))}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {MONTH_NAMES_LIST.map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={editCompYear}
                    onChange={(e) => setEditCompYear(Number(e.target.value))}
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
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Valor (R$)</label>
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
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Data de Vencimento</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Tipo</label>
                  <select
                    value={editTipo}
                    onChange={(e) => setEditTipo(e.target.value as any)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="BOLETO">Boleto / Conta Fixa</option>
                    <option value="ASSINATURA">Assinatura / Mensalidade</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Recorrência</label>
                  <select
                    value={editRecorrencia}
                    onChange={(e) => setEditRecorrencia(e.target.value as any)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="MENSAL">Repetir todo mês</option>
                    <option value="UNICO">Apenas neste mês</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  disabled={editing}
                  className="w-1/2 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {editing ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Exclusão */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 pb-4 flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200/60 dark:border-rose-900/40 shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Excluir Compromisso
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Esta ação não poderá ser desfeita
                  </p>
                </div>
              </div>
              <button
                onClick={() => setItemToDelete(null)}
                disabled={deleting}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800/80 space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                  Compromisso
                </span>
                <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {itemToDelete.description}
                </p>
                <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">{itemToDelete.dueDateFormatted}</span>
                  <span className="font-extrabold text-rose-600 dark:text-rose-400 text-sm tabular-nums">
                    {brl(itemToDelete.amount)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setItemToDelete(null)}
                  disabled={deleting}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-900/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{deleting ? "Excluindo..." : "Sim, Excluir"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
