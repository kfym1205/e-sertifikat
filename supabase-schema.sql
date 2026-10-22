-- ====================================================================
-- SKEMA DATABASE POSTGRESQL SUPABASE - SISTEM SERTIFIKAT OTOMATIS
-- Kompatibel dengan Supabase SQL Editor & Vercel Postgres
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABEL PROFILES / ADMIN USERS (RBAC & Keamanan Akun BNN)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin', 'operator')),
  is_active BOOLEAN DEFAULT TRUE,
  password_hash TEXT,
  salt TEXT,
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL TEMPLATE SERTIFIKAT
CREATE TABLE IF NOT EXISTS certificate_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  orientation TEXT NOT NULL DEFAULT 'landscape' CHECK (orientation IN ('landscape', 'portrait')),
  bg_image_url TEXT NOT NULL,
  width_mm NUMERIC NOT NULL DEFAULT 297,
  height_mm NUMERIC NOT NULL DEFAULT 210,
  version INT NOT NULL DEFAULT 1,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL RIWAYAT / VERSI TEMPLATE
CREATE TABLE IF NOT EXISTS template_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id TEXT REFERENCES certificate_templates(id) ON DELETE CASCADE,
  version INT NOT NULL,
  bg_image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL KODE KLASIFIKASI
CREATE TABLE IF NOT EXISTS classification_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL KONFIGURASI KEGIATAN (ACTIVITIES)
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  certificate_type TEXT NOT NULL DEFAULT 'Sertifikat',
  template_id TEXT REFERENCES certificate_templates(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_archived BOOLEAN DEFAULT FALSE,
  duplicate_policy TEXT DEFAULT 'disallow' CHECK (duplicate_policy IN ('disallow', 'allow', 'reissue')),
  date_mode TEXT DEFAULT 'server_today' CHECK (date_mode IN ('server_today', 'manual')),
  manual_date DATE,
  timezone TEXT DEFAULT 'Asia/Makassar',
  layout_elements JSONB NOT NULL DEFAULT '[]'::jsonb,
  registration_number_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  form_settings JSONB NOT NULL DEFAULT '{"requirePhone": true, "requireInstitution": true}'::jsonb,
  email_settings JSONB NOT NULL DEFAULT '{"attachPdf": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABEL ATOMIC COUNTERS (Penomoran aman dari race condition)
CREATE TABLE IF NOT EXISTS registration_counters (
  scope_key TEXT PRIMARY KEY,
  last_number INT NOT NULL DEFAULT 0,
  last_year INT NOT NULL DEFAULT 2026,
  last_month INT NOT NULL DEFAULT 10,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABEL PENDAFTAR (PARTICIPANTS)
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  activity_id TEXT REFERENCES activities(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  institution TEXT,
  custom_field_value TEXT,
  ip_address TEXT,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  registered_at_local TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABEL PENERBITAN SERTIFIKAT (CERTIFICATE ISSUANCES)
CREATE TABLE IF NOT EXISTS certificate_issuances (
  id TEXT PRIMARY KEY,
  verification_id TEXT UNIQUE NOT NULL,
  activity_id TEXT REFERENCES activities(id) ON DELETE CASCADE,
  activity_name TEXT NOT NULL,
  participant_id TEXT REFERENCES participants(id) ON DELETE SET NULL,
  participant_name TEXT NOT NULL,
  participant_email TEXT NOT NULL,
  participant_institution TEXT,
  registration_number TEXT NOT NULL,
  sequence_number INT NOT NULL,
  issue_date TEXT NOT NULL,
  issue_date_iso TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'valid' CHECK (status IN ('valid', 'revoked', 'reissued')),
  pdf_storage_path TEXT,
  template_snapshot_id TEXT,
  layout_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  email_status TEXT DEFAULT 'pending' CHECK (email_status IN ('pending', 'processing', 'delivered', 'failed')),
  email_delivery_id TEXT,
  email_error TEXT,
  reissue_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_activity_reg_number UNIQUE(activity_id, registration_number)
);

-- 10. TABEL LOG PENGIRIMAN EMAIL
CREATE TABLE IF NOT EXISTS email_delivery_logs (
  id TEXT PRIMARY KEY,
  issuance_id TEXT REFERENCES certificate_issuances(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'delivered', 'failed')),
  attempt_count INT DEFAULT 1,
  last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  provider_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. TABEL AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details TEXT NOT NULL
);

-- ====================================================================
-- INDEKS UNTUK PENCARIAN & PERFORMA TINGGI
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);
CREATE INDEX IF NOT EXISTS idx_participants_activity ON participants(activity_id);
CREATE INDEX IF NOT EXISTS idx_issuances_verif_id ON certificate_issuances(verification_id);
CREATE INDEX IF NOT EXISTS idx_issuances_reg_num ON certificate_issuances(registration_number);
CREATE INDEX IF NOT EXISTS idx_issuances_activity ON certificate_issuances(activity_id);
CREATE INDEX IF NOT EXISTS idx_issuances_email ON certificate_issuances(participant_email);
CREATE INDEX IF NOT EXISTS idx_issuances_status ON certificate_issuances(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_issuance ON email_delivery_logs(issuance_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- ====================================================================
-- STORED PROCEDURE ATOMIK PENOMORAN (RACE CONDITION PROOF)
-- ====================================================================
CREATE OR REPLACE FUNCTION get_next_sequence_number(
  p_scope_key TEXT,
  p_reset_policy TEXT,
  p_start_number INT,
  p_current_year INT,
  p_current_month INT
) RETURNS INT AS $$
DECLARE
  v_next INT;
  v_rec RECORD;
BEGIN
  -- Kunci baris counter secara eksklusif (Row-level lock)
  SELECT * INTO v_rec FROM registration_counters WHERE scope_key = p_scope_key FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO registration_counters (scope_key, last_number, last_year, last_month, updated_at)
    VALUES (p_scope_key, p_start_number, p_current_year, p_current_month, NOW());
    RETURN p_start_number;
  END IF;

  -- Cek reset policy
  IF p_reset_policy = 'yearly' AND v_rec.last_year <> p_current_year THEN
    v_next := p_start_number;
  ELSIF p_reset_policy = 'monthly' AND (v_rec.last_year <> p_current_year OR v_rec.last_month <> p_current_month) THEN
    v_next := p_start_number;
  ELSE
    v_next := v_rec.last_number + 1;
  END IF;

  UPDATE registration_counters
  SET last_number = v_next,
      last_year = p_current_year,
      last_month = p_current_month,
      updated_at = NOW()
  WHERE scope_key = p_scope_key;

  RETURN v_next;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE classification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_issuances ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Kebijakan Publik: Kegiatan aktif dapat dibaca oleh publik
CREATE POLICY "Public Read Active Activities" ON activities
  FOR SELECT USING (is_active = TRUE AND is_archived = FALSE);

-- Kebijakan Publik: Verifikasi sertifikat dapat melihat data publik sertifikat
CREATE POLICY "Public Read Verifications" ON certificate_issuances
  FOR SELECT USING (TRUE);

-- Kebijakan Publik: Publik dapat insert pendaftaran ke tabel participants
CREATE POLICY "Public Insert Participant" ON participants
  FOR INSERT WITH CHECK (TRUE);

-- Kebijakan Admin: Membaca dan memodifikasi semua tabel jika sudah authenticated
CREATE POLICY "Admin Full Access Activities" ON activities
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin Full Access Templates" ON certificate_templates
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin Full Access Classifications" ON classification_codes
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin Full Access Issuances" ON certificate_issuances
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin Full Access EmailLogs" ON email_delivery_logs
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin Full Access AuditLogs" ON audit_logs
  FOR ALL USING (auth.role() = 'authenticated');

-- ====================================================================
-- 13. TABEL PENGATURAN TAMPILAN & IDENTITAS INSTANSI (e-Sertifikat BNN)
-- ====================================================================
CREATE TABLE IF NOT EXISTS appearance_configs (
  id TEXT PRIMARY KEY DEFAULT 'primary',
  app_name TEXT NOT NULL DEFAULT 'e-Sertifikat BNN',
  app_subtitle TEXT DEFAULT 'Badan Narkotika Nasional Republik Indonesia',
  logo_url TEXT,
  logo_height_px INT DEFAULT 44,
  header_title TEXT DEFAULT 'e-Sertifikat BNN',
  header_style TEXT DEFAULT 'bnn_gradient',
  theme_preset TEXT DEFAULT 'bnn_official',
  primary_color TEXT DEFAULT '#00529B',
  dark_blue_color TEXT DEFAULT '#003566',
  secondary_color TEXT DEFAULT '#1677C8',
  light_blue_color TEXT DEFAULT '#EAF4FC',
  bg_color TEXT DEFAULT '#F5F8FC',
  footer_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE appearance_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Appearance" ON appearance_configs
  FOR SELECT USING (TRUE);

CREATE POLICY "Admin Full Access Appearance" ON appearance_configs
  FOR ALL USING (auth.role() = 'authenticated');
