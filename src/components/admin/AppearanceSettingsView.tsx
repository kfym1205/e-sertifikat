import React, { useState } from 'react';
import {
  Palette,
  Upload,
  Image as ImageIcon,
  Check,
  Save,
  RotateCcw,
  Eye,
  Sliders,
  Type,
  MapPin,
  Phone,
  Mail,
  Globe,
  ShieldCheck,
  Trash2,
  Sparkles,
  Layers,
  Layout,
  CheckCircle2,
} from 'lucide-react';
import { AppearanceConfig } from '../../types';
import { storage } from '../../utils/storage';
import { DEFAULT_BNN_LOGO_SVG, THEME_PRESETS } from '../../data/bnnAppearance';
import { Footer } from '../Footer';

interface AppearanceSettingsViewProps {
  onAppearanceUpdated?: (config: AppearanceConfig) => void;
}

export const AppearanceSettingsView: React.FC<AppearanceSettingsViewProps> = ({
  onAppearanceUpdated,
}) => {
  const [config, setConfig] = useState<AppearanceConfig>(
    JSON.parse(JSON.stringify(storage.getAppearance()))
  );
  const [activeTab, setActiveTab] = useState<'identity' | 'header' | 'footer' | 'theme' | 'preview'>('identity');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [fileError, setFileError] = useState('');

  React.useEffect(() => {
    // Refresh with latest shared settings from server on mount
    storage.syncWithServer().catch(() => {});

    const unsub = storage.subscribe(() => {
      setConfig(JSON.parse(JSON.stringify(storage.getAppearance())));
    });
    return unsub;
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, targetField: 'logoUrl' | 'footerLogoUrl') => {
    const file = e.target.files?.[0];
    setFileError('');
    if (!file) return;

    if (!file.type.includes('png') && !file.type.includes('jpeg') && !file.type.includes('svg+xml')) {
      setFileError('Format file harus berupa PNG, JPG, JPEG, atau SVG.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setFileError('Ukuran file maksimal 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (targetField === 'logoUrl') {
        setConfig((prev) => ({ ...prev, logoUrl: result }));
      } else {
        setConfig((prev) => ({
          ...prev,
          footer: { ...prev.footer, footerLogoUrl: result },
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetToBnnDefault = () => {
    if (confirm('Kembalikan logo ke lambang resmi BNN bawaan?')) {
      setConfig((prev) => ({ ...prev, logoUrl: DEFAULT_BNN_LOGO_SVG }));
    }
  };

  const handleApplyPreset = (presetId: string) => {
    const selected = THEME_PRESETS.find((p) => p.id === presetId);
    if (!selected) return;

    setConfig((prev) => ({
      ...prev,
      theme: {
        preset: selected.id as any,
        primaryColor: selected.colors.primaryColor,
        darkColor: selected.colors.darkColor,
        secondaryColor: selected.colors.secondaryColor,
        lightColor: selected.colors.lightColor,
        bgColor: selected.colors.bgColor,
        textColor: selected.colors.textColor,
        mutedColor: selected.colors.mutedColor,
        buttonTextColor: selected.colors.buttonTextColor,
      },
      headerBgColor: selected.colors.darkColor,
      footer: {
        ...prev.footer,
        bgColor: selected.colors.darkColor,
      },
    }));

    // Real-time CSS variable preview
    storage.applyThemeToDom(selected.colors as any);
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    const saved = storage.saveAppearance(config);
    if (onAppearanceUpdated) onAppearanceUpdated(saved);

    setToastMsg('Seluruh konfigurasi identitas e-Sertifikat BNN, Header, Footer, dan Tema berhasil disimpan!');
    setTimeout(() => setToastMsg(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="p-3.5 bg-emerald-950 border border-emerald-700 text-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Pengaturan Tampilan & Identitas Visual e-Sertifikat BNN
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Kustomisasi logo resmi, judul header, informasi alamat kantor dan kontak footer, serta tema palet biru BNN.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-500/20"
        >
          <Save className="w-4 h-4" />
          <span>Simpan Perubahan Tampilan</span>
        </button>
      </div>

      {/* 5 Sub-Tabs Navigation */}
      <div className="flex border-b border-slate-800 gap-2 text-xs font-semibold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('identity')}
          className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'identity'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>1. Identitas Aplikasi</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('header')}
          className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'header'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Layout className="w-4 h-4" />
          <span>2. Header & Logo</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('footer')}
          className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'footer'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>3. Footer & Kontak Kantor</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('theme')}
          className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'theme'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>4. Warna & Tema Biru BNN</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'preview'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>5. Preview Tampilan</span>
        </button>
      </div>

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* SUBTAB 1: IDENTITAS APLIKASI */}
        {activeTab === 'identity' && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 max-w-3xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Identitas Pokok Aplikasi e-Sertifikat BNN</span>
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Aplikasi *
                </label>
                <input
                  type="text"
                  required
                  value={config.appName}
                  onChange={(e) => setConfig({ ...config, appName: e.target.value })}
                  placeholder="e-Sertifikat BNN"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Subjudul / Slogan Lembaga
                </label>
                <input
                  type="text"
                  value={config.appSubtitle}
                  onChange={(e) => setConfig({ ...config, appSubtitle: e.target.value })}
                  placeholder="Badan Narkotika Nasional Republik Indonesia"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Satuan Kerja (Satker) Pelaksana
                </label>
                <input
                  type="text"
                  value={config.footer.unitName}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      footer: { ...config.footer, unitName: e.target.value },
                    })
                  }
                  placeholder="BNN Kabupaten Gorontalo"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: HEADER & LOGO */}
        {activeTab === 'header' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl">
            {/* Header Settings (7 cols) */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layout className="w-4 h-4 text-amber-400" />
                <span>Pengaturan Header & Logo</span>
              </h3>

              {fileError && (
                <div className="p-3 bg-rose-950 border border-rose-800 text-rose-200 text-xs rounded-xl">
                  {fileError}
                </div>
              )}

              {/* Logo Management */}
              <div className="space-y-3 p-4 bg-slate-950 rounded-xl border border-slate-800">
                <label className="block text-xs font-semibold text-slate-200">
                  Logo Resmi BNN (PNG, JPG, SVG)
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-slate-900 rounded-xl border border-slate-700 p-2 flex items-center justify-center shrink-0">
                    <img
                      src={config.logoUrl || DEFAULT_BNN_LOGO_SVG}
                      alt="Logo Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/svg+xml"
                      onChange={(e) => handleLogoUpload(e, 'logoUrl')}
                      className="text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResetToBnnDefault}
                        className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Gunakan Logo BNN Bawaan</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Logo Size Slider */}
                <div className="pt-2">
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>Tinggi Logo Header:</span>
                    <span className="font-mono text-amber-400">{config.logoHeightPx} px</span>
                  </div>
                  <input
                    type="range"
                    min="28"
                    max="68"
                    value={config.logoHeightPx}
                    onChange={(e) =>
                      setConfig({ ...config, logoHeightPx: parseInt(e.target.value, 10) })
                    }
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>

              {/* Title Header text */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Teks Judul Header
                  </label>
                  <input
                    type="text"
                    value={config.headerTitle}
                    onChange={(e) => setConfig({ ...config, headerTitle: e.target.value })}
                    placeholder="e-Sertifikat BNN"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Ukuran Teks Judul
                    </label>
                    <select
                      value={config.headerTitleSize}
                      onChange={(e) =>
                        setConfig({ ...config, headerTitleSize: e.target.value as any })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                    >
                      <option value="sm">Kecil (Small)</option>
                      <option value="md">Sedang (Medium)</option>
                      <option value="lg">Besar (Large - Default)</option>
                      <option value="xl">Sangat Besar (Extra Large)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Gaya Warna Header
                    </label>
                    <select
                      value={config.headerStyle}
                      onChange={(e) =>
                        setConfig({ ...config, headerStyle: e.target.value as any })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                    >
                      <option value="navy_gradient">Biru Gelap BNN Gradasi (#003566)</option>
                      <option value="solid_blue">Biru Utama Solid (#00529B)</option>
                      <option value="clean_white">Putih Bersih Kontemporer (#FFFFFF)</option>
                    </select>
                  </div>
                </div>

                {/* Display switches */}
                <div className="pt-2 space-y-2 border-t border-slate-800">
                  <span className="text-xs font-semibold text-slate-300 block">
                    Penayangan Header:
                  </span>
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={config.showOnPublic}
                      onChange={(e) => setConfig({ ...config, showOnPublic: e.target.checked })}
                      className="rounded border-slate-700 text-amber-500 w-4 h-4"
                    />
                    <span>Tampilkan pada Seluruh Halaman Publik</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={config.showOnAdmin}
                      onChange={(e) => setConfig({ ...config, showOnAdmin: e.target.checked })}
                      className="rounded border-slate-700 text-amber-500 w-4 h-4"
                    />
                    <span>Tampilkan pada Panel Dashboard Administrator</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Live Header Preview Card (5 cols) */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <span>Pratinjau Langsung Header</span>
              </h4>

              <div
                className={`p-4 rounded-xl border border-white/20 transition-all ${
                  config.headerStyle === 'clean_white'
                    ? 'bg-white text-slate-900'
                    : config.headerStyle === 'solid_blue'
                    ? 'bg-[#00529B] text-white'
                    : 'bg-gradient-to-r from-[#003566] via-[#00529B] to-[#003566] text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={config.logoUrl || DEFAULT_BNN_LOGO_SVG}
                    alt="Logo"
                    style={{ height: `${config.logoHeightPx}px` }}
                    className="object-contain"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="font-extrabold tracking-tight"
                        style={{
                          color:
                            config.headerStyle === 'clean_white'
                              ? '#003566'
                              : config.headerTitleColor || '#FFFFFF',
                        }}
                      >
                        {config.headerTitle || 'e-Sertifikat BNN'}
                      </span>
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-400 text-slate-950">
                        RESMI
                      </span>
                    </div>
                    <p className="text-[10px] opacity-80 leading-tight">
                      {config.appSubtitle || 'Badan Narkotika Nasional'}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Pratinjau ini akan langsung digunakan pada navigasi bagian atas tanpa membutuhkan build ulang aplikasi.
              </p>
            </div>
          </div>
        )}

        {/* SUBTAB 3: FOOTER & ALAMAT KANTOR */}
        {activeTab === 'footer' && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 max-w-4xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span>Pengaturan Footer Kustom & Kontak Kantor Satker BNN</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Informasi alamat, telepon, dan tautan resmi. Jika suatu field dikosongkan, sistem <strong>tidak akan menampilkan data dummy</strong>.
                </p>
              </div>
            </div>

            {/* A. Identitas Instansi */}
            <div className="space-y-3 p-4 bg-slate-950 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  A. Identitas Instansi
                </h4>
                <label className="flex items-center gap-1.5 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={config.footer.showIdentity}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        footer: { ...config.footer, showIdentity: e.target.checked },
                      })
                    }
                    className="rounded border-slate-700 text-amber-500 w-4 h-4"
                  />
                  <span>Tampilkan Bagian Ini</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1">Nama Instansi Induk</label>
                  <input
                    type="text"
                    value={config.footer.institutionName}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        footer: { ...config.footer, institutionName: e.target.value },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Nama Unit / Satker</label>
                  <input
                    type="text"
                    value={config.footer.unitName}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        footer: { ...config.footer, unitName: e.target.value },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>
              </div>
            </div>

            {/* B. Alamat Kantor */}
            <div className="space-y-3 p-4 bg-slate-950 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  B. Alamat Kantor Resmi
                </h4>
                <label className="flex items-center gap-1.5 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={config.footer.showAddress}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        footer: { ...config.footer, showAddress: e.target.checked },
                      })
                    }
                    className="rounded border-slate-700 text-amber-500 w-4 h-4"
                  />
                  <span>Tampilkan Alamat Kantor</span>
                </label>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1">Alamat Lengkap (Jalan / Gedung / No.)</label>
                  <input
                    type="text"
                    value={config.footer.address || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        footer: { ...config.footer, address: e.target.value },
                      })
                    }
                    placeholder="Contoh: Jl. Ahmad A. Wahab No. 125"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">Kelurahan / Desa</label>
                    <input
                      type="text"
                      value={config.footer.village || ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          footer: { ...config.footer, village: e.target.value },
                        })
                      }
                      placeholder="Kayubulan"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Kecamatan</label>
                    <input
                      type="text"
                      value={config.footer.district || ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          footer: { ...config.footer, district: e.target.value },
                        })
                      }
                      placeholder="Limboto"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Kabupaten / Kota</label>
                    <input
                      type="text"
                      value={config.footer.city || ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          footer: { ...config.footer, city: e.target.value },
                        })
                      }
                      placeholder="Kabupaten Gorontalo"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Kode Pos</label>
                    <input
                      type="text"
                      value={config.footer.postalCode || ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          footer: { ...config.footer, postalCode: e.target.value },
                        })
                      }
                      placeholder="96211"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* C. Informasi Kontak */}
            <div className="space-y-3 p-4 bg-slate-950 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  C. Informasi Kontak & Jam Pelayanan
                </h4>
                <label className="flex items-center gap-1.5 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={config.footer.showContact}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        footer: { ...config.footer, showContact: e.target.checked },
                      })
                    }
                    className="rounded border-slate-700 text-amber-500 w-4 h-4"
                  />
                  <span>Tampilkan Kontak</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1">Nomor Telepon Kantor</label>
                  <input
                    type="text"
                    value={config.footer.phone || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        footer: { ...config.footer, phone: e.target.value },
                      })
                    }
                    placeholder="(0435) 881234"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Nomor WhatsApp Resmi Satker</label>
                  <input
                    type="text"
                    value={config.footer.whatsapp || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        footer: { ...config.footer, whatsapp: e.target.value },
                      })
                    }
                    placeholder="0812-4567-8910"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Email Resmi Satker</label>
                  <input
                    type="email"
                    value={config.footer.email || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        footer: { ...config.footer, email: e.target.value },
                      })
                    }
                    placeholder="bnnkab_gorontalo@bnn.go.id"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Website Resmi Satker</label>
                  <input
                    type="url"
                    value={config.footer.website || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        footer: { ...config.footer, website: e.target.value },
                      })
                    }
                    placeholder="https://gorontalokab.bnn.go.id"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 mb-1">Jam Pelayanan Pelayanan</label>
                  <input
                    type="text"
                    value={config.footer.serviceHours || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        footer: { ...config.footer, serviceHours: e.target.value },
                      })
                    }
                    placeholder="Senin – Jumat: 08.00 – 16.00 WITA"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>
              </div>
            </div>

            {/* D. Informasi Tambahan & Medsos */}
            <div className="space-y-3 p-4 bg-slate-950 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                D. Teks Hak Cipta & Informasi Tambahan
              </h4>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1">Teks Hak Cipta</label>
                  <input
                    type="text"
                    value={config.footer.copyrightText}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        footer: { ...config.footer, copyrightText: e.target.value },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Informasi Tambahan / Kebijakan Gratis</label>
                  <textarea
                    rows={2}
                    value={config.footer.additionalInfo || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        footer: { ...config.footer, additionalInfo: e.target.value },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-slate-300 mb-1">Instagram Resmi</label>
                    <input
                      type="url"
                      value={config.footer.socialInstagram || ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          footer: { ...config.footer, socialInstagram: e.target.value },
                        })
                      }
                      placeholder="https://instagram.com/bnnk"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Facebook Resmi</label>
                    <input
                      type="url"
                      value={config.footer.socialFacebook || ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          footer: { ...config.footer, socialFacebook: e.target.value },
                        })
                      }
                      placeholder="https://facebook.com/bnnk"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">YouTube Resmi</label>
                    <input
                      type="url"
                      value={config.footer.socialYoutube || ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          footer: { ...config.footer, socialYoutube: e.target.value },
                        })
                      }
                      placeholder="https://youtube.com/@bnnk"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* E. Tata Letak Footer */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Warna Background Footer</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.footer.bgColor}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        footer: { ...config.footer, bgColor: e.target.value },
                      })
                    }
                    className="w-8 h-8 rounded border border-slate-700 bg-slate-900 p-0 cursor-pointer"
                  />
                  <span className="font-mono text-white text-[11px]">{config.footer.bgColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Tata Letak Kolom</label>
                <select
                  value={config.footer.columns}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      footer: {
                        ...config.footer,
                        columns: parseInt(e.target.value, 10) as any,
                      },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                >
                  <option value={2}>2 Kolom</option>
                  <option value={3}>3 Kolom</option>
                  <option value={4}>4 Kolom (Default)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Perataan Teks</label>
                <select
                  value={config.footer.textAlign}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      footer: { ...config.footer, textAlign: e.target.value as any },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                >
                  <option value="left">Rata Kiri (Left)</option>
                  <option value="center">Rata Tengah (Center)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 4: WARNA & TEMA BIRU BNN */}
        {activeTab === 'theme' && (
          <div className="space-y-6 max-w-4xl">
            {/* Theme Presets */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-amber-400" />
                <span>Pilihan Preset Tema Identitas Visual BNN</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {THEME_PRESETS.map((preset) => {
                  const isCurrent = config.theme.preset === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isCurrent
                          ? 'bg-amber-500/10 border-amber-500 shadow-md ring-1 ring-amber-500'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-white">{preset.name}</span>
                        {isCurrent && <Check className="w-4 h-4 text-amber-400" />}
                      </div>

                      <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                        {preset.description}
                      </p>

                      {/* Swatch bars */}
                      <div className="flex h-5 rounded-lg overflow-hidden border border-slate-700">
                        <div
                          className="flex-1"
                          style={{ backgroundColor: preset.colors.primaryColor }}
                          title="Primary"
                        />
                        <div
                          className="flex-1"
                          style={{ backgroundColor: preset.colors.darkColor }}
                          title="Dark"
                        />
                        <div
                          className="flex-1"
                          style={{ backgroundColor: preset.colors.secondaryColor }}
                          title="Secondary"
                        />
                        <div
                          className="flex-1"
                          style={{ backgroundColor: preset.colors.lightColor }}
                          title="Light"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fine-Tuning Palette */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Kustomisasi Nilai Hex Palet Desain</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Biru Utama (#00529B)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.theme.primaryColor}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          theme: { ...config.theme, primaryColor: e.target.value, preset: 'custom' },
                        })
                      }
                      className="w-8 h-8 rounded border border-slate-700 bg-slate-950 p-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.theme.primaryColor}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          theme: { ...config.theme, primaryColor: e.target.value, preset: 'custom' },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Biru Gelap (#003566)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.theme.darkColor}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          theme: { ...config.theme, darkColor: e.target.value, preset: 'custom' },
                        })
                      }
                      className="w-8 h-8 rounded border border-slate-700 bg-slate-950 p-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.theme.darkColor}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          theme: { ...config.theme, darkColor: e.target.value, preset: 'custom' },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Biru Sekunder (#1677C8)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.theme.secondaryColor}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          theme: { ...config.theme, secondaryColor: e.target.value, preset: 'custom' },
                        })
                      }
                      className="w-8 h-8 rounded border border-slate-700 bg-slate-950 p-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.theme.secondaryColor}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          theme: { ...config.theme, secondaryColor: e.target.value, preset: 'custom' },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Background (#F5F8FC)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.theme.bgColor}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          theme: { ...config.theme, bgColor: e.target.value, preset: 'custom' },
                        })
                      }
                      className="w-8 h-8 rounded border border-slate-700 bg-slate-950 p-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.theme.bgColor}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          theme: { ...config.theme, bgColor: e.target.value, preset: 'custom' },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 5: PREVIEW TAMPILAN FOOTER */}
        {activeTab === 'preview' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Pratinjau Footer Sesuai Konfigurasi Terkini</h3>
                <p className="text-xs text-slate-400">
                  Berikut tampilan footer resmi yang akan dilihat pengunjung pada seluruh halaman aplikasi:
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveAll}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md"
              >
                Terapkan & Simpan
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-700 shadow-xl">
              <Footer config={config.footer} appName={config.appName} />
            </div>
          </div>
        )}

        {/* Submit Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-amber-500/20"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Semua Pengaturan Tampilan</span>
          </button>
        </div>
      </form>
    </div>
  );
};
