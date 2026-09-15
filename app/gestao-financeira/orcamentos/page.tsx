"use client";

import React from "react";
import { BudgetCalculator } from "@/components/budget-calculator";

export default function OrcamentosPage() {
  return (
    <main className="min-h-screen bg-slate-50/50 dark:bg-[#0A0F1D] p-4 sm:p-6 lg:p-8">
      <BudgetCalculator />
    </main>
  );
}
