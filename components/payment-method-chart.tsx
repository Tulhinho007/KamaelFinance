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
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-xl text-xs space-y-1 select-none">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-1 font-bold">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: item.payload?.color || item.fill }}
          />
          <span>{item.name}</span>
        </div>
        <div className="flex items-center justify-between gap-4 font-tnum tabular-nums font-bold">
          <span className="text-slate-500 dark:text-slate-400">Total:</span>
          <span className="text-slate-900 dark:text-white">{brl(Number(item.value))}</span>
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
      className={`bg-white dark:bg-slate-900/70 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm dark:shadow-xl flex flex-col gap-4 ${className}`}
    >
      {/* Cabeçalho */}
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <WalletCards className="w-5 h-5 text-indigo-500" />
            Gastos por Meio de Pagamento
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            {periodLabel || "Divisão dos gastos consolidados por método"}
          </p>
        </div>
        {totalSum > 0 && (
          <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 tabular-nums">
            {brl(totalSum)}
          </span>
        )}
      </div>

      {totalSum === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 text-slate-400 dark:text-slate-500">
          <div className="w-32 h-32 rounded-full border-4 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center">
            <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">R$ 0,00</span>
          </div>
          <p className="text-xs mt-3 font-medium">Nenhum pagamento liquidado no mês</p>
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
              <span className="text-sm font-black text-slate-900 dark:text-white leading-none font-tnum tabular-nums">
                {brl(totalSum)}
              </span>
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
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
                  className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-1.5"
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
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {m.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-tnum tabular-nums">
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {brl(Number(m.total))}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                        {pct}%
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progresso Horizontal */}
                  <div className="w-full bg-slate-200/70 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden">
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
