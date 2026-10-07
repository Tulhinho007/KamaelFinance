"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PeriodHeader } from "@/components/period-header";
import { MonthlyClosingView } from "@/components/monthly-closing-view";

export default function FechamentoMensalPage() {
  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto flex flex-col gap-6 md:gap-8 select-none relative font-sans text-slate-900 dark:text-slate-100">
      {/* Top Header & Voltar */}
      <div className="flex flex-col gap-2">
        <Link
          href="/"
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 w-fit transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o Dashboard
        </Link>
        <PeriodHeader
          title="Fechamento Mensal de Gastos"
          tagline="Discriminação objetiva de saídas agrupadas por modalidade (Crédito vs. Débito & Pix) e por conta/cartão."
        />
      </div>

      {/* Conteúdo do Fechamento */}
      <MonthlyClosingView />
    </div>
  );
}
