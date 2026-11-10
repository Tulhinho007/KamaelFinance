import React from "react";
import { prisma } from "@/lib/prisma";
import { getActiveUserId } from "@/lib/actions";
import AnotacoesWorkspace from "@/components/anotacoes/AnotacoesWorkspace";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Anotações Financeiras | Kamael Finance",
  description: "Estratégias de corte de custos, planejamento anual e registros de decisões financeiras.",
};

interface PageProps {
  searchParams: Promise<{ ano?: string; cat?: string }>;
}

export default async function AnotacoesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const anoAtual = new Date().getFullYear();
  const anoSelecionado = resolvedSearchParams.ano ? parseInt(resolvedSearchParams.ano) : anoAtual;
  const catSelecionada = resolvedSearchParams.cat;

  const userId = await getActiveUserId();
  if (!userId) {
    redirect("/login");
  }

  const anotacoes = await prisma.anotacao.findMany({
    where: {
      userId,
      anoReferencia: anoSelecionado,
      ...(catSelecionada && catSelecionada !== "Todas" ? { categoria: catSelecionada } : {}),
    },
    orderBy: [
      { fixada: "desc" },
      { updatedAt: "desc" },
    ],
  });

  const anosDisponiveis = [anoAtual - 1, anoAtual, anoAtual + 1];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto space-y-6 text-slate-900 dark:text-slate-100">
      {/* ── CABEÇALHO DA PÁGINA ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Anotações Financeiras
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 uppercase tracking-wider">
              ANO {anoSelecionado}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Estratégias de corte de custos, planejamento anual, regras de gastos e registros de decisões financeiras.
          </p>
        </div>
      </div>

      {/* ── WORKSPACE NOTION STYLE ────────────────────────────────────────── */}
      <AnotacoesWorkspace
        userId={userId}
        anoSelecionado={anoSelecionado}
        anosDisponiveis={anosDisponiveis}
        anotacoesIniciais={anotacoes.map((a) => ({
          ...a,
          createdAt: a.createdAt.toISOString(),
          updatedAt: a.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
