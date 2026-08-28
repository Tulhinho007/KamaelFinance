"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon, ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2,
  Clock, AlertTriangle, X, CreditCard, Repeat, DollarSign
} from "lucide-react";
import { getPaymentCalendarDataAction, CalendarEventItem } from "@/lib/calendar-actions";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function PaymentCalendarPage() {
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear]   = useState<number>(new Date().getFullYear());

  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState<any>(null);

  // Dia selecionado para a gaveta lateral
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getPaymentCalendarDataAction(month, year);
      setData(res);
    } catch (e) {
      console.error("Erro ao carregar calendário:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [month, year]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayIndex = new Date(year, month - 1, 1).getDay();

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(prev => prev - 1);
    } else {
      setMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(prev => prev + 1);
    } else {
      setMonth(prev => prev + 1);
    }
  };

  const selectedDayEvents: CalendarEventItem[] = selectedDay && data?.calendarMap[selectedDay]
    ? data.calendarMap[selectedDay]
    : [];

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto flex flex-col gap-8 select-none font-sans text-slate-900 dark:text-white relative">

      {/* Header com Navegação */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/planejamento"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Calendário de Pagamentos
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium pl-11">
            Visão mensal interativa das faturas, assinaturas e despesas com vencimento programado.
          </p>
        </div>

        {/* Navegador de Mês */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-black text-xs px-3 text-slate-900 dark:text-white uppercase tracking-wider">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Resumo Consolidado do Mês */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Previsto no Mês</span>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 font-tnum">{brl(data.totalMonthAmount)}</p>
          </div>
          <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Já Quitado</span>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-tnum">{brl(data.totalPaidAmount)}</p>
          </div>
          <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Pendente a Vencer</span>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5 font-tnum">{brl(data.totalPendingAmount)}</p>
          </div>
        </div>
      )}

      {/* Grade do Calendário Mensal */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 font-medium">Carregando calendário...</div>
      ) : (
        <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          {/* Cabeçalho dos Dias da Semana */}
          <div className="grid grid-cols-7 gap-2 mb-3 text-center">
            {["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].map((d, i) => (
              <span key={i} className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{d}</span>
            ))}
          </div>

          {/* Células dos Dias */}
          <div className="grid grid-cols-7 gap-2">
            {/* Células vazias do mês anterior */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border border-transparent" />
            ))}

            {/* Dias reais do mês */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dayEvents: CalendarEventItem[] = data?.calendarMap[dayNum] || [];
              const isToday = dayNum === new Date().getDate() && month === (new Date().getMonth() + 1) && year === new Date().getFullYear();

              const dayTotal = dayEvents.reduce((s, e) => s + e.amount, 0);

              return (
                <div
                  key={dayNum}
                  onClick={() => dayEvents.length > 0 && setSelectedDay(dayNum)}
                  className={`h-24 p-2 rounded-2xl border transition-all flex flex-col justify-between ${
                    dayEvents.length > 0 ? "cursor-pointer hover:border-indigo-500/60 hover:shadow-md" : ""
                  } ${
                    isToday
                      ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/30"
                      : "border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black ${isToday ? "text-indigo-600 dark:text-indigo-400 font-extrabold" : "text-slate-700 dark:text-slate-300"}`}>
                      {dayNum}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {dayEvents.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-extrabold text-slate-900 dark:text-white font-tnum truncate">
                        {brl(dayTotal)}
                      </p>
                      <div className="flex gap-1 overflow-hidden">
                        {dayEvents.map((e, idx) => (
                          <span
                            key={idx}
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              e.status === "PAGO" ? "bg-emerald-500" : e.status === "VENCIDO" ? "bg-rose-500" : "bg-amber-500"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gaveta Lateral / Side Sheet para Detalhes do Dia */}
      {selectedDay && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end">
          <div className="bg-white dark:bg-[#131B2E] border-l border-slate-200 dark:border-slate-800 w-full max-w-md h-full p-6 shadow-2xl space-y-6 flex flex-col justify-between animate-in slide-in-from-right">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">
                    Compromissos do Dia {selectedDay}
                  </h3>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    {MONTH_NAMES[month - 1]} de {year}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Lista de Eventos do Dia */}
              <div className="mt-4 space-y-3">
                {selectedDayEvents.map(ev => (
                  <div
                    key={ev.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${
                        ev.type === "INVOICE" ? "bg-purple-500/10 text-purple-600" : "bg-indigo-500/10 text-indigo-600"
                      }`}>
                        {ev.type === "INVOICE" ? <CreditCard className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white">{ev.title}</h4>
                        <span className={`text-[10px] font-bold ${
                          ev.status === "PAGO" ? "text-emerald-500" : ev.status === "VENCIDO" ? "text-rose-500" : "text-amber-500"
                        }`}>
                          {ev.status === "PAGO" ? "✓ Pago" : ev.status === "VENCIDO" ? "🚨 Vencido" : "⚠️ A vencer"}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-xs text-slate-900 dark:text-white block font-tnum">
                        {brl(ev.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSelectedDay(null)}
              className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-xs transition-all cursor-pointer"
            >
              Fechar Detalhes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
