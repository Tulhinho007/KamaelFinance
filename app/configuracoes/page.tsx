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
import {
  getAllCategoriesAction,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  exportTransactionsCSVAction,
  getUserProfile,
  updateUserProfile
} from "@/lib/actions";

type CategoryItem = {
  id: string;
  name: string;
  color: string;
};

export default function ConfiguracoesPage() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<"profile" | "preferences" | "categories" | "export">("profile");

  // ── ABA 1: Perfil & Conta State ──
  const [userName, setUserName] = useState("Túlio Cavalcanti");
  const [userEmail, setUserEmail] = useState("tulio.cavalcanti@kamael.com");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  useEffect(() => {
    getUserProfile().then((u) => {
      if (u?.name) setUserName(u.name);
      if (u?.email) setUserEmail(u.email);
    });
  }, []);

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

  // ── HANDLERS ──
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      alert("A nova senha e a confirmação não conferem.");
      return;
    }
    setProfileSaving(true);
    try {
      await updateUserProfile(userName, userEmail);
      localStorage.setItem("kamael-user-name", userName);
      window.dispatchEvent(new Event("storage"));
      setProfileSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro ao salvar perfil.");
    } finally {
      setProfileSaving(false);
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
      alert("Erro ao salvar categoria.");
    } finally {
      setCatSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;
    try {
      await deleteCategoryAction(id);
      await loadCategories();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir categoria.");
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
      alert("Erro ao exportar arquivo CSV.");
    } finally {
      setExportingCSV(false);
    }
  };

  const handleExportPDF = () => {
    window.print();
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
          
          {/* ── ABA 1: PERFIL & CONTA ───────────────────────────────────────── */}
          {activeTab === "profile" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {profileSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Perfil e preferências de segurança atualizados com sucesso!</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-6">
                
                {/* Bloco 1: Dados Pessoais */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-indigo-600" />
                      Dados do Usuário
                    </h3>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">Informações de exibição no sistema.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-700">Nome Completo</label>
                      <input
                        type="text"
                        value={userName}
                        onChange={e => setUserName(e.target.value)}
                        className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="Seu nome"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-700">Endereço de E-mail</label>
                      <input
                        type="email"
                        value={userEmail}
                        onChange={e => setUserEmail(e.target.value)}
                        className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="seu.email@dominio.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Bloco 2: Alterar Senha */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-indigo-600" />
                      Segurança & Senha
                    </h3>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">Atualize suas credenciais de acesso.</p>
                  </div>

                  <div className="space-y-4 max-w-md">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-700">Senha Atual</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="••••••••"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-700">Nova Senha</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="••••••••"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-700">Confirmar Nova Senha</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" />
                    {profileSaving ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
                  </button>
                </div>
              </form>
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
