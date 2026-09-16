"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Target,
  TrendingUp,
  CreditCard,
  Radar,
  BarChart3,
  PieChart,
  Sun,
  Moon,
  Users,
  LogOut,
  Menu,
  X,
  History,
  Zap,
  Wrench,
  Calculator,
  Plane,
  Eye,
  EyeOff
} from "lucide-react";
import { useTheme } from "@/components/theme-context";
import { usePrivacyMode } from "@/components/privacy-context";
import { getUserProfile } from "@/lib/actions";
import { logoutAction } from "@/lib/auth-actions";

export interface SidebarNavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

export interface SidebarNavGroup {
  group: string;
  items: SidebarNavItem[];
}

export const sidebarNavigation: SidebarNavGroup[] = [
  {
    group: "VISÃO GERAL",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Compromissos & Contas", href: "/despesas", icon: CreditCard },
      { name: "Receitas", href: "/receitas", icon: TrendingUp },
      { name: "Histórico de Pagamentos", href: "/historico-pagamentos", icon: History },
    ],
  },
  {
    group: "GESTÃO DE LIQUIDEZ & CRÉDITO",
    items: [
      { name: "PIX no Crédito", href: "/pix-credito", icon: Zap },
      { name: "Radar de Gastos", href: "/gestao-financeira/radar-gastos", icon: Radar },
    ],
  },
  {
    group: "PLANEJAMENTO & METAS",
    items: [
      { name: "Calculadoras", href: "/calculadoras", icon: Calculator },
      { name: "Objetivos & Reservas", href: "/metas", icon: Target },
      { name: "Planejamento de Viagens", href: "/planejamento", icon: Plane },
      { name: "Investimentos", href: "/investimentos", icon: PieChart },
      { name: "Orçamentos", href: "/gestao-financeira/orcamentos", icon: BarChart3 },
    ],
  },
  {
    group: "SISTEMA",
    items: [
      { name: "Usuários", href: "/usuarios", icon: Users },
      { name: "Configurações", href: "/configuracoes", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { isPrivate, togglePrivacy } = usePrivacyMode();
  const [userName, setUserName] = useState("Túlio Cavalcanti");
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem("kamael-user-name");
    if (savedName) setUserName(savedName);

    getUserProfile().then((user) => {
      if (user?.name) {
        setUserName(user.name);
        localStorage.setItem("kamael-user-name", user.name);
      }
    });

    const handleStorage = () => {
      const name = localStorage.getItem("kamael-user-name");
      if (name) setUserName(name);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Fecha o menu mobile automaticamente ao trocar de rota
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return (name[0] || "U").toUpperCase();
  };

  const initials = getInitials(userName);



  const navLink = (href: string, label: string, Icon: React.ElementType, badge?: string) => {
    const active =
      pathname === href ||
      (href !== "/" && pathname.startsWith(href));

    if (badge) {
      return (
        <Link
          key={href}
          href={href}
          onClick={() => setIsMobileOpen(false)}
          className="flex items-center gap-3 px-3.5 py-2.5 text-xs rounded-xl transition-all duration-150 text-slate-400 dark:text-slate-500 hover:bg-amber-50/60 dark:hover:bg-amber-500/5 hover:text-amber-700 dark:hover:text-amber-400 font-semibold group"
          title="Módulo em manutenção — disponível em breve"
        >
          <Icon className="w-4 h-4 flex-shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-amber-500 transition-colors" />
          <span className="flex-1">{label}</span>
          <span className="ml-auto inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap">
            <Wrench className="w-2.5 h-2.5" />
            {badge}
          </span>
        </Link>
      );
    }

    return (
      <Link
        key={href}
        href={href}
        onClick={() => setIsMobileOpen(false)}
        className={`flex items-center gap-3 px-3.5 py-2.5 text-xs rounded-xl transition-all duration-150 ${
          active
            ? "bg-indigo-600 text-white border border-transparent font-bold shadow-sm shadow-indigo-600/20"
            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100 font-semibold"
        }`}
      >
        <Icon
          className={`w-4 h-4 flex-shrink-0 transition-colors ${
            active ? "text-white" : "text-slate-400 dark:text-slate-500"
          }`}
        />
        <span>{label}</span>
      </Link>
    );
  };

  const sectionLabel = (text: string) => (
    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 tracking-[0.18em] px-3 uppercase block mb-1.5">
      {text}
    </span>
  );

  const navigationContent = (
    <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
      {sidebarNavigation.map((group) => (
        <div key={group.group} className="space-y-0.5">
          {sectionLabel(group.group)}
          {group.items.map((item) =>
            navLink(item.href, item.name, item.icon, item.badge)
          )}
        </div>
      ))}
    </nav>
  );

  const footerProfile = (
    <div className="p-3 border-t border-slate-100 dark:border-slate-800/70 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-1.5 pt-1">
        <Link
          href="/configuracoes"
          onClick={() => setIsMobileOpen(false)}
          className="flex-1 min-w-0 flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors duration-150 group"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-indigo-600/30 flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{userName}</p>
            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate">Conta Executiva</p>
          </div>
        </Link>
        <button
          onClick={togglePrivacy}
          title={isPrivate ? "Mostrar valores (Modo Privacidade ativo)" : "Ocultar valores (Modo Privacidade)"}
          className={`p-2 rounded-xl transition-all cursor-pointer flex-shrink-0 ${
            isPrivate ? "text-amber-500 bg-amber-500/10" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          {isPrivate ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Alternar para Modo Claro" : "Alternar para Modo Escuro"}
          className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer flex-shrink-0"
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
        <button
          onClick={() => logoutAction()}
          title="Encerrar Sessão (Sair)"
          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer flex-shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 
        BREAKPOINT RESPONSIVO: MOBILE TOPBAR (< 1024px)
        Menu Hambúrguer com cabeçalho fixo no topo em celulares e tablets
      */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/70 px-4 flex items-center justify-between z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Abrir Menu"
          >
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/" className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white shadow-sm shadow-indigo-600/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-tight">
              Kamael <span className="font-medium text-slate-400 dark:text-slate-500">Finance</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={togglePrivacy}
            title={isPrivate ? "Mostrar valores" : "Ocultar valores"}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isPrivate ? "text-amber-500 bg-amber-500/10" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {isPrivate ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
            {initials}
          </div>
        </div>
      </header>

      {/* 
        BREAKPOINT RESPONSIVO: MOBILE DRAWER OVERLAY (< 1024px)
        Menu deslizante que abre ao clicar no ícone hambúrguer
      */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />

          <aside className="relative w-72 max-w-[80vw] bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 dark:border-slate-800/70">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-sm shadow-indigo-600/30 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm block tracking-tight">
                    Kamael <span className="font-medium text-slate-400 dark:text-slate-500">Finance</span>
                  </span>
                  <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.15em] block -mt-0.5">
                    Enterprise
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {navigationContent}
            {footerProfile}
          </aside>
        </div>
      )}

      {/* 
        BREAKPOINT RESPONSIVO: DESKTOP SIDEBAR FIXA (> 1024px / lg)
        Menu lateral permanente e fixo para monitores e desktops
      */}
      <aside className="hidden lg:flex w-64 bg-white dark:bg-slate-950 border-r border-slate-200/80 dark:border-slate-800/70 h-screen fixed left-0 top-0 flex-col z-30 shadow-[1px_0_12px_rgba(0,0,0,0.03)]">
        <div className="h-16 flex items-center px-5 border-b border-slate-100 dark:border-slate-800/70 gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-sm shadow-indigo-600/30 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm block tracking-tight">
              Kamael <span className="font-medium text-slate-400 dark:text-slate-500">Finance</span>
            </span>
            <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.15em] block -mt-0.5">
              Enterprise
            </span>
          </div>
        </div>

        {navigationContent}
        {footerProfile}
      </aside>
    </>
  );
}
