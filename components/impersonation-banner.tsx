"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, LogOut, ArrowRightLeft } from "lucide-react";
import { getUserProfile } from "@/lib/actions";
import { stopImpersonationAction } from "@/lib/auth-actions";

export function ImpersonationBanner() {
  const [impersonated, setImpersonated] = useState<{
    userName: string;
    userEmail: string;
    masterName: string;
  } | null>(null);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    getUserProfile().then((u: any) => {
      if (u?.impersonatedBy) {
        setImpersonated({
          userName: u.name || "Usuário",
          userEmail: u.email || "",
          masterName: u.impersonatedBy.name || "Master",
        });
      } else {
        setImpersonated(null);
      }
    });
  }, []);

  if (!impersonated) return null;

  const handleStop = async () => {
    setStopping(true);
    try {
      const res = await stopImpersonationAction();
      if (res.success) {
        window.location.href = "/usuarios";
      } else {
        alert(res.error || "Erro ao encerrar gerenciamento.");
        setStopping(false);
      }
    } catch (err: any) {
      alert("Erro ao encerrar gerenciamento: " + (err.message || err));
      setStopping(false);
    }
  };

  return (
    <aside
      aria-label="Aviso de Modo Gerenciamento"
      className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 px-4 py-2 text-xs sm:text-sm font-semibold shadow-md flex items-center justify-between z-50 sticky top-0 transition-all border-b border-amber-600/40"
    >
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 mr-3">
        <span className="p-1.5 rounded-lg bg-slate-950/15 shrink-0 animate-pulse">
          <ShieldAlert className="w-4 h-4 text-slate-950" />
        </span>
        <span className="truncate leading-tight">
          <span className="font-extrabold uppercase tracking-wide mr-1.5 bg-slate-950 text-amber-400 px-1.5 py-0.5 rounded text-[10px]">
            Modo Gerenciamento
          </span>
          Navegando na conta de <strong className="underline underline-offset-2">{impersonated.userName}</strong>
          <span className="opacity-80 hidden md:inline ml-1 font-normal">({impersonated.userEmail})</span>
        </span>
      </div>

      <button
        type="button"
        onClick={handleStop}
        disabled={stopping}
        title="Voltar para a minha conta MASTER"
        className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm disabled:opacity-50"
      >
        <LogOut className="w-3.5 h-3.5 text-amber-400" />
        <span>{stopping ? "Saindo..." : "Voltar p/ Conta Master"}</span>
      </button>
    </aside>
  );
}
