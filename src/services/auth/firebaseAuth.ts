import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../../firebase-applet-config.json';
import {
  safeApiFetch,
  saveGmailSessionToClient,
  clearGmailSessionFromClient,
  getGmailSessionFromClient,
  StoredGmailSession,
} from '../../utils/apiClient';

// Initialize Firebase App instance once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Google Auth Provider configured specifically for Gmail sending
const gmailProvider = new GoogleAuthProvider();
gmailProvider.addScope('https://www.googleapis.com/auth/gmail.send');
gmailProvider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline',
});

export interface GmailConnectionResult {
  success: boolean;
  email?: string;
  displayName?: string;
  accessToken?: string;
  error?: string;
  isDomainAuthError?: boolean;
}

/**
 * Initiates client-side OAuth flow to connect an authorized Gmail account
 * for sending e-Sertifikat BNN. The acquired OAuth access token is passed to backend
 * and stored securely for stateless and serverless operations.
 */
export async function connectGmailAccount(): Promise<GmailConnectionResult> {
  try {
    const result = await signInWithPopup(auth, gmailProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    // CRITICAL: Strictly use Google OAuth 2.0 Access Token (with gmail.send scope),
    // NEVER use Firebase ID Token (getIdToken is only for Firebase services and cannot call Gmail API).
    const googleOAuthAccessToken = credential?.accessToken;
    const userEmail = result.user.email || '';
    const displayName = result.user.displayName || 'Administrator BNN';

    if (!googleOAuthAccessToken) {
      throw new Error('Gagal memperoleh Google OAuth Access Token. Pastikan akun Google dipilih dan izin disetujui.');
    }

    // Persist token and email in backend serverless/express endpoint with resilient error handling
    const apiRes = await safeApiFetch<{ success: boolean; message: string; email?: string; displayName?: string; error?: string }>('/api/email/gmail/connect', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${googleOAuthAccessToken}`,
      },
      body: JSON.stringify({
        email: userEmail,
        displayName,
        accessToken: googleOAuthAccessToken,
      }),
    });

    if (!apiRes.ok) {
      const serverErrMsg = apiRes.data?.error || apiRes.data?.message || `Server menolak koneksi akun Gmail (${apiRes.status}).`;
      throw new Error(serverErrMsg);
    }

    // Successfully verified by backend
    const verifiedEmail = apiRes.data?.email || userEmail;
    const verifiedDisplayName = apiRes.data?.displayName || displayName;
    const session: StoredGmailSession = {
      email: verifiedEmail,
      displayName: verifiedDisplayName,
      accessToken: googleOAuthAccessToken,
      connectedAt: new Date().toISOString(),
      scopeVerified: true,
      isTestSendPassed: false,
    };
    saveGmailSessionToClient(session);

    return {
      success: true,
      email: verifiedEmail,
      displayName: verifiedDisplayName,
      accessToken: googleOAuthAccessToken,
    };
  } catch (error: any) {
    console.error('Error connecting Gmail:', error);
    let errorMsg = error.message || 'Gagal menghubungkan akun Gmail.';
    let isDomainAuthError = false;

    if (error.code === 'auth/popup-closed-by-user') {
      errorMsg = 'Jendela login Google ditutup sebelum otorisasi selesai. Silakan klik tombol "Hubungkan Gmail" kembali.';
    } else if (error.code === 'auth/popup-blocked') {
      errorMsg = 'Jendela popup Google diblokir oleh browser. Izinkan pop-up pada peramban web Anda untuk melanjutkan.';
    } else if (error.code === 'auth/unauthorized-domain') {
      isDomainAuthError = true;
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'sertifikat.p2mkabgor.web.id';
      errorMsg = `Domain "${currentHost}" belum didaftarkan di Authorized Domains Firebase Console. Buka Firebase Console > Authentication > Settings > Authorized domains, lalu tambahkan domain "${currentHost}".`;
    } else if (error.code === 'auth/network-request-failed') {
      errorMsg = 'Koneksi ke server autentikasi Google terganggu. Periksa sambungan internet Anda.';
    }

    return {
      success: false,
      error: errorMsg,
      isDomainAuthError,
    };
  }
}

/**
 * Disconnects the Gmail account on the backend server and clears client storage
 */
export async function disconnectGmailAccount(): Promise<{ success: boolean; message: string }> {
  try {
    clearGmailSessionFromClient();
    const apiRes = await safeApiFetch<{ success: boolean; message: string }>('/api/email/gmail/disconnect', {
      method: 'POST',
    });

    await signOut(auth).catch(() => {});

    return {
      success: true,
      message: apiRes.data?.message || 'Koneksi akun Gmail berhasil diputuskan.',
    };
  } catch (err: any) {
    clearGmailSessionFromClient();
    return {
      success: true,
      message: 'Koneksi akun Gmail pada browser berhasil diputuskan.',
    };
  }
}

/**
 * Helper to get currently active Gmail session for diagnostics
 */
export function getActiveGmailSession(): StoredGmailSession | null {
  return getGmailSessionFromClient();
}
