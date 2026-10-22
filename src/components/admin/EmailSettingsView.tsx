import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  CheckCircle2,
  ShieldCheck,
  Globe,
  Key,
  AlertCircle,
  Info,
  Server,
  Lock,
  RefreshCw,
  Copy,
  Check,
  FileText,
  HelpCircle,
  ExternalLink,
  Zap,
  ArrowRight,
  Unlink,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { emailAdapter } from '../../services/email/emailAdapter';
import {
  connectGmailAccount,
  disconnectGmailAccount,
} from '../../services/auth/firebaseAuth';
import {
  ConnectionTestResult,
  DeliveryStrategy,
  EmailProviderRuntimeStatus,
  EmailProviderType,
} from '../../services/email/types';

export const EmailSettingsView: React.FC = () => {
  const [status, setStatus] = useState<EmailProviderRuntimeStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Strategy & Method choices
  const [deliveryStrategy, setDeliveryStrategy] = useState<DeliveryStrategy>('bnn_primary_gmail_fallback');
  const [bnnMethod, setBnnMethod] = useState<'bnn_smtp' | 'bnn_relay_api'>('bnn_smtp');

  // Sender Identities
  const [bnnSenderName, setBnnSenderName] = useState('BNN Kabupaten Gorontalo');
  const [bnnSenderAddress, setBnnSenderAddress] = useState('bnn_kabgor@bnn.go.id');
  const [gmailSenderName, setGmailSenderName] = useState('e-Sertifikat BNN Kabupaten Gorontalo');
  const [gmailSenderAddress, setGmailSenderAddress] = useState('sertifikat.bnnkgorontalo@gmail.com');

  // BNN SMTP Configuration
  const [smtpHost, setSmtpHost] = useState('mail.bnn.go.id');
  const [smtpPort, setSmtpPort] = useState<number>(465);
  const [smtpSecure, setSmtpSecure] = useState<boolean>(true);
  const [smtpUser, setSmtpUser] = useState('bnn_kabgor@bnn.go.id');
  const [smtpPass, setSmtpPass] = useState('');

  // BNN Relay Configuration
  const [relayEndpoint, setRelayEndpoint] = useState('');
  const [relayApiKey, setRelayApiKey] = useState('');

  // Diagnostics & Testing
  const [isTestingBnn, setIsTestingBnn] = useState(false);
  const [bnnTestResult, setBnnTestResult] = useState<ConnectionTestResult | null>(null);

  const [isConnectingGmail, setIsConnectingGmail] = useState(false);
  const [isTestingGmail, setIsTestingGmail] = useState(false);
  const [gmailTestRecipient, setGmailTestRecipient] = useState('');
  const [gmailTestResult, setGmailTestResult] = useState<ConnectionTestResult | null>(null);

  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [sendTestResult, setSendTestResult] = useState<{ success: boolean; message: string; status?: string } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copiedLetter, setCopiedLetter] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  // Sub Tabs: 'strategy' | 'bnn' | 'gmail' | 'senders' | 'docs'
  const [activeTab, setActiveTab] = useState<'strategy' | 'bnn' | 'gmail' | 'senders' | 'docs'>('strategy');

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    const data = await emailAdapter.getStatus();
    setStatus(data);

    if (data.deliveryStrategy) {
      setDeliveryStrategy(data.deliveryStrategy);
    }
    if (data.bnnMethod) {
      setBnnMethod(data.bnnMethod);
    }

    if (data.bnnSender) {
      setBnnSenderName(data.bnnSender.senderName || 'BNN Kabupaten Gorontalo');
      setBnnSenderAddress(data.bnnSender.senderAddress || 'bnn_kabgor@bnn.go.id');
    }

    if (data.gmailSender) {
      setGmailSenderName(data.gmailSender.senderName || 'e-Sertifikat BNN Kabupaten Gorontalo');
      setGmailSenderAddress(data.gmailSender.senderAddress || (data.gmail.email || 'sertifikat.bnnkgorontalo@gmail.com'));
    }

    if (data.bnnSmtp) {
      setSmtpHost(data.bnnSmtp.host || 'mail.bnn.go.id');
      setSmtpPort(data.bnnSmtp.port || 465);
      setSmtpSecure(data.bnnSmtp.secure !== undefined ? data.bnnSmtp.secure : true);
      setSmtpUser(data.bnnSmtp.user || 'bnn_kabgor@bnn.go.id');
    }

    if (data.bnnRelay) {
      setRelayEndpoint(data.bnnRelay.endpointUrl || '');
    }

    setLoading(false);
  };

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // 1. Save Strategy & Senders
  const handleSaveStrategy = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);

    // Validation for strategy: if user selects gmail_only but gmail not ready
    if (deliveryStrategy === 'gmail_only' && (!status?.gmail.connected || !status?.gmail.isTestSendPassed)) {
      setIsSaving(false);
      showToast('Metode Gmail Alternatif hanya dapat diaktifkan setelah akun berhasil dihubungkan dan lulus uji pengiriman percobaan.', 'error');
      return;
    }

    const res = await emailAdapter.saveStrategy({
      deliveryStrategy,
      bnnMethod,
      bnnSender: {
        senderName: bnnSenderName.trim(),
        senderAddress: bnnSenderAddress.trim(),
      },
      gmailSender: {
        senderName: gmailSenderName.trim(),
        senderAddress: gmailSenderAddress.trim(),
      },
    });

    setIsSaving(false);
    if (res.success) {
      showToast('Strategi prioritas pengiriman dan konfigurasi identitas berhasil disimpan.');
      loadStatus();
    } else {
      showToast(res.message || 'Gagal menyimpan strategi.', 'error');
    }
  };

  // 2. Save BNN SMTP / Relay config
  const handleSaveBnnConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const payload = {
      providerType: bnnMethod,
      bnnSmtp: {
        host: smtpHost.trim(),
        port: smtpPort,
        secure: smtpSecure,
        user: smtpUser.trim(),
        pass: smtpPass,
        fromAddress: `"${bnnSenderName}" <${bnnSenderAddress}>`,
      },
      bnnRelay: {
        endpointUrl: relayEndpoint.trim(),
        apiKey: relayApiKey,
        fromAddress: `"${bnnSenderName}" <${bnnSenderAddress}>`,
      },
    };

    const res = await emailAdapter.saveConfig(payload);
    setIsSaving(false);
    if (res.success) {
      showToast('Pengaturan server email resmi BNN berhasil diperbarui di server backend.');
      setSmtpPass('');
      loadStatus();
    } else {
      showToast(res.message || 'Gagal menyimpan konfigurasi server.', 'error');
    }
  };

  // 3. Test BNN Handshake
  const handleTestBnnConnection = async () => {
    setIsTestingBnn(true);
    setBnnTestResult(null);

    const result = await emailAdapter.testConnection({
      providerType: bnnMethod,
      host: smtpHost.trim(),
      port: smtpPort,
      secure: smtpSecure,
      user: smtpUser.trim(),
      pass: smtpPass,
      endpointUrl: relayEndpoint.trim(),
      apiKey: relayApiKey,
    });

    setIsTestingBnn(false);
    setBnnTestResult(result);
  };

  // 4. Connect Gmail via OAuth Popup
  const handleConnectGmail = async () => {
    setIsConnectingGmail(true);
    try {
      const res = await connectGmailAccount();
      if (res.success && res.email) {
        showToast(`Akun Gmail "${res.email}" berhasil dihubungkan! Lakukan uji pengiriman untuk mengaktifkan saluran.`);
        setGmailSenderAddress(res.email);
        await loadStatus();
      } else {
        showToast(res.error || 'Gagal menghubungkan akun Gmail.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan saat menghubungkan Gmail.', 'error');
    } finally {
      setIsConnectingGmail(false);
    }
  };

  // 5. Disconnect Gmail
  const handleDisconnectGmail = async () => {
    const confirm = window.confirm('Yakin ingin memutuskan koneksi akun Gmail alternatif? Jalur fallback Gmail akan dinonaktifkan.');
    if (!confirm) return;

    const res = await disconnectGmailAccount();
    if (res.success) {
      showToast('Koneksi Gmail berhasil diputuskan.');
      await loadStatus();
    } else {
      showToast(res.message, 'error');
    }
  };

  // 6. Test Send Gmail (Required before activation)
  const handleTestGmailSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const recipient = gmailTestRecipient.trim() || status?.gmail.email;
    if (!recipient) {
      showToast('Masukkan alamat email penerima uji coba.', 'error');
      return;
    }

    setIsTestingGmail(true);
    setGmailTestResult(null);

    const res = await emailAdapter.testGmailSend(recipient);
    setIsTestingGmail(false);
    setGmailTestResult(res);

    if (res.success) {
      showToast('Uji pengiriman Gmail BERHASIL! Akun Gmail alternatif kini aktif.');
      await loadStatus();
    } else {
      showToast(res.message || 'Uji pengiriman Gmail gagal.', 'error');
    }
  };

  // 7. General Test Email Dispatch
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailRecipient.trim()) return;

    setIsSendingTestEmail(true);
    setSendTestResult(null);

    const res = await emailAdapter.sendEmail({
      to: testEmailRecipient.trim(),
      recipientName: 'Petugas Penguji BNN',
      subject: '[UJI PENGIRIMAN] Sistem e-Sertifikat BNN',
      activityName: 'Bimbingan Teknis Penggiat P4GN BNNK Gorontalo 2026',
      registrationNumber: 'ST/01/RLN/KA/X/2026/BNNK',
      issueDate: '22 Oktober 2026',
      verificationUrl: `${window.location.origin}/verifikasi/v_bnnk_test`,
      customBody: `Halo,\n\nIni adalah email uji coba nyata dari Sistem e-Sertifikat BNN.\n\nStrategi Aktif: ${
        deliveryStrategy === 'bnn_primary_gmail_fallback'
          ? 'Email BNN sebagai Utama, Gmail sebagai Cadangan (Fallback)'
          : deliveryStrategy === 'bnn_only'
          ? 'Email BNN Saja'
          : 'Gmail Alternatif Saja'
      }.\n\nJika email ini sampai di kotak masuk Anda, proses pengiriman dinyatakan berhasil dan berfungsi normal.`,
    });

    setIsSendingTestEmail(false);
    setSendTestResult({
      success: res.success,
      status: res.status,
      message: res.success
        ? `Email uji coba BERHASIL dikirim! Status: ${
            res.status === 'fallen_back_gmail'
              ? 'Dialihkan ke Gmail (Fallback Aktif)'
              : 'Terkirim via Provider Utama'
          }. ${res.note || ''}`
        : `Pengiriman gagal: ${res.error || 'Terjadi kesalahan gateway.'}`,
    });
  };

  const officialLetterText = `Kepada Yth.
Kepala Pusat Data dan Informasi (Pusdatin) BNN RI / Administrator Email Resmi
di Jakarta

Perihal: Permohonan Pembukaan Akses SMTP / Relay Pengiriman Email Otomasi e-Sertifikat Satker BNN

Dengan hormat,

Sehubungan dengan implementasi Aplikasi Layanan e-Sertifikat Resmi pada Satker BNN Kabupaten Gorontalo, yang berfungsi untuk menerbitkan dan mendistribusikan sertifikat kegiatan pelatihan, relawan, dan workshop P4GN langsung ke email peserta, bersama ini kami memohon bantuan teknis terkait:

1. Akun Email Satker Resmi:
   - Alamat Email: ${bnnSenderAddress}
   - Portal Akses: https://webmail.bnn.go.id

2. Kebutuhan Teknis Server:
   - Host SMTP Resmi: ${smtpHost}
   - Port Layanan: Port 465 (SSL/TLS) atau Port 587 (STARTTLS)
   - Pembukaan Hak Akses: Izin autentikasi SMTP client atau Application Password khusus satker.
   - Alternatif Disetujui: Jika port SMTP dibatasi firewall dinamis, kami siap menggunakan REST API / Email Relay Gateway resmi internal BNN yang disetujui.

3. Tujuan Penggunaan:
   Pengiriman otomatis dokumen elektronik sertifikat PDF A4 dan tautan verifikasi keabsahan kepada para penggiat anti-narkoba dan peserta kegiatan resmi.

Demikian permohonan ini kami sampaikan. Atas bantuan dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.

Hormat kami,
Administrator Sistem e-Sertifikat
Satker BNN Kabupaten Gorontalo`;

  const handleCopyLetter = () => {
    navigator.clipboard.writeText(officialLetterText);
    setCopiedLetter(true);
    setTimeout(() => setCopiedLetter(false), 3000);
  };

  const isGmailActive = Boolean(status?.gmail?.connected && status?.gmail?.isTestSendPassed);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in ${
            toastMsg.type === 'success'
              ? 'bg-emerald-950 border-emerald-700 text-emerald-200'
              : 'bg-rose-950 border-rose-700 text-rose-200'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#00529B] text-white flex items-center justify-center font-bold shadow-md shadow-blue-900/30">
              <Mail className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                Multi-Metode Pengiriman Email e-Sertifikat BNN
              </h2>
              <p className="text-xs text-blue-200 mt-0.5">
                Pengelolaan metode Email Resmi BNN (<code className="text-amber-300">bnn_kabgor@bnn.go.id</code>), Gmail API Alternatif, dan sistem fallback otomatis.
              </p>
            </div>
          </div>
        </div>

        {/* Status Indicator Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[11px]">
            <span className="text-slate-400">Strategi:</span>
            <span className="font-bold text-amber-300">
              {deliveryStrategy === 'bnn_primary_gmail_fallback'
                ? 'BNN + Fallback Gmail'
                : deliveryStrategy === 'bnn_only'
                ? 'BNN Saja'
                : 'Gmail Saja'}
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-[11px] font-bold ${
              isGmailActive
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : status?.gmail?.connected
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            <span>
              {isGmailActive
                ? 'Gmail Alternatif Siap'
                : status?.gmail?.connected
                ? 'Gmail Belum Diuji'
                : 'Gmail Belum Terhubung'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 gap-1 text-xs font-semibold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('strategy')}
          className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'strategy'
              ? 'border-amber-400 text-amber-300 font-bold bg-white/5 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400" />
          <span>1. Prioritas & Strategi Fallback</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bnn')}
          className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'bnn'
              ? 'border-amber-400 text-amber-300 font-bold bg-white/5 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Server className="w-4 h-4 text-blue-400" />
          <span>2. Metode 1: Email Resmi BNN</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gmail')}
          className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'gmail'
              ? 'border-amber-400 text-amber-300 font-bold bg-white/5 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Globe className="w-4 h-4 text-emerald-400" />
          <span>3. Metode 2: Gmail Alternatif (OAuth 2.0)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('senders')}
          className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'senders'
              ? 'border-amber-400 text-amber-300 font-bold bg-white/5 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Mail className="w-4 h-4 text-purple-400" />
          <span>4. Identitas Pengirim & Template</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('docs')}
          className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'docs'
              ? 'border-amber-400 text-amber-300 font-bold bg-white/5 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4 text-slate-400" />
          <span>5. Format Surat & Panduan Vercel</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PRIORITAS DAN STRATEGI FALLBACK */}
      {/* ========================================================================= */}
      {activeTab === 'strategy' && (
        <div className="space-y-6">
          {/* Information & Architecture Notice */}
          <div className="bg-[#002b54] border border-[#004080] p-4 rounded-2xl flex items-start gap-3 text-xs text-blue-100 leading-relaxed shadow-md">
            <ShieldCheck className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-white text-sm">
                Pencegahan Sertifikat & Email Duplikat (Strict Idempotency):
              </span>
              <p>
                • <strong>Pemisahan Proses:</strong> Pembuatan sertifikat dan pengiriman email merupakan dua proses independen. Nomor registrasi dan file PDF sertifikat <strong>tidak akan pernah dibuat ulang</strong> atau berubah hanya karena pergantian metode email atau kegagalan pengiriman.
              </p>
              <p>
                • <strong>Backend-Authoritative Fallback:</strong> Seluruh proses deteksi error, retry terbatas (maksimal 2x), dan pengalihan ke Gmail cadangan dijalankan sepenuhnya di <strong>server backend</strong>, bukan di browser peserta.
              </p>
              <p>
                • <strong>Pencegahan Duplikasi Email:</strong> Jika status penerimaan email belum dapat dipastikan (misal socket timeout), sistem tidak langsung mengirim ulang melainkan menetapkan status <em>"Menunggu Konfirmasi"</em> agar dapat diperiksa terlebih dahulu.
              </p>
            </div>
          </div>

          {/* Strategy Selection Cards */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Pilih Strategi Pengiriman Email Sertifikat</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Option 1: BNN Primary + Gmail Fallback (RECOMMENDED) */}
              <div
                onClick={() => setDeliveryStrategy('bnn_primary_gmail_fallback')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all relative ${
                  deliveryStrategy === 'bnn_primary_gmail_fallback'
                    ? 'bg-gradient-to-b from-[#003566]/60 to-[#002b54]/80 border-amber-400 ring-2 ring-amber-400/20 text-white shadow-xl'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    DIREKOMENDASIKAN
                  </span>
                  {deliveryStrategy === 'bnn_primary_gmail_fallback' && (
                    <CheckCircle2 className="w-5 h-5 text-amber-400" />
                  )}
                </div>
                <h4 className="font-bold text-sm text-white mb-1.5">
                  1. Email BNN Utama, Gmail Cadangan
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  Sistem mencoba mengirim via email resmi BNN terlebih dahulu. Jika terjadi masalah koneksi atau pembatasan jaringan, pengiriman otomatis dialihkan ke akun Gmail alternatif yang terhubung.
                </p>
                <div className="text-[11px] font-mono p-2 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                  <div className="text-blue-300">Utama: {bnnSenderAddress}</div>
                  <div className="text-emerald-300">Cadangan: {status?.gmail.email || 'Gmail belum dihubungkan'}</div>
                </div>
              </div>

              {/* Option 2: BNN Only */}
              <div
                onClick={() => setDeliveryStrategy('bnn_only')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all relative ${
                  deliveryStrategy === 'bnn_only'
                    ? 'bg-gradient-to-b from-[#003566]/60 to-[#002b54]/80 border-blue-400 ring-2 ring-blue-400/20 text-white shadow-xl'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    RESMI TUNGGAL
                  </span>
                  {deliveryStrategy === 'bnn_only' && (
                    <CheckCircle2 className="w-5 h-5 text-blue-400" />
                  )}
                </div>
                <h4 className="font-bold text-sm text-white mb-1.5">
                  2. Email BNN Saja
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  Hanya menggunakan email resmi satker BNN (SMTP atau API Relay). Jika pengiriman gagal, sertifikat tetap aman dan dicatat dengan status gagal sementara tanpa pengalihan ke Gmail.
                </p>
                <div className="text-[11px] font-mono p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <div className="text-blue-300">Jalur: {bnnSenderAddress}</div>
                </div>
              </div>

              {/* Option 3: Gmail Only */}
              <div
                onClick={() => {
                  if (!isGmailActive) {
                    showToast('Harap hubungkan akun Gmail dan selesaikan uji pengiriman percobaan terlebih dahulu.', 'error');
                  }
                  setDeliveryStrategy('gmail_only');
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all relative ${
                  deliveryStrategy === 'gmail_only'
                    ? 'bg-gradient-to-b from-[#003566]/60 to-[#002b54]/80 border-emerald-400 ring-2 ring-emerald-400/20 text-white shadow-xl'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    JALUR GMAIL
                  </span>
                  {deliveryStrategy === 'gmail_only' && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  )}
                </div>
                <h4 className="font-bold text-sm text-white mb-1.5">
                  3. Gmail Alternatif Saja
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  Mengirimkan seluruh sertifikat langsung melalui akun Gmail alternatif resmi satker via Gmail API OAuth 2.0. Kebal terhadap pemblokiran port SMTP ISP atau firewall cloud.
                </p>
                <div className="text-[11px] font-mono p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <div className="text-emerald-300">Akun: {status?.gmail.email || 'Belum dihubungkan'}</div>
                </div>
              </div>
            </div>

            {/* Validation Notice if Strategy Gmail is selected but not ready */}
            {deliveryStrategy !== 'bnn_only' && !isGmailActive && (
              <div className="p-3.5 bg-amber-950/60 border border-amber-700/60 rounded-xl text-xs text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Perhatian Akun Gmail Alternatif:</span>
                  <p className="text-[11px] mt-0.5">
                    {status?.gmail.connected
                      ? 'Akun Gmail telah terhubung namun belum dilakukan "Uji Pengiriman". Buka Tab "3. Metode 2: Gmail Alternatif" dan lakukan uji pengiriman agar saluran cadangan resmi aktif.'
                      : 'Akun Gmail alternatif belum dihubungkan. Klik Tab "3. Metode 2: Gmail Alternatif" untuk menghubungkan akun Google satker Anda.'}
                  </p>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSaveStrategy}
                disabled={isSaving}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <SaveIcon className="w-4 h-4" />}
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Pilihan Strategi'}</span>
              </button>
            </div>
          </div>

          {/* Quick Real Send Test Block */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-400" />
                <span>Uji Coba Pengiriman Berdasarkan Strategi Aktif</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                Strategi: {deliveryStrategy}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Kirimkan dokumen sertifikat uji coba lengkap dengan nomor registrasi resmi dan lampiran PDF untuk memvalidasi alur pengiriman dan mekanisme fallback saat ini.
            </p>

            <form onSubmit={handleSendTestEmail} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={testEmailRecipient}
                onChange={(e) => setTestEmailRecipient(e.target.value)}
                placeholder="Masukkan alamat email Anda (misal: admin@gmail.com)"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={isSendingTestEmail}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-900/30 disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
              >
                {isSendingTestEmail ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{isSendingTestEmail ? 'Mengirimkan Dokumen...' : 'Kirim Uji Coba'}</span>
              </button>
            </form>

            {sendTestResult && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                  sendTestResult.success
                    ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                    : 'bg-rose-950/60 border-rose-700 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {sendTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>{sendTestResult.message}</span>
                </div>
                {sendTestResult.status && (
                  <div className="text-[11px] font-mono opacity-90 pl-6">
                    Status Hasil: <span className="underline">{sendTestResult.status}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: METODE 1 — EMAIL RESMI BNN (SMTP / RELAY) */}
      {/* ========================================================================= */}
      {activeTab === 'bnn' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Server className="w-5 h-5 text-blue-400" />
                  <span>Konfigurasi Server Email Resmi Satker BNN</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Akun satker resmi BNN (misalnya: <code className="text-amber-300">bnn_kabgor@bnn.go.id</code>). Diperoleh dari administrator pusat Pusdatin BNN.
                </p>
              </div>

              {/* Toggle SMTP vs Relay API */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setBnnMethod('bnn_smtp')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    bnnMethod === 'bnn_smtp'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  SMTP Resmi
                </button>
                <button
                  type="button"
                  onClick={() => setBnnMethod('bnn_relay_api')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    bnnMethod === 'bnn_relay_api'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  API Relay Resmi
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveBnnConfig} className="space-y-4">
              {bnnMethod === 'bnn_smtp' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Host Server SMTP Resmi BNN *
                      </label>
                      <input
                        type="text"
                        required
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder="mail.bnn.go.id"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                      />
                      <span className="text-[10px] text-slate-500">
                        Default mail server BNN: mail.bnn.go.id atau IP yang diizinkan Pusdatin.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Port & Protokol Keamanan *
                      </label>
                      <select
                        value={smtpPort}
                        onChange={(e) => {
                          const p = parseInt(e.target.value, 10);
                          setSmtpPort(p);
                          setSmtpSecure(p === 465);
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                      >
                        <option value={465}>Port 465 (SSL/TLS - Direkomendasikan)</option>
                        <option value={587}>Port 587 (STARTTLS)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Alamat Email Akun Satker Resmi *
                      </label>
                      <input
                        type="email"
                        required
                        value={smtpUser}
                        onChange={(e) => {
                          setSmtpUser(e.target.value);
                          setBnnSenderAddress(e.target.value);
                        }}
                        placeholder="bnn_kabgor@bnn.go.id"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-300">
                          Password Akun / App Password Satker *
                        </label>
                        <span className="text-[10px] font-mono text-slate-400">
                          {status?.bnnSmtp?.hasPassword ? '✓ Tersimpan di Backend' : 'Belum Ada'}
                        </span>
                      </div>
                      <input
                        type="password"
                        value={smtpPass}
                        onChange={(e) => setSmtpPass(e.target.value)}
                        placeholder={status?.bnnSmtp?.hasPassword ? '•••••••••••• (Ketik untuk mengganti)' : 'Masukkan password akun satker'}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Endpoint URL REST Relay API Resmi BNN *
                    </label>
                    <input
                      type="url"
                      value={relayEndpoint}
                      onChange={(e) => setRelayEndpoint(e.target.value)}
                      placeholder="https://api-mail.bnn.go.id/v1/send"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Token API Key Relay / Bearer Token
                    </label>
                    <input
                      type="password"
                      value={relayApiKey}
                      onChange={(e) => setRelayApiKey(e.target.value)}
                      placeholder="Token otorisasi dari Pusdatin BNN"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <SaveIcon className="w-4 h-4" />}
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi BNN'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestBnnConnection}
                  disabled={isTestingBnn}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isTestingBnn ? 'animate-spin' : ''}`} />
                  <span>{isTestingBnn ? 'Memeriksa Soket...' : 'Uji Koneksi Server (Handshake)'}</span>
                </button>
              </div>
            </form>

            {/* Handshake Result */}
            {bnnTestResult && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                  bnnTestResult.success
                    ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                    : 'bg-rose-950/60 border-rose-700 text-rose-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  {bnnTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold">{bnnTestResult.message}</span>
                    {bnnTestResult.details?.rejectionReason && (
                      <p className="text-[11px] text-rose-300 mt-1">
                        Sebab: {bnnTestResult.details.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: METODE 2 — GMAIL ALTERNATIF (OAUTH 2.0) */}
      {/* ========================================================================= */}
      {activeTab === 'gmail' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-5">
            <div className="border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📧</span>
                <h3 className="text-base font-bold text-white">
                  Jalur Pengiriman Gmail Alternatif (Gmail API & OAuth 2.0)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Menggunakan akun Gmail resmi yang dipilih satker (misal: <code className="text-amber-300">sertifikat.bnnkgorontalo@gmail.com</code>). Terhubung melalui integrasi resmi Google Workspace API.
              </p>
            </div>

            {/* Connection Status Card */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-slate-400">Status Koneksi Akun:</div>
                  <div className="flex items-center gap-2">
                    {status?.gmail.connected ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Terhubung: {status.gmail.email}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                        Belum Terhubung
                      </span>
                    )}

                    {status?.gmail.connected && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          status.gmail.isTestSendPassed
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {status.gmail.isTestSendPassed ? '✓ Lulus Uji Coba' : 'Belum Diuji'}
                      </span>
                    )}
                  </div>
                </div>

                {/* OAuth Action Buttons */}
                <div className="flex items-center gap-2">
                  {!status?.gmail.connected ? (
                    <button
                      type="button"
                      onClick={handleConnectGmail}
                      disabled={isConnectingGmail}
                      className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                    >
                      {/* Google G Icon */}
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        />
                      </svg>
                      <span>{isConnectingGmail ? 'Menghubungkan...' : 'Hubungkan Akun Gmail'}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleConnectGmail}
                        disabled={isConnectingGmail}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                        <span>Hubungkan Ulang</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDisconnectGmail}
                        className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold rounded-lg border border-rose-800/40 transition-colors flex items-center gap-1.5"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        <span>Putuskan Koneksi</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* OAuth Security Guarantees */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                <div>
                  <span className="text-slate-200 font-semibold block">Scope Izin Minimum:</span>
                  <code className="text-emerald-400 font-mono text-[10px]">https://www.googleapis.com/auth/gmail.send</code>
                </div>
                <div>
                  <span className="text-slate-200 font-semibold block">Penyimpanan Kredensial:</span>
                  <span>Terenkripsi di server backend (Tidak ada password tersimpan)</span>
                </div>
                <div>
                  <span className="text-slate-200 font-semibold block">Waktu Terhubung:</span>
                  <span>{status?.gmail.connectedAt ? new Date(status.gmail.connectedAt).toLocaleString('id-ID') : '-'}</span>
                </div>
              </div>
            </div>

            {/* Test Send Section (Mandatory before activation) */}
            {status?.gmail.connected && (
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Send className="w-4 h-4 text-emerald-400" />
                    <span>Uji Coba Pengiriman Gmail Alternatif (Wajib)</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Sesuai ketentuan, metode Gmail hanya akan diaktifkan setelah pengiriman percobaan berhasil dikirimkan ke kotak masuk Anda.
                  </p>
                </div>

                <form onSubmit={handleTestGmailSend} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    required
                    value={gmailTestRecipient}
                    onChange={(e) => setGmailTestRecipient(e.target.value)}
                    placeholder={`Email penerima uji coba (default: ${status.gmail.email})`}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    type="submit"
                    disabled={isTestingGmail}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-900/30 disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
                  >
                    {isTestingGmail ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{isTestingGmail ? 'Mengirim Uji Coba...' : 'Kirim Uji Coba Gmail'}</span>
                  </button>
                </form>

                {gmailTestResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                      gmailTestResult.success
                        ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                        : 'bg-rose-950/60 border-rose-700 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold">
                      {gmailTestResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span>{gmailTestResult.message}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: NAMA PENGIRIM & TEMPLATE EMAIL PER METODE */}
      {/* ========================================================================= */}
      {activeTab === 'senders' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-5">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-purple-400" />
                <span>Pemisahan Identitas Pengirim & Format Email</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Setiap metode menggunakan identitas pengirim resmi masing-masing tanpa menyamarkan (spoofing) domain email.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Method BNN Identity */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase">
                  <Server className="w-4 h-4" />
                  <span>Identitas Metode Email Resmi BNN</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nama Pengirim BNN:
                  </label>
                  <input
                    type="text"
                    value={bnnSenderName}
                    onChange={(e) => setBnnSenderName(e.target.value)}
                    placeholder="BNN Kabupaten Gorontalo"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Alamat Email Pengirim BNN:
                  </label>
                  <input
                    type="email"
                    value={bnnSenderAddress}
                    onChange={(e) => setBnnSenderAddress(e.target.value)}
                    placeholder="bnn_kabgor@bnn.go.id"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="text-[11px] text-slate-400 p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  Header: <code className="text-amber-300 font-mono">"{bnnSenderName}" &lt;{bnnSenderAddress}&gt;</code>
                </div>
              </div>

              {/* Method Gmail Identity */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase">
                  <Globe className="w-4 h-4" />
                  <span>Identitas Metode Gmail Alternatif</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nama Pengirim Gmail:
                  </label>
                  <input
                    type="text"
                    value={gmailSenderName}
                    onChange={(e) => setGmailSenderName(e.target.value)}
                    placeholder="e-Sertifikat BNN Kabupaten Gorontalo"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Alamat Email Akun Gmail (Terotorisasi):
                  </label>
                  <input
                    type="email"
                    readOnly
                    value={status?.gmail.email || gmailSenderAddress}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 font-mono cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-500">
                    Otomatis mengikuti akun Gmail yang diotorisasi via OAuth 2.0.
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  Header: <code className="text-emerald-300 font-mono">"{gmailSenderName}" &lt;{status?.gmail.email || gmailSenderAddress}&gt;</code>
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end border-t border-slate-800">
              <button
                type="button"
                onClick={handleSaveStrategy}
                disabled={isSaving}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <SaveIcon className="w-4 h-4" />}
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan Identitas'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: FORMAT SURAT PERMOHONAN PUSDATIN & PANDUAN VERCEL */}
      {/* ========================================================================= */}
      {activeTab === 'docs' && (
        <div className="space-y-6 max-w-4xl">
          {/* Format Surat Pusdatin */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  <span>Draft Tiket / Surat Permohonan Akses SMTP Pusdatin BNN</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Surat resmi permohonan pembukaan akses koneksi SMTP resmi atau REST Relay kepada pengelola IT BNN Pusat.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyLetter}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shrink-0"
              >
                {copiedLetter ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLetter ? 'Tersalin ke Clipboard!' : 'Salin Teks Surat'}</span>
              </button>
            </div>

            <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {officialLetterText}
            </div>
          </div>

          {/* Panduan Cloud & Vercel */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-400" />
              <span>Panduan Konfigurasi Google Cloud Console & Deployment Vercel</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-white text-sm">
                  A. Langkah Konfigurasi Google Cloud Console (Gmail API):
                </span>
                <p>1. Buka <strong>Google Cloud Console</strong> &gt; pilih project aplikasi.</p>
                <p>2. Di menu <strong>APIs &amp; Services</strong> &gt; aktifkan <strong>Gmail API</strong>.</p>
                <p>3. Di menu <strong>OAuth consent screen</strong> &gt; tambahkan scope <code className="text-emerald-400 font-mono">https://www.googleapis.com/auth/gmail.send</code>.</p>
                <p>4. Jika aplikasi berstatus "Testing", tambahkan alamat Gmail satker Anda ke daftar <strong>Test Users</strong>.</p>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-white text-sm">
                  B. Penanganan Token Kedaluwarsa & Firewall:
                </span>
                <p>• <strong>Batas Port Cloud:</strong> Port 25 diblokir di cloud publik (Vercel, AWS, Google Cloud). Sistem ini secara eksklusif menggunakan Port 465 (SSL), Port 587 (TLS), atau REST API HTTPS yang 100% didukung.</p>
                <p>• <strong>Pembaruan Otorisasi:</strong> Jika Google mencabut izin atau token akses kedaluwarsa setelah beberapa bulan, sistem menampilkan status <em>"Perlu Tindakan Administrator"</em> dan tombol <strong>"Hubungkan Ulang"</strong> dapat ditekan kapan saja.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function SaveIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}
