import React, { useState } from 'react';
import {
  Award,
  ShieldCheck,
  LayoutDashboard,
  ExternalLink,
  LogIn,
  LogOut,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { AppearanceConfig, AdminSession } from '../types';
import { DEFAULT_BNN_LOGO_SVG } from '../data/bnnAppearance';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, extraParam?: string) => void;
  isAdminLoggedIn: boolean;
  onOpenLogin: () => void;
  onLogout: () => void;
  adminEmail?: string;
  currentSession?: AdminSession | null;
  appearance: AppearanceConfig;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  isAdminLoggedIn,
  onOpenLogin,
  onLogout,
  adminEmail,
  currentSession,
  appearance,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isPublic = currentView.startsWith('public');

  // Check if header should be shown according to appearance config
  if (isPublic && !appearance.showOnPublic) return null;
  if (!isPublic && !appearance.showOnAdmin) return null;

  const headerTitle = appearance.headerTitle || appearance.appName || 'e-Sertifikat BNN';
  const logoSrc = appearance.logoUrl || DEFAULT_BNN_LOGO_SVG;
  const logoHeight = appearance.logoHeightPx || 44;

  // Background styling classes
  const getHeaderBackgroundStyle = () => {
    if (appearance.headerStyle === 'clean_white') {
      return 'bg-white border-b border-slate-200 text-slate-900 shadow-sm';
    }
    if (appearance.headerStyle === 'solid_blue') {
      return 'bg-[#00529B] border-b border-[#003566] text-white shadow-md';
    }
    // Default: BNN Navy Gradient
    return 'bg-gradient-to-r from-[#003566] via-[#00529B] to-[#003566] border-b border-[#00284d] text-white shadow-md';
  };

  const isLightHeader = appearance.headerStyle === 'clean_white';

  const handleNav = (view: string) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className={`sticky top-0 z-50 ${getHeaderBackgroundStyle()}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand & Logo */}
        <div
          onClick={() => handleNav('public_home')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          {logoSrc ? (
            <img
              src={logoSrc}
              alt="Logo BNN"
              style={{ height: `${logoHeight}px` }}
              className="object-contain shrink-0 group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-md">
              <Award className="w-6 h-6" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span
                style={{ color: appearance.headerTitleColor || (isLightHeader ? '#003566' : '#FFFFFF') }}
                className={`font-black tracking-tight leading-none ${
                  appearance.headerTitleSize === 'xl'
                    ? 'text-xl sm:text-2xl'
                    : appearance.headerTitleSize === 'lg'
                    ? 'text-lg sm:text-xl'
                    : 'text-base sm:text-lg'
                }`}
              >
                {headerTitle}
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-sm border border-amber-300">
                RESMI
              </span>
            </div>
            <p className={`text-[11px] font-medium hidden sm:block ${isLightHeader ? 'text-slate-500' : 'text-blue-100/90'}`}>
              {appearance.appSubtitle || 'Badan Narkotika Nasional Republik Indonesia'}
            </p>
          </div>
        </div>

        {/* Desktop Navigation Switcher */}
        <div className="hidden md:flex items-center gap-3">
          <nav
            className={`flex items-center gap-1 p-1 rounded-xl text-xs sm:text-sm font-semibold border ${
              isLightHeader
                ? 'bg-slate-100 border-slate-200 text-slate-700'
                : 'bg-black/20 border-white/10 text-white'
            }`}
          >
            <button
              onClick={() => handleNav('public_home')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                isPublic && currentView !== 'public_verify'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                  : 'hover:bg-white/10'
              }`}
            >
              <span>Kegiatan BNN</span>
            </button>

            <button
              onClick={() => handleNav('public_verify')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                currentView === 'public_verify'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                  : 'hover:bg-white/10'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Verifikasi Keaslian</span>
            </button>

            <button
              onClick={() => handleNav('admin_dashboard')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                !isPublic
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                  : 'hover:bg-white/10'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard Admin</span>
            </button>
          </nav>

          {/* Admin Auth Pill */}
          <div className="flex items-center gap-2">
            {isAdminLoggedIn ? (
              <div className="flex items-center gap-2 pl-3 border-l border-white/20">
                <button
                  onClick={() => onNavigate('admin_account')}
                  className="hidden lg:flex flex-col text-right hover:opacity-90 transition-opacity text-left group"
                  title="Buka Pengaturan Akun & Profil"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-xs font-bold text-white leading-tight group-hover:underline">
                      {currentSession?.fullName || adminEmail || 'Admin BNN'}
                    </span>
                    <span
                      className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full ${
                        currentSession?.role === 'superadmin'
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'bg-blue-300 text-[#003566]'
                      }`}
                    >
                      {currentSession?.role === 'superadmin' ? 'SUPER' : 'ADMIN'}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-300 flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Sesi Satker Aktif
                  </span>
                </button>
                <button
                  onClick={onLogout}
                  title="Keluar dari Panel Admin"
                  className="p-2 rounded-xl bg-white/10 hover:bg-rose-600 hover:text-white text-white/90 transition-colors border border-white/15"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-300" />
                <span>Masuk Admin</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex md:hidden items-center gap-2">
          {isAdminLoggedIn && (
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg bg-white/10 text-white text-xs"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#003566] border-t border-white/10 px-4 pt-3 pb-5 space-y-2 text-white animate-in slide-in-from-top-2 duration-150">
          <button
            onClick={() => handleNav('public_home')}
            className={`w-full py-2.5 px-3 rounded-xl text-left text-xs font-bold flex items-center gap-2 ${
              isPublic && currentView !== 'public_verify'
                ? 'bg-amber-400 text-slate-950'
                : 'hover:bg-white/10 text-white'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Daftar Kegiatan BNN</span>
          </button>

          <button
            onClick={() => handleNav('public_verify')}
            className={`w-full py-2.5 px-3 rounded-xl text-left text-xs font-bold flex items-center gap-2 ${
              currentView === 'public_verify'
                ? 'bg-amber-400 text-slate-950'
                : 'hover:bg-white/10 text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verifikasi Keaslian Sertifikat</span>
          </button>

          <button
            onClick={() => handleNav('admin_dashboard')}
            className={`w-full py-2.5 px-3 rounded-xl text-left text-xs font-bold flex items-center gap-2 ${
              !isPublic
                ? 'bg-amber-400 text-slate-950'
                : 'hover:bg-white/10 text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Panel Administrator</span>
          </button>

          {!isAdminLoggedIn && (
            <div className="pt-2 border-t border-white/10">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenLogin();
                }}
                className="w-full py-2.5 px-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold flex items-center justify-center gap-2 text-amber-300"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk Administrator</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
