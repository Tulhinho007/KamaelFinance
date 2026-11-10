"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  SlidersHorizontal,
  X,
  Sliders,
  CheckCircle2,
  Calendar,
  Pencil,
  Trash2,
} from "lucide-react";
import { parseCurrencyInput } from "@/lib/constants";
import { useModal } from "@/components/ui/custom-dialog-provider";
import {
  getBankAccountDataById,
  setExactBankAccountBalanceAction,
  updateBankAccountAdjustmentAction,
  deleteBankAccountAdjustmentAction,
} from "@/lib/actions";

const formatBRL = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDateBR = (dateStr?: string | null) => {
  if (!dateStr) return "-";
  const clean = dateStr.split("T")[0];
  const parts = clean.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return clean;
};

const getBankStyle = (name: string = "") => {
  const lower = name.toLowerCase();
  if (lower.includes("picpay")) {
    return {
      iconBg: "bg-emerald-600 text-white",
      initials: "PIC",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    };
  }
  if (lower.includes("santander")) {
    return {
      iconBg: "bg-red-700 text-white",
      initials: "SAN",
      badgeColor: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
    };
  }
  if (lower.includes("nubank") || lower.includes("nu")) {
    return {
      iconBg: "bg-purple-600 text-white",
      initials: "NU",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800",
    };
  }
  if (lower.includes("inter")) {
    return {
      iconBg: "bg-orange-500 text-white",
      initials: "INT",
      badgeColor: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800",
    };
  }
  if (lower.includes("itau") || lower.includes("itaú")) {
    return {
      iconBg: "bg-amber-600 text-white",
      initials: "ITAU",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
    };
  }
  if (lower.includes("bradesco")) {
    return {
      iconBg: "bg-red-600 text-white",
      initials: "BRA",
      badgeColor: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
    };
  }
  if (lower.includes("caixa")) {
    return {
      iconBg: "bg-blue-600 text-white",
      initials: "CEF",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
    };
  }
  if (lower.includes("brasil") || lower.includes("bb")) {
    return {
      iconBg: "bg-yellow-500 text-slate-950",
      initials: "BB",
      badgeColor: "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800",
    };
  }
  return {
    iconBg: "bg-indigo-600 text-white",
    initials: (name.substring(0, 3) || "BCO").toUpperCase(),
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800",
  };
};

interface AjusteRecord {
  id: string;
  sourceType?: "TRANSACTION" | "AUDIT_LOG";
  data: string;
  rawDate?: string;
  ano: number;
  saldoAnterior: number;
  novoSaldo: number;
  diff: number;
  motivo: string;
}

interface AccountData {
  wallet: {
    id: string;
    nome: string;
    title: string;
    bankName: string;
    walletType: string;
    titular: string;
    holder: string;
    saldo: number;
    currentRealBalance: number;
  };
  anoSelecionado: number;
  anosDisponiveis: number[];
  ajustes: AjusteRecord[];
  todosAjustes: AjusteRecord[];
}

export default function ContaSimplesPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params?.id as string;

  const { showAlert, showConfirm } = useModal();

  const anoAtual = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(anoAtual);
  const anosDisponiveis = [anoAtual - 1, anoAtual, anoAtual + 1];

  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal Ajustar Saldo (Novo Ajuste)
  const [modalOpen, setModalOpen] = useState(false);
  const [exactBalanceInput, setExactBalanceInput] = useState("");
  const [motivoInput, setMotivoInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Modal Editar Lançamento de Ajuste
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAjuste, setEditingAjuste] = useState<AjusteRecord | null>(null);
  const [editDateInput, setEditDateInput] = useState("");
  const [editBalanceInput, setEditBalanceInput] = useState("");
  const [editMotivoInput, setEditMotivoInput] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Carregar dados
  const loadData = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const res = await getBankAccountDataById(accountId, undefined, selectedYear);
      if (!res) {
        showAlert("Conta bancária não encontrada ou não autorizada.", { variant: "warning" });
        router.replace("/contas");
        return;
      }

      // Se for cartão de crédito legítimo, redireciona para a rota de cartões
      if (res.wallet.walletType === "CREDIT_CARD" || res.wallet.walletType === "CARTAO_CREDITO") {
        router.replace(`/cartoes/${res.wallet.id}`);
        return;
      }

      setData(res as any);
    } catch (err) {
      console.error("Erro ao carregar dados da conta:", err);
      showAlert("Não foi possível carregar os dados da conta.", { variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [accountId, selectedYear, router, showAlert]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtragem estrita dos ajustes manuais pelo ano selecionado
  const ajustesDoAno = useMemo(() => {
    if (!data?.todosAjustes) return [];
    return data.todosAjustes.filter((a) => a.ano === selectedYear);
  }, [data?.todosAjustes, selectedYear]);

  // Abertura do modal
  const handleOpenModal = () => {
    if (!data) return;
    const current = Number(data.wallet.saldo ?? data.wallet.currentRealBalance ?? 0);
    setExactBalanceInput(
      current.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
    setMotivoInput("");
    setModalOpen(true);
  };

  // Salvar ajuste
  const handleSaveExactBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    const targetExact = parseCurrencyInput(exactBalanceInput);
    if (isNaN(targetExact)) {
      showAlert("Informe um valor de saldo válido.", { variant: "warning" });
      return;
    }

    const currentBal = Number(data.wallet.saldo ?? data.wallet.currentRealBalance ?? 0);
    const diff = Math.round((targetExact - currentBal) * 100) / 100;
    if (diff === 0) {
      showAlert("O saldo digitado é idêntico ao saldo atual da conta.", { variant: "info" });
      setModalOpen(false);
      return;
    }

    setSaving(true);
    try {
      const res = await setExactBankAccountBalanceAction({
        contaId: data.wallet.id,
        novoSaldo: targetExact,
        descricao: motivoInput.trim() || `Ajuste para saldo real (${formatBRL(targetExact)})`,
      });

      if (res && res.success) {
        showAlert(`Saldo ajustado com sucesso para ${formatBRL(targetExact)}!`, {
          variant: "success",
        });
        setModalOpen(false);
        await loadData();
      } else {
        showAlert("Erro ao ajustar saldo. Tente novamente.", { variant: "danger" });
      }
    } catch (err) {
      console.error("Erro ao salvar ajuste de saldo:", err);
      showAlert("Falha ao salvar novo saldo.", { variant: "danger" });
    } finally {
      setSaving(false);
    }
  };

  // Abrir Modal de Edição de Lançamento
  const handleOpenEditModal = (ajuste: AjusteRecord) => {
    setEditingAjuste(ajuste);
    const rawDate = ajuste.rawDate || ajuste.data.split("T")[0];
    setEditDateInput(rawDate);
    setEditBalanceInput(
      Number(ajuste.novoSaldo).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
    setEditMotivoInput(ajuste.motivo || "");
    setEditModalOpen(true);
  };

  // Salvar Edição de Lançamento
  const handleSaveEditAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAjuste) return;

    const targetExact = parseCurrencyInput(editBalanceInput);
    if (isNaN(targetExact)) {
      showAlert("Informe um valor de saldo válido.", { variant: "warning" });
      return;
    }
    if (!editDateInput) {
      showAlert("Informe a data do lançamento.", { variant: "warning" });
      return;
    }

    setSavingEdit(true);
    try {
      const res = await updateBankAccountAdjustmentAction({
        id: editingAjuste.id,
        sourceType: editingAjuste.sourceType,
        dateStr: editDateInput,
        novoSaldo: targetExact,
        motivo: editMotivoInput.trim() || undefined,
      });

      if (res && res.success) {
        showAlert("Lançamento atualizado com sucesso!", { variant: "success" });
        setEditModalOpen(false);
        setEditingAjuste(null);
        await loadData();
      } else {
        showAlert(res?.error || "Erro ao atualizar ajuste.", { variant: "danger" });
      }
    } catch (err) {
      console.error("Erro ao atualizar ajuste:", err);
      showAlert("Falha ao salvar alterações.", { variant: "danger" });
    } finally {
      setSavingEdit(false);
    }
  };

  // Excluir Lançamento de Ajuste
  const handleDeleteAjuste = async (ajuste: AjusteRecord) => {
    const confirmed = await showConfirm(
      "Tem certeza que deseja excluir este lançamento de ajuste de saldo? O saldo da conta será recalculado.",
      {
        title: "Excluir Lançamento de Ajuste",
        variant: "danger",
        confirmText: "Sim, Excluir",
        cancelText: "Cancelar",
      }
    );
    if (!confirmed) return;

    try {
      const res = await deleteBankAccountAdjustmentAction(ajuste.id);
      if (res && res.success) {
        showAlert("Lançamento de ajuste excluído com sucesso!", { variant: "success" });
        await loadData();
      } else {
        showAlert(res?.error || "Erro ao excluir ajuste de saldo.", { variant: "danger" });
      }
    } catch (err) {
      console.error("Erro ao excluir ajuste:", err);
      showAlert("Falha ao excluir ajuste de saldo.", { variant: "danger" });
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400 text-sm">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="font-semibold">Carregando dados da conta...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const bankName = data.wallet.nome || data.wallet.bankName || data.wallet.title;
  const titular = data.wallet.titular || data.wallet.holder || "Titular";
  const saldoAtual = Number(data.wallet.saldo ?? data.wallet.currentRealBalance ?? 0);
  const bankStyle = getBankStyle(bankName);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 text-slate-900 dark:text-slate-100">
      {/* ── VOLTAR ───────────────────────────────────────────────────────── */}
      <div>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          ← Voltar para o Dashboard
        </Link>
      </div>

      {/* ── CARD ÚNICO: DADOS DA CONTA + SALDO ATUAL + AÇÃO ──────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl tracking-wider shrink-0 shadow-sm ${bankStyle.iconBg}`}>
            {bankStyle.initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {bankName}
              </h1>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${bankStyle.badgeColor}`}>
                CONTA CORRENTE
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Titular: {titular}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 self-end md:self-auto">
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
              Saldo Atual
            </span>
            <span className={`text-2xl font-black tabular-nums ${saldoAtual >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {formatBRL(saldoAtual)}
            </span>
          </div>

          {/* Botão que abre o modal de ajuste */}
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Ajustar Saldo</span>
          </button>
        </div>
      </div>

      {/* ── FILTRO SIMPLES POR ANO ────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-2">
          Ano:
        </span>
        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-slate-700">
          {anosDisponiveis.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setSelectedYear(a)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                selectedYear === a
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* ── TABELA SIMPLIFICADA: APENAS HISTÓRICO DE AJUSTES ─────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white">
            Histórico de Ajustes ({ajustesDoAno.length})
          </h2>
        </div>

        {/* VISÃO DESKTOP: Tabela tradicional */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-6">Data</th>
                <th className="py-3 px-6">Saldo Anterior</th>
                <th className="py-3 px-6">Novo Saldo Definido</th>
                <th className="py-3 px-6">Diferença</th>
                <th className="py-3 px-6">Motivo / Observação</th>
                <th className="py-3 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {ajustesDoAno.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500">
                    Nenhum ajuste manual realizado em {selectedYear}.
                  </td>
                </tr>
              ) : (
                ajustesDoAno.map((ajuste) => {
                  const diff = Number(ajuste.novoSaldo) - Number(ajuste.saldoAnterior);
                  return (
                    <tr key={ajuste.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-6 font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatDateBR(ajuste.data)}
                      </td>
                      <td className="py-3.5 px-6 text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                        {formatBRL(Number(ajuste.saldoAnterior))}
                      </td>
                      <td className="py-3.5 px-6 font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                        {formatBRL(Number(ajuste.novoSaldo))}
                      </td>
                      <td
                        className={`py-3.5 px-6 font-semibold tabular-nums whitespace-nowrap ${
                          diff >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {diff > 0 ? `+` : ""}
                        {formatBRL(diff)}
                      </td>
                      <td className="py-3.5 px-6 text-slate-500 dark:text-slate-400 text-xs">
                        {ajuste.motivo || "Ajuste manual"}
                      </td>
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(ajuste)}
                            title="Editar lançamento"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAjuste(ajuste)}
                            title="Excluir lançamento"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* VISÃO MOBILE: Cards empilhados e compactos */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {ajustesDoAno.length === 0 ? (
            <div className="py-8 px-4 text-center text-xs text-slate-400 dark:text-slate-500">
              Nenhum ajuste manual realizado em {selectedYear}.
            </div>
          ) : (
            ajustesDoAno.map((ajuste) => {
              const diff = Number(ajuste.novoSaldo) - Number(ajuste.saldoAnterior);
              return (
                <div key={ajuste.id} className="p-4 flex flex-col gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight">
                        {ajuste.motivo || "Ajuste manual de saldo"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                        <span className="font-medium text-slate-600 dark:text-slate-400">{formatDateBR(ajuste.data)}</span>
                        <span>•</span>
                        <span>Anterior: {formatBRL(Number(ajuste.saldoAnterior))}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums block">
                        {formatBRL(Number(ajuste.novoSaldo))}
                      </span>
                      <span
                        className={`text-xs font-bold tabular-nums inline-block mt-0.5 ${
                          diff >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {diff > 0 ? `+` : ""}
                        {formatBRL(diff)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100/80 dark:border-slate-800/80 text-xs">
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Lançamento
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(ajuste)}
                        className="min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAjuste(ajuste)}
                        className="min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── MODAL AJUSTAR SALDO ──────────────────────────────────────────── */}
      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 shadow-2xl"
          >
            {/* Puxador decorativo para celular */}
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden shrink-0" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${bankStyle.iconBg} shadow-sm shrink-0`}>
                  {bankStyle.initials}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Ajustar Saldo - {bankName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Definir o saldo exato verificado no app do banco
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Saldo Atual */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 mb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Saldo Atual no Sistema
                </span>
                <p className={`text-2xl font-black mt-0.5 tabular-nums ${saldoAtual >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {formatBRL(saldoAtual)}
                </p>
              </div>
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                Tempo Real
              </span>
            </div>

            <form onSubmit={handleSaveExactBalance} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 block mb-1.5">
                  Qual é o saldo atual no banco?
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 400,00"
                    value={exactBalanceInput}
                    onChange={(e) => setExactBalanceInput(e.target.value.replace(/[^0-9.,-]/g, ""))}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white pl-11 pr-3 py-3 rounded-xl text-lg font-bold focus:outline-none focus:border-emerald-500 shadow-2xs"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 block mb-1.5">
                  Motivo / Observação (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Conferência do extrato bancário"
                  value={motivoInput}
                  onChange={(e) => setMotivoInput(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-3 py-3 rounded-xl text-base sm:text-xs font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 min-h-[44px] py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || exactBalanceInput.trim() === ""}
                  className="flex-1 min-h-[44px] py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Confirmar Saldo</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR LANÇAMENTO DE AJUSTE ────────────────────────────── */}
      {editModalOpen && (
        <div
          onClick={() => setEditModalOpen(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 shadow-2xl"
          >
            {/* Puxador decorativo para celular */}
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden shrink-0" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm bg-indigo-600 text-white shadow-sm shrink-0`}>
                  <Pencil className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Editar Lançamento
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ajuste de saldo / abertura - {bankName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAjuste} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 block mb-1.5">
                  Data do Lançamento
                </label>
                <input
                  type="date"
                  value={editDateInput}
                  onChange={(e) => setEditDateInput(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-3 py-3 rounded-xl text-base sm:text-sm font-semibold focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 block mb-1.5">
                  Novo Saldo Definido / Valor
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 525,18"
                    value={editBalanceInput}
                    onChange={(e) => setEditBalanceInput(e.target.value.replace(/[^0-9.,-]/g, ""))}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white pl-11 pr-3 py-3 rounded-xl text-lg font-bold focus:outline-none focus:border-indigo-500 shadow-2xs"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 block mb-1.5">
                  Motivo / Observação
                </label>
                <input
                  type="text"
                  placeholder="Ex: Saldo Inicial de Abertura"
                  value={editMotivoInput}
                  onChange={(e) => setEditMotivoInput(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-3 py-3 rounded-xl text-base sm:text-xs font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="flex-1 min-h-[44px] py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || editBalanceInput.trim() === "" || !editDateInput}
                  className="flex-1 min-h-[44px] py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
                >
                  {savingEdit ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar Alterações</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
