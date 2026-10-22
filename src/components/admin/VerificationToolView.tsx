import React, { useState } from 'react';
import { ShieldCheck, Search, CheckCircle2, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { storage } from '../../utils/storage';
import { VerificationResult } from '../../types';

export const VerificationToolView: React.FC = () => {
  const [inputCode, setInputCode] = useState('ST/01/RLN/KA/X/2026/BNNK');
  const [result, setResult] = useState<VerificationResult | null>(null);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    const res = storage.verifyCertificate(inputCode.trim());
    setResult(res);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-white tracking-tight">
          Alat Verifikasi Sertifikat Resmi (Admin & Auditor)
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Uji keabsahan nomor registrasi sertifikat atau kode verifikasi unik unguessable ID yang terdapat pada QR code.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm max-w-2xl">
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Masukkan Nomor Registrasi atau ID Verifikasi:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Misal: ST/01/RLN/KA/X/2026/BNNK atau v_bnnk_7a8b9c"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                <span>Periksa Keaslian</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Contoh Cepat:</span>
            <button
              type="button"
              onClick={() => {
                setInputCode('ST/01/RLN/KA/X/2026/BNNK');
                setResult(storage.verifyCertificate('ST/01/RLN/KA/X/2026/BNNK'));
              }}
              className="text-amber-400 hover:underline font-mono"
            >
              ST/01/RLN/KA/X/2026/BNNK
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                setInputCode('PG/001/PLT/GO/X/2026/DISKOMINFO');
                setResult(storage.verifyCertificate('PG/001/PLT/GO/X/2026/DISKOMINFO'));
              }}
              className="text-amber-400 hover:underline font-mono"
            >
              PG/001/PLT/GO/X/2026/DISKOMINFO
            </button>
          </div>
        </form>
      </div>

      {/* Verification Result Card */}
      {result && (
        <div className="max-w-2xl animate-in fade-in zoom-in-95 duration-200">
          <div
            className={`p-6 rounded-2xl border shadow-xl ${
              result.isValid
                ? 'bg-gradient-to-b from-slate-900 to-emerald-950/40 border-emerald-500/50'
                : 'bg-gradient-to-b from-slate-900 to-rose-950/40 border-rose-500/50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  result.isValid
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {result.isValid ? (
                  <ShieldCheck className="w-7 h-7" />
                ) : (
                  <XCircle className="w-7 h-7" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3
                    className={`text-base font-black tracking-tight ${
                      result.isValid ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    {result.isValid ? 'SERTIFIKAT RESMI TERVERIFIKASI' : 'HASIL VERIFIKASI TIDAK VALID'}
                  </h3>
                </div>
                <p className="text-xs text-slate-300 mt-1">{result.message}</p>

                {result.issuance && (
                  <div className="mt-5 pt-4 border-t border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Nomor Registrasi Resmi:</span>
                      <span className="font-mono font-bold text-amber-300 text-sm">
                        {result.issuance.registrationNumber}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Nama Lengkap Penerima:</span>
                      <span className="font-bold text-white text-sm">
                        {result.issuance.participantName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Kegiatan:</span>
                      <span className="text-slate-200 font-medium">
                        {result.issuance.activityName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Tanggal Penerbitan:</span>
                      <span className="text-slate-200">{result.issuance.issueDate}</span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-400">Instansi Penyelenggara:</span>
                      <span className="text-slate-200 font-semibold">
                        {result.issuance.institution}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
