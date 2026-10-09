"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  CreditCard,
  Building2,
  FileText,
  Zap,
  Banknote,
  WalletCards,
} from "lucide-react";

export interface PaymentMethodItem {
  method: string;
  name: string;
  color: string;
  total: number;
}

export interface PaymentMethodChartProps {
  data?: PaymentMethodItem[];
  periodLabel?: string;
  className?: string;
}

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const getMethodIcon = (method: string) => {
  const norm = method.toUpperCase();
  switch (norm) {
    case "PIX":
      return Zap;
    case "CREDITO":
    case "CARTAO_CREDITO":
      return CreditCard;
    case "BOLETO":
      return FileText;
    case "DINHEIRO":
      return Banknote;
    default:
      return Building2;
  }
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-zinc-950/95 text-zinc-100 rounded-xl border border-white/[0.08] p-3 shadow-2xl backdrop-blur-md text-xs space-y-1 select-none">
        <div className="flex items-center gap-2 border-b border-white/[0.06] pb-1.5 mb-1 font-semibold">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: item.payload?.color || item.fill }}
          />
          <span className="text-zinc-200">{item.name}</span>
        </div>
        <div className="flex items-center justify-between gap-4 font-tnum tabular-nums font-semibold">
          <span className="text-zinc-400 font-normal">Total:</span>
          <span className="text-zinc-100">{brl(Number(item.value))}</span>
        </div>
      </div>
    );
  }
  return null;
};

export function PaymentMethodChart({
  data = [],
  periodLabel,
  className = "",
}: PaymentMethodChartProps) {
  const activeMethods = (data || []).filter((m) => Number(m.total || 0) > 0);
  const totalSum = activeMethods.reduce(
    (acc, curr) => acc + Number(curr.total || 0),
    0
  );

  const pieData =
    activeMethods.length > 0
      ? activeMethods
      : [{ method: "NONE", name: "Sem gastos", total: 1, color: "#94a3b8" }];

  return (
    <div
      className={`bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-white/[0.08] p-6 shadow-sm dark:shadow-lg dark:shadow-black/20 flex flex-col gap-4 ${className}`}
    >
      {/* Cabeçalho */}
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/[0.06] pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            <WalletCards className="w-5 h-5 text-indigo-400" strokeWidth={1.75} />
            Gastos por Meio de Pagamento
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-normal mt-0.5">
            {periodLabel || "Divisão dos gastos consolidados por método"}
          </p>
        </div>
        {totalSum > 0 && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 tabular-nums">
            {brl(totalSum)}
          </span>
        )}
      </div>

      {totalSum === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 text-slate-400 dark:text-zinc-500">
          <div className="w-32 h-32 rounded-full border-2 border-dashed border-slate-200 dark:border-white/[0.08] flex items-center justify-center">
            <span className="text-sm font-semibold text-slate-400 dark:text-zinc-500">R$ 0,00</span>
          </div>
          <p className="text-xs mt-3 font-normal">Nenhum pagamento liquidado no mês</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Donut Chart com Total Central */}
          <div className="md:col-span-5 w-full h-[200px] relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="total"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={78}
                  paddingAngle={activeMethods.length > 1 ? 4 : 0}
                  cornerRadius={5}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color || "#6366F1"} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-sm font-semibold text-slate-900 dark:text-zinc-100 leading-none font-tnum tabular-nums">
                {brl(totalSum)}
              </span>
              <span className="text-[9px] font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-widest mt-1">
                Total Pago
              </span>
            </div>
          </div>

          {/* Legenda Lateral com Barras de Progresso e Percentuais */}
          <div className="md:col-span-7 flex flex-col gap-2.5">
            {activeMethods.map((m) => {
              const pct =
                totalSum > 0 ? ((Number(m.total) / totalSum) * 100).toFixed(1) : "0.0";
              const Icon = getMethodIcon(m.method);

              return (
                <div
                  key={m.method}
                  className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-zinc-950/50 border border-slate-200/80 dark:border-white/[0.06] flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border"
                        style={{
                          backgroundColor: `${m.color}15`,
                          borderColor: `${m.color}35`,
                          color: m.color,
                        }}
                      >
                        <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200 truncate">
                        {m.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-tnum tabular-nums">
                      <span className="font-semibold text-slate-900 dark:text-zinc-100">
                        {brl(Number(m.total))}
                      </span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/[0.08] text-slate-600 dark:text-zinc-400">
                        {pct}%
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progresso Horizontal */}
                  <div className="w-full bg-slate-200/70 dark:bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: m.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentMethodChart;
