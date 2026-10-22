import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  Key,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Mail,
  User,
  Phone,
  Lock,
  Clock,
  Sparkles,
  RefreshCw,
  Power,
  Copy,
  Check,
} from 'lucide-react';
import { AdminRole, AdminSession, AdminUser } from '../../types';
import { storage } from '../../utils/storage';
import { evaluatePasswordStrength, validatePasswordPolicy } from '../../utils/authUtils';

interface AdminUsersManagementViewProps {
  currentSession: AdminSession;
}

export const AdminUsersManagementView: React.FC<AdminUsersManagementViewProps> = ({
  currentSession,
}) => {
  const [users, setUsers] = useState<AdminUser[]>(() => storage.getAdminUsers());
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AdminRole>('all');
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Add Form
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<AdminRole>('admin');
  const [newPassword, setNewPassword] = useState('Admin_BNN_2026!');
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Edit Form
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<AdminRole>('admin');
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Reset Password Form
  const [adminNewPass, setAdminNewPass] = useState('Admin_BNN_2026!');
  const [copiedToken, setCopiedToken] = useState(false);

  const refreshList = () => {
    setUsers(storage.getAdminUsers());
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleOpenEdit = (user: AdminUser) => {
    setSelectedUser(user);
    setEditFullName(user.fullName);
    setEditUsername(user.username);
    setEditEmail(user.email);
    setEditPhone(user.phone || '');
    setEditRole(user.role);
    setEditIsActive(user.isActive);
    setIsEditModalOpen(true);
  };

  const handleOpenResetPass = (user: AdminUser) => {
    setSelectedUser(user);
    setAdminNewPass('Admin_BNN_2026!');
    setCopiedToken(false);
    setIsResetPassModalOpen(true);
  };

  const handleToggleActive = (user: AdminUser) => {
    const res = storage.updateAdminUserBySuper(user.id, {
      isActive: !user.isActive,
    });
    if (res.success) {
      showToast('success', `Status akun ${user.fullName} berhasil diubah menjadi ${!user.isActive ? 'Aktif' : 'Nonaktif'}.`);
      refreshList();
    } else {
      showToast('error', res.error || 'Gagal mengubah status akun.');
    }
  };

  const handleDeleteUser = (user: AdminUser) => {
    if (user.id === currentSession.userId) {
      showToast('error', 'Anda tidak dapat menghapus akun Anda sendiri.');
      return;
    }

    if (window.confirm(`Apakah Anda yakin ingin mencabut akses dan menghapus akun administrator "${user.fullName}" (${user.email})?`)) {
      const res = storage.deleteAdminUserBySuper(user.id, currentSession.userId);
      if (res.success) {
        showToast('success', `Akun administrator ${user.fullName} berhasil dihapus.`);
        refreshList();
      } else {
        showToast('error', res.error || 'Gagal menghapus akun.');
      }
    }
  };

  const handleSaveNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAdd(true);

    setTimeout(() => {
      const res = storage.createAdminUserBySuper({
        fullName: newFullName,
        username: newUsername,
        email: newEmail,
        role: newRole,
        phone: newPhone,
        initialPassword: newPassword,
      });
      setIsSubmittingAdd(false);

      if (res.success && res.user) {
        showToast('success', `Akun administrator ${res.user.fullName} berhasil dibuat.`);
        setIsAddModalOpen(false);
        // Reset form
        setNewFullName('');
        setNewUsername('');
        setNewEmail('');
        setNewPhone('');
        setNewRole('admin');
        setNewPassword('Admin_BNN_2026!');
        refreshList();
      } else {
        showToast('error', res.error || 'Gagal membuat akun.');
      }
    }, 300);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSubmittingEdit(true);

    setTimeout(() => {
      const res = storage.updateAdminUserBySuper(selectedUser.id, {
        fullName: editFullName,
        username: editUsername,
        email: editEmail,
        phone: editPhone,
        role: editRole,
        isActive: editIsActive,
      });
      setIsSubmittingEdit(false);

      if (res.success) {
        showToast('success', `Data akun ${editFullName} berhasil diperbarui.`);
        setIsEditModalOpen(false);
        refreshList();
      } else {
        showToast('error', res.error || 'Gagal memperbarui data.');
      }
    }, 300);
  };

  const handleSaveResetPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const res = storage.updateAdminUserBySuper(selectedUser.id, {
      newPassword: adminNewPass,
    });
    if (res.success) {
      showToast('success', `Password akun ${selectedUser.fullName} berhasil disetel ulang.`);
      setIsResetPassModalOpen(false);
    } else {
      showToast('error', res.error || 'Gagal menyetel ulang password.');
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchQuery =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchQuery && matchRole;
  });

  const totalSuper = users.filter((u) => u.role === 'superadmin').length;
  const totalAdmin = users.filter((u) => u.role === 'admin').length;
  const totalActive = users.filter((u) => u.isActive).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between shadow-md transition-all ${
            toastMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{toastMsg.text}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-[#003566] tracking-tight">
              Manajemen Administrator Satker
            </h1>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 border border-amber-300">
              SUPER ADMIN
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kelola akun, hak akses role-based (RBAC), pengaturan status akun, dan reset kredensial panitia sertifikat.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-[#00529B] hover:bg-[#003566] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-900/10 flex items-center justify-center gap-2 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Administrator Baru</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Total Pengguna</span>
          <span className="text-2xl font-black text-slate-900">{users.length} Akun</span>
        </div>
        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Super Admin</span>
          <span className="text-2xl font-black text-amber-600">{totalSuper} Akun</span>
        </div>
        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Admin Satker</span>
          <span className="text-2xl font-black text-[#00529B]">{totalAdmin} Akun</span>
        </div>
        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Akun Aktif</span>
          <span className="text-2xl font-black text-emerald-600">{totalActive} Akun</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, username, atau email..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#00529B]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500 shrink-0">Filter Peran:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#00529B]"
          >
            <option value="all">Semua Peran</option>
            <option value="superadmin">Super Admin</option>
            <option value="admin">Admin Satker</option>
            <option value="operator">Operator</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EAF4FC] text-[#003566] font-bold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Nama & Identitas</th>
                <th className="px-4 py-3.5">Username / Email</th>
                <th className="px-4 py-3.5">Peran (Role)</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Login Terakhir</th>
                <th className="px-5 py-3.5 text-right">Tindakan Super Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    Tidak ditemukan data administrator yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrent = user.id === currentSession.userId;
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#00529B] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                            {user.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 block text-xs">
                              {user.fullName} {isCurrent && <span className="text-emerald-600 font-bold">(Anda)</span>}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              ID: {user.id.substring(0, 14)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div>
                          <span className="font-mono font-semibold text-slate-800 block">
                            @{user.username}
                          </span>
                          <span className="text-slate-500 text-[11px] font-mono">
                            {user.email}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full inline-block ${
                            user.role === 'superadmin'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : user.role === 'admin'
                              ? 'bg-blue-100 text-[#003566] border border-blue-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleToggleActive(user)}
                          title="Klik untuk mengubah status aktif"
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-colors ${
                            user.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.isActive ? 'bg-emerald-600' : 'bg-slate-400'
                            }`}
                          />
                          <span>{user.isActive ? 'Aktif' : 'Nonaktif'}</span>
                        </button>
                      </td>

                      <td className="px-4 py-4 text-slate-500 text-[11px]">
                        {user.lastLoginAt ? (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {new Date(user.lastLoginAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Belum pernah login</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenResetPass(user)}
                            title="Reset Kata Sandi Akun"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 transition-colors"
                          >
                            <Key className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(user)}
                            title="Edit Data Administrator"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-[#00529B] transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteUser(user)}
                            disabled={isCurrent}
                            title={isCurrent ? 'Tidak dapat menghapus akun Anda sendiri' : 'Cabut Akses Akun'}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* MODAL 1: Tambah Administrator Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#001f3d]/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-5 bg-gradient-to-r from-[#003566] via-[#00529B] to-[#003566] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-sm">Tambah Administrator Baru</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap Administrator *
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Contoh: Rahmat Hidayat, S.H."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-[#00529B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="rahmat_bnn"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:bg-white focus:border-[#00529B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hak Akses / Peran *
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as AdminRole)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00529B]"
                  >
                    <option value="admin">Admin Satker (Standar)</option>
                    <option value="superadmin">Super Admin (Penuh)</option>
                    <option value="operator">Operator (Terbatas)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alamat Email Satker *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="rahmat@bnn.go.id"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-[#00529B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+62 812-XXXX-XXXX"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-[#00529B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kata Sandi Awal *
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:bg-white focus:border-[#00529B]"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Berikan kata sandi ini kepada admin terkait. Admin dapat mengubahnya secara mandiri pada profil.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="px-5 py-2 bg-[#00529B] hover:bg-[#003566] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-900/10 disabled:opacity-50"
                >
                  {isSubmittingAdd ? 'Menyimpan...' : 'Daftarkan Administrator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Administrator */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#001f3d]/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-5 bg-gradient-to-r from-[#003566] via-[#00529B] to-[#003566] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Edit2 className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-sm">Edit Data Administrator: {selectedUser.fullName}</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-[#00529B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:bg-white focus:border-[#00529B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Peran (Role) *
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as AdminRole)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00529B]"
                  >
                    <option value="admin">Admin Satker</option>
                    <option value="superadmin">Super Admin</option>
                    <option value="operator">Operator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alamat Email *
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-[#00529B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-[#00529B]"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-[#00529B]"
                  />
                  <span>Akun Aktif (Dapat Masuk ke Dashboard)</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 bg-[#00529B] hover:bg-[#003566] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-900/10 disabled:opacity-50"
                >
                  {isSubmittingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Reset Password Akun oleh Super Admin */}
      {isResetPassModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#001f3d]/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-5 bg-gradient-to-r from-[#003566] via-[#00529B] to-[#003566] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Key className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-sm">Reset Password: {selectedUser.fullName}</h3>
              </div>
              <button
                onClick={() => setIsResetPassModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveResetPass} className="p-6 space-y-4">
              <div className="p-3 bg-[#EAF4FC] rounded-xl border border-[#00529B]/20 text-xs text-[#003566] leading-relaxed">
                Sebagai Super Admin, Anda dapat menyetel kata sandi baru untuk akun administrator <strong>{selectedUser.email}</strong>.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kata Sandi Baru *
                </label>
                <input
                  type="text"
                  required
                  value={adminNewPass}
                  onChange={(e) => setAdminNewPass(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:bg-white focus:border-[#00529B]"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Minimal 8 karakter kombinasi huruf besar, kecil, angka/simbol.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetPassModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00529B] hover:bg-[#003566] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-900/10"
                >
                  Terapkan Kata Sandi Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
