import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  CheckCircle2,
  ShieldCheck,
  Globe,
  AlertCircle,
  RefreshCw,
  Unlink,
  AlertTriangle,
  Zap,
  Info,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { emailAdapter } from '../../services/email/emailAdapter';
import {
  connectGmailAccount,
  disconnectGmailAccount,
} from '../../services/auth/firebaseAuth';
import {
  ConnectionTestResult,
  EmailProviderRuntimeStatus,
} from '../../services/email/types';

export const EmailSettingsView: React.FC = () => {
  const [status, setStatus] = useState<EmailProviderRuntimeStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Sender Identity
  const [gmailSenderName, setGmailSenderName] = useState('e-Sertifikat BNN Kabupaten Gorontalo');

  // Connection & Diagnostics
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);
  const [gmailConnectError, setGmailConnectError] = useState<string | null>(null);
  const [isTestingGmail, setIsTestingGmail] = useState(false);
  const [gmailTestRecipient, setGmailTestRecipient] = useState('');
  const [gmailTestResult, setGmailTestResult] = useState<ConnectionTestResult | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    const data = await emailAdapter.getStatus();
    setStatus(data);

    if (data.gmailSender?.senderName) {
      setGmailSenderName(data.gmailSender.senderName);
    }
    setLoading(false);
  };

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Connect Gmail via Google OAuth
  const handleConnectGmail = async () => {
    setIsConnectingGmail(true);
    setGmailConnectError(null);
    try {
      const result = await connectGmailAccount();
      if (result.success) {
        showToast(`Akun Gmail "${result.email}" berhasil terhubung ke e-Sertifikat BNN!`);
        await loadStatus();
      } else {
        setGmailConnectError(result.error || 'Gagal menghubungkan akun Google.');
        showToast(result.error || 'Gagal menghubungkan akun Google.', 'error');
      }
    } catch (err: any) {
      setGmailConnectError(err.message || 'Kendala tidak terduga saat otorisasi.');
      showToast(err.message || 'Kendala saat otorisasi Google.', 'error');
    } finally {
      setIsConnectingGmail(false);
    }
  };

  // Disconnect Gmail
  const handleDisconnectGmail = async () => {
    if (!window.confirm('Apakah Anda yakin ingin memutuskan koneksi akun Gmail? Pengiriman email sertifikat otomatis akan ditangguhkan hingga akun dihubungkan kembali.')) {
      return;
    }

    try {
      await disconnectGmailAccount();
      showToast('Koneksi akun Gmail berhasil diputuskan.');
      await loadStatus();
    } catch (err: any) {
      showToast(err.message || 'Gagal memutuskan koneksi.', 'error');
    }
  };

  // Test Gmail Send
  const handleTestGmailSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const recipient = gmailTestRecipient.trim();
    if (!recipient) {
      showToast('Alamat email penerima uji coba wajib diisi.', 'error');
      return;
    }

    setIsTestingGmail(true);
    setGmailTestResult(null);

    try {
      const res = await emailAdapter.testGmailSend(recipient);
      setGmailTestResult(res);
      if (res.success) {
        showToast('Uji coba pengiriman Gmail API BERHASIL! Dokumen uji coba telah terkirim.');
        await loadStatus();
      } else {
        showToast(res.message || 'Uji coba pengiriman Gmail gagal.', 'error');
      }
    } catch (err: any) {
      setGmailTestResult({
        success: false,
        providerType: 'gmail_api',
        message: err.message || 'Gagal menghubungi server.',
      });
      showToast(err.message || 'Pengujian gagal.', 'error');
    } finally {
      setIsTestingGmail(false);
    }
  };

  // Save Sender Name
  const handleSaveSenderName = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await emailAdapter.saveGmailSender(gmailSenderName.trim());
      showToast('Nama tampilan pengirim berhasil disimpan.');
      await loadStatus();
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center p-12 text-blue-200">
        <RefreshCw className="w-6 h-6 animate-spin mr-3" />
        <span>Memuat konfigurasi pengiriman Gmail API...</span>
      </div>
    );
  }

  const isConnected = Boolean(status?.gmail.connected && status?.gmail.hasToken);
  const connectedEmail = status?.gmail.email || '-';

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`p-4 rounded-xl border text-sm font-semibold flex items-center gap-3 shadow-lg ${
            toastMsg.type === 'success'
              ? 'bg-emerald-950 border-emerald-700 text-emerald-200'
              : 'bg-rose-950 border-rose-700 text-rose-200'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#002b54] border border-[#004080] p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
              Integrasi Resmi Gmail API
            </span>
            <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              OAuth 2.0 Direct
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight mt-2 flex items-center gap-2">
            Pengaturan Pengiriman Gmail API
          </h2>
          <p className="text-xs text-blue-200 mt-1 max-w-2xl leading-relaxed">
            Semua e-Sertifikat BNN dikirimkan langsung melalui <strong>Gmail API resmi</strong> menggunakan akun Google/Gmail yang diotorisasi oleh Administrator. Tidak menggunakan server relay eksternal atau SMTP pihak ketiga.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {isConnected ? (
            <div className="px-4 py-2 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center gap-2 text-xs font-bold text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Gmail Aktif & Siap Kirim</span>
            </div>
          ) : (
            <div className="px-4 py-2 rounded-xl bg-rose-950/80 border border-rose-500/50 flex items-center gap-2 text-xs font-bold text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>Gmail Belum Terhubung</span>
            </div>
          )}
        </div>
      </div>

      {/* Section 1: Gmail Account Connection Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Status Otorisasi Akun Gmail Pengirim</h3>
              <p className="text-xs text-slate-400">
                Otorisasi Google OAuth 2.0 dengan cakupan izin pengiriman: <code className="text-blue-300 font-mono">https://www.googleapis.com/auth/gmail.send</code>
              </p>
            </div>
          </div>
        </div>

        {isConnected ? (
          /* State: Connected */
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-600/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Akun Gmail Terhubung</span>
                </div>
                <div className="text-lg font-black text-white font-mono">{connectedEmail}</div>
                <div className="text-xs text-slate-300">
                  Nama Tampilan: <strong className="text-white">{gmailSenderName}</strong>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleConnectGmail}
                  disabled={isConnectingGmail}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isConnectingGmail ? 'animate-spin' : ''}`} />
                  <span>{isConnectingGmail ? 'Memproses...' : 'Hubungkan Ulang / Ganti Akun'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDisconnectGmail}
                  className="px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-xs font-semibold text-rose-300 border border-rose-700/60 transition flex items-center gap-2"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Putuskan Koneksi</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cakupan Izin (Scope)</div>
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>gmail.send Terverifikasi</span>
                </div>
                <p className="text-[10px] text-slate-500">Izin resmi kirim email atas nama akun tanpa akses baca email pribadi.</p>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Uji Coba Pengiriman</div>
                <div className="text-xs font-bold flex items-center gap-1.5">
                  {status?.gmail.isTestSendPassed ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Lulus Pengujian
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Belum Diuji Coba
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">
                  {status?.gmail.lastTestedAt ? `Terakhir diuji: ${new Date(status.gmail.lastTestedAt).toLocaleString('id-ID')}` : 'Lakukan uji coba di bawah untuk memverifikasi jalur.'}
                </p>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Waktu Terhubung</div>
                <div className="text-xs font-bold text-white font-mono">
                  {status?.gmail.connectedAt ? new Date(status.gmail.connectedAt).toLocaleDateString('id-ID') : 'Sesi Aktif'}
                </div>
                <p className="text-[10px] text-slate-500">Kredensial tersimpan secara aman dan terenkripsi.</p>
              </div>
            </div>
          </div>
        ) : (
          /* State: Disconnected */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-600/40 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200 leading-relaxed">
                <p className="font-bold text-amber-300">Pengiriman Email Saat Ini Nonaktif</p>
                <p className="mt-1">
                  Akun Gmail pengirim belum dihubungkan. Sistem tidak dapat mengirim e-Sertifikat ke peserta kegiatan hingga akun Google/Gmail terotorisasi.
                </p>
              </div>
            </div>

            {gmailConnectError && (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-600/40 text-xs text-rose-200 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-rose-300">Kendala Otorisasi:</strong> {gmailConnectError}
                  <p className="mt-1 text-[11px] text-rose-300/80">
                    Jika muncul pesan <code>auth/unauthorized-domain</code>, pastikan domain aplikasi telah didaftarkan pada <em>Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains</em>.
                  </p>
                </div>
              </div>
            )}

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 mx-auto">
                <Zap className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="text-base font-bold text-white">Hubungkan Akun Gmail Pengirim</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Klik tombol di bawah untuk membuka popup Google Sign-In, pilih akun Gmail yang akan digunakan untuk mengirimkan sertifikat, dan setujui izin pengiriman email.
                </p>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleConnectGmail}
                  disabled={isConnectingGmail}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition flex items-center gap-2 mx-auto disabled:opacity-50"
                >
                  <Globe className="w-4 h-4" />
                  <span>{isConnectingGmail ? 'Menghubungkan ke Google...' : 'Hubungkan Akun Gmail (Google OAuth)'}</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-500">
                Aman & Terenkripsi: Token otorisasi hanya memiliki izin untuk mengirim email e-Sertifikat (scope <code>gmail.send</code>).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Sender Identity Configuration */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Identitas Pengirim e-Sertifikat</h3>
            <p className="text-xs text-slate-400">
              Nama pengirim yang akan terlihat di kotak masuk peserta saat menerima email e-Sertifikat.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveSenderName} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nama Tampilan Pengirim (Sender Display Name)
              </label>
              <input
                type="text"
                value={gmailSenderName}
                onChange={(e) => setGmailSenderName(e.target.value)}
                placeholder="misal: e-Sertifikat BNN Kabupaten Gorontalo"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
              />
              <p className="text-[11px] text-slate-500 mt-1">Nama resmi kepanitiaan atau satuan kerja BNN.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Alamat Email Pengirim (Terotorisasi)
              </label>
              <input
                type="text"
                disabled
                value={connectedEmail}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-400 font-mono cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Alamat pengirim otomatis sesuai dengan akun Gmail yang dihubungkan di atas (tidak dapat dimanipulasi).
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-400">
              Format Header: <code className="text-amber-300 font-mono">"{gmailSenderName}" &lt;{connectedEmail}&gt;</code>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Nama Pengirim'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Section 3: Direct Gmail API Test Send */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Uji Coba Pengiriman Gmail API</h3>
            <p className="text-xs text-slate-400">
              Kirim email uji coba langsung untuk memastikan izin akun Google valid dan email dapat sampai di kotak masuk.
            </p>
          </div>
        </div>

        <form onSubmit={handleTestGmailSend} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Alamat Email Tujuan Uji Coba
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                value={gmailTestRecipient}
                onChange={(e) => setGmailTestRecipient(e.target.value)}
                placeholder="nama@emailanda.com"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
              />
              <button
                type="submit"
                disabled={isTestingGmail || !isConnected}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isTestingGmail ? 'Mengirim Uji Coba...' : 'Kirim Email Percobaan'}</span>
              </button>
            </div>
            {!isConnected && (
              <p className="text-[11px] text-rose-400 mt-1">
                Tombol uji coba dinonaktifkan karena akun Gmail belum terhubung.
              </p>
            )}
          </div>
        </form>

        {gmailTestResult && (
          <div
            className={`p-4 rounded-xl border text-xs leading-relaxed space-y-1.5 ${
              gmailTestResult.success
                ? 'bg-emerald-950/50 border-emerald-600 text-emerald-200'
                : 'bg-rose-950/50 border-rose-600 text-rose-200'
            }`}
          >
            <div className="font-bold flex items-center gap-2">
              {gmailTestResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              )}
              <span>{gmailTestResult.success ? 'Uji Pengiriman Sukses' : 'Uji Pengiriman Gagal'}</span>
              {gmailTestResult.latencyMs !== undefined && (
                <span className="text-[10px] font-mono text-slate-400">({gmailTestResult.latencyMs}ms)</span>
              )}
            </div>
            <p>{gmailTestResult.message}</p>
            {gmailTestResult.details?.rejectionReason && (
              <p className="text-[11px] text-slate-300">
                Penyebab: <code>{gmailTestResult.details.rejectionReason}</code>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Section 4: Operational Guidelines */}
      <div className="bg-[#002244] border border-[#003366] rounded-2xl p-6 space-y-3">
        <h4 className="text-xs font-bold text-blue-200 uppercase tracking-wider flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-400" />
          <span>Informasi Batasan & Kuota Pengiriman Gmail API</span>
        </h4>
        <div className="text-xs text-blue-100/90 leading-relaxed space-y-2">
          <p>
            1. <strong>Kuota Pengiriman Google:</strong> Akun Gmail standar (@gmail.com) memiliki batas kirim resmi sekitar 500 pesan per 24 jam. Jika kegiatan menerbitkan lebih dari 500 sertifikat per hari, gunakan akun Google Workspace (@namaorganisasi.com) yang memiliki batas hingga 2.000 pesan per hari.
          </p>
          <p>
            2. <strong>Lampiran PDF Sertifikat:</strong> Dokumen PDF resmi e-Sertifikat BNN berukuran A4 dilampirkan secara otomatis ke setiap email penerima.
          </p>
          <p>
            3. <strong>Pencegahan Duplikasi (Idempotensi):</strong> Sistem memiliki mekanisme perlindungan otomatis agar peserta tidak menerima sertifikat ganda jika tombol kirim ditekan berulang kali.
          </p>
        </div>
      </div>
    </div>
  );
};
