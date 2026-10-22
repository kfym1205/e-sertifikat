import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AdminSidebar } from './components/AdminSidebar';
import { AdminLoginModal } from './components/AdminLoginModal';
import { DashboardView } from './components/admin/DashboardView';
import { ActivitiesView } from './components/admin/ActivitiesView';
import { TemplatesView } from './components/admin/TemplatesView';
import { VisualEditorView } from './components/admin/VisualEditorView';
import { ClassificationsView } from './components/admin/ClassificationsView';
import { NumberFormatView } from './components/admin/NumberFormatView';
import { ParticipantsView } from './components/admin/ParticipantsView';
import { IssuedCertificatesView } from './components/admin/IssuedCertificatesView';
import { EmailDeliveryView } from './components/admin/EmailDeliveryView';
import { VerificationToolView } from './components/admin/VerificationToolView';
import { EmailSettingsView } from './components/admin/EmailSettingsView';
import { AppearanceSettingsView } from './components/admin/AppearanceSettingsView';
import { AdminAccountProfileView } from './components/admin/AdminAccountProfileView';
import { AdminUsersManagementView } from './components/admin/AdminUsersManagementView';
import { SystemSettingsView } from './components/admin/SystemSettingsView';
import { AuditLogsView } from './components/admin/AuditLogsView';
import { PublicHomeView } from './components/public/PublicHomeView';
import { PublicRegistrationForm } from './components/public/PublicRegistrationForm';
import { PublicConfirmationView } from './components/public/PublicConfirmationView';
import { PublicVerifyView } from './components/public/PublicVerifyView';
import { Footer } from './components/Footer';
import { storage } from './utils/storage';
import { CertificateIssuance, AppearanceConfig, AdminSession } from './types';
import { Award, ShieldCheck, Heart } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<string>('public_home');
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [confirmedIssuance, setConfirmedIssuance] = useState<CertificateIssuance | null>(null);
  const [isDuplicateReissue, setIsDuplicateReissue] = useState<boolean>(false);
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [appearance, setAppearance] = useState<AppearanceConfig>(() => storage.getAppearance());

  // Admin Session State
  const [adminSession, setAdminSession] = useState<AdminSession | null>(() => storage.getAdminSession());
  const isAdminLoggedIn = Boolean(adminSession);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  useEffect(() => {
    // Apply BNN appearance theme CSS variables to DOM
    storage.applyThemeToDom(appearance);
  }, [appearance]);

  useEffect(() => {
    // Check initial admin session
    const session = storage.getAdminSession();
    if (session) {
      setAdminSession(session);
    }

    // Check pathname for /verifikasi/:id
    const path = window.location.pathname;
    if (path.startsWith('/verifikasi/')) {
      const code = path.replace('/verifikasi/', '').trim();
      if (code) {
        setVerificationCode(code);
        setCurrentView('public_verify');
      }
    }
  }, []);

  const handleNavigate = (view: string, extraParam?: string) => {
    if (view.startsWith('admin_') && !isAdminLoggedIn) {
      setIsLoginModalOpen(true);
      return;
    }

    // Role-based protection: Only superadmin can access admin_users_mgmt
    if (view === 'admin_users_mgmt' && adminSession?.role !== 'superadmin') {
      alert('Akses Ditolak: Menu Manajemen Administrator hanya dapat diakses oleh peran Super Admin.');
      setCurrentView('admin_dashboard');
      return;
    }

    if (view === 'public_register' && extraParam) {
      setSelectedActivityId(extraParam);
    }
    if (view === 'admin_editor' && extraParam) {
      setSelectedActivityId(extraParam);
    }

    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (session: AdminSession) => {
    setAdminSession(session);
    if (currentView.startsWith('public')) {
      setCurrentView('admin_dashboard');
    }
  };

  const handleLogout = () => {
    storage.setAdminSession(null);
    setAdminSession(null);
    setCurrentView('public_home');
  };

  const pendingEmailFailures = storage.getEmailLogs().filter((l) => l.status === 'failed').length;

  return (
    <div className="min-h-screen bg-[#F5F8FC] text-slate-800 flex flex-col font-sans selection:bg-[#00529B] selection:text-white">
      {/* Top Navigation with BNN Header */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        isAdminLoggedIn={isAdminLoggedIn}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        adminEmail={adminSession?.email}
        currentSession={adminSession}
        appearance={appearance}
      />

      {/* Main Content Router */}
      <div className="flex-1 flex flex-col">
        {currentView.startsWith('admin_') ? (
          <div className="flex-1 flex flex-col md:flex-row">
            {/* Sidebar with RBAC */}
            <AdminSidebar
              currentView={currentView}
              onSelectView={(v) => handleNavigate(v)}
              pendingEmailCount={pendingEmailFailures}
              currentSession={adminSession}
            />

            {/* Admin View Area */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
              {currentView === 'admin_dashboard' && <DashboardView onNavigate={handleNavigate} />}
              {currentView === 'admin_activities' && <ActivitiesView onNavigate={handleNavigate} />}
              {currentView === 'admin_templates' && <TemplatesView />}
              {currentView === 'admin_editor' && (
                <VisualEditorView initialActivityId={selectedActivityId} />
              )}
              {currentView === 'admin_classifications' && <ClassificationsView />}
              {currentView === 'admin_number_format' && <NumberFormatView />}
              {currentView === 'admin_participants' && <ParticipantsView />}
              {currentView === 'admin_issued' && <IssuedCertificatesView />}
              {currentView === 'admin_email_delivery' && <EmailDeliveryView />}
              {currentView === 'admin_verify_tool' && <VerificationToolView />}
              {currentView === 'admin_email_settings' && <EmailSettingsView />}
              {currentView === 'admin_appearance' && (
                <AppearanceSettingsView
                  onAppearanceUpdated={(newCfg) => setAppearance(newCfg)}
                />
              )}
              {currentView === 'admin_account' && adminSession && (
                <AdminAccountProfileView
                  currentSession={adminSession}
                  onSessionUpdated={(updated) => setAdminSession(updated)}
                  onLogout={handleLogout}
                />
              )}
              {currentView === 'admin_users_mgmt' && adminSession && (
                <AdminUsersManagementView currentSession={adminSession} />
              )}
              {currentView === 'admin_system_settings' && <SystemSettingsView />}
              {currentView === 'admin_audit_logs' && <AuditLogsView />}
            </main>
          </div>
        ) : (
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {currentView === 'public_home' && (
              <PublicHomeView
                onSelectActivity={(actId) => {
                  setSelectedActivityId(actId);
                  setCurrentView('public_register');
                }}
                onNavigateToVerify={() => {
                  setVerificationCode('');
                  setCurrentView('public_verify');
                }}
              />
            )}

            {currentView === 'public_register' && (
              <PublicRegistrationForm
                activityId={selectedActivityId || storage.getActivities()[0]?.id}
                onBack={() => setCurrentView('public_home')}
                onSuccess={(issuance, isReissue) => {
                  setConfirmedIssuance(issuance);
                  setIsDuplicateReissue(Boolean(isReissue));
                  setCurrentView('public_confirmation');
                }}
              />
            )}

            {currentView === 'public_confirmation' && confirmedIssuance && (
              <PublicConfirmationView
                issuance={confirmedIssuance}
                isReissue={isDuplicateReissue}
                onHome={() => setCurrentView('public_home')}
                onVerify={(code) => {
                  setVerificationCode(code);
                  setCurrentView('public_verify');
                }}
              />
            )}

            {currentView === 'public_verify' && (
              <PublicVerifyView
                initialCode={verificationCode}
                onHome={() => setCurrentView('public_home')}
              />
            )}
          </main>
        )}
      </div>

      {/* Dynamic Institutional Footer */}
      <Footer config={appearance.footer} appName={appearance.appName} />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
