import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Move,
  Save,
  X,
  Sliders,
  Mail,
  FileText,
  Clock,
  Shield,
} from 'lucide-react';
import { Activity } from '../../types';
import { storage } from '../../utils/storage';
import { DEFAULT_LANDSCAPE_LAYOUT } from '../../data/initialData';

interface ActivitiesViewProps {
  onNavigate: (view: string, extraParam?: string) => void;
}

export const ActivitiesView: React.FC<ActivitiesViewProps> = ({ onNavigate }) => {
  const [activities, setActivities] = useState<Activity[]>(storage.getActivities());
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'number' | 'form' | 'email'>('general');
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const templates = storage.getTemplates();
  const classifications = storage.getClassifications();

  const handleOpenAdd = () => {
    const newActivity: Activity = {
      id: `act_${Date.now()}`,
      slug: `kegiatan-${Date.now().toString(36)}`,
      name: '',
      description: '',
      certificateType: 'Sertifikat Partisipasi',
      templateId: templates[0]?.id || 'tmpl_royal_gold_landscape',
      layoutElements: JSON.parse(JSON.stringify(DEFAULT_LANDSCAPE_LAYOUT)),
      registrationNumberConfig: {
        id: `num_cfg_${Date.now()}`,
        name: 'Format Nomor Standar',
        pattern: '{JENIS}/{NOMOR_URUT}/{KLASIFIKASI}/{UNIT}/{BULAN_ROMAWI}/{TAHUN}/{INSTANSI}',
        separator: '/',
        digitCount: 2,
        startNumber: 1,
        scope: 'per_activity',
        resetPolicy: 'yearly',
        docTypeCode: 'ST',
        classificationCode: classifications[0]?.code || 'RLN',
        unitCode: 'KA',
        institutionCode: 'BNNK',
        monthFormat: 'roman',
      },
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isActive: true,
      isArchived: false,
      duplicatePolicy: 'disallow',
      dateMode: 'server_today',
      timezone: 'Asia/Makassar',
      formSettings: {
        requirePhone: true,
        requireInstitution: true,
        requireCustomField: false,
        customFieldLabel: 'Pekerjaan / Jabatan',
      },
      emailSettings: {
        subject: 'Sertifikat Resmi Kegiatan: [Nama Kegiatan]',
        senderName: 'Panitia Pelaksana',
        attachPdf: true,
        bodyTemplate: `Yth. [Nama Peserta],

Terima kasih atas partisipasi aktif Anda dalam kegiatan [Nama Kegiatan].

Sertifikat Anda telah resmi diterbitkan dengan rincian:
• Nama: [Nama Peserta]
• Nomor Registrasi: [Nomor Registrasi]
• Tanggal Penerbitan: [Tanggal Sertifikat]

Sertifikat PDF resmi terlampir pada email ini. Keaslian dokumen dapat diverifikasi secara daring melalui:
[Tautan Verifikasi]

Salam hormat,
Panitia [Nama Kegiatan]`,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setEditingActivity(newActivity);
    setActiveTab('general');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (act: Activity) => {
    setEditingActivity(JSON.parse(JSON.stringify(act)));
    setActiveTab('general');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity) return;

    if (!editingActivity.name.trim()) {
      alert('Nama kegiatan wajib diisi.');
      return;
    }

    // Buat slug otomatis jika kosong
    if (!editingActivity.slug) {
      editingActivity.slug = editingActivity.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    }

    storage.saveActivity(editingActivity);
    setActivities(storage.getActivities());
    setIsModalOpen(false);
    setEditingActivity(null);
    setAlertMsg('Konfigurasi kegiatan berhasil disimpan.');
    setTimeout(() => setAlertMsg(null), 3000);
  };

  const handleToggleStatus = (act: Activity) => {
    const updated = { ...act, isActive: !act.isActive };
    storage.saveActivity(updated);
    setActivities(storage.getActivities());
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus kegiatan "${name}"?`)) {
      storage.deleteActivity(id);
      setActivities(storage.getActivities());
      setAlertMsg(`Kegiatan "${name}" berhasil dihapus.`);
      setTimeout(() => setAlertMsg(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {alertMsg && (
        <div className="p-3 bg-emerald-950 border border-emerald-700 text-emerald-200 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{alertMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Manajemen Kegiatan</h2>
          <p className="text-xs text-slate-400 mt-1">
            Kelola kegiatan, masa pendaftaran peserta, format penomoran, template, dan template email.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kegiatan Baru</span>
        </button>
      </div>

      {/* Activities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activities.map((act) => {
          const tmpl = templates.find((t) => t.id === act.templateId) || templates[0];
          return (
            <div
              key={act.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          act.isActive
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {act.isActive ? 'Pendaftaran Buka' : 'Ditutup'}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {act.certificateType}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white leading-snug">{act.name}</h3>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                  {act.description || 'Tidak ada deskripsi kegiatan.'}
                </p>

                {/* Info Pills */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Format Nomor:</span>
                    <span className="font-mono text-amber-300 text-[11px] font-semibold">
                      {act.registrationNumberConfig.pattern}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Template Aktif:</span>
                    <span className="text-slate-200 font-medium truncate max-w-[180px]">
                      {tmpl?.name || 'Template Standar'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Masa Pendaftaran:</span>
                    <span className="text-slate-300 font-mono text-[11px]">
                      {act.startDate} s/d {act.endDate}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Zona Waktu Tanggal:</span>
                    <span className="text-slate-300 text-[11px]">
                      {act.timezone} ({act.dateMode === 'server_today' ? 'Hari Ini Otomatis' : 'Manual'})
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleStatus(act)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      act.isActive
                        ? 'bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-900/60'
                        : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60'
                    }`}
                  >
                    {act.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button
                    onClick={() => onNavigate('admin_editor', act.id)}
                    title="Buka Visual Editor Layout Teks"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition-colors"
                  >
                    <Move className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onNavigate('public_register', act.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                    <span>Form</span>
                  </button>
                  <button
                    onClick={() => handleOpenEdit(act)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                    title="Ubah Konfigurasi"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(act.id, act.name)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
                    title="Hapus Kegiatan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL EDIT / TAMBAH KEGIATAN */}
      {isModalOpen && editingActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-800/80 shrink-0">
              <h3 className="text-base font-bold text-white">
                {editingActivity.name ? `Edit: ${editingActivity.name}` : 'Tambah Kegiatan Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950 px-4 gap-2 text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('general')}
                className={`py-3 px-3 border-b-2 transition-all ${
                  activeTab === 'general'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                1. Informasi & Template
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('number')}
                className={`py-3 px-3 border-b-2 transition-all ${
                  activeTab === 'number'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                2. Format Nomor & Tanggal
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className={`py-3 px-3 border-b-2 transition-all ${
                  activeTab === 'form'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                3. Formulir Pendaftaran
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('email')}
                className={`py-3 px-3 border-b-2 transition-all ${
                  activeTab === 'email'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                4. Konfigurasi Email
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* TAB 1: INFORMASI & TEMPLATE */}
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nama Kegiatan *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingActivity.name}
                      onChange={(e) => setEditingActivity({ ...editingActivity, name: e.target.value })}
                      placeholder="Contoh: Pelatihan Relawan Anti Narkoba 2026"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Deskripsi Kegiatan
                    </label>
                    <textarea
                      rows={3}
                      value={editingActivity.description}
                      onChange={(e) =>
                        setEditingActivity({ ...editingActivity, description: e.target.value })
                      }
                      placeholder="Jelaskan tujuan dan sasaran kegiatan..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Jenis Sertifikat
                      </label>
                      <input
                        type="text"
                        value={editingActivity.certificateType}
                        onChange={(e) =>
                          setEditingActivity({ ...editingActivity, certificateType: e.target.value })
                        }
                        placeholder="Contoh: Sertifikat Kelulusan"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Pilihan Template Latar Belakang
                      </label>
                      <select
                        value={editingActivity.templateId}
                        onChange={(e) =>
                          setEditingActivity({ ...editingActivity, templateId: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.orientation.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Tanggal Mulai Pendaftaran
                      </label>
                      <input
                        type="date"
                        value={editingActivity.startDate}
                        onChange={(e) =>
                          setEditingActivity({ ...editingActivity, startDate: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Tanggal Berakhir Pendaftaran
                      </label>
                      <input
                        type="date"
                        value={editingActivity.endDate}
                        onChange={(e) =>
                          setEditingActivity({ ...editingActivity, endDate: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="act_active"
                      checked={editingActivity.isActive}
                      onChange={(e) =>
                        setEditingActivity({ ...editingActivity, isActive: e.target.checked })
                      }
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 w-4 h-4 bg-slate-950"
                    />
                    <label htmlFor="act_active" className="text-xs text-slate-200 font-medium">
                      Status Pendaftaran Aktif (Dapat diakses oleh publik)
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 2: FORMAT NOMOR REGISTRASI & TANGGAL */}
              {activeTab === 'number' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Pola Format Nomor Registrasi
                    </label>
                    <input
                      type="text"
                      value={editingActivity.registrationNumberConfig.pattern}
                      onChange={(e) =>
                        setEditingActivity({
                          ...editingActivity,
                          registrationNumberConfig: {
                            ...editingActivity.registrationNumberConfig,
                            pattern: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 font-mono text-xs text-amber-300 focus:outline-none focus:border-amber-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Placeholder: {'{JENIS}'}, {'{NOMOR_URUT}'}, {'{KLASIFIKASI}'}, {'{UNIT}'}, {'{BULAN_ROMAWI}'}, {'{TAHUN}'}, {'{INSTANSI}'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Kode Dokumen
                      </label>
                      <input
                        type="text"
                        value={editingActivity.registrationNumberConfig.docTypeCode}
                        onChange={(e) =>
                          setEditingActivity({
                            ...editingActivity,
                            registrationNumberConfig: {
                              ...editingActivity.registrationNumberConfig,
                              docTypeCode: e.target.value.toUpperCase(),
                            },
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Kode Klasifikasi
                      </label>
                      <select
                        value={editingActivity.registrationNumberConfig.classificationCode}
                        onChange={(e) =>
                          setEditingActivity({
                            ...editingActivity,
                            registrationNumberConfig: {
                              ...editingActivity.registrationNumberConfig,
                              classificationCode: e.target.value,
                            },
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        {classifications.map((c) => (
                          <option key={c.id} value={c.code}>
                            {c.code} - {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Kode Unit/Wilayah
                      </label>
                      <input
                        type="text"
                        value={editingActivity.registrationNumberConfig.unitCode}
                        onChange={(e) =>
                          setEditingActivity({
                            ...editingActivity,
                            registrationNumberConfig: {
                              ...editingActivity.registrationNumberConfig,
                              unitCode: e.target.value.toUpperCase(),
                            },
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Kode Instansi
                      </label>
                      <input
                        type="text"
                        value={editingActivity.registrationNumberConfig.institutionCode}
                        onChange={(e) =>
                          setEditingActivity({
                            ...editingActivity,
                            registrationNumberConfig: {
                              ...editingActivity.registrationNumberConfig,
                              institutionCode: e.target.value.toUpperCase(),
                            },
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Penetapan Tanggal Sertifikat
                      </label>
                      <select
                        value={editingActivity.dateMode}
                        onChange={(e) =>
                          setEditingActivity({
                            ...editingActivity,
                            dateMode: e.target.value as any,
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="server_today">Otomatis Tanggal Hari Ini (Server Asia/Makassar)</option>
                        <option value="manual">Manual (Tentukan Tanggal Tetap)</option>
                      </select>
                    </div>

                    {editingActivity.dateMode === 'manual' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Tanggal Tertulis pada Sertifikat
                        </label>
                        <input
                          type="date"
                          value={editingActivity.manualDate || ''}
                          onChange={(e) =>
                            setEditingActivity({ ...editingActivity, manualDate: e.target.value })
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Kebijakan Pendaftaran Ganda (Email Sama)
                    </label>
                    <select
                      value={editingActivity.duplicatePolicy}
                      onChange={(e) =>
                        setEditingActivity({
                          ...editingActivity,
                          duplicatePolicy: e.target.value as any,
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="disallow">Tolak / Jangan izinkan pendaftaran dengan email yang sama</option>
                      <option value="reissue">Kembalikan sertifikat lama yang sudah terbit (Idempotent)</option>
                      <option value="allow">Izinkan pendaftaran ulang dan buat nomor baru</option>
                    </select>
                  </div>
                </div>
              )}

              {/* TAB 3: FORMULIR PENDAFTARAN */}
              {activeTab === 'form' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400">
                    Nama Lengkap dan Alamat Email merupakan field wajib secara default. Anda dapat mengaktifkan field pelengkap berikut:
                  </p>

                  <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <label className="flex items-center gap-2 text-xs text-slate-200">
                      <input
                        type="checkbox"
                        checked={editingActivity.formSettings.requireInstitution}
                        onChange={(e) =>
                          setEditingActivity({
                            ...editingActivity,
                            formSettings: {
                              ...editingActivity.formSettings,
                              requireInstitution: e.target.checked,
                            },
                          })
                        }
                        className="rounded border-slate-700 text-amber-500 w-4 h-4"
                      />
                      <span>Tampilkan & Wajibkan Field Asal Instansi / Organisasi</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-200">
                      <input
                        type="checkbox"
                        checked={editingActivity.formSettings.requirePhone}
                        onChange={(e) =>
                          setEditingActivity({
                            ...editingActivity,
                            formSettings: {
                              ...editingActivity.formSettings,
                              requirePhone: e.target.checked,
                            },
                          })
                        }
                        className="rounded border-slate-700 text-amber-500 w-4 h-4"
                      />
                      <span>Tampilkan Field Nomor WhatsApp / Telepon</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-200">
                      <input
                        type="checkbox"
                        checked={editingActivity.formSettings.requireCustomField}
                        onChange={(e) =>
                          setEditingActivity({
                            ...editingActivity,
                            formSettings: {
                              ...editingActivity.formSettings,
                              requireCustomField: e.target.checked,
                            },
                          })
                        }
                        className="rounded border-slate-700 text-amber-500 w-4 h-4"
                      />
                      <span>Aktifkan Field Kustom Tambahan</span>
                    </label>

                    {editingActivity.formSettings.requireCustomField && (
                      <div className="pt-2 pl-6">
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Label Field Kustom:
                        </label>
                        <input
                          type="text"
                          value={editingActivity.formSettings.customFieldLabel || ''}
                          onChange={(e) =>
                            setEditingActivity({
                              ...editingActivity,
                              formSettings: {
                                ...editingActivity.formSettings,
                                customFieldLabel: e.target.value,
                              },
                            })
                          }
                          placeholder="Misal: Jabatan / Pekerjaan / Tempat Lahir"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: EMAIL SETTINGS */}
              {activeTab === 'email' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nama Pengirim Email
                    </label>
                    <input
                      type="text"
                      value={editingActivity.emailSettings.senderName}
                      onChange={(e) =>
                        setEditingActivity({
                          ...editingActivity,
                          emailSettings: {
                            ...editingActivity.emailSettings,
                            senderName: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Subjek Email
                    </label>
                    <input
                      type="text"
                      value={editingActivity.emailSettings.subject}
                      onChange={(e) =>
                        setEditingActivity({
                          ...editingActivity,
                          emailSettings: {
                            ...editingActivity.emailSettings,
                            subject: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Isi Pesan Email (Template)
                    </label>
                    <textarea
                      rows={6}
                      value={editingActivity.emailSettings.bodyTemplate}
                      onChange={(e) =>
                        setEditingActivity({
                          ...editingActivity,
                          emailSettings: {
                            ...editingActivity.emailSettings,
                            bodyTemplate: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono leading-relaxed"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Variabel dinamis: [Nama Peserta], [Nama Kegiatan], [Nomor Registrasi], [Tanggal Sertifikat], [Tautan Verifikasi]
                    </p>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-slate-200">
                    <input
                      type="checkbox"
                      checked={editingActivity.emailSettings.attachPdf}
                      onChange={(e) =>
                        setEditingActivity({
                          ...editingActivity,
                          emailSettings: {
                            ...editingActivity.emailSettings,
                            attachPdf: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-slate-700 text-amber-500 w-4 h-4"
                    />
                    <span>Lampirkan dokumen PDF A4 langsung pada email</span>
                  </label>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/20"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Konfigurasi Kegiatan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
