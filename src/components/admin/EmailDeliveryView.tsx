import React, { useState, useEffect } from 'react';
import {
  Send,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Mail,
  Search,
  Filter,
  Info,
  ShieldCheck,
  CheckCheck,
  AlertCircle,
  HelpCircle,
  Globe,
  Server,
  Zap,
} from 'lucide-react';
import { DeliveryStatus, EmailDeliveryLog } from '../../types';
import { storage } from '../../utils/storage';
import { emailAdapter } from '../../services/email/emailAdapter';

export const EmailDeliveryView: React.FC = () => {
  const [emailLogs, setEmailLogs] = useState<EmailDeliveryLog[]>(storage.getEmailLogs());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Sync from backend if available
  useEffect(() => {
    emailAdapter.getDeliveryLogs().then((backendLogs) => {
      if (backendLogs && backendLogs.length > 0) {
        // Merge with storage logs
        const localLogs = storage.getEmailLogs();
        const merged = [...backendLogs];
        localLogs.forEach((l) => {
          if (!merged.some((m) => m.id === l.id || m.issuanceId === l.issuanceId)) {
            merged.push(l);
          }
        });
        setEmailLogs(merged);
      }
    }).catch(() => {});
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const filtered = emailLogs.filter((log) => {
    const matchStatus = filterStatus === 'all' || log.status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchQuery =
      !q ||
      log.recipientEmail.toLowerCase().includes(q) ||
      log.recipientName.toLowerCase().includes(q) ||
      log.subject.toLowerCase().includes(q) ||
      (log.senderAddress && log.senderAddress.toLowerCase().includes(q)) ||
      (log.providerMessageId && log.providerMessageId.toLowerCase().includes(q));
    return matchStatus && matchQuery;
  });

  const handleResend = async (log: EmailDeliveryLog) => {
    setRetryingId(log.id);
    try {
      const res = await storage.resendCertificateEmail(log.issuanceId);
      setEmailLogs(storage.getEmailLogs());
      showToast(res.message, res.success ? 'success' : 'error');
    } catch (err: any) {
      showToast(err.message || 'Gagal mengirim ulang email', 'error');
    } finally {
      setRetryingId(null);
    }
  };

  const handleReconcile = async (log: EmailDeliveryLog) => {
    setReconcilingId(log.id);
    try {
      // Call backend reconcile endpoint
      const res = await emailAdapter.reconcileLog(log.id);
      storage.reconcileEmailLog(log.id);
      setEmailLogs(storage.getEmailLogs());
      showToast(res.message, res.success ? 'success' : 'error');
    } catch (err: any) {
      showToast(err.message || 'Gagal merekonsiliasi status log.', 'error');
    } finally {
      setReconcilingId(null);
    }
  };

  const renderStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Berhasil Dikirim Provider
          </span>
        );
      case 'fallen_back_gmail':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
            <Globe className="w-3.5 h-3.5" />
            Dialihkan ke Gmail
          </span>
        );
      case 'awaiting_confirmation':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <Clock className="w-3.5 h-3.5" />
            Menunggu Konfirmasi
          </span>
        );
      case 'action_required':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
            <AlertTriangle className="w-3.5 h-3.5" />
            Perlu Tindakan Administrator
          </span>
        );
      case 'temp_failed':
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <XCircle className="w-3.5 h-3.5" />
            Gagal Sementara
          </span>
        );
      case 'perm_failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-950 text-red-400 border border-red-700">
            <XCircle className="w-3.5 h-3.5" />
            Gagal Permanen
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Sedang Diproses
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            <Clock className="w-3.5 h-3.5" />
            Menunggu
          </span>
        );
    }
  };

  const totalDelivered = emailLogs.filter((l) => l.status === 'delivered' || l.status === 'fallen_back_gmail').length;
  const totalFallback = emailLogs.filter((l) => l.status === 'fallen_back_gmail').length;
  const totalAwaiting = emailLogs.filter((l) => l.status === 'awaiting_confirmation').length;
  const totalFailed = emailLogs.filter((l) => l.status === 'temp_failed' || l.status === 'perm_failed' || l.status === 'action_required' || l.status === 'failed').length;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-950 border-emerald-700 text-emerald-200'
              : 'bg-rose-950 border-rose-700 text-rose-200'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            Log & Antrean Pengiriman e-Sertifikat BNN
          </h2>
          <p className="text-xs text-blue-200 mt-1">
            Status pengiriman dokumen sertifikat, riwayat percobaan, audit ID pesan provider, dan pengalihan ke Gmail alternatif.
          </p>
        </div>

        {/* Metric Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center gap-2 font-mono">
            <span className="text-emerald-400 font-bold">{totalDelivered}</span>
            <span className="text-slate-400">Terkirim</span>
            {totalFallback > 0 && (
              <>
                <span className="text-slate-600">/</span>
                <span className="text-blue-400 font-bold">{totalFallback} via Gmail</span>
              </>
            )}
            <span className="text-slate-600">|</span>
            {totalAwaiting > 0 && (
              <>
                <span className="text-amber-400 font-bold">{totalAwaiting} Konfirmasi</span>
                <span className="text-slate-600">|</span>
              </>
            )}
            <span className="text-rose-400 font-bold">{totalFailed}</span>
            <span className="text-slate-400">Kendala</span>
          </div>
        </div>
      </div>

      {/* Architectural Guarantee Notice */}
      <div className="bg-[#002b54] border border-[#004080] p-4 rounded-2xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-100 leading-relaxed space-y-1">
          <p>
            <strong>Idempotensi & Keutuhan Nomor Registrasi Terjamin:</strong> Kegagalan pengiriman email atau tombol <em>"Kirim Ulang"</em> <strong>tidak akan pernah menerbitkan nomor registrasi baru</strong> atau membuat ulang dokumen PDF. Sertifikat asli peserta tetap utuh dan sah secara hukum.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-300">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
          >
            <option value="all">Semua Status ({emailLogs.length})</option>
            <option value="delivered">Berhasil Dikirim Provider</option>
            <option value="fallen_back_gmail">Dialihkan ke Gmail</option>
            <option value="awaiting_confirmation">Menunggu Konfirmasi</option>
            <option value="temp_failed">Gagal Sementara</option>
            <option value="perm_failed">Gagal Permanen</option>
            <option value="action_required">Perlu Tindakan Administrator</option>
          </select>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari email, penerima, pengirim, atau ID..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Delivery Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Penerima & Kegiatan</th>
                <th className="py-3 px-4">Jalur & Pengirim</th>
                <th className="py-3 px-4">Status Pengiriman</th>
                <th className="py-3 px-4">Percobaan</th>
                <th className="py-3 px-4">ID Pesan / Rincian Log</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Tidak ada riwayat pengiriman email yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Recipient info */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{log.recipientName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{log.recipientEmail}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 max-w-sm truncate">
                        {log.subject}
                      </div>
                    </td>

                    {/* Method & Sender identity */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {log.usedMethod === 'simulation' ? 'Simulasi' : 'Gmail API'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                        {log.senderAddress || 'Gmail API'}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderStatusBadge(log.status)}
                      {log.fallbackReason && (
                        <div className="text-[10px] text-amber-300/80 mt-1 max-w-xs truncate" title={log.fallbackReason}>
                          ↳ {log.fallbackReason}
                        </div>
                      )}
                    </td>

                    {/* Attempt count & timestamp */}
                    <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                      <div>Ke-{log.attemptCount}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {new Date(log.lastAttemptAt).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}{' '}
                        WITA
                      </div>
                    </td>

                    {/* Message ID or Error */}
                    <td className="py-3.5 px-4 max-w-xs">
                      {log.status === 'delivered' || log.status === 'fallen_back_gmail' ? (
                        <span className="font-mono text-[10px] text-slate-400 block truncate" title={log.providerMessageId}>
                          ID: {log.providerMessageId || 'msg_ack_verified'}
                        </span>
                      ) : (
                        <span className="text-rose-400 text-[11px] line-clamp-2" title={log.errorMessage}>
                          {log.errorMessage || 'Kendala koneksi jaringan'}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Reconcile button if awaiting confirmation */}
                        {log.status === 'awaiting_confirmation' && (
                          <button
                            onClick={() => handleReconcile(log)}
                            disabled={reconcilingId === log.id}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 text-xs font-semibold border border-amber-500/40 transition-colors flex items-center gap-1 disabled:opacity-50"
                            title="Periksa konfirmasi server"
                          >
                            <CheckCheck className={`w-3.5 h-3.5 ${reconcilingId === log.id ? 'animate-spin' : ''}`} />
                            <span>{reconcilingId === log.id ? 'Memeriksa...' : 'Rekonsiliasi'}</span>
                          </button>
                        )}

                        {/* Resend button */}
                        <button
                          onClick={() => handleResend(log)}
                          disabled={retryingId === log.id}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 text-amber-400 ${
                              retryingId === log.id ? 'animate-spin' : ''
                            }`}
                          />
                          <span>{retryingId === log.id ? 'Mengirim...' : 'Kirim Ulang'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
