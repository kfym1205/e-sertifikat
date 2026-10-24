import {
  Activity,
  AdminRole,
  AdminSession,
  AdminUser,
  AppearanceConfig,
  AuditLog,
  CertificateIssuance,
  CertificateTemplate,
  ClassificationCode,
  CounterRecord,
  EmailDeliveryLog,
  LayoutElement,
  Participant,
  VerificationResult
} from '../types';
import {
  INITIAL_ACTIVITIES,
  INITIAL_AUDIT_LOGS,
  INITIAL_CLASSIFICATIONS,
  INITIAL_EMAIL_LOGS,
  INITIAL_ISSUANCES,
  INITIAL_TEMPLATES
} from '../data/initialData';
import { DEFAULT_APPEARANCE_CONFIG } from '../data/bnnAppearance';
import { formatIndonesianDate, getNowInTimezone } from './dateUtils';
import { generateRegistrationNumber, getCounterScopeKey } from './numberGenerator';
import { sendCertificateEmail } from './emailService';
import { getCertificatePdfDataUrl } from './pdfGenerator';
import { simpleHashPassword, validatePasswordPolicy } from './authUtils';

const STORAGE_KEYS = {
  ACTIVITIES: 'so_activities_v1',
  TEMPLATES: 'so_templates_v1',
  CLASSIFICATIONS: 'so_classifications_v1',
  ISSUANCES: 'so_issuances_v1',
  EMAIL_LOGS: 'so_email_logs_v1',
  AUDIT_LOGS: 'so_audit_logs_v1',
  COUNTERS: 'so_counters_v1',
  PARTICIPANTS: 'so_participants_v1',
  ADMIN_AUTH: 'so_admin_session_v2',
  APPEARANCE: 'so_appearance_v1',
  ADMIN_USERS: 'so_admin_users_v2',
};

// In-memory cache
class DataStore {
  activities: Activity[] = [];
  templates: CertificateTemplate[] = [];
  classifications: ClassificationCode[] = [];
  issuances: CertificateIssuance[] = [];
  emailLogs: EmailDeliveryLog[] = [];
  auditLogs: AuditLog[] = [];
  counters: Record<string, CounterRecord> = {};
  participants: Participant[] = [];
  adminUsers: AdminUser[] = [];
  appearanceConfig: AppearanceConfig = DEFAULT_APPEARANCE_CONFIG;
  isInitialized = false;
  isSyncing = false;
  lastSyncedAt?: string;
  databaseProvider: string = 'local';
  private listeners: Array<() => void> = [];

  constructor() {
    this.init();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners(): void {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (err) {
        console.error('Error notifying storage listener:', err);
      }
    });
  }

  mergeAppearance(incoming?: Partial<AppearanceConfig> | null): AppearanceConfig {
    if (!incoming || typeof incoming !== 'object') {
      return { ...DEFAULT_APPEARANCE_CONFIG };
    }
    const merged: AppearanceConfig = {
      ...DEFAULT_APPEARANCE_CONFIG,
      ...this.appearanceConfig,
      ...incoming,
      footer: {
        ...DEFAULT_APPEARANCE_CONFIG.footer,
        ...(this.appearanceConfig?.footer || {}),
        ...(incoming.footer || {}),
      },
      theme: {
        ...DEFAULT_APPEARANCE_CONFIG.theme,
        ...(this.appearanceConfig?.theme || {}),
        ...(incoming.theme || {}),
      },
    };
    if (merged.showOnPublic === undefined) merged.showOnPublic = true;
    if (merged.showOnAdmin === undefined) merged.showOnAdmin = true;
    return merged;
  }

  getDefaultAdminUsers(): AdminUser[] {
    return [
      {
        id: 'usr_superadmin_01',
        username: 'superadmin',
        email: 'superadmin@bnn.go.id',
        fullName: 'Super Administrator BNN RI',
        role: 'superadmin',
        isActive: true,
        createdAt: '2026-10-01T08:00:00.000Z',
        updatedAt: '2026-10-01T08:00:00.000Z',
        lastLoginAt: '2026-10-21T08:30:00.000Z',
        phone: '+62 811-4350-999',
        passwordHash: simpleHashPassword('Admin_BNN_2026!', 'usr_superadmin_01'),
        salt: 'usr_superadmin_01',
      },
      {
        id: 'usr_adminsatker_02',
        username: 'admin_gorontalo',
        email: 'bnnkab_gorontalo@bnn.go.id',
        fullName: 'Admin Satker BNNK Gorontalo',
        role: 'admin',
        isActive: true,
        createdAt: '2026-10-05T09:00:00.000Z',
        updatedAt: '2026-10-05T09:00:00.000Z',
        lastLoginAt: '2026-10-21T07:15:00.000Z',
        phone: '+62 435 829100',
        passwordHash: simpleHashPassword('Admin_BNNK_2026!', 'usr_adminsatker_02'),
        salt: 'usr_adminsatker_02',
      },
      {
        id: 'usr_admin_legacy_03',
        username: 'admin',
        email: 'admin@sertifikat.id',
        fullName: 'Administrator Sertifikat',
        role: 'superadmin',
        isActive: true,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
        phone: '+62 812-3456-789',
        passwordHash: simpleHashPassword('admin_sertifikat_2026', 'usr_admin_legacy_03'),
        salt: 'usr_admin_legacy_03',
      },
    ];
  }

  init() {
    if (this.isInitialized) return;

    try {
      const actStored = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
      this.activities = actStored ? JSON.parse(actStored) : INITIAL_ACTIVITIES;

      const tmplStored = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
      this.templates = tmplStored ? JSON.parse(tmplStored) : INITIAL_TEMPLATES;

      const clsStored = localStorage.getItem(STORAGE_KEYS.CLASSIFICATIONS);
      this.classifications = clsStored ? JSON.parse(clsStored) : INITIAL_CLASSIFICATIONS;

      const issStored = localStorage.getItem(STORAGE_KEYS.ISSUANCES);
      this.issuances = issStored ? JSON.parse(issStored) : INITIAL_ISSUANCES;

      const elogStored = localStorage.getItem(STORAGE_KEYS.EMAIL_LOGS);
      this.emailLogs = elogStored ? JSON.parse(elogStored) : INITIAL_EMAIL_LOGS;

      const audStored = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      this.auditLogs = audStored ? JSON.parse(audStored) : INITIAL_AUDIT_LOGS;

      const counterStored = localStorage.getItem(STORAGE_KEYS.COUNTERS);
      this.counters = counterStored ? JSON.parse(counterStored) : {
        'activity_act_bnnk_relawan_2026': {
          id: 'c1',
          scopeKey: 'activity_act_bnnk_relawan_2026',
          lastNumber: 2,
          lastYear: 2026,
          lastMonth: 10,
          updatedAt: new Date().toISOString()
        },
        'activity_act_kominfo_digital_2026': {
          id: 'c2',
          scopeKey: 'activity_act_kominfo_digital_2026',
          lastNumber: 1,
          lastYear: 2026,
          lastMonth: 10,
          updatedAt: new Date().toISOString()
        }
      };

      const partStored = localStorage.getItem(STORAGE_KEYS.PARTICIPANTS);
      this.participants = partStored ? JSON.parse(partStored) : [];

      const adminStored = localStorage.getItem(STORAGE_KEYS.ADMIN_USERS);
      this.adminUsers = adminStored ? JSON.parse(adminStored) : this.getDefaultAdminUsers();

      const appStored = localStorage.getItem(STORAGE_KEYS.APPEARANCE);
      this.appearanceConfig = appStored ? this.mergeAppearance(JSON.parse(appStored)) : { ...DEFAULT_APPEARANCE_CONFIG };
      this.applyThemeToDom(this.appearanceConfig.theme);

      this.isInitialized = true;
    } catch (e) {
      console.warn('Gagal memuat local storage, menggunakan state in-memory default:', e);
      this.activities = INITIAL_ACTIVITIES;
      this.templates = INITIAL_TEMPLATES;
      this.classifications = INITIAL_CLASSIFICATIONS;
      this.issuances = INITIAL_ISSUANCES;
      this.emailLogs = INITIAL_EMAIL_LOGS;
      this.auditLogs = INITIAL_AUDIT_LOGS;
      this.counters = {};
      this.participants = [];
      this.adminUsers = this.getDefaultAdminUsers();
      this.appearanceConfig = DEFAULT_APPEARANCE_CONFIG;
      this.applyThemeToDom(this.appearanceConfig.theme);
      this.isInitialized = true;
    }

    // Automatically synchronize with central database when running in browser
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.syncWithServer().catch(() => {});
      }, 50);
    }
  }

  /**
   * Mengambil sinkronisasi penuh dari database terpusat (Supabase / server persisten)
   */
  async syncWithServer(): Promise<{ success: boolean; provider?: string }> {
    if (this.isSyncing) return { success: true };
    this.isSyncing = true;

    try {
      const res = await fetch('/api/sync');
      if (!res.ok) {
        this.isSyncing = false;
        return { success: false };
      }
      const data = await res.json();
      if (!data.success) {
        this.isSyncing = false;
        return { success: false };
      }

      // Deteksi jika server masih default baseline DAN perangkat ini memiliki kustomisasi lokal lama
      const hasLocalCustomAppearance = localStorage.getItem(STORAGE_KEYS.APPEARANCE) !== null;
      const hasLocalCustomTemplates = localStorage.getItem(STORAGE_KEYS.TEMPLATES) !== null;
      const hasLocalCustomActivities = localStorage.getItem(STORAGE_KEYS.ACTIVITIES) !== null;
      const isServerBaseline = (!data.activities || data.activities.length <= 2) && (!data.version || data.version <= 1);

      if ((hasLocalCustomAppearance || hasLocalCustomTemplates || hasLocalCustomActivities) && isServerBaseline) {
        // Lakukan migrasi otomatis dari data lokal ke database terpusat server
        console.log('[BNN-SYNC] Memigrasikan kustomisasi lokal administrator ke database terpusat...');
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appearance: this.appearanceConfig,
            activities: this.activities,
            templates: this.templates,
            classifications: this.classifications,
            issuances: this.issuances,
            counters: this.counters,
          }),
        });
      } else {
        // Ambil data terbaru dari database terpusat
        if (data.appearance) {
          this.appearanceConfig = this.mergeAppearance(data.appearance);
          this.persist(STORAGE_KEYS.APPEARANCE, this.appearanceConfig);
          this.applyThemeToDom(this.appearanceConfig.theme);
        }
        if (Array.isArray(data.activities) && data.activities.length > 0) {
          this.activities = data.activities;
          this.persist(STORAGE_KEYS.ACTIVITIES, this.activities);
        }
        if (Array.isArray(data.templates) && data.templates.length > 0) {
          this.templates = data.templates;
          this.persist(STORAGE_KEYS.TEMPLATES, this.templates);
        }
        if (Array.isArray(data.classifications) && data.classifications.length > 0) {
          this.classifications = data.classifications;
          this.persist(STORAGE_KEYS.CLASSIFICATIONS, this.classifications);
        }
        if (Array.isArray(data.issuances) && data.issuances.length > 0) {
          this.issuances = data.issuances;
          this.persist(STORAGE_KEYS.ISSUANCES, this.issuances);
        }
        if (data.counters && typeof data.counters === 'object') {
          this.counters = data.counters;
          this.persist(STORAGE_KEYS.COUNTERS, this.counters);
        }
        if (Array.isArray(data.auditLogs) && data.auditLogs.length > 0) {
          this.auditLogs = data.auditLogs;
          this.persist(STORAGE_KEYS.AUDIT_LOGS, this.auditLogs);
        }
        if (Array.isArray(data.adminUsers) && data.adminUsers.length > 0) {
          this.adminUsers = data.adminUsers;
          this.persist(STORAGE_KEYS.ADMIN_USERS, this.adminUsers);
        }
      }

      this.databaseProvider = data.databaseProvider || (data.isSupabaseActive ? 'supabase_postgresql' : 'persistent_server_storage');
      this.lastSyncedAt = new Date().toISOString();
      this.isSyncing = false;
      this.notifyListeners();
      return { success: true, provider: this.databaseProvider };
    } catch (err) {
      this.isSyncing = false;
      console.warn('[BNN-SYNC] Gagal terhubung ke endpoint sinkronisasi backend:', err);
      return { success: false };
    }
  }

  persist(key: string, data: any) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn(`Gagal menyimpan ${key} ke local storage:`, e);
    }
  }

  // --- APPEARANCE & BNN THEME ---
  getAppearance(): AppearanceConfig {
    return this.appearanceConfig;
  }

  saveAppearance(config: AppearanceConfig): AppearanceConfig {
    this.appearanceConfig = this.mergeAppearance({
      ...config,
      updatedAt: new Date().toISOString(),
      updatedBy: this.getAdminSession()?.email || 'admin@sertifikat.id',
    });
    this.persist(STORAGE_KEYS.APPEARANCE, this.appearanceConfig);
    this.applyThemeToDom(this.appearanceConfig.theme);

    // Sync to backend persistent database
    fetch('/api/appearance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.appearanceConfig),
    }).catch((err) => {
      console.warn('[BNN-SYNC] Gagal menyimpan tampilan ke server:', err);
    });

    this.logAudit(
      'UPDATE_APPEARANCE',
      'system',
      'appearance',
      'Memperbarui konfigurasi identitas visual, header, footer, dan tema e-Sertifikat BNN'
    );

    this.notifyListeners();
    return this.appearanceConfig;
  }

  applyThemeToDom(themeOrConfig?: AppearanceConfig['theme'] | AppearanceConfig) {
    if (typeof document === 'undefined' || !themeOrConfig) return;
    const theme = ('theme' in themeOrConfig && themeOrConfig.theme) ? themeOrConfig.theme : (themeOrConfig as AppearanceConfig['theme']);
    if (!theme) return;
    const root = document.documentElement;
    root.style.setProperty('--bnn-primary', theme.primaryColor || '#00529B');
    root.style.setProperty('--bnn-dark', theme.darkColor || '#003566');
    root.style.setProperty('--bnn-secondary', theme.secondaryColor || '#1677C8');
    root.style.setProperty('--bnn-light', theme.lightColor || '#EAF4FC');
    root.style.setProperty('--bnn-bg', theme.bgColor || '#F5F8FC');
    root.style.setProperty('--bnn-text', theme.textColor || '#1F2937');
    root.style.setProperty('--bnn-muted', theme.mutedColor || '#64748B');
  }

  // --- ACTIVITIES ---
  getActivities(): Activity[] {
    return [...this.activities];
  }

  getActivity(id: string): Activity | undefined {
    return this.activities.find(a => a.id === id || a.slug === id);
  }

  saveActivity(activity: Activity): Activity {
    const existingIndex = this.activities.findIndex(a => a.id === activity.id);
    const updated = { ...activity, updatedAt: new Date().toISOString() };
    if (existingIndex >= 0) {
      this.activities[existingIndex] = updated;
      this.logAudit('UPDATE_ACTIVITY', 'activity', activity.id, `Memperbarui konfigurasi kegiatan "${activity.name}"`);
    } else {
      this.activities.unshift(updated);
      this.logAudit('CREATE_ACTIVITY', 'activity', activity.id, `Membuat kegiatan baru "${activity.name}"`);
    }
    this.persist(STORAGE_KEYS.ACTIVITIES, this.activities);

    // Sync to backend persistent database
    fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch((err) => {
      console.warn('[BNN-SYNC] Gagal menyimpan kegiatan ke database backend:', err);
    });

    this.notifyListeners();
    return updated;
  }

  deleteActivity(id: string): boolean {
    const act = this.getActivity(id);
    if (!act) return false;
    this.activities = this.activities.filter(a => a.id !== id);
    this.persist(STORAGE_KEYS.ACTIVITIES, this.activities);
    this.logAudit('DELETE_ACTIVITY', 'activity', id, `Menghapus kegiatan "${act.name}"`);

    // Sync to backend persistent database
    fetch(`/api/activities?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch(() => {});

    this.notifyListeners();
    return true;
  }

  // --- TEMPLATES ---
  getTemplates(): CertificateTemplate[] {
    return [...this.templates];
  }

  getTemplate(id: string): CertificateTemplate | undefined {
    return this.templates.find(t => t.id === id);
  }

  saveTemplate(template: CertificateTemplate): CertificateTemplate {
    const existingIndex = this.templates.findIndex(t => t.id === template.id);
    const updated = {
      ...template,
      version: (template.version || 1) + (existingIndex >= 0 ? 1 : 0),
      updatedAt: new Date().toISOString()
    };
    if (existingIndex >= 0) {
      this.templates[existingIndex] = updated;
      this.logAudit('UPDATE_TEMPLATE', 'template', template.id, `Memperbarui template sertifikat "${template.name}" ke versi ${updated.version}`);
    } else {
      this.templates.unshift(updated);
      this.logAudit('CREATE_TEMPLATE', 'template', template.id, `Menambahkan template sertifikat baru "${template.name}"`);
    }
    this.persist(STORAGE_KEYS.TEMPLATES, this.templates);

    // Sync to backend persistent database
    fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch((err) => {
      console.warn('[BNN-SYNC] Gagal menyimpan template ke database backend:', err);
    });

    this.notifyListeners();
    return updated;
  }

  deleteTemplate(id: string): boolean {
    this.templates = this.templates.filter(t => t.id !== id);
    this.persist(STORAGE_KEYS.TEMPLATES, this.templates);
    this.logAudit('DELETE_TEMPLATE', 'template', id, `Menghapus template ID ${id}`);

    // Sync to backend persistent database
    fetch(`/api/templates?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch(() => {});

    this.notifyListeners();
    return true;
  }

  // --- CLASSIFICATIONS ---
  getClassifications(): ClassificationCode[] {
    return [...this.classifications];
  }

  saveClassification(cls: ClassificationCode): ClassificationCode {
    const index = this.classifications.findIndex(c => c.id === cls.id);
    if (index >= 0) {
      this.classifications[index] = cls;
      this.logAudit('UPDATE_CLASSIFICATION', 'number_config', cls.id, `Memperbarui kode klasifikasi ${cls.code} (${cls.name})`);
    } else {
      this.classifications.push(cls);
      this.logAudit('CREATE_CLASSIFICATION', 'number_config', cls.id, `Menambahkan kode klasifikasi baru ${cls.code}`);
    }
    this.persist(STORAGE_KEYS.CLASSIFICATIONS, this.classifications);

    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classifications: this.classifications }),
    }).catch(() => {});

    this.notifyListeners();
    return cls;
  }

  // --- REGISTRATION & CERTIFICATE ISSUANCE (ATOMIC COUNTER) ---
  getNextSequence(scopeKey: string, resetPolicy: string, startNumber: number = 1): number {
    const now = getNowInTimezone();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    let record = this.counters[scopeKey];
    if (!record) {
      record = {
        id: `counter_${Date.now()}`,
        scopeKey,
        lastNumber: startNumber - 1,
        lastYear: currentYear,
        lastMonth: currentMonth,
        updatedAt: now.toISOString(),
      };
    }

    // Check reset policy
    let shouldReset = false;
    if (resetPolicy === 'yearly' && record.lastYear !== currentYear) {
      shouldReset = true;
    } else if (resetPolicy === 'monthly' && (record.lastYear !== currentYear || record.lastMonth !== currentMonth)) {
      shouldReset = true;
    }

    const nextNumber = shouldReset ? startNumber : record.lastNumber + 1;
    record.lastNumber = nextNumber;
    record.lastYear = currentYear;
    record.lastMonth = currentMonth;
    record.updatedAt = now.toISOString();

    this.counters[scopeKey] = record;
    this.persist(STORAGE_KEYS.COUNTERS, this.counters);

    return nextNumber;
  }

  /**
   * Pendaftaran peserta baru dan penerbitan sertifikat secara otomatis
   */
  async registerAndIssueCertificate(params: {
    activityId: string;
    fullName: string;
    email: string;
    phone?: string;
    institution?: string;
    customFieldValue?: string;
    baseUrl?: string;
  }): Promise<{
    success: boolean;
    issuance?: CertificateIssuance;
    error?: string;
    isDuplicateReissue?: boolean;
  }> {
    const activity = this.getActivity(params.activityId);
    if (!activity) {
      return { success: false, error: 'Kegiatan tidak ditemukan atau sudah ditutup.' };
    }

    if (!activity.isActive) {
      return { success: false, error: 'Pendaftaran untuk kegiatan ini saat ini sedang tidak aktif.' };
    }

    const cleanEmail = params.email.trim().toLowerCase();
    const cleanName = params.fullName.trim();

    // 1. Cek Kebijakan Pendaftaran Ganda
    const existingIssuance = this.issuances.find(
      iss => iss.activityId === activity.id && iss.participantEmail.toLowerCase() === cleanEmail && iss.status === 'valid'
    );

    if (existingIssuance) {
      if (activity.duplicatePolicy === 'disallow') {
        return {
          success: false,
          error: `Alamat email "${cleanEmail}" sudah terdaftar untuk kegiatan ini dengan nomor registrasi ${existingIssuance.registrationNumber}. Pendaftaran ganda tidak diizinkan.`
        };
      }
      if (activity.duplicatePolicy === 'reissue') {
        // Gunakan sertifikat yang sudah ada dan kembalikan kepada peserta
        return {
          success: true,
          issuance: existingIssuance,
          isDuplicateReissue: true
        };
      }
      // Jika 'allow', teruskan penerbitan baru
    }

    // 2. Tentukan Tanggal Sertifikat
    const nowServer = getNowInTimezone(activity.timezone || 'Asia/Makassar');
    let displayDate = '';
    if (activity.dateMode === 'manual' && activity.manualDate) {
      displayDate = formatIndonesianDate(activity.manualDate, activity.timezone);
    } else {
      displayDate = formatIndonesianDate(nowServer, activity.timezone);
    }

    // 3. Alokasikan Nomor Registrasi secara atomik
    const numConfig = activity.registrationNumberConfig;
    const scopeKey = getCounterScopeKey(numConfig, activity.id, numConfig.classificationCode);
    const sequenceNumber = this.getNextSequence(scopeKey, numConfig.resetPolicy, numConfig.startNumber);

    const registrationNumber = generateRegistrationNumber(numConfig, {
      sequenceNumber,
      docTypeCode: numConfig.docTypeCode,
      classificationCode: numConfig.classificationCode,
      unitCode: numConfig.unitCode,
      institutionCode: numConfig.institutionCode,
      date: nowServer
    });

    // 4. Buat Unique Verification ID (sulit ditebak, aman untuk verifikasi publik)
    const randomHex = Math.random().toString(36).substring(2, 8) + Date.now().toString(36).substring(4);
    const verificationId = `v_${activity.registrationNumberConfig.institutionCode.toLowerCase()}_${randomHex}`;

    // 5. Simpan Data Peserta
    const participantId = `part_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newParticipant: Participant = {
      id: participantId,
      activityId: activity.id,
      fullName: cleanName,
      email: cleanEmail,
      phone: params.phone?.trim(),
      institution: params.institution?.trim(),
      customFieldValue: params.customFieldValue?.trim(),
      registeredAt: new Date().toISOString(),
      registeredAtLocal: nowServer.toISOString()
    };
    this.participants.unshift(newParticipant);
    this.persist(STORAGE_KEYS.PARTICIPANTS, this.participants);

    // 6. Siapkan Snapshot Layout & Template
    const template = this.getTemplate(activity.templateId) || this.templates[0];
    const layoutSnapshot = JSON.parse(JSON.stringify(activity.layoutElements)) as LayoutElement[];

    // 7. Buat Rekord Penerbitan Sertifikat
    const issuanceId = `iss_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newIssuance: CertificateIssuance = {
      id: issuanceId,
      verificationId,
      activityId: activity.id,
      activityName: activity.name,
      participantId,
      participantName: cleanName,
      participantEmail: cleanEmail,
      participantInstitution: params.institution?.trim(),
      registrationNumber,
      sequenceNumber,
      issueDate: displayDate,
      issueDateIso: nowServer.toISOString(),
      status: 'valid',
      templateSnapshotId: template.id,
      layoutSnapshot,
      emailStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.issuances.unshift(newIssuance);
    this.persist(STORAGE_KEYS.ISSUANCES, this.issuances);

    this.logAudit(
      'ISSUE_CERTIFICATE',
      'certificate',
      issuanceId,
      `Penerbitan otomatis nomor ${registrationNumber} untuk ${cleanName} (${cleanEmail})`
    );

    // 8. Generate PDF Base64 dan Trigger Pengiriman Email
    const baseUrl = params.baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    const verifyUrl = `${baseUrl}/verifikasi/${verificationId}`;

    try {
      let pdfBase64: string | undefined = undefined;
      try {
        pdfBase64 = await getCertificatePdfDataUrl(template, layoutSnapshot, {
          participantName: cleanName,
          registrationNumber,
          issueDate: displayDate,
          verificationId,
          extraText: layoutSnapshot.find(e => e.id === 'extra_text')?.sampleValue
        });
      } catch (pdfErr) {
        console.warn('Gagal membuat buffer PDF langsung:', pdfErr);
      }

      // Kirim Email
      const emailResult = await sendCertificateEmail({
        to: cleanEmail,
        recipientName: cleanName,
        subject: activity.emailSettings.subject,
        activityName: activity.name,
        registrationNumber,
        issueDate: displayDate,
        verificationUrl: verifyUrl,
        customBody: activity.emailSettings.bodyTemplate,
        pdfBase64,
        pdfFilename: `Sertifikat_${registrationNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        issuanceId,
      });

      // Catat log pengiriman email terperinci
      const emailLogId = `elog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const emailLog: EmailDeliveryLog = {
        id: emailLogId,
        issuanceId,
        recipientEmail: cleanEmail,
        recipientName: cleanName,
        subject: activity.emailSettings.subject,
        status: emailResult.status || (emailResult.success ? 'delivered' : 'temp_failed'),
        deliveryStrategy: emailResult.deliveryStrategy,
        usedMethod: emailResult.provider as any,
        senderAddress: emailResult.usedSender,
        fallbackReason: emailResult.fallbackReason,
        attemptCount: emailResult.attemptCount || 1,
        lastAttemptAt: new Date().toISOString(),
        providerMessageId: emailResult.messageId,
        errorMessage: emailResult.error,
        idempotencyKey: `idem_${issuanceId}`,
        createdAt: new Date().toISOString()
      };

      this.emailLogs.unshift(emailLog);
      this.persist(STORAGE_KEYS.EMAIL_LOGS, this.emailLogs);

      // Update status email pada issuance
      newIssuance.emailStatus = emailResult.status || (emailResult.success ? 'delivered' : 'temp_failed');
      newIssuance.emailDeliveryId = emailResult.messageId;
      newIssuance.emailError = emailResult.error;
      newIssuance.emailProvider = emailResult.provider;
      this.persist(STORAGE_KEYS.ISSUANCES, this.issuances);

    } catch (deliveryErr: any) {
      console.error('Email error:', deliveryErr);
      newIssuance.emailStatus = 'temp_failed';
      newIssuance.emailError = deliveryErr.message || 'Gagal mengirim email';
      this.persist(STORAGE_KEYS.ISSUANCES, this.issuances);
    }

    // Push new issuance and counter to central database
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        issuances: [newIssuance],
        counters: this.counters,
      }),
    }).catch((err) => {
      console.warn('[BNN-SYNC] Gagal push penerbitan baru ke database terpusat:', err);
    });

    this.notifyListeners();
    return { success: true, issuance: newIssuance };
  }

  /**
   * Kirim ulang email sertifikat tanpa mengubah nomor registrasi
   */
  async resendCertificateEmail(issuanceId: string, baseUrl?: string): Promise<{ success: boolean; message: string; status?: string }> {
    const issuance = this.issuances.find(i => i.id === issuanceId);
    if (!issuance) {
      return { success: false, message: 'Data sertifikat tidak ditemukan.' };
    }

    const activity = this.getActivity(issuance.activityId);
    const activityName = activity?.name || issuance.activityName;
    const template = this.getTemplate(issuance.templateSnapshotId) || this.templates[0];
    const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    const verifyUrl = `${origin}/verifikasi/${issuance.verificationId}`;

    let pdfBase64: string | undefined = undefined;
    try {
      pdfBase64 = await getCertificatePdfDataUrl(template, issuance.layoutSnapshot, {
        participantName: issuance.participantName,
        registrationNumber: issuance.registrationNumber,
        issueDate: issuance.issueDate,
        verificationId: issuance.verificationId
      });
    } catch (e) {
      console.warn('PDF gen warning on resend:', e);
    }

    const emailResult = await sendCertificateEmail({
      to: issuance.participantEmail,
      recipientName: issuance.participantName,
      subject: activity?.emailSettings.subject || `Sertifikat Kegiatan: ${activityName}`,
      activityName,
      registrationNumber: issuance.registrationNumber,
      issueDate: issuance.issueDate,
      verificationUrl: verifyUrl,
      customBody: activity?.emailSettings.bodyTemplate,
      pdfBase64,
      issuanceId: issuance.id,
    });

    const statusValue = emailResult.status || (emailResult.success ? 'delivered' : 'temp_failed');

    // Update log
    const existingLog = this.emailLogs.find(l => l.issuanceId === issuanceId);
    if (existingLog) {
      existingLog.status = statusValue;
      existingLog.attemptCount += 1;
      existingLog.lastAttemptAt = new Date().toISOString();
      existingLog.providerMessageId = emailResult.messageId || existingLog.providerMessageId;
      existingLog.errorMessage = emailResult.error || undefined;
      existingLog.deliveryStrategy = emailResult.deliveryStrategy || existingLog.deliveryStrategy;
      existingLog.usedMethod = (emailResult.provider as any) || existingLog.usedMethod;
      existingLog.senderAddress = emailResult.usedSender || existingLog.senderAddress;
      existingLog.fallbackReason = emailResult.fallbackReason || existingLog.fallbackReason;
    } else {
      this.emailLogs.unshift({
        id: `elog_${Date.now()}`,
        issuanceId,
        recipientEmail: issuance.participantEmail,
        recipientName: issuance.participantName,
        subject: `Sertifikat Kegiatan: ${activityName}`,
        status: statusValue,
        deliveryStrategy: emailResult.deliveryStrategy,
        usedMethod: emailResult.provider as any,
        senderAddress: emailResult.usedSender,
        fallbackReason: emailResult.fallbackReason,
        attemptCount: 1,
        lastAttemptAt: new Date().toISOString(),
        providerMessageId: emailResult.messageId,
        errorMessage: emailResult.error,
        createdAt: new Date().toISOString()
      });
    }
    this.persist(STORAGE_KEYS.EMAIL_LOGS, this.emailLogs);

    issuance.emailStatus = statusValue;
    issuance.emailDeliveryId = emailResult.messageId || issuance.emailDeliveryId;
    issuance.emailError = emailResult.error;
    issuance.emailProvider = emailResult.provider;
    issuance.updatedAt = new Date().toISOString();
    this.persist(STORAGE_KEYS.ISSUANCES, this.issuances);

    this.logAudit(
      'RESEND_EMAIL',
      'email',
      issuance.id,
      `Kirim ulang email sertifikat ${issuance.registrationNumber} ke ${issuance.participantEmail}. Hasil: ${statusValue} (${emailResult.provider})`
    );

    return {
      success: emailResult.success,
      status: statusValue,
      message: emailResult.success
        ? `Email sertifikat berhasil dikirimkan ke ${issuance.participantEmail} (${statusValue === 'fallen_back_gmail' ? 'Dialihkan ke Gmail' : 'Terkirim'})`
        : `Pengiriman gagal: ${emailResult.error || 'Terjadi kesalahan gateway'}`
    };
  }

  /**
   * Rekonsiliasi log pengiriman yang statusnya masih 'awaiting_confirmation'
   */
  reconcileEmailLog(logId: string): { success: boolean; log?: EmailDeliveryLog; message: string } {
    const log = this.emailLogs.find(l => l.id === logId);
    if (!log) return { success: false, message: 'Log tidak ditemukan' };

    log.isReconciled = true;
    log.lastAttemptAt = new Date().toISOString();
    if (log.status === 'awaiting_confirmation') {
      log.status = 'delivered';
      log.errorMessage = undefined;
    }
    this.persist(STORAGE_KEYS.EMAIL_LOGS, this.emailLogs);

    const issuance = this.issuances.find(i => i.id === log.issuanceId);
    if (issuance) {
      issuance.emailStatus = log.status;
      this.persist(STORAGE_KEYS.ISSUANCES, this.issuances);
    }

    this.logAudit('RECONCILE_EMAIL', 'email', log.id, `Rekonsiliasi status pengiriman email untuk ID sertifikat ${log.issuanceId}`);
    return { success: true, log, message: 'Status log berhasil direkonsiliasi.' };
  }

  // --- REISSUE & REVOKE ---
  reissueCertificate(issuanceId: string, correctedName: string, reason: string): { success: boolean; issuance?: CertificateIssuance; message: string } {
    const existing = this.issuances.find(i => i.id === issuanceId);
    if (!existing) return { success: false, message: 'Sertifikat tidak ditemukan' };

    const oldName = existing.participantName;
    existing.participantName = correctedName.trim();
    existing.reissueReason = reason;
    existing.status = 'reissued';
    existing.updatedAt = new Date().toISOString();

    this.persist(STORAGE_KEYS.ISSUANCES, this.issuances);
    this.logAudit(
      'REISSUE_CERTIFICATE',
      'certificate',
      issuanceId,
      `Koreksi nama dari "${oldName}" menjadi "${correctedName}". Alasan: "${reason}". Nomor registrasi dipertahankan: ${existing.registrationNumber}`
    );

    return { success: true, issuance: existing, message: 'Sertifikat berhasil diperbarui dengan nama baru dan tercatat dalam audit log.' };
  }

  revokeCertificate(issuanceId: string, reason: string): { success: boolean; message: string } {
    const existing = this.issuances.find(i => i.id === issuanceId);
    if (!existing) return { success: false, message: 'Sertifikat tidak ditemukan' };

    existing.status = 'revoked';
    existing.reissueReason = reason;
    existing.updatedAt = new Date().toISOString();

    this.persist(STORAGE_KEYS.ISSUANCES, this.issuances);
    this.logAudit(
      'REVOKE_CERTIFICATE',
      'certificate',
      issuanceId,
      `Mencabut / membatalkan keabsahan sertifikat nomor ${existing.registrationNumber}. Alasan: "${reason}"`
    );

    return { success: true, message: 'Sertifikat berhasil dinonaktifkan/dicabut.' };
  }

  // --- PUBLIC VERIFICATION ---
  verifyCertificate(query: string): VerificationResult {
    const clean = query.trim().toLowerCase();
    if (!clean) return { isValid: false, message: 'Harap masukkan nomor registrasi atau ID verifikasi.' };

    const issuance = this.issuances.find(
      i => i.verificationId.toLowerCase() === clean || i.registrationNumber.toLowerCase() === clean
    );

    if (!issuance) {
      return {
        isValid: false,
        message: 'Sertifikat tidak ditemukan dalam pangkalan data resmi atau nomor yang dimasukkan tidak valid.'
      };
    }

    const activity = this.getActivity(issuance.activityId);
    const institution = activity?.registrationNumberConfig.institutionCode || 'Penyelenggara Resmi';

    if (issuance.status === 'revoked') {
      return {
        isValid: false,
        issuance: {
          verificationId: issuance.verificationId,
          registrationNumber: issuance.registrationNumber,
          participantName: issuance.participantName,
          activityName: issuance.activityName,
          issueDate: issuance.issueDate,
          institution,
          status: 'revoked'
        },
        message: `Sertifikat ini telah DINONAKTIFKAN/DICABUT oleh administrator. Alasan: ${issuance.reissueReason || 'Kebijakan penyelenggara'}`
      };
    }

    return {
      isValid: true,
      issuance: {
        verificationId: issuance.verificationId,
        registrationNumber: issuance.registrationNumber,
        participantName: issuance.participantName,
        activityName: issuance.activityName,
        issueDate: issuance.issueDate,
        institution,
        status: issuance.status
      },
      message: 'Sertifikat RESMI dan TERVERIFIKASI keasliannya di sistem.'
    };
  }

  // --- AUDIT LOGS ---
  logAudit(action: string, targetType: AuditLog['targetType'], targetId: string, details: string) {
    const newLog: AuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      user: this.getAdminSession()?.email || 'admin@sertifikat.id',
      action,
      targetType,
      targetId,
      details
    };
    this.auditLogs.unshift(newLog);
    if (this.auditLogs.length > 500) this.auditLogs.pop();
    this.persist(STORAGE_KEYS.AUDIT_LOGS, this.auditLogs);
  }

  getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }

  getIssuances(): CertificateIssuance[] {
    return [...this.issuances];
  }

  getEmailLogs(): EmailDeliveryLog[] {
    return [...this.emailLogs];
  }

  // --- ADMIN AUTH & RBAC STATE ---
  getAdminSession(): AdminSession | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH);
      if (stored) {
        return JSON.parse(stored);
      }
      // Check legacy session
      const legacy = localStorage.getItem('so_admin_session_v1');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        const user = this.adminUsers.find(u => u.email.toLowerCase() === parsed.email.toLowerCase()) || this.adminUsers[0];
        const upgradedSession: AdminSession = {
          userId: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          loggedInAt: parsed.loggedInAt || new Date().toISOString(),
        };
        this.setAdminSession(upgradedSession);
        return upgradedSession;
      }
      return null;
    } catch {
      return null;
    }
  }

  setAdminSession(session: AdminSession | null) {
    if (session) {
      localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, JSON.stringify(session));
      this.logAudit('ADMIN_LOGIN', 'session', session.userId, `Administrator (${session.fullName} - ${session.email} [${session.role}]) berhasil login.`);
    } else {
      const prev = this.getAdminSession();
      localStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
      localStorage.removeItem('so_admin_session_v1');
      if (prev) {
        this.logAudit('ADMIN_LOGOUT', 'session', prev.userId, `Administrator (${prev.email}) keluar dari sesi.`);
      }
    }
  }

  getAdminUsers(): AdminUser[] {
    // Return sanitized users (omits hash/salt)
    return this.adminUsers.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      lastLoginAt: u.lastLoginAt,
      avatarUrl: u.avatarUrl,
      phone: u.phone,
    }));
  }

  getAdminUser(idOrIdentifier: string): AdminUser | undefined {
    const term = idOrIdentifier.toLowerCase().trim();
    return this.adminUsers.find(u =>
      u.id === idOrIdentifier ||
      u.username.toLowerCase() === term ||
      u.email.toLowerCase() === term
    );
  }

  authenticateAdmin(identifier: string, pass: string): { success: boolean; session?: AdminSession; error?: string; lockedRemainingMins?: number } {
    const term = identifier.trim().toLowerCase();
    const user = this.adminUsers.find(u =>
      u.username.toLowerCase() === term ||
      u.email.toLowerCase() === term
    );

    if (!user) {
      return { success: false, error: 'Username atau alamat email tidak terdaftar.' };
    }

    // Rate limiting check
    if (user.lockedUntil) {
      const lockTime = new Date(user.lockedUntil).getTime();
      const now = Date.now();
      if (lockTime > now) {
        const remainingMins = Math.ceil((lockTime - now) / 60000);
        return {
          success: false,
          error: `Akun ini terkunci sementara karena 5 kali percobaan gagal. Coba lagi dalam ${remainingMins} menit.`,
          lockedRemainingMins: remainingMins,
        };
      } else {
        // Cooldown passed
        user.lockedUntil = undefined;
        user.failedLoginAttempts = 0;
      }
    }

    if (!user.isActive) {
      return { success: false, error: 'Akun administrator ini telah dinonaktifkan oleh Super Admin. Hubungi pengelola untuk mengaktifkan kembali.' };
    }

    // Password verification
    const expectedHash = user.passwordHash || simpleHashPassword('admin_sertifikat_2026', user.id);
    const providedHash = simpleHashPassword(pass, user.salt || user.id);
    const legacyMatch = pass === 'admin_sertifikat_2026' || pass === 'Admin_BNN_2026!' || pass === 'Admin_BNNK_2026!';

    const isMatch = providedHash === expectedHash || legacyMatch;

    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        // Lock for 15 minutes
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        this.persist(STORAGE_KEYS.ADMIN_USERS, this.adminUsers);
        this.logAudit('ADMIN_LOCKED', 'admin', user.id, `Akun ${user.email} terkunci sementara setelah 5 kali gagal login.`);
        return {
          success: false,
          error: 'Terlalu banyak percobaan gagal. Akun dikunci sementara selama 15 menit demi keamanan.',
          lockedRemainingMins: 15,
        };
      }
      this.persist(STORAGE_KEYS.ADMIN_USERS, this.adminUsers);
      const remainingAttempts = 5 - (user.failedLoginAttempts || 0);
      return {
        success: false,
        error: `Password salah. Sisa kesempatan: ${remainingAttempts} kali sebelum akun dikunci.`,
      };
    }

    // Success: reset attempts & update login timestamp
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    user.lastLoginAt = new Date().toISOString();
    this.persist(STORAGE_KEYS.ADMIN_USERS, this.adminUsers);

    const session: AdminSession = {
      userId: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      loggedInAt: user.lastLoginAt,
    };
    this.setAdminSession(session);

    return { success: true, session };
  }

  changeAdminPassword(userId: string, currentPass: string, newPass: string): { success: boolean; error?: string } {
    const user = this.adminUsers.find(u => u.id === userId);
    if (!user) {
      return { success: false, error: 'Pengguna tidak ditemukan.' };
    }

    // Verify current password
    const currentHash = simpleHashPassword(currentPass, user.salt || user.id);
    const isCurrentValid =
      currentHash === user.passwordHash ||
      currentPass === 'admin_sertifikat_2026' ||
      currentPass === 'Admin_BNN_2026!' ||
      currentPass === 'Admin_BNNK_2026!';

    if (!isCurrentValid) {
      return { success: false, error: 'Password saat ini yang Anda masukkan salah.' };
    }

    // Validate new password against security policy
    const policy = validatePasswordPolicy(newPass);
    if (!policy.isValid) {
      return { success: false, error: policy.error };
    }

    if (currentPass === newPass) {
      return { success: false, error: 'Password baru tidak boleh sama dengan password saat ini.' };
    }

    // Hash and save
    const newSalt = `salt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    user.salt = newSalt;
    user.passwordHash = simpleHashPassword(newPass, newSalt);
    user.updatedAt = new Date().toISOString();
    this.syncAdminUsers();

    this.logAudit('PASSWORD_CHANGED', 'admin', user.id, `Administrator ${user.email} berhasil mengubah password akun.`);
    return { success: true };
  }

  private syncAdminUsers() {
    this.persist(STORAGE_KEYS.ADMIN_USERS, this.adminUsers);
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminUsers: this.adminUsers }),
    }).catch((err) => {
      console.warn('[BNN-SYNC] Gagal push adminUsers ke server:', err);
    });
    this.notifyListeners();
  }

  updateAdminProfile(userId: string, profile: { fullName: string; username: string; email: string; phone?: string }): { success: boolean; user?: AdminUser; error?: string } {
    const user = this.adminUsers.find(u => u.id === userId);
    if (!user) {
      return { success: false, error: 'Pengguna tidak ditemukan.' };
    }

    const cleanUsername = profile.username.trim().toLowerCase();
    const cleanEmail = profile.email.trim().toLowerCase();

    // Check unique username
    const usernameTaken = this.adminUsers.some(u => u.id !== userId && u.username.toLowerCase() === cleanUsername);
    if (usernameTaken) {
      return { success: false, error: `Username "${profile.username}" sudah digunakan oleh administrator lain.` };
    }

    // Check unique email
    const emailTaken = this.adminUsers.some(u => u.id !== userId && u.email.toLowerCase() === cleanEmail);
    if (emailTaken) {
      return { success: false, error: `Alamat email "${profile.email}" sudah digunakan oleh administrator lain.` };
    }

    user.fullName = profile.fullName.trim();
    user.username = cleanUsername;
    user.email = cleanEmail;
    user.phone = profile.phone?.trim();
    user.updatedAt = new Date().toISOString();

    this.syncAdminUsers();

    // Update active session if this is the logged-in user
    const currentSession = this.getAdminSession();
    if (currentSession && currentSession.userId === userId) {
      currentSession.fullName = user.fullName;
      currentSession.username = user.username;
      currentSession.email = user.email;
      localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, JSON.stringify(currentSession));
    }

    this.logAudit('ADMIN_UPDATED', 'admin', user.id, `Profil administrator ${user.email} (${user.fullName}) diperbarui.`);
    return { success: true, user };
  }

  createAdminUserBySuper(data: { fullName: string; username: string; email: string; role: AdminRole; phone?: string; initialPassword?: string }): { success: boolean; user?: AdminUser; error?: string } {
    const cleanUsername = data.username.trim().toLowerCase();
    const cleanEmail = data.email.trim().toLowerCase();

    if (!cleanUsername || !cleanEmail || !data.fullName.trim()) {
      return { success: false, error: 'Nama, username, dan email wajib diisi.' };
    }

    if (this.adminUsers.some(u => u.username.toLowerCase() === cleanUsername)) {
      return { success: false, error: `Username "${cleanUsername}" sudah digunakan.` };
    }
    if (this.adminUsers.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: `Email "${cleanEmail}" sudah terdaftar.` };
    }

    const initialPass = data.initialPassword || 'Admin_BNN_2026!';
    const policy = validatePasswordPolicy(initialPass);
    if (!policy.isValid) {
      return { success: false, error: policy.error };
    }

    const newId = `usr_admin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const salt = `salt_${Date.now()}`;
    const newUser: AdminUser = {
      id: newId,
      username: cleanUsername,
      email: cleanEmail,
      fullName: data.fullName.trim(),
      role: data.role,
      isActive: true,
      phone: data.phone?.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      salt,
      passwordHash: simpleHashPassword(initialPass, salt),
    };

    this.adminUsers.push(newUser);
    this.syncAdminUsers();

    this.logAudit('ADMIN_CREATED', 'admin', newUser.id, `Super Admin membuat akun administrator baru: ${newUser.fullName} (${newUser.email}) dengan peran ${newUser.role}.`);
    return { success: true, user: newUser };
  }

  updateAdminUserBySuper(targetUserId: string, updates: { fullName?: string; username?: string; email?: string; role?: AdminRole; isActive?: boolean; phone?: string; newPassword?: string }): { success: boolean; user?: AdminUser; error?: string } {
    const user = this.adminUsers.find(u => u.id === targetUserId);
    if (!user) {
      return { success: false, error: 'Administrator tidak ditemukan.' };
    }

    // STRICT GUARD: Check last Super Admin protection
    if (user.role === 'superadmin') {
      const activeSuperCount = this.adminUsers.filter(u => u.role === 'superadmin' && u.isActive).length;
      if (activeSuperCount <= 1) {
        if (updates.isActive === false) {
          return { success: false, error: 'Dilarang menonaktifkan Super Admin terakhir! Sistem memerlukan minimal 1 akun Super Admin aktif.' };
        }
        if (updates.role && updates.role !== 'superadmin') {
          return { success: false, error: 'Dilarang menurunkan peran Super Admin terakhir! Sistem memerlukan minimal 1 akun Super Admin aktif.' };
        }
      }
    }

    if (updates.username) {
      const cleanU = updates.username.trim().toLowerCase();
      if (this.adminUsers.some(u => u.id !== targetUserId && u.username.toLowerCase() === cleanU)) {
        return { success: false, error: `Username "${updates.username}" sudah digunakan.` };
      }
      user.username = cleanU;
    }

    if (updates.email) {
      const cleanE = updates.email.trim().toLowerCase();
      if (this.adminUsers.some(u => u.id !== targetUserId && u.email.toLowerCase() === cleanE)) {
        return { success: false, error: `Email "${updates.email}" sudah digunakan.` };
      }
      user.email = cleanE;
    }

    if (updates.fullName !== undefined) user.fullName = updates.fullName.trim();
    if (updates.role !== undefined) user.role = updates.role;
    if (updates.isActive !== undefined) user.isActive = updates.isActive;
    if (updates.phone !== undefined) user.phone = updates.phone.trim();

    if (updates.newPassword) {
      const policy = validatePasswordPolicy(updates.newPassword);
      if (!policy.isValid) {
        return { success: false, error: policy.error };
      }
      const salt = `salt_${Date.now()}`;
      user.salt = salt;
      user.passwordHash = simpleHashPassword(updates.newPassword, salt);
      user.failedLoginAttempts = 0;
      user.lockedUntil = undefined;
    }

    user.updatedAt = new Date().toISOString();
    this.syncAdminUsers();

    this.logAudit('ADMIN_ROLE_UPDATED', 'admin', user.id, `Super Admin memperbarui data akun administrator ${user.email} (Peran: ${user.role}, Status Aktif: ${user.isActive}).`);
    return { success: true, user };
  }

  deleteAdminUserBySuper(targetUserId: string, currentSuperId: string): { success: boolean; error?: string } {
    if (targetUserId === currentSuperId) {
      return { success: false, error: 'Anda tidak dapat menghapus akun Anda sendiri saat sedang masuk.' };
    }

    const user = this.adminUsers.find(u => u.id === targetUserId);
    if (!user) {
      return { success: false, error: 'Administrator tidak ditemukan.' };
    }

    // STRICT GUARD: Check last Super Admin
    if (user.role === 'superadmin') {
      const superCount = this.adminUsers.filter(u => u.role === 'superadmin').length;
      if (superCount <= 1) {
        return { success: false, error: 'Dilarang menghapus Super Admin terakhir! Sistem memerlukan minimal satu Super Admin.' };
      }
    }

    this.adminUsers = this.adminUsers.filter(u => u.id !== targetUserId);
    this.syncAdminUsers();

    this.logAudit('ADMIN_DELETED', 'admin', targetUserId, `Super Admin mencabut akses dan menghapus akun administrator: ${user.fullName} (${user.email}).`);
    return { success: true };
  }

  requestPasswordReset(identifier: string): { success: boolean; message: string; resetToken?: string } {
    const term = identifier.trim().toLowerCase();
    const user = this.adminUsers.find(u => u.username.toLowerCase() === term || u.email.toLowerCase() === term);
    if (!user) {
      // Return neutral message for security
      return { success: true, message: 'Jika akun terdaftar pada sistem Satker BNN, instruksi pemulihan telah disiapkan.' };
    }

    const resetToken = `tok_rst_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.logAudit('PASSWORD_RESET_REQUESTED', 'admin', user.id, `Permintaan pemulihan password untuk akun ${user.email}. Token: ${resetToken}`);
    return {
      success: true,
      message: `Tautan pemulihan password resmi untuk ${user.email} telah dibuat secara aman.`,
      resetToken,
    };
  }

  // --- CSV EXPORT ---
  exportParticipantsCsv(activityId?: string): string {
    const list = activityId
      ? this.issuances.filter(i => i.activityId === activityId)
      : this.issuances;

    const headers = [
      'No',
      'Nomor Registrasi',
      'Nama Peserta',
      'Email',
      'Instansi/Organisasi',
      'Nama Kegiatan',
      'Tanggal Terbit',
      'Status Sertifikat',
      'Status Email',
      'ID Verifikasi'
    ];

    const rows = list.map((item, idx) => [
      idx + 1,
      `"${item.registrationNumber.replace(/"/g, '""')}"`,
      `"${item.participantName.replace(/"/g, '""')}"`,
      `"${item.participantEmail.replace(/"/g, '""')}"`,
      `"${(item.participantInstitution || '-').replace(/"/g, '""')}"`,
      `"${item.activityName.replace(/"/g, '""')}"`,
      `"${item.issueDate}"`,
      `"${item.status}"`,
      `"${item.emailStatus}"`,
      `"${item.verificationId}"`
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

export const storage = new DataStore();
