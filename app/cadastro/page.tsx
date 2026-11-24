"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, User, Mail, Phone, Lock, Eye, EyeOff, UserPlus, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { registerAction } from "@/lib/auth-actions";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      setErrorMessage("Por favor, defina uma senha de acesso.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("A senha deve conter no mínimo 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("As senhas informadas não coincidem.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await registerAction({
        name,
        email,
        phone,
        password,
        hp_website: hpWebsite,
        hp_confirm: hpConfirm,
      });

      if (res.success) {
        // Redireciona para o dashboard como tela inicial após criar a conta
        router.push("/");
        router.refresh();
      } else {
        setErrorMessage(res.error || "Erro ao registrar conta. Tente novamente.");
      }
    } catch (err: any) {
      setErrorMessage("Ocorreu um erro ao conectar ao servidor. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#09090b] auth-dark-surface flex flex-col justify-center items-center p-4 py-8 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Elementos visuais de fundo */}
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-zinc-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a25_1px,transparent_1px),linear-gradient(to_bottom,#27272a25_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header da Marca */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-500/15 border border-indigo-500/25 rounded-2xl text-indigo-400 mb-3 shadow-lg shadow-indigo-500/10 backdrop-blur-xl">
            <ShieldCheck className="w-7 h-7 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
            Kamael <span className="font-light text-indigo-400">Finance</span>
          </h1>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-[0.2em] mt-1">
            Plataforma de Gestão Executiva
          </p>
        </div>

        {/* Card do Formulário */}
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-zinc-100">Criar Nova Conta Executiva</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Cadastre-se para iniciar a gestão financeira unificada do seu patrimônio
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-400 text-xs font-medium animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo Nome Completo */}
            <div>
              <label htmlFor="register-name" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Nome Completo <span className="text-zinc-500 font-normal normal-case">(Opcional)</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                <input
                  id="register-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome (opcional)"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/80 border border-white/[0.1] rounded-xl text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Campo E-mail */}
            <div>
              <label htmlFor="register-email" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                E-mail Executivo *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@kamaelfinance.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/80 border border-white/[0.1] rounded-xl text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Campo Telefone */}
            <div>
              <label htmlFor="register-phone" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Telefone / Celular (Opcional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                <input
                  id="register-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/80 border border-white/[0.1] rounded-xl text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div>
              <label htmlFor="register-password" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Senha *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-10 py-2.5 bg-zinc-950/80 border border-white/[0.1] rounded-xl text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Campo Confirmação de Senha */}
            <div>
              <label htmlFor="register-confirm-password" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Confirmar Senha *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                <input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita sua senha"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-zinc-950/80 border border-white/[0.1] rounded-xl text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
              {confirmPassword && password === confirmPassword && (
                <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] mt-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Senhas coincidem</span>
                </div>
              )}
            </div>

            {/* Botão Registrar */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-3 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Criando Conta...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Criar Conta Executiva</span>
                </>
              )}
            </button>

            {/* Honeypot Bot Trap (posicionado após os campos reais e protegido contra autofill de navegadores/gerenciadores de senha) */}
            <div className="sr-only hidden opacity-0 pointer-events-none absolute -left-[9999px]" aria-hidden="true" tabIndex={-1}>
              <input
                type="text"
                name="hp_website"
                value={hpWebsite}
                onChange={(e) => setHpWebsite(e.target.value)}
                tabIndex={-1}
                readOnly
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
                data-form-type="other"
              />
              <input
                type="text"
                name="hp_confirm"
                value={hpConfirm}
                onChange={(e) => setHpConfirm(e.target.value)}
                tabIndex={-1}
                readOnly
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
                data-form-type="other"
              />
            </div>
          </form>

          {/* Divisor */}
          <div className="my-5 border-t border-white/[0.08]" />

          {/* Link para Login */}
          <div className="text-center">
            <p className="text-xs text-zinc-400">
              Já possui uma conta cadastrada?{" "}
              <Link
                href="/login"
                className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-4"
              >
                Faça login
              </Link>
            </p>
          </div>
        </div>

        {/* Rodapé institucional */}
        <p className="text-center text-[10px] text-zinc-500 mt-6 font-medium">
          © {new Date().getFullYear()} Kamael Finance Enterprise. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
