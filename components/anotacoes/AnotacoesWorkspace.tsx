"use client";

import React, { useState, useEffect, useMemo, useRef, useTransition } from "react";
import {
  Search,
  Plus,
  Trash2,
  Pin,
  Tag,
  Calendar,
  Check,
  Eye,
  Edit3,
  FileText,
  Clock,
  Sparkles,
  ListTodo,
  Bold,
  Italic,
  Heading2,
  Quote,
  List,
  AlertCircle,
} from "lucide-react";
import {
  criarAnotacao,
  salvarConteudoAnotacao,
  alternarFixadaAnotacao,
  excluirAnotacao,
  getAnotacoes,
} from "@/app/actions/anotacoes";
import { useModal } from "@/components/ui/custom-dialog-provider";

export interface AnotacaoItem {
  id: string;
  titulo: string;
  conteudo: string;
  categoria: string;
  anoReferencia: number;
  mesReferencia?: number | null;
  fixada: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface AnotacoesWorkspaceProps {
  userId: string;
  anoSelecionado: number;
  anosDisponiveis: number[];
  anotacoesIniciais: AnotacaoItem[];
}

const CATEGORIAS_SUGERIDAS = [
  "Todas",
  "Estratégia",
  "Planejamento",
  "Controle de Gastos",
  "Dívidas & Crédito",
  "Metas",
  "Geral",
];

export default function AnotacoesWorkspace({
  userId,
  anoSelecionado: anoInicial,
  anosDisponiveis,
  anotacoesIniciais,
}: AnotacoesWorkspaceProps) {
  const { showAlert, showConfirm } = useModal();
  const [isPending, startTransition] = useTransition();

  const [ano, setAno] = useState(anoInicial);
  const [anotacoes, setAnotacoes] = useState<AnotacaoItem[]>(anotacoesIniciais);
  const [ativaId, setAtivaId] = useState<string | null>(
    anotacoesIniciais[0]?.id || null
  );

  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todas");
  const [modoVisualizacao, setModoVisualizacao] = useState<"edit" | "preview">("edit");
  const [salvando, setSalvando] = useState(false);
  const [ultimoSalvo, setUltimoSalvo] = useState<Date | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Anotação ativa encontrada
  const ativa = useMemo(() => {
    return anotacoes.find((n) => n.id === ativaId) || null;
  }, [anotacoes, ativaId]);

  // Recarregar anotações quando mudar de ano
  useEffect(() => {
    if (ano === anoInicial && anotacoesIniciais.length > 0 && anotacoes.length === anotacoesIniciais.length) {
      return;
    }
    startTransition(async () => {
      try {
        const res = await getAnotacoes(ano);
        const formatadas: AnotacaoItem[] = res.map((a: any) => ({
          ...a,
          createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
          updatedAt: a.updatedAt instanceof Date ? a.updatedAt.toISOString() : a.updatedAt,
        }));
        setAnotacoes(formatadas);
        if (formatadas.length > 0) {
          setAtivaId(formatadas[0].id);
        } else {
          setAtivaId(null);
        }
      } catch (err) {
        console.error("Erro ao carregar anotações do ano:", err);
      }
    });
  }, [ano, anoInicial]);

  // Criar nova anotação
  const handleCriar = async () => {
    try {
      const novaCategoria = categoriaFiltro !== "Todas" ? categoriaFiltro : "Estratégia";
      const nova = await criarAnotacao(userId, {
        titulo: "Nova Anotação",
        categoria: novaCategoria,
        anoReferencia: ano,
      });

      const formatada: AnotacaoItem = {
        ...nova,
        createdAt: nova.createdAt instanceof Date ? nova.createdAt.toISOString() : String(nova.createdAt),
        updatedAt: nova.updatedAt instanceof Date ? nova.updatedAt.toISOString() : String(nova.updatedAt),
      };

      setAnotacoes((prev) => [formatada, ...prev]);
      setAtivaId(formatada.id);
      setModoVisualizacao("edit");
      showAlert("Nova anotação criada!", { variant: "success" });
    } catch (err) {
      console.error("Erro ao criar anotação:", err);
      showAlert("Não foi possível criar a anotação.", { variant: "danger" });
    }
  };

  // Atualizar campo e disparar salvamento com debounce
  const handleUpdate = (campo: "titulo" | "conteudo" | "categoria" | "anoReferencia", valor: any) => {
    if (!ativa) return;

    const atualizada: AnotacaoItem = {
      ...ativa,
      [campo]: valor,
      updatedAt: new Date().toISOString(),
    };

    setAnotacoes((prev) =>
      prev.map((n) => (n.id === atualizada.id ? atualizada : n))
    );

    // Debounce de 600ms para salvar no servidor
    setSalvando(true);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        await salvarConteudoAnotacao(
          atualizada.id,
          atualizada.titulo,
          atualizada.conteudo,
          atualizada.categoria,
          atualizada.anoReferencia
        );
        setUltimoSalvo(new Date());
      } catch (err) {
        console.error("Erro ao salvar anotação:", err);
      } finally {
        setSalvando(false);
      }
    }, 600);
  };

  // Alternar fixada
  const handleTogglePin = async () => {
    if (!ativa) return;
    const novoStatus = !ativa.fixada;

    const atualizada: AnotacaoItem = {
      ...ativa,
      fixada: novoStatus,
      updatedAt: new Date().toISOString(),
    };

    // Reordena: fixadas primeiro, depois mais recentes
    setAnotacoes((prev) => {
      const atualizadas = prev.map((n) => (n.id === atualizada.id ? atualizada : n));
      return [...atualizadas].sort((a, b) => {
        if (a.fixada !== b.fixada) return a.fixada ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    });

    try {
      await alternarFixadaAnotacao(ativa.id);
    } catch (err) {
      console.error("Erro ao fixar anotação:", err);
    }
  };

  // Excluir anotação com confirmação
  const handleExcluir = async (id: string) => {
    const confirmou = await showConfirm(
      "Deseja realmente excluir esta anotação financeira? Esta ação não pode ser desfeita.",
      {
        title: "Excluir Anotação",
        variant: "danger",
        confirmText: "Sim, Excluir",
        cancelText: "Cancelar",
      }
    );
    if (!confirmou) return;

    try {
      await excluirAnotacao(id);
      const restantes = anotacoes.filter((n) => n.id !== id);
      setAnotacoes(restantes);
      if (ativaId === id) {
        setAtivaId(restantes[0]?.id || null);
      }
      showAlert("Anotação excluída com sucesso.", { variant: "info" });
    } catch (err) {
      console.error("Erro ao excluir anotação:", err);
      showAlert("Falha ao excluir anotação.", { variant: "danger" });
    }
  };

  // Inserir Markdown rápido no textarea
  const insertFormatting = (prefix: string, suffix: string = "") => {
    if (!textareaRef.current || !ativa) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selected = text.substring(start, end);

    const replacement = `${prefix}${selected || "texto"}${suffix}`;
    const nextVal = text.substring(0, start) + replacement + text.substring(end);

    handleUpdate("conteudo", nextVal);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + (selected ? selected.length : 5));
    }, 50);
  };

  // Filtragem das anotações pela busca e categoria
  const filtradas = useMemo(() => {
    return anotacoes.filter((n) => {
      const matchBusca =
        !busca.trim() ||
        n.titulo.toLowerCase().includes(busca.toLowerCase()) ||
        n.conteudo.toLowerCase().includes(busca.toLowerCase()) ||
        n.categoria.toLowerCase().includes(busca.toLowerCase());

      const matchCat =
        categoriaFiltro === "Todas" ||
        n.categoria.toLowerCase() === categoriaFiltro.toLowerCase();

      return matchBusca && matchCat;
    });
  }, [anotacoes, busca, categoriaFiltro]);

  // Contadores
  const contadores = useMemo(() => {
    if (!ativa?.conteudo) return { palavras: 0, caracteres: 0 };
    const clean = ativa.conteudo.trim();
    const palavras = clean.length > 0 ? clean.split(/\s+/).length : 0;
    const caracteres = clean.length;
    return { palavras, caracteres };
  }, [ativa?.conteudo]);

  // Formatador de data amigável
  const formatarData = (dateVal: string | Date) => {
    try {
      const d = new Date(dateVal);
      const hoje = new Date();
      if (d.toDateString() === hoje.toDateString()) {
        return `Hoje às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
      }
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  // Renderizador simplificado de Markdown para Preview
  const renderMarkdown = (text: string) => {
    if (!text.trim()) {
      return (
        <p className="text-slate-400 dark:text-slate-500 italic text-sm">
          Nenhum conteúdo digitado ainda. Mude para a aba Editar para começar.
        </p>
      );
    }

    const lines = text.split("\n");
    return (
      <div className="space-y-3 leading-relaxed text-slate-800 dark:text-slate-200">
        {lines.map((line, idx) => {
          if (line.startsWith("### ")) {
            return (
              <h3 key={idx} className="text-base font-bold text-slate-900 dark:text-white mt-4 mb-1">
                {line.replace("### ", "")}
              </h3>
            );
          }
          if (line.startsWith("## ")) {
            return (
              <h2 key={idx} className="text-lg font-extrabold text-slate-900 dark:text-white mt-5 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">
                {line.replace("## ", "")}
              </h2>
            );
          }
          if (line.startsWith("# ")) {
            return (
              <h1 key={idx} className="text-xl font-black text-slate-900 dark:text-white mt-6 mb-2">
                {line.replace("# ", "")}
              </h1>
            );
          }
          if (line.startsWith("> ")) {
            return (
              <blockquote
                key={idx}
                className="border-l-4 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 pl-3 py-1.5 rounded-r-lg text-sm italic text-slate-700 dark:text-slate-300"
              >
                {line.replace("> ", "")}
              </blockquote>
            );
          }
          if (line.startsWith("- [x] ") || line.startsWith("- [X] ")) {
            return (
              <div key={idx} className="flex items-center gap-2 text-sm line-through text-slate-400 dark:text-slate-500">
                <span className="w-4 h-4 rounded bg-emerald-600 text-white flex items-center justify-center text-[10px]">✓</span>
                <span>{line.replace(/- \[[xX]\] /, "")}</span>
              </div>
            );
          }
          if (line.startsWith("- [ ] ")) {
            return (
              <div key={idx} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <span className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 flex items-center justify-center text-[10px]" />
                <span>{line.replace("- [ ] ", "")}</span>
              </div>
            );
          }
          if (line.startsWith("- ") || line.startsWith("* ")) {
            return (
              <div key={idx} className="flex items-start gap-2 text-sm pl-2">
                <span className="text-indigo-500 mt-1.5">•</span>
                <span>{line.substring(2)}</span>
              </div>
            );
          }
          if (!line.trim()) {
            return <div key={idx} className="h-2" />;
          }

          // Negrito e Itálico simples
          let formatted: React.ReactNode = line;
          return (
            <p key={idx} className="text-sm leading-relaxed">
              {formatted}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* ── BARRA SUPERIOR: SELETOR DE ANO & RESUMO ────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Ano Referência:
          </span>
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-slate-700">
            {anosDisponiveis.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAno(a)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  ano === a
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>
              <strong className="text-slate-900 dark:text-white font-bold">{anotacoes.length}</strong> notas em {ano}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Pin className="w-4 h-4 text-amber-500" />
            <span>
              <strong className="text-slate-900 dark:text-white font-bold">
                {anotacoes.filter((n) => n.fixada).length}
              </strong> fixadas
            </span>
          </div>
        </div>
      </div>

      {/* ── WORKSPACE DUPLO: NOTION STYLE ─────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm min-h-[720px] grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        
        {/* ── COLUNA ESQUERDA: LISTA DE ANOTAÇÕES (4 cols) ───────────────── */}
        <div className="md:col-span-4 lg:col-span-4 border-r border-slate-200/80 dark:border-slate-800 p-4 flex flex-col space-y-3 bg-slate-50/60 dark:bg-slate-950/40">
          
          {/* Busca + Botão Criar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar em títulos e conteúdo..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white shadow-2xs placeholder:text-slate-400"
              />
            </div>
            <button
              type="button"
              onClick={handleCriar}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow-xs flex items-center justify-center shrink-0 cursor-pointer"
              title="Nova Anotação"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Filtro por Categorias (pills) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIAS_SUGERIDAS.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoriaFiltro(cat)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg whitespace-nowrap transition cursor-pointer ${
                  categoriaFiltro === cat
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Lista com Cards das Anotações */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filtradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-3 text-slate-400">
                <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 stroke-[1.5]" />
                <p className="text-xs">Nenhuma anotação encontrada neste filtro.</p>
                <button
                  type="button"
                  onClick={handleCriar}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  + Criar primeira anotação
                </button>
              </div>
            ) : (
              filtradas.map((item) => {
                const isSelected = ativa?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setAtivaId(item.id)}
                    className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all duration-150 relative ${
                      isSelected
                        ? "bg-white dark:bg-slate-800 border-indigo-500 shadow-md ring-1 ring-indigo-500/20"
                        : "bg-white/80 dark:bg-slate-900/80 border-slate-200/70 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-slate-900 dark:text-white text-xs truncate flex-1">
                        {item.titulo || "Sem título"}
                      </h3>
                      {item.fixada && (
                        <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {item.conteudo ? item.conteudo.slice(0, 110) : "Nenhum conteúdo adicional..."}
                    </p>
                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                      <span className="font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/60 truncate max-w-[120px]">
                        {item.categoria || "Geral"}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 font-medium">
                        {formatarData(item.updatedAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── COLUNA DIREITA: EDITOR E VISUALIZADOR (8 cols) ──────────────── */}
        <div className="md:col-span-8 lg:col-span-8 p-6 sm:p-8 flex flex-col justify-between space-y-4">
          {ativa ? (
            <div className="space-y-4 flex-1 flex flex-col">
              
              {/* Barra de Ferramentas Superior da Nota */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Categoria editável com badge */}
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                    <Tag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <input
                      type="text"
                      value={ativa.categoria}
                      onChange={(e) => handleUpdate("categoria", e.target.value)}
                      placeholder="Categoria"
                      className="border-none outline-none font-bold text-slate-800 dark:text-white bg-transparent text-xs w-28 hover:underline"
                    />
                  </div>

                  {/* Ano Referência */}
                  <div className="flex items-center gap-1 text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="font-semibold">{ano}</span>
                  </div>

                  {/* Botão Fixar */}
                  <button
                    type="button"
                    onClick={handleTogglePin}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      ativa.fixada
                        ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                        : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                    title={ativa.fixada ? "Desafixar do topo" : "Fixar no topo"}
                  >
                    <Pin className={`w-3.5 h-3.5 ${ativa.fixada ? "fill-amber-500 text-amber-500" : ""}`} />
                    <span>{ativa.fixada ? "Fixada" : "Fixar"}</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {/* Status de salvamento em tempo real */}
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                    {salvando ? (
                      <>
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5]" />
                        <span>Salvo</span>
                      </>
                    )}
                  </div>

                  {/* Alternador de Modo (Editar / Preview) */}
                  <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/80 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setModoVisualizacao("edit")}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition cursor-pointer ${
                        modoVisualizacao === "edit"
                          ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                      }`}
                      title="Modo Edição"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoVisualizacao("preview")}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition cursor-pointer ${
                        modoVisualizacao === "preview"
                          ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                      }`}
                      title="Visualizar Formatação"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver</span>
                    </button>
                  </div>

                  {/* Excluir */}
                  <button
                    type="button"
                    onClick={() => handleExcluir(ativa.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                    title="Excluir nota"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Título da Nota */}
              <input
                type="text"
                placeholder="Título da Anotação..."
                value={ativa.titulo}
                onChange={(e) => handleUpdate("titulo", e.target.value)}
                className="w-full text-2xl font-black text-slate-900 dark:text-white border-none outline-none bg-transparent placeholder-slate-300 dark:placeholder-slate-600 tracking-tight"
              />

              {/* Barra de atalhos rápidos de formatação (apenas no modo edição) */}
              {modoVisualizacao === "edit" && (
                <div className="flex items-center gap-1 py-1 border-y border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                  <span className="text-[10px] uppercase font-bold text-slate-400 mr-1.5">Atalhos:</span>
                  <button
                    type="button"
                    onClick={() => insertFormatting("## ")}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 transition"
                    title="Título (H2)"
                  >
                    <Heading2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting("**", "**")}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 transition"
                    title="Negrito"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting("*", "*")}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 transition"
                    title="Itálico"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting("- ")}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 transition"
                    title="Lista com marcadores"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting("- [ ] ")}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 transition"
                    title="Checklist / Tarefa pendente"
                  >
                    <ListTodo className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting("> ")}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 transition"
                    title="Citação / Destaque"
                  >
                    <Quote className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Corpo da Nota: Textarea no Modo Edição ou Preview Formatado */}
              <div className="flex-1 min-h-[440px] flex flex-col">
                {modoVisualizacao === "edit" ? (
                  <textarea
                    ref={textareaRef}
                    placeholder="Escreva seus planos, metas financeiras, estratégias de corte, regras para o mês ou diretrizes de investimento..."
                    value={ativa.conteudo}
                    onChange={(e) => handleUpdate("conteudo", e.target.value)}
                    className="w-full flex-1 resize-none border-none outline-none text-sm text-slate-800 dark:text-slate-200 leading-relaxed placeholder-slate-300 dark:placeholder-slate-600 bg-transparent focus:ring-0 min-h-[440px]"
                  />
                ) : (
                  <div className="w-full flex-1 p-2 min-h-[440px] overflow-y-auto">
                    {renderMarkdown(ativa.conteudo)}
                  </div>
                )}
              </div>

              {/* Rodapé da Nota: Contadores e Data de Atualização */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-3">
                  <span>{contadores.palavras} palavras</span>
                  <span>•</span>
                  <span>{contadores.caracteres} caracteres</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Última alteração: {formatarData(ativa.updatedAt)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                Nenhuma anotação selecionada
              </h3>
              <p className="text-xs max-w-sm">
                Selecione uma anotação na lista lateral ou crie uma nova para registrar estratégias e metas financeiras.
              </p>
              <button
                type="button"
                onClick={handleCriar}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Anotação</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
