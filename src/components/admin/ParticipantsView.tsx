import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  FileSpreadsheet,
  Download,
  Calendar,
  Building,
  Mail,
  Phone,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { CertificateIssuance } from '../../types';
import { storage } from '../../utils/storage';
import { CertificatePreviewModal } from '../CertificatePreviewModal';

export const ParticipantsView: React.FC = () => {
  const issuances = storage.getIssuances();
  const activities = storage.getActivities();

  const [selectedActivityId, setSelectedActivityId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewItem, setPreviewItem] = useState<CertificateIssuance | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const filtered = issuances.filter((item) => {
    const matchAct = selectedActivityId === 'all' || item.activityId === selectedActivityId;
    const q = searchQuery.toLowerCase();
    const matchQuery =
      !q ||
      item.participantName.toLowerCase().includes(q) ||
      item.participantEmail.toLowerCase().includes(q) ||
      (item.participantInstitution && item.participantInstitution.toLowerCase().includes(q)) ||
      item.registrationNumber.toLowerCase().includes(q);
    return matchAct && matchQuery;
  });

  const handleExportCsv = () => {
    const csvContent = storage.exportParticipantsCsv(
      selectedActivityId === 'all' ? undefined : selectedActivityId
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `data_pendaftar_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setAlertMsg('Data pendaftar berhasil diekspor.');
    setTimeout(() => setAlertMsg(null), 3000);
  };

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
          <h2 className="text-xl font-black text-white tracking-tight">Data Seluruh Pendaftar</h2>
          <p className="text-xs text-slate-400 mt-1">
            Data lengkap peserta yang telah mengirimkan formulir dan memperoleh sertifikat.
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-600/20"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Unduh Format CSV / Excel</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-300">Kegiatan:</span>
          <select
            value={selectedActivityId}
            onChange={(e) => setSelectedActivityId(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="all">Semua Kegiatan ({activities.length})</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
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
            placeholder="Cari nama, email, instansi..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Nama Lengkap Peserta</th>
                <th className="py-3 px-4">Kontak (Email)</th>
                <th className="py-3 px-4">Instansi / Asal</th>
                <th className="py-3 px-4">Kegiatan Diikuti</th>
                <th className="py-3 px-4">No. Registrasi</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ada pendaftar yang cocok dengan kata kunci.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {item.participantName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.participantEmail}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {item.participantInstitution || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">
                      {item.activityName}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-300">
                      {item.registrationNumber}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setPreviewItem(item)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Sertifikat</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {previewItem && (
        <CertificatePreviewModal
          isOpen={!!previewItem}
          onClose={() => setPreviewItem(null)}
          issuance={previewItem}
        />
      )}
    </div>
  );
};
