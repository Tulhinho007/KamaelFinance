"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { loginAction } from "@/lib/auth-actions";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hpWebsite, setHpWebsite] = useState("");
  const [hpConfirm, setHpConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email.trim()) {
      setErrorMessage("Por favor, informe seu e-mail de acesso.");
      return;
    }
    if (!password) {
      setErrorMessage("Por favor, informe sua senha.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await loginAction({
        email,
        password,
        hp_website: hpWebsite,
        hp_confirm: hpConfirm,
      });
      if (res.success) {
        // Redireciona para o dashboard como tela inicial
        router.push("/");
        router.refresh();
      } else {
        setErrorMessage(res.error || "Falha ao efetuar login. Verifique suas credenciais.");
      }
    } catch (err: any) {
      setErrorMessage("Ocorreu um erro ao conectar ao servidor. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Elementos visuais de fundo */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header da Marca */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400 mb-4 shadow-lg shadow-indigo-500/10 backdrop-blur-xl">
            <ShieldCheck className="w-7 h-7 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Kamael <span className="font-light text-indigo-400">Finance</span>
          </h1>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.2em] mt-1">
            Plataforma de Gestão Executiva
          </p>
        </div>

        {/* Card do Formulário */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/50">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-100">Acesse sua conta</h2>
            <p className="text-xs text-slate-400 mt-1">
              Informe suas credenciais para acessar o painel de controle
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-400 text-xs font-medium animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot Bot Trap (Campos invisíveis para desarmar spambots) */}
            <div className="sr-only hidden opacity-0 absolute -left-[9999px]" aria-hidden="true" tabIndex={-1}>
              <input
                type="text"
                name="hp_website"
                value={hpWebsite}
                onChange={(e) => setHpWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
              <input
                type="text"
                name="hp_confirm"
                value={hpConfirm}
                onChange={(e) => setHpConfirm(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {/* Campo E-mail */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                E-mail Executivo
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@kamaelfinance.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divisor */}
          <div className="my-6 border-t border-slate-800/80" />

          {/* Link para Cadastro */}
          <div className="text-center">
            <p className="text-xs text-slate-400">
              Não possui uma conta executiva?{" "}
              <Link
                href="/cadastro"
                className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-4"
              >
                Cadastre-se agora
              </Link>
            </p>
          </div>
        </div>

        {/* Rodapé institucional */}
        <p className="text-center text-[10px] text-slate-600 mt-8 font-medium">
          © {new Date().getFullYear()} Kamael Finance Enterprise. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
