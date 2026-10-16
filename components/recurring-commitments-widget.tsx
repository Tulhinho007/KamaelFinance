"use client";

import React from "react";
import Link from "next/link";
import { Repeat, Plus, ChevronRight, Edit2, Calendar } from "lucide-react";
import { CurrencyValue } from "@/components/currency-value";

export interface RecurringCommitmentItem {
  id: string;
  description: string;
  rawDescription?: string;
  amount: number;
  recurringDay: number;
  tipo: "BOLETO" | "ASSINATURA";
  icon: string;
  walletTitle?: string;
  isPaid?: boolean;
  dueDate?: string | Date;
  tags?: string;
}

interface RecurringCommitmentsWidgetProps {
  data?: {
    totalMonthly: number;
    items: RecurringCommitmentItem[];
  };
  onManageClick: () => void;
  onEditItem?: (item: RecurringCommitmentItem) => void;
}

export function RecurringCommitmentsWidget({
  data,
  onManageClick,
  onEditItem,
}: RecurringCommitmentsWidgetProps) {
  const items = data?.items || [];
  const totalMonthly = data?.totalMonthly ?? 0;

  return (
    <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-white/[0.08] p-6 shadow-sm shadow-slate-200/50 dark:shadow-lg dark:shadow-black/20 flex flex-col gap-4">
      {/* ── CABEÇALHO DO WIDGET ── */}
      <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-white/[0.06] pb-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Repeat className="w-4 h-4" strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                  Gastos Fixos / Recorrência
                </h3>
                {items.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20">
                    {items.length} {items.length === 1 ? "fixo" : "fixos"}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-normal">
                Compromissos essenciais e custo fixo mensal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onManageClick}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-500/30 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
            title="Adicionar ou editar compromissos recorrentes"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span className="hidden sm:inline">Gerenciar Fixos</span>
            <span className="sm:hidden">Fixos</span>
          </button>
        </div>

        {/* Destaque do Custo Fixo Somado */}
        <div className="flex items-baseline justify-between bg-slate-50/80 dark:bg-zinc-800/40 rounded-xl px-3.5 py-2.5 border border-slate-100 dark:border-white/[0.04]">
          <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">
            Total Mensal Previsto:
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-black text-slate-900 dark:text-zinc-100 font-tnum tabular-nums tracking-tight">
              <CurrencyValue value={totalMonthly} />
            </span>
            <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-normal">
              /mês
            </span>
          </div>
        </div>
      </div>

      {/* ── LISTA COMPACTA COM SCROLL INTERNO ── */}
      {items.length === 0 ? (
        <div className="py-7 flex flex-col items-center justify-center gap-2.5 text-center">
          <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-white/[0.06] flex items-center justify-center text-slate-400 text-lg">
            ⚡
          </div>
          <div className="max-w-[260px]">
            <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Nenhum gasto fixo cadastrado
            </p>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              Cadastre contas recorrentes como internet, luz e academia para prever seus custos mensais.
            </p>
          </div>
          <button
            type="button"
            onClick={onManageClick}
            className="mt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            + Cadastrar primeiro fixo
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[290px] overflow-y-auto pr-1 custom-scrollbar">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => onEditItem ? onEditItem(item) : onManageClick()}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-white/[0.04] bg-slate-50/50 dark:bg-zinc-800/30 hover:bg-slate-100/70 dark:hover:bg-zinc-800/70 transition-all cursor-pointer group select-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 bg-white dark:bg-zinc-900 shadow-xs border border-slate-200/60 dark:border-white/[0.08]"
                  title={item.tipo}
                >
                  {item.icon || "⚡"}
                </span>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.description}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 truncate">
                    <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>Todo dia {String(item.recurringDay || 10).padStart(2, "0")}</span>
                    <span className="text-slate-300 dark:text-zinc-600">•</span>
                    <span>{item.tipo === "ASSINATURA" ? "Assinatura" : "Boleto / Conta"}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900 dark:text-zinc-100 font-tnum tabular-nums">
                    <CurrencyValue value={item.amount} />
                  </p>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                    mensal
                  </span>
                </div>

                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 hover:text-indigo-600 hover:bg-slate-200/50 dark:hover:bg-zinc-700/50 transition-all">
                  <Edit2 className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── RODAPÉ COM LINK PARA AGENDA COMPLETA ── */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/[0.06] text-xs">
        <span className="text-[11px] text-slate-400 dark:text-zinc-500">
          Impacto contínuo no fluxo de caixa
        </span>
        <Link
          href="/contas"
          className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center gap-1 text-[11px]"
        >
          Ver na Agenda <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
        </Link>
      </div>
    </div>
  );
}
