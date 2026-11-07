/**
 * Password rules for changing / resetting a password. Mirrors the sign-up
 * rules in SignUpScreen (≥ 8 chars, a letter, a number, a special char) so
 * every password the app sets meets the same bar.
 */

export interface PasswordRule {
  id: string;
  label: string;
  test: (pw: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { id: 'letter', label: 'A letter', test: (pw) => /[a-zA-Z]/.test(pw) },
  { id: 'number', label: 'A number', test: (pw) => /\d/.test(pw) },
  {
    id: 'special',
    label: 'A special character',
    test: (pw) => /[!@#$%^&*(),.?":{}|<>\-_=+[\]\\/;'`~]/.test(pw),
  },
];

export const PASSWORD_MAX = 72; // bcrypt limit used by Supabase Auth

export const passwordMeetsRules = (pw: string): boolean =>
  pw.length <= PASSWORD_MAX && PASSWORD_RULES.every((r) => r.test(pw));

export type PasswordStrength = 0 | 1 | 2 | 3 | 4;
export const STRENGTH_LABELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'] as const;

/** 0–4 strength score for the meter (rules met, plus a bonus for length). */
export const passwordStrength = (pw: string): PasswordStrength => {
  if (!pw) return 0;
  const met = PASSWORD_RULES.filter((r) => r.test(pw)).length; // 0–4
  let score = met - 1; // all four rules → 3 ("Good")
  if (met === PASSWORD_RULES.length && pw.length >= 12) score += 1; // long → "Strong"
  return Math.max(0, Math.min(4, score)) as PasswordStrength;
};

/** First problem with a new password + confirmation, or null when valid. */
export const validateNewPassword = (
  next: string,
  confirm: string,
  current?: string
): string | null => {
  if (!next) return 'Enter a new password.';
  if (next.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  const failed = PASSWORD_RULES.find((r) => !r.test(next));
  if (failed) return `New password needs: ${failed.label.toLowerCase()}.`;
  if (current !== undefined && current === next) {
    return 'Choose a password different from your current one.';
  }
  if (next !== confirm) return 'Passwords do not match.';
  return null;
};
