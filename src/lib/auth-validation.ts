// Shared signup/password validation. Server actions enforce these; the
// client-side strength indicator reuses the same scorer for consistency.

// Conservative format check — matches the bulk of real-world addresses
// without trying to be RFC-perfect. Browsers also apply input[type=email]
// validation; this is the server-side belt to that suspenders.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  if (email.length > 254) return false;
  return EMAIL_RE.test(email);
}

export type PasswordPolicy = {
  // Minimum policy: length ≥ 8 AND contains at least one letter AND one digit.
  // Below this we reject. Above this we still grade strength as a UX nudge.
  ok: boolean;
  reason: "too-short" | "missing-letter" | "missing-digit" | null;
};

export function checkPasswordPolicy(password: string): PasswordPolicy {
  if (password.length < 8) return { ok: false, reason: "too-short" };
  if (!/[A-Za-z]/.test(password)) return { ok: false, reason: "missing-letter" };
  if (!/[0-9]/.test(password)) return { ok: false, reason: "missing-digit" };
  return { ok: true, reason: null };
}

// 0–4 strength bucket. Identical math on server and client so the bar the
// user sees matches the bar we'd compute if we were grading them.
export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

export function passwordStrength(password: string): PasswordStrength {
  if (password.length === 0) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  if (password.length >= 16) score++;
  return Math.min(score, 4) as PasswordStrength;
}
