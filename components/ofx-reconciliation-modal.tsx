"use client";

import React, { useState, useEffect } from "react";
import {
  X, Upload, CheckCircle2, AlertCircle, RefreshCw, FileText, ArrowRight, Plus, Tag
} from "lucide-react";
import {
  getAllWalletsSimple, processOFXImport, bulkClearTransactions,
  createTransactionFromOFX, OFXItem
} from "@/lib/actions";
import { CATEGORIES } from "@/constants/categories";
import { useModal } from "@/components/ui/custom-dialog-provider";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type SimpleWallet = {
  id: string;
  title: string;
  walletType: string;
};

interface OFXModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultWalletId?: string;
}

export function OFXReconciliationModal({
  isOpen,
  onClose,
  onSuccess,
  defaultWalletId = "",
}: OFXModalProps) {
  const { showAlert } = useModal();
  const [wallets, setWallets] = useState<SimpleWallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState(defaultWalletId);

  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<OFXItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Form para importação individual de novos lançamentos
  const [importingItem, setImportingItem] = useState<OFXItem | null>(null);
  const [category, setCategory] = useState("Outros");
  const [tags, setTags] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getAllWalletsSimple().then((res) => {
        setWallets(res);
        if (!selectedWalletId && res.length > 0) {
          setSelectedWalletId(res[0].id);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      setFileContent(text);
      if (selectedWalletId) {
        await runProcessOFX(selectedWalletId, text);
      }
    };
    reader.readAsText(file);
  };

  const runProcessOFX = async (wId: string, content: string) => {
    setLoading(true);
    try {
      const res = await processOFXImport(wId, content);
      setItems(res);
      // Auto-selecionar os IDs que estão como "MATCHED" para baixa imediata
      const matchedSet = new Set(
        res.filter(i => i.matchStatus === "MATCHED" && i.matchedTransactionId).map(i => i.matchedTransactionId!)
      );
      setSelectedIds(matchedSet);
    } catch (err) {
      console.error(err);
      showAlert("Erro ao processar o arquivo OFX.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleWalletChange = (wId: string) => {
    setSelectedWalletId(wId);
    if (fileContent) {
      runProcessOFX(wId, fileContent);
    }
  };

  const toggleSelectId = (txId: string) => {
    const next = new Set(selectedIds);
    if (next.has(txId)) next.delete(txId);
    else next.add(txId);
    setSelectedIds(next);
  };

  const handleBulkClear = async () => {
    if (selectedIds.size === 0) return;
    setLoading(true);
    try {
      await bulkClearTransactions(Array.from(selectedIds));
      showAlert(`${selectedIds.size} lançamento(s) baixado(s) com sucesso!`, { variant: "success", title: "Conciliação Concluída" });
      if (fileContent && selectedWalletId) {
        await runProcessOFX(selectedWalletId, fileContent);
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao dar baixa nas transações.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOFXTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importingItem || !selectedWalletId) return;

    setCreating(true);
    try {
      const type = importingItem.trnamt < 0 ? "EXPENSE" : "INCOME";
      const amt = Math.abs(importingItem.trnamt);
      await createTransactionFromOFX(
        selectedWalletId,
        importingItem.memo,
        amt,
        importingItem.dtposted,
        type,
        category,
        tags
      );
      setImportingItem(null);
      setCategory("Outros");
      setTags("");
      if (fileContent && selectedWalletId) {
        await runProcessOFX(selectedWalletId, fileContent);
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao importar transação do OFX.", { variant: "error" });
    } finally {
      setCreating(false);
    }
  };

  const matchedCount = items.filter(i => i.matchStatus === "MATCHED").length;
  const unmatchedCount = items.filter(i => i.matchStatus === "UNMATCHED").length;
  const clearedCount = items.filter(i => i.matchStatus === "ALREADY_CLEARED").length;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150 select-none">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 border border-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Conciliação Bancária por Arquivo (.OFX)
              </h3>
              <p className="text-xs font-semibold text-slate-400">
                Cruze o extrato oficial do banco com seus lançamentos e dê baixa automática.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5 overflow-y-auto flex-1">
          
          {/* Top Bar: Seleção de Conta + Upload de OFX */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Seletor de Conta */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                1. Selecionar Conta ou Cartão no Sistema
              </label>
              <select
                value={selectedWalletId}
                onChange={e => handleWalletChange(e.target.value)}
                className="w-full rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-3 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="" disabled className="bg-white dark:bg-slate-900 text-slate-400">-- Selecione a conta bancária --</option>
                {wallets.map(w => (
                  <option key={w.id} value={w.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {w.title} ({w.walletType === "CREDIT_CARD" ? "Cartão de Crédito" : w.walletType === "TICKET" ? "VA/VR" : "Conta Corrente"})
                  </option>
                ))}
              </select>
            </div>

            {/* Input de Arquivo */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                2. Carregar Extrato Bancário (.ofx)
              </label>
              <label className="w-full rounded-2xl bg-slate-50 border border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/40 px-4 py-2.5 flex items-center justify-center gap-2 text-xs font-bold text-indigo-600 cursor-pointer transition-all">
                <Upload className="w-4 h-4" />
                <span>{fileName ? fileName : "Escolher arquivo .OFX no computador..."}</span>
                <input
                  type="file"
                  accept=".ofx,.xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

          </div>

          {/* Cards de Métricas do OFX */}
          {items.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 block">Correspondidos</span>
                  <p className="text-lg font-black text-emerald-700 mt-0.5">{matchedCount} item(ns)</p>
                </div>
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>

              <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 block">Novos / Não Encontrados</span>
                  <p className="text-lg font-black text-amber-700 mt-0.5">{unmatchedCount} item(ns)</p>
                </div>
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>

              <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Já Conciliados</span>
                  <p className="text-lg font-black text-slate-700 mt-0.5">{clearedCount} item(ns)</p>
                </div>
                <RefreshCw className="w-6 h-6 text-slate-400" />
              </div>
            </div>
          )}

          {/* Action Bar para dar Baixa Automática */}
          {matchedCount > 0 && (
            <div className="flex justify-between items-center bg-indigo-50 border border-indigo-100 p-3.5 rounded-2xl">
              <span className="text-xs font-bold text-indigo-900">
                {selectedIds.size} de {matchedCount} lançamento(s) selecionados para baixa automática.
              </span>
              <button
                onClick={handleBulkClear}
                disabled={loading || selectedIds.size === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                Dar Baixa Automática nos Selecionados
              </button>
            </div>
          )}

          {/* Tabela de Lançamentos do OFX */}
          {loading ? (
            <div className="py-16 text-center text-xs font-bold text-slate-400 animate-pulse">
              Processando e cruzando dados do extrato OFX...
            </div>
          ) : items.length === 0 ? (
            <div className="py-14 flex flex-col items-center justify-center gap-2 text-center text-slate-400 border border-slate-100 rounded-2xl bg-slate-50/50">
              <Upload className="w-8 h-8 text-slate-300" />
              <p className="text-xs font-bold text-slate-500">Selecione uma conta e carregue um arquivo .ofx para iniciar a conciliação.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="p-3 w-10 text-center">Sel.</th>
                    <th className="p-3">Data</th>
                    <th className="p-3">Descrição Extrato OFX</th>
                    <th className="p-3 text-right">Valor</th>
                    <th className="p-3 text-center">Status Cruzamento</th>
                    <th className="p-3 text-center">Ação Recomendada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {items.map(item => {
                    const isMatched = item.matchStatus === "MATCHED";
                    const isCleared = item.matchStatus === "ALREADY_CLEARED";
                    const isUnmatched = item.matchStatus === "UNMATCHED";
                    const isSelected = item.matchedTransactionId ? selectedIds.has(item.matchedTransactionId) : false;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-center">
                          {isMatched && item.matchedTransactionId ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectId(item.matchedTransactionId!)}
                              className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                            />
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        <td className="p-3 text-[11px] text-slate-400 font-bold whitespace-nowrap">
                          {item.dtposted.split("-").reverse().join("/")}
                        </td>

                        <td className="p-3">
                          <p className="font-extrabold text-slate-800">{item.memo}</p>
                          {item.matchedDescription && (
                            <p className="text-[10px] font-semibold text-indigo-600 mt-0.5 flex items-center gap-1">
                              <ArrowRight className="w-3 h-3" /> Sistema: {item.matchedDescription}
                            </p>
                          )}
                        </td>

                        <td className={`p-3 text-right font-black whitespace-nowrap ${item.trnamt < 0 ? "text-rose-500" : "text-emerald-600"}`}>
                          {item.trnamt < 0 ? `- ${brl(Math.abs(item.trnamt))}` : `+ ${brl(item.trnamt)}`}
                        </td>

                        <td className="p-3 text-center whitespace-nowrap">
                          {isMatched && (
                            <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Correspondido
                            </span>
                          )}
                          {isCleared && (
                            <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Já Conciliado
                            </span>
                          )}
                          {isUnmatched && (
                            <span className="bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Novo no Extrato
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-center whitespace-nowrap">
                          {isMatched && item.matchedTransactionId && (
                            <button
                              onClick={() => {
                                bulkClearTransactions([item.matchedTransactionId!]).then(() => {
                                  if (fileContent && selectedWalletId) runProcessOFX(selectedWalletId, fileContent);
                                  if (onSuccess) onSuccess();
                                });
                              }}
                              className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                            >
                              Dar Baixa
                            </button>
                          )}
                          {isUnmatched && (
                            <button
                              onClick={() => {
                                setImportingItem(item);
                                setCategory("Outros");
                                setTags("");
                              }}
                              className="text-[10px] font-black text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 mx-auto cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Importar
                            </button>
                          )}
                          {isCleared && (
                            <span className="text-[10px] font-bold text-slate-400">Baixado</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>

      {/* Modal Secundário: Criar Lançamento a partir do OFX Não Encontrado */}
      {importingItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md flex flex-col gap-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Importar Lançamento do Extrato</h3>
              <button onClick={() => setImportingItem(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOFXTx} className="flex flex-col gap-3.5">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Descrição do Extrato</span>
                <p className="font-extrabold text-slate-800">{importingItem.memo}</p>
                <div className="flex justify-between text-[11px] font-bold text-slate-500 mt-1">
                  <span>Data: {importingItem.dtposted.split("-").reverse().join("/")}</span>
                  <span className={importingItem.trnamt < 0 ? "text-rose-500 font-black" : "text-emerald-600 font-black"}>
                    {brl(Math.abs(importingItem.trnamt))}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Categoria *</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Tags / Centro de Custos (Opcional)</span>
                  <span className="text-[10px] text-slate-400">Ex: #viagem2026</span>
                </label>
                <div className="relative">
                  <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    placeholder="#trabalho, #reforma..."
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setImportingItem(null)} className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Cancelar</button>
                <button type="submit" disabled={creating} className="flex-1 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm">Confirmar & Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
