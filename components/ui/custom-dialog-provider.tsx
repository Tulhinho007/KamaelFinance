"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { AlertCircle, CheckCircle2, AlertTriangle, Info, HelpCircle, X } from "lucide-react";

export type DialogType = "alert" | "confirm" | "prompt";
export type DialogVariant = "info" | "success" | "warning" | "error" | "danger";

export interface DialogOptions {
  title?: string;
  message: string;
  variant?: DialogVariant;
  confirmText?: string;
  cancelText?: string;
  defaultValue?: string;
  placeholder?: string;
}

interface DialogState extends DialogOptions {
  type: DialogType;
  resolve: (value: any) => void;
}

interface ModalContextType {
  showAlert: (message: string, options?: Omit<DialogOptions, "message">) => Promise<void>;
  showConfirm: (message: string, options?: Omit<DialogOptions, "message">) => Promise<boolean>;
  showPrompt: (message: string, options?: Omit<DialogOptions, "message">) => Promise<string | null>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function CustomDialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const showAlert = useCallback(
    (message: string, options?: Omit<DialogOptions, "message">): Promise<void> => {
      return new Promise((resolve) => {
        setDialog({
          type: "alert",
          message,
          title: options?.title || "Aviso",
          variant: options?.variant || "info",
          confirmText: options?.confirmText || "OK",
          resolve,
        });
      });
    },
    []
  );

  const showConfirm = useCallback(
    (message: string, options?: Omit<DialogOptions, "message">): Promise<boolean> => {
      return new Promise((resolve) => {
        setDialog({
          type: "confirm",
          message,
          title: options?.title || "Confirmar Ação",
          variant: options?.variant || "warning",
          confirmText: options?.confirmText || "Confirmar",
          cancelText: options?.cancelText || "Cancelar",
          resolve,
        });
      });
    },
    []
  );

  const showPrompt = useCallback(
    (message: string, options?: Omit<DialogOptions, "message">): Promise<string | null> => {
      return new Promise((resolve) => {
        const initVal = options?.defaultValue || "";
        setPromptValue(initVal);
        setDialog({
          type: "prompt",
          message,
          title: options?.title || "Informe o Valor",
          variant: options?.variant || "info",
          confirmText: options?.confirmText || "OK",
          cancelText: options?.cancelText || "Cancelar",
          defaultValue: initVal,
          placeholder: options?.placeholder || "",
          resolve,
        });
      });
    },
    []
  );

  const handleClose = useCallback(
    (result: any) => {
      if (dialog) {
        dialog.resolve(result);
        setDialog(null);
        setPromptValue("");
      }
    },
    [dialog]
  );

  // Manipular tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dialog) {
        if (dialog.type === "confirm") handleClose(false);
        else if (dialog.type === "prompt") handleClose(null);
        else handleClose(undefined);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialog, handleClose]);

  // Foco automático no prompt input quando aberto
  useEffect(() => {
    if (dialog?.type === "prompt" && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [dialog]);

  // Submeter prompt com ENTER
  const handlePromptKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleClose(promptValue);
    }
  };

  const getVariantStyles = (variant: DialogVariant = "info") => {
    switch (variant) {
      case "success":
        return {
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-400" />,
          iconBg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
          btnClass: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30",
        };
      case "error":
      case "danger":
        return {
          icon: <AlertCircle className="w-6 h-6 text-rose-400" />,
          iconBg: "bg-rose-500/10 border-rose-500/20 text-rose-400",
          btnClass: "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
          iconBg: "bg-amber-500/10 border-amber-500/20 text-amber-400",
          btnClass: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30",
        };
      case "info":
      default:
        return {
          icon: <Info className="w-6 h-6 text-indigo-400" />,
          iconBg: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
          btnClass: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30",
        };
    }
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}

      {dialog && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              if (dialog.type === "confirm") handleClose(false);
              else if (dialog.type === "prompt") handleClose(null);
              else handleClose(undefined);
            }
          }}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="p-6 pb-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${
                    getVariantStyles(dialog.variant).iconBg
                  }`}
                >
                  {getVariantStyles(dialog.variant).icon}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 leading-tight">
                    {dialog.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => {
                  if (dialog.type === "confirm") handleClose(false);
                  else if (dialog.type === "prompt") handleClose(null);
                  else handleClose(undefined);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mensagem e Corpo */}
            <div className="px-6 pb-6 space-y-4">
              <p className="text-sm text-slate-300 font-medium leading-relaxed">
                {dialog.message}
              </p>

              {dialog.type === "prompt" && (
                <div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={promptValue}
                    onChange={(e) => setPromptValue(e.target.value)}
                    onKeyDown={handlePromptKeyDown}
                    placeholder={dialog.placeholder}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
                  />
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-3 pt-2">
                {(dialog.type === "confirm" || dialog.type === "prompt") && (
                  <button
                    onClick={() =>
                      handleClose(dialog.type === "confirm" ? false : null)
                    }
                    className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                  >
                    {dialog.cancelText || "Cancelar"}
                  </button>
                )}

                <button
                  onClick={() =>
                    handleClose(
                      dialog.type === "prompt"
                        ? promptValue
                        : dialog.type === "confirm"
                        ? true
                        : undefined
                    )
                  }
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    getVariantStyles(dialog.variant).btnClass
                  }`}
                >
                  {dialog.confirmText || "OK"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal deve ser usado dentro de um CustomDialogProvider");
  }
  return context;
}
