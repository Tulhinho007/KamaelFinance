"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type PeriodContextType = {
  selectedMonth: number; // 1-12
  selectedYear: number;  // ex: 2026
  prevMonth: () => void;
  nextMonth: () => void;
  setPeriod: (month: number, year: number) => void;
  goToCurrentMonth: () => void;
};

const PeriodContext = createContext<PeriodContextType | undefined>(undefined);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // Mês atual por padrão
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());   // Ano atual por padrão

  const prevMonth = () => {
    setSelectedMonth((prev) => {
      if (prev === 1) {
        setSelectedYear((y) => y - 1);
        return 12;
      }
      return prev - 1;
    });
  };

  const nextMonth = () => {
    setSelectedMonth((prev) => {
      if (prev === 12) {
        setSelectedYear((y) => y + 1);
        return 1;
      }
      return prev + 1;
    });
  };

  const setPeriod = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const goToCurrentMonth = () => {
    setSelectedMonth(now.getMonth() + 1);
    setSelectedYear(now.getFullYear());
  };

  return (
    <PeriodContext.Provider
      value={{
        selectedMonth,
        selectedYear,
        prevMonth,
        nextMonth,
        setPeriod,
        goToCurrentMonth,
      }}
    >
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriod() {
  const context = useContext(PeriodContext);
  if (!context) {
    throw new Error("usePeriod must be used within a PeriodProvider");
  }
  return context;
}
