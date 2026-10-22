import React from 'react';
import {
  Calendar,
  Award,
  ArrowRight,
  ShieldCheck,
  Mail,
  FileCheck,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { Activity } from '../../types';
import { storage } from '../../utils/storage';

interface PublicHomeViewProps {
  onSelectActivity: (activityId: string) => void;
  onNavigateToVerify: () => void;
}

export const PublicHomeView: React.FC<PublicHomeViewProps> = ({
  onSelectActivity,
  onNavigateToVerify,
}) => {
  const activities = storage.getActivities().filter((a) => a.isActive && !a.isArchived);

  return (
    <div className="space-y-12 py-6">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-4 px-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EAF4FC] border border-[#00529B]/20 text-[#00529B] text-xs font-bold shadow-xs">
          <Award className="w-4 h-4 text-[#00529B]" />
          <span>Layanan Sertifikasi & Verifikasi Dokumen Digital Resmi BNN</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-[#003566] tracking-tight leading-tight">
          Penerbitan e-Sertifikat Resmi & Terverifikasi
        </h1>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Daftarkan kehadiran kegiatan Anda, peroleh nomor registrasi resmi secara otomatis, dan dapatkan sertifikat digital A4 berkualitas tinggi langsung terkirim ke email Anda.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <a
            href="#daftar-kegiatan"
            className="px-6 py-3 bg-[#00529B] hover:bg-[#003566] text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-900/15 flex items-center gap-2"
          >
            <span>Daftar Kegiatan Sekarang</span>
            <ArrowRight className="w-4 h-4" />
          </a>

          <button
            onClick={onNavigateToVerify}
            className="px-6 py-3 bg-white hover:bg-slate-50 text-[#003566] font-bold text-sm rounded-xl border border-slate-300 transition-colors flex items-center gap-2 shadow-xs"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Verifikasi Keaslian Sertifikat</span>
          </button>
        </div>
      </div>

      {/* 3 Pillars Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto px-4">
        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl space-y-2 hover:border-[#00529B]/40 hover:shadow-md transition-all shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-[#EAF4FC] text-[#00529B] flex items-center justify-center font-bold">
            <FileCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#003566]">Nomor Registrasi Unik Otomatis</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Format penomoran terstruktur dengan kode klasifikasi, unit kerja, bulan Romawi, dan tahun penerbitan yang aman dari duplikasi.
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl space-y-2 hover:border-emerald-500/40 hover:shadow-md transition-all shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#003566]">Verifikasi QR Code Kriptografis</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Setiap sertifikat dilengkapi QR code dan ID unik yang dapat dicek keabsahannya kapan saja oleh publik dan instansi pemeriksa.
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl space-y-2 hover:border-[#1677C8]/40 hover:shadow-md transition-all shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1677C8] flex items-center justify-center font-bold">
            <Mail className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#003566]">Pengiriman Langsung ke Email</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Dokumen PDF sertifikat ukuran A4 siap cetak dikirimkan langsung ke alamat email peserta begitu formulir pendaftaran berhasil divalidasi.
          </p>
        </div>
      </div>

      {/* Available Activities Section */}
      <div id="daftar-kegiatan" className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-2xl font-black text-[#003566] tracking-tight">
              Kegiatan yang Sedang Dibuka
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Pilih kegiatan yang Anda ikuti dan isi formulir pendaftaran untuk mendapatkan sertifikat resmi.
            </p>
          </div>
          <span className="text-xs font-bold text-[#00529B] bg-[#EAF4FC] px-3.5 py-1.5 rounded-full border border-[#00529B]/20">
            {activities.length} Kegiatan Aktif
          </span>
        </div>

        {activities.length === 0 ? (
          <div className="bg-white border border-slate-200 p-12 text-center rounded-2xl shadow-xs">
            <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">Belum Ada Kegiatan Aktif</h3>
            <p className="text-xs text-slate-500 mt-1">
              Saat ini belum ada pendaftaran kegiatan yang dibuka oleh panitia.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activities.map((act) => (
              <div
                key={act.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-6 flex flex-col justify-between hover:border-[#00529B]/40 hover:shadow-lg transition-all shadow-xs group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Pendaftaran Dibuka
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      s/d {act.endDate}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#003566] leading-snug group-hover:text-[#00529B] transition-colors">
                    {act.name}
                  </h3>

                  <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                    {act.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Jenis Sertifikat:</span>
                      <strong className="text-slate-800">{act.certificateType}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Penyelenggara:</span>
                      <strong className="text-slate-800">
                        {act.registrationNumberConfig.institutionCode}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => onSelectActivity(act.id)}
                    className="w-full py-2.5 px-4 bg-[#00529B] hover:bg-[#003566] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-900/10 flex items-center justify-center gap-2"
                  >
                    <span>Daftar & Terbitkan Sertifikat</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
