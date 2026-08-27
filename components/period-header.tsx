"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, Moon, Sun, Bell } from "lucide-react";
import { usePeriod } from "./period-context";
import { useTheme } from "./theme-context";

type PeriodHeaderProps = {
  title: string;
  tagline?: string;
  badge?: string;
};

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const YEARS_LIST = Array.from({ length: 11 }, (_, i) => 2020 + i);

export function PeriodHeader({ title, tagline, badge }: PeriodHeaderProps) {
  const { selectedMonth, selectedYear, prevMonth, nextMonth, setPeriod, goToCurrentMonth } = usePeriod();
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const monthLabel = MONTH_NAMES[selectedMonth - 1];

  const handleSelectMonth = (monthIndex: number) => {
    setPeriod(monthIndex + 1, selectedYear);
  };

  const handleSelectYear = (year: number) => {
    setPeriod(selectedMonth, year);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none relative">
      {/* 
        BREAKPOINTS RESPONSIVOS PARA HEADER DE PERÍODO:
        - Mobile (< 640px): flex-col com botões ocupando a largura adequada
        - Tablet / Desktop (>= 768px): flex-row com alinhamento horizontal
      */}
      
      {/* 1. Título e Tagline */}
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h1>
          {badge && (
            <span className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-semibold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {badge}
            </span>
          )}
        </div>
        {tagline && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{tagline}</p>}
      </div>

      {/* 2. Seletor de Período executivo */}
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap" ref={dropdownRef}>
        <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-2 py-1.5 rounded-xl shadow-xs text-slate-700 dark:text-slate-300 text-xs font-semibold relative max-w-full">
          <button 
            onClick={prevMonth}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            title="Mês Anterior"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
          
          <span className="uppercase tracking-wider px-2 sm:px-3 font-bold text-slate-900 dark:text-slate-100 min-w-[110px] sm:min-w-[130px] text-center text-xs truncate">
            {monthLabel} {selectedYear}
          </span>
          
          <button 
            onClick={nextMonth}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            title="Próximo Mês"
          >
            <ChevronRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>

          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`p-1.5 border-l border-slate-200 dark:border-slate-800 ml-1 pl-2 transition-colors rounded-r-lg cursor-pointer ${
              dropdownOpen ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
            title="Escolher Período"
          >
            <Calendar className="w-4 h-4" />
          </button>

          {/* Dropdown de Calendário */}
          {dropdownOpen && (
            <div className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xl z-50 w-72 flex flex-col gap-3">
              
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ano Selecionado</span>
                <select
                  value={selectedYear}
                  onChange={(e) => handleSelectYear(Number(e.target.value))}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {YEARS_LIST.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {MONTH_NAMES.map((name, i) => {
                  const isSelected = selectedMonth === i + 1;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        handleSelectMonth(i);
                        setDropdownOpen(false);
                      }}
                      className={`py-1.5 rounded-lg font-semibold text-xs text-center transition-all cursor-pointer ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {name.substring(0, 3)}
                    </button>
                  );
                })}
              </div>

            </div>
          )}
        </div>

        <button 
          onClick={goToCurrentMonth}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-2 rounded-xl shadow-xs transition-colors text-xs font-semibold tracking-wide uppercase shrink-0 cursor-pointer"
        >
          Mês Atual
        </button>
      </div>

      {/* 3. Ações e Status */}
      <div className="hidden sm:flex items-center gap-2">
        <button 
          onClick={toggleTheme}
          title={theme === "dark" ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        <button className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 relative transition-colors cursor-pointer">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full border border-white dark:border-slate-900"></span>
        </button>

        <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 font-bold text-[10px] px-3 py-2 rounded-xl uppercase tracking-widest shadow-xs">
          EXECUTIVE
        </span>
      </div>

    </div>
  );
}

