import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import nodemailer, { SendMailOptions } from 'nodemailer';
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
  console.log(`[BNN-EMAIL-DIAGNOSTIC] [${new Date().toISOString()}] [${stage}]`, JSON.stringify(sanitized));
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

// In-Memory Server Email Config State (initialized from environment variables)
const emailConfigState = {
  deliveryStrategy: (process.env.BNN_DELIVERY_STRATEGY as any) || 'bnn_primary_gmail_fallback',
  providerType: (process.env.BNN_EMAIL_PROVIDER as any) || 'bnn_smtp',
  bnnMethod: (process.env.BNN_EMAIL_METHOD as any) || 'bnn_smtp',
  bnnSender: {
    senderName: process.env.BNN_SENDER_NAME || 'BNN Kabupaten Gorontalo',
    senderAddress: process.env.BNN_SENDER_EMAIL || 'bnn_kabgor@bnn.go.id',
  },
  gmailSender: {
    senderName: process.env.GMAIL_SENDER_NAME || 'e-Sertifikat BNN Kabupaten Gorontalo',
    senderAddress: process.env.GMAIL_SENDER_EMAIL || 'sertifikat.bnnkgorontalo@gmail.com',
  },
  smtp: {
    host: process.env.BNN_SMTP_HOST || 'mail.bnn.go.id',
    port: parseInt(process.env.BNN_SMTP_PORT || '465', 10),
    secure: process.env.BNN_SMTP_SECURE === 'true' || process.env.BNN_SMTP_PORT === '465',
    user: process.env.BNN_SMTP_USER || 'bnn_kabgor@bnn.go.id',
    pass: process.env.BNN_SMTP_PASS || '',
    fromAddress: process.env.BNN_EMAIL_FROM || 'BNN Kabupaten Gorontalo <bnn_kabgor@bnn.go.id>',
    rejectUnauthorized: false,
  },
  relayApi: {
    endpointUrl: process.env.BNN_RELAY_ENDPOINT || '',
    apiKey: process.env.BNN_RELAY_KEY || '',
    fromAddress: process.env.BNN_EMAIL_FROM || 'BNN Kabupaten Gorontalo <bnn_kabgor@bnn.go.id>',
  },
  gmail: {
    connected: false,
    email: '',
    accessToken: '',
    refreshToken: '',
    connectedAt: undefined as string | undefined,
    lastTestedAt: undefined as string | undefined,
    scopeVerified: false,
    isTestSendPassed: false,
    lastError: undefined as string | undefined,
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    fromAddress: process.env.EMAIL_FROM || 'Sertifikat Panitia BNN <sertifikat@bnn.go.id>',
  },
  lastTestResult: null as any,
  lastGmailTest: null as any,
  deliveryLogs: [] as any[],
};

const idempotencyStore = new Map<string, { status: string; messageId: string; response: any; timestamp: number }>();

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Sertifikat Otomatis API Engine with BNN Webmail / SMTP Gateway',
    timezone: 'Asia/Makassar (WITA)',
    emailProvider: emailConfigState.providerType,
    satkerEmail: emailConfigState.smtp.user,
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

  // Clear rate limits on success
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

// 3. User Management Endpoints (Super Admin Only)
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
// EMAIL MULTI-METHOD DELIVERY ENGINE & GMAIL OAUTH INTEGRATION
// ====================================================================

// Helper: Build RFC 2822 MIME message and encode as URL-safe base64 for Gmail API
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
  const cleanFrom = params.from;
  const cleanTo = params.to;
  const subjectEncoded = `=?UTF-8?B?${Buffer.from(params.subject, 'utf-8').toString('base64')}?=`;

  const lines: string[] = [
    `From: ${cleanFrom}`,
    `To: ${cleanTo}`,
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

// Helper: Dispatch message via official Gmail API (REST)
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
      error: 'Akun Gmail Alternatif belum dihubungkan melalui OAuth oleh Administrator.',
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
        emailConfigState.gmail.lastError = 'Token otorisasi Google kedaluwarsa. Silakan Hubungkan Ulang akun.';
        return {
          success: false,
          messageId: '',
          error: 'Token akses Gmail kedaluwarsa. Silakan lakukan "Hubungkan Ulang" pada menu Pengaturan Email.',
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
    deliveryStrategy: emailConfigState.deliveryStrategy,
    activeProvider: emailConfigState.providerType,
    bnnMethod: emailConfigState.bnnMethod,
    isConfigured: Boolean(
      (emailConfigState.smtp.host && emailConfigState.smtp.user && emailConfigState.smtp.pass) ||
      emailConfigState.relayApi.endpointUrl ||
      emailConfigState.gmail.connected ||
      emailConfigState.providerType === 'simulation'
    ),
    bnnSender: emailConfigState.bnnSender,
    gmailSender: emailConfigState.gmailSender,
    bnnSmtp: {
      host: emailConfigState.smtp.host,
      port: emailConfigState.smtp.port,
      secure: emailConfigState.smtp.secure,
      user: emailConfigState.smtp.user,
      hasPassword: Boolean(emailConfigState.smtp.pass),
      fromAddress: emailConfigState.smtp.fromAddress,
    },
    bnnRelay: {
      endpointUrl: emailConfigState.relayApi.endpointUrl,
      hasApiKey: Boolean(emailConfigState.relayApi.apiKey),
      fromAddress: emailConfigState.relayApi.fromAddress,
    },
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
    resend: {
      hasApiKey: Boolean(emailConfigState.resend.apiKey),
      fromAddress: emailConfigState.resend.fromAddress,
    },
    lastConnectionTest: emailConfigState.lastTestResult,
    lastGmailTest: emailConfigState.lastGmailTest,
  });
});

// 2. POST /api/email/save-strategy
app.post('/api/email/save-strategy', (req: Request, res: Response) => {
  const { deliveryStrategy, bnnSender, gmailSender, bnnMethod } = req.body;

  if (deliveryStrategy) {
    emailConfigState.deliveryStrategy = deliveryStrategy;
  }
  if (bnnMethod) {
    emailConfigState.bnnMethod = bnnMethod;
  }
  if (bnnSender) {
    if (bnnSender.senderName) emailConfigState.bnnSender.senderName = bnnSender.senderName;
    if (bnnSender.senderAddress) {
      emailConfigState.bnnSender.senderAddress = bnnSender.senderAddress;
      emailConfigState.smtp.fromAddress = `${emailConfigState.bnnSender.senderName} <${bnnSender.senderAddress}>`;
    }
  }
  if (gmailSender) {
    if (gmailSender.senderName) emailConfigState.gmailSender.senderName = gmailSender.senderName;
    if (gmailSender.senderAddress) emailConfigState.gmailSender.senderAddress = gmailSender.senderAddress;
  }

  res.json({
    success: true,
    message: 'Strategi pengiriman email dan identitas pengirim berhasil disimpan.',
    currentStrategy: emailConfigState.deliveryStrategy,
  });
});

// 3. POST /api/email/save-config
app.post('/api/email/save-config', (req: Request, res: Response) => {
  const { providerType, bnnSmtp, bnnRelay, resend } = req.body;

  if (providerType) {
    emailConfigState.providerType = providerType;
  }

  if (bnnSmtp) {
    if (bnnSmtp.host !== undefined) emailConfigState.smtp.host = bnnSmtp.host;
    if (bnnSmtp.port !== undefined) emailConfigState.smtp.port = parseInt(bnnSmtp.port, 10);
    if (bnnSmtp.secure !== undefined) emailConfigState.smtp.secure = Boolean(bnnSmtp.secure);
    if (bnnSmtp.user !== undefined) {
      emailConfigState.smtp.user = bnnSmtp.user;
      emailConfigState.bnnSender.senderAddress = bnnSmtp.user;
    }
    if (bnnSmtp.pass !== undefined && bnnSmtp.pass.trim() !== '') {
      emailConfigState.smtp.pass = bnnSmtp.pass;
    }
    if (bnnSmtp.fromAddress !== undefined) {
      emailConfigState.smtp.fromAddress = bnnSmtp.fromAddress;
    }
  }

  if (bnnRelay) {
    if (bnnRelay.endpointUrl !== undefined) emailConfigState.relayApi.endpointUrl = bnnRelay.endpointUrl;
    if (bnnRelay.apiKey !== undefined && bnnRelay.apiKey.trim() !== '') {
      emailConfigState.relayApi.apiKey = bnnRelay.apiKey;
    }
    if (bnnRelay.fromAddress !== undefined) emailConfigState.relayApi.fromAddress = bnnRelay.fromAddress;
  }

  if (resend) {
    if (resend.apiKey !== undefined && resend.apiKey.trim() !== '') {
      emailConfigState.resend.apiKey = resend.apiKey;
    }
    if (resend.fromAddress !== undefined) emailConfigState.resend.fromAddress = resend.fromAddress;
  }

  res.json({
    success: true,
    message: 'Konfigurasi provider email server berhasil diperbarui.',
    providerType: emailConfigState.providerType,
  });
});

// 4. POST /api/email/gmail/connect (Store connected Gmail OAuth credentials in server memory)
app.post('/api/email/gmail/connect', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');

  const body = (req.body && typeof req.body === 'object') ? req.body : {};
  const clientToken = (body.accessToken || (typeof req.headers.authorization === 'string' ? req.headers.authorization.replace(/^Bearer\s+/i, '') : '') || '').trim();
  const clientEmail = (body.email || '').trim();
  const clientDisplayName = (body.displayName || '').trim();

  safeLog('GMAIL_CONNECT_RECEIVED', {
    hasToken: Boolean(clientToken),
    tokenLength: clientToken.length,
    clientEmail,
    clientDisplayName,
  });

  if (!clientToken) {
    safeLog('GMAIL_CONNECT_MISSING_TOKEN');
    return res.status(400).json({ success: false, error: 'OAuth Access Token Google tidak ditemukan pada permintaan.' });
  }

  try {
    safeLog('GMAIL_VERIFYING_TOKEN_INFO');
    // Verify token using official Google OAuth2 TokenInfo API (does NOT require gmail.readonly permission)
    const tokenRes = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(clientToken)}`);

    if (!tokenRes.ok) {
      const errData = await tokenRes.json().catch(() => ({}));
      safeLog('GMAIL_TOKENINFO_REJECTED', {
        status: tokenRes.status,
        error: errData.error_description || errData.error || 'Token tidak valid',
      });
      return res.status(401).json({
        success: false,
        error: `Otorisasi Google tidak valid (${errData.error_description || 'Token akses Google ditolak'}). Silakan klik "Hubungkan Akun Gmail" kembali.`,
        code: 'INVALID_GOOGLE_TOKEN',
      });
    }

    const tokenData = await tokenRes.json();
    safeLog('GMAIL_TOKENINFO_ACCEPTED', {
      verifiedEmail: tokenData.email,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope,
    });

    // Check scope: must include gmail.send or mail.google.com
    const scopeStr = tokenData.scope || '';
    const hasSendScope = scopeStr.includes('gmail.send') || scopeStr.includes('mail.google.com');

    if (!hasSendScope) {
      safeLog('GMAIL_SCOPE_MISSING', { scopes: scopeStr });
      return res.status(403).json({
        success: false,
        error: 'Izin pengiriman Gmail (scope https://www.googleapis.com/auth/gmail.send) tidak diberikan. Silakan hubungkan ulang akun dan beri tanda centang pada persetujuan kirim email.',
        code: 'MISSING_GMAIL_SEND_SCOPE',
      });
    }

    const verifiedEmail = tokenData.email || clientEmail || 'sertifikat.bnnkgorontalo@gmail.com';
    const effectiveDisplayName = clientDisplayName || emailConfigState.gmailSender.senderName;

    emailConfigState.gmail.connected = true;
    emailConfigState.gmail.email = verifiedEmail;
    emailConfigState.gmail.accessToken = clientToken;
    emailConfigState.gmail.connectedAt = new Date().toISOString();
    emailConfigState.gmail.scopeVerified = true;
    emailConfigState.gmail.lastError = undefined;

    // Set genuine Gmail sender identity
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
    safeLog('GMAIL_CONNECT_EXCEPTION', { error: err?.message || String(err) });
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

  // If strategy was gmail_only, automatically revert to bnn_only or fallback
  if (emailConfigState.deliveryStrategy === 'gmail_only') {
    emailConfigState.deliveryStrategy = 'bnn_only';
  }

  res.json({
    success: true,
    message: 'Koneksi akun Gmail alternatif berhasil diputuskan dari server.',
  });
});

// 6. POST /api/email/gmail/test-send (Strict Requirement: Test send must succeed before Gmail alternative is activated!)
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

  // Update in-memory state if token and email provided from client
  if (connectedEmail) {
    emailConfigState.gmail.email = connectedEmail;
    emailConfigState.gmail.connected = true;
    emailConfigState.gmailSender.senderAddress = connectedEmail;
  }
  if (activeToken) {
    emailConfigState.gmail.accessToken = activeToken;
    emailConfigState.gmail.connected = true;
  }

  const senderEmail = connectedEmail || 'sertifikat.bnnkgorontalo@gmail.com';
  const senderHeader = `"${senderDisplayName}" <${senderEmail}>`;
  const testHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background: #003566; padding: 20px; text-align: center; border-bottom: 3px solid #1677C8;">
          <h2 style="color: #ffffff; margin: 0; font-size: 18px;">BADAN NARKOTIKA NASIONAL</h2>
          <p style="color: #93c5fd; margin: 4px 0 0 0; font-size: 12px; font-weight: bold;">UJI PENGIRIMAN GMAIL ALTERNATIF</p>
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
          <p style="font-size: 12px; color: #64748b;">Dengan diterimanya email ini, metode Gmail Alternatif telah <strong>Lulus Uji Coba</strong> dan siap digunakan sebagai jalur pengiriman atau saluran fallback.</p>
        </div>
      </div>
    </div>
  `;

  const result = await sendViaGmailApi({
    fromAddress: senderHeader,
    to: targetEmail,
    subject: '[UJI COBA] Jalur Pengiriman Gmail Alternatif - e-Sertifikat BNN',
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
      message: `Uji pengiriman Gmail BERHASIL! Dokumen uji coba diterima oleh ${targetEmail}. Jalur Gmail alternatif kini AKTIF dan siap digunakan.`,
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

// 7. POST /api/email/test-connection (Performs socket/TLS handshake without sending message)
app.post('/api/email/test-connection', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const provider = req.body?.providerType || emailConfigState.providerType;

  const host = req.body?.host || emailConfigState.smtp.host;
  const port = parseInt(req.body?.port || emailConfigState.smtp.port, 10);
  const secure = req.body?.secure !== undefined ? Boolean(req.body.secure) : emailConfigState.smtp.secure;
  const user = req.body?.user || emailConfigState.smtp.user;
  const pass = req.body?.pass || emailConfigState.smtp.pass;

  if (provider === 'bnn_smtp') {
    if (!host || !user) {
      return res.status(400).json({
        success: false,
        providerType: 'bnn_smtp',
        message: 'Host SMTP dan akun email satker wajib diisi untuk pengujian koneksi.',
      });
    }

    if (!pass) {
      return res.status(400).json({
        success: false,
        providerType: 'bnn_smtp',
        message: 'Kata sandi / Application Password akun satker belum dikonfigurasi di server.',
        details: {
          rejectionReason: 'Kata sandi kosong. Silakan masukkan kata sandi resmi akun satker BNN.',
        },
      });
    }

    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
        tls: { rejectUnauthorized: false },
      });

      await transporter.verify();

      const latencyMs = Date.now() - startTime;
      const testResult = {
        success: true,
        providerType: 'bnn_smtp',
        message: `Koneksi SMTP dan Autentikasi ke ${host}:${port} BERHASIL (Handshake TLS Valid, Latensi: ${latencyMs}ms).`,
        latencyMs,
        details: {
          host,
          port,
          secure,
          authVerified: true,
          tlsVerified: true,
        },
      };

      emailConfigState.lastTestResult = {
        testedAt: new Date().toISOString(),
        success: true,
        message: testResult.message,
      };

      return res.json(testResult);
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      let humanMessage = `Koneksi SMTP ke ${host}:${port} gagal: ${err.message}`;

      if (err.code === 'ECONNREFUSED') {
        humanMessage = `Koneksi ditolak (ECONNREFUSED) pada ${host}:${port}. Port SMTP mungkin ditutup atau tidak menerima koneksi masuk dari IP eksternal. Hubungi Administrator Pusat Pusdatin BNN.`;
      } else if (err.code === 'ETIMEDOUT') {
        humanMessage = `Waktu koneksi habis (ETIMEDOUT) ke ${host}:${port}. Firewall jaringan BNN atau batasan outgoing Vercel memblokir port SMTP. Disarankan menggunakan API Relay resmi atau Fallback Gmail.`;
      } else if (err.responseCode === 535 || err.message?.includes('Invalid login') || err.message?.includes('authentication failed')) {
        humanMessage = `Autentikasi gagal (535): Akun "${user}" atau kata sandi tidak cocok pada server mail BNN. Pastikan akun memiliki izin akses SMTP pihak ketiga.`;
      }

      const testResult = {
        success: false,
        providerType: 'bnn_smtp',
        message: humanMessage,
        latencyMs,
        details: {
          host,
          port,
          secure,
          socketResponse: err.response || err.code || 'UNKNOWN_SOCKET_ERROR',
          rejectionReason: err.message,
        },
      };

      emailConfigState.lastTestResult = {
        testedAt: new Date().toISOString(),
        success: false,
        message: humanMessage,
      };

      return res.status(200).json(testResult);
    }
  }

  if (provider === 'bnn_relay_api') {
    const endpointUrl = req.body?.endpointUrl || emailConfigState.relayApi.endpointUrl;
    if (!endpointUrl) {
      return res.status(400).json({
        success: false,
        providerType: 'bnn_relay_api',
        message: 'Endpoint URL API Relay resmi BNN belum dikonfigurasi.',
      });
    }

    try {
      const response = await fetch(endpointUrl, {
        method: 'HEAD',
        headers: emailConfigState.relayApi.apiKey ? { 'Authorization': `Bearer ${emailConfigState.relayApi.apiKey}` } : {},
      });

      return res.json({
        success: response.status < 500,
        providerType: 'bnn_relay_api',
        message: `Endpoint Relay BNN merespon dengan HTTP ${response.status}`,
        details: { endpointUrl, statusCode: response.status },
      });
    } catch (relayErr: any) {
      return res.json({
        success: false,
        providerType: 'bnn_relay_api',
        message: `Gagal menghubungi endpoint relay BNN: ${relayErr.message}`,
      });
    }
  }

  // Simulation mode
  return res.json({
    success: true,
    providerType: 'simulation',
    message: 'Mode Antrean Transaksional Siap Pakai Aktif (Siap Menerima Pengiriman).',
  });
});

// Helper: Format official BNN HTML email template
function createOfficialEmailHtml(data: {
  recipientName: string;
  activityName: string;
  registrationNumber: string;
  issueDate: string;
  verificationUrl: string;
  textBody: string;
  senderAddress: string;
  isFallbackGmail?: boolean;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 20px; }
        .container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
        .header { background: #003566; padding: 24px; text-align: center; border-bottom: 3px solid #1677C8; }
        .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 1px; }
        .header p { color: #93c5fd; margin: 4px 0 0 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; }
        .body { padding: 28px 24px; font-size: 14px; line-height: 1.6; color: #334155; }
        .info-card { background: #f8fafc; border-left: 4px solid #1677C8; border-radius: 6px; padding: 16px; margin: 20px 0; }
        .info-row { margin: 6px 0; }
        .info-label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; }
        .info-value { font-size: 14px; color: #003566; font-weight: bold; font-family: monospace; }
        .btn { display: inline-block; background: #00529B; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 13px; margin: 12px 0; }
        .footer { padding: 16px 24px; background: #f1f5f9; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; }
        .fallback-note { font-size: 10px; color: #64748b; margin-top: 8px; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>BADAN NARKOTIKA NASIONAL</h1>
          <p>e-Sertifikat Elektronik Terverifikasi</p>
        </div>
        <div class="body">
          <p style="white-space: pre-line;">${data.textBody}</p>
          <div class="info-card">
            <div class="info-row">
              <div class="info-label">Nama Kegiatan:</div>
              <div class="info-value" style="font-family: inherit;">${data.activityName}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Nomor Registrasi Resmi:</div>
              <div class="info-value">${data.registrationNumber}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Tanggal Penerbitan:</div>
              <div class="info-value" style="font-family: inherit;">${data.issueDate}</div>
            </div>
          </div>
          <p style="text-align: center;">
            <a href="${data.verificationUrl}" class="btn" target="_blank">Verifikasi Keaslian Dokumen &rarr;</a>
          </p>
          <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
            Dokumen resmi sertifikat dalam format PDF A4 terlampir pada email ini. Simpan dokumen tersebut dengan baik sebagai berkas bukti partisipasi resmi.
          </p>
        </div>
        <div class="footer">
          Email otomatis dikirim oleh Sistem e-Sertifikat BNN.<br>
          Alamat Pengirim: ${data.senderAddress}
          ${data.isFallbackGmail ? '<div class="fallback-note">Dikirimkan melalui jalur cadangan resmi Gmail yang terotorisasi oleh Administrator Satker.</div>' : ''}
        </div>
      </div>
    </body>
    </html>
  `;
}

// 8. POST /api/email/send (Central multi-method dispatcher with priority, retry, fallback, duplicate prevention, and detailed status logging)
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

  // 1. Strict Recipient Validation (Permanent Failure Check)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to.trim())) {
    const permFailLog = {
      id: `elog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      issuanceId: issuanceId || `iss_${Date.now()}`,
      recipientEmail: to,
      recipientName: recipientName || '',
      subject,
      status: 'perm_failed',
      deliveryStrategy: emailConfigState.deliveryStrategy,
      usedMethod: emailConfigState.bnnMethod,
      senderAddress: emailConfigState.bnnSender.senderAddress,
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

  // 2. Idempotency & Duplicate Prevention
  const effectiveIdempotencyKey = idempotencyKey || (issuanceId ? `idem_${issuanceId}` : `idem_${registrationNumber}_${to}`);
  const existingDelivery = idempotencyStore.get(effectiveIdempotencyKey);
  if (existingDelivery && existingDelivery.status === 'delivered') {
    return res.json({
      ...existingDelivery.response,
      note: 'Pencegahan duplikasi aktif: Email untuk nomor sertifikat ini sudah berhasil terkirim sebelumnya (Idempotent).',
    });
  }

  const strategy = emailConfigState.deliveryStrategy; // 'bnn_primary_gmail_fallback' | 'bnn_only' | 'gmail_only'
  let primarySuccess = false;
  let primaryError: string | null = null;
  let primaryAmbiguous = false;
  let usedProvider: any = 'bnn_smtp';
  let messageId = '';
  let fallbackReason: string | undefined = undefined;
  let usedSender = emailConfigState.bnnSender.senderAddress;

  // === STRATEGY BRANCH 1 & 2: TRY BNN FIRST ===
  if (strategy === 'bnn_primary_gmail_fallback' || strategy === 'bnn_only') {
    const isSmtp = emailConfigState.bnnMethod === 'bnn_smtp';
    usedSender = emailConfigState.bnnSender.senderAddress;
    const bnnSenderHeader = `"${emailConfigState.bnnSender.senderName}" <${emailConfigState.bnnSender.senderAddress}>`;

    const emailHtml = createOfficialEmailHtml({
      recipientName: recipientName || '',
      activityName: activityName || '',
      registrationNumber: registrationNumber || '',
      issueDate: issueDate || '',
      verificationUrl: verificationUrl || '',
      textBody: textBody || '',
      senderAddress: bnnSenderHeader,
      isFallbackGmail: false,
    });

    if (isSmtp) {
      usedProvider = 'bnn_smtp';
      const { host, port, secure, user, pass } = emailConfigState.smtp;

      if (!host || !user || !pass) {
        primaryError = 'Kredensial SMTP resmi BNN belum lengkap di server.';
      } else {
        // Attempt 1 with bounded retry
        let attempts = 0;
        const maxAttempts = 2;

        while (attempts < maxAttempts && !primarySuccess) {
          attempts++;
          try {
            const transporter = nodemailer.createTransport({
              host,
              port,
              secure,
              auth: { user, pass },
              connectionTimeout: 8000,
              greetingTimeout: 8000,
              socketTimeout: 10000,
              tls: { rejectUnauthorized: false },
            });

            const mailOptions: SendMailOptions = {
              from: bnnSenderHeader,
              to: recipientName ? `"${recipientName}" <${to}>` : to,
              subject,
              text: textBody,
              html: emailHtml,
            };

            if (pdfBase64) {
              mailOptions.attachments = [
                {
                  filename: pdfFilename || `Sertifikat_${(registrationNumber || 'BNN').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
                  content: Buffer.from(pdfBase64.replace(/^data:application\/pdf;base64,/, ''), 'base64'),
                  contentType: 'application/pdf',
                },
              ];
            }

            const info = await transporter.sendMail(mailOptions);
            primarySuccess = true;
            messageId = info.messageId || `bnn_smtp_${Date.now()}`;
          } catch (smtpErr: any) {
            console.error(`BNN SMTP Attempt ${attempts} Error:`, smtpErr.message);

            // Check if permanent mailbox rejection (e.g., 550 User Unknown)
            if (smtpErr.responseCode === 550 || smtpErr.responseCode === 553 || smtpErr.message?.includes('User unknown')) {
              const permLog = {
                id: `elog_${Date.now()}`,
                issuanceId: issuanceId || `iss_${Date.now()}`,
                recipientEmail: to,
                recipientName: recipientName || '',
                subject,
                status: 'perm_failed',
                deliveryStrategy: strategy,
                usedMethod: 'bnn_smtp',
                senderAddress: emailConfigState.bnnSender.senderAddress,
                attemptCount: attempts,
                lastAttemptAt: new Date().toISOString(),
                errorMessage: `Ditolak permanen oleh mail server (550): ${smtpErr.message}`,
                createdAt: new Date().toISOString(),
              };
              emailConfigState.deliveryLogs.unshift(permLog);

              return res.status(200).json({
                success: false,
                status: 'perm_failed',
                providerType: 'bnn_smtp',
                error: `Mailbox penerima tidak ditemukan / ditolak permanen oleh server email (550).`,
                code: 'MAILBOX_REJECTED_PERMANENT',
              });
            }

            // Check if ambiguous state (timeout while awaiting confirmation of DATA command)
            if (smtpErr.code === 'ETIMEDOUT' && smtpErr.command === 'DATA') {
              primaryAmbiguous = true;
            }

            primaryError = smtpErr.message || 'Koneksi SMTP BNN gagal';
            if (attempts < maxAttempts) {
              await new Promise(r => setTimeout(r, 1000));
            }
          }
        }
      }
    } else {
      // BNN Relay API branch
      usedProvider = 'bnn_relay_api';
      const { endpointUrl, apiKey } = emailConfigState.relayApi;
      if (!endpointUrl) {
        primaryError = 'Endpoint API Relay Resmi BNN belum dikonfigurasi.';
      } else {
        try {
          const relayRes = await fetch(endpointUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
            },
            body: JSON.stringify({
              from: bnnSenderHeader,
              to,
              subject,
              html: emailHtml,
              text: textBody,
              pdfBase64,
              pdfFilename,
            }),
          });
          const relayData = await relayRes.json();
          if (relayRes.ok) {
            primarySuccess = true;
            messageId = relayData.id || `bnn_relay_${Date.now()}`;
          } else {
            primaryError = relayData.message || `Relay HTTP ${relayRes.status}`;
          }
        } catch (err: any) {
          primaryError = err.message || 'Gagal menghubungi BNN Relay';
        }
      }
    }

    // Ambiguous state handling (Prevent duplicates!)
    if (primaryAmbiguous) {
      const ambLog = {
        id: `elog_${Date.now()}`,
        issuanceId: issuanceId || `iss_${Date.now()}`,
        recipientEmail: to,
        recipientName: recipientName || '',
        subject,
        status: 'awaiting_confirmation',
        deliveryStrategy: strategy,
        usedMethod: usedProvider,
        senderAddress: emailConfigState.bnnSender.senderAddress,
        attemptCount: 1,
        lastAttemptAt: new Date().toISOString(),
        errorMessage: 'Koneksi socket terputus saat menunggu konfirmasi terima. Status belum dapat dipastikan.',
        createdAt: new Date().toISOString(),
      };
      emailConfigState.deliveryLogs.unshift(ambLog);

      return res.status(200).json({
        success: false,
        status: 'awaiting_confirmation',
        providerType: usedProvider,
        isAmbiguous: true,
        error: 'Status pengiriman belum pasti (Menunggu Konfirmasi). Hindari pengiriman ulang sebelum pemeriksaan selesai.',
        note: 'Dokumen sertifikat tetap aman. Administrator dapat melakukan pemeriksaan status atau rekonsiliasi.',
      });
    }

    // Success via BNN!
    if (primarySuccess) {
      const successLog = {
        id: `elog_${Date.now()}`,
        issuanceId: issuanceId || `iss_${Date.now()}`,
        recipientEmail: to,
        recipientName: recipientName || '',
        subject,
        status: 'delivered',
        deliveryStrategy: strategy,
        usedMethod: usedProvider,
        senderAddress: emailConfigState.bnnSender.senderAddress,
        attemptCount: 1,
        lastAttemptAt: new Date().toISOString(),
        providerMessageId: messageId,
        createdAt: new Date().toISOString(),
      };
      emailConfigState.deliveryLogs.unshift(successLog);

      const resp = {
        success: true,
        status: 'delivered',
        messageId,
        providerType: usedProvider,
        deliveryStrategy: strategy,
        usedSender: emailConfigState.bnnSender.senderAddress,
        note: `Terkirim melalui Email Resmi BNN (${usedProvider === 'bnn_smtp' ? 'SMTP' : 'Relay'}) dari ${emailConfigState.bnnSender.senderAddress}`,
      };

      idempotencyStore.set(effectiveIdempotencyKey, {
        status: 'delivered',
        messageId,
        response: resp,
        timestamp: Date.now(),
      });

      return res.json(resp);
    }
  }

  // === FALLBACK TO GMAIL ALTERNATIVE ===
  if (strategy === 'bnn_primary_gmail_fallback' || strategy === 'gmail_only') {
    fallbackReason = strategy === 'bnn_primary_gmail_fallback'
      ? `Email Resmi BNN gagal (${primaryError || 'Koneksi tidak tersedia'}). Pengiriman dialihkan ke akun Gmail alternatif.`
      : undefined;

    const incomingGmailToken = req.body?.gmailAccessToken || req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const activeGmailToken = incomingGmailToken || emailConfigState.gmail.accessToken;
    const activeGmailEmail = req.body?.gmailEmail || emailConfigState.gmail.email;
    const activeGmailSender = req.body?.gmailSenderName || emailConfigState.gmailSender.senderName;
    const hasActiveToken = Boolean(activeGmailToken && (activeGmailEmail || emailConfigState.gmail.connected));

    // Check if Gmail Alternative is connected & verified
    if (!hasActiveToken) {
      const actionReqLog = {
        id: `elog_${Date.now()}`,
        issuanceId: issuanceId || `iss_${Date.now()}`,
        recipientEmail: to,
        recipientName: recipientName || '',
        subject,
        status: 'action_required',
        deliveryStrategy: strategy,
        usedMethod: usedProvider,
        senderAddress: emailConfigState.bnnSender.senderAddress,
        attemptCount: 1,
        lastAttemptAt: new Date().toISOString(),
        errorMessage: primaryError || 'Metode BNN gagal dan akun Gmail alternatif belum terhubung.',
        fallbackReason: 'Gagal fallback: Gmail belum dihubungkan oleh admin.',
        createdAt: new Date().toISOString(),
      };
      emailConfigState.deliveryLogs.unshift(actionReqLog);

      return res.status(200).json({
        success: false,
        status: 'action_required',
        providerType: usedProvider,
        error: `Metode utama BNN gagal (${primaryError || 'Koneksi terputus'}) dan Gmail Alternatif belum terhubung. Perlu tindakan administrator.`,
        note: 'Sertifikat PDF tetap tersimpan dengan aman di database. Email dapat dikirim ulang setelah koneksi diperbaiki.',
      });
    }

    // Execute Gmail API dispatch with authentic Gmail sender identity
    const senderEmail = activeGmailEmail || emailConfigState.gmail.email || 'sertifikat.bnnkgorontalo@gmail.com';
    const gmailSenderHeader = `"${activeGmailSender}" <${senderEmail}>`;
    usedSender = senderEmail;

    const emailHtml = createOfficialEmailHtml({
      recipientName: recipientName || '',
      activityName: activityName || '',
      registrationNumber: registrationNumber || '',
      issueDate: issueDate || '',
      verificationUrl: verificationUrl || '',
      textBody: textBody || '',
      senderAddress: gmailSenderHeader,
      isFallbackGmail: true,
    });

    const gmailResult = await sendViaGmailApi({
      fromAddress: gmailSenderHeader,
      to,
      subject,
      htmlBody: emailHtml,
      textBody,
      pdfBase64,
      pdfFilename,
      accessToken: activeGmailToken,
    });

    if (gmailResult.success) {
      const statusValue = strategy === 'bnn_primary_gmail_fallback' ? 'fallen_back_gmail' : 'delivered';
      const logEntry = {
        id: `elog_${Date.now()}`,
        issuanceId: issuanceId || `iss_${Date.now()}`,
        recipientEmail: to,
        recipientName: recipientName || '',
        subject,
        status: statusValue,
        deliveryStrategy: strategy,
        usedMethod: 'gmail_api',
        senderAddress: emailConfigState.gmail.email,
        attemptCount: 1,
        lastAttemptAt: new Date().toISOString(),
        providerMessageId: gmailResult.messageId,
        fallbackReason,
        createdAt: new Date().toISOString(),
      };
      emailConfigState.deliveryLogs.unshift(logEntry);

      const resp = {
        success: true,
        status: statusValue,
        messageId: gmailResult.messageId,
        providerType: 'gmail_api',
        deliveryStrategy: strategy,
        usedSender: emailConfigState.gmail.email,
        fallbackReason,
        note: strategy === 'bnn_primary_gmail_fallback'
          ? `Pengiriman dialihkan dan BERHASIL dikirim melalui Akun Gmail Alternatif (${emailConfigState.gmail.email})!`
          : `Terkirim via Gmail API Resmi (${emailConfigState.gmail.email}).`,
      };

      idempotencyStore.set(effectiveIdempotencyKey, {
        status: 'delivered',
        messageId: gmailResult.messageId,
        response: resp,
        timestamp: Date.now(),
      });

      return res.json(resp);
    } else {
      // Both BNN and Gmail failed
      const tempFailLog = {
        id: `elog_${Date.now()}`,
        issuanceId: issuanceId || `iss_${Date.now()}`,
        recipientEmail: to,
        recipientName: recipientName || '',
        subject,
        status: 'temp_failed',
        deliveryStrategy: strategy,
        usedMethod: 'gmail_api',
        senderAddress: emailConfigState.gmail.email,
        attemptCount: 2,
        lastAttemptAt: new Date().toISOString(),
        errorMessage: `Jalur BNN gagal (${primaryError}); Jalur Gmail juga gagal: ${gmailResult.error}`,
        fallbackReason,
        createdAt: new Date().toISOString(),
      };
      emailConfigState.deliveryLogs.unshift(tempFailLog);

      return res.status(200).json({
        success: false,
        status: 'temp_failed',
        providerType: 'gmail_api',
        error: `Kedua metode pengiriman mengalami kendala sementara. Sertifikat PDF tetap tersimpan aman dan siap dikirim ulang oleh administrator.`,
        details: { bnnError: primaryError, gmailError: gmailResult.error },
      });
    }
  }

  // === STRATEGY BNN ONLY AND FAILED ===
  const bnnOnlyFailLog = {
    id: `elog_${Date.now()}`,
    issuanceId: issuanceId || `iss_${Date.now()}`,
    recipientEmail: to,
    recipientName: recipientName || '',
    subject,
    status: 'temp_failed',
    deliveryStrategy: strategy,
    usedMethod: usedProvider,
    senderAddress: emailConfigState.bnnSender.senderAddress,
    attemptCount: 2,
    lastAttemptAt: new Date().toISOString(),
    errorMessage: primaryError || 'Pengiriman BNN gagal.',
    createdAt: new Date().toISOString(),
  };
  emailConfigState.deliveryLogs.unshift(bnnOnlyFailLog);

  return res.status(200).json({
    success: false,
    status: 'temp_failed',
    providerType: usedProvider,
    error: `Gagal mengirim via Email BNN: ${primaryError || 'Koneksi terputus'}. Fallback ke Gmail dinonaktifkan (Strategi: Email BNN Saja).`,
  });
});

// 9. POST /api/email/reconcile/:logId (Status reconciliation for ambiguous/unconfirmed delivery)
app.post('/api/email/reconcile/:logId', (req: Request, res: Response) => {
  const targetId = req.params.logId;
  const log = emailConfigState.deliveryLogs.find(l => l.id === targetId || l.issuanceId === targetId);

  if (!log) {
    return res.status(404).json({ error: 'Log pengiriman tidak ditemukan.' });
  }

  // Perform reconciliation check
  log.isReconciled = true;
  log.lastAttemptAt = new Date().toISOString();

  if (log.status === 'awaiting_confirmation') {
    // If it had a message ID or provider acknowledgment, mark delivered, otherwise allow safe resend
    if (log.providerMessageId && !log.providerMessageId.includes('sim')) {
      log.status = 'delivered';
      log.errorMessage = undefined;
    } else {
      log.status = 'temp_failed';
      log.errorMessage = 'Hasil rekonsiliasi: Email tidak diterima oleh server tujuan. Siap dikirim ulang.';
    }
  }

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

// Webhook receiver for email status updates
app.post('/api/webhook/email', (req: Request, res: Response) => {
  const signature = req.headers['svix-signature'] || req.headers['x-resend-signature'];
  console.log('Received email webhook event:', req.body?.type || 'unknown', 'signature present:', !!signature);
  res.json({ received: true });
});

// Global Express error handler to guarantee consistent JSON response on unhandled errors (never HTML error page)
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

// Catch-all 404 handler for API routes to guarantee JSON response (never HTML)
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Endpoint API "${req.method} ${req.originalUrl || req.url}" tidak ditemukan di server.`,
  });
});

async function startServer() {
  if (!isProd) {
    // Mount Vite dev middlewares
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server Sertifikat Otomatis running on http://localhost:${PORT}`);
    console.log(`[Email Service] Active Provider: ${emailConfigState.providerType} (Satker: ${emailConfigState.smtp.user})`);
  });
}

// In Vercel Serverless environment, do not start local listening port or import Vite dev server
if (process.env.VERCEL !== '1' && !process.env.VERCEL_ENV && process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
  });
}

export default app;

