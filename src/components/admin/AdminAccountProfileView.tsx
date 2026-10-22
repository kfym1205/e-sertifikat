import React, { useState } from 'react';
import {
  User,
  Key,
  Mail,
  Shield,
  Clock,
  Phone,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  LogOut,
  Save,
  Sparkles,
  Lock,
  ShieldAlert,
  Calendar,
} from 'lucide-react';
import { AdminSession, AdminUser } from '../../types';
import { storage } from '../../utils/storage';
import { evaluatePasswordStrength, validatePasswordPolicy } from '../../utils/authUtils';

interface AdminAccountProfileViewProps {
  currentSession: AdminSession;
  onSessionUpdated: (session: AdminSession) => void;
  onLogout: () => void;
}

export const AdminAccountProfileView: React.FC<AdminAccountProfileViewProps> = ({
  currentSession,
  onSessionUpdated,
  onLogout,
}) => {
  const currentUser = storage.getAdminUser(currentSession.userId) || {
    id: currentSession.userId,
    username: currentSession.username,
    email: currentSession.email,
    fullName: currentSession.fullName,
    role: currentSession.role,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    phone: '',
    lastLoginAt: currentSession.loggedInAt,
  };

  // Profile Form State
  const [fullName, setFullName] = useState(currentUser.fullName);
  const [username, setUsername] = useState(currentUser.username);
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const passwordStrength = evaluatePasswordStrength(newPassword);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setIsSavingProfile(true);

    setTimeout(() => {
      const res = storage.updateAdminProfile(currentSession.userId, {
        fullName,
        username,
        email,
        phone,
      });
      setIsSavingProfile(false);

      if (res.success && res.user) {
        setProfileMsg({ type: 'success', text: 'Data profil administrator berhasil diperbarui secara permanen.' });
        onSessionUpdated({
          ...currentSession,
          fullName: res.user.fullName,
          username: res.user.username,
          email: res.user.email,
        });
      } else {
        setProfileMsg({ type: 'error', text: res.error || 'Gagal memperbarui profil.' });
      }
    }, 300);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Konfirmasi password baru tidak cocok dengan password baru.' });
      return;
    }

    const policy = validatePasswordPolicy(newPassword);
    if (!policy.isValid) {
      setPasswordMsg({ type: 'error', text: policy.error || 'Password tidak memenuhi syarat keamanan.' });
      return;
    }

    setIsSavingPassword(true);
    setTimeout(() => {
      const res = storage.changeAdminPassword(currentSession.userId, currentPassword, newPassword);
      setIsSavingPassword(false);

      if (res.success) {
        setPasswordMsg({ type: 'success', text: 'Password akun administrator berhasil diubah. Mohon ingat kata sandi baru Anda.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMsg({ type: 'error', text: res.error || 'Gagal mengubah password.' });
      }
    }, 400);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#003566] via-[#00529B] to-[#003566] text-white p-6 sm:p-8 rounded-3xl shadow-md border border-[#00284d] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 text-amber-300 flex items-center justify-center border border-white/20 font-black text-2xl shadow-inner">
            {currentUser.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {currentUser.fullName}
              </h1>
              <span
                className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                  currentUser.role === 'superadmin'
                    ? 'bg-amber-400 text-slate-950 shadow-sm border border-amber-300'
                    : 'bg-blue-200 text-[#003566]'
                }`}
              >
                {currentUser.role === 'superadmin' ? 'SUPER ADMIN BNN' : 'ADMIN SATKER'}
              </span>
            </div>
            <p className="text-xs text-blue-100 font-mono mt-0.5">
              @{currentUser.username} • {currentUser.email}
            </p>
            <p className="text-[11px] text-blue-200/80 mt-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Login Terakhir: {new Date(currentUser.lastLoginAt || Date.now()).toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })} WITA</span>
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="px-4 py-2.5 bg-rose-600/90 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 self-stretch sm:self-auto justify-center"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar Sesi (Logout)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Kolom 1: Profil Akun Administrator */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-[#003566] flex items-center gap-2">
              <User className="w-5 h-5 text-[#00529B]" />
              <span>Profil Administrator</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola identitas, username, dan kontak resmi akun administrator Anda.
            </p>
          </div>

          {profileMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                profileMsg.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-700'
              }`}
            >
              {profileMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{profileMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {/* Nama Lengkap */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nama Tampilan / Petugas *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Contoh: Budi Santoso, S.Kom."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-[#00529B] focus:ring-1 focus:ring-[#00529B]"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Username Akun *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">@</span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="superadmin"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:bg-white focus:border-[#00529B] focus:ring-1 focus:ring-[#00529B]"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Dapat digunakan bersama kata sandi saat masuk ke dashboard.
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Alamat Email Resmi *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="bnnkab_gorontalo@bnn.go.id"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-[#00529B] focus:ring-1 focus:ring-[#00529B]"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nomor Kontak / WhatsApp Dinas
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+62 811-XXXX-XXXX"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-[#00529B] focus:ring-1 focus:ring-[#00529B]"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full py-2.5 px-4 bg-[#00529B] hover:bg-[#003566] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-900/10 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingProfile ? 'Menyimpan...' : 'Simpan Pembaruan Profil'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Kolom 2: Formulir Ganti Kata Sandi (Password) */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-[#003566] flex items-center gap-2">
              <Key className="w-5 h-5 text-[#00529B]" />
              <span>Ganti Kata Sandi (Password)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Terapkan kata sandi yang kuat untuk menjaga keamanan penerbitan sertifikat digital BNN.
            </p>
          </div>

          {passwordMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                passwordMsg.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-700'
              }`}
            >
              {passwordMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Password Saat Ini */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Password Saat Ini *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan password saat ini"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-10 py-2.5 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-[#00529B] focus:ring-1 focus:ring-[#00529B]"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password Baru */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Password Baru *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 8 karakter kuat"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-10 py-2.5 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-[#00529B] focus:ring-1 focus:ring-[#00529B]"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {newPassword.length > 0 && (
                <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-semibold">Tingkat Kekuatan:</span>
                    <span className="font-bold" style={{ color: passwordStrength.color }}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${(passwordStrength.score / 4) * 100}%`,
                        backgroundColor: passwordStrength.color,
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 pt-1">
                    <span className={passwordStrength.checks.minLength ? 'text-emerald-700 font-semibold' : ''}>
                      • Min. 8 karakter
                    </span>
                    <span className={passwordStrength.checks.hasUppercase && passwordStrength.checks.hasLowercase ? 'text-emerald-700 font-semibold' : ''}>
                      • Huruf besar & kecil
                    </span>
                    <span className={passwordStrength.checks.hasNumber ? 'text-emerald-700 font-semibold' : ''}>
                      • Mengandung angka
                    </span>
                    <span className={passwordStrength.checks.hasSpecial ? 'text-emerald-700 font-semibold' : ''}>
                      • Mengandung simbol
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Konfirmasi Password Baru */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Konfirmasi Password Baru *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-10 py-2.5 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-[#00529B] focus:ring-1 focus:ring-[#00529B]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingPassword}
                className="w-full py-2.5 px-4 bg-[#00529B] hover:bg-[#003566] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-900/10 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4" />
                <span>{isSavingPassword ? 'Memproses Penggantian...' : 'Perbarui Kata Sandi Akun'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
