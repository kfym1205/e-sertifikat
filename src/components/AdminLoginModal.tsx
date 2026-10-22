import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Key,
  X,
  AlertCircle,
  CheckCircle2,
  Shield,
  Eye,
  EyeOff,
  User,
  Sparkles,
  HelpCircle,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { storage } from '../utils/storage';
import { AdminSession } from '../types';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: AdminSession) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [identifier, setIdentifier] = useState('superadmin@bnn.go.id');
  const [password, setPassword] = useState('Admin_BNN_2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Password recovery view
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      const res = storage.authenticateAdmin(identifier, password);
      setIsLoading(false);

      if (res.success && res.session) {
        onLoginSuccess(res.session);
        onClose();
      } else {
        setError(res.error || 'Autentikasi gagal. Periksa kembali kredensial Anda.');
      }
    }, 350);
  };

  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryIdentifier.trim()) return;
    const res = storage.requestPasswordReset(recoveryIdentifier);
    setRecoveryMessage(
      res.resetToken
        ? `${res.message} (Token Pemulihan: ${res.resetToken})`
        : res.message
    );
  };

  const handleSelectDemo = (role: 'super' | 'satker') => {
    if (role === 'super') {
      setIdentifier('superadmin@bnn.go.id');
      setPassword('Admin_BNN_2026!');
    } else {
      setIdentifier('bnnkab_gorontalo@bnn.go.id');
      setPassword('Admin_BNNK_2026!');
    }
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#001f3d]/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header with BNN Deep Navy */}
        <div className="p-6 bg-gradient-to-r from-[#003566] via-[#00529B] to-[#003566] text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/10 text-amber-300 flex items-center justify-center border border-white/20 shadow-xs">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black tracking-tight text-white">
                    {isRecoveryMode ? 'Pemulihan Akun Satker' : 'Login Administrator'}
                  </h3>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                    RESMI
                  </span>
                </div>
                <p className="text-xs text-blue-100">
                  {isRecoveryMode
                    ? 'Verifikasi Akun Administrator BNN'
                    : 'Panel e-Sertifikat Badan Narkotika Nasional'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {isRecoveryMode ? (
          <form onSubmit={handleRecoverySubmit} className="p-6 space-y-4">
            <div className="p-3.5 bg-[#EAF4FC] border border-[#00529B]/20 rounded-xl text-xs text-[#003566] leading-relaxed">
              Masukkan Username atau Alamat Email Satker BNN Anda untuk menerima instruksi pemulihan kata sandi resmi.
            </div>

            {recoveryMessage && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{recoveryMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Username atau Email Resmi BNN
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={recoveryIdentifier}
                  onChange={(e) => setRecoveryIdentifier(e.target.value)}
                  placeholder="superadmin atau bnnkab_gorontalo@bnn.go.id"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#00529B] focus:ring-1 focus:ring-[#00529B]"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsRecoveryMode(false);
                  setRecoveryMessage(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
              >
                &larr; Kembali ke Login
              </button>

              <button
                type="submit"
                className="py-2.5 px-5 bg-[#00529B] hover:bg-[#003566] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-900/10 flex items-center gap-1.5"
              >
                <span>Kirim Permintaan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Username or Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Username atau Alamat Email *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="superadmin atau email@bnn.go.id"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#00529B] focus:ring-1 focus:ring-[#00529B]"
                />
              </div>
            </div>

            {/* Password with Show/Hide toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Kata Sandi (Password) *
                </label>
                <button
                  type="button"
                  onClick={() => setIsRecoveryMode(true)}
                  className="text-[11px] text-[#00529B] hover:underline font-semibold"
                >
                  Lupa kata sandi?
                </button>
              </div>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-10 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#00529B] focus:ring-1 focus:ring-[#00529B]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quick Demo Credentials */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-slate-600 block">
                Akun Resmi BNN Siap Pakai:
              </span>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <button
                  type="button"
                  onClick={() => handleSelectDemo('super')}
                  className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-bold border border-amber-300 transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Super Admin BNN</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectDemo('satker')}
                  className="px-2.5 py-1 rounded-lg bg-[#EAF4FC] hover:bg-blue-100 text-[#003566] text-[11px] font-bold border border-[#00529B]/20 transition-colors flex items-center gap-1"
                >
                  <Shield className="w-3 h-3 text-[#00529B]" />
                  <span>Admin Satker Gorontalo</span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-[#00529B] hover:bg-[#003566] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-900/15 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Memverifikasi Kredensial...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Masuk ke Panel Administrator</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
