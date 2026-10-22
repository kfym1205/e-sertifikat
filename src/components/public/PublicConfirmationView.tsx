import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Download,
  Mail,
  ShieldCheck,
  ExternalLink,
  ArrowRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { CertificateIssuance, CertificateTemplate } from '../../types';
import { storage } from '../../utils/storage';
import { downloadCertificatePdf } from '../../utils/pdfGenerator';

interface PublicConfirmationViewProps {
  issuance: CertificateIssuance;
  isReissue?: boolean;
  onHome: () => void;
  onVerify: (code: string) => void;
}

export const PublicConfirmationView: React.FC<PublicConfirmationViewProps> = ({
  issuance,
  isReissue,
  onHome,
  onVerify,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const template: CertificateTemplate =
    storage.getTemplate(issuance.templateSnapshotId) || storage.getTemplates()[0];
  const layout = issuance.layoutSnapshot || [];
  const isLandscape = template?.orientation !== 'portrait';

  useEffect(() => {
    // Trigger celebratory confetti effect
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#d4af37', '#0284c7', '#10b981', '#f59e0b'],
      });
    } catch (e) {
      // Ignore if canvas-confetti is not supported
    }
  }, []);

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      await downloadCertificatePdf(template, layout, {
        participantName: issuance.participantName,
        registrationNumber: issuance.registrationNumber,
        issueDate: issuance.issueDate,
        verificationId: issuance.verificationId,
      });
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8 animate-in fade-in zoom-in-95 duration-300">
      {/* Top Congratulation Banner */}
      {/* Success Hero Header */}
      <div className="bg-white border border-slate-200/90 p-6 sm:p-8 rounded-3xl text-center space-y-3 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#EAF4FC] text-[#00529B] text-xs font-bold border border-[#00529B]/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isReissue ? 'Sertifikat Ditemukan Kembali (Idempotent)' : 'Pendaftaran Berhasil & Sertifikat Terbit'}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-[#003566] tracking-tight">
          Selamat, {issuance.participantName}!
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
          Sertifikat resmi kegiatan <strong>{issuance.activityName}</strong> telah berhasil diproses oleh sistem dan nomor registrasi resmi telah dialokasikan.
        </p>

        {/* Highlighted Registration Number */}
        <div className="pt-2">
          <div className="inline-block bg-[#EAF4FC] px-6 py-3 rounded-2xl border border-[#00529B]/30 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#00529B] block mb-0.5">
              Nomor Registrasi Resmi BNN:
            </span>
            <span className="font-mono text-lg sm:text-xl font-black text-[#003566]">
              {issuance.registrationNumber}
            </span>
          </div>
        </div>

        {/* Email delivery status */}
        <div className="pt-2 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Mail className="w-4 h-4 text-emerald-600" />
          <span>
            {issuance.emailStatus === 'delivered'
              ? `Email konfirmasi & lampiran sertifikat telah dikirim ke ${issuance.participantEmail}`
              : `Email sedang diproses ke ${issuance.participantEmail}`}
          </span>
        </div>
      </div>

      {/* Certificate Live Preview Card */}
      <div className="bg-white border border-slate-200/90 p-4 sm:p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#003566] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Pratinjau Sertifikat Dokumen A4</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            ID: {issuance.verificationId}
          </span>
        </div>

        {/* Certificate Canvas */}
        <div className="bg-slate-100 p-3 sm:p-6 rounded-2xl flex items-center justify-center overflow-auto border border-slate-200">
          <div
            className="relative bg-white shadow-2xl rounded-sm overflow-hidden border border-slate-300 mx-auto select-none"
            style={{
              aspectRatio: isLandscape ? '297 / 210' : '210 / 297',
              width: '100%',
              maxWidth: isLandscape ? '700px' : '500px',
            }}
          >
            {/* Background Template */}
            {template?.bgImageUrl && (
              <img
                src={template.bgImageUrl}
                alt="Background Template"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
            )}

            {/* Elements */}
            {layout.map((element) => {
              if (!element.enabled) return null;
              const totalWidthMm = isLandscape ? 297 : 210;
              const totalHeightMm = isLandscape ? 210 : 297;
              const leftPercent = (element.xMm / totalWidthMm) * 100;
              const topPercent = (element.yMm / totalHeightMm) * 100;

              if (element.id === 'qr_code') {
                return (
                  <div
                    key={element.id}
                    className="absolute z-10 flex flex-col items-center"
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <div className="bg-white p-1 rounded border border-slate-300 shadow-sm">
                      <div className="w-10 h-10 bg-slate-900 rounded flex items-center justify-center text-[7px] text-white font-mono text-center p-0.5 leading-none">
                        QR RESMI
                      </div>
                    </div>
                  </div>
                );
              }

              let text = '';
              switch (element.id) {
                case 'participant_name':
                  text =
                    element.textTransform === 'uppercase'
                      ? issuance.participantName.toUpperCase()
                      : issuance.participantName;
                  break;
                case 'reg_number':
                  text = issuance.registrationNumber;
                  break;
                case 'cert_date':
                  text = issuance.issueDate;
                  break;
                case 'extra_text':
                  text = element.sampleValue || 'Atas partisipasi aktif dalam kegiatan';
                  break;
              }

              return (
                <div
                  key={element.id}
                  className="absolute z-10 pointer-events-none"
                  style={{
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                    transform:
                      element.textAlign === 'center'
                        ? 'translate(-50%, -50%)'
                        : element.textAlign === 'right'
                        ? 'translate(-100%, -50%)'
                        : 'translate(0%, -50%)',
                    color: element.color || '#0f172a',
                    fontFamily: element.fontFamily,
                    fontSize: `calc(${element.fontSizePt} * 0.95px)`,
                    fontWeight: element.fontWeight || 'normal',
                    textAlign: element.textAlign || 'center',
                    maxWidth: element.maxWidthMm
                      ? `${(element.maxWidthMm / totalWidthMm) * 100}%`
                      : '85%',
                    lineHeight: 1.25,
                    whiteSpace: element.id === 'participant_name' ? 'normal' : 'nowrap',
                  }}
                >
                  {text}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
          <button
            onClick={() => onVerify(issuance.verificationId)}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#003566] text-xs font-bold rounded-xl border border-slate-300 transition-colors flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Periksa Halaman Verifikasi Dokumen</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#00529B] hover:bg-[#003566] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-900/15 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>{isDownloading ? 'Menyiapkan PDF...' : 'Unduh Sertifikat PDF Resmi A4'}</span>
          </button>
        </div>
      </div>

      <div className="text-center pt-2">
        <button
          onClick={onHome}
          className="text-xs text-slate-500 hover:text-[#00529B] font-semibold transition-colors"
        >
          &larr; Kembali ke Daftar Kegiatan
        </button>
      </div>
    </div>
  );
};
