# Sertifikat Otomatis — Sistem Manajemen & Penerbitan Sertifikat Digital

Aplikasi web modern berbasis Full-Stack (React, TypeScript, Tailwind CSS, Express, dan PostgreSQL/Supabase) untuk mengelola template sertifikat secara custom, membuka pendaftaran peserta, membuat sertifikat PDF ukuran standar A4 secara otomatis dengan nomor registrasi unik aman, serta mengirimkan sertifikat ke email pendaftar.

---

## 🌟 Fitur Utama yang Sudah Berfungsi Penuh

1. **Dashboard Administrator Komprehensif**
   - Ringkasan metrik statistik real-time: Total Pendaftar, Total Sertifikat Terbit, Email Berhasil Terkirim, dan Email Gagal.
   - Filter pendaftar berdasarkan kegiatan dan kata kunci pencarian (nama, email, nomor registrasi).
   - Unduh PDF langsung, tombol kirim ulang email transaksional jika gagal, dan ekspor data ke file CSV/Excel.

2. **Manajemen Kegiatan (Activities)**
   - Tambah, ubah, aktifkan, nonaktifkan, dan kelola periode pendaftaran kegiatan.
   - Pengaturan formulir (field wajib nama & email, field instansi, telepon, serta field kustom).
   - Pengaturan template email dan tanggal sertifikat (otomatis tanggal server Asia/Makassar atau tanggal manual).
   - Kebijakan pendaftaran ganda: Tolak duplikat (*disallow*), Kembalikan sertifikat terbit (*reissue*), atau Buat nomor baru (*allow*).

3. **Template Sertifikat Custom**
   - Standar ukuran halaman internasional A4 (210 × 297 mm), mendukung orientasi **Landscape** dan **Portrait**.
   - Dilengkapi template vektor bawaan (*Royal Gold Resmi*, *Modern Corporate Navy*, *Emerald Hijau Zamrud*, dan *Portrait Version*).
   - Pengunggahan template custom buatan sendiri dalam format PNG, JPG, atau SVG tanpa distorsi aspek rasio.
   - Sistem versi template (*versioning snapshot*) sehingga perubahan template baru tidak merusak sertifikat yang telah diterbitkan sebelumnya.

4. **Editor Posisi Teks Presisi (Visual Drag-and-Drop & Milimeter A4)**
   - Kanvas interaktif untuk menggeser elemen teks langsung menggunakan mouse.
   - Pengaturan angka presisi dalam satuan milimeter (mm) yang terkonversi akurat 1:1 ke dokumen PDF A4.
   - Pengaturan lengkap tiap elemen: posisi X & Y (mm), ukuran font (pt), pilihan font (*Cinzel*, *Playfair Display*, *Plus Jakarta Sans*, *Inter*, *Merriweather*, *Great Vibes*, *Alex Brush*), warna teks picker, perataan (*left, center, right*), ketebalan font (*normal, 500, 600, bold*), batas lebar teks (*max width*), dan kapitalisasi nama.
   - Dilengkapi grid bantu milimeter dan fitur uji nama panjang bergelar akademis.

5. **Penomoran Registrasi Otomatis & Atomic Counter**
   - Struktur pola dinamis e.g. `{JENIS}/{NOMOR_URUT}/{KLASIFIKASI}/{UNIT}/{BULAN_ROMAWI}/{TAHUN}/{INSTANSI}` menghasilkan contoh: `ST/01/RLN/KA/X/2026/BNNK`.
   - Konfigurasi token visual tanpa mengetik kode program.
   - Penomoran aman dari *race condition* (menggunakan atomic row lock PostgreSQL dan sequence terisolasi).
   - Immutability: nomor yang sudah diterbitkan terkunci permanen.

6. **Formulir Pendaftaran Publik**
   - Halaman pendaftaran online responsif (desktop, tablet, smartphone).
   - Validasi input ganda di sisi frontend dan backend, rate limiting, dan proteksi anti-bot.
   - Halaman konfirmasi instan dengan selebrasi *confetti*, pratinjau sertifikat A4, dan tombol unduh PDF seketika.

7. **Layanan Pengiriman Email Transaksional**
   - Terintegrasi dengan Resend API live (*production ready*).
   - Tersedia mode simulasi transaksional siap pakai (*zero-config*) untuk pengujian langsung tanpa mengharuskan input API key eksternal di awal.
   - Antrean status pengiriman (*pending*, *processing*, *delivered*, *failed*) dan tombol *Kirim Ulang* aman tanpa membuat nomor registrasi duplikat.

8. **Halaman Verifikasi Publik (`/verifikasi`)**
   - Verifikasi keaslian dokumen via QR Code atau input nomor registrasi.
   - Proteksi privasi: hanya menampilkan nama peserta, nomor registrasi, nama kegiatan, tanggal terbit, dan nama instansi (tidak membocorkan email atau nomor telepon peserta).

9. **Keamanan & Audit Log**
   - Jejak audit lengkap mencatat waktu operasional WITA, aktor admin, jenis tindakan, objek yang diubah, dan rincian operasional.
   - Prosedur koreksi nama penerima (*reissue*) dan pencabutan dokumen (*revoke*) dengan pencatatan alasan resmi.

---

## 🚀 Panduan Konfigurasi & Deployment

### 1. Konfigurasi Environment (`.env`)
Salin file `.env.example` ke `.env`:

```env
# URL Base Aplikasi
APP_BASE_URL="http://localhost:3000"

# 1. INTEGRASI EMAIL RESMI SATKER BNN (webmail.bnn.go.id)
BNN_EMAIL_PROVIDER="bnn_smtp" # Opsi: "bnn_smtp" | "bnn_relay_api" | "resend" | "simulation"

# Konfigurasi SMTP Resmi (Pusdatin BNN)
BNN_SMTP_HOST="mail.bnn.go.id"
BNN_SMTP_PORT=465
BNN_SMTP_SECURE=true
BNN_SMTP_USER="bnnkab_gorontalo@bnn.go.id"
BNN_SMTP_PASS="rahasia_kata_sandi_resmi_satker"
BNN_EMAIL_FROM="BNN Kabupaten Gorontalo <bnnkab_gorontalo@bnn.go.id>"

# Konfigurasi Alternatif API Relay Resmi (Rekomendasi jika port SMTP diblokir firewall/Vercel)
BNN_RELAY_ENDPOINT="https://api-mail.bnn.go.id/v1/send"
BNN_RELAY_KEY="bnn_relay_api_token_here"

# 2. SUPABASE POSTGRESQL & AUTH (Dapatkan di supabase.com -> Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 3. PENYEDIA EMAIL CADANGAN (RESEND API)
RESEND_API_KEY="re_123456789_abcdefg"
EMAIL_FROM="Sertifikat Panitia BNN <sertifikat@domainanda.com>"
```

---

## 📧 Modul Integrasi Email Satker BNN (webmail.bnn.go.id)

Aplikasi ini menggunakan arsitektur **Pluggable Email Adapter** yang memisahkan proses pengiriman email dari pembuatan sertifikat dan penomoran. Apabila server email BNN belum mengizinkan koneksi luar, pendaftaran dan pembuatan sertifikat PDF tetap berjalan 100% aman, dan email dapat dikirim ulang sewaktu-waktu.

### Prioritas Pengiriman:
1. **SMTP Resmi BNN (Prioritas Utama):**
   - Menggunakan library `nodemailer` di sisi server untuk koneksi aman TLS/SSL pada port 465 atau port 587.
   - Kata sandi akun email satker disimpan di sisi backend server, tidak pernah terekspos di browser client.
   - Mendukung uji koneksi socket & handshake TLS sebelum pengiriman dilakukan.
2. **API Relay Resmi Disetujui BNN Pusat (Prioritas Kedua - Rekomendasi Vercel):**
   - Menghubungkan ke gateway REST API relay internal BNN. Metode ini sangat ideal untuk deployment serverless di Vercel karena kebal terhadap pemblokiran port outgoing SMTP oleh firewall instansi.
3. **Google Workspace / Gmail API (Prioritas Ketiga):**
   - Hanya digunakan jika administrator pusat mengonfirmasi bahwa domain email satker BNN dikelola melalui Google Workspace.
4. **Resend / Simulasi Antrean:**
   - Digunakan sebagai cadangan sementara selama proses verifikasi hak akses dengan Pusdatin BNN berlangsung.

### Analisis Jaringan Vercel & Firewall Satker:
- **Port 25 Diblokir:** Seluruh penyedia serverless (Vercel, AWS Lambda, Cloud Run) memblokir port 25. Sistem ini secara otomatis menggunakan port 465 (SSL/TLS) atau 587 (STARTTLS).
- **Socket Timeout:** Dikonfigurasi timeout maksimal 10 detik agar tidak menyebabkan serverless execution failure di Vercel.
- **Rekomendasi:** Jika firewall Pusdatin BNN membatasi IP publik luar yang dinamis dari Vercel, ajukan penggunaan **API Relay Resmi** melalui template surat resmi yang telah disediakan di panel admin.

---

### 2. Panduan Setup Database Supabase
1. Masuk ke dashboard [Supabase](https://supabase.com).
2. Buat proyek baru (*New Project*).
3. Buka menu **SQL Editor** pada sidebar kiri.
4. Buka file `supabase-schema.sql` di repository ini, salin seluruh kodenya, dan tempelkan ke SQL Editor Supabase.
5. Klik tombol **Run**. Seluruh tabel (`activities`, `certificate_templates`, `classification_codes`, `participants`, `certificate_issuances`, `email_delivery_logs`, `audit_logs`), indeks, fungsi *Row-Level Security* (RLS), dan *stored procedure atomic sequence* akan terbuat secara otomatis.

### 3. Panduan Deployment ke Vercel
1. Unggah kode ke repository GitHub Anda.
2. Buka [Vercel Dashboard](https://vercel.com) dan pilih **Add New Project**.
3. Hubungkan repository GitHub Anda.
4. Pada bagian **Environment Variables**, masukkan variabel dari file `.env.example`.
5. Klik **Deploy**. Vercel akan mem-build aplikasi dan menyediakannya pada domain publik Anda secara otomatis.

---

## 🔒 Kredensial Administrator Bawaan
- **Email:** `admin@sertifikat.id`
- **Kata Sandi:** `admin_sertifikat_2026`
*(Dapat diubah melalui menu Pengaturan Sistem atau konfigurasi Supabase Auth).*

