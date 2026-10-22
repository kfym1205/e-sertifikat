import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  Calendar,
  Building,
  Hash,
  User,
  ArrowLeft,
  Check,
  Sparkles,
} from 'lucide-react';
import { VerificationResult } from '../../types';
import { storage } from '../../utils/storage';

interface PublicVerifyViewProps {
  initialCode?: string;
  onHome: () => void;
}

export const PublicVerifyView: React.FC<PublicVerifyViewProps> = ({
  initialCode = '',
  onHome,
}) => {
  const [searchCode, setSearchCode] = useState(initialCode);
  const [result, setResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    if (initialCode) {
      setSearchCode(initialCode);
      const res = storage.verifyCertificate(initialCode);
      setResult(res);
    }
  }, [initialCode]);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;
    const res = storage.verifyCertificate(searchCode.trim());
    setResult(res);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-200">
      <button
        onClick={onHome}
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#00529B] font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Beranda</span>
      </button>

      {/* Hero Header */}
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-[#EAF4FC] text-[#00529B] flex items-center justify-center mx-auto border border-[#00529B]/20">
          <ShieldCheck className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-[#003566] tracking-tight">
          Verifikasi Keaslian Sertifikat Digital BNN
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
          Pusat validasi dan pembuktian keabsahan sertifikat elektronik resmi. Masukkan Nomor Registrasi atau pindai QR Code yang tercantum pada fisik sertifikat.
        </p>
      </div>

      {/* Verification Input Box */}
      <div className="bg-white border border-slate-200/90 p-6 rounded-3xl shadow-xs max-w-xl mx-auto">
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Nomor Registrasi atau ID Verifikasi:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="Contoh: ST/01/RLN/KA/X/2026/BNNK atau v_bnnk_7a8b9c"
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-800 font-mono placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#00529B] focus:ring-1 focus:ring-[#00529B]"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#00529B] hover:bg-[#003566] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-900/15 flex items-center gap-1.5 shrink-0"
              >
                <Search className="w-4 h-4" />
                <span>Verifikasi</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>Uji Coba Cepat:</span>
            <button
              type="button"
              onClick={() => {
                setSearchCode('ST/01/RLN/KA/X/2026/BNNK');
                setResult(storage.verifyCertificate('ST/01/RLN/KA/X/2026/BNNK'));
              }}
              className="text-[#00529B] hover:underline font-mono font-bold"
            >
              ST/01/RLN/KA/X/2026/BNNK
            </button>
          </div>
        </form>
      </div>

      {/* Verification Result Card */}
      {result && (
        <div className="max-w-xl mx-auto animate-in fade-in zoom-in-95 duration-200">
          <div
            className={`p-6 sm:p-8 rounded-3xl border shadow-sm relative overflow-hidden bg-white ${
              result.isValid
                ? 'border-emerald-300'
                : 'border-rose-300'
            }`}
          >
            {/* Status Emblem Header */}
            <div className="flex items-start gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                  result.isValid
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'bg-rose-50 text-rose-600 border border-rose-200'
                }`}
              >
                {result.isValid ? (
                  <ShieldCheck className="w-8 h-8" />
                ) : (
                  <XCircle className="w-8 h-8" />
                )}
              </div>

              <div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-block uppercase tracking-wider mb-1 ${
                    result.isValid
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {result.isValid ? 'DOKUMEN ASLI & TERVERIFIKASI' : 'TIDAK TERVERIFIKASI'}
                </span>

                <h2
                  className={`text-lg sm:text-xl font-black tracking-tight ${
                    result.isValid ? 'text-[#003566]' : 'text-rose-700'
                  }`}
                >
                  {result.isValid ? 'Sertifikat Resmi Terdaftar' : 'Dokumen Tidak Ditemukan'}
                </h2>

                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {result.message}
                </p>
              </div>
            </div>

            {/* Certificate Public Details (Strict Privacy: NO Email/Phone) */}
            {result.issuance && (
              <div className="mt-6 pt-5 border-t border-slate-100 space-y-3.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-[#00529B]" />
                    <span>Nomor Registrasi:</span>
                  </span>
                  <span className="font-mono font-bold text-[#003566] text-sm">
                    {result.issuance.registrationNumber}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#00529B]" />
                    <span>Nama Penerima:</span>
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {result.issuance.participantName}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Kegiatan:</span>
                  </span>
                  <span className="text-slate-800 font-semibold text-right max-w-xs">
                    {result.issuance.activityName}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    <span>Tanggal Penerbitan:</span>
                  </span>
                  <span className="text-slate-800 font-medium">{result.issuance.issueDate}</span>
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-amber-600" />
                    <span>Instansi Penerbit:</span>
                  </span>
                  <span className="text-slate-800 font-bold">{result.issuance.institution}</span>
                </div>

                <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 flex items-center justify-between">
                  <span>Status Dokumen:</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Sah & Berlaku Penuh
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Privacy Guarantee Note */}
      <div className="max-w-xl mx-auto p-4 bg-white border border-slate-200 rounded-2xl text-[11px] text-slate-500 leading-relaxed text-center shadow-xs">
        Untuk melindungi privasi peserta, halaman verifikasi publik ini hanya menampilkan identitas keabsahan sertifikat dan tidak mempublikasikan alamat email maupun nomor telepon pribadi.
      </div>
    </div>
  );
};
