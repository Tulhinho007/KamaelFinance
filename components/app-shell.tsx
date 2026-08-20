"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/cadastro";

  if (isAuthPage) {
    return <main className="w-full min-h-screen bg-slate-950 text-slate-100">{children}</main>;
  }

  return (
    <>
      <Sidebar />
      {/* 
        BREAKPOINT RESPONSIVO:
        Mobile (< 1024px): pt-16 (para não ficar sob a topbar) e pl-0 (largura total)
        Desktop (>= 1024px): pt-0 e pl-64 (espaço da sidebar fixa)
      */}
      <main className="flex-1 pl-0 lg:pl-64 pt-16 lg:pt-0 min-h-screen transition-all duration-200">
        {children}
      </main>
    </>
  );
}
