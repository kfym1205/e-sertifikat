/**
 * Generator Template Sertifikat Vektor & Asset Bawaan
 * Menyediakan background A4 Landscape (297x210 mm) dan Portrait (210x297 mm)
 * Berkualitas tinggi (SVG Data URL) siap cetak & rendering PDF tanpa dependensi file eksternal.
 */

export function createRoyalGoldTemplate(orientation: 'landscape' | 'portrait' = 'landscape'): string {
  const isLandscape = orientation === 'landscape';
  const width = isLandscape ? 1122 : 794; // 96 DPI A4 approx
  const height = isLandscape ? 794 : 1122;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <defs>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#b48328" />
        <stop offset="25%" stop-color="#d4af37" />
        <stop offset="50%" stop-color="#fdf1a9" />
        <stop offset="75%" stop-color="#d4af37" />
        <stop offset="100%" stop-color="#996515" />
      </linearGradient>
      <linearGradient id="blueHeader" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#0f172a" />
        <stop offset="50%" stop-color="#1e293b" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>
      <pattern id="guilloche" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 0,20 Q 10,0 20,20 T 40,20" fill="none" stroke="#e2d4a8" stroke-width="0.7" opacity="0.35"/>
      </pattern>
    </defs>

    <!-- Background Base -->
    <rect width="${width}" height="${height}" fill="#faf9f6" />
    <rect width="${width}" height="${height}" fill="url(#guilloche)" />

    <!-- Outer Gold Border -->
    <rect x="24" y="24" width="${width - 48}" height="${height - 48}" fill="none" stroke="url(#gold)" stroke-width="6" rx="6" />

    <!-- Inner Slim Border -->
    <rect x="36" y="36" width="${width - 72}" height="${height - 72}" fill="none" stroke="#b48328" stroke-width="1.5" />
    <rect x="42" y="42" width="${width - 84}" height="${height - 84}" fill="none" stroke="#0f172a" stroke-width="1" />

    <!-- Corner Ornaments -->
    <!-- Top-Left -->
    <path d="M 42,75 L 75,42 M 42,90 L 90,42 M 42,60 L 60,42" stroke="url(#gold)" stroke-width="2" fill="none" />
    <circle cx="56" cy="56" r="4" fill="#b48328" />

    <!-- Top-Right -->
    <path d="M ${width - 42},75 L ${width - 75},42 M ${width - 42},90 L ${width - 90},42 M ${width - 42},60 L ${width - 60},42" stroke="url(#gold)" stroke-width="2" fill="none" />
    <circle cx="${width - 56}" cy="56" r="4" fill="#b48328" />

    <!-- Bottom-Left -->
    <path d="M 42,${height - 75} L 75,${height - 42} M 42,${height - 90} L 90,${height - 42} M 42,${height - 60} L 60,${height - 42}" stroke="url(#gold)" stroke-width="2" fill="none" />
    <circle cx="56" cy="${height - 56}" r="4" fill="#b48328" />

    <!-- Bottom-Right -->
    <path d="M ${width - 42},${height - 75} L ${width - 75},${height - 42} M ${width - 42},${height - 90} L ${width - 90},${height - 42} M ${width - 42},${height - 60} L ${width - 60},${height - 42}" stroke="url(#gold)" stroke-width="2" fill="none" />
    <circle cx="${width - 56}" cy="${height - 56}" r="4" fill="#b48328" />

    <!-- Instansi Header Decorative Ribbon / Emblem -->
    <g transform="translate(${width / 2}, 95)">
      <circle cx="0" cy="0" r="32" fill="#0f172a" stroke="url(#gold)" stroke-width="3" />
      <path d="M -12,-8 L 12,-8 L 0,16 Z" fill="#d4af37" />
      <circle cx="0" cy="0" r="8" fill="#faf9f6" />
      <!-- Star Ornaments -->
      <polygon points="0,-18 3,-10 11,-10 5,-4 7,4 0,-1 -7,4 -5,-4 -11,-10 -3,-10" fill="url(#gold)" transform="scale(0.8) translate(0, -5)" />
    </g>

    <!-- Main Title Typography -->
    <text x="${width / 2}" y="175" text-anchor="middle" font-family="'Cinzel', 'Times New Roman', serif" font-size="34" font-weight="700" letter-spacing="8" fill="#0f172a">SERTIFIKAT PENGHARGAAN</text>
    
    <!-- Subtitle divider line -->
    <g transform="translate(${width / 2 - 160}, 190)">
      <line x1="0" y1="0" x2="130" y2="0" stroke="url(#gold)" stroke-width="2" />
      <polygon points="160,-4 164,0 160,4 156,0" fill="#b48328" />
      <line x1="190" y1="0" x2="320" y2="0" stroke="url(#gold)" stroke-width="2" />
    </g>

    <text x="${width / 2}" y="222" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="14" font-weight="500" letter-spacing="4" fill="#64748b">DIBERIKAN DENGAN BANGGA KEPADA</text>

    <!-- Decorative Bottom Signatures Areas -->
    <g transform="translate(${width * 0.22}, ${height - 110})">
      <line x1="-90" y1="0" x2="90" y2="0" stroke="#94a3b8" stroke-width="1" />
      <text x="0" y="20" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="600" fill="#1e293b">Pimpinan Instansi</text>
      <text x="0" y="34" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="10" fill="#64748b">Ketua Penyelenggara</text>
    </g>

    <!-- Golden Stamp Emblem in center bottom -->
    <g transform="translate(${width / 2}, ${height - 110})">
      <circle cx="0" cy="0" r="28" fill="#f8fafc" stroke="url(#gold)" stroke-width="2.5" stroke-dasharray="3,2" />
      <circle cx="0" cy="0" r="22" fill="none" stroke="#d4af37" stroke-width="1" />
      <text x="0" y="-3" text-anchor="middle" font-family="'Cinzel', serif" font-size="7" font-weight="700" letter-spacing="1" fill="#b48328">RESMI</text>
      <text x="0" y="7" text-anchor="middle" font-family="'Cinzel', serif" font-size="6" font-weight="600" fill="#0f172a">TERVERIFIKASI</text>
    </g>

    <g transform="translate(${width * 0.78}, ${height - 110})">
      <line x1="-90" y1="0" x2="90" y2="0" stroke="#94a3b8" stroke-width="1" />
      <text x="0" y="20" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="600" fill="#1e293b">Sekretaris Panitia</text>
      <text x="0" y="34" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="10" fill="#64748b">Koordinator Sertifikasi</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function createModernNavyTemplate(orientation: 'landscape' | 'portrait' = 'landscape'): string {
  const isLandscape = orientation === 'landscape';
  const width = isLandscape ? 1122 : 794;
  const height = isLandscape ? 794 : 1122;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <defs>
      <linearGradient id="navyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0284c7" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>
      <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#38bdf8" />
        <stop offset="100%" stop-color="#818cf8" />
      </linearGradient>
    </defs>

    <rect width="${width}" height="${height}" fill="#ffffff" />

    <!-- Modern Top Left Geometric Accent -->
    <polygon points="0,0 260,0 180,90 0,60" fill="url(#navyGrad)" />
    <polygon points="0,60 180,90 120,130 0,90" fill="url(#accentGrad)" opacity="0.8" />

    <!-- Modern Bottom Right Geometric Accent -->
    <polygon points="${width},${height} ${width - 280},${height} ${width - 190},${height - 100} ${width},${height - 70}" fill="url(#navyGrad)" />
    <polygon points="${width},${height - 70} ${width - 190},${height - 100} ${width - 120},${height - 140} ${width},${height - 100}" fill="url(#accentGrad)" opacity="0.8" />

    <!-- Inner Border Line -->
    <rect x="40" y="40" width="${width - 80}" height="${height - 80}" fill="none" stroke="#e2e8f0" stroke-width="2" rx="4" />
    <rect x="48" y="48" width="${width - 96}" height="${height - 96}" fill="none" stroke="#0284c7" stroke-width="0.8" stroke-dasharray="6,4" />

    <!-- Header Title -->
    <text x="${width / 2}" y="160" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="34" font-weight="800" letter-spacing="6" fill="#0f172a">CERTIFICATE OF RECOGNITION</text>
    <text x="${width / 2}" y="195" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="14" font-weight="600" letter-spacing="3" fill="#0284c7">SERTIFIKAT KEPESERTAAN & APRESIASI</text>

    <!-- Signatures -->
    <g transform="translate(${width * 0.25}, ${height - 100})">
      <line x1="-80" y1="0" x2="80" y2="0" stroke="#cbd5e1" stroke-width="1.5" />
      <text x="0" y="20" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="600" fill="#334155">Direktur Program</text>
    </g>

    <g transform="translate(${width * 0.75}, ${height - 100})">
      <line x1="-80" y1="0" x2="80" y2="0" stroke="#cbd5e1" stroke-width="1.5" />
      <text x="0" y="20" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="600" fill="#334155">Ketua Komite Penilai</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function createEmeraldVintageTemplate(orientation: 'landscape' | 'portrait' = 'landscape'): string {
  const isLandscape = orientation === 'landscape';
  const width = isLandscape ? 1122 : 794;
  const height = isLandscape ? 794 : 1122;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <defs>
      <linearGradient id="emerald" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#064e3b" />
        <stop offset="50%" stop-color="#047857" />
        <stop offset="100%" stop-color="#065f46" />
      </linearGradient>
    </defs>

    <rect width="${width}" height="${height}" fill="#fdfbf7" />

    <rect x="25" y="25" width="${width - 50}" height="${height - 50}" fill="none" stroke="#047857" stroke-width="4" />
    <rect x="35" y="35" width="${width - 70}" height="${height - 70}" fill="none" stroke="#d97706" stroke-width="1.5" />

    <text x="${width / 2}" y="170" text-anchor="middle" font-family="'Playfair Display', serif" font-size="38" font-weight="700" letter-spacing="4" fill="#064e3b">SERTIFIKAT KELULUSAN</text>
    <text x="${width / 2}" y="205" text-anchor="middle" font-family="'Inter', sans-serif" font-size="13" font-weight="600" letter-spacing="3" fill="#b45309">DIBERIKAN ATAS PARTISIPASI DAN KELULUSAN KOMPETENSI</text>

    <g transform="translate(${width * 0.25}, ${height - 105})">
      <line x1="-80" y1="0" x2="80" y2="0" stroke="#047857" stroke-width="1" />
      <text x="0" y="20" text-anchor="middle" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#064e3b">Instruktur Pelatihan</text>
    </g>

    <g transform="translate(${width * 0.75}, ${height - 105})">
      <line x1="-80" y1="0" x2="80" y2="0" stroke="#047857" stroke-width="1" />
      <text x="0" y="20" text-anchor="middle" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#064e3b">Kepala Lembaga</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
