"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AlertCircle, ChevronRight, X, Clock, AlertTriangle } from "lucide-react";
import { CurrencyValue } from "@/components/currency-value";

export interface DueBillItem {
  id: string;
  title: string;
  valor: number;
  vencimento: string;
  daysDiff?: number;
  isPast?: boolean;
  dueDate?: string;
  statusBadgeVariant?: "overdue" | "urgent" | "pending";
}

export interface UpcomingDueAlertBannerProps {
  bills: DueBillItem[];
  onViewInvoices?: () => void;
  className?: string;
}

export function UpcomingDueAlertBanner({
  bills = [],
  onViewInvoices,
  className = "",
}: UpcomingDueAlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !bills || bills.length === 0) return null;

  // Filtra contas e faturas com vencimento entre Hoje (0) e D+3 (3 dias)
  const iminenteBills = bills.filter((b) => {
    if (b.daysDiff !== undefined) {
      return b.daysDiff >= 0 && b.daysDiff <= 3;
    }
    return false;
  });

  const overdueBills = bills.filter((b) => b.isPast || (b.daysDiff !== undefined && b.daysDiff < 0));

  const totalAlertaCount = iminenteBills.length;
  const totalAlertaValor = iminenteBills.reduce((s, b) => s + (Number(b.valor) || 0), 0);

  // Se não houver contas iminentes nos próximos 3 dias nem atrasadas, não exibe
  if (totalAlertaCount === 0 && overdueBills.length === 0) return null;

  const hasOverdue = overdueBills.length > 0;
  const overdueValor = overdueBills.reduce((s, b) => s + (Number(b.valor) || 0), 0);

  return (
    <div
      className={`rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-all animate-in fade-in duration-200 ${
        hasOverdue
          ? "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-950 dark:text-rose-200"
          : "bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200"
      } ${className}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            hasOverdue
              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
              : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
          }`}
        >
          {hasOverdue ? <AlertTriangle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
        </div>

        <div>
          <p className="text-xs sm:text-sm font-black leading-snug">
            {hasOverdue ? (
              <>
                Atenção: Você tem{" "}
                <strong className="underline decoration-rose-500 decoration-2">
                  {overdueBills.length} {overdueBills.length === 1 ? "fatura atrasada" : "faturas atrasadas"}
                </strong>{" "}
                (<CurrencyValue value={overdueValor} className="font-extrabold" />)
                {totalAlertaCount > 0 && (
                  <>
                    {" "}e{" "}
                    <strong>
                      {totalAlertaCount} {totalAlertaCount === 1 ? "conta vencendo" : "contas vencendo"}
                    </strong>{" "}
                    em até 72h (<CurrencyValue value={totalAlertaValor} className="font-extrabold" />)
                  </>
                )}
                .
              </>
            ) : (
              <>
                Atenção: Você tem{" "}
                <strong className="underline decoration-amber-500 decoration-2">
                  {totalAlertaCount} {totalAlertaCount === 1 ? "conta vencendo" : "contas vencendo"}
                </strong>{" "}
                nos próximos dias totalizando{" "}
                <CurrencyValue value={totalAlertaValor} className="font-black text-amber-950 dark:text-amber-100" />.
              </>
            )}
          </p>
          <p className="text-[11px] opacity-80 mt-0.5 font-medium">
            {hasOverdue
              ? "Evite juros e encargos liquidando os compromissos vencidos."
              : "Compromissos pendentes entre hoje e os próximos 3 dias (D-3 a D-1)."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        <Link
          href="/despesas"
          onClick={onViewInvoices}
          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap ${
            hasOverdue
              ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20"
              : "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20"
          }`}
        >
          Ver Faturas & Contas
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>

        <button
          onClick={() => setDismissed(true)}
          title="Fechar aviso"
          className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
