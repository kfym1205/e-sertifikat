import React, { useState } from 'react';
import {
  Hash,
  Sparkles,
  Save,
  CheckCircle2,
  ShieldAlert,
  Info,
  Layers,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { RegistrationNumberConfig } from '../../types';
import { storage } from '../../utils/storage';
import { AVAILABLE_NUMBER_TOKENS, generateRegistrationNumber } from '../../utils/numberGenerator';
import { getNowInTimezone } from '../../utils/dateUtils';

export const NumberFormatView: React.FC = () => {
  const activities = storage.getActivities();
  const [selectedActivityId, setSelectedActivityId] = useState<string>(
    activities[0]?.id || ''
  );

  const currentActivity = activities.find((a) => a.id === selectedActivityId) || activities[0];
  const [config, setConfig] = useState<RegistrationNumberConfig>(
    currentActivity?.registrationNumberConfig
      ? { ...currentActivity.registrationNumberConfig }
      : {
          id: 'cfg_default',
          name: 'Format Standar',
          pattern: '{JENIS}/{NOMOR_URUT}/{KLASIFIKASI}/{UNIT}/{BULAN_ROMAWI}/{TAHUN}/{INSTANSI}',
          separator: '/',
          digitCount: 2,
          startNumber: 1,
          scope: 'per_activity',
          resetPolicy: 'yearly',
          docTypeCode: 'ST',
          classificationCode: 'RLN',
          unitCode: 'KA',
          institutionCode: 'BNNK',
          monthFormat: 'roman',
        }
  );

  const [testSequence, setTestSequence] = useState<number>(1);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  // Sync if activity selected changes
  const handleActivityChange = (actId: string) => {
    setSelectedActivityId(actId);
    const act = activities.find((a) => a.id === actId);
    if (act?.registrationNumberConfig) {
      setConfig({ ...act.registrationNumberConfig });
    }
  };

  const handleInsertToken = (token: string) => {
    setConfig((prev) => ({
      ...prev,
      pattern: prev.pattern + (prev.pattern.endsWith('/') ? '' : '/') + token,
    }));
  };

  const handleSave = () => {
    if (!currentActivity) return;
    const updated = {
      ...currentActivity,
      registrationNumberConfig: config,
    };
    storage.saveActivity(updated);
    storage.logAudit(
      'UPDATE_NUMBER_CONFIG',
      'number_config',
      currentActivity.id,
      `Memperbarui format nomor registrasi untuk kegiatan "${currentActivity.name}": ${config.pattern}`
    );
    setAlertMsg('Konfigurasi nomor registrasi otomatis berhasil disimpan!');
    setTimeout(() => setAlertMsg(null), 3000);
  };

  // Generate live sample
  const sampleNumber = generateRegistrationNumber(config, {
    sequenceNumber: testSequence,
    docTypeCode: config.docTypeCode,
    classificationCode: config.classificationCode,
    unitCode: config.unitCode,
    institutionCode: config.institutionCode,
    date: getNowInTimezone(),
  });

  return (
    <div className="space-y-6">
      {alertMsg && (
        <div className="p-3 bg-emerald-950 border border-emerald-700 text-emerald-200 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{alertMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Konfigurasi Format Nomor Registrasi Otomatis
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Atur struktur penomoran dinamis, urutan digit, kode dokumen, unit, dan kebijakan reset berkala.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-500/20"
        >
          <Save className="w-4 h-4" />
          <span>Simpan Konfigurasi Nomor</span>
        </button>
      </div>

      {/* Activity Selector */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
        <span className="text-xs font-semibold text-slate-300">Pilih Kegiatan untuk Konfigurasi:</span>
        <select
          value={selectedActivityId}
          onChange={(e) => handleActivityChange(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
        >
          {activities.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {/* Live Preview Card */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/40 p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 block mb-1">
              Hasil Simulasi Nomor Registrasi Real-Time
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-wider flex items-center gap-2">
              <span className="text-amber-400 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/30">
                {sampleNumber}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Dihitung berdasarkan urutan #{testSequence} pada waktu operasional server saat ini.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Uji Nomor Urut:</span>
            <input
              type="number"
              min="1"
              max="9999"
              value={testSequence}
              onChange={(e) => setTestSequence(parseInt(e.target.value) || 1)}
              className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-center font-mono font-bold text-amber-300"
            />
          </div>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Token Builder */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Hash className="w-4 h-4 text-amber-400" />
            <span>Pola String Format (Pattern)</span>
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Format Pola Penomoran:
            </label>
            <input
              type="text"
              value={config.pattern}
              onChange={(e) => setConfig({ ...config, pattern: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 font-mono text-xs text-amber-300 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-300 block mb-2">
              Klik token untuk menambahkan ke pola:
            </span>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_NUMBER_TOKENS.map((item) => (
                <button
                  key={item.token}
                  type="button"
                  onClick={() => handleInsertToken(item.token)}
                  className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 rounded-lg text-xs font-mono text-amber-300 transition-colors flex items-center gap-1.5"
                  title={`${item.label} (contoh: ${item.example})`}
                >
                  <span className="font-bold">{item.token}</span>
                  <span className="text-[10px] text-slate-400">({item.label})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Karakter Pemisah (Separator)
                </label>
                <input
                  type="text"
                  value={config.separator}
                  onChange={(e) => setConfig({ ...config, separator: e.target.value })}
                  placeholder="/"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white text-center font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Jumlah Digit Nomor Urut
                </label>
                <select
                  value={config.digitCount}
                  onChange={(e) => setConfig({ ...config, digitCount: parseInt(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                >
                  <option value={2}>2 Digit (01, 02, ...)</option>
                  <option value={3}>3 Digit (001, 002, ...)</option>
                  <option value={4}>4 Digit (0001, 0002, ...)</option>
                  <option value={5}>5 Digit (00001, ...)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Format Bulan
                </label>
                <select
                  value={config.monthFormat}
                  onChange={(e) => setConfig({ ...config, monthFormat: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                >
                  <option value="roman">Angka Romawi (I, II, ..., X, XI, XII)</option>
                  <option value="arabic">Angka Biasa (01, 02, ..., 10, 11, 12)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nomor Urut Awal
                </label>
                <input
                  type="number"
                  min="1"
                  value={config.startNumber}
                  onChange={(e) => setConfig({ ...config, startNumber: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Codes & Counter Scope Settings */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Nilai Token Default & Lingkup Urutan</span>
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Kode Jenis Dokumen {'{JENIS}'}
              </label>
              <input
                type="text"
                value={config.docTypeCode}
                onChange={(e) => setConfig({ ...config, docTypeCode: e.target.value.toUpperCase() })}
                placeholder="ST"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono uppercase"
              />
              <span className="text-[10px] text-slate-400">Misal: ST (Sertifikat), PG (Piagam)</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Kode Klasifikasi {'{KLASIFIKASI}'}
              </label>
              <input
                type="text"
                value={config.classificationCode}
                onChange={(e) =>
                  setConfig({ ...config, classificationCode: e.target.value.toUpperCase() })
                }
                placeholder="RLN"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono uppercase"
              />
              <span className="text-[10px] text-slate-400">Misal: RLN (Relawan), PLT (Pelatihan)</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Kode Unit / Wilayah {'{UNIT}'}
              </label>
              <input
                type="text"
                value={config.unitCode}
                onChange={(e) => setConfig({ ...config, unitCode: e.target.value.toUpperCase() })}
                placeholder="KA"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono uppercase"
              />
              <span className="text-[10px] text-slate-400">Misal: KA (Kabupaten), GO (Gorontalo)</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Kode Instansi {'{INSTANSI}'}
              </label>
              <input
                type="text"
                value={config.institutionCode}
                onChange={(e) =>
                  setConfig({ ...config, institutionCode: e.target.value.toUpperCase() })
                }
                placeholder="BNNK"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono uppercase"
              />
              <span className="text-[10px] text-slate-400">Misal: BNNK, BNNP, KEMENKOMINFO</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Cakupan Penomoran (Counter Scope)
              </label>
              <select
                value={config.scope}
                onChange={(e) => setConfig({ ...config, scope: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
              >
                <option value="per_activity">Per Kegiatan (Setiap kegiatan mulai dari nomor urut awal sendiri)</option>
                <option value="per_classification">Per Klasifikasi (Digabung per kode klasifikasi, e.g. semua RLN)</option>
                <option value="global">Global (Satu urutan terpadu untuk seluruh kegiatan sistem)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Kebijakan Reset Urutan
              </label>
              <select
                value={config.resetPolicy}
                onChange={(e) => setConfig({ ...config, resetPolicy: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
              >
                <option value="never">Tidak Pernah Reset (Nomor terus bertambah)</option>
                <option value="yearly">Reset Tahunan (Mulai dari awal setiap pergantian tahun kalender)</option>
                <option value="monthly">Reset Bulanan (Mulai dari awal setiap tanggal 1 bulan baru)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Guarantee Box */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed space-y-1">
          <p className="font-semibold text-white">Jaminan Keamanan & Konsistensi Dokumen:</p>
          <p>
            1. <strong>Atomic Counter:</strong> Nomor registrasi dialokasikan dengan mekanisme transaksi database eksklusif sehingga dua pendaftar yang mendaftar pada detik yang sama dijamin tidak akan mendapatkan nomor yang sama.
          </p>
          <p>
            2. <strong>Immutability:</strong> Sertifikat yang telah resmi diterbitkan tidak akan terpengaruh jika administrator mengubah format nomor atau kode instansi untuk kegiatan berikutnya.
          </p>
        </div>
      </div>
    </div>
  );
};
