import React from 'react';
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  ExternalLink,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { AppearanceConfig } from '../types';

interface FooterProps {
  config: AppearanceConfig['footer'];
  appName?: string;
}

export const Footer: React.FC<FooterProps> = ({ config, appName = 'e-Sertifikat BNN' }) => {
  const currentYear = new Date().getFullYear();

  // Helper to format full address string only from filled fields
  const addressParts = [
    config.address,
    config.village,
    config.district,
    config.city,
    config.province,
    config.postalCode ? `Kode Pos ${config.postalCode}` : '',
  ].filter(Boolean);

  const hasAddress = addressParts.length > 0;
  const hasContact = Boolean(
    config.phone || config.whatsapp || config.email || config.website || config.serviceHours
  );

  return (
    <footer
      className="mt-auto border-t border-slate-700/40 transition-colors"
      style={{
        backgroundColor: config.bgColor || '#003566',
        color: config.textColor || '#E2E8F0',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${config.columns || 4} gap-8 text-${
            config.textAlign || 'left'
          }`}
        >
          {/* Kolom 1: Identitas Instansi */}
          {config.showIdentity && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {config.footerLogoUrl ? (
                  <img
                    src={config.footerLogoUrl}
                    alt="Logo Instansi"
                    className="w-12 h-12 object-contain shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#00529B] to-[#1677C8] flex items-center justify-center text-white font-bold shadow-md">
                    <Award className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h3 className="font-extrabold text-base tracking-tight text-white leading-tight">
                    {appName}
                  </h3>
                  {config.unitName && (
                    <p className="text-xs text-amber-300 font-semibold mt-0.5">
                      {config.unitName}
                    </p>
                  )}
                  {config.institutionName && (
                    <p className="text-[11px] opacity-80 mt-0.5">
                      {config.institutionName}
                    </p>
                  )}
                </div>
              </div>

              {config.description && (
                <p className="text-xs opacity-80 leading-relaxed max-w-sm">
                  {config.description}
                </p>
              )}

              {config.additionalInfo && (
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] opacity-90 leading-relaxed">
                  {config.additionalInfo}
                </div>
              )}
            </div>
          )}

          {/* Kolom 2: Alamat Kantor (Hanya tampil jika ada isinya) */}
          {config.showAddress && hasAddress && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Alamat Kantor Resmi</span>
              </h4>

              <div className="text-xs opacity-90 leading-relaxed space-y-1">
                {config.unitName && (
                  <p className="font-semibold text-white">{config.unitName}</p>
                )}
                <p>{addressParts.join(', ')}</p>
              </div>

              {config.serviceHours && (
                <div className="pt-2 flex items-start gap-2 text-xs opacity-80">
                  <Clock className="w-3.5 h-3.5 shrink-0 text-amber-300 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-white text-[11px]">Jam Pelayanan:</span>
                    <span>{config.serviceHours}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Kolom 3: Kontak Resmi (Hanya tampil field yang terisi) */}
          {config.showContact && hasContact && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                <Phone className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Kontak & Layanan</span>
              </h4>

              <ul className="space-y-2 text-xs opacity-90">
                {config.phone && (
                  <li className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Telepon: {config.phone}</span>
                  </li>
                )}

                {config.whatsapp && (
                  <li className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 text-emerald-400 font-bold shrink-0 text-[10px]">WA</span>
                    <span>WhatsApp: {config.whatsapp}</span>
                  </li>
                )}

                {config.email && (
                  <li className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <a
                      href={`mailto:${config.email}`}
                      className="hover:underline text-white font-mono"
                    >
                      {config.email}
                    </a>
                  </li>
                )}

                {config.website && (
                  <li className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                    <a
                      href={config.website}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline text-white flex items-center gap-1 font-mono text-[11px]"
                    >
                      <span>{config.website.replace(/^https?:\/\//, '')}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Kolom 4: Tautan Resmi & Media Sosial */}
          {config.showLegal && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Informasi & Tautan Resmi</span>
              </h4>

              <ul className="space-y-2 text-xs opacity-90">
                {config.privacyPolicyUrl && (
                  <li>
                    <a
                      href={config.privacyPolicyUrl}
                      className="hover:underline hover:text-white transition-colors"
                      style={{ color: config.linkColor || '#93C5FD' }}
                    >
                      Kebijakan Privasi Data Peserta
                    </a>
                  </li>
                )}

                {config.termsUrl && (
                  <li>
                    <a
                      href={config.termsUrl}
                      className="hover:underline hover:text-white transition-colors"
                      style={{ color: config.linkColor || '#93C5FD' }}
                    >
                      Syarat & Ketentuan Layanan
                    </a>
                  </li>
                )}

                <li>
                  <a
                    href="https://bnn.go.id"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline hover:text-white transition-colors flex items-center gap-1"
                    style={{ color: config.linkColor || '#93C5FD' }}
                  >
                    <span>Portal Resmi BNN RI</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              </ul>

              {/* Social Media Links */}
              {config.showSocial && (
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-white block mb-1.5">
                    Kanal Informasi Resmi:
                  </span>
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    {config.socialInstagram && (
                      <a
                        href={config.socialInstagram}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium transition-colors"
                      >
                        Instagram
                      </a>
                    )}
                    {config.socialFacebook && (
                      <a
                        href={config.socialFacebook}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium transition-colors"
                      >
                        Facebook
                      </a>
                    )}
                    {config.socialYoutube && (
                      <a
                        href={config.socialYoutube}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium transition-colors"
                      >
                        YouTube
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Copyright Row */}
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs opacity-75">
          <p>
            © {config.autoYear ? currentYear : ''} {config.unitName || config.institutionName || 'Badan Narkotika Nasional'}. {config.copyrightText}
          </p>
          <div className="flex items-center gap-3 text-[11px]">
            <span>Sistem e-Sertifikat Digital BNN</span>
            <span>•</span>
            <span>Standar Dokumen A4 (210×297 mm)</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
