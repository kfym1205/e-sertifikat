import React, { useState, useRef, useEffect } from 'react';
import {
  Move,
  Save,
  RotateCcw,
  Download,
  Eye,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  CheckCircle2,
  Hash,
  Calendar,
  QrCode,
  Sparkles,
  Grid,
} from 'lucide-react';
import { Activity, LayoutElement } from '../../types';
import { storage } from '../../utils/storage';
import { downloadCertificatePdf } from '../../utils/pdfGenerator';
import { DEFAULT_LANDSCAPE_LAYOUT } from '../../data/initialData';

interface VisualEditorViewProps {
  initialActivityId?: string;
}

const FONT_OPTIONS = [
  { name: 'Playfair Display', label: 'Playfair Display (Klasik & Elegan Serif)' },
  { name: 'Cinzel', label: 'Cinzel (Formal Romawi & Kepresidenan)' },
  { name: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans (Modern & Bersih)' },
  { name: 'Inter', label: 'Inter (Standar Profesional)' },
  { name: 'Merriweather', label: 'Merriweather (Serif Hangat)' },
  { name: 'Great Vibes', label: 'Great Vibes (Kaligrafi Eksklusif Cursive)' },
  { name: 'Alex Brush', label: 'Alex Brush (Tanda Tangan Artistik)' },
];

export const VisualEditorView: React.FC<VisualEditorViewProps> = ({ initialActivityId }) => {
  const activities = storage.getActivities();
  const [selectedActivityId, setSelectedActivityId] = useState<string>(
    initialActivityId || activities[0]?.id || ''
  );

  const currentActivity = activities.find((a) => a.id === selectedActivityId) || activities[0];
  const templates = storage.getTemplates();
  const currentTemplate =
    templates.find((t) => t.id === currentActivity?.templateId) || templates[0];

  const [elements, setElements] = useState<LayoutElement[]>(
    currentActivity?.layoutElements
      ? JSON.parse(JSON.stringify(currentActivity.layoutElements))
      : JSON.parse(JSON.stringify(DEFAULT_LANDSCAPE_LAYOUT))
  );

  const [selectedElementId, setSelectedElementId] = useState<string>('participant_name');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [testNameMode, setTestNameMode] = useState<'standard' | 'long' | 'custom'>('standard');
  const [customTestName, setCustomTestName] = useState<string>('Ir. H. Muhammad Zulkifli, S.T., M.Eng.');
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  const isLandscape = currentTemplate?.orientation !== 'portrait';
  const widthMm = isLandscape ? 297 : 210;
  const heightMm = isLandscape ? 210 : 297;

  // Sync state if activity selector changes
  useEffect(() => {
    if (currentActivity?.layoutElements) {
      setElements(JSON.parse(JSON.stringify(currentActivity.layoutElements)));
    }
  }, [selectedActivityId]);

  const activeElement = elements.find((e) => e.id === selectedElementId) || elements[0];

  const updateActiveElement = (updates: Partial<LayoutElement>) => {
    setElements((prev) =>
      prev.map((el) => (el.id === selectedElementId ? { ...el, ...updates } : el))
    );
  };

  // Dragging logic converting screen pixels to exact A4 millimeters
  const handleMouseDown = (elId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedElementId(elId);
    setIsDragging(true);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !canvasRef.current || !activeElement) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const pixelX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const pixelY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    const newXMm = Math.round((pixelX / rect.width) * widthMm * 10) / 10;
    const newYMm = Math.round((pixelY / rect.height) * heightMm * 10) / 10;

    updateActiveElement({ xMm: newXMm, yMm: newYMm });
  };

  const handleMouseUp = () => {
    if (isDragging) setIsDragging(false);
  };

  const handleSave = () => {
    if (!currentActivity) return;
    const updated = {
      ...currentActivity,
      layoutElements: elements,
    };
    storage.saveActivity(updated);
    storage.logAudit(
      'UPDATE_LAYOUT',
      'template',
      currentActivity.id,
      `Memperbarui koordinat layout sertifikat untuk kegiatan "${currentActivity.name}"`
    );
    setAlertMsg('Konfigurasi posisi elemen teks sertifikat berhasil disimpan!');
    setTimeout(() => setAlertMsg(null), 3000);
  };

  const handleResetDefault = () => {
    if (confirm('Kembalikan konfigurasi posisi ke pengaturan standar awal?')) {
      setElements(JSON.parse(JSON.stringify(DEFAULT_LANDSCAPE_LAYOUT)));
      setAlertMsg('Koordinat dikembalikan ke nilai default.');
      setTimeout(() => setAlertMsg(null), 3000);
    }
  };

  const handleTestDownload = async () => {
    const testName =
      testNameMode === 'standard'
        ? 'AHMAD FAUZAN SYAHPUTRA, S.Sos.'
        : testNameMode === 'long'
        ? 'DR. HJ. SITI NURHALIZA KUSUMAWAHYUNI, S.KOM., M.ENG.'
        : customTestName;

    await downloadCertificatePdf(
      currentTemplate,
      elements,
      {
        participantName: testName,
        registrationNumber: 'ST/01/RLN/KA/X/2026/BNNK',
        issueDate: '21 Oktober 2026',
        verificationId: 'v_test_sample',
        extraText: elements.find((e) => e.id === 'extra_text')?.sampleValue,
      },
      'Test_Preview_Sertifikat.pdf'
    );
  };

  const getDisplaySampleText = (el: LayoutElement) => {
    if (el.id === 'participant_name') {
      const base =
        testNameMode === 'standard'
          ? 'AHMAD FAUZAN SYAHPUTRA, S.Sos.'
          : testNameMode === 'long'
          ? 'DR. HJ. SITI NURHALIZA KUSUMAWAHYUNI, S.KOM., M.ENG.'
          : customTestName;

      return el.textTransform === 'uppercase'
        ? base.toUpperCase()
        : el.textTransform === 'capitalize'
        ? base
            .toLowerCase()
            .split(' ')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ')
        : base;
    }
    if (el.id === 'reg_number') return 'ST/01/RLN/KA/X/2026/BNNK';
    if (el.id === 'cert_date') return 'Gorontalo, 21 Oktober 2026';
    if (el.id === 'extra_text') return el.sampleValue || 'Atas partisipasi aktif dalam kegiatan';
    return '';
  };

  return (
    <div className="space-y-6" onMouseUp={handleMouseUp}>
      {/* Toast Alert */}
      {alertMsg && (
        <div className="p-3 bg-emerald-950 border border-emerald-700 text-emerald-200 rounded-xl text-xs flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{alertMsg}</span>
        </div>
      )}

      {/* Top Bar & Activity Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Move className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Editor Posisi Teks Sertifikat Presisi
            </h2>
            <p className="text-xs text-slate-400">
              Geser elemen di kanvas atau sesuaikan koordinat milimeter (mm) secara akurat.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
            <span className="text-slate-400 font-semibold">Kegiatan:</span>
            <select
              value={selectedActivityId}
              onChange={(e) => setSelectedActivityId(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none"
            >
              {activities.map((a) => (
                <option key={a.id} value={a.id} className="bg-slate-900 text-white">
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              showGrid
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
            title="Tampilkan / Sembunyikan Grid Milimeter"
          >
            <Grid className="w-4 h-4" />
            <span className="hidden sm:inline">Grid mm</span>
          </button>

          <button
            onClick={handleTestDownload}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
            title="Download PDF Hasil Kalibrasi Posisi"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Tes PDF A4</span>
          </button>

          <button
            onClick={handleResetDefault}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition-colors"
            title="Reset ke Default"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-500/20"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Posisi</span>
          </button>
        </div>
      </div>

      {/* Main Workspace: Left Controls (1/3), Right Canvas (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Column */}
        <div className="lg:col-span-4 space-y-4">
          {/* Element Selection Tabs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2 px-1">
              Pilih Elemen yang Diedit
            </span>
            <div className="space-y-1">
              {elements.map((el) => {
                const isSelected = el.id === selectedElementId;
                return (
                  <button
                    key={el.id}
                    onClick={() => setSelectedElementId(el.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {el.id === 'participant_name' && <Type className="w-4 h-4" />}
                      {el.id === 'reg_number' && <Hash className="w-4 h-4" />}
                      {el.id === 'cert_date' && <Calendar className="w-4 h-4" />}
                      {el.id === 'qr_code' && <QrCode className="w-4 h-4" />}
                      {el.id === 'extra_text' && <Sparkles className="w-4 h-4" />}
                      <span>{el.label}</span>
                    </div>
                    <span className="text-[10px] opacity-75 font-mono">
                      X:{el.xMm} Y:{el.yMm}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Precision Settings Card */}
          {activeElement && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <span>Pengaturan: {activeElement.label}</span>
                </h3>
                <label className="flex items-center gap-1.5 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={activeElement.enabled}
                    onChange={(e) => updateActiveElement({ enabled: e.target.checked })}
                    className="rounded border-slate-700 text-amber-500 w-4 h-4"
                  />
                  <span>Tampilkan</span>
                </label>
              </div>

              {/* Coordinates X & Y */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>Posisi X (Horizontal)</span>
                    <span className="text-amber-400 font-mono">{activeElement.xMm} mm</span>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={widthMm}
                    value={activeElement.xMm}
                    onChange={(e) => updateActiveElement({ xMm: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                  <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                    <button
                      type="button"
                      onClick={() => updateActiveElement({ xMm: Math.max(0, activeElement.xMm - 1) })}
                      className="hover:text-slate-300"
                    >
                      -1 mm
                    </button>
                    <button
                      type="button"
                      onClick={() => updateActiveElement({ xMm: widthMm / 2 })}
                      className="text-amber-400 hover:underline"
                    >
                      Tengah ({widthMm / 2}mm)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateActiveElement({ xMm: Math.min(widthMm, activeElement.xMm + 1) })}
                      className="hover:text-slate-300"
                    >
                      +1 mm
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>Posisi Y (Vertikal)</span>
                    <span className="text-amber-400 font-mono">{activeElement.yMm} mm</span>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={heightMm}
                    value={activeElement.yMm}
                    onChange={(e) => updateActiveElement({ yMm: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                  <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                    <button
                      type="button"
                      onClick={() => updateActiveElement({ yMm: Math.max(0, activeElement.yMm - 1) })}
                      className="hover:text-slate-300"
                    >
                      -1 mm
                    </button>
                    <button
                      type="button"
                      onClick={() => updateActiveElement({ yMm: Math.min(heightMm, activeElement.yMm + 1) })}
                      className="hover:text-slate-300"
                    >
                      +1 mm
                    </button>
                  </div>
                </div>
              </div>

              {/* Typography controls (for text elements) */}
              {activeElement.id !== 'qr_code' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Ukuran Font (pt)
                      </label>
                      <input
                        type="number"
                        min="8"
                        max="72"
                        value={activeElement.fontSizePt}
                        onChange={(e) =>
                          updateActiveElement({ fontSizePt: parseInt(e.target.value) || 12 })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Ketebalan Font
                      </label>
                      <select
                        value={activeElement.fontWeight}
                        onChange={(e) =>
                          updateActiveElement({ fontWeight: e.target.value as any })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                      >
                        <option value="normal">Normal (400)</option>
                        <option value="500">Medium (500)</option>
                        <option value="600">Semi Bold (600)</option>
                        <option value="bold">Bold (700)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Jenis Font (Font Family)
                    </label>
                    <select
                      value={activeElement.fontFamily}
                      onChange={(e) => updateActiveElement({ fontFamily: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f.name} value={f.name}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Warna Teks
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={activeElement.color}
                          onChange={(e) => updateActiveElement({ color: e.target.value })}
                          className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-950 cursor-pointer p-0"
                        />
                        <input
                          type="text"
                          value={activeElement.color}
                          onChange={(e) => updateActiveElement({ color: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Perataan Teks
                      </label>
                      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-700">
                        <button
                          type="button"
                          onClick={() => updateActiveElement({ textAlign: 'left' })}
                          className={`flex-1 py-1 flex items-center justify-center rounded-lg ${
                            activeElement.textAlign === 'left'
                              ? 'bg-amber-500 text-slate-950'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateActiveElement({ textAlign: 'center' })}
                          className={`flex-1 py-1 flex items-center justify-center rounded-lg ${
                            activeElement.textAlign === 'center'
                              ? 'bg-amber-500 text-slate-950'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <AlignCenter className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateActiveElement({ textAlign: 'right' })}
                          className={`flex-1 py-1 flex items-center justify-center rounded-lg ${
                            activeElement.textAlign === 'right'
                              ? 'bg-amber-500 text-slate-950'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <AlignRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {activeElement.id === 'participant_name' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Format Kapitalisasi Nama
                      </label>
                      <select
                        value={activeElement.textTransform || 'none'}
                        onChange={(e) =>
                          updateActiveElement({ textTransform: e.target.value as any })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                      >
                        <option value="uppercase">HURUF BESAR SEMUA (UPPERCASE)</option>
                        <option value="capitalize">Huruf Besar Tiap Kata (Title Case)</option>
                        <option value="none">Sesuai Input Peserta (Aslinya)</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Batas Maksimal Lebar Area Teks (mm)
                    </label>
                    <input
                      type="number"
                      min="50"
                      max={widthMm}
                      value={activeElement.maxWidthMm || 240}
                      onChange={(e) =>
                        updateActiveElement({ maxWidthMm: parseInt(e.target.value) || 240 })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </>
              )}

              {/* Special options for QR Code */}
              {activeElement.id === 'qr_code' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Ukuran QR Code (mm)
                  </label>
                  <input
                    type="number"
                    min="14"
                    max="45"
                    value={activeElement.fontSizePt || 20}
                    onChange={(e) =>
                      updateActiveElement({ fontSizePt: parseInt(e.target.value) || 20 })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ukuran rekomendasi 20-25 mm agar mudah dipindai oleh kamera HP.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Test Data Switcher */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <span className="text-xs font-bold text-white block">Uji Contoh Nama Peserta</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setTestNameMode('standard')}
                className={`py-1.5 px-2.5 rounded-xl border text-[11px] font-medium transition-colors ${
                  testNameMode === 'standard'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-950 border-slate-700 text-slate-400'
                }`}
              >
                Nama Standar
              </button>
              <button
                type="button"
                onClick={() => setTestNameMode('long')}
                className={`py-1.5 px-2.5 rounded-xl border text-[11px] font-medium transition-colors ${
                  testNameMode === 'long'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-950 border-slate-700 text-slate-400'
                }`}
              >
                Nama Panjang & Gelar
              </button>
            </div>
          </div>
        </div>

        {/* Canvas Column */}
        <div className="lg:col-span-8 space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">
                Kanvas A4 {currentTemplate?.orientation?.toUpperCase()} ({widthMm} × {heightMm} mm)
              </span>
              <span>Klik & geser elemen teks langsung dengan kursor</span>
            </div>

            {/* Interactive Certificate Canvas */}
            <div
              ref={canvasRef}
              onMouseMove={handleCanvasMouseMove}
              className="relative bg-white shadow-2xl rounded-sm overflow-hidden border border-slate-400 mx-auto select-none cursor-crosshair"
              style={{
                aspectRatio: isLandscape ? '297 / 210' : '210 / 297',
                width: '100%',
                maxHeight: '680px',
              }}
            >
              {/* Background Template */}
              {currentTemplate?.bgImageUrl && (
                <img
                  src={currentTemplate.bgImageUrl}
                  alt="Template"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
              )}

              {/* Grid overlay */}
              {showGrid && (
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, #64748b 1px, transparent 1px), linear-gradient(to bottom, #64748b 1px, transparent 1px)',
                    backgroundSize: `${(10 / widthMm) * 100}% ${(10 / heightMm) * 100}%`,
                  }}
                />
              )}

              {/* Draggable Elements */}
              {elements.map((el) => {
                if (!el.enabled) return null;
                const isSelected = el.id === selectedElementId;
                const leftPercent = (el.xMm / widthMm) * 100;
                const topPercent = (el.yMm / heightMm) * 100;
                const sampleText = getDisplaySampleText(el);

                if (el.id === 'qr_code') {
                  return (
                    <div
                      key={el.id}
                      onMouseDown={(e) => handleMouseDown(el.id, e)}
                      className={`absolute z-20 cursor-move p-1 rounded transition-shadow ${
                        isSelected
                          ? 'ring-2 ring-amber-500 shadow-xl bg-amber-500/10'
                          : 'hover:ring-1 hover:ring-blue-400'
                      }`}
                      style={{
                        left: `${leftPercent}%`,
                        top: `${topPercent}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <div className="bg-white p-1 rounded border border-slate-300 shadow-sm flex flex-col items-center">
                        <div className="w-12 h-12 bg-slate-900 rounded flex items-center justify-center text-[7px] text-white font-mono text-center p-1">
                          QR VERIFIKASI
                        </div>
                      </div>
                      {isSelected && (
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-bold text-[9px] px-1.5 py-0.2 rounded shadow whitespace-nowrap">
                          {el.xMm}mm, {el.yMm}mm
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => handleMouseDown(el.id, e)}
                    className={`absolute z-20 cursor-move transition-shadow px-2 py-0.5 rounded ${
                      isSelected
                        ? 'ring-2 ring-amber-500 shadow-xl bg-amber-500/15'
                        : 'hover:ring-1 hover:ring-blue-400 hover:bg-blue-50/20'
                    }`}
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                      transform:
                        el.textAlign === 'center'
                          ? 'translate(-50%, -50%)'
                          : el.textAlign === 'right'
                          ? 'translate(-100%, -50%)'
                          : 'translate(0%, -50%)',
                      color: el.color || '#0f172a',
                      fontFamily: el.fontFamily,
                      fontSize: `calc(${el.fontSizePt} * 0.95px)`,
                      fontWeight: el.fontWeight || 'normal',
                      textAlign: el.textAlign || 'center',
                      maxWidth: el.maxWidthMm ? `${(el.maxWidthMm / widthMm) * 100}%` : '85%',
                      lineHeight: 1.25,
                      whiteSpace: el.id === 'participant_name' ? 'normal' : 'nowrap',
                    }}
                  >
                    {sampleText}
                    {isSelected && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-bold text-[9px] px-1.5 py-0.2 rounded shadow whitespace-nowrap">
                        {el.label} (X:{el.xMm}mm Y:{el.yMm}mm)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
