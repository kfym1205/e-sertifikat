/**
 * Helper Keamanan dan Autentikasi Administrator e-Sertifikat BNN
 */

export interface PasswordStrengthResult {
  score: number; // 0 to 4
  label: 'Sangat Lemah' | 'Lemah' | 'Cukup' | 'Kuat' | 'Sangat Kuat';
  color: string;
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

/**
 * Menilai kekuatan password secara real-time
 */
export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const minLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  let passed = 0;
  if (minLength) passed++;
  if (hasUppercase) passed++;
  if (hasLowercase) passed++;
  if (hasNumber) passed++;
  if (hasSpecial) passed++;

  if (password.length === 0) {
    return {
      score: 0,
      label: 'Sangat Lemah',
      color: '#94a3b8',
      checks: { minLength: false, hasUppercase: false, hasLowercase: false, hasNumber: false, hasSpecial: false },
    };
  }

  if (passed <= 2) {
    return {
      score: 1,
      label: 'Lemah',
      color: '#ef4444',
      checks: { minLength, hasUppercase, hasLowercase, hasNumber, hasSpecial },
    };
  } else if (passed === 3) {
    return {
      score: 2,
      label: 'Cukup',
      color: '#f59e0b',
      checks: { minLength, hasUppercase, hasLowercase, hasNumber, hasSpecial },
    };
  } else if (passed === 4) {
    return {
      score: 3,
      label: 'Kuat',
      color: '#10b981',
      checks: { minLength, hasUppercase, hasLowercase, hasNumber, hasSpecial },
    };
  } else {
    return {
      score: 4,
      label: 'Sangat Kuat',
      color: '#059669',
      checks: { minLength, hasUppercase, hasLowercase, hasNumber, hasSpecial },
    };
  }
}

/**
 * Validasi apakah password memenuhi kebijakan keamanan minimum
 */
export function validatePasswordPolicy(password: string): { isValid: boolean; error?: string } {
  if (password.length < 8) {
    return { isValid: false, error: 'Password baru minimal harus 8 karakter.' };
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password harus memadukan huruf besar (A-Z) dan huruf kecil (a-z).' };
  }
  if (!/[0-9]/.test(password) && !/[^A-Za-z0-9]/.test(password)) {
    return { isValid: false, error: 'Password harus menyertakan minimal 1 angka atau simbol/karakter khusus.' };
  }
  return { isValid: true };
}

/**
 * Simple pseudo-hash function for deterministic sync storage verification
 */
export function simpleHashPassword(password: string, salt: string = 'bnn_salt_2026'): string {
  let hash = 0;
  const combined = `${password}__${salt}__bnn_secure_auth`;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(16)}_${combined.length}`;
}
