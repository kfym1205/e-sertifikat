import React, { useState } from 'react';
import {
  Calendar,
  User,
  Mail,
  Building,
  Phone,
  FileText,
  ShieldCheck,
  ArrowLeft,
  Send,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Activity, CertificateIssuance } from '../../types';
import { storage } from '../../utils/storage';

interface PublicRegistrationFormProps {
  activityId: string;
  onBack: () => void;
  onSuccess: (issuance: CertificateIssuance, isReissue?: boolean) => void;
}

export const PublicRegistrationForm: React.FC<PublicRegistrationFormProps> = ({
  activityId,
  onBack,
  onSuccess,
}) => {
  const activity = storage.getActivity(activityId);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [institution, setInstitution] = useState('');
  const [phone, setPhone] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!activity) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Kegiatan Tidak Ditemukan</h3>
        <p className="text-xs text-slate-400">
          Kegiatan yang Anda cari mungkin telah ditutup atau tautan pendaftaran tidak valid.
        </p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
        >
          Kembali ke Daftar Kegiatan
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Nama lengkap wajib diisi sesuai identitas resmi.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMsg('Harap masukkan alamat email yang valid.');
      return;
    }

    if (activity.formSettings.requireInstitution && !institution.trim()) {
      setErrorMsg('Asal instansi / organisasi wajib diisi.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await storage.registerAndIssueCertificate({
        activityId: activity.id,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        institution: institution.trim(),
        customFieldValue: customValue.trim(),
        baseUrl: window.location.origin,
      });

      if (!result.success || !result.issuance) {
        setErrorMsg(result.error || 'Terjadi kegagalan saat menerbitkan sertifikat.');
        setIsSubmitting(false);
        return;
      }

      // Berhasil diterbitkan
      onSuccess(result.issuance, result.isDuplicateReissue);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memproses pendaftaran.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#00529B] font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Beranda Kegiatan</span>
      </button>

      {/* Activity Header Card */}
      <div className="bg-white border border-slate-200/90 p-6 rounded-2xl shadow-xs space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Formulir Pendaftaran Resmi
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EAF4FC] text-[#00529B] border border-[#00529B]/20">
            {activity.certificateType}
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-[#003566] tracking-tight">
          {activity.name}
        </h1>

        <p className="text-xs text-slate-600 leading-relaxed">
          {activity.description}
        </p>

        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Penyelenggara: <strong className="text-slate-800">{activity.registrationNumberConfig.institutionCode}</strong>
          </span>
          <span className="flex items-center gap-1 font-mono">
            <Calendar className="w-3.5 h-3.5 text-[#00529B]" />
            Batas Pendaftaran: {activity.endDate}
          </span>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white border border-slate-200/90 p-6 rounded-2xl shadow-sm space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-[#003566]">Data Peserta Penerima Sertifikat</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pastikan penulisan ejaan nama dan gelar sudah benar karena akan dicetak langsung pada sertifikat.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nama Lengkap & Gelar (Jika Ada) *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Contoh: Muhammad Rizky Pratama, S.T."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#00529B] focus:ring-1 focus:ring-[#00529B]"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Gunakan huruf kapital atau gelar yang sesuai untuk keperluan dokumen resmi.
            </p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Alamat Email Aktif *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="namaanda@gmail.com"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#00529B] focus:ring-1 focus:ring-[#00529B]"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Dokumen PDF sertifikat dan nomor registrasi akan dikirimkan ke alamat email ini.
            </p>
          </div>

          {/* Institution / Organization */}
          {activity.formSettings.requireInstitution && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Instansi / Organisasi / Asal Lembaga *
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="Contoh: Universitas Negeri Gorontalo / Forum Pemuda"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#00529B] focus:ring-1 focus:ring-[#00529B]"
                />
              </div>
            </div>
          )}

          {/* Phone Number */}
          {activity.formSettings.requirePhone && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nomor WhatsApp / Telepon
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="081234567890"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#00529B] focus:ring-1 focus:ring-[#00529B]"
                />
              </div>
            </div>
          )}

          {/* Custom Field */}
          {activity.formSettings.requireCustomField && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {activity.formSettings.customFieldLabel || 'Keterangan Tambahan'}
              </label>
              <input
                type="text"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="Isi keterangan Anda..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-[#00529B] focus:ring-1 focus:ring-[#00529B]"
              />
            </div>
          )}

          {/* Anti-spam / Security disclaimer */}
          <div className="p-3 bg-[#EAF4FC] rounded-xl border border-[#00529B]/20 flex items-center justify-between text-[11px] text-[#003566]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-medium">Proteksi Anti-Bot & Rate Limiting Aktif</span>
            </span>
            <span className="font-mono text-[10px] text-[#00529B]">IDEMPOTENT_V1</span>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-[#00529B] hover:bg-[#003566] text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-900/15 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Menerbitkan Sertifikat & Mengirim Email...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Kirim Formulir & Dapatkan Sertifikat Resmi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
