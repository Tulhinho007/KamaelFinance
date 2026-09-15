"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Shield,
  Settings,
  Tag,
  Download,
  CheckCircle2,
  Lock,
  Moon,
  Sun,
  Eye,
  EyeOff,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  FileSpreadsheet,
  FileText,
  Save,
  X,
  Sparkles
} from "lucide-react";
import { useTheme } from "@/components/theme-context";
import { useModal } from "@/components/ui/custom-dialog-provider";
import {
  getAllCategoriesAction,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  exportTransactionsCSVAction,
  getUserProfile,
  updateUserProfile
} from "@/lib/actions";

import { changeCurrentUserPasswordAction } from "@/lib/auth-actions";
import { Camera, Image as ImageIcon, Check, AlertTriangle } from "lucide-react";

type CategoryItem = {
  id: string;
  name: string;
  color: string;
};

export default function ConfiguracoesPage() {
  const { theme, toggleTheme } = useTheme();
  const { showAlert, showConfirm } = useModal();
  const [activeTab, setActiveTab] = useState<"profile" | "preferences" | "categories" | "export">("profile");

  // ── ABA 1: Perfil & Conta State ──
  const [userName, setUserName] = useState("Túlio Cavalcanti");
  const [userEmail, setUserEmail] = useState("tulio.cavalcanti@kamael.com");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Estados de Dados Pessoais
  const [dataSaving, setDataSaving] = useState(false);
  const [dataSuccess, setDataSuccess] = useState(false);
  const [dataError, setDataError] = useState("");

  // Estados de Senha & Segurança
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    getUserProfile().then((u) => {
      if (u?.name) setUserName(u.name);
      if (u?.email) setUserEmail(u.email);
    });

    const savedAvatar = localStorage.getItem("kamael-user-avatar");
    if (savedAvatar) {
      setUserAvatar(savedAvatar);
    }
  }, []);

  // ── Validação de Força da Nova Senha em Tempo Real ──
  const passwordCriteria = {
    minLength: newPassword.length >= 8,
    hasNumber: /\d/.test(newPassword),
    hasSpecialOrUpper: /[^a-z0-9]/i.test(newPassword) || /[A-Z]/.test(newPassword),
  };

  const passwordScore =
    (passwordCriteria.minLength ? 1 : 0) +
    (passwordCriteria.hasNumber ? 1 : 0) +
    (passwordCriteria.hasSpecialOrUpper ? 1 : 0);

  const getStrengthLabel = () => {
    if (!newPassword) return { text: "Não preenchida", color: "text-slate-400", bg: "bg-slate-200" };
    if (passwordScore <= 1) return { text: "Fraca", color: "text-rose-500", bg: "bg-rose-500" };
    if (passwordScore === 2) return { text: "Média", color: "text-amber-500", bg: "bg-amber-500" };
    return { text: "Forte", color: "text-emerald-500", bg: "bg-emerald-500" };
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showAlert("A imagem deve ter no máximo 2MB.", { variant: "warning" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setUserAvatar(base64);
      localStorage.setItem("kamael-user-avatar", base64);
      window.dispatchEvent(new Event("storage"));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setUserAvatar(null);
    localStorage.removeItem("kamael-user-avatar");
    window.dispatchEvent(new Event("storage"));
  };

  // ── ABA 2: Preferências State ──
  const [hideBalances, setHideBalances] = useState(false);
  const [startDay, setStartDay] = useState(1);
  const [prefSuccess, setPrefSuccess] = useState(false);

  useEffect(() => {
    const hidePref = localStorage.getItem("kamael-hide-balances");
    if (hidePref === "true") setHideBalances(true);

    const dayPref = localStorage.getItem("kamael-start-day");
    if (dayPref) setStartDay(Number(dayPref));
  }, []);

  // ── ABA 3: Categorias State ──
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryItem | null>(null);
  const [catNameInput, setCatNameInput] = useState("");
  const [catColorInput, setCatColorInput] = useState("#4F46E5");
  const [catSaving, setCatSaving] = useState(false);

  const loadCategories = async () => {
    setCatLoading(true);
    try {
      const data = await getAllCategoriesAction();
      setCategories(data);
    } catch (err) {
      console.error("Erro ao carregar categorias:", err);
    } finally {
      setCatLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // ── ABA 4: Exportação State ──
  const [exportingCSV, setExportingCSV] = useState(false);

  // ── HANDLERS INDEPENDENTES ──

  // 1. Salvar Apenas Dados Pessoais
  const handleSaveUserData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      setDataError("O nome completo é obrigatório.");
      return;
    }
    setDataSaving(true);
    setDataError("");
    setDataSuccess(false);
    try {
      await updateUserProfile(userName.trim(), userEmail.trim());
      localStorage.setItem("kamael-user-name", userName.trim());
      window.dispatchEvent(new Event("storage"));
      setDataSuccess(true);
      setTimeout(() => setDataSuccess(false), 3500);
    } catch (err: any) {
      console.error(err);
      setDataError(err.message || "Erro ao salvar dados do perfil.");
    } finally {
      setDataSaving(false);
    }
  };

  // 2. Atualizar Apenas Senha
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (!newPassword) {
      setPasswordError("Informe a nova senha.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("A nova senha deve ter no mínimo 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("A nova senha e a confirmação não conferem.");
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await changeCurrentUserPasswordAction({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });

      if (!res.success) {
        setPasswordError(res.error || "Erro ao atualizar senha.");
        return;
      }

      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 3500);
    } catch (err: any) {
      console.error(err);
      setPasswordError(err.message || "Erro ao atualizar senha.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleTogglePrivacy = (checked: boolean) => {
    setHideBalances(checked);
    localStorage.setItem("kamael-hide-balances", String(checked));
    setPrefSuccess(true);
    setTimeout(() => setPrefSuccess(false), 2000);
  };

  const handleChangeStartDay = (day: number) => {
    setStartDay(day);
    localStorage.setItem("kamael-start-day", String(day));
    setPrefSuccess(true);
    setTimeout(() => setPrefSuccess(false), 2000);
  };

  const openCategoryCreate = () => {
    setEditingCat(null);
    setCatNameInput("");
    setCatColorInput("#4F46E5");
    setCatModalOpen(true);
  };

  const openCategoryEdit = (cat: CategoryItem) => {
    setEditingCat(cat);
    setCatNameInput(cat.name);
    setCatColorInput(cat.color || "#4F46E5");
    setCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catNameInput.trim()) return;
    setCatSaving(true);
    try {
      if (editingCat) {
        await updateCategoryAction(editingCat.id, catNameInput.trim(), catColorInput);
      } else {
        await createCategoryAction(catNameInput.trim(), catColorInput);
      }
      await loadCategories();
      setCatModalOpen(false);
    } catch (err) {
      console.error(err);
      showAlert("Erro ao salvar categoria.", { variant: "error" });
    } finally {
      setCatSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const confirmed = await showConfirm("Tem certeza que deseja excluir esta categoria?", {
      title: "Excluir Categoria",
      variant: "danger",
      confirmText: "Excluir",
    });
    if (!confirmed) return;
    try {
      await deleteCategoryAction(id);
      await loadCategories();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao excluir categoria.", { variant: "error" });
    }
  };

  const handleExportCSV = async () => {
    setExportingCSV(true);
    try {
      const csvData = await exportTransactionsCSVAction();
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `kamael_finance_extrato_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      showAlert("Erro ao exportar arquivo CSV.", { variant: "error" });
    } finally {
      setExportingCSV(false);
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  const getInitials = (name: string) => {
    if (!name) return "TC";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-50 text-indigo-600 px-3 py-1 text-[10px] font-bold tracking-widest uppercase border border-indigo-100">
              Enterprise Control
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-2">
            Configurações do Sistema
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Gerencie seu perfil, preferências de exibição, categorias e relatórios.
          </p>
        </div>
      </header>

      {/* ── CONTEÚDO COM NAVEGAÇÃO LATERAL DE ABAS ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Sidebar Interna de Abas (3 colunas) */}
        <nav className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 p-2 shadow-sm flex flex-col gap-1">
          {[
            { id: "profile", label: "Perfil & Conta", icon: User, desc: "Dados e senha" },
            { id: "preferences", label: "Preferências Globais", icon: Settings, desc: "Tema e privacidade" },
            { id: "categories", label: "Categorias", icon: Tag, desc: "Gestão de despesas" },
            { id: "export", label: "Dados & Exportação", icon: Download, desc: "CSV e PDF" },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-start gap-3.5 p-3.5 rounded-xl text-left transition-all cursor-pointer ${
                  active
                    ? "bg-slate-900 text-white shadow-sm font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className={`p-2 rounded-lg ${active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold leading-tight">{tab.label}</p>
                  <p className={`text-[10px] mt-0.5 font-medium ${active ? "text-slate-400" : "text-slate-400"}`}>
                    {tab.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Área Principal de Conteúdo da Aba (9 colunas) */}
        <main className="lg:col-span-9">
          
          {/* ── ABA 1: PERFIL & CONTA (2 CARDS INDEPENDENTES) ──────────────── */}
          {activeTab === "profile" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* CARD 1: DADOS DO USUÁRIO & FOTO DE PERFIL */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-indigo-600" />
                      Dados do Usuário
                    </h3>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                      Informações de identidade e exibição no sistema.
                    </p>
                  </div>
                </div>

                {dataSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Dados do usuário atualizados com sucesso!</span>
                  </div>
                )}

                {dataError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{dataError}</span>
                  </div>
                )}

                <form onSubmit={handleSaveUserData} className="space-y-6">
                  {/* Seção de Avatar / Foto de Perfil */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <div className="relative group shrink-0">
                      {userAvatar ? (
                        <img
                          src={userAvatar}
                          alt="Foto de Perfil"
                          className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500 shadow-md"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-black text-xl flex items-center justify-center shadow-md border-2 border-white">
                          {getInitials(userName)}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        title="Alterar Imagem"
                        className="absolute bottom-0 right-0 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-md transition-colors cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Foto de Perfil</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Formatos aceitos: JPG, PNG ou GIF. Tamanho máximo recomendado: 2MB.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Alterar Foto</span>
                        </button>
                        {userAvatar && (
                          <button
                            type="button"
                            onClick={handleRemoveAvatar}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remover</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Inputs Nome e E-mail */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        required
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        placeholder="Seu nome"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Endereço de E-mail *
                      </label>
                      <input
                        type="email"
                        required
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        placeholder="seu.email@dominio.com"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={dataSaving}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-60"
                    >
                      <Save className="w-4 h-4" />
                      {dataSaving ? "SALVANDO..." : "SALVAR DADOS"}
                    </button>
                  </div>
                </form>
              </div>

              {/* CARD 2: SEGURANÇA & SENHA */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-indigo-600" />
                    Segurança & Senha
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    Atualize suas credenciais de acesso de forma independente.
                  </p>
                </div>

                {passwordSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Senha atualizada com sucesso!</span>
                  </div>
                )}

                {passwordError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Senha Atual */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Senha Atual
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPass ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full rounded-xl bg-slate-50 border border-slate-200 pl-3.5 pr-10 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPass(!showCurrentPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        >
                          {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Nova Senha */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Nova Senha
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPass ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full rounded-xl bg-slate-50 border border-slate-200 pl-3.5 pr-10 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          placeholder="Mínimo 8 caracteres"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        >
                          {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirmar Nova Senha */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Confirmar Nova Senha
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPass ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full rounded-xl bg-slate-50 border border-slate-200 pl-3.5 pr-10 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        >
                          {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Validador de Força da Nova Senha em Tempo Real */}
                  {newPassword && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">Força da Senha:</span>
                        <span className={`font-black ${getStrengthLabel().color}`}>
                          {getStrengthLabel().text}
                        </span>
                      </div>

                      {/* Barra de Progresso */}
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden flex gap-1">
                        <div
                          className={`h-full transition-all duration-300 ${
                            passwordScore >= 1 ? getStrengthLabel().bg : "bg-transparent"
                          }`}
                          style={{ width: "33.3%" }}
                        />
                        <div
                          className={`h-full transition-all duration-300 ${
                            passwordScore >= 2 ? getStrengthLabel().bg : "bg-transparent"
                          }`}
                          style={{ width: "33.3%" }}
                        />
                        <div
                          className={`h-full transition-all duration-300 ${
                            passwordScore >= 3 ? getStrengthLabel().bg : "bg-transparent"
                          }`}
                          style={{ width: "33.4%" }}
                        />
                      </div>

                      {/* Checklist de Critérios */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                        <div
                          className={`flex items-center gap-1.5 font-semibold ${
                            passwordCriteria.minLength ? "text-emerald-600" : "text-slate-400"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                              passwordCriteria.minLength
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            {passwordCriteria.minLength ? <Check className="w-2.5 h-2.5" /> : "•"}
                          </div>
                          <span>Mínimo 8 caracteres</span>
                        </div>

                        <div
                          className={`flex items-center gap-1.5 font-semibold ${
                            passwordCriteria.hasNumber ? "text-emerald-600" : "text-slate-400"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                              passwordCriteria.hasNumber
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            {passwordCriteria.hasNumber ? <Check className="w-2.5 h-2.5" /> : "•"}
                          </div>
                          <span>Contém números (0-9)</span>
                        </div>

                        <div
                          className={`flex items-center gap-1.5 font-semibold ${
                            passwordCriteria.hasSpecialOrUpper ? "text-emerald-600" : "text-slate-400"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                              passwordCriteria.hasSpecialOrUpper
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            {passwordCriteria.hasSpecialOrUpper ? <Check className="w-2.5 h-2.5" /> : "•"}
                          </div>
                          <span>Símbolos ou maiúsculas</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={passwordSaving || !newPassword}
                      className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Lock className="w-4 h-4 text-indigo-400" />
                      {passwordSaving ? "ATUALIZANDO..." : "ATUALIZAR SENHA"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── ABA 2: PREFERÊNCIAS GLOBAIS ─────────────────────────────────── */}
          {activeTab === "preferences" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Tema Escuro / Claro */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    {theme === "dark" ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                    Aparência da Plataforma
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">
                    Alternar entre Modo Escuro executivo e Modo Claro.
                  </p>
                </div>

                <button
                  onClick={toggleTheme}
                  className={`relative inline-flex h-7 w-13 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                    theme === "dark" ? "bg-indigo-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      theme === "dark" ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

            </div>
          )}

          {/* ── ABA 3: CATEGORIAS DE DESPESAS ──────────────────────────────── */}
          {activeTab === "categories" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Categorias de Despesas</h3>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    Gerencie a lista de categorias e suas respectivas cores de identificação.
                  </p>
                </div>
                <button
                  onClick={openCategoryCreate}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nova Categoria</span>
                </button>
              </div>

              {catLoading ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-xs font-semibold text-slate-400">
                  Carregando categorias...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow group"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0 shadow-xs"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-xs font-bold text-slate-900">{cat.name}</span>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openCategoryEdit(cat)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* ── ABA 4: DADOS & EXPORTAÇÃO ────────────────────────────────────── */}
          {activeTab === "export" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Exportar CSV */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Exportar Relatório em CSV / Excel
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">
                    Gere um arquivo estruturado com todas as transações, receitas e despesas registradas.
                  </p>
                </div>

                <button
                  onClick={handleExportCSV}
                  disabled={exportingCSV}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-60"
                >
                  <Download className="w-4 h-4" />
                  <span>{exportingCSV ? "GERANDO..." : "EXPORTAR CSV"}</span>
                </button>
              </div>

              {/* Exportar PDF */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Exportar Extrato em PDF
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">
                    Imprima ou salve em formato PDF a visualização completa do relatório executivo.
                  </p>
                </div>

                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>EXPORTAR PDF</span>
                </button>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* ── MODAL CRIAR / EDITAR CATEGORIA ───────────────────────────────── */}
      {catModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm flex flex-col gap-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingCat ? "Editar Categoria" : "Nova Categoria"}
              </h3>
              <button onClick={() => setCatModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Nome da Categoria *</label>
                <input
                  required
                  type="text"
                  value={catNameInput}
                  onChange={e => setCatNameInput(e.target.value)}
                  placeholder="Ex: Investimentos, Lazer..."
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Cor de Identificação</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={catColorInput}
                    onChange={e => setCatColorInput(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5 bg-slate-50"
                  />
                  <input
                    type="text"
                    value={catColorInput}
                    onChange={e => setCatColorInput(e.target.value)}
                    className="flex-1 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setCatModalOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={catSaving}
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm disabled:opacity-60"
                >
                  {catSaving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
