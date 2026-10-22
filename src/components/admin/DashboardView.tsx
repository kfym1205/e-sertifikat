import React, { useState } from 'react';
import {
  Users,
  Award,
  Send,
  AlertTriangle,
  Download,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Plus,
  FileSpreadsheet,
  Layers,
  Move,
} from 'lucide-react';
import { Activity, CertificateIssuance } from '../../types';
import { storage } from '../../utils/storage';
import { CertificatePreviewModal } from '../CertificatePreviewModal';

interface DashboardViewProps {
  onNavigate: (view: string, extraParam?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [selectedActivityId, setSelectedActivityId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIssuance, setSelectedIssuance] = useState<CertificateIssuance | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const activities = storage.getActivities();
  const issuances = storage.getIssuances();
  const emailLogs = storage.getEmailLogs();

  // Metrics calculation
  const filteredIssuances = issuances.filter((item) => {
    const matchesActivity = selectedActivityId === 'all' || item.activityId === selectedActivityId;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      item.participantName.toLowerCase().includes(q) ||
      item.participantEmail.toLowerCase().includes(q) ||
      item.registrationNumber.toLowerCase().includes(q) ||
      item.activityName.toLowerCase().includes(q);
    return matchesActivity && matchesQuery;
  });

  const totalRegistrations = issuances.length;
  const totalValidCertificates = issuances.filter((i) => i.status === 'valid').length;
  const totalDeliveredEmails = issuances.filter((i) => i.emailStatus === 'delivered').length;
  const totalFailedEmails = issuances.filter((i) => i.emailStatus === 'failed').length;

  const handleExportCsv = () => {
    const csvContent = storage.exportParticipantsCsv(
      selectedActivityId === 'all' ? undefined : selectedActivityId
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `data_pendaftar_sertifikat_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToastMessage({ text: 'Data pendaftar berhasil diekspor ke file CSV.', type: 'success' });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleQuickResend = async (issuanceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await storage.resendCertificateEmail(issuanceId);
      setRefreshKey((prev) => prev + 1);
      setToastMessage({
        text: res.success ? res.message : `Gagal: ${res.message}`,
        type: res.success ? 'success' : 'error',
      });
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Gagal mengirim ulang', type: 'error' });
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-between shadow-lg transition-all animate-in fade-in ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
              : 'bg-rose-950/80 border-rose-700 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-2 text-xs"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Dashboard Utama Administrator
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Monitoring penerbitan sertifikat digital, alokasi nomor registrasi, dan antrean pengiriman email.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('admin_activities')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kegiatan</span>
          </button>
          <button
            onClick={() => onNavigate('admin_editor')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-colors"
          >
            <Move className="w-4 h-4 text-amber-400" />
            <span>Editor Posisi Teks</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pendaftar */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Pendaftar
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{totalRegistrations}</span>
            <span className="text-xs text-slate-400 font-medium">Orang</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            Terdaftar di seluruh kegiatan aktif
          </p>
        </div>

        {/* Total Sertifikat Berhasil Terbit */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Sertifikat Terbit
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400">{totalValidCertificates}</span>
            <span className="text-xs text-slate-400 font-medium">Dokumen Valid</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            Nomor registrasi unik teralokasi
          </p>
        </div>

        {/* Email Berhasil Terkirim */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Email Terkirim
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400">{totalDeliveredEmails}</span>
            <span className="text-xs text-slate-400 font-medium">
              ({totalRegistrations > 0 ? Math.round((totalDeliveredEmails / totalRegistrations) * 100) : 0}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            Diterima di email peserta
          </p>
        </div>

        {/* Email Gagal */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Email Gagal / Antrean
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-black ${totalFailedEmails > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {totalFailedEmails}
            </span>
            <span className="text-xs text-slate-400 font-medium">Perlu Tindakan</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            {totalFailedEmails > 0 ? (
              <span className="text-rose-400 font-semibold cursor-pointer hover:underline" onClick={() => onNavigate('admin_email_delivery')}>
                Lihat & Kirim Ulang &rarr;
              </span>
            ) : (
              'Semua email terkirim aman'
            )}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 shrink-0">
            <Filter className="w-4 h-4 text-amber-400" />
            <span>Kegiatan:</span>
          </div>
          <select
            value={selectedActivityId}
            onChange={(e) => setSelectedActivityId(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 w-full md:w-64"
          >
            <option value="all">Semua Kegiatan ({activities.length})</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.isActive ? 'Aktif' : 'Nonaktif'})
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, email, no registrasi..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Main Table: Pendaftar & Sertifikat */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">
              Daftar Pendaftar & Sertifikat Terbaru
            </h3>
            <p className="text-xs text-slate-400">
              Menampilkan {filteredIssuances.length} dari {issuances.length} sertifikat
            </p>
          </div>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">No. Registrasi</th>
                <th className="py-3 px-4">Nama Peserta</th>
                <th className="py-3 px-4">Kegiatan</th>
                <th className="py-3 px-4">Tanggal Terbit</th>
                <th className="py-3 px-4">Status Email</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredIssuances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ada data pendaftar yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredIssuances.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    onClick={() => setSelectedIssuance(item)}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-amber-300">
                      {item.registrationNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{item.participantName}</div>
                      <div className="text-[11px] text-slate-400">{item.participantEmail}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate">
                      <span className="text-slate-300">{item.activityName}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {item.issueDate}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.emailStatus === 'delivered' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <CheckCircle2 className="w-3 h-3" />
                          Terkirim
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          <XCircle className="w-3 h-3" />
                          Gagal / Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedIssuance(item)}
                          title="Lihat & Unduh Sertifikat"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {item.emailStatus === 'failed' && (
                          <button
                            onClick={(e) => handleQuickResend(item.id, e)}
                            title="Kirim Ulang Email"
                            className="p-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800 transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <a
                          href={`/verifikasi/${item.verificationId}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Buka Halaman Verifikasi"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Pratinjau Sertifikat */}
      {selectedIssuance && (
        <CertificatePreviewModal
          isOpen={!!selectedIssuance}
          onClose={() => setSelectedIssuance(null)}
          issuance={selectedIssuance}
          onResendEmail={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
};
