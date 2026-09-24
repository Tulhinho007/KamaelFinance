"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2, KeyRound, CheckCircle2, X, ShieldAlert } from "lucide-react";
import { loginAction, checkUserRecoveryStatusAction, recoverMasterPasswordAction } from "@/lib/auth-actions";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hpWebsite, setHpWebsite] = useState("");
  const [hpConfirm, setHpConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Modal de Recuperação de Senha
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<"check" | "membro" | "master" | "success">("check");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotUserName, setForgotUserName] = useState("");
  const [forgotKey, setForgotKey] = useState("");
  const [forgotNewPass, setForgotNewPass] = useState("");
  const [forgotConfirmPass, setForgotConfirmPass] = useState("");
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const handleOpenForgot = () => {
    setForgotStep("check");
    setForgotEmail(email || "");
    setForgotKey("");
    setForgotNewPass("");
    setForgotConfirmPass("");
    setForgotError("");
    setShowForgotModal(true);
  };

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");

    if (!forgotEmail.trim()) {
      setForgotError("Informe o seu e-mail cadastrado.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await checkUserRecoveryStatusAction(forgotEmail);
      if (!res.exists) {
        setForgotError("Nenhuma conta encontrada com este e-mail.");
        return;
      }

      setForgotUserName(res.name || "");
      if (res.role === "MASTER") {
        setForgotStep("master");
      } else {
        setForgotStep("membro");
      }
    } catch (err: any) {
      setForgotError(err.message || "Erro ao verificar e-mail.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");

    if (!forgotKey.trim()) {
      setForgotError("Informe a Chave Mestra de Segurança.");
      return;
    }
    if (!forgotNewPass || forgotNewPass.length < 8) {
      setForgotError("A nova senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      setForgotError("A confirmação da senha não confere.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await recoverMasterPasswordAction({
        email: forgotEmail,
        recoveryKey: forgotKey,
        newPassword: forgotNewPass,
      });

      if (!res.success) {
        setForgotError(res.error || "Falha ao redefinir senha.");
        return;
      }

      // Sucesso
      setForgotStep("success");
      // Atualiza os campos na tela de login
      setEmail(forgotEmail);
      setPassword(forgotNewPass);
    } catch (err: any) {
      setForgotError(err.message || "Erro ao conectar ao servidor.");
    } finally {
      setForgotLoading(false);
    }
  };

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
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Senha de Acesso
                </label>
                <button
                  type="button"
                  onClick={handleOpenForgot}
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  Esqueceu a senha?
                </button>
              </div>
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

      {/* Modal de Recuperação de Acesso */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl shadow-black/90 relative text-slate-100">
            {/* Botão Fechar */}
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Cabeçalho do Modal */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <KeyRound className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Recuperação de Acesso</h3>
                <p className="text-xs text-slate-400">Redefinição segura de credenciais</p>
              </div>
            </div>

            {forgotError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-400 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {/* PASSO 1: Verificação de E-mail */}
            {forgotStep === "check" && (
              <form onSubmit={handleCheckEmail} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    E-mail Cadastrado
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="exemplo@kamaelfinance.com"
                      required
                      autoFocus
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verificando...</span>
                      </>
                    ) : (
                      <>
                        <span>Continuar</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* PASSO 2: Membro Normal */}
            {forgotStep === "membro" && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-300 leading-relaxed">
                    <p className="font-bold text-slate-100 mb-1">
                      Conta de Membro ({forgotUserName || forgotEmail})
                    </p>
                    <p>
                      Para a segurança do seu ambiente financeiro, as contas de membro têm suas senhas gerenciadas pelo <strong>Administrador Master</strong> da organização.
                    </p>
                    <p className="mt-2 text-slate-400">
                      Por favor, solicite a redefinição da sua senha diretamente ao seu administrador no painel de <strong>Usuários</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep("check")}
                    className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            )}

            {/* PASSO 3: Conta Master - Redefinição com Chave de Segurança */}
            {forgotStep === "master" && (
              <form onSubmit={handleResetMaster} className="space-y-3.5">
                <div className="p-3 bg-indigo-950/40 border border-indigo-800/60 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-indigo-200">Conta Master Identificada</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                    {forgotEmail}
                  </span>
                </div>

                {/* Chave de Segurança Master */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Chave Mestra de Segurança
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      value={forgotKey}
                      onChange={(e) => setForgotKey(e.target.value)}
                      placeholder="Insira sua Chave de Segurança"
                      required
                      className="w-full pl-10 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                {/* Nova Senha */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Nova Senha Master (mín. 8 dígitos)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type={showForgotPass ? "text" : "password"}
                      value={forgotNewPass}
                      onChange={(e) => setForgotNewPass(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      minLength={8}
                      className="w-full pl-10 pr-10 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotPass(!showForgotPass)}
                      className="absolute right-3.5 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showForgotPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar Nova Senha */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type={showForgotPass ? "text" : "password"}
                      value={forgotConfirmPass}
                      onChange={(e) => setForgotConfirmPass(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      minLength={8}
                      className="w-full pl-10 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep("check")}
                    className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Redefinindo...</span>
                      </>
                    ) : (
                      <>
                        <span>Atualizar Senha Master</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* PASSO 4: Sucesso */}
            {forgotStep === "success" && (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-in zoom-in" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white mb-1">Senha Atualizada com Sucesso!</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    A nova senha da conta Master já está ativa e pronta para uso. Suas credenciais foram preenchidas no formulário.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  Entrar no Sistema Agora
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
