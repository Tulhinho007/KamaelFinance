"use client";

import React from "react";
import { usePrivacyMode } from "@/components/privacy-context";

export interface CurrencyValueProps {
  value: number | string | null | undefined;
  className?: string;
  prefix?: string;
  currencyPrefix?: string;
  mask?: string;
  showSign?: boolean;
  title?: string;
  allowPrivate?: boolean;
}

export function formatBRL(amount: number): string {
  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function CurrencyValue({
  value,
  className = "",
  prefix = "",
  currencyPrefix = "R$",
  mask = "•••••",
  showSign = false,
  title,
  allowPrivate = true,
}: CurrencyValueProps) {
  const { isPrivate } = usePrivacyMode();

  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  const isValidNum = !isNaN(num);

  if (allowPrivate && isPrivate) {
    return (
      <span
        className={`font-mono tracking-widest text-slate-400 dark:text-slate-500 select-none ${className}`}
        title={title || "Valor oculto no Modo Privacidade"}
      >
        {currencyPrefix} {mask}
      </span>
    );
  }

  let formatted = isValidNum ? formatBRL(Math.abs(num)) : `${currencyPrefix} 0,00`;

  let signPrefix = prefix;
  if (showSign && isValidNum) {
    if (num > 0 && !prefix.includes("+")) {
      signPrefix = `+ ${prefix}`;
    } else if (num < 0 && !prefix.includes("-")) {
      signPrefix = `- ${prefix}`;
    }
  } else if (isValidNum && num < 0 && !prefix.includes("-")) {
    signPrefix = `- ${prefix}`;
  }

  return (
    <span className={className} title={title}>
      {signPrefix}{formatted}
    </span>
  );
}
