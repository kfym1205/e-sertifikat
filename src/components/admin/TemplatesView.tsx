import React, { useState } from 'react';
import {
  Layers,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  Eye,
  Info,
  Sliders,
  FileImage,
  RefreshCw,
  X,
  Sparkles,
} from 'lucide-react';
import { CertificateTemplate, PageOrientation } from '../../types';
import { storage } from '../../utils/storage';

export const TemplatesView: React.FC = () => {
  const [templates, setTemplates] = useState<CertificateTemplate[]>(storage.getTemplates());
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<CertificateTemplate | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  React.useEffect(() => {
    const unsub = storage.subscribe(() => {
      setTemplates(storage.getTemplates());
    });
    return unsub;
  }, []);

  // Form state
  const [templateName, setTemplateName] = useState('');
  const [orientation, setOrientation] = useState<PageOrientation>('landscape');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [fileError, setFileError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError('');
    if (!file) return;

    if (!file.type.includes('image/png') && !file.type.includes('image/jpeg') && !file.type.includes('image/svg+xml')) {
      setFileError('Format file harus berupa PNG, JPG, atau SVG.');
      return;
    }

    // Maksimal 5MB
    if (file.size > 5 * 1024 * 1024) {
      setFileError('Ukuran file maksimal 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImagePreview(result);
      if (!templateName) {
        setTemplateName(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePreview) {
      setFileError('Harap unggah gambar template latar belakang.');
      return;
    }

    const isLandscape = orientation === 'landscape';
    const newTemplate: CertificateTemplate = {
      id: `tmpl_${Date.now()}`,
      name: templateName.trim() || `Template Kustom ${new Date().toLocaleDateString('id-ID')}`,
      orientation,
      bgImageUrl: imagePreview,
      widthMm: isLandscape ? 297 : 210,
      heightMm: isLandscape ? 210 : 297,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    storage.saveTemplate(newTemplate);
    setTemplates(storage.getTemplates());
    setIsUploadModalOpen(false);
    resetForm();
    setAlertMsg(`Template "${newTemplate.name}" berhasil diunggah dan disimpan.`);
    setTimeout(() => setAlertMsg(null), 3000);
  };

  const resetForm = () => {
    setTemplateName('');
    setOrientation('landscape');
    setImagePreview('');
    setFileError('');
  };

  const handleDelete = (id: string, name: string) => {
    if (templates.length <= 1) {
      alert('Minimal harus ada satu template yang tersisa di dalam sistem.');
      return;
    }
    if (confirm(`Hapus template "${name}"? Perubahan ini tidak akan mengubah sertifikat yang sudah terbit sebelumnya.`)) {
      storage.deleteTemplate(id);
      setTemplates(storage.getTemplates());
      setAlertMsg(`Template "${name}" berhasil dihapus.`);
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
          <h2 className="text-xl font-black text-white tracking-tight">Manajemen Template Sertifikat Custom</h2>
          <p className="text-xs text-slate-400 mt-1">
            Unggah dan kelola desain latar belakang sertifikat format A4 (210 × 297 mm). Mendukung logo instansi, stempel, kop resmi, dan ornamen.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsUploadModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-500/20"
        >
          <Upload className="w-4 h-4" />
          <span>Unggah Template Baru (PNG/JPG)</span>
        </button>
      </div>

      {/* Guidelines Box */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed space-y-1">
          <p className="font-semibold text-white">Ketentuan Desain Template:</p>
          <p>
            1. Standar ukuran adalah <strong>A4 (210 × 297 mm)</strong>. Anda dapat memilih orientasi <strong>Landscape</strong> atau <strong>Portrait</strong>.
          </p>
          <p>
            2. Desain template latar belakang cukup dibuat di software desain lain (Canva, Photoshop, Figma) lengkap dengan kop, logo, tanda tangan, dan stempel resmi.
          </p>
          <p>
            3. Nama peserta, nomor registrasi, dan tanggal sertifikat akan ditambahkan otomatis di atas template melalui <strong>Editor Posisi Teks</strong>.
          </p>
        </div>
      </div>

      {/* Template Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {templates.map((tmpl) => {
          const isLandscape = tmpl.orientation === 'landscape';
          return (
            <div
              key={tmpl.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:border-slate-700 transition-all flex flex-col group"
            >
              {/* Preview Thumbnail */}
              <div
                onClick={() => setPreviewTemplate(tmpl)}
                className="relative bg-slate-950 p-4 flex items-center justify-center cursor-pointer overflow-hidden border-b border-slate-800"
                style={{ height: '210px' }}
              >
                <div
                  className="relative bg-white shadow-lg rounded-sm overflow-hidden border border-slate-300 transition-transform group-hover:scale-105"
                  style={{
                    aspectRatio: isLandscape ? '297 / 210' : '210 / 297',
                    height: isLandscape ? '160px' : '185px',
                  }}
                >
                  <img
                    src={tmpl.bgImageUrl}
                    alt={tmpl.name}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-transparent transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-1 rounded shadow backdrop-blur-sm transition-opacity flex items-center gap-1">
                      <Eye className="w-3 h-3 text-amber-400" />
                      Pratinjau Penuh
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Meta */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 uppercase">
                      {tmpl.orientation} (A4)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      v{tmpl.version || 1}.0
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white leading-snug">{tmpl.name}</h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Dimensi: {tmpl.widthMm} × {tmpl.heightMm} mm
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => setPreviewTemplate(tmpl)}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-semibold"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Pratinjau</span>
                  </button>

                  <button
                    onClick={() => handleDelete(tmpl.id, tmpl.name)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    title="Hapus Template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL UPLOAD TEMPLATE */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden my-auto">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-800/80">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Unggah Template Sertifikat Kustom</h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="p-5 space-y-4">
              {fileError && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl">
                  {fileError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Template *
                </label>
                <input
                  type="text"
                  required
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Misal: Template Sertifikat BNNK 2026"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Orientasi Halaman A4
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOrientation('landscape')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                      orientation === 'landscape'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    Landscape (297 × 210 mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('portrait')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                      orientation === 'portrait'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    Portrait (210 × 297 mm)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  File Gambar Latar Belakang (PNG/JPG) *
                </label>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/svg+xml"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                />
              </div>

              {/* Thumbnail Preview */}
              {imagePreview && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center">
                  <span className="text-[11px] font-semibold text-slate-400 mb-2">Pratinjau File:</span>
                  <div
                    className="relative bg-white rounded shadow border border-slate-300 overflow-hidden"
                    style={{
                      aspectRatio: orientation === 'landscape' ? '297 / 210' : '210 / 297',
                      maxHeight: '140px',
                    }}
                  >
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/20"
                >
                  Simpan Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULLSCREEN PREVIEW MODAL */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-4 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">{previewTemplate.name}</h3>
                <p className="text-xs text-slate-400">
                  Format: {previewTemplate.orientation.toUpperCase()} A4 ({previewTemplate.widthMm} × {previewTemplate.heightMm} mm)
                </p>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-950 rounded-xl my-3">
              <div
                className="relative bg-white shadow-2xl rounded border border-slate-400 overflow-hidden"
                style={{
                  aspectRatio: previewTemplate.orientation === 'landscape' ? '297 / 210' : '210 / 297',
                  maxWidth: previewTemplate.orientation === 'landscape' ? '760px' : '520px',
                  width: '100%',
                }}
              >
                <img
                  src={previewTemplate.bgImageUrl}
                  alt={previewTemplate.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
