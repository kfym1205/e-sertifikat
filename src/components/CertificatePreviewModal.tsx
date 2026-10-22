import React, { useState } from 'react';
import { X, Download, ShieldCheck, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { Activity, CertificateIssuance, CertificateTemplate, LayoutElement } from '../types';
import { downloadCertificatePdf } from '../utils/pdfGenerator';
import { storage } from '../utils/storage';

interface CertificatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  issuance: CertificateIssuance;
  template?: CertificateTemplate;
  onResendEmail?: (issuanceId: string) => void;
}

export const CertificatePreviewModal: React.FC<CertificatePreviewModalProps> = ({
  isOpen,
  onClose,
  issuance,
  template: propTemplate,
  onResendEmail,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [resendStatus, setResendStatus] = useState<{ loading: boolean; message?: string; success?: boolean }>({
    loading: false
  });

  if (!isOpen) return null;

  const template = propTemplate || storage.getTemplate(issuance.templateSnapshotId) || storage.getTemplates()[0];
  const layout = issuance.layoutSnapshot || storage.getActivities().find(a => a.id === issuance.activityId)?.layoutElements || [];
  const isLandscape = template?.orientation !== 'portrait';

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadCertificatePdf(template, layout, {
        participantName: issuance.participantName,
        registrationNumber: issuance.registrationNumber,
        issueDate: issuance.issueDate,
        verificationId: issuance.verificationId,
      });
    } catch (e) {
      console.error('Download error:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleResend = async () => {
    setResendStatus({ loading: true });
    try {
      const res = await storage.resendCertificateEmail(issuance.id);
      setResendStatus({ loading: false, success: res.success, message: res.message });
      if (onResendEmail) onResendEmail(issuance.id);
    } catch (e: any) {
      setResendStatus({ loading: false, success: false, message: e.message || 'Gagal mengirim ulang' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:px-6 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white truncate max-w-md">
                Pratinjau Sertifikat Resmi
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                issuance.status === 'valid'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {issuance.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Nomor Registrasi: <span className="font-mono text-amber-300">{issuance.registrationNumber}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-all shadow-sm shadow-amber-500/20 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloading ? 'Menyiapkan...' : 'Unduh PDF A4'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Resend notification toast if active */}
        {resendStatus.message && (
          <div className={`px-4 py-2 text-xs flex items-center gap-2 shrink-0 ${
            resendStatus.success ? 'bg-emerald-950 text-emerald-300 border-b border-emerald-800' : 'bg-rose-950 text-rose-300 border-b border-rose-800'
          }`}>
            {resendStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{resendStatus.message}</span>
          </div>
        )}

        {/* Certificate Display Canvas */}
        <div className="p-4 sm:p-6 bg-slate-950 flex-1 overflow-auto flex items-center justify-center">
          <div
            className={`relative bg-white shadow-2xl rounded-sm overflow-hidden border border-slate-300 mx-auto select-none`}
            style={{
              aspectRatio: isLandscape ? '297 / 210' : '210 / 297',
              width: isLandscape ? '100%' : '75%',
              maxWidth: isLandscape ? '800px' : '560px',
            }}
          >
            {/* Background Template */}
            {template?.bgImageUrl && (
              <img
                src={template.bgImageUrl}
                alt="Template Background"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
            )}

            {/* Dynamic Elements Overlaid in exact millimeter percentage */}
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
                      <div className="w-12 h-12 bg-slate-900 flex items-center justify-center text-white rounded text-[8px] font-mono text-center leading-none p-1">
                        QR VERIFIKASI RESMI
                      </div>
                    </div>
                  </div>
                );
              }

              let text = '';
              switch (element.id) {
                case 'participant_name':
                  text = element.textTransform === 'uppercase'
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
                    maxWidth: element.maxWidthMm ? `${(element.maxWidthMm / totalWidthMm) * 100}%` : '85%',
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

        {/* Footer info & Resend button */}
        <div className="p-4 bg-slate-800/90 border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-4 text-slate-300">
            <div>
              <span className="text-slate-400">Penerima:</span>{' '}
              <strong className="text-white">{issuance.participantName}</strong> ({issuance.participantEmail})
            </div>
            <div className="hidden sm:block">
              <span className="text-slate-400">Status Email:</span>{' '}
              <span className={issuance.emailStatus === 'delivered' ? 'text-emerald-400' : 'text-rose-400'}>
                {issuance.emailStatus === 'delivered' ? 'Terkirim' : 'Gagal / Perlu Kirim Ulang'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResend}
              disabled={resendStatus.loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 font-medium rounded-lg transition-colors border border-slate-600 disabled:opacity-50"
            >
              <Mail className="w-3.5 h-3.5 text-amber-400" />
              <span>{resendStatus.loading ? 'Mengirim...' : 'Kirim Ulang Email'}</span>
            </button>
            <a
              href={`/verifikasi/${issuance.verificationId}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-950 text-slate-300 font-medium rounded-lg transition-colors border border-slate-700"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Buka Verifikasi</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
