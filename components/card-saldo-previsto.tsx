"use client";

import React, { useState, useRef, useEffect } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { CurrencyValue } from "@/components/currency-value";

export interface CardSaldoPrevistoProps {
  saldoContas?: number;
  saldoHerdado?: number;
  isFutureMonth?: boolean;
  previousMonthLabel?: string;
  entradasMes?: number;
  faturasMes?: number;
  boletosMes?: number;
  saldoPrevisto?: number;
  className?: string;
}

export function CardSaldoPrevisto({
  saldoContas = 0,
  saldoHerdado = 0,
  isFutureMonth = false,
  previousMonthLabel,
  entradasMes = 0,
  faturasMes = 0,
  boletosMes = 0,
  saldoPrevisto = 0,
  className = "",
}: CardSaldoPrevistoProps) {
  const [mostrarCalculo, setMostrarCalculo] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Fecha o popover ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setMostrarCalculo(false);
      }
    }
    if (mostrarCalculo) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mostrarCalculo]);

  const isPositive = saldoPrevisto >= 0;

  return (
    <div className={`relative bg-white dark:bg-[#131B2E] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between ${className}`}>
      {/* Cabeçalho do Card */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide leading-tight">
              Saldo Previsto Pós-Contas
            </span>

            {/* Botão de Ajuda com Popover de Memória de Cálculo */}
            <div className="relative inline-flex items-center">
              <button
                ref={buttonRef}
                type="button"
                onClick={() => setMostrarCalculo((prev) => !prev)}
                onMouseEnter={() => setMostrarCalculo(true)}
                className="w-4 h-4 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-[10px] font-black flex items-center justify-center transition-colors cursor-pointer"
                title="Entenda como esse saldo é calculado (Memória de Cálculo)"
                aria-label="Ver memória de cálculo"
              >
                ?
              </button>

              {/* Card Flutuante / Popover com Memória de Cálculo */}
              {mostrarCalculo && (
                <div
                  ref={popoverRef}
                  onMouseLeave={() => setMostrarCalculo(false)}
                  className="absolute left-0 top-6 z-50 w-72 sm:w-80 bg-slate-900 text-white text-xs p-4 rounded-2xl shadow-2xl border border-slate-800 animate-in fade-in zoom-in-95 duration-150"
                  style={{ minWidth: "280px" }}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                    <div>
                      <span className="font-bold text-[10px] text-indigo-400 uppercase tracking-wider block">
                        Memória de Cálculo
                      </span>
                      <p className="text-[10px] text-slate-400">Como chegamos ao saldo previsto:</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMostrarCalculo(false)}
                      className="text-slate-400 hover:text-white p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2 font-mono text-[11px]">
                    {isFutureMonth ? (
                      <div className="flex justify-between text-indigo-300">
                        <span className="truncate pr-2">
                          (+) Saldo Herdado {previousMonthLabel ? `(${previousMonthLabel})` : ""}:
                        </span>
                        <span className="font-semibold whitespace-nowrap">
                          {saldoHerdado >= 0 ? "+ " : "- "}
                          R$ {Math.abs(saldoHerdado).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-slate-300">
                        <span className="truncate pr-2">(+) Saldo Atual em Contas:</span>
                        <span className="font-semibold whitespace-nowrap">
                          R$ {saldoContas.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-emerald-400">
                      <span className="truncate pr-2">(+) Entradas do Mês:</span>
                      <span className="font-semibold whitespace-nowrap">
                        + R$ {entradasMes.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between text-rose-400">
                      <span className="truncate pr-2">(-) Faturas de Cartão:</span>
                      <span className="font-semibold whitespace-nowrap">
                        - R$ {faturasMes.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between text-rose-400">
                      <span className="truncate pr-2">(-) Boletos / Assinaturas:</span>
                      <span className="font-semibold whitespace-nowrap">
                        - R$ {boletosMes.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between font-bold text-xs">
                      <span>(=) Saldo Previsto:</span>
                      <span className={isPositive ? "text-emerald-400" : "text-rose-400"}>
                        {isPositive ? "= + " : "= - "}
                        R$ {Math.abs(saldoPrevisto).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <span
          className={`text-[10px] font-black tracking-wide py-1 px-2.5 rounded-full border shrink-0 ${
            isPositive
              ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200/60 dark:border-indigo-800/60"
              : "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200/60 dark:border-rose-800/60"
          }`}
        >
          {isPositive ? "Projeção Segura" : "Atenção ao Caixa"}
        </span>
      </div>

      {/* Valor Principal */}
      <div className="mt-4">
        <h2
          className={`text-2xl sm:text-3xl font-black font-sans tracking-tight font-tnum tabular-nums ${
            isPositive ? "text-slate-900 dark:text-white" : "text-rose-600 dark:text-rose-400"
          }`}
        >
          <CurrencyValue value={saldoPrevisto} showSign={true} />
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
          {isFutureMonth
            ? "Considerando saldo herdado, faturas e boletos a vencer no mês"
            : "Considerando faturas e boletos a vencer no mês"}
        </p>
      </div>

      {/* Rodapé com Herança e Entradas */}
      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
        {isFutureMonth && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <span>Saldo Inicial Herdado:</span>
              {previousMonthLabel && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  ({previousMonthLabel})
                </span>
              )}
            </div>
            <span
              className={`font-bold font-tnum tabular-nums inline-flex items-center gap-1 ${
                saldoHerdado >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              <CurrencyValue value={saldoHerdado} showSign={true} />
            </span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span>Entradas do Mês:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400 font-tnum tabular-nums inline-flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <CurrencyValue value={entradasMes} />
          </span>
        </div>
      </div>
    </div>
  );
}
