"use client";

import React, { useState, useEffect, useTransition } from "react";
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
  CheckCircle2
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

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  role: "MASTER" | "MEMBRO";
  createdAt: string;
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");

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
  const [invites, setInvites] = useState<{id: string; email: string; used: boolean; createdAt: string}[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

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
      phone: user.phone,
      status: user.status,
      role: user.role,
      newPassword: "", // sempre limpo ao abrir edição
    });
    setFormError("");
    setIsModalOpen(true);
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

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Usuários
          </h1>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
            {users.length} {users.length === 1 ? "USUÁRIO ENCONTRADO" : "USUÁRIOS ENCONTRADOS"}
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Adicionar Registro</span>
        </button>
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
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
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
                <th className="py-4 px-6">USUARIO</th>
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
                    Carregando usuários...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* USUÁRIO (Avatar + Nome + E-mail) */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-700 text-white font-extrabold flex items-center justify-center text-xs shrink-0 shadow-sm">
                          {getInitial(user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white text-xs truncate">
                            {user.name}
                          </p>
                          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* TELEFONE */}
                    <td className="py-4 px-4 font-semibold text-slate-500 dark:text-slate-400">
                      {user.phone && user.phone.trim() !== "" ? user.phone : "--"}
                    </td>

                    {/* STATUS */}
                    <td className="py-4 px-4">
                      {user.status === "ATIVO" ? (
                        <span className="inline-block px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-200/80 uppercase tracking-wide">
                          ATIVO
                        </span>
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-600 border border-rose-200/80 uppercase tracking-wide">
                          INATIVO
                        </span>
                      )}
                    </td>

                    {/* CARGO (MASTER / MEMBRO) */}
                    <td className="py-4 px-4 font-extrabold text-[10px] uppercase tracking-wider">
                      {user.role === "MASTER" ? (
                        <span className="text-amber-500">MASTER</span>
                      ) : (
                        <span className="text-slate-400">MEMBRO</span>
                      )}
                    </td>

                    {/* CADASTRO */}
                    <td className="py-4 px-4 font-bold text-slate-700 dark:text-slate-300">
                      {formatDate(user.createdAt)}
                    </td>

                    {/* AÇÕES (1 Botão de Editar Limpo e Direto + 1 Botão de Excluir) */}
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        {/* 1 Botão de Editar limpo e direto */}
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-900 hover:text-white dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition-all cursor-pointer shadow-xs"
                        >
                          <Pencil className="w-3.5 h-3.5 text-indigo-500 hover:text-white" />
                          <span>Editar</span>
                        </button>

                        {/* Botão de Excluir */}
                        <button
                          onClick={() => setDeleteUserId(user.id)}
                          title="Excluir Usuário"
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-500 hover:text-white transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rodapé da Paginação */}
      <div className="flex items-center justify-center pt-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          PÁGINA 1 DE 1
        </span>
      </div>

      {/* Modal Adicionar/Editar Usuário */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Header Modal */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingUser ? "Editar Usuário" : "Novo Usuário"}
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
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Telefone
                </label>
                <input
                  type="text"
                  placeholder="Ex: 8173445967"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
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
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as "MASTER" | "MEMBRO" })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="MEMBRO">MEMBRO</option>
                    <option value="MASTER">MASTER</option>
                  </select>
                </div>
              </div>

              {/* Campo Nova Senha */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  {editingUser ? "Nova Senha" : "Senha"}
                  {editingUser && <span className="text-slate-400 font-normal normal-case ml-1">(deixe em branco para não alterar)</span>}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder={editingUser ? "••••••  (opcional)" : "Mínimo 6 caracteres"}
                    value={formData.newPassword || ""}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    minLength={formData.newPassword ? 6 : undefined}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                {editingUser && (
                  <p className="text-[10px] text-slate-400 mt-1">⚠️ Redefinir a senha desconectará o usuário da sessão atual.</p>
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
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
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
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Excluir Usuário?
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Esta ação removerá permanentemente o usuário do sistema.
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Convites de Acesso</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Apenas e-mails autorizados aqui podem criar conta no sistema.</p>
          </div>
        </div>

        {/* Formulário de Adicionar Convite */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="email"
              value={inviteEmail}
              onChange={e => { setInviteEmail(e.target.value); setInviteError(""); setInviteSuccess(""); }}
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
                setInviteSuccess(`Convite enviado para ${inviteEmail}!`);
                setInviteEmail("");
                await loadInvites();
              } else {
                setInviteError(res.error || "Erro ao adicionar convite.");
              }
              setInviteLoading(false);
            }}
            disabled={inviteLoading || !inviteEmail.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 flex-shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Convidar
          </button>
        </div>

        {inviteError && <p className="text-xs text-rose-500 font-semibold">{inviteError}</p>}
        {inviteSuccess && <p className="text-xs text-emerald-500 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{inviteSuccess}</p>}

        {/* Lista de Convites */}
        <div className="space-y-2">
          {invites.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center py-4">Nenhum convite cadastrado.</p>
          ) : (
            invites.map((inv) => (
              <div key={inv.id} className={`flex items-center justify-between px-4 py-2.5 rounded-xl border ${
                inv.used
                  ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              }`}>
                <div className="flex items-center gap-2.5">
                  {inv.used
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    : <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  }
                  <div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{inv.email}</p>
                    <p className="text-[10px] text-slate-400">
                      {inv.used ? "✅ Convite utilizado" : "⏳ Aguardando cadastro"}
                    </p>
                  </div>
                </div>
                {!inv.used && (
                  <button
                    onClick={async () => {
                      await removeAllowedEmail(inv.id);
                      await loadInvites();
                    }}
                    className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                    title="Remover convite"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
