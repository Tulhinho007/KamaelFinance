"use client";

import { DollarSign, CreditCard } from "lucide-react";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type WalletSummary = {
  id: string;
  title: string;
  initialBalance: number;
  spent: number;
  income: number;
  balance: number;
};

export function SummaryCard({ wallet }: { wallet: WalletSummary }) {
  const isTicket = wallet.title.toLowerCase().includes("ticket");
  const Icon = isTicket ? CreditCard : DollarSign;
  const isPositive = wallet.balance >= 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-5 shadow-sm hover:shadow-xl hover:shadow-slate-900/5 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
      {/* Accent stripe */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl ${isTicket ? "bg-emerald-500" : "bg-indigo-500"} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

      {/* Cabeçalho */}
      <div className="flex justify-between items-start mb-5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">
            {wallet.title}
          </span>
          <h2 className={`text-2xl font-bold tracking-tight tabular-nums font-tnum ${isPositive ? "text-slate-900 dark:text-slate-100" : "text-rose-600 dark:text-rose-400"}`}>
            {brl(wallet.balance)}
          </h2>
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5 block uppercase tracking-wide">
            Saldo Final
          </span>
        </div>

        <div className={`p-2.5 rounded-xl border transition-colors ${
          isTicket
            ? "bg-emerald-500/10 dark:bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
            : "bg-indigo-500/10 dark:bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
        }`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {/* Indicadores base */}
      <div className="border-t border-slate-100 dark:border-slate-800/60 pt-3.5 grid grid-cols-2 gap-4">
        <div>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-widest mb-1">Receitas</span>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 block tabular-nums font-tnum">
            {brl(wallet.income)}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-widest mb-1">Despesas</span>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 block tabular-nums font-tnum">
            {brl(wallet.spent)}
          </span>
        </div>
      </div>
    </div>
  );
}
