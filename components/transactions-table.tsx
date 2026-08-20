"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

type Transaction = {
  id: string;
  description: string;
  amount: unknown;
  date: Date | string;
  category: { name: string; color: string | null } | null;
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dateFmt = (d: Date | string) =>
  new Date(d).toLocaleDateString("pt-BR", { timeZone: "UTC" });

export function TransactionsTable({ title, transactions }: { title: string; transactions: Transaction[] }) {
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    return transactions.filter((t) =>
      t.description.toLowerCase().includes(query.toLowerCase())
    );
  }, [transactions, query]);

  const total = rows.reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm shadow-slate-900/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/60">
        <div>
          <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{title}</h3>
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{rows.length} registros</p>
        </div>
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrar..."
            className="pl-8 pr-4 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 rounded-xl w-40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 dark:focus:border-indigo-500 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800/60">
              <th className="px-5 py-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Descrição</th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Categoria</th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Data</th>
              <th className="px-5 py-3 text-right text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80 dark:divide-slate-800/40">
            {rows.map((t) => (
              <tr
                key={t.id}
                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors duration-150 group"
              >
                <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-200 max-w-48 truncate">
                  {t.description}
                </td>
                <td className="px-4 py-3.5">
                  {t.category ? (
                    <span
                      className="inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide border"
                      style={{
                        backgroundColor: `${t.category.color ?? "#6B7280"}18`,
                        color: t.category.color ?? "#64748B",
                        borderColor: `${t.category.color ?? "#6B7280"}25`,
                      }}
                    >
                      {t.category.name}
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                  {dateFmt(t.date)}
                </td>
                <td className="px-5 py-3.5 text-right font-bold text-slate-900 dark:text-slate-100 tabular-nums font-tnum">
                  {brl(Number(t.amount))}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-slate-400 dark:text-slate-600 font-medium">
                  Nenhuma transação encontrada.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200/80 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-800/20">
              <td colSpan={3} className="px-5 py-3.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Consolidado
              </td>
              <td className="px-5 py-3.5 text-right font-bold text-slate-900 dark:text-slate-100 text-sm tabular-nums font-tnum">
                {brl(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
