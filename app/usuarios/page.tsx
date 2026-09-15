"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import {
  Search,
  Filter,
  UserPlus,
  Pencil,
  Trash2,
  X,
  Mail,
  ShieldCheck,
  Clock,
  CheckCircle2,
  RotateCcw,
  Archive,
  User,
  ShieldAlert,
  Send
} from "lucide-react";
import {
  getUsers,
  createUserAction,
  updateUserAction,
  deleteUserAction,
  getAllowedEmails,
  addAllowedEmail,
  removeAllowedEmail,
  UserInput
} from "@/lib/user-actions";
import { getUserProfile } from "@/lib/actions";

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  role: "MASTER" | "MEMBRO";
  createdAt: string;
}

// ── Máscara e Formatação de Telefone Brasileiro ──
function formatPhoneNumber(phoneStr?: string | null): { formatted: string; isPlaceholder: boolean } {
  if (!phoneStr || phoneStr.trim() === "") {
    return { formatted: "— Sem telefone", isPlaceholder: true };
  }
  const clean = phoneStr.replace(/\D/g, "");
  if (clean.length === 11) {
    return { formatted: `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`, isPlaceholder: false };
  }
  if (clean.length === 10) {
    return { formatted: `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`, isPlaceholder: false };
  }
  if (clean.length === 9) {
    return { formatted: `${clean.slice(0, 5)}-${clean.slice(5)}`, isPlaceholder: false };
  }
  if (clean.length === 8) {
    return { formatted: `${clean.slice(0, 4)}-${clean.slice(4)}`, isPlaceholder: false };
  }
  return { formatted: phoneStr, isPlaceholder: false };
}

function applyPhoneInputMask(val: string): string {
  const clean = val.replace(/\D/g, "").slice(0, 11);
  if (clean.length <= 2) return clean;
  if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");

  // Sessão do Usuário Conectado
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  // Form State
  const [formData, setFormData] = useState<UserInput>({
    name: "",
    email: "",
    phone: "",
    status: "ATIVO",
    role: "MEMBRO",
    newPassword: "",
  });
  const [formError, setFormError] = useState("");

  // Invite/Whitelist State
  const [invites, setInvites] = useState<{ id: string; email: string; used: boolean; createdAt: string }[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const inviteInputRef = useRef<HTMLInputElement | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers({
        search,
        status: statusFilter,
      });
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadInvites = async () => {
    try {
      const data = await getAllowedEmails();
      setInvites(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    getUserProfile().then((u) => {
      if (u?.id) setCurrentUserId(u.id);
      if (u?.email) setCurrentUserEmail(u.email);
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 200);
    loadInvites();
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      status: "ATIVO",
      role: "MEMBRO",
      newPassword: "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UserItem) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone ? applyPhoneInputMask(user.phone) : "",
      status: user.status,
      role: user.role,
      newPassword: "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleScrollToInvites = () => {
    const el = document.getElementById("secao-convites");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        inviteInputRef.current?.focus();
      }, 400);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      setFormError("Nome e e-mail são obrigatórios.");
      return;
    }

    startTransition(async () => {
      if (editingUser) {
        const res = await updateUserAction(editingUser.id, formData);
        if (res.success) {
          setIsModalOpen(false);
          loadUsers();
        } else {
          setFormError(res.error || "Erro ao atualizar usuário.");
        }
      } else {
        const res = await createUserAction(formData);
        if (res.success) {
          setIsModalOpen(false);
          loadUsers();
        } else {
          setFormError(res.error || "Erro ao criar usuário.");
        }
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!deleteUserId) return;
    setDeleteError("");
    startTransition(async () => {
      const res = await deleteUserAction(deleteUserId);
      if (res.success) {
        setDeleteUserId(null);
        setDeleteError("");
        loadUsers();
      } else {
        setDeleteError(res.error || "Falha ao excluir o usuário.");
      }
    });
  };

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return isoStr;
    }
  };

  const getInitial = (name: string) => {
    if (!name) return "U";
    return name.trim().charAt(0).toUpperCase();
  };

  const isUserProtected = (u: UserItem) => {
    return (
      u.role === "MASTER" ||
      (currentUserId && u.id === currentUserId) ||
      (currentUserEmail && u.email.toLowerCase() === currentUserEmail.toLowerCase())
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Usuários e Permissões
          </h1>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
            {users.length} {users.length === 1 ? "USUÁRIO ENCONTRADO" : "USUÁRIOS ENCONTRADOS"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão de Convidar Novo Usuário (Rola até convites) */}
          <button
            onClick={handleScrollToInvites}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-sm shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Mail className="w-4 h-4" />
            <span>Convidar por E-mail</span>
          </button>

          {/* Botão Cadastrar Direto */}
          <button
            onClick={handleOpenAdd}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            title="Cadastrar usuário manualmente sem convite"
          >
            <UserPlus className="w-4 h-4 text-slate-500" />
            <span>Cadastro Direto</span>
          </button>
        </div>
      </div>

      {/* Barra de Busca e Filtro de Status */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Campo de Pesquisa */}
        <div className="md:col-span-8 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
          />
        </div>

        {/* Filtro de Status */}
        <div className="md:col-span-4 relative">
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-4 py-2.5 shadow-sm text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
            <span className="mr-1 text-slate-400">STATUS:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 font-bold focus:outline-none cursor-pointer w-full text-xs"
            >
              <option value="TODOS">TODOS</option>
              <option value="ATIVO">ATIVO</option>
              <option value="INATIVO">INATIVO</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">USUÁRIO</th>
                <th className="py-4 px-4">TELEFONE</th>
                <th className="py-4 px-4">STATUS</th>
                <th className="py-4 px-4">CARGO</th>
                <th className="py-4 px-4">CADASTRO</th>
                <th className="py-4 px-6 text-center">AÇÕES</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-medium">Carregando usuários...</p>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const phoneInfo = formatPhoneNumber(user.phone);
                  const protectedUser = isUserProtected(user);

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* USUÁRIO (Avatar + Nome + E-mail) */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-extrabold flex items-center justify-center text-xs shrink-0 shadow-sm">
                            {getInitial(user.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white text-xs truncate flex items-center gap-1.5">
                              {user.name}
                              {user.id === currentUserId && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-extrabold border border-indigo-200/50">
                                  Você
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] font-medium text-slate-400 lowercase tracking-tight truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* TELEFONE COM MÁSCARA */}
                      <td className="py-4 px-4 font-semibold">
                        <span
                          className={
                            phoneInfo.isPlaceholder
                              ? "text-slate-400 italic text-[11px]"
                              : "text-slate-700 dark:text-slate-300 font-semibold text-xs"
                          }
                        >
                          {phoneInfo.formatted}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td className="py-4 px-4">
                        {user.status === "ATIVO" ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-200/80 uppercase tracking-wide">
                            ATIVO
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-600 border border-rose-200/80 uppercase tracking-wide">
                            INATIVO
                          </span>
                        )}
                      </td>

                      {/* CARGO (DESTAQUES VISUAIS ESTRUTURADOS) */}
                      <td className="py-4 px-4">
                        {user.role === "MASTER" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 uppercase tracking-wide shadow-2xs">
                            <ShieldCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                            MASTER
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase tracking-wide">
                            <User className="w-3 h-3 text-slate-400" />
                            MEMBRO
                          </span>
                        )}
                      </td>

                      {/* CADASTRO */}
                      <td className="py-4 px-4 font-bold text-slate-700 dark:text-slate-300">
                        {formatDate(user.createdAt)}
                      </td>

                      {/* AÇÕES COM PROTEÇÃO MASTER */}
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          {/* Botão de Editar */}
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-900 hover:text-white dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition-all cursor-pointer shadow-2xs"
                          >
                            <Pencil className="w-3.5 h-3.5 text-indigo-500 hover:text-white" />
                            <span>Editar</span>
                          </button>

                          {/* Botão de Excluir com Proteção do MASTER e Autoexclusão */}
                          {protectedUser ? (
                            <button
                              disabled
                              title="Usuário MASTER ou conta logada protegida contra autoexclusão"
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 opacity-50 cursor-not-allowed"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setDeleteUserId(user.id)}
                              title="Excluir Usuário"
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-500 hover:text-white transition-colors cursor-pointer shadow-2xs"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Adicionar/Editar Usuário */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Header Modal */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingUser ? "Editar Usuário" : "Novo Usuário (Cadastro Direto)"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Modal */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-lg p-3 font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Victtor Gabriel"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  E-mail *
                </label>
                <input
                  type="email"
                  required
                  placeholder="exemplo@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Telefone (com DDD)
                </label>
                <input
                  type="text"
                  placeholder="(81) 99850-9116"
                  value={formData.phone || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: applyPhoneInputMask(e.target.value) })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                  >
                    <option value="ATIVO">ATIVO</option>
                    <option value="INATIVO">INATIVO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Cargo
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value as "MASTER" | "MEMBRO",
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                  >
                    <option value="MEMBRO">MEMBRO</option>
                    <option value="MASTER">MASTER</option>
                  </select>
                </div>
              </div>

              {/* Campo Senha */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  {editingUser ? "Nova Senha" : "Senha Inicial"}
                  {editingUser && (
                    <span className="text-slate-400 font-normal normal-case ml-1">
                      (deixe em branco para não alterar)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder={editingUser ? "••••••••  (opcional)" : "Mínimo 6 caracteres"}
                    value={formData.newPassword || ""}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    minLength={formData.newPassword ? 6 : undefined}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                {editingUser && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    ⚠️ Redefinir a senha atualizará o acesso do usuário.
                  </p>
                )}
              </div>

              {/* Botões do Modal */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isPending ? "Salvando..." : editingUser ? "Salvar Alterações" : "Criar Usuário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {deleteUserId && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/50">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Excluir Usuário?
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Esta ação removerá permanentemente o usuário e seus vínculos de acesso do sistema.
            </p>

            {deleteError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold p-3 rounded-lg">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setDeleteUserId(null);
                  setDeleteError("");
                }}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isPending}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SEÇÃO DE CONVITES / WHITELIST ─────────────────────────────── */}
      <div
        id="secao-convites"
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5 transition-all duration-300"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Convites de Acesso (Whitelist)
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Apenas e-mails autorizados aqui podem criar conta no sistema.
            </p>
          </div>
        </div>

        {/* Formulário de Adicionar Convite */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              ref={inviteInputRef}
              type="email"
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value);
                setInviteError("");
                setInviteSuccess("");
              }}
              placeholder="email@dominio.com"
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={async () => {
              if (!inviteEmail.trim()) return;
              setInviteLoading(true);
              setInviteError("");
              setInviteSuccess("");
              const res = await addAllowedEmail(inviteEmail.trim());
              if (res.success) {
                setInviteSuccess(`Convite registrado para ${inviteEmail}!`);
                setInviteEmail("");
                await loadInvites();
              } else {
                setInviteError(res.error || "Erro ao adicionar convite.");
              }
              setInviteLoading(false);
            }}
            disabled={inviteLoading || !inviteEmail.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Convidar</span>
          </button>
        </div>

        {inviteError && <p className="text-xs text-rose-500 font-semibold">{inviteError}</p>}
        {inviteSuccess && (
          <p className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {inviteSuccess}
          </p>
        )}

        {/* Lista de Convites com Opções de Reenviar e Limpar/Arquivar */}
        <div className="space-y-2">
          {invites.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center py-4">Nenhum convite cadastrado.</p>
          ) : (
            invites.map((inv) => (
              <div
                key={inv.id}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all ${
                  inv.used
                    ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/50"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {inv.used ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{inv.email}</p>
                    <p className="text-[10px] text-slate-400">
                      {inv.used ? "✅ Convite utilizado (Conta criada)" : "⏳ Aguardando cadastro do usuário"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Reenviar Convite (apenas pendentes) */}
                  {!inv.used && (
                    <button
                      onClick={async () => {
                        const res = await addAllowedEmail(inv.email);
                        if (res.success) {
                          setInviteSuccess(`Convite reenviado para ${inv.email}!`);
                          setTimeout(() => setInviteSuccess(""), 3000);
                        }
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      title="Reenviar autorização de convite"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reenviar</span>
                    </button>
                  )}

                  {/* Arquivar / Limpar (utilizados) ou Cancelar (pendentes) */}
                  <button
                    onClick={async () => {
                      await removeAllowedEmail(inv.id);
                      await loadInvites();
                    }}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold ${
                      inv.used
                        ? "text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                        : "text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    }`}
                    title={inv.used ? "Arquivar/Limpar registro de convite" : "Cancelar convite"}
                  >
                    {inv.used ? (
                      <>
                        <Archive className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[10px]">Arquivar</span>
                      </>
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
