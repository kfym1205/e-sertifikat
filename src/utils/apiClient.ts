/**
 * Resilient API Client Helper for e-Sertifikat BNN
 * Safely handles JSON responses, detects non-JSON/HTML errors (e.g. Vercel 404/500/504),
 * prevents SyntaxError ("Unexpected token < or T"), and manages stateless OAuth session data.
 */

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
  rawText?: string;
  isHtmlError?: boolean;
}

export interface StoredGmailSession {
  email: string;
  displayName: string;
  accessToken: string;
  connectedAt: string;
  scopeVerified: boolean;
  isTestSendPassed: boolean;
  lastTestedAt?: string;
}

const GMAIL_SESSION_STORAGE_KEY = 'so_gmail_oauth_session_v1';

/**
 * Persists the authorized Gmail session in client storage for stateless serverless resilience
 */
export function saveGmailSessionToClient(session: StoredGmailSession): void {
  try {
    localStorage.setItem(GMAIL_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (err) {
    console.warn('Gagal menyimpan sesi Gmail ke localStorage:', err);
  }
}

/**
 * Retrieves the stored Gmail session from client storage
 */
export function getGmailSessionFromClient(): StoredGmailSession | null {
  try {
    const raw = localStorage.getItem(GMAIL_SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Clears the stored Gmail session from client storage
 */
export function clearGmailSessionFromClient(): void {
  try {
    localStorage.removeItem(GMAIL_SESSION_STORAGE_KEY);
  } catch (err) {
    console.warn('Gagal menghapus sesi Gmail dari localStorage:', err);
  }
}

/**
 * Safely parses any fetch Response without ever throwing JSON SyntaxError
 */
export async function safeParseResponse<T = any>(response: Response): Promise<ApiResponse<T>> {
  const status = response.status;
  const contentType = response.headers.get('content-type') || '';

  // 1. Valid JSON response
  if (contentType.toLowerCase().includes('application/json')) {
    try {
      const data = await response.json();
      return {
        ok: response.ok,
        status,
        data,
      };
    } catch {
      return {
        ok: false,
        status,
        data: {
          error: 'Format data JSON dari server tidak dapat dibaca.',
        } as unknown as T,
      };
    }
  }

  // 2. Non-JSON response (e.g. HTML 404 "The page could not be found", HTML 500/504, or plain text)
  let rawText = '';
  try {
    rawText = await response.text();
  } catch {
    rawText = '';
  }

  const isHtml = contentType.toLowerCase().includes('text/html') ||
                 rawText.trim().startsWith('<') ||
                 rawText.includes('The page could not be found') ||
                 rawText.includes('NOT_FOUND');

  let friendlyMessage = `Server merespons status ${status} (${response.statusText || 'Error'}).`;

  if (status === 404) {
    if (rawText.includes('The page could not be found') || isHtml) {
      friendlyMessage =
        'Endpoint API backend tidak ditemukan pada server Vercel (HTTP 404). Pastikan serverless handler di /api/index.ts dan konfigurasi vercel.json telah ter-deploy.';
    } else {
      friendlyMessage = `Rute API tidak ditemukan pada server (${status}).`;
    }
  } else if (status === 504 || status === 502) {
    friendlyMessage = `Koneksi gateway server Vercel timeout (${status}). Silakan ulangi beberapa saat lagi.`;
  } else if (status >= 500) {
    friendlyMessage = `Server mengalami kendala internal (${status}). Periksa log serverless Vercel.`;
  } else if (status === 401 || status === 403) {
    friendlyMessage = `Akses ditolak atau kredensial otorisasi tidak valid (${status}).`;
  }

  return {
    ok: false,
    status,
    isHtmlError: isHtml,
    rawText: rawText.substring(0, 300),
    data: {
      success: false,
      error: friendlyMessage,
      message: friendlyMessage,
    } as unknown as T,
  };
}

/**
 * Resilient fetch wrapper that automatically applies headers, token, and safe response parsing
 */
export async function safeApiFetch<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers = new Headers(options.headers || {});

  // If no Content-Type specified and has body that is string, default to application/json
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Auto-attach Gmail OAuth token from client storage if not already present
  const session = getGmailSessionFromClient();
  if (session?.accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${session.accessToken}`);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    return await safeParseResponse<T>(response);
  } catch (networkError: any) {
    const errorMsg = networkError?.message || 'Gagal terhubung ke jaringan server.';
    return {
      ok: false,
      status: 0,
      data: {
        success: false,
        error: `Kesalahan jaringan: ${errorMsg}. Periksa koneksi internet Anda.`,
        message: `Kesalahan jaringan: ${errorMsg}.`,
      } as unknown as T,
    };
  }
}
