import { AppearanceConfig } from '../types';

/**
 * Logo Vektor Resmi Badan Narkotika Nasional (BNN)
 * Lingkaran biru tua (#003566) dengan pita emas (#D4AF37), bintang, dan lambang perisai BNN
 */
export const DEFAULT_BNN_LOGO_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bnnBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00529B" />
      <stop offset="100%" stop-color="#002b52" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#b48328" />
      <stop offset="30%" stop-color="#f5e182" />
      <stop offset="70%" stop-color="#d4af37" />
      <stop offset="100%" stop-color="#8c6114" />
    </linearGradient>
  </defs>

  <!-- Outer Ring with Gold Border -->
  <circle cx="100" cy="100" r="95" fill="url(#bnnBlueGrad)" stroke="url(#goldGrad)" stroke-width="5" />
  <circle cx="100" cy="100" r="86" fill="none" stroke="#d4af37" stroke-width="1.5" stroke-dasharray="3,2" />

  <!-- Inner Navy Circle -->
  <circle cx="100" cy="100" r="66" fill="#003566" stroke="url(#goldGrad)" stroke-width="3" />

  <!-- Central Shield / Emblem -->
  <path d="M 100,52 L 134,66 C 134,106 114,136 100,148 C 86,136 66,106 66,66 Z" fill="#ffffff" stroke="#00529B" stroke-width="2.5" />
  <path d="M 100,58 L 128,70 C 128,103 111,130 100,140 C 89,130 72,103 72,70 Z" fill="url(#bnnBlueGrad)" />

  <!-- Golden Scales of Justice / BNN Motif in center -->
  <!-- Center Column -->
  <rect x="98" y="70" width="4" height="48" fill="url(#goldGrad)" rx="2" />
  <!-- Balance Beam -->
  <rect x="80" y="76" width="40" height="3" fill="url(#goldGrad)" rx="1.5" />
  <!-- Left Pan -->
  <polygon points="76,88 88,88 82,93" fill="url(#goldGrad)" />
  <line x1="82" y1="78" x2="82" y2="88" stroke="#d4af37" stroke-width="1" />
  <!-- Right Pan -->
  <polygon points="112,88 124,88 118,93" fill="url(#goldGrad)" />
  <line x1="118" y1="78" x2="118" y2="88" stroke="#d4af37" stroke-width="1" />

  <!-- Golden 5-Point Star on Top of Shield -->
  <polygon points="100,64 102,69 107,69 103,72 105,77 100,74 95,77 97,72 93,69 98,69" fill="url(#goldGrad)" />

  <!-- Circular Text Path: BADAN NARKOTIKA NASIONAL -->
  <path id="textPathTop" d="M 28,100 A 72,72 0 1,1 172,100" fill="none" />
  <path id="textPathBottom" d="M 172,100 A 72,72 0 0,1 28,100" fill="none" />

  <text fill="#ffffff" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="9.5" font-weight="800" letter-spacing="2">
    <textPath href="#textPathTop" startOffset="50%" text-anchor="middle">
      BADAN NARKOTIKA NASIONAL
    </textPath>
  </text>
  <text fill="#f5e182" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="8.5" font-weight="700" letter-spacing="3.5">
    <textPath href="#textPathBottom" startOffset="50%" text-anchor="middle">
      REPUBLIK INDONESIA
    </textPath>
  </text>

  <!-- Side Stars -->
  <circle cx="28" cy="100" r="2.5" fill="#d4af37" />
  <circle cx="172" cy="100" r="2.5" fill="#d4af37" />
</svg>
`)}`;

export const DEFAULT_APPEARANCE_CONFIG: AppearanceConfig = {
  id: 'appearance_bnn_default',
  // Header & Identity
  appName: 'e-Sertifikat BNN',
  appSubtitle: 'Badan Narkotika Nasional Republik Indonesia',
  logoUrl: DEFAULT_BNN_LOGO_SVG,
  logoHeightPx: 44,
  logoPosition: 'left',
  headerTitle: 'e-Sertifikat BNN',
  headerTitleSize: 'lg',
  headerTitleColor: '#FFFFFF',
  headerBgColor: '#003566',
  headerStyle: 'navy_gradient',
  showOnPublic: true,
  showOnAdmin: true,

  // Custom Footer
  footer: {
    institutionName: 'Badan Narkotika Nasional',
    unitName: 'BNN Kabupaten Gorontalo',
    footerLogoUrl: DEFAULT_BNN_LOGO_SVG,
    showIdentity: true,

    address: 'Jl. Ahmad A. Wahab No. 125',
    village: 'Kelurahan Kayubulan',
    district: 'Kecamatan Limboto',
    city: 'Kabupaten Gorontalo',
    province: 'Gorontalo',
    postalCode: '96211',
    showAddress: true,

    phone: '(0435) 881234',
    whatsapp: '0812-4567-8910',
    email: 'bnnkab_gorontalo@bnn.go.id',
    website: 'https://gorontalokab.bnn.go.id',
    serviceHours: 'Senin – Jumat: 08.00 – 16.00 WITA',
    showContact: true,

    description: 'Sistem Elektronik Resmi Pelayanan Sertifikasi dan Verifikasi Digital Partisipasi Relawan, Penggiat, dan Peserta Bimbingan Teknis P4GN Badan Narkotika Nasional.',
    copyrightText: 'Hak Cipta Dilindungi Undang-Undang.',
    autoYear: true,
    socialFacebook: 'https://facebook.com/bnnkabgorontalo',
    socialInstagram: 'https://instagram.com/bnnk_gorontalo',
    socialYoutube: 'https://youtube.com/@bnnkgorontalo',
    privacyPolicyUrl: '#kebijakan-privasi',
    termsUrl: '#syarat-ketentuan',
    additionalInfo: 'Layanan sertifikasi ini tidak dipungut biaya apapun (Gratis). Keaslian dokumen dapat diverifikasi secara daring melalui pemindaian QR Code.',
    showSocial: true,
    showLegal: true,

    bgColor: '#003566',
    textColor: '#E2E8F0',
    linkColor: '#93C5FD',
    textSize: 'sm',
    columns: 4,
    textAlign: 'left',
  },

  // Warna & Tema BNN
  theme: {
    preset: 'bnn_official',
    primaryColor: '#00529B', // Biru Utama BNN
    darkColor: '#003566', // Biru Gelap BNN
    secondaryColor: '#1677C8', // Biru Sekunder BNN
    lightColor: '#EAF4FC', // Biru Muda Aksen
    bgColor: '#F5F8FC', // Background Utama
    textColor: '#1F2937', // Teks Utama
    mutedColor: '#64748B', // Teks Sekunder
    buttonTextColor: '#FFFFFF',
  },

  updatedAt: new Date().toISOString(),
  updatedBy: 'admin@sertifikat.id',
};

export const THEME_PRESETS = [
  {
    id: 'bnn_official',
    name: 'Tema Biru BNN Resmi (Default)',
    description: 'Palet identitas resmi Badan Narkotika Nasional dengan kombinasi Biru Utama (#00529B) dan Biru Gelap (#003566).',
    colors: {
      primaryColor: '#00529B',
      darkColor: '#003566',
      secondaryColor: '#1677C8',
      lightColor: '#EAF4FC',
      bgColor: '#F5F8FC',
      textColor: '#1F2937',
      mutedColor: '#64748B',
      buttonTextColor: '#FFFFFF',
    },
  },
  {
    id: 'bnn_light_sky',
    name: 'Variasi Biru Cerah & Modern (Sky Azure)',
    description: 'Nuansa biru cerah kontemporer dengan kontras tajam untuk tampilan yang lebih dinamis.',
    colors: {
      primaryColor: '#0284C7',
      darkColor: '#0369A1',
      secondaryColor: '#38BDF8',
      lightColor: '#F0F9FF',
      bgColor: '#F8FAFC',
      textColor: '#0F172A',
      mutedColor: '#64748B',
      buttonTextColor: '#FFFFFF',
    },
  },
  {
    id: 'bnn_midnight',
    name: 'Variasi Biru Gelap Eksekutif (Midnight Navy)',
    description: 'Kombinasi biru pekat berwibawa untuk suasana instansi formal dan kepresidenan.',
    colors: {
      primaryColor: '#1E3A8A',
      darkColor: '#0F172A',
      secondaryColor: '#3B82F6',
      lightColor: '#EFF6FF',
      bgColor: '#F1F5F9',
      textColor: '#1E293B',
      mutedColor: '#475569',
      buttonTextColor: '#FFFFFF',
    },
  },
];
