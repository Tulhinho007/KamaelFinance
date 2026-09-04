"use client";

import React from "react";
import { X, ArrowUpRight, ArrowDownRight, Sparkles, Scale, Target, DollarSign, Lightbulb, Info } from "lucide-react";

const brl = (v: number) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type MetricKey =
  | "RECEITA_REAL"
  | "TOTAL_GASTO"
  | "BALANCO_GERAL"
  | "METAS_GLOBAIS"
  | "SALDO_ATUAL"
  | "SALDO_PROJETADO"
  | "ENTRADAS_PREVISTAS"
  | "SAIDAS_PREVISTAS";

interface EquationStep {
  label: string;
  value: string;
  isPositive?: boolean;
  isNegative?: boolean;
  isNeutral?: boolean;
  isBold?: boolean;
  highlight?: "emerald" | "rose" | "indigo";
}

interface ContentConfig {
  title: string;
  badge: string;
  badgeColor: string;
  icon: any;
  iconBg: string;
  description: string;
  equationSteps: EquationStep[];
  auditNote: string;
}

interface MetricInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  metricKey: MetricKey | null;
  dashboardData: any;
  projectionData: any;
  projectionDays: 30 | 60;
}

export function MetricInfoModal({
  isOpen,
  onClose,
  metricKey,
  dashboardData,
  projectionData,
  projectionDays,
}: MetricInfoModalProps) {
  if (!isOpen || !metricKey) return null;

  const currentBal = projectionData?.currentBalance || 0;
  const projBal = projectionData?.projectedFinalBalance || 0;
  const futInc = projectionData?.totalFutureIncome || 0;
  const futExp = projectionData?.totalFutureExpense || 0;

  const recReal = dashboardData?.totalReceitas || 0;
  const totGasto = dashboardData?.totalGastos || 0;
  const balGeral = dashboardData?.balanco || 0;
  const metasPct = dashboardData?.metasGlobaisPct || 0;

  // Configurações específicas por métrica com linguagem acessível e direta
  const getContent = (): ContentConfig | null => {
    switch (metricKey) {
      case "RECEITA_REAL":
        return {
          title: "Receita Real (Efetivada)",
          badge: "Entradas",
          badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          icon: ArrowUpRight,
          iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          description: "Soma de todo o dinheiro que realmente já caiu na sua conta neste mês (salários, pix recebidos ou rendimentos confirmados).",
          equationSteps: [
            { label: "Receitas já recebidas", value: brl(recReal), isPositive: true },
            { label: "Receitas pendentes (a receber)", value: "Só entram quando caírem na conta", isNeutral: true },
          ],
          auditNote: "Lançamentos marcados como 'Pendente' ou agendados para datas futuras não somam aqui até você confirmar o recebimento."
        };

      case "TOTAL_GASTO":
        return {
          title: "Total Gasto Consolidado",
          badge: "Saídas do Mês",
          badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
          icon: ArrowDownRight,
          iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
          description: "Visão consolidada de todas as saídas do período: faturas de cartão de crédito somadas aos débitos e PIX em conta corrente.",
          equationSteps: [
            { label: "Cartão de Crédito (Fatura)", value: brl(dashboardData?.totalCreditExpenses || 0), isNegative: true },
            { label: "Débito / PIX (Conta Corrente)", value: brl(dashboardData?.totalDebitExpenses || 0), isNegative: true },
            { label: "(=) Total Gasto Consolidado", value: brl(totGasto), isBold: true, highlight: "rose" },
          ],
          auditNote: "Combina as compras de cartão e pagamentos em conta corrente para uma visão fiel do seu consumo total."
        };

      case "BALANCO_GERAL":
        return {
          title: "Saldo Consolidado / Resultado do Mês",
          badge: balGeral >= 0 ? "Saldo Positivo" : "No Vermelho",
          badgeColor: balGeral >= 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
          icon: Scale,
          iconBg: balGeral >= 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
          description: "Receitas subtraídas do total de saídas (Crédito + Débito). Mostra se o seu mês fechou com superávit ou déficit financeiro.",
          equationSteps: [
            { label: "(+) Receitas registradas", value: brl(recReal), isPositive: true },
            { label: "(-) Total Gasto Consolidado (Crédito + Débito)", value: `-${brl(totGasto)}`, isNegative: true },
            { label: "(=) Saldo Consolidado", value: brl(balGeral), isBold: true, highlight: balGeral >= 0 ? "emerald" : "rose" },
          ],
          auditNote: "Se o valor for positivo, você teve economia e sobra em caixa. Se for negativo, os gastos totais superaram suas receitas."
        };

      case "METAS_GLOBAIS":
        return {
          title: "Metas Globais (% Conclusão)",
          badge: "Progresso",
          badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
          icon: Target,
          iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
          description: "Mostra a porcentagem geral que você já alcançou em relação ao valor total de todas as suas metas financeiras.",
          equationSteps: [
            { label: "Progresso Global das Metas", value: `${metasPct}%`, isBold: true, highlight: "indigo" },
          ],
          auditNote: "Você pode acompanhar e aportar em cada meta individual na aba 'Metas' do menu."
        };

      case "SALDO_ATUAL":
        return {
          title: "Saldo Total em Conta (Hoje)",
          badge: "Disponível",
          badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
          icon: DollarSign,
          iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
          description: "Soma de todo o dinheiro guardado e disponível em todas as suas contas bancárias cadastradas hoje.",
          equationSteps: [
            { label: "Saldo Disponível Hoje", value: brl(currentBal), isBold: true, highlight: "indigo" },
          ],
          auditNote: "Este saldo serve como ponto de partida para calcular a previsão financeira dos próximos 30 ou 60 dias."
        };

      case "SALDO_PROJETADO":
        return {
          title: `Saldo Estimado (${projectionDays} Dias)`,
          badge: "Previsão",
          badgeColor: projBal >= 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
          icon: Sparkles,
          iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
          description: `Previsão de quanto dinheiro você terá na conta daqui a ${projectionDays} dias, considerando o saldo de hoje mais o que vai entrar e menos as contas a pagar.`,
          equationSteps: [
            { label: "(+) Saldo Disponível Hoje", value: brl(currentBal), isNeutral: true },
            { label: `(+) Entradas a Receber (${projectionDays}d)`, value: `+${brl(futInc)}`, isPositive: true },
            { label: `(-) Contas a Pagar (${projectionDays}d)`, value: `-${brl(futExp)}`, isNegative: true },
            { label: `(=) Saldo Estimado Final`, value: brl(projBal), isBold: true, highlight: projBal >= 0 ? "emerald" : "rose" },
          ],
          auditNote: "Ajuda você a antecipar se vai sobrar dinheiro ou se precisará ajustar gastos nos próximos dias."
        };

      case "ENTRADAS_PREVISTAS":
        return {
          title: `Entradas Previstas (${projectionDays} Dias)`,
          badge: "A Receber",
          badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          icon: ArrowUpRight,
          iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          description: `Soma dos valores que você tem a receber nos próximos ${projectionDays} dias (salários agendados, cobranças de clientes ou vendas).`,
          equationSteps: [
            { label: `Total a Receber (${projectionDays}d)`, value: `+${brl(futInc)}`, isPositive: true, isBold: true },
          ],
          auditNote: "Estes valores ainda não caíram na conta, mas já entram na previsão do seu fluxo futuro."
        };

      case "SAIDAS_PREVISTAS":
        return {
          title: `Saídas Previstas (${projectionDays} Dias)`,
          badge: "A Pagar",
          badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
          icon: ArrowDownRight,
          iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
          description: `Soma de todas as contas, faturas de cartão e boletos que vão vencer nos próximos ${projectionDays} dias e ainda não foram pagos.`,
          equationSteps: [
            { label: `Total de Contas a Pagar (${projectionDays}d)`, value: `-${brl(futExp)}`, isNegative: true, isBold: true },
          ],
          auditNote: "Assim que você marcar uma conta como PAGA, ela sai da previsão e entra no Total Gasto."
        };

      default:
        return null;
    }
  };

  const content = getContent();
  if (!content) return null;

  const IconComp = content.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-[95%] sm:w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col text-slate-900 dark:text-white">
        
        {/* Topo do Modal */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${content.iconBg}`}>
              <IconComp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {content.title}
                </h3>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${content.badgeColor}`}>
                  {content.badge}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Entenda como este indicador é composto.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-4 sm:p-6 flex flex-col gap-5 overflow-y-auto">
          
          {/* Container Visual Limpo "COMO É CALCULADO" */}
          <div className="bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-wider">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
              COMO É CALCULADO
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
              {content.description}
            </p>
          </div>

          {/* Passo a passo da Equação / Subtotais */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Demonstrativo Passo a Passo
            </span>
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-2.5">
              {content.equationSteps.map((step, idx) => (
                <div
                  key={idx}
                  className={`flex justify-between items-center text-xs py-1.5 border-b border-slate-100 dark:border-slate-800/60 last:border-0 ${
                    step.isBold ? "font-extrabold text-sm pt-2" : "font-medium text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span>{step.label}</span>
                  <span
                    className={`font-tnum tabular-nums ${
                      step.isPositive
                        ? "text-emerald-600 dark:text-emerald-400 font-bold"
                        : step.isNegative
                        ? "text-rose-600 dark:text-rose-400 font-bold"
                        : step.highlight === "emerald"
                        ? "text-emerald-600 dark:text-emerald-400 font-extrabold"
                        : step.highlight === "rose"
                        ? "text-rose-600 dark:text-rose-400 font-extrabold"
                        : step.highlight === "indigo"
                        ? "text-indigo-600 dark:text-indigo-400 font-extrabold"
                        : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {step.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Dica de Apoio / Nota Explicativa */}
          <div className="flex items-start gap-2.5 bg-indigo-50 dark:bg-indigo-500/10 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 text-xs text-indigo-900 dark:text-indigo-300 font-medium shadow-xs">
            <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <p className="leading-snug">{content.auditNote}</p>
          </div>

        </div>

        {/* Rodapé */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}
