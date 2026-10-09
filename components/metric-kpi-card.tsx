"use client";

import React from "react";

export type MetricKpiVariant = "neutral" | "success" | "danger" | "warning";

export interface MetricKpiBadgeObject {
  text: string;
  variant?: MetricKpiVariant | string;
}

export interface MetricKpiCardProps {
  label: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  variant?: MetricKpiVariant;
  icon?: React.ElementType;
  badge?: React.ReactNode | MetricKpiBadgeObject;
  footer?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  isLoading?: boolean;
}

const variantStyles: Record<
  MetricKpiVariant,
  {
    glow: string;
    value: string;
    iconBg: string;
    iconText: string;
    iconBorder: string;
  }
> = {
  success: {
    glow: "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/[0.08] dark:from-emerald-500/[0.15] via-transparent to-transparent",
    value: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
    iconText: "text-emerald-600 dark:text-emerald-400",
    iconBorder: "border-emerald-200/60 dark:border-emerald-500/20",
  },
  danger: {
    glow: "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-rose-500/[0.08] dark:from-rose-500/[0.15] via-transparent to-transparent",
    value: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-50 dark:bg-rose-500/10",
    iconText: "text-rose-600 dark:text-rose-400",
    iconBorder: "border-rose-200/60 dark:border-rose-500/20",
  },
  warning: {
    glow: "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/[0.08] dark:from-amber-500/[0.15] via-transparent to-transparent",
    value: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-50 dark:bg-amber-500/10",
    iconText: "text-amber-600 dark:text-amber-400",
    iconBorder: "border-amber-200/60 dark:border-amber-500/20",
  },
  neutral: {
    glow: "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/[0.05] dark:from-indigo-500/[0.10] via-transparent to-transparent",
    value: "text-slate-900 dark:text-zinc-100",
    iconBg: "bg-slate-100 dark:bg-zinc-800/60",
    iconText: "text-indigo-600 dark:text-indigo-400",
    iconBorder: "border-slate-200/60 dark:border-white/[0.08]",
  },
};

const badgeStyles: Record<MetricKpiVariant, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  danger: "bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
  warning: "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  neutral: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/[0.08]",
};

export function MetricKpiCard({
  label,
  value,
  subtext,
  variant = "neutral",
  icon: Icon,
  badge,
  footer,
  onClick,
  className = "",
  isLoading = false,
}: MetricKpiCardProps) {
  const styles = variantStyles[variant] || variantStyles.neutral;

  const renderBadge = () => {
    if (!badge) return null;
    if (React.isValidElement(badge) || typeof badge === "string" || typeof badge === "number") {
      return <div className="shrink-0">{badge}</div>;
    }
    if (typeof badge === "object" && "text" in badge) {
      const bObj = badge as MetricKpiBadgeObject;
      const bVariant = (bObj.variant || "neutral") as MetricKpiVariant;
      const bClass = badgeStyles[bVariant] || badgeStyles.neutral;
      return (
        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border shrink-0 ${bClass}`}>
          {bObj.text}
        </span>
      );
    }
    return null;
  };

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:-translate-y-0.5 bg-white dark:bg-zinc-900/90 border border-slate-200/70 dark:border-white/[0.08] shadow-xs hover:shadow-md dark:shadow-black/40 flex flex-col justify-between ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      {/* Ambient Glow */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${styles.glow}`}
      />

      <div className="relative z-10">
        {/* Top bar: Label e Ícone / Badge */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500 dark:text-zinc-400 truncate">
              {label}
            </span>
            {renderBadge()}
          </div>

          {Icon && (
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${styles.iconBg} ${styles.iconText} ${styles.iconBorder}`}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
            </div>
          )}
        </div>

        {/* Valor Principal */}
        {isLoading ? (
          <div className="h-8 w-32 bg-slate-200 dark:bg-zinc-800 rounded-lg animate-pulse mt-1.5" />
        ) : (
          <div
            className={`text-xl sm:text-2xl font-bold tracking-tight tabular-nums font-tnum mt-1.5 ${styles.value}`}
          >
            {value}
          </div>
        )}

        {/* Subtexto */}
        {subtext && !isLoading && (
          <div className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
            {subtext}
          </div>
        )}
      </div>

      {/* Rodapé customizado (ex.: Realizadas vs A receber, links ou detalhes) */}
      {footer && (
        <div className="relative z-10 mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
          {footer}
        </div>
      )}
    </div>
  );
}

export default MetricKpiCard;
