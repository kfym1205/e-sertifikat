import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  INITIAL_ACTIVITIES,
  INITIAL_AUDIT_LOGS,
  INITIAL_CLASSIFICATIONS,
  INITIAL_ISSUANCES,
  INITIAL_TEMPLATES,
} from '../data/initialData';
import { DEFAULT_APPEARANCE_CONFIG } from '../data/bnnAppearance';

export interface CentralDatabaseData {
  appearance: any;
  activities: any[];
  templates: any[];
  classifications: any[];
  issuances: any[];
  counters: Record<string, any>;
  auditLogs: any[];
  adminUsers: any[];
  updatedAt: string;
  version: number;
}

// Check for Supabase configuration
const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  '';

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const isSupabaseConfigured =
  Boolean(supabaseUrl && supabaseKey) &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseKey.includes('your-anon-key');

let supabaseClient: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
    console.log('[BNN-DB] Terhubung ke Supabase Cloud PostgreSQL:', supabaseUrl);
  } catch (err: any) {
    console.warn('[BNN-DB] Gagal menginisialisasi client Supabase, menggunakan penyimpanan file persisten:', err?.message);
    supabaseClient = null;
  }
}

// Persistent File Store Location
function getStoreFilePath(): string {
  const localDir = path.resolve(process.cwd(), 'data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return path.join(localDir, 'app_storage.json');
  } catch {
    // Fallback for restricted / serverless runtime
    const tmpDir = '/tmp';
    return path.join(tmpDir, 'bnn_app_storage.json');
  }
}

function getInitialStore(): CentralDatabaseData {
  return {
    appearance: DEFAULT_APPEARANCE_CONFIG,
    activities: INITIAL_ACTIVITIES,
    templates: INITIAL_TEMPLATES,
    classifications: INITIAL_CLASSIFICATIONS,
    issuances: INITIAL_ISSUANCES,
    counters: {
      activity_act_bnnk_relawan_2026: {
        id: 'c1',
        scopeKey: 'activity_act_bnnk_relawan_2026',
        lastNumber: 2,
        lastYear: 2026,
        lastMonth: 10,
        updatedAt: new Date().toISOString(),
      },
      activity_act_kominfo_digital_2026: {
        id: 'c2',
        scopeKey: 'activity_act_kominfo_digital_2026',
        lastNumber: 1,
        lastYear: 2026,
        lastMonth: 10,
        updatedAt: new Date().toISOString(),
      },
    },
    auditLogs: INITIAL_AUDIT_LOGS,
    adminUsers: [],
    updatedAt: new Date().toISOString(),
    version: 1,
  };
}

// Global In-Memory Cache backed by File
let memoryStore: CentralDatabaseData | null = null;

function mergeAppearance(base: any, incoming: any): any {
  const merged = {
    ...DEFAULT_APPEARANCE_CONFIG,
    ...(base || {}),
    ...(incoming || {}),
  };
  merged.footer = {
    ...DEFAULT_APPEARANCE_CONFIG.footer,
    ...(base?.footer || {}),
    ...(incoming?.footer || {}),
  };
  merged.theme = {
    ...DEFAULT_APPEARANCE_CONFIG.theme,
    ...(base?.theme || {}),
    ...(incoming?.theme || {}),
  };
  if (merged.showOnPublic === undefined) merged.showOnPublic = true;
  if (merged.showOnAdmin === undefined) merged.showOnAdmin = true;
  return merged;
}

function loadFromFile(readOnly = false): CentralDatabaseData {
  if (memoryStore) return memoryStore;
  const filePath = getStoreFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (raw.trim()) {
        const parsed = JSON.parse(raw);
        memoryStore = {
          appearance: mergeAppearance(DEFAULT_APPEARANCE_CONFIG, parsed.appearance),
          activities: Array.isArray(parsed.activities) ? parsed.activities : INITIAL_ACTIVITIES,
          templates: Array.isArray(parsed.templates) ? parsed.templates : INITIAL_TEMPLATES,
          classifications: Array.isArray(parsed.classifications) ? parsed.classifications : INITIAL_CLASSIFICATIONS,
          issuances: Array.isArray(parsed.issuances) ? parsed.issuances : INITIAL_ISSUANCES,
          counters: parsed.counters || {},
          auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : INITIAL_AUDIT_LOGS,
          adminUsers: Array.isArray(parsed.adminUsers) ? parsed.adminUsers : [],
          updatedAt: parsed.updatedAt || new Date().toISOString(),
          version: parsed.version || 1,
        };
        return memoryStore;
      }
    }
  } catch (err) {
    console.warn('[BNN-DB] Kendala saat membaca penyimpanan file, menginisialisasi data awal:', err);
  }

  memoryStore = getInitialStore();
  if (!readOnly) {
    saveToFile(memoryStore);
  }
  return memoryStore;
}

function saveToFile(data: CentralDatabaseData) {
  memoryStore = data;
  const filePath = getStoreFilePath();
  try {
    const tmpPath = `${filePath}.tmp_${Date.now()}`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    console.warn('[BNN-DB] Peringatan saat menulis ke file database:', err);
  }
}

export class CentralDatabase {
  static isUsingSupabase(): boolean {
    return Boolean(supabaseClient);
  }

  static getStatus() {
    let host: string | undefined;
    if (isSupabaseConfigured && supabaseUrl) {
      try {
        host = new URL(supabaseUrl).host;
      } catch {
        host = 'configured';
      }
    }

    const store = memoryStore || loadFromFile(true);
    return {
      provider: supabaseClient ? 'supabase_postgresql' : 'persistent_server_storage',
      isSupabaseActive: Boolean(supabaseClient),
      supabaseConfigured: isSupabaseConfigured,
      supabaseHost: host,
      storageFile: getStoreFilePath(),
      updatedAt: store.updatedAt,
      activitiesCount: store.activities.length,
      templatesCount: store.templates.length,
      issuancesCount: store.issuances.length,
      notes: supabaseClient
        ? 'Database cloud Supabase PostgreSQL aktif sebagai sumber data bersama.'
        : 'Penyimpanan persisten server aktif (fallback). Untuk menghubungkan Supabase Cloud PostgreSQL, atur SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di Environment Variables Vercel.',
    };
  }

  /**
   * Diagnostik asinkron dengan verifikasi konektivitas nyata tanpa mengubah data produksi
   */
  static async checkStatus() {
    let connectionHealthy = true;
    let connectionError: string | undefined;

    if (supabaseClient) {
      try {
        const { error } = await supabaseClient.from('activities').select('id').limit(1);
        if (error) {
          connectionHealthy = false;
          connectionError = error.message;
        }
      } catch (err: any) {
        connectionHealthy = false;
        connectionError = err?.message || 'Connection failure';
      }
    }

    const baseStatus = this.getStatus();
    return {
      ...baseStatus,
      connectionStatus: supabaseClient
        ? (connectionHealthy ? 'connected' : 'connection_error')
        : 'fallback_file_storage',
      connectionHealthy,
      connectionError,
      notes: supabaseClient
        ? (connectionHealthy
            ? 'Database cloud Supabase PostgreSQL aktif dan terhubung normal sebagai sumber data bersama.'
            : `Kredensial Supabase terkonfigurasi tetapi koneksi gagal: ${connectionError}`)
        : 'Penyimpanan persisten server aktif (fallback). Untuk menghubungkan Supabase Cloud PostgreSQL, atur SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di Environment Variables Vercel.',
    };
  }

  /**
   * Mengambil seluruh data bersama untuk sinkronisasi perangkat klien
   */
  static async getAllData(): Promise<CentralDatabaseData> {
    const fileData = loadFromFile();

    // If Supabase is active, fetch latest from Supabase tables
    if (supabaseClient) {
      try {
        const [
          { data: activities },
          { data: templates },
          { data: classifications },
          { data: issuances },
          { data: auditLogs },
        ] = await Promise.all([
          supabaseClient.from('activities').select('*'),
          supabaseClient.from('certificate_templates').select('*'),
          supabaseClient.from('classification_codes').select('*'),
          supabaseClient.from('certificate_issuances').select('*').limit(500),
          supabaseClient.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(200),
        ]);

        if (activities && activities.length > 0) fileData.activities = activities;
        if (templates && templates.length > 0) fileData.templates = templates;
        if (classifications && classifications.length > 0) fileData.classifications = classifications;
        if (issuances && issuances.length > 0) fileData.issuances = issuances;
        if (auditLogs && auditLogs.length > 0) fileData.auditLogs = auditLogs;
      } catch (err) {
        console.warn('[BNN-DB] Gagal query Supabase, menggunakan data penyimpanan persisten:', err);
      }
    }

    return fileData;
  }

  /**
   * Mengambil konfigurasi identitas visual & tema
   */
  static async getAppearance(): Promise<any> {
    const store = loadFromFile();
    return store.appearance || DEFAULT_APPEARANCE_CONFIG;
  }

  /**
   * Menyimpan konfigurasi identitas visual, logo, dan tema
   */
  static async saveAppearance(config: any): Promise<any> {
    const store = loadFromFile();
    store.appearance = mergeAppearance(store.appearance, {
      ...config,
      updatedAt: new Date().toISOString(),
    });
    store.updatedAt = new Date().toISOString();
    store.version += 1;
    saveToFile(store);

    if (supabaseClient) {
      try {
        await supabaseClient.from('appearance_config').upsert({
          id: 'default_appearance',
          config: store.appearance,
          updated_at: store.updatedAt,
        });
      } catch (e) {
        // Table might not exist yet, file storage guarantees persistence
      }
    }

    return store.appearance;
  }

  /**
   * Menyimpan atau memperbarui kegiatan beserta tata letak sertifikat
   */
  static async saveActivity(activity: any): Promise<any> {
    const store = loadFromFile();
    const idx = store.activities.findIndex((a) => a.id === activity.id);
    const updated = {
      ...activity,
      updatedAt: new Date().toISOString(),
    };

    if (idx >= 0) {
      store.activities[idx] = updated;
    } else {
      store.activities.unshift(updated);
    }

    store.updatedAt = new Date().toISOString();
    store.version += 1;
    saveToFile(store);

    if (supabaseClient) {
      try {
        await supabaseClient.from('activities').upsert({
          id: updated.id,
          slug: updated.slug,
          name: updated.name,
          description: updated.description,
          certificate_type: updated.certificateType || 'Sertifikat',
          template_id: updated.templateId,
          start_date: updated.startDate,
          end_date: updated.endDate,
          is_active: updated.isActive !== false,
          is_archived: Boolean(updated.isArchived),
          duplicate_policy: updated.duplicatePolicy || 'disallow',
          date_mode: updated.dateMode || 'server_today',
          manual_date: updated.manualDate,
          timezone: updated.timezone || 'Asia/Makassar',
          layout_elements: updated.layoutElements || [],
          registration_number_config: updated.registrationNumberConfig || {},
          form_settings: updated.formSettings || {},
          email_settings: updated.emailSettings || {},
          updated_at: updated.updatedAt,
        });
      } catch (err) {
        console.warn('[BNN-DB] Gagal upsert activity ke Supabase:', err);
      }
    }

    return updated;
  }

  /**
   * Menghapus kegiatan
   */
  static async deleteActivity(id: string): Promise<boolean> {
    const store = loadFromFile();
    store.activities = store.activities.filter((a) => a.id !== id);
    store.updatedAt = new Date().toISOString();
    store.version += 1;
    saveToFile(store);

    if (supabaseClient) {
      try {
        await supabaseClient.from('activities').delete().eq('id', id);
      } catch {}
    }

    return true;
  }

  /**
   * Menyimpan template sertifikat
   */
  static async saveTemplate(template: any): Promise<any> {
    const store = loadFromFile();
    const idx = store.templates.findIndex((t) => t.id === template.id);
    const updated = {
      ...template,
      version: (template.version || 1) + (idx >= 0 ? 1 : 0),
      updatedAt: new Date().toISOString(),
    };

    if (idx >= 0) {
      store.templates[idx] = updated;
    } else {
      store.templates.unshift(updated);
    }

    store.updatedAt = new Date().toISOString();
    store.version += 1;
    saveToFile(store);

    if (supabaseClient) {
      try {
        await supabaseClient.from('certificate_templates').upsert({
          id: updated.id,
          name: updated.name,
          orientation: updated.orientation || 'landscape',
          bg_image_url: updated.bgImageUrl,
          width_mm: updated.widthMm || 297,
          height_mm: updated.heightMm || 210,
          version: updated.version,
          is_default: Boolean(updated.isDefault),
          updated_at: updated.updatedAt,
        });
      } catch (err) {
        console.warn('[BNN-DB] Gagal upsert template ke Supabase:', err);
      }
    }

    return updated;
  }

  /**
   * Menghapus template sertifikat
   */
  static async deleteTemplate(id: string): Promise<boolean> {
    const store = loadFromFile();
    store.templates = store.templates.filter((t) => t.id !== id);
    store.updatedAt = new Date().toISOString();
    store.version += 1;
    saveToFile(store);

    if (supabaseClient) {
      try {
        await supabaseClient.from('certificate_templates').delete().eq('id', id);
      } catch {}
    }

    return true;
  }

  /**
   * Menyimpan kode klasifikasi
   */
  static async saveClassification(cls: any): Promise<any> {
    const store = loadFromFile();
    const idx = store.classifications.findIndex((c) => c.id === cls.id);
    if (idx >= 0) {
      store.classifications[idx] = cls;
    } else {
      store.classifications.push(cls);
    }
    store.updatedAt = new Date().toISOString();
    saveToFile(store);

    if (supabaseClient) {
      try {
        await supabaseClient.from('classification_codes').upsert({
          id: cls.id,
          code: cls.code,
          name: cls.name,
          description: cls.description,
          is_active: cls.isActive !== false,
          updated_at: new Date().toISOString(),
        });
      } catch {}
    }

    return cls;
  }

  /**
   * Menyimpan penerbitan sertifikat baru
   */
  static async saveIssuance(issuance: any): Promise<any> {
    const store = loadFromFile();
    const idx = store.issuances.findIndex((i) => i.id === issuance.id);
    if (idx >= 0) {
      store.issuances[idx] = issuance;
    } else {
      store.issuances.unshift(issuance);
    }
    store.updatedAt = new Date().toISOString();
    saveToFile(store);

    if (supabaseClient) {
      try {
        await supabaseClient.from('certificate_issuances').upsert({
          id: issuance.id,
          verification_id: issuance.verificationId,
          activity_id: issuance.activityId,
          activity_name: issuance.activityName,
          participant_name: issuance.participantName,
          participant_email: issuance.participantEmail,
          participant_institution: issuance.participantInstitution,
          registration_number: issuance.registrationNumber,
          sequence_number: issuance.sequenceNumber || 1,
          issue_date: issuance.issueDate,
          issue_date_iso: issuance.issueDateIso || new Date().toISOString(),
          status: issuance.status || 'valid',
          template_snapshot_id: issuance.templateSnapshotId,
          layout_snapshot: issuance.layoutSnapshot || [],
          email_status: issuance.emailStatus || 'pending',
          email_delivery_id: issuance.emailDeliveryId,
          email_error: issuance.emailError,
          updated_at: new Date().toISOString(),
        });
      } catch {}
    }

    return issuance;
  }

  /**
   * Migrasi dan sinkronisasi data dari perangkat Administrator ke server terpusat
   */
  static async syncPush(payload: {
    appearance?: any;
    activities?: any[];
    templates?: any[];
    classifications?: any[];
    issuances?: any[];
    counters?: Record<string, any>;
    auditLogs?: any[];
    adminUsers?: any[];
    clientTimestamp?: string;
  }): Promise<{ success: boolean; updatedAt: string; version: number }> {
    const store = loadFromFile();

    if (payload.appearance) {
      store.appearance = mergeAppearance(store.appearance, {
        ...payload.appearance,
        updatedAt: new Date().toISOString(),
      });
    }

    if (Array.isArray(payload.activities) && payload.activities.length > 0) {
      // Merge activities by id
      payload.activities.forEach((act) => {
        const existingIdx = store.activities.findIndex((a) => a.id === act.id);
        if (existingIdx >= 0) {
          store.activities[existingIdx] = { ...store.activities[existingIdx], ...act };
        } else {
          store.activities.unshift(act);
        }
      });
    }

    if (Array.isArray(payload.templates) && payload.templates.length > 0) {
      payload.templates.forEach((tmpl) => {
        const existingIdx = store.templates.findIndex((t) => t.id === tmpl.id);
        if (existingIdx >= 0) {
          store.templates[existingIdx] = { ...store.templates[existingIdx], ...tmpl };
        } else {
          store.templates.unshift(tmpl);
        }
      });
    }

    if (Array.isArray(payload.classifications) && payload.classifications.length > 0) {
      payload.classifications.forEach((cls) => {
        const existingIdx = store.classifications.findIndex((c) => c.id === cls.id);
        if (existingIdx >= 0) {
          store.classifications[existingIdx] = { ...store.classifications[existingIdx], ...cls };
        } else {
          store.classifications.push(cls);
        }
      });
    }

    if (Array.isArray(payload.issuances) && payload.issuances.length > 0) {
      payload.issuances.forEach((iss) => {
        const existingIdx = store.issuances.findIndex((i) => i.id === iss.id);
        if (existingIdx >= 0) {
          store.issuances[existingIdx] = { ...store.issuances[existingIdx], ...iss };
        } else {
          store.issuances.unshift(iss);
        }
      });
    }

    if (payload.counters && typeof payload.counters === 'object') {
      store.counters = { ...store.counters, ...payload.counters };
    }

    if (Array.isArray(payload.auditLogs) && payload.auditLogs.length > 0) {
      payload.auditLogs.forEach((log) => {
        if (!store.auditLogs.some((l) => l.id === log.id)) {
          store.auditLogs.unshift(log);
        }
      });
    }

    if (Array.isArray(payload.adminUsers) && payload.adminUsers.length > 0) {
      payload.adminUsers.forEach((usr) => {
        const existingIdx = store.adminUsers.findIndex((u) => u.id === usr.id);
        if (existingIdx >= 0) {
          store.adminUsers[existingIdx] = { ...store.adminUsers[existingIdx], ...usr };
        } else {
          store.adminUsers.push(usr);
        }
      });
    }

    store.updatedAt = new Date().toISOString();
    store.version += 1;
    saveToFile(store);

    return {
      success: true,
      updatedAt: store.updatedAt,
      version: store.version,
    };
  }
}
