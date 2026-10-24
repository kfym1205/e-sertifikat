import React, { useState } from 'react';
import {
  Database,
  Server,
  Clock,
  Copy,
  Check,
  Shield,
  ExternalLink,
  RefreshCw,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { storage } from '../../utils/storage';

export const SystemSettingsView: React.FC = () => {
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [dbStatus, setDbStatus] = useState<{
    provider?: string;
    isSupabaseActive?: boolean;
    counts?: { activities: number; templates: number; issuances: number; auditLogs: number };
    notes?: string;
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fetchDbStatus = () => {
    fetch('/api/db-status')
      .then((res) => res.json())
      .then((data) => setDbStatus(data))
      .catch(() => {});
  };

  React.useEffect(() => {
    fetchDbStatus();
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await storage.syncWithServer();
      fetchDbStatus();
      setSyncMessage(
        res.success
          ? 'Sinkronisasi berhasil! Data terpusat paling mutakhir telah dimuat.'
          : 'Sinkronisasi offline: Menyimpan perubahan pada cache lokal.'
      );
    } catch {
      setSyncMessage('Kendala sinkronisasi dengan server.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  const handleCopySql = () => {
    fetch('/supabase-schema.sql')
      .then((res) => res.text())
      .then((text) => {
        navigator.clipboard.writeText(text);
        setCopiedSql(true);
        setTimeout(() => setCopiedSql(false), 2500);
      })
      .catch(() => {
        navigator.clipboard.writeText(`-- Silakan buka file supabase-schema.sql di root direktori proyek`);
        setCopiedSql(true);
        setTimeout(() => setCopiedSql(false), 2500);
      });
  };

  const handleCopyEnv = () => {
    const envContent = `SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"`;
    navigator.clipboard.writeText(envContent);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2500);
  };

  const isSupabase = dbStatus?.isSupabaseActive;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Pengaturan Sistem & Database</h2>
          <p className="text-xs text-slate-400 mt-1">
            Status infrastruktur database PostgreSQL, integrasi Supabase, zona waktu operasional, dan sinkronisasi lintas perangkat.
          </p>
        </div>

        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
        </button>
      </div>

      {syncMessage && (
        <div className="p-3 bg-blue-950/80 border border-blue-700 text-blue-200 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* 3 Architecture Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Database Status */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Database Engine
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-base font-bold text-white block">
              {isSupabase ? 'Supabase PostgreSQL' : 'Penyimpanan Persisten Server'}
            </span>
            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {isSupabase
                ? 'Terhubung ke Database Cloud Supabase'
                : 'Penyimpanan Server Terpusat Aktif'}
            </span>
            {dbStatus?.counts && (
              <span className="text-[10px] text-slate-400 block mt-1">
                {dbStatus.counts.activities} Kegiatan • {dbStatus.counts.templates} Template • {dbStatus.counts.issuances} Sertifikat
              </span>
            )}
          </div>
        </div>

        {/* Server Timezone */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Zona Waktu Operasional
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-base font-bold text-white block">Asia/Makassar (WITA)</span>
            <span className="text-[11px] text-slate-400 font-medium block mt-1">
              UTC+8 (Wilayah Gorontalo & Sekitarnya)
            </span>
          </div>
        </div>

        {/* Deployment Target */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Target Deployment
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-base font-bold text-white block">Vercel & Node.js SPA</span>
            <span className="text-[11px] text-slate-400 font-medium block mt-1">
              Kompatibel Serverless & Edge API
            </span>
          </div>
        </div>
      </div>

      {/* Supabase SQL Migration Helper */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Skema Database Supabase PostgreSQL (SQL DDL & RLS)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              File <code className="text-amber-300">supabase-schema.sql</code> sudah mencakup seluruh tabel, index, row-level security (RLS), dan stored procedure atomic sequence.
            </p>
          </div>

          <button
            onClick={handleCopySql}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shrink-0"
          >
            {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedSql ? 'Tersalin ke Clipboard!' : 'Salin Seluruh Skema SQL'}</span>
          </button>
        </div>

        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono space-y-1">
          <p className="text-slate-500">-- Struktur tabel yang sudah disiapkan otomatis:</p>
          <p className="text-amber-400">• admin_users, certificate_templates, template_versions</p>
          <p className="text-amber-400">• classification_codes, activities, registration_counters</p>
          <p className="text-amber-400">• participants, certificate_issuances, email_delivery_logs, audit_logs</p>
          <p className="text-emerald-400">• FUNCTION get_next_sequence_number(...) -- Atomic Row-Locking</p>
        </div>
      </div>

      {/* Vercel Deployment Guide */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-400" />
            <span>Panduan Deployment ke Vercel</span>
          </h3>

          <button
            onClick={handleCopyEnv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
          >
            {copiedEnv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedEnv ? 'Tersalin' : 'Salin Environment Variables'}</span>
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
              1
            </span>
            <div>
              <strong className="text-white">Push ke Repository GitHub:</strong>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Commit seluruh file proyek ke repository GitHub privat atau publik Anda.
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
              2
            </span>
            <div>
              <strong className="text-white">Import Proyek di Vercel:</strong>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Buka dashboard Vercel &rarr; "Add New Project" &rarr; pilih repository GitHub Sertifikat Otomatis.
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
              3
            </span>
            <div>
              <strong className="text-white">Masukkan Environment Variables di Vercel:</strong>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Salin variabel dari tombol di atas dan masukkan ke menu <em>Settings &rarr; Environment Variables</em> di dashboard Vercel.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
