/**
 * @fileoverview Password hashing, generation, and verification utilities.
 * Uses bcrypt with a cost factor of 12 for hashing.
 * @module common/utils/password
 */

import * as bcrypt from 'bcrypt';

/**
 * Character set used for temporary password generation.
 * Omits easily confused characters like '0', 'O', 'I', 'l', and '1'.
 */
const CHARSET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#';

/**
 * Generates a random alphanumeric temporary password for new user accounts.
 *
 * Excludes ambiguous characters (0, O, I, l, 1) and includes uppercase, lowercase,
 * numbers, and symbols.
 *
 * @param length - Length of the generated password (defaults to 10).
 * @returns {string} Randomly generated password string.
 *
 * @example
 * ```ts
 * const tempPass = generateTemporaryPassword(); // e.g. "kG7@mP2#wR"
 * const longPass = generateTemporaryPassword(16);
 * ```
 */
export function generateTemporaryPassword(length = 10): string {
  let password = '';
  for (let i = 0; i < length; i++) {
    password += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return password;
}

/**
 * Hashes a plaintext password using bcrypt with salt rounds of 12.
 *
 * @param password - Plaintext password to hash.
 * @returns {Promise<string>} Bcrypt password hash string.
 *
 * @example
 * ```ts
 * const hashed = await hashPassword('SecretPass123!');
 * ```
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Compares a plaintext password against an existing bcrypt hash.
 *
 * @param plain - Plaintext password input from login request.
 * @param hashed - Stored bcrypt hash string.
 * @returns {Promise<boolean>} True if the password matches the hash, false otherwise.
 *
 * @example
 * ```ts
 * const isValid = await comparePassword(userSuppliedPassword, user.passwordHash);
 * ```
 */
export async function comparePassword(
  plain: string,
  hashed: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}
