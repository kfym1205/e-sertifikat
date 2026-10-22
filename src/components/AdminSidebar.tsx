import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Layers,
  Move,
  Tag,
  Hash,
  Users,
  Award,
  Send,
  ShieldCheck,
  Mail,
  Palette,
  User,
  Shield,
  Settings,
  ClipboardList,
  Sparkles,
} from 'lucide-react';
import { AdminRole, AdminSession } from '../types';

interface AdminSidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  pendingEmailCount?: number;
  currentSession?: AdminSession | null;
}

export const ADMIN_MENU_ITEMS = [
  { id: 'admin_dashboard', label: '1. Dashboard', icon: LayoutDashboard, badge: null, requiredRole: null },
  { id: 'admin_activities', label: '2. Manajemen Kegiatan', icon: Calendar, badge: null, requiredRole: null },
  { id: 'admin_templates', label: '3. Template Sertifikat', icon: Layers, badge: null, requiredRole: null },
  { id: 'admin_editor', label: '4. Editor Posisi Teks', icon: Move, badge: 'Visual', requiredRole: null },
  { id: 'admin_classifications', label: '5. Kode Klasifikasi', icon: Tag, badge: null, requiredRole: null },
  { id: 'admin_number_format', label: '6. Format Nomor Registrasi', icon: Hash, badge: null, requiredRole: null },
  { id: 'admin_participants', label: '7. Data Pendaftar', icon: Users, badge: null, requiredRole: null },
  { id: 'admin_issued', label: '8. Sertifikat Terbit', icon: Award, badge: null, requiredRole: null },
  { id: 'admin_email_delivery', label: '9. Pengiriman Email', icon: Send, badge: 'emailCount', requiredRole: null },
  { id: 'admin_verify_tool', label: '10. Verifikasi Sertifikat', icon: ShieldCheck, badge: null, requiredRole: null },
  { id: 'admin_email_settings', label: '11. Pengaturan Email', icon: Mail, badge: null, requiredRole: null },
  { id: 'admin_appearance', label: '12. Pengaturan Tampilan', icon: Palette, badge: 'Tema', requiredRole: null },
  { id: 'admin_account', label: '13. Profil & Akun Admin', icon: User, badge: null, requiredRole: null },
  { id: 'admin_users_mgmt', label: '14. Manajemen Admin', icon: Shield, badge: 'Super', requiredRole: 'superadmin' as AdminRole },
  { id: 'admin_system_settings', label: '15. Pengaturan Sistem', icon: Settings, badge: 'DB', requiredRole: null },
  { id: 'admin_audit_logs', label: '16. Audit Log', icon: ClipboardList, badge: null, requiredRole: null },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentView,
  onSelectView,
  pendingEmailCount = 0,
  currentSession,
}) => {
  const isSuperAdmin = currentSession?.role === 'superadmin';

  const visibleMenuItems = ADMIN_MENU_ITEMS.filter((item) => {
    if (item.requiredRole === 'superadmin' && !isSuperAdmin) {
      return false;
    }
    return true;
  });

  return (
    <aside className="w-64 bg-[#002b54] text-white border-r border-[#001f3d] flex flex-col shrink-0 min-h-[calc(100vh-4.5rem)] shadow-lg">
      <div className="p-4 border-b border-white/10 bg-[#002244]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#1677C8]/30 text-amber-300 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              Menu Administrator
            </h2>
            <p className="text-[11px] text-blue-200">
              {isSuperAdmin ? '16 Modul (Super Admin)' : '15 Modul (Admin Satker)'}
            </p>
          </div>
        </div>
      </div>

      <nav className="p-2.5 flex-1 space-y-1 overflow-y-auto">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const showEmailBadge = item.badge === 'emailCount' && pendingEmailCount > 0;

          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left group ${
                isActive
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                  : 'text-blue-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-slate-950' : 'text-blue-300 group-hover:text-amber-300'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && item.badge !== 'emailCount' && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${
                    isActive
                      ? 'bg-slate-950/20 text-slate-950'
                      : item.badge === 'Super'
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                      : 'bg-white/10 text-amber-300 border border-white/15'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {showEmailBadge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {pendingEmailCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Session Footer Card */}
      {currentSession && (
        <div className="p-3 m-3 bg-[#001f3d] rounded-2xl border border-white/10 text-[11px] text-blue-200 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white truncate max-w-[120px]">{currentSession.fullName}</span>
            <span
              className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                currentSession.role === 'superadmin'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-blue-300 text-[#003566]'
              }`}
            >
              {currentSession.role === 'superadmin' ? 'SUPER' : 'ADMIN'}
            </span>
          </div>
          <p className="text-[10px] text-blue-300 font-mono truncate">{currentSession.email}</p>
        </div>
      )}
    </aside>
  );
};
