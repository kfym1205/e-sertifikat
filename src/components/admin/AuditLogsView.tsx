import React, { useState } from 'react';
import { ClipboardList, Search, Filter, Shield, Clock, UserCheck, Info } from 'lucide-react';
import { AuditLog } from '../../types';
import { storage } from '../../utils/storage';
import { formatDateTimeIndonesian } from '../../utils/dateUtils';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>(storage.getAuditLogs());
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const filtered = logs.filter((log) => {
    const matchAction = actionFilter === 'all' || log.action === actionFilter;
    const q = searchQuery.toLowerCase();
    const matchQuery =
      !q ||
      log.user.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.targetId.toLowerCase().includes(q);
    return matchAction && matchQuery;
  });

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-white tracking-tight">Audit Log & Jejak Aktivitas Sistem</h2>
        <p className="text-xs text-slate-400 mt-1">
          Pencatatan riwayat perubahan konfigurasi, penerbitan sertifikat, koreksi nama peserta, dan pengiriman email untuk kepatuhan administrasi.
        </p>
      </div>

      {/* Filter and Search */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-300">Aksi:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="all">Semua Tindakan ({logs.length})</option>
            {uniqueActions.map((act) => (
              <option key={act} value={act}>
                {act}
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
            placeholder="Cari rincian audit log..."
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
                <th className="py-3 px-4">Waktu (WITA)</th>
                <th className="py-3 px-4">Pelaku / Pengguna</th>
                <th className="py-3 px-4">Jenis Tindakan</th>
                <th className="py-3 px-4">Target Objek</th>
                <th className="py-3 px-4">Rincian Operasional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                    {formatDateTimeIndonesian(log.timestamp, 'Asia/Makassar')}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-200">
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{log.user}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                    {log.targetType}: {log.targetId.substring(0, 14)}...
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 leading-relaxed max-w-md">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
