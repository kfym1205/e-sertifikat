import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../../firebase-applet-config.json';

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
}

/**
 * Initiates client-side OAuth flow to connect an authorized Gmail account
 * for sending e-Sertifikat BNN. The acquired OAuth access token is passed to backend
 * and stored securely in server memory (never plaintext in localStorage).
 */
export async function connectGmailAccount(): Promise<GmailConnectionResult> {
  try {
    const result = await signInWithPopup(auth, gmailProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    const accessToken = credential?.accessToken;
    const userEmail = result.user.email || '';
    const displayName = result.user.displayName || 'Administrator BNN';

    if (!accessToken) {
      throw new Error('Gagal memperoleh OAuth Access Token dari Google.');
    }

    // Persist token and email in backend server
    const response = await fetch('/api/email/gmail/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        email: userEmail,
        displayName,
        accessToken,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Server menolak koneksi akun Gmail.');
    }

    return {
      success: true,
      email: userEmail,
      displayName,
      accessToken,
    };
  } catch (error: any) {
    console.error('Error connecting Gmail:', error);
    let errorMsg = error.message || 'Gagal menghubungkan akun Gmail.';
    if (error.code === 'auth/popup-closed-by-user') {
      errorMsg = 'Jendela login Google ditutup sebelum selesai.';
    } else if (error.code === 'auth/popup-blocked') {
      errorMsg = 'Jendela popup Google diblokir browser. Izinkan popup untuk melanjutkan.';
    }
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Disconnects the Gmail account on the backend server
 */
export async function disconnectGmailAccount(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch('/api/email/gmail/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    await signOut(auth).catch(() => {});
    return {
      success: true,
      message: data.message || 'Koneksi akun Gmail berhasil diputuskan.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Gagal memutuskan koneksi Gmail pada server.',
    };
  }
}
