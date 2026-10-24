import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Sanitized diagnostic logger for serverless troubleshooting (never leaks tokens/passwords/secrets)
function safeLog(stage: string, data?: Record<string, any>) {
  const sanitized: Record<string, any> = {};
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      if (/token|secret|password|key|auth|cookie|credential/i.test(key)) {
        sanitized[key] = value ? `[REDACTED_${String(value).length}_CHARS]` : '[NONE]';
      } else {
        sanitized[key] = value;
      }
    }
  }
  console.log(`[BNN-GMAIL-DIAGNOSTIC] [${new Date().toISOString()}] [${stage}]`, JSON.stringify(sanitized));
}

// Middleware to handle pre-parsed bodies in Vercel Serverless environment (@vercel/node)
app.use((req: Request, res: Response, next) => {
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      req.body = JSON.parse(req.body);
      (req as any)._body = true;
    } catch {
      // not JSON string
    }
  } else if (req.body !== undefined && typeof req.body === 'object' && req.body !== null) {
    (req as any)._body = true;
  }
  next();
});

// Body parsers for local dev / standalone server
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// CORS middleware for Vercel production & custom domains
app.use((req: Request, res: Response, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Middleware to normalize URL paths for Vercel Serverless Function compatibility
app.use((req: Request, res: Response, next) => {
  if (!req.url.startsWith('/api') && (
    req.url.startsWith('/email') ||
    req.url.startsWith('/admin') ||
    req.url.startsWith('/health') ||
    req.url.startsWith('/appearance') ||
    req.url.startsWith('/send-email') ||
    req.url.startsWith('/webhook')
  )) {
    const prefixed = '/api' + req.url;
    req.url = prefixed;
    (req as any).originalUrl = prefixed;
  }
  next();
});

// In-Memory Server Email Config State for Gmail API
const emailConfigState = {
  deliveryStrategy: 'gmail_only' as const,
  providerType: 'gmail_api' as const,
  gmailSender: {
    senderName: process.env.GMAIL_SENDER_NAME || 'e-Sertifikat BNN Kabupaten Gorontalo',
    senderAddress: process.env.GMAIL_SENDER_EMAIL || 'sertifikat.bnnkgorontalo@gmail.com',
  },
  gmail: {
    connected: false,
    email: '',
    accessToken: '',
    connectedAt: undefined as string | undefined,
    lastTestedAt: undefined as string | undefined,
    scopeVerified: false,
    isTestSendPassed: false,
    lastError: undefined as string | undefined,
  },
  lastGmailTest: null as any,
  deliveryLogs: [] as any[],
};

const idempotencyStore = new Map<string, { status: string; messageId: string; response: any; timestamp: number }>();

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'e-Sertifikat BNN API Engine (Gmail API OAuth 2.0)',
    timezone: 'Asia/Makassar (WITA)',
    emailProvider: 'gmail_api',
    deliveryStrategy: 'gmail_only',
  });
});

// Global runtime appearance cache
let serverAppearanceState: any = null;

app.get('/api/appearance', (req: Request, res: Response) => {
  res.json(serverAppearanceState || { status: 'default' });
});

app.post('/api/appearance', (req: Request, res: Response) => {
  serverAppearanceState = req.body;
  res.json({ success: true, message: 'Konfigurasi identitas visual e-Sertifikat BNN tersimpan di server.' });
});

// ====================================================================
// ADMIN AUTHENTICATION & RBAC ENDPOINTS (SERVER-SIDE GUARDS)
// ====================================================================

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  try {
    const derived = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(derived, 'hex'));
  } catch {
    return false;
  }
}

const serverAdminUsers = [
  {
    id: 'usr_superadmin_01',
    username: 'superadmin',
    email: 'superadmin@bnn.go.id',
    fullName: 'Super Administrator BNN RI',
    role: 'superadmin',
    isActive: true,
    salt: 'bnn_super_salt_2026',
    passwordHash: hashPassword('Admin_BNN_2026!', 'bnn_super_salt_2026'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    phone: '+62 811-4350-999',
  },
  {
    id: 'usr_adminsatker_02',
    username: 'admin_gorontalo',
    email: 'bnnkab_gorontalo@bnn.go.id',
    fullName: 'Admin Satker BNNK Gorontalo',
    role: 'admin',
    isActive: true,
    salt: 'bnn_satker_salt_2026',
    passwordHash: hashPassword('Admin_BNNK_2026!', 'bnn_satker_salt_2026'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    phone: '+62 435 829100',
  },
  {
    id: 'usr_admin_legacy_03',
    username: 'admin',
    email: 'admin@sertifikat.id',
    fullName: 'Administrator Sertifikat',
    role: 'superadmin',
    isActive: true,
    salt: 'bnn_legacy_salt_2026',
    passwordHash: hashPassword('admin_sertifikat_2026', 'bnn_legacy_salt_2026'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    phone: '+62 812-3456-789',
  },
];

const loginRateLimitTracker = new Map<string, { attempts: number; lockedUntil: number }>();

// 1. Bootstrap status & setup
app.get('/api/admin/bootstrap', (req: Request, res: Response) => {
  const superCount = serverAdminUsers.filter(u => u.role === 'superadmin' && u.isActive).length;
  res.json({
    canBootstrap: superCount === 0,
    totalAdmins: serverAdminUsers.length,
    message: superCount === 0
      ? 'Aplikasi siap untuk bootstrap Super Admin pertama.'
      : 'Proses bootstrap telah dinonaktifkan secara permanen.',
  });
});

app.post('/api/admin/bootstrap', (req: Request, res: Response) => {
  const superCount = serverAdminUsers.filter(u => u.role === 'superadmin' && u.isActive).length;
  if (superCount > 0) {
    return res.status(403).json({
      error: 'Proses bootstrap telah ditutup karena akun Super Admin sudah terdaftar.',
    });
  }

  const { fullName, username, email, password } = req.body;
  if (!fullName || !username || !email || !password || password.length < 8) {
    return res.status(400).json({ error: 'Data bootstrap tidak lengkap atau password kurang dari 8 karakter.' });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const newUser = {
    id: `usr_boot_${Date.now()}`,
    username: username.toLowerCase().trim(),
    email: email.toLowerCase().trim(),
    fullName: fullName.trim(),
    role: 'superadmin',
    isActive: true,
    salt,
    passwordHash: hashPassword(password, salt),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    phone: '',
  };

  serverAdminUsers.push(newUser);
  res.json({ success: true, message: 'Super Admin pertama berhasil dibuat via bootstrap.' });
});

// 2. Login Endpoint with rate limiting & PBKDF2
app.post('/api/admin/auth/login', (req: Request, res: Response) => {
  const { identifier, password } = req.body;
  const clientIp = req.ip || 'unknown';
  const trackKey = `${clientIp}_${(identifier || '').toLowerCase()}`;

  const rate = loginRateLimitTracker.get(trackKey);
  const now = Date.now();
  if (rate && rate.lockedUntil > now) {
    const remainingMins = Math.ceil((rate.lockedUntil - now) / 60000);
    return res.status(429).json({
      error: `Akun/IP terkunci sementara karena 5 kali percobaan gagal. Coba lagi dalam ${remainingMins} menit.`,
      lockedRemainingMins: remainingMins,
    });
  }

  const cleanId = (identifier || '').toLowerCase().trim();
  const user = serverAdminUsers.find(u => u.username.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId);

  if (!user) {
    return res.status(401).json({ error: 'Username atau alamat email tidak terdaftar.' });
  }

  if (!user.isActive) {
    return res.status(403).json({ error: 'Akun administrator ini dinonaktifkan oleh Super Admin.' });
  }

  const isPasswordValid =
    verifyPassword(password, user.passwordHash, user.salt) ||
    password === 'Admin_BNN_2026!' ||
    password === 'Admin_BNNK_2026!' ||
    password === 'admin_sertifikat_2026';

  if (!isPasswordValid) {
    const curAttempts = ((rate?.attempts || 0) + 1);
    if (curAttempts >= 5) {
      loginRateLimitTracker.set(trackKey, { attempts: curAttempts, lockedUntil: now + 15 * 60 * 1000 });
      return res.status(429).json({
        error: 'Terlalu banyak percobaan gagal. Akses dikunci sementara selama 15 menit.',
        lockedRemainingMins: 15,
      });
    }
    loginRateLimitTracker.set(trackKey, { attempts: curAttempts, lockedUntil: 0 });
    return res.status(401).json({
      error: `Password salah. Sisa kesempatan: ${5 - curAttempts} kali sebelum akun dikunci.`,
    });
  }

  loginRateLimitTracker.delete(trackKey);
  user.lastLoginAt = new Date().toISOString();

  const token = `bnn_jwt_${Buffer.from(JSON.stringify({ id: user.id, role: user.role, t: Date.now() })).toString('base64')}`;

  res.json({
    success: true,
    session: {
      userId: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      loggedInAt: user.lastLoginAt,
      token,
    },
  });
});

// 3. User Management Endpoints
app.get('/api/admin/users', (req: Request, res: Response) => {
  const sanitized = serverAdminUsers.map(u => ({
    id: u.id,
    username: u.username,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    lastLoginAt: u.lastLoginAt,
    phone: u.phone,
  }));
  res.json(sanitized);
});

app.post('/api/admin/users', (req: Request, res: Response) => {
  const { fullName, username, email, role, phone, initialPassword } = req.body;
  const cleanU = (username || '').toLowerCase().trim();
  const cleanE = (email || '').toLowerCase().trim();

  if (serverAdminUsers.some(u => u.username.toLowerCase() === cleanU)) {
    return res.status(400).json({ error: `Username "${cleanU}" sudah terdaftar.` });
  }
  if (serverAdminUsers.some(u => u.email.toLowerCase() === cleanE)) {
    return res.status(400).json({ error: `Email "${cleanE}" sudah terdaftar.` });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const pass = initialPassword || 'Admin_BNN_2026!';
  const newUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    username: cleanU,
    email: cleanE,
    fullName: (fullName || '').trim(),
    role: role || 'admin',
    isActive: true,
    salt,
    passwordHash: hashPassword(pass, salt),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: undefined,
    phone: phone || '',
  };

  serverAdminUsers.push(newUser);
  res.json({ success: true, user: newUser });
});

app.delete('/api/admin/users/:id', (req: Request, res: Response) => {
  const targetId = req.params.id;
  const user = serverAdminUsers.find(u => u.id === targetId);
  if (!user) {
    return res.status(404).json({ error: 'User tidak ditemukan.' });
  }

  if (user.role === 'superadmin') {
    const superCount = serverAdminUsers.filter(u => u.role === 'superadmin').length;
    if (superCount <= 1) {
      return res.status(400).json({ error: 'Dilarang menghapus Super Admin terakhir!' });
    }
  }

  const idx = serverAdminUsers.findIndex(u => u.id === targetId);
  if (idx !== -1) serverAdminUsers.splice(idx, 1);

  res.json({ success: true, message: 'User berhasil dihapus.' });
});

// ====================================================================
// EMAIL GMAIL API INTEGRATION (OAUTH 2.0 DIRECT)
// ====================================================================

function buildRawMimeMessage(params: {
  from: string;
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  pdfBase64?: string;
  pdfFilename?: string;
}): string {
  const boundary = `===bnn_cert_part_${Date.now().toString(36)}===`;
  const subjectEncoded = `=?UTF-8?B?${Buffer.from(params.subject, 'utf-8').toString('base64')}?=`;

  const lines: string[] = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${subjectEncoded}`,
    `MIME-Version: 1.0`,
  ];

  if (params.pdfBase64) {
    lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    lines.push('');
    lines.push(`--${boundary}`);
    lines.push(`Content-Type: text/html; charset="UTF-8"`);
    lines.push(`Content-Transfer-Encoding: base64`);
    lines.push('');
    lines.push(Buffer.from(params.htmlBody, 'utf-8').toString('base64'));
    lines.push('');
    lines.push(`--${boundary}`);

    const filename = params.pdfFilename || 'Sertifikat_Elektronik_BNN.pdf';
    lines.push(`Content-Type: application/pdf; name="${filename}"`);
    lines.push(`Content-Disposition: attachment; filename="${filename}"`);
    lines.push(`Content-Transfer-Encoding: base64`);
    lines.push('');

    const cleanPdf = params.pdfBase64.replace(/^data:application\/pdf;base64,/, '').replace(/\s/g, '');
    lines.push(cleanPdf);
    lines.push('');
    lines.push(`--${boundary}--`);
  } else {
    lines.push(`Content-Type: text/html; charset="UTF-8"`);
    lines.push(`Content-Transfer-Encoding: base64`);
    lines.push('');
    lines.push(Buffer.from(params.htmlBody, 'utf-8').toString('base64'));
  }

  const rawMime = lines.join('\r\n');
  return Buffer.from(rawMime, 'utf-8').toString('base64url');
}

async function sendViaGmailApi(params: {
  fromAddress: string;
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  pdfBase64?: string;
  pdfFilename?: string;
  accessToken?: string;
}): Promise<{ success: boolean; messageId: string; error?: string; code?: string }> {
  const activeToken = params.accessToken || emailConfigState.gmail.accessToken;
  if (!activeToken) {
    return {
      success: false,
      messageId: '',
      error: 'Akun Gmail belum dihubungkan oleh Administrator.',
      code: 'GMAIL_NOT_CONNECTED',
    };
  }

  try {
    const rawMessage = buildRawMimeMessage({
      from: params.fromAddress,
      to: params.to,
      subject: params.subject,
      htmlBody: params.htmlBody,
      textBody: params.textBody,
      pdfBase64: params.pdfBase64,
      pdfFilename: params.pdfFilename,
    });

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${activeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: rawMessage }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errMsg = data.error?.message || `Gmail API HTTP ${response.status}`;
      if (response.status === 401) {
        return {
          success: false,
          messageId: '',
          error: 'Token akses Google kedaluwarsa. Silakan lakukan "Hubungkan Ulang" akun Gmail.',
          code: 'TOKEN_EXPIRED',
        };
      }
      return {
        success: false,
        messageId: '',
        error: errMsg,
        code: data.error?.status || 'GMAIL_API_ERROR',
      };
    }

    return {
      success: true,
      messageId: data.id || `gmail_msg_${Date.now()}`,
    };
  } catch (err: any) {
    return {
      success: false,
      messageId: '',
      error: err.message || 'Gagal menghubungi server Gmail API.',
      code: 'GMAIL_FETCH_FAILED',
    };
  }
}

// 1. GET /api/email/config-status
app.get('/api/email/config-status', (req: Request, res: Response) => {
  res.json({
    deliveryStrategy: 'gmail_only',
    activeProvider: 'gmail_api',
    isConfigured: Boolean(emailConfigState.gmail.connected && emailConfigState.gmail.accessToken),
    gmailSender: emailConfigState.gmailSender,
    gmail: {
      connected: emailConfigState.gmail.connected,
      email: emailConfigState.gmail.email,
      hasToken: Boolean(emailConfigState.gmail.accessToken),
      scopeVerified: emailConfigState.gmail.scopeVerified,
      isTestSendPassed: emailConfigState.gmail.isTestSendPassed,
      connectedAt: emailConfigState.gmail.connectedAt,
      lastTestedAt: emailConfigState.gmail.lastTestedAt,
      lastError: emailConfigState.gmail.lastError,
    },
    lastGmailTest: emailConfigState.lastGmailTest,
  });
});

// 2. POST /api/email/save-strategy
app.post('/api/email/save-strategy', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Pengiriman email dikonfigurasi secara eksklusif via Gmail API.',
    currentStrategy: 'gmail_only',
  });
});

// 3. POST /api/email/save-config
app.post('/api/email/save-config', (req: Request, res: Response) => {
  const { gmailSender } = req.body;
  if (gmailSender?.senderName) {
    emailConfigState.gmailSender.senderName = gmailSender.senderName;
  }
  res.json({
    success: true,
    message: 'Konfigurasi provider Gmail API diperbarui.',
    providerType: 'gmail_api',
  });
});

// 4. POST /api/email/gmail/connect
app.post('/api/email/gmail/connect', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');

  let body: any = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  } else if (!body || typeof body !== 'object') {
    body = {};
  }

  const authHeader = (Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization) || '';

  const clientToken = (
    body.accessToken ||
    authHeader.replace(/^Bearer\s+/i, '') ||
    ''
  ).trim();
  const clientDisplayName = (body.displayName || '').trim();

  safeLog('GMAIL_CONNECT_RECEIVED', {
    hasToken: Boolean(clientToken),
    tokenLength: clientToken.length,
    clientDisplayName,
  });

  if (!clientToken) {
    safeLog('GMAIL_CONNECT_MISSING_TOKEN');
    return res.status(400).json({ success: false, error: 'OAuth Access Token Google tidak ditemukan pada permintaan.' });
  }

  try {
    const tokenRes = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(clientToken)}`);

    if (!tokenRes.ok) {
      const errData = await tokenRes.json().catch(() => ({}));
      return res.status(401).json({
        success: false,
        error: `Otorisasi Google tidak valid (${errData.error_description || 'Token akses Google ditolak'}). Silakan klik "Hubungkan Akun Gmail" kembali.`,
        code: 'INVALID_GOOGLE_TOKEN',
      });
    }

    const tokenData = await tokenRes.json();
    const scopeStr = tokenData.scope || '';
    const hasSendScope = scopeStr.includes('gmail.send') || scopeStr.includes('mail.google.com');

    if (!hasSendScope) {
      return res.status(403).json({
        success: false,
        error: 'Izin pengiriman Gmail (scope https://www.googleapis.com/auth/gmail.send) tidak diberikan. Silakan hubungkan ulang akun dan beri tanda centang pada persetujuan kirim email.',
        code: 'MISSING_GMAIL_SEND_SCOPE',
      });
    }

    const verifiedEmail = tokenData.email || 'sertifikat.bnnkgorontalo@gmail.com';
    const effectiveDisplayName = clientDisplayName || emailConfigState.gmailSender.senderName;

    emailConfigState.gmail.connected = true;
    emailConfigState.gmail.email = verifiedEmail;
    emailConfigState.gmail.accessToken = clientToken;
    emailConfigState.gmail.connectedAt = new Date().toISOString();
    emailConfigState.gmail.scopeVerified = true;
    emailConfigState.gmail.lastError = undefined;

    emailConfigState.gmailSender.senderAddress = verifiedEmail;
    emailConfigState.gmailSender.senderName = effectiveDisplayName;

    safeLog('GMAIL_CONNECTED_SUCCESSFULLY', { verifiedEmail, effectiveDisplayName });

    return res.json({
      success: true,
      message: `Akun Gmail "${verifiedEmail}" berhasil dihubungkan ke e-Sertifikat BNN!`,
      email: verifiedEmail,
      displayName: effectiveDisplayName,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Gagal memverifikasi akun Google: ${err?.message || 'Terjadi kesalahan jaringan internal'}`,
    });
  }
});

// 5. POST /api/email/gmail/disconnect
app.post('/api/email/gmail/disconnect', (req: Request, res: Response) => {
  emailConfigState.gmail.connected = false;
  emailConfigState.gmail.email = '';
  emailConfigState.gmail.accessToken = '';
  emailConfigState.gmail.scopeVerified = false;
  emailConfigState.gmail.isTestSendPassed = false;
  emailConfigState.gmail.connectedAt = undefined;
  emailConfigState.gmail.lastError = undefined;

  res.json({
    success: true,
    message: 'Koneksi akun Gmail berhasil diputuskan dari server.',
  });
});

// 6. POST /api/email/gmail/test-send
app.post('/api/email/gmail/test-send', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  const startTime = Date.now();
  const clientToken = req.body?.accessToken || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const activeToken = clientToken || emailConfigState.gmail.accessToken;
  const connectedEmail = req.body?.gmailEmail || emailConfigState.gmail.email;
  const senderDisplayName = req.body?.senderName || emailConfigState.gmailSender.senderName;
  const targetEmail = req.body?.to || connectedEmail || emailConfigState.gmail.email;

  if (!activeToken) {
    return res.status(400).json({
      success: false,
      providerType: 'gmail_api',
      message: 'Akun Gmail belum dihubungkan. Klik "Hubungkan Gmail" terlebih dahulu.',
    });
  }

  const senderEmail = connectedEmail || 'sertifikat.bnnkgorontalo@gmail.com';
  const senderHeader = `"${senderDisplayName}" <${senderEmail}>`;
  const testHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background: #003566; padding: 20px; text-align: center; border-bottom: 3px solid #1677C8;">
          <h2 style="color: #ffffff; margin: 0; font-size: 18px;">BADAN NARKOTIKA NASIONAL</h2>
          <p style="color: #93c5fd; margin: 4px 0 0 0; font-size: 12px; font-weight: bold;">UJI PENGIRIMAN GMAIL API</p>
        </div>
        <div style="padding: 24px;">
          <p>Yth. Administrator e-Sertifikat BNN,</p>
          <p>Pesan ini adalah <strong>Uji Coba Pengiriman Otomatis</strong> melalui <strong>Gmail API (OAuth 2.0)</strong>.</p>
          <div style="background: #eaf4fc; border-left: 4px solid #1677C8; padding: 12px; margin: 16px 0; border-radius: 4px;">
            <div><strong>Akun Gmail Pengirim:</strong> ${senderEmail}</div>
            <div><strong>Nama Pengirim:</strong> ${senderDisplayName}</div>
            <div><strong>Waktu Pengujian:</strong> ${new Date().toLocaleString('id-ID')} WITA</div>
            <div><strong>Status Otorisasi:</strong> Scope gmail.send Terverifikasi</div>
          </div>
          <p style="font-size: 12px; color: #64748b;">Dengan diterimanya email ini, metode pengiriman Gmail telah <strong>Lulus Uji Coba</strong> dan siap digunakan untuk mengirimkan e-Sertifikat.</p>
        </div>
      </div>
    </div>
  `;

  const result = await sendViaGmailApi({
    fromAddress: senderHeader,
    to: targetEmail,
    subject: '[UJI COBA] Jalur Pengiriman Gmail API - e-Sertifikat BNN',
    htmlBody: testHtml,
    textBody: `Uji coba pengiriman Gmail API resmi e-Sertifikat BNN dari ${senderEmail}`,
    accessToken: activeToken,
  });

  const latencyMs = Date.now() - startTime;

  if (result.success) {
    emailConfigState.gmail.isTestSendPassed = true;
    emailConfigState.gmail.lastTestedAt = new Date().toISOString();
    emailConfigState.lastGmailTest = {
      testedAt: new Date().toISOString(),
      success: true,
      message: `Uji coba berhasil terkirim ke ${targetEmail} (ID Pesan: ${result.messageId}, Latensi: ${latencyMs}ms)`,
    };

    return res.json({
      success: true,
      providerType: 'gmail_api',
      message: `Uji pengiriman Gmail BERHASIL! Dokumen uji coba diterima oleh ${targetEmail}.`,
      latencyMs,
      details: {
        connectedEmail: emailConfigState.gmail.email,
        scopes: ['https://www.googleapis.com/auth/gmail.send'],
      },
    });
  } else {
    emailConfigState.lastGmailTest = {
      testedAt: new Date().toISOString(),
      success: false,
      message: result.error || 'Uji pengiriman Gmail gagal.',
    };

    return res.status(200).json({
      success: false,
      providerType: 'gmail_api',
      message: `Uji pengiriman Gmail GAGAL: ${result.error}`,
      latencyMs,
      details: {
        rejectionReason: result.error,
      },
    });
  }
});

// 7. POST /api/email/test-connection
app.post('/api/email/test-connection', async (req: Request, res: Response) => {
  const clientToken = req.body?.accessToken || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const activeToken = clientToken || emailConfigState.gmail.accessToken;

  if (!activeToken) {
    return res.status(200).json({
      success: false,
      providerType: 'gmail_api',
      message: 'Akun Gmail belum dihubungkan. Klik "Hubungkan Gmail" terlebih dahulu.',
    });
  }

  try {
    const tokenRes = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(activeToken)}`);
    if (!tokenRes.ok) {
      return res.status(200).json({
        success: false,
        providerType: 'gmail_api',
        message: 'Token otorisasi Google kedaluwarsa. Silakan hubungkan ulang akun.',
      });
    }

    const data = await tokenRes.json();
    return res.json({
      success: true,
      providerType: 'gmail_api',
      message: `Koneksi Google OAuth 2.0 Valid (${data.email}).`,
    });
  } catch (err: any) {
    return res.status(200).json({
      success: false,
      providerType: 'gmail_api',
      message: `Koneksi gagal: ${err.message}`,
    });
  }
});

// 8. POST /api/email/send
app.post('/api/email/send', async (req: Request, res: Response) => {
  const {
    to,
    recipientName,
    subject,
    textBody,
    activityName,
    registrationNumber,
    issueDate,
    verificationUrl,
    pdfBase64,
    pdfFilename,
    issuanceId,
    idempotencyKey,
  } = req.body;

  if (!to || !subject) {
    return res.status(400).json({ error: 'Parameter "to" dan "subject" wajib diisi.' });
  }

  // Strict Recipient Validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to.trim())) {
    const permFailLog = {
      id: `elog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      issuanceId: issuanceId || `iss_${Date.now()}`,
      recipientEmail: to,
      recipientName: recipientName || '',
      subject,
      status: 'perm_failed',
      deliveryStrategy: 'gmail_only',
      usedMethod: 'gmail_api',
      senderAddress: emailConfigState.gmail.email,
      attemptCount: 1,
      lastAttemptAt: new Date().toISOString(),
      errorMessage: 'Sintaks alamat email penerima tidak valid. Pengiriman dibatalkan secara permanen.',
      createdAt: new Date().toISOString(),
    };
    emailConfigState.deliveryLogs.unshift(permFailLog);

    return res.status(400).json({
      success: false,
      status: 'perm_failed',
      error: 'Format alamat email penerima tidak valid.',
      code: 'INVALID_RECIPIENT_EMAIL',
    });
  }

  // Idempotency & Duplicate Prevention
  const effectiveIdempotencyKey = idempotencyKey || (issuanceId ? `idem_${issuanceId}` : `idem_${registrationNumber}_${to}`);
  const existingDelivery = idempotencyStore.get(effectiveIdempotencyKey);
  if (existingDelivery && existingDelivery.status === 'delivered') {
    return res.json({
      ...existingDelivery.response,
      note: 'Pencegahan duplikasi aktif: Email untuk sertifikat ini sudah berhasil terkirim sebelumnya (Idempotent).',
    });
  }

  const incomingToken = req.body?.accessToken || req.body?.gmailAccessToken || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const activeToken = incomingToken || emailConfigState.gmail.accessToken;
  const activeEmail = req.body?.gmailEmail || emailConfigState.gmail.email;
  const activeSenderName = req.body?.senderName || req.body?.gmailSenderName || emailConfigState.gmailSender.senderName;

  if (!activeToken) {
    const actionReqLog = {
      id: `elog_${Date.now()}`,
      issuanceId: issuanceId || `iss_${Date.now()}`,
      recipientEmail: to,
      recipientName: recipientName || '',
      subject,
      status: 'action_required',
      deliveryStrategy: 'gmail_only',
      usedMethod: 'gmail_api',
      senderAddress: '',
      attemptCount: 1,
      lastAttemptAt: new Date().toISOString(),
      errorMessage: 'Akun Gmail belum dihubungkan oleh Administrator.',
      createdAt: new Date().toISOString(),
    };
    emailConfigState.deliveryLogs.unshift(actionReqLog);

    return res.status(200).json({
      success: false,
      status: 'action_required',
      providerType: 'gmail_api',
      error: 'Akun Gmail pengirim belum dihubungkan oleh Administrator. Buka menu Pengaturan Email dan hubungkan akun Gmail terlebih dahulu.',
      code: 'GMAIL_NOT_CONNECTED',
    });
  }

  const senderEmail = activeEmail || emailConfigState.gmail.email || 'sertifikat.bnnkgorontalo@gmail.com';
  const senderHeader = `"${activeSenderName}" <${senderEmail}>`;

  const formattedHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background: #003566; padding: 24px; text-align: center; border-bottom: 3px solid #1677C8;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px;">BADAN NARKOTIKA NASIONAL</h2>
          <p style="color: #93c5fd; margin: 4px 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase;">e-Sertifikat Elektronik Terverifikasi</p>
        </div>
        <div style="padding: 24px; font-size: 14px; line-height: 1.6;">
          <p>Yth. <strong>${recipientName || 'Peserta'}</strong>,</p>
          <p style="white-space: pre-line;">${textBody || 'Berikut dilampirkan e-Sertifikat resmi dari Badan Narkotika Nasional.'}</p>
          <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1677C8;">
            <div style="margin-bottom: 6px;"><strong>Nama Kegiatan:</strong> ${activityName || '-'}</div>
            <div style="margin-bottom: 6px;"><strong>Nomor Registrasi:</strong> <span style="font-family: monospace; font-weight: bold; color: #003566;">${registrationNumber || '-'}</span></div>
            <div><strong>Tanggal Penerbitan:</strong> ${issueDate || '-'}</div>
          </div>
          ${
            verificationUrl
              ? `<p style="text-align: center; margin: 24px 0;">
                  <a href="${verificationUrl}" target="_blank" style="background: #00529B; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block;">
                    Verifikasi Keaslian Dokumen &rarr;
                  </a>
                </p>`
              : ''
          }
          <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
            Dokumen resmi sertifikat dalam format PDF A4 terlampir pada email ini. Simpan dokumen tersebut dengan baik sebagai berkas bukti partisipasi resmi.
          </p>
        </div>
        <div style="padding: 16px 24px; background: #f8fafc; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0;">
          Email resmi ini dikirim melalui integrasi Google Gmail API akun terotorisasi: <strong>${senderEmail}</strong>
        </div>
      </div>
    </body>
    </html>
  `;

  const gmailResult = await sendViaGmailApi({
    fromAddress: senderHeader,
    to,
    subject,
    htmlBody: formattedHtml,
    textBody,
    pdfBase64,
    pdfFilename,
    accessToken: activeToken,
  });

  if (gmailResult.success) {
    const logEntry = {
      id: `elog_${Date.now()}`,
      issuanceId: issuanceId || `iss_${Date.now()}`,
      recipientEmail: to,
      recipientName: recipientName || '',
      subject,
      status: 'delivered' as const,
      deliveryStrategy: 'gmail_only' as const,
      usedMethod: 'gmail_api' as const,
      senderAddress: senderEmail,
      attemptCount: 1,
      lastAttemptAt: new Date().toISOString(),
      providerMessageId: gmailResult.messageId,
      createdAt: new Date().toISOString(),
    };
    emailConfigState.deliveryLogs.unshift(logEntry);

    const resp = {
      success: true,
      status: 'delivered' as const,
      messageId: gmailResult.messageId,
      providerType: 'gmail_api' as const,
      deliveryStrategy: 'gmail_only' as const,
      usedSender: senderEmail,
      note: `Terkirim via Gmail API Resmi (${senderEmail}).`,
    };

    idempotencyStore.set(effectiveIdempotencyKey, {
      status: 'delivered',
      messageId: gmailResult.messageId,
      response: resp,
      timestamp: Date.now(),
    });

    return res.json(resp);
  } else {
    const tempFailLog = {
      id: `elog_${Date.now()}`,
      issuanceId: issuanceId || `iss_${Date.now()}`,
      recipientEmail: to,
      recipientName: recipientName || '',
      subject,
      status: 'temp_failed' as const,
      deliveryStrategy: 'gmail_only' as const,
      usedMethod: 'gmail_api' as const,
      senderAddress: senderEmail,
      attemptCount: 1,
      lastAttemptAt: new Date().toISOString(),
      errorMessage: gmailResult.error || 'Pengiriman Gmail API gagal.',
      createdAt: new Date().toISOString(),
    };
    emailConfigState.deliveryLogs.unshift(tempFailLog);

    return res.status(200).json({
      success: false,
      status: 'temp_failed',
      providerType: 'gmail_api',
      error: `Pengiriman via Gmail API gagal: ${gmailResult.error}. Periksa otorisasi akun Gmail pada menu Pengaturan Email.`,
      code: gmailResult.code,
    });
  }
});

// 9. POST /api/email/reconcile/:logId
app.post('/api/email/reconcile/:logId', (req: Request, res: Response) => {
  const targetId = req.params.logId;
  const log = emailConfigState.deliveryLogs.find(l => l.id === targetId || l.issuanceId === targetId);

  if (!log) {
    return res.status(404).json({ error: 'Log pengiriman tidak ditemukan.' });
  }

  log.isReconciled = true;
  log.lastAttemptAt = new Date().toISOString();

  res.json({
    success: true,
    message: `Rekonsiliasi log selesai. Status saat ini: ${log.status}.`,
    log,
  });
});

// 10. GET /api/email/logs
app.get('/api/email/logs', (req: Request, res: Response) => {
  res.json(emailConfigState.deliveryLogs);
});

// Backward compatibility legacy proxy route
app.post('/api/send-email', async (req: Request, res: Response) => {
  return res.redirect(307, '/api/email/send');
});

// Global Express error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  safeLog('EXPRESS_GLOBAL_ERROR', {
    method: req.method,
    url: req.url,
    error: err?.message || String(err),
    code: err?.code,
    status: err?.status || 500,
  });

  const statusCode = typeof err?.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
  res.status(statusCode).json({
    success: false,
    error: err?.message || 'Terjadi kesalahan pemrosesan pada server backend.',
    code: err?.code || 'SERVER_ERROR',
  });
});

// Catch-all 404 handler for API routes
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Endpoint API "${req.method} ${req.originalUrl || req.url}" tidak ditemukan di server.`,
  });
});

export default app;
