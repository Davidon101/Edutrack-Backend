import * as bcrypt from 'bcrypt';

const CHARSET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#';

/**
 * Generate a temporary password for TEACHER and STUDENT accounts
 * 10 characters — mix of upper, lower, numbers, symbols
 * Excludes ambiguous characters (0, O, I, l, 1)
 */
export function generateTemporaryPassword(length = 10): string {
  let password = '';
  for (let i = 0; i < length; i++) {
    password += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return password;
}

/**
 * Hash a password using bcrypt with cost factor 12
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Compare a plain password against a bcrypt hash
 */
export async function comparePassword(
  plain: string,
  hashed: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}
