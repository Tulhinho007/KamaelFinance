"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Repeat,
  Trash2,
  Edit2,
  Check,
  Calendar,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { CurrencyValue } from "@/components/currency-value";
import { useModal } from "@/components/ui/custom-dialog-provider";
import { RecurringCommitmentItem } from "./recurring-commitments-widget";
import {
  saveRecurringCommitmentAction,
  deleteRecurringCommitmentAction,
} from "@/lib/actions";

interface ManageRecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  items?: RecurringCommitmentItem[];
  totalMonthly?: number;
  initialEditItem?: RecurringCommitmentItem | null;
}

const QUICK_SUGGESTIONS = [
  { label: "Academia / Treino", emoji: "🏋️", tipo: "BOLETO" as const },
  { label: "Internet Fibra", emoji: "🌐", tipo: "ASSINATURA" as const },
  { label: "Telefone / Celular", emoji: "📱", tipo: "ASSINATURA" as const },
  { label: "Energia / Luz", emoji: "⚡", tipo: "BOLETO" as const },
  { label: "Água / Saneamento", emoji: "💧", tipo: "BOLETO" as const },
  { label: "Aluguel / Condomínio", emoji: "🏠", tipo: "BOLETO" as const },
  { label: "Streaming / Assinatura", emoji: "🎬", tipo: "ASSINATURA" as const },
];

export function ManageRecurringModal({
  isOpen,
  onClose,
  onSuccess,
  items = [],
  totalMonthly = 0,
  initialEditItem = null,
}: ManageRecurringModalProps) {
  const { showAlert, showConfirm } = useModal();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState<string | number>("");
  const [dueDay, setDueDay] = useState<number>(10);
  const [tipo, setTipo] = useState<"BOLETO" | "ASSINATURA">("BOLETO");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Carrega item para edição quando fornecido
  useEffect(() => {
    if (initialEditItem) {
      setEditingId(initialEditItem.id);
      setDesc(initialEditItem.description);
      setAmount(initialEditItem.amount);
      setDueDay(initialEditItem.recurringDay || 10);
      setTipo(initialEditItem.tipo || "BOLETO");
    } else {
      resetForm();
    }
  }, [initialEditItem, isOpen]);

  const resetForm = () => {
    setEditingId(null);
    setDesc("");
    setAmount("");
    setDueDay(10);
    setTipo("BOLETO");
  };

  const handleSelectSuggestion = (s: typeof QUICK_SUGGESTIONS[0]) => {
    setDesc(s.label);
    setTipo(s.tipo);
  };

  const handleStartEdit = (item: RecurringCommitmentItem) => {
    setEditingId(item.id);
    setDesc(item.description);
    setAmount(item.amount);
    setDueDay(item.recurringDay || 10);
    setTipo(item.tipo || "BOLETO");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!desc.trim()) {
      showAlert("Informe a descrição do custo fixo.", { variant: "warning" });
      return;
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showAlert("Informe um valor mensal válido maior que zero.", { variant: "warning" });
      return;
    }

    setSubmitting(true);
    try {
      await saveRecurringCommitmentAction({
        id: editingId || undefined,
        description: desc.trim(),
        amount: numAmount,
        recurringDay: Number(dueDay) || 10,
        tipo,
      });

      showAlert(
        editingId
          ? "Compromisso fixo atualizado com sucesso!"
          : "Compromisso fixo adicionado com sucesso!",
        { variant: "success" }
      );
      resetForm();
      onSuccess();
    } catch (err: any) {
      showAlert(err?.message || "Erro ao salvar compromisso fixo.", { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: RecurringCommitmentItem) => {
    const confirmed = await showConfirm(
      `Deseja realmente remover o compromisso "${item.description}" dos seus custos fixos?`,
      {
        title: "Remover Gasto Fixo",
        confirmText: "Sim, remover",
        cancelText: "Cancelar",
        variant: "danger",
      }
    );

    if (!confirmed) return;

    setDeletingId(item.id);
    try {
      await deleteRecurringCommitmentAction(item.id);
      showAlert("Compromisso removido com sucesso.", { variant: "success" });
      if (editingId === item.id) {
        resetForm();
      }
      onSuccess();
    } catch (err: any) {
      showAlert(err?.message || "Erro ao remover compromisso fixo.", { variant: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 w-[96%] sm:w-full max-w-xl max-h-[92vh] overflow-y-auto flex flex-col gap-5 shadow-2xl border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white animate-in zoom-in-95">
        {/* ── HEADER ── */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/[0.06] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Repeat className="w-5 h-5" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Gerenciar Gastos Fixos & Recorrência
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Previsão contínua do custo de vida mensal (água, luz, internet, treino...)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── FORMULÁRIO RÁPIDO (NOVO / EDIÇÃO) ── */}
        <form
          onSubmit={handleSubmit}
          className="p-4 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/70 dark:border-white/[0.06] flex flex-col gap-3.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              {editingId ? "Editar Custo Fixo" : "Novo Custo Fixo Recorrente"}
            </span>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Cancelar Edição
              </button>
            )}
          </div>

          {/* Sugestões Rápidas (Chips) */}
          {!editingId && (
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => handleSelectSuggestion(s)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/[0.08] hover:border-indigo-400 dark:hover:border-indigo-500 text-slate-700 dark:text-zinc-300 transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>{s.emoji}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Campos do Formulário */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Descrição do Gasto Fixo *
              </label>
              <input
                type="text"
                required
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Ex: Treino / Academia, Internet Banda Larga, Celular..."
                className="w-full rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/[0.1] px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Valor Mensal (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/[0.1] px-3.5 py-2 text-xs font-bold font-tnum tabular-nums text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Dia de Vencimento Recorrente (1 a 31) *
              </label>
              <input
                type="number"
                min="1"
                max="31"
                required
                value={dueDay}
                onChange={(e) => setDueDay(Number(e.target.value))}
                placeholder="Dia do mês (ex: 10)"
                className="w-full rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/[0.1] px-3.5 py-2 text-xs font-bold font-tnum tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Tipo do Compromisso
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTipo("BOLETO")}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    tipo === "BOLETO"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span>📄 Boleto / Conta Fixa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTipo("ASSINATURA")}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    tipo === "ASSINATURA"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span>🔄 Assinatura / Débito</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                "Salvando..."
              ) : editingId ? (
                <>
                  <Check className="w-4 h-4" />
                  Salvar Alterações
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Adicionar Gasto Fixo
                </>
              )}
            </button>
          </div>
        </form>

        {/* ── LISTA DOS FIXOS ATIVOS ── */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
              Custos Fixos Ativos ({items.length})
            </span>
            <span className="text-xs font-semibold text-slate-900 dark:text-white font-tnum tabular-nums">
              Soma: <CurrencyValue value={totalMonthly} />/mês
            </span>
          </div>

          {items.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.1] text-center text-xs text-slate-400">
              Nenhum compromisso recorrente cadastrado ainda. Use o formulário acima para adicionar.
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    editingId === item.id
                      ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-500/10"
                      : "border-slate-100 dark:border-white/[0.04] bg-white dark:bg-zinc-800/40 hover:bg-slate-50 dark:hover:bg-zinc-800/80"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 bg-slate-50 dark:bg-zinc-900 border border-slate-200/50 dark:border-white/[0.06]">
                      {item.icon || "⚡"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {item.description}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <span>Vence todo dia {String(item.recurringDay || 10).padStart(2, "0")}</span>
                        <span>•</span>
                        <span>{item.tipo === "ASSINATURA" ? "Assinatura" : "Boleto"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-tnum tabular-nums">
                      <CurrencyValue value={item.amount} />
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-zinc-700/60 transition-colors cursor-pointer"
                        title="Editar valor ou data"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        disabled={deletingId === item.id}
                        onClick={() => handleDelete(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
                        title="Remover compromisso"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Atualiza a projeção de caixa e compromissos do mês</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
