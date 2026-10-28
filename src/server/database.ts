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

// --------------------------------------------------------------------
// ENVIRONMENT VARIABLE RESOLUTION (Vercel + Supabase Integration Support)
// --------------------------------------------------------------------
function cleanEnvValue(val?: string): string {
  if (!val) return '';
  let cleaned = val.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

export function resolveSupabaseConfig() {
  const urlSources = [
    { name: 'SUPABASE_URL', value: cleanEnvValue(process.env.SUPABASE_URL) },
    { name: 'NEXT_PUBLIC_SUPABASE_URL', value: cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL) },
    { name: 'VITE_SUPABASE_URL', value: cleanEnvValue(process.env.VITE_SUPABASE_URL) },
  ];
  const urlEntry = urlSources.find(
    (s) => Boolean(s.value && !s.value.includes('your-project-id'))
  );
  const rawUrl = urlEntry?.value || '';
  const urlSource = urlEntry?.name || 'none';

  let resolvedUrl = '';
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        resolvedUrl = parsed.origin;
      }
    } catch {
      resolvedUrl = '';
    }
  }

  // Prefer Service Role / Secret Key for backend server operations so Row-Level Security (RLS) is bypassed safely
  const keySources = [
    { name: 'SUPABASE_SERVICE_ROLE_KEY', value: cleanEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY) },
    { name: 'SUPABASE_SECRET_KEY', value: cleanEnvValue(process.env.SUPABASE_SECRET_KEY) },
    { name: 'SUPABASE_ANON_KEY', value: cleanEnvValue(process.env.SUPABASE_ANON_KEY) },
    { name: 'SUPABASE_PUBLISHABLE_KEY', value: cleanEnvValue(process.env.SUPABASE_PUBLISHABLE_KEY) },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) },
    { name: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', value: cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) },
    { name: 'VITE_SUPABASE_ANON_KEY', value: cleanEnvValue(process.env.VITE_SUPABASE_ANON_KEY) },
    { name: 'VITE_SUPABASE_PUBLISHABLE_KEY', value: cleanEnvValue(process.env.VITE_SUPABASE_PUBLISHABLE_KEY) },
  ];
  const keyEntry = keySources.find(
    (s) => Boolean(s.value && !s.value.includes('your-anon-key') && !s.value.includes('...'))
  );
  const resolvedKey = keyEntry?.value || '';
  const keySource = keyEntry?.name || 'none';

  let keyRole: 'service_role' | 'anon' | 'unknown' = 'unknown';
  if (resolvedKey) {
    try {
      const parts = resolvedKey.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
        if (payload.role === 'service_role') keyRole = 'service_role';
        else if (payload.role === 'anon') keyRole = 'anon';
      }
    } catch {}
  }

  return {
    url: resolvedUrl,
    urlSource,
    key: resolvedKey,
    keySource,
    keyRole,
    isConfigured: Boolean(resolvedUrl && resolvedKey),
  };
}

const supabaseConfig = resolveSupabaseConfig();
let supabaseClient: SupabaseClient | null = null;

if (supabaseConfig.isConfigured) {
  try {
    supabaseClient = createClient(supabaseConfig.url, supabaseConfig.key, {
      auth: { persistSession: false },
    });
    console.log(
      `[BNN-DB] Terhubung ke Supabase Cloud (${supabaseConfig.urlSource}, Key: ${supabaseConfig.keySource} [${supabaseConfig.keyRole}])`
    );
  } catch (err: any) {
    console.warn(
      '[BNN-DB] Gagal menginisialisasi client Supabase, menggunakan penyimpanan file persisten:',
      err?.message
    );
    supabaseClient = null;
  }
}

// --------------------------------------------------------------------
// PERSISTENT FILE STORE LOCATION (FALLBACK FOR LOCAL / OFFLINE)
// --------------------------------------------------------------------
function getStoreFilePath(): string {
  // If running in Vercel or AWS Lambda, never attempt writing to process.cwd() as it is read-only (EROFS)
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === 'production') {
    return path.join('/tmp', 'bnn_app_storage.json');
  }
  const localDir = path.resolve(process.cwd(), 'data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return path.join(localDir, 'app_storage.json');
  } catch {
    return path.join('/tmp', 'bnn_app_storage.json');
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
    console.warn('[BNN-DB] Kendala saat membaca penyimpanan file:', err);
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

// --------------------------------------------------------------------
// ENTITY MAPPERS: Supabase snake_case <-> TypeScript camelCase
// --------------------------------------------------------------------
export function mapActivityFromDb(row: any): any {
  if (!row) return row;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description || '',
    certificateType: row.certificate_type || row.certificateType || 'Sertifikat',
    templateId: row.template_id || row.templateId || '',
    startDate: row.start_date || row.startDate || '2026-01-01',
    endDate: row.end_date || row.endDate || '2026-12-31',
    isActive: row.is_active !== undefined ? row.is_active : (row.isActive !== false),
    isArchived: row.is_archived !== undefined ? row.is_archived : Boolean(row.isArchived),
    duplicatePolicy: row.duplicate_policy || row.duplicatePolicy || 'disallow',
    dateMode: row.date_mode || row.dateMode || 'server_today',
    manualDate: row.manual_date || row.manualDate || undefined,
    timezone: row.timezone || row.timezone || 'Asia/Makassar',
    layoutElements: row.layout_elements || row.layoutElements || [],
    registrationNumberConfig: row.registration_number_config || row.registrationNumberConfig || {},
    formSettings: row.form_settings || row.formSettings || {},
    emailSettings: row.email_settings || row.emailSettings || {},
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

export function mapTemplateFromDb(row: any): any {
  if (!row) return row;
  return {
    id: row.id,
    name: row.name,
    orientation: row.orientation || 'landscape',
    bgImageUrl: row.bg_image_url || row.bgImageUrl || '',
    widthMm: Number(row.width_mm || row.widthMm || 297),
    heightMm: Number(row.height_mm || row.heightMm || 210),
    version: Number(row.version || 1),
    isDefault: row.is_default !== undefined ? row.is_default : Boolean(row.isDefault),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

export function mapClassificationFromDb(row: any): any {
  if (!row) return row;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || '',
    isActive: row.is_active !== undefined ? row.is_active : (row.isActive !== false),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

export function mapIssuanceFromDb(row: any): any {
  if (!row) return row;
  return {
    id: row.id,
    verificationId: row.verification_id || row.verificationId,
    activityId: row.activity_id || row.activityId,
    activityName: row.activity_name || row.activityName,
    participantId: row.participant_id || row.participantId,
    participantName: row.participant_name || row.participantName,
    participantEmail: row.participant_email || row.participantEmail,
    participantInstitution: row.participant_institution || row.participantInstitution,
    registrationNumber: row.registration_number || row.registrationNumber,
    sequenceNumber: Number(row.sequence_number || row.sequenceNumber || 1),
    issueDate: row.issue_date || row.issueDate,
    issueDateIso: row.issue_date_iso || row.issueDateIso || new Date().toISOString(),
    status: row.status || 'valid',
    pdfStoragePath: row.pdf_storage_path || row.pdfStoragePath,
    templateSnapshotId: row.template_snapshot_id || row.templateSnapshotId,
    layoutSnapshot: row.layout_snapshot || row.layoutSnapshot || [],
    emailStatus: row.email_status || row.emailStatus || 'pending',
    emailDeliveryId: row.email_delivery_id || row.emailDeliveryId,
    emailError: row.email_error || row.emailError,
    reissueReason: row.reissue_reason || row.reissueReason,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

export function mapAppearanceFromDb(row: any): any {
  if (!row) return null;
  // If stored with full embedded config in footer_config.fullConfig or config column
  if (row.footer_config && row.footer_config.fullConfig) {
    return mergeAppearance(DEFAULT_APPEARANCE_CONFIG, row.footer_config.fullConfig);
  }
  if (row.config) {
    return mergeAppearance(DEFAULT_APPEARANCE_CONFIG, row.config);
  }
  return mergeAppearance(DEFAULT_APPEARANCE_CONFIG, {
    id: row.id || 'primary',
    appName: row.app_name || row.appName,
    appSubtitle: row.app_subtitle || row.appSubtitle,
    logoUrl: row.logo_url || row.logoUrl,
    logoHeightPx: row.logo_height_px || row.logoHeightPx || 44,
    headerTitle: row.header_title || row.headerTitle,
    headerStyle: row.header_style || row.headerStyle,
    theme: {
      preset: row.theme_preset || 'bnn_official',
      primaryColor: row.primary_color || '#00529B',
      darkColor: row.dark_blue_color || '#003566',
      secondaryColor: row.secondary_color || '#1677C8',
      lightColor: row.light_blue_color || '#EAF4FC',
      bgColor: row.bg_color || '#F5F8FC',
    },
    footer: row.footer_config || {},
    updatedAt: row.updated_at || row.updatedAt,
  });
}

// --------------------------------------------------------------------
// SUPABASE APPEARANCE READ/WRITE HELPERS (Supports appearance_configs & appearance_config)
// --------------------------------------------------------------------
async function saveAppearanceToSupabase(
  client: SupabaseClient,
  config: any
): Promise<{ saved: boolean; tableName?: string; error?: string }> {
  const dbRecord = {
    id: 'primary',
    app_name: config.appName || 'e-Sertifikat BNN',
    app_subtitle: config.appSubtitle || '',
    logo_url: config.logoUrl || '',
    logo_height_px: Number(config.logoHeightPx) || 44,
    header_title: config.headerTitle || '',
    header_style: config.headerStyle || 'navy_gradient',
    theme_preset: config.theme?.preset || 'bnn_official',
    primary_color: config.theme?.primaryColor || '#00529B',
    dark_blue_color: config.theme?.darkColor || '#003566',
    secondary_color: config.theme?.secondaryColor || '#1677C8',
    light_blue_color: config.theme?.lightColor || '#EAF4FC',
    bg_color: config.theme?.bgColor || '#F5F8FC',
    footer_config: {
      ...(config.footer || {}),
      fullConfig: config,
    },
    config,
    updated_at: config.updatedAt || new Date().toISOString(),
  };

  // 1. Try appearance_configs (plural, official schema)
  const { error: err1 } = await client.from('appearance_configs').upsert(dbRecord);
  if (!err1) {
    return { saved: true, tableName: 'appearance_configs' };
  }

  // 2. Try appearance_config (singular) with structured record
  const { error: err2 } = await client.from('appearance_config').upsert(dbRecord);
  if (!err2) {
    return { saved: true, tableName: 'appearance_config' };
  }

  // 3. Try appearance_config with JSON config column
  const { error: err3 } = await client.from('appearance_config').upsert({
    id: 'primary',
    config,
    updated_at: dbRecord.updated_at,
  });
  if (!err3) {
    return { saved: true, tableName: 'appearance_config' };
  }

  // 4. Try legacy id 'default_appearance' with JSON config column
  const { error: err4 } = await client.from('appearance_config').upsert({
    id: 'default_appearance',
    config,
    updated_at: dbRecord.updated_at,
  });
  if (!err4) {
    return { saved: true, tableName: 'appearance_config' };
  }

  return { saved: false, error: err1.message || err2.message || err3.message || err4.message };
}

async function getAppearanceFromSupabase(
  client: SupabaseClient
): Promise<{ appearance: any | null; tableName?: string; tableExists?: boolean; error?: string }> {
  let tableFound = false;
  let activeTableName: string | undefined;

  // 1. Try appearance_configs (plural, official schema)
  const { data: rows1, error: err1 } = await client
    .from('appearance_configs')
    .select('*')
    .limit(1);

  if (!err1) {
    tableFound = true;
    activeTableName = 'appearance_configs';
    if (rows1 && rows1.length > 0) {
      const mapped = mapAppearanceFromDb(rows1[0]);
      if (mapped) return { appearance: mapped, tableName: 'appearance_configs', tableExists: true };
    }
  }

  // 2. Try appearance_config (singular)
  const { data: rows2, error: err2 } = await client
    .from('appearance_config')
    .select('*')
    .limit(1);

  if (!err2) {
    tableFound = true;
    if (!activeTableName) activeTableName = 'appearance_config';
    if (rows2 && rows2.length > 0) {
      const mapped = mapAppearanceFromDb(rows2[0]);
      if (mapped) return { appearance: mapped, tableName: 'appearance_config', tableExists: true };
    }
  }

  // If table was found in schema cache but currently has 0 rows:
  if (tableFound) {
    return { appearance: null, tableName: activeTableName, tableExists: true };
  }

  // If neither table exists in schema cache:
  return {
    appearance: null,
    tableExists: false,
    error: err1?.message || err2?.message || 'Tabel appearance_configs/appearance_config belum dibuat di Supabase.',
  };
}

// --------------------------------------------------------------------
// CENTRAL DATABASE CLASS
// --------------------------------------------------------------------
export class CentralDatabase {
  static isUsingSupabase(): boolean {
    return Boolean(supabaseClient);
  }

  static getStatus() {
    let host: string | undefined;
    if (supabaseConfig.url) {
      try {
        host = new URL(supabaseConfig.url).host;
      } catch {
        host = 'configured';
      }
    }

    const store = memoryStore || loadFromFile(true);
    return {
      provider: supabaseClient ? 'supabase_postgresql' : 'persistent_server_storage',
      isSupabaseActive: Boolean(supabaseClient),
      supabaseConfigured: supabaseConfig.isConfigured,
      supabaseHost: host,
      storageFile: getStoreFilePath(),
      updatedAt: store.updatedAt,
      activitiesCount: store.activities.length,
      templatesCount: store.templates.length,
      issuancesCount: store.issuances.length,
      envVars: {
        urlConfigured: Boolean(supabaseConfig.url),
        urlSource: supabaseConfig.urlSource,
        keyConfigured: Boolean(supabaseConfig.key),
        keySource: supabaseConfig.keySource,
        keyRole: supabaseConfig.keyRole,
      },
      notes: supabaseClient
        ? `Database cloud Supabase PostgreSQL aktif sebagai sumber data bersama (Role: ${supabaseConfig.keyRole}).`
        : 'Penyimpanan persisten server aktif (fallback). Untuk menghubungkan Supabase Cloud PostgreSQL, hubungkan Supabase di Vercel atau atur SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY.',
    };
  }

  /**
   * Diagnostik asinkron dengan verifikasi konektivitas nyata & uji baca/tulis non-destruktif
   */
  static async checkStatus(runWriteProbe = false) {
    const baseStatus = this.getStatus();
    const tableChecks: Record<string, { exists: boolean; recordCount?: number; error?: string; table?: string }> = {};
    let readTestResult: { success: boolean; dataSample?: string; error?: string } = { success: false };
    let writeTestResult: { attempted: boolean; success: boolean; isolatedTestId?: string; error?: string; note?: string } = {
      attempted: false,
      success: true,
      note: 'Uji tulis dilewati demi performa optimal (gunakan parameter ?probe=write untuk menguji tulis).',
    };
    let connectionHealthy = true;
    let connectionError: string | undefined;

    if (supabaseClient) {
      // Helper function with per-task timeout protection
      const timed = async <T>(task: any, fallback: T, ms = 2000): Promise<T> => {
        let t: any;
        const timeoutPromise = new Promise<T>((resolve) => {
          t = setTimeout(() => resolve(fallback), ms);
        });
        try {
          return await Promise.race([Promise.resolve(task), timeoutPromise]);
        } finally {
          clearTimeout(t);
        }
      };

      const executeChecks = async () => {
        // Run read checks in PARALLEL with Promise.allSettled to eliminate cold-start latency
        const [actRes, tmplRes, appRes, countRes] = await Promise.allSettled([
          timed(supabaseClient.from('activities').select('*', { count: 'exact', head: true }), { count: null, error: { message: 'Timeout (2s)' } } as any, 2000),
          timed(supabaseClient.from('certificate_templates').select('*', { count: 'exact', head: true }), { count: null, error: { message: 'Timeout (2s)' } } as any, 2000),
          timed(supabaseClient.from('appearance_configs').select('*', { count: 'exact', head: true }), { count: null, error: { message: 'Timeout (2s)' } } as any, 2000),
          timed(supabaseClient.from('registration_counters').select('*', { count: 'exact', head: true }), { count: null, error: { message: 'Timeout (2s)' } } as any, 2000),
        ]);

        if (actRes.status === 'fulfilled' && !actRes.value.error) {
          tableChecks.activities = { exists: true, recordCount: actRes.value.count ?? 0 };
        } else {
          const errMsg = actRes.status === 'fulfilled' ? actRes.value.error?.message : String(actRes.reason);
          tableChecks.activities = { exists: false, error: errMsg };
          connectionHealthy = false;
          connectionError = errMsg;
        }

        if (tmplRes.status === 'fulfilled' && !tmplRes.value.error) {
          tableChecks.certificate_templates = { exists: true, recordCount: tmplRes.value.count ?? 0 };
        } else {
          const errMsg = tmplRes.status === 'fulfilled' ? tmplRes.value.error?.message : String(tmplRes.reason);
          tableChecks.certificate_templates = { exists: false, error: errMsg };
        }

        if (appRes.status === 'fulfilled' && !appRes.value.error) {
          tableChecks.appearance_configs = { exists: true, recordCount: appRes.value.count ?? 0, table: 'appearance_configs (plural)' };
        } else if (connectionHealthy) {
          // Fallback check appearance_config (singular) ONLY if connection is reachable
          try {
            const fallbackApp = await timed(
              supabaseClient.from('appearance_config').select('*', { count: 'exact', head: true }),
              { count: null, error: { message: 'Timeout' } } as any,
              1500
            );
            if (!fallbackApp.error) {
              tableChecks.appearance_configs = { exists: true, recordCount: fallbackApp.count ?? 0, table: 'appearance_config (singular)' };
            } else {
              tableChecks.appearance_configs = { exists: false, error: fallbackApp.error.message };
            }
          } catch (e: any) {
            tableChecks.appearance_configs = { exists: false, error: e?.message };
          }
        } else {
          tableChecks.appearance_configs = { exists: false, error: connectionError };
        }

        if (countRes.status === 'fulfilled' && !countRes.value.error) {
          tableChecks.registration_counters = { exists: true, recordCount: countRes.value.count ?? 0 };
        } else {
          const errMsg = countRes.status === 'fulfilled' ? countRes.value.error?.message : String(countRes.reason);
          tableChecks.registration_counters = { exists: false, error: errMsg };
        }

        // Test read appearance with timeout ONLY if connection is healthy
        if (connectionHealthy) {
          const appearanceRes = await timed<{ appearance: any; tableName?: string; tableExists?: boolean; error?: string }>(
            getAppearanceFromSupabase(supabaseClient),
            { appearance: null, tableExists: false, error: 'Read timeout' },
            1500
          );
          if (appearanceRes.appearance) {
            readTestResult = {
              success: true,
              dataSample: `appName: "${appearanceRes.appearance.appName}", headerTitle: "${appearanceRes.appearance.headerTitle}" (dari tabel ${appearanceRes.tableName || 'appearance_configs'})`,
            };
          } else if (appearanceRes.tableExists) {
            // Table exists in Supabase schema cache but record count is 0
            // Auto-seed initial appearance into Supabase in background so Device B can read it
            const defaultApp = loadFromFile().appearance;
            saveAppearanceToSupabase(supabaseClient, defaultApp).catch(() => {});
            readTestResult = {
              success: true,
              dataSample: `Tabel ${appearanceRes.tableName || 'appearance_configs'} terdeteksi di Supabase (masih 0 baris, auto-seed default dipicu)`,
            };
          } else {
            readTestResult = {
              success: false,
              error: appearanceRes.error || 'Record pengaturan belum ada di Supabase',
            };
          }
        } else {
          readTestResult = {
            success: false,
            error: connectionError || 'Koneksi database tidak tersedia untuk uji baca',
          };
        }

        // Only run isolated write probe if explicitly requested AND connection is healthy
        if (runWriteProbe && connectionHealthy) {
          const probeId = `_diag_probe_${Date.now()}`;
          writeTestResult.attempted = true;
          writeTestResult.isolatedTestId = probeId;
          const probePayload = {
            id: probeId,
            app_name: 'PROBE_TEST',
            app_subtitle: 'Probe non-destruktif untuk uji tulis Supabase',
            updated_at: new Date().toISOString(),
          };

          let probeTable = 'appearance_configs';
          let { error: writeErr } = await supabaseClient.from('appearance_configs').upsert(probePayload);
          if (writeErr && writeErr.message.includes('does not exist')) {
            probeTable = 'appearance_config';
            const resFallback = await supabaseClient.from('appearance_config').upsert({
              id: probeId,
              config: probePayload,
              updated_at: probePayload.updated_at,
            });
            writeErr = resFallback.error;
          }

          if (writeErr) {
            writeTestResult.success = false;
            writeTestResult.error = writeErr.message;
          } else {
            const { data: readBack } = await supabaseClient.from(probeTable).select('*').eq('id', probeId).limit(1);
            const isIdentical = readBack && readBack.length > 0;
            try {
              await supabaseClient.from(probeTable).delete().eq('id', probeId);
            } catch {
              // ignore cleanup probe error
            }
            writeTestResult.success = Boolean(isIdentical);
            writeTestResult.note = 'Uji tulis dan baca ulang terisolasi berhasil diverifikasi.';
          }
        }
      };

      try {
        let masterTimer: any;
        const masterTimeoutPromise = new Promise<void>((resolve) => {
          masterTimer = setTimeout(resolve, 3500);
        });
        await Promise.race([executeChecks(), masterTimeoutPromise]).finally(() => clearTimeout(masterTimer));
      } catch (err: any) {
        connectionHealthy = false;
        connectionError = err?.message || 'Supabase diagnostic query failure';
      }
    }

    return {
      ...baseStatus,
      configurationStatus: supabaseConfig.isConfigured ? 'configured' : 'not_configured',
      clientInitialization: supabaseClient ? 'initialized' : (supabaseConfig.isConfigured ? 'failed' : 'skipped'),
      connectionStatus: supabaseClient
        ? connectionHealthy
          ? 'connected'
          : 'connection_error'
        : 'fallback_file_storage',
      connectionHealthy,
      connectionError,
      tableChecks,
      readTest: readTestResult,
      writeTest: writeTestResult,
      rlsBypassActive: supabaseConfig.keyRole === 'service_role',
      notes: supabaseClient
        ? connectionHealthy
          ? `Database Supabase PostgreSQL terhubung normal. Kunci otorisasi: ${supabaseConfig.keySource} (${supabaseConfig.keyRole}). ${
              supabaseConfig.keyRole !== 'service_role'
                ? 'PERINGATAN: Kunci anon terdeteksi. Gunakan SUPABASE_SERVICE_ROLE_KEY di Vercel agar operasi tulis backend melewati RLS tanpa hambatan.'
                : 'Izin operasi backend (RLS bypass) aktif optimal.'
            }`
          : `Kredensial Supabase terkonfigurasi tetapi koneksi gagal: ${connectionError}`
        : 'Penyimpanan persisten server aktif (fallback). Untuk sinkronisasi lintas perangkat yang andal di Vercel, pastikan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY tersedia.',
    };
  }

  /**
   * Mengambil seluruh data bersama untuk sinkronisasi perangkat klien (Supabase First)
   */
  static async getAllData(): Promise<CentralDatabaseData> {
    const fileData = loadFromFile();

    if (supabaseClient) {
      try {
        const [
          { data: activities },
          { data: templates },
          { data: classifications },
          { data: issuances },
          { data: auditLogs },
          appearanceRes,
          { data: counterRows },
        ] = await Promise.all([
          supabaseClient.from('activities').select('*'),
          supabaseClient.from('certificate_templates').select('*'),
          supabaseClient.from('classification_codes').select('*'),
          supabaseClient.from('certificate_issuances').select('*').limit(500),
          supabaseClient.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(200),
          getAppearanceFromSupabase(supabaseClient),
          supabaseClient.from('registration_counters').select('*'),
        ]);

        if (templates && templates.length > 0) {
          fileData.templates = templates.map(mapTemplateFromDb);
        } else if (fileData.templates && fileData.templates.length > 0) {
          // Supabase templates table is empty: seed templates in background so foreign keys won't fail
          for (const t of fileData.templates) {
            this.saveTemplate(t).catch(() => {});
          }
        }

        if (classifications && classifications.length > 0) {
          fileData.classifications = classifications.map(mapClassificationFromDb);
        } else if (fileData.classifications && fileData.classifications.length > 0) {
          for (const c of fileData.classifications) {
            this.saveClassification(c).catch(() => {});
          }
        }

        if (activities && activities.length > 0) {
          fileData.activities = activities.map(mapActivityFromDb);
        } else if (fileData.activities && fileData.activities.length > 0) {
          // If activities table is empty, seed initial activities now that templates are being seeded
          for (const a of fileData.activities) {
            this.saveActivity(a).catch(() => {});
          }
        }

        if (issuances && issuances.length > 0) {
          fileData.issuances = issuances.map(mapIssuanceFromDb);
        }
        if (auditLogs && auditLogs.length > 0) {
          fileData.auditLogs = auditLogs;
        }

        if (appearanceRes.appearance) {
          fileData.appearance = appearanceRes.appearance;
        } else if (appearanceRes.tableExists) {
          // Supabase appearance table exists but is empty; auto-seed fileData.appearance
          saveAppearanceToSupabase(supabaseClient, fileData.appearance).catch(() => {});
        }

        if (counterRows && counterRows.length > 0) {
          const counterMap: Record<string, any> = {};
          counterRows.forEach((c: any) => {
            counterMap[c.scope_key] = {
              id: `counter_${c.scope_key}`,
              scopeKey: c.scope_key,
              lastNumber: c.last_number,
              lastYear: c.last_year,
              lastMonth: c.last_month,
              updatedAt: c.updated_at,
            };
          });
          fileData.counters = counterMap;
        }

        fileData.updatedAt = new Date().toISOString();
      } catch (err) {
        console.warn('[BNN-DB] Gagal query Supabase di getAllData, menggunakan data penyimpanan persisten:', err);
      }
    }

    return fileData;
  }

  /**
   * Mengambil konfigurasi identitas visual & tema (Supabase First)
   */
  static async getAppearance(): Promise<any> {
    if (supabaseClient) {
      try {
        const res = await getAppearanceFromSupabase(supabaseClient);
        if (res.appearance) {
          const store = loadFromFile(true);
          store.appearance = res.appearance;
          return res.appearance;
        }
      } catch (err) {
        console.warn('[BNN-DB] Gagal query appearance dari Supabase:', err);
      }
    }

    const store = loadFromFile();
    return store.appearance || DEFAULT_APPEARANCE_CONFIG;
  }

  /**
   * Menyimpan konfigurasi identitas visual, logo, dan tema ke Supabase
   */
  static async saveAppearance(config: any): Promise<{
    appearance: any;
    supabaseSaved: boolean;
    tableName?: string;
    error?: string;
    warning?: string;
  }> {
    const store = loadFromFile();
    store.appearance = mergeAppearance(store.appearance, {
      ...config,
      updatedAt: new Date().toISOString(),
    });
    store.updatedAt = new Date().toISOString();
    store.version += 1;
    saveToFile(store);

    let supabaseSaved = false;
    let tableName: string | undefined;
    let supabaseError: string | undefined;

    if (supabaseClient) {
      try {
        const res = await saveAppearanceToSupabase(supabaseClient, store.appearance);
        supabaseSaved = res.saved;
        tableName = res.tableName;
        if (!res.saved) {
          supabaseError = res.error;
          console.error('[BNN-DB] Gagal menyimpan tampilan ke Supabase:', res.error);
        } else {
          console.log(`[BNN-DB] Berhasil menyimpan tampilan ke Supabase (tabel: ${res.tableName}).`);
        }
      } catch (e: any) {
        supabaseError = e?.message || 'Unknown Supabase error';
        console.error('[BNN-DB] Exception saat menyimpan tampilan ke Supabase:', e);
      }
    }

    return {
      appearance: store.appearance,
      supabaseSaved,
      tableName,
      error: supabaseError,
      warning: !supabaseClient
        ? 'Supabase belum terkonfigurasi. Disimpan di penyimpanan server sementara.'
        : (!supabaseSaved ? `Gagal persist ke Supabase: ${supabaseError}` : undefined),
    };
  }

  /**
   * Menyimpan atau memperbarui kegiatan beserta tata letak sertifikat
   */
  static async saveActivity(activity: any): Promise<{ activity: any; supabaseSaved: boolean; error?: string }> {
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

    let supabaseSaved = false;
    let supabaseError: string | undefined;

    if (supabaseClient) {
      try {
        const { error } = await supabaseClient.from('activities').upsert({
          id: updated.id,
          slug: updated.slug || `act-${Date.now()}`,
          name: updated.name,
          description: updated.description || '',
          certificate_type: updated.certificateType || 'Sertifikat',
          template_id: updated.templateId || null,
          start_date: updated.startDate || '2026-01-01',
          end_date: updated.endDate || '2026-12-31',
          is_active: updated.isActive !== false,
          is_archived: Boolean(updated.isArchived),
          duplicate_policy: updated.duplicatePolicy || 'disallow',
          date_mode: updated.dateMode || 'server_today',
          manual_date: updated.manualDate ? updated.manualDate : null,
          timezone: updated.timezone || 'Asia/Makassar',
          layout_elements: updated.layoutElements || [],
          registration_number_config: updated.registrationNumberConfig || {},
          form_settings: updated.formSettings || {},
          email_settings: updated.emailSettings || {},
          updated_at: updated.updatedAt,
        });

        if (error) {
          supabaseError = error.message;
          console.error('[BNN-DB] Gagal upsert activity ke Supabase:', error.message);
        } else {
          supabaseSaved = true;
        }
      } catch (err: any) {
        supabaseError = err?.message;
        console.error('[BNN-DB] Exception saat upsert activity ke Supabase:', err);
      }
    }

    return { activity: updated, supabaseSaved, error: supabaseError };
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
      } catch (e: any) {
        console.warn('[BNN-DB] Gagal menghapus activity dari Supabase:', e?.message);
      }
    }

    return true;
  }

  /**
   * Menyimpan template sertifikat
   */
  static async saveTemplate(template: any): Promise<{ template: any; supabaseSaved: boolean; error?: string }> {
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

    let supabaseSaved = false;
    let supabaseError: string | undefined;

    if (supabaseClient) {
      try {
        const { error } = await supabaseClient.from('certificate_templates').upsert({
          id: updated.id,
          name: updated.name,
          orientation: updated.orientation || 'landscape',
          bg_image_url: updated.bgImageUrl || '',
          width_mm: Number(updated.widthMm || 297),
          height_mm: Number(updated.heightMm || 210),
          version: Number(updated.version || 1),
          is_default: Boolean(updated.isDefault),
          updated_at: updated.updatedAt,
        });

        if (error) {
          supabaseError = error.message;
          console.error('[BNN-DB] Gagal upsert template ke Supabase:', error.message);
        } else {
          supabaseSaved = true;
        }
      } catch (err: any) {
        supabaseError = err?.message;
        console.error('[BNN-DB] Exception saat upsert template ke Supabase:', err);
      }
    }

    return { template: updated, supabaseSaved, error: supabaseError };
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
      } catch (e: any) {
        console.warn('[BNN-DB] Gagal menghapus template dari Supabase:', e?.message);
      }
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
          description: cls.description || '',
          is_active: cls.isActive !== false,
          updated_at: new Date().toISOString(),
        });
      } catch (e: any) {
        console.warn('[BNN-DB] Gagal upsert klasifikasi ke Supabase:', e?.message);
      }
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
          participant_institution: issuance.participantInstitution || '',
          registration_number: issuance.registrationNumber,
          sequence_number: Number(issuance.sequenceNumber || 1),
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

        // Update counter on Supabase as well
        if (issuance.activityId && issuance.sequenceNumber) {
          const scopeKey = `activity_${issuance.activityId}`;
          const currentCounter = store.counters[scopeKey];
          if (currentCounter) {
            await supabaseClient.from('registration_counters').upsert({
              scope_key: scopeKey,
              last_number: currentCounter.lastNumber,
              last_year: currentCounter.lastYear,
              last_month: currentCounter.lastMonth,
              updated_at: new Date().toISOString(),
            });
          }
        }
      } catch (e: any) {
        console.warn('[BNN-DB] Gagal upsert issuance ke Supabase:', e?.message);
      }
    }

    return issuance;
  }

  /**
   * Migrasi dan sinkronisasi data dari perangkat Administrator ke server terpusat (Supabase Persist)
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
  }): Promise<{ success: boolean; updatedAt: string; version: number; supabaseSaved: boolean }> {
    const store = loadFromFile();
    let anySupabaseSaved = false;

    // 1. Templates first (activities reference certificate_templates.id)
    if (Array.isArray(payload.templates) && payload.templates.length > 0) {
      for (const tmpl of payload.templates) {
        const existingIdx = store.templates.findIndex((t) => t.id === tmpl.id);
        if (existingIdx >= 0) {
          store.templates[existingIdx] = { ...store.templates[existingIdx], ...tmpl };
        } else {
          store.templates.unshift(tmpl);
        }
        if (supabaseClient) {
          await this.saveTemplate(tmpl);
          anySupabaseSaved = true;
        }
      }
    }

    // 2. Classification codes
    if (Array.isArray(payload.classifications) && payload.classifications.length > 0) {
      for (const cls of payload.classifications) {
        const existingIdx = store.classifications.findIndex((c) => c.id === cls.id);
        if (existingIdx >= 0) {
          store.classifications[existingIdx] = { ...store.classifications[existingIdx], ...cls };
        } else {
          store.classifications.push(cls);
        }
        if (supabaseClient) {
          await this.saveClassification(cls);
          anySupabaseSaved = true;
        }
      }
    }

    // 3. Activities (foreign keys now satisfied)
    if (Array.isArray(payload.activities) && payload.activities.length > 0) {
      for (const act of payload.activities) {
        const existingIdx = store.activities.findIndex((a) => a.id === act.id);
        if (existingIdx >= 0) {
          store.activities[existingIdx] = { ...store.activities[existingIdx], ...act };
        } else {
          store.activities.unshift(act);
        }
        if (supabaseClient) {
          await this.saveActivity(act);
          anySupabaseSaved = true;
        }
      }
    }

    // 4. Appearance settings
    if (payload.appearance) {
      store.appearance = mergeAppearance(store.appearance, {
        ...payload.appearance,
        updatedAt: new Date().toISOString(),
      });
      if (supabaseClient) {
        const res = await saveAppearanceToSupabase(supabaseClient, store.appearance);
        if (res.saved) anySupabaseSaved = true;
      }
    }

    if (Array.isArray(payload.issuances) && payload.issuances.length > 0) {
      for (const iss of payload.issuances) {
        const existingIdx = store.issuances.findIndex((i) => i.id === iss.id);
        if (existingIdx >= 0) {
          store.issuances[existingIdx] = { ...store.issuances[existingIdx], ...iss };
        } else {
          store.issuances.unshift(iss);
        }
        if (supabaseClient) {
          await this.saveIssuance(iss);
          anySupabaseSaved = true;
        }
      }
    }

    if (payload.counters && typeof payload.counters === 'object') {
      store.counters = { ...store.counters, ...payload.counters };
      if (supabaseClient) {
        try {
          for (const [key, c] of Object.entries(payload.counters)) {
            await supabaseClient.from('registration_counters').upsert({
              scope_key: key,
              last_number: (c as any).lastNumber || 0,
              last_year: (c as any).lastYear || 2026,
              last_month: (c as any).lastMonth || 10,
              updated_at: new Date().toISOString(),
            });
            anySupabaseSaved = true;
          }
        } catch (e: any) {
          console.warn('[BNN-DB] Gagal sync counters ke Supabase:', e?.message);
        }
      }
    }

    if (Array.isArray(payload.auditLogs) && payload.auditLogs.length > 0) {
      payload.auditLogs.forEach((log) => {
        if (!store.auditLogs.some((l) => l.id === log.id)) {
          store.auditLogs.unshift(log);
        }
      });
      if (supabaseClient) {
        try {
          const insertRows = payload.auditLogs.map((l) => ({
            id: l.id || `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            timestamp: l.timestamp || new Date().toISOString(),
            user_email: l.user || 'system@bnn.go.id',
            action: l.action || 'GENERAL_ACTION',
            target_type: l.targetType || 'system',
            target_id: l.targetId || 'global',
            details: l.details || '',
          }));
          await supabaseClient.from('audit_logs').upsert(insertRows);
          anySupabaseSaved = true;
        } catch (e: any) {
          console.warn('[BNN-DB] Gagal sync audit logs ke Supabase:', e?.message);
        }
      }
    }

    store.updatedAt = new Date().toISOString();
    store.version += 1;
    saveToFile(store);

    return {
      success: true,
      updatedAt: store.updatedAt,
      version: store.version,
      supabaseSaved: anySupabaseSaved,
    };
  }
}
