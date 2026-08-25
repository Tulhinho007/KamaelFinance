"use client";

import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "glow" | "solid" | "ghost";
  glowColor?: "purple" | "indigo" | "emerald" | "amber" | "rose";
  hoverEffect?: boolean;
  className?: string;
}

export function Card({
  children,
  variant = "glow",
  glowColor = "purple",
  hoverEffect = true,
  className = "",
  ...props
}: CardProps) {
  const colorStyles = {
    purple: "border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:border-purple-500/50 hover:shadow-[0_0_25px_rgba(168,85,247,0.25)]",
    indigo: "border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)] hover:border-indigo-500/50 hover:shadow-[0_0_25px_rgba(99,102,241,0.25)]",
    emerald: "border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:border-emerald-500/50 hover:shadow-[0_0_25px_rgba(16,185,129,0.25)]",
    amber: "border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:border-amber-500/50 hover:shadow-[0_0_25px_rgba(245,158,11,0.25)]",
    rose: "border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)] hover:border-rose-500/50 hover:shadow-[0_0_25px_rgba(244,63,94,0.25)]",
  };

  const baseStyle = variant === "glow"
    ? `bg-slate-900/85 backdrop-blur-md border rounded-[28px] p-6 transition-all duration-300 ${colorStyles[glowColor]} ${hoverEffect ? "hover:scale-[1.005]" : ""}`
    : variant === "solid"
    ? "bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 p-6 shadow-sm"
    : "bg-transparent border border-slate-800 p-6 rounded-[28px]";

  return (
    <div className={`${baseStyle} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex items-center justify-between border-b border-slate-800/60 pb-3.5 mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`text-sm font-black text-white uppercase tracking-wider ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-xs text-secondary-light font-semibold ${className}`}>{children}</p>;
}

export function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
