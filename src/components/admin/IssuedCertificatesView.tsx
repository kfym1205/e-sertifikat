import React, { useState } from 'react';
import {
  Award,
  Download,
  Eye,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Ban,
  ExternalLink,
  Edit,
  X,
} from 'lucide-react';
import { CertificateIssuance } from '../../types';
import { storage } from '../../utils/storage';
import { CertificatePreviewModal } from '../CertificatePreviewModal';
import { downloadCertificatePdf } from '../../utils/pdfGenerator';

export const IssuedCertificatesView: React.FC = () => {
  const [issuances, setIssuances] = useState<CertificateIssuance[]>(storage.getIssuances());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIssuance, setSelectedIssuance] = useState<CertificateIssuance | null>(null);

  // Reissue modal state
  const [reissueTarget, setReissueTarget] = useState<CertificateIssuance | null>(null);
  const [correctedName, setCorrectedName] = useState('');
  const [reissueReason, setReissueReason] = useState('');

  // Revoke modal state
  const [revokeTarget, setRevokeTarget] = useState<CertificateIssuance | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const [alertMsg, setAlertMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const filtered = issuances.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      item.participantName.toLowerCase().includes(q) ||
      item.registrationNumber.toLowerCase().includes(q) ||
      item.activityName.toLowerCase().includes(q)
    );
  });

  const handleOpenReissue = (item: CertificateIssuance) => {
    setReissueTarget(item);
    setCorrectedName(item.participantName);
    setReissueReason('Koreksi penulisan ejaan nama dan penambahan gelar akademis');
  };

  const handleExecuteReissue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reissueTarget || !correctedName.trim() || !reissueReason.trim()) return;

    const res = storage.reissueCertificate(reissueTarget.id, correctedName, reissueReason);
    setIssuances(storage.getIssuances());
    setReissueTarget(null);
    setAlertMsg({ text: res.message, type: 'success' });
    setTimeout(() => setAlertMsg(null), 3000);
  };

  const handleOpenRevoke = (item: CertificateIssuance) => {
    setRevokeTarget(item);
    setRevokeReason('Pelanggaran ketentuan kehadiran kegiatan / pembatalan oleh panitia');
  };

  const handleExecuteRevoke = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokeTarget || !revokeReason.trim()) return;

    const res = storage.revokeCertificate(revokeTarget.id, revokeReason);
    setIssuances(storage.getIssuances());
    setRevokeTarget(null);
    setAlertMsg({ text: res.message, type: 'success' });
    setTimeout(() => setAlertMsg(null), 3000);
  };

  const handleDirectDownload = async (item: CertificateIssuance) => {
    const tmpl = storage.getTemplate(item.templateSnapshotId) || storage.getTemplates()[0];
    await downloadCertificatePdf(tmpl, item.layoutSnapshot, {
      participantName: item.participantName,
      registrationNumber: item.registrationNumber,
      issueDate: item.issueDate,
      verificationId: item.verificationId,
    });
  };

  return (
    <div className="space-y-6">
      {alertMsg && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            alertMsg.type === 'success'
              ? 'bg-emerald-950 border-emerald-700 text-emerald-200'
              : 'bg-rose-950 border-rose-700 text-rose-200'
          }`}
        >
          {alertMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          )}
          <span>{alertMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Manajemen Sertifikat Terbit</h2>
          <p className="text-xs text-slate-400 mt-1">
            Riwayat resmi dokumen sertifikat terbit, unduh PDF A4, koreksi nama (reissue), atau pencabutan status dokumen.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, no. registrasi..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">No. Registrasi</th>
                <th className="py-3 px-4">Nama Peserta Terbit</th>
                <th className="py-3 px-4">Kegiatan</th>
                <th className="py-3 px-4">Tanggal Sertifikat</th>
                <th className="py-3 px-4">Status Dokumen</th>
                <th className="py-3 px-4 text-right">Aksi Manajemen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-amber-300">
                    {item.registrationNumber}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-white">
                    <div>{item.participantName}</div>
                    {item.reissueReason && (
                      <div className="text-[10px] text-amber-300/80 mt-0.5">
                        Catatan: {item.reissueReason}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">
                    {item.activityName}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                    {item.issueDate}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {item.status === 'valid' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <CheckCircle2 className="w-3 h-3" />
                        Valid & Terverifikasi
                      </span>
                    ) : item.status === 'reissued' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                        <RotateCcw className="w-3 h-3" />
                        Telah Dikoreksi (Reissued)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        <Ban className="w-3 h-3" />
                        Dicabut / Dibatalkan
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedIssuance(item)}
                        title="Pratinjau Layar Penuh"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDirectDownload(item)}
                        title="Unduh PDF Resmi"
                        className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 transition-colors border border-amber-500/30"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenReissue(item)}
                        title="Koreksi Nama (Penerbitan Ulang)"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 hover:text-white text-blue-300 transition-colors border border-slate-700"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      {item.status !== 'revoked' && (
                        <button
                          onClick={() => handleOpenRevoke(item)}
                          title="Cabut / Batalkan Sertifikat"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 hover:text-white text-rose-400 transition-colors border border-slate-700"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL KOREKSI / REISSUE */}
      {reissueTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-800/80">
              <h3 className="text-sm font-bold text-white">Koreksi Nama Sertifikat (Reissue)</h3>
              <button
                onClick={() => setReissueTarget(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteReissue} className="p-5 space-y-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400 block">Nomor Registrasi (Tetap):</span>
                <span className="font-mono font-bold text-amber-400">
                  {reissueTarget.registrationNumber}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Baru yang Sudah Dikoreksi *
                </label>
                <input
                  type="text"
                  required
                  value={correctedName}
                  onChange={(e) => setCorrectedName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Alasan Koreksi (Tercatat dalam Audit Log) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={reissueReason}
                  onChange={(e) => setReissueReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReissueTarget(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl"
                >
                  Simpan Koreksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REVOKE */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-rose-900/60 flex items-center justify-between bg-rose-950/30">
              <h3 className="text-sm font-bold text-rose-300">Cabut Keabsahan Sertifikat</h3>
              <button
                onClick={() => setRevokeTarget(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteRevoke} className="p-5 space-y-4">
              <p className="text-xs text-slate-300">
                Apakah Anda yakin ingin mencabut sertifikat nomor{' '}
                <strong className="font-mono text-amber-400">{revokeTarget.registrationNumber}</strong> milik{' '}
                <strong className="text-white">{revokeTarget.participantName}</strong>? Dokumen akan ditandai
                sebagai <strong>TIDAK BERLAKU</strong> pada sistem verifikasi publik.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Alasan Pencabutan Resmi *
                </label>
                <textarea
                  rows={3}
                  required
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRevokeTarget(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl"
                >
                  Cabut Sertifikat Ini
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedIssuance && (
        <CertificatePreviewModal
          isOpen={!!selectedIssuance}
          onClose={() => setSelectedIssuance(null)}
          issuance={selectedIssuance}
        />
      )}
    </div>
  );
};
