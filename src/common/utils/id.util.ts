/**
 * @fileoverview ID generation utilities for staff and students in EduTrack AI.
 * Formats IDs consistently according to `{PREFIX}/{TYPE}/{SEQUENCE}` convention.
 * @module common/utils/id
 */

/**
 * Generates the next sequential Staff ID for a teacher.
 *
 * Pattern: `{prefix}/TCH/{sequence padded to 3 digits}` (e.g. `BFA/TCH/001`).
 *
 * @param prefix - School prefix code (e.g., 'BFA').
 * @param sequence - Incremental integer sequence number.
 * @returns {string} Formatted staff ID.
 *
 * @example
 * ```ts
 * const staffId = generateStaffId('BFA', 1); // "BFA/TCH/001"
 * ```
 */
export function generateStaffId(prefix: string, sequence: number): string {
  const paddedSeq = String(sequence).padStart(3, '0');
  return `${prefix.toUpperCase()}/TCH/${paddedSeq}`;
}

/**
 * Generates the next sequential Student ID used as login credential identifier.
 *
 * Pattern: `{prefix}/STU/{sequence padded to 3 digits}` (e.g. `BFA/STU/042`).
 * Note: This represents the login identifier, separate from the student's admission number.
 *
 * @param prefix - School prefix code (e.g., 'BFA').
 * @param sequence - Incremental integer sequence number.
 * @returns {string} Formatted student identifier string.
 *
 * @example
 * ```ts
 * const studentId = generateStudentId('BFA', 42); // "BFA/STU/042"
 * ```
 */
export function generateStudentId(prefix: string, sequence: number): string {
  const paddedSeq = String(sequence).padStart(3, '0');
  return `${prefix.toUpperCase()}/STU/${paddedSeq}`;
}

/**
 * Derives a default school acronym prefix from a school name.
 * Takes the first letters of the first three words, in uppercase.
 *
 * @param schoolName - Full school name string (e.g., 'Bright Future Academy').
 * @returns {string} Uppercase 2-3 character prefix (e.g., 'BFA').
 *
 * @example
 * ```ts
 * const prefix = derivePrefix('Bright Future Academy'); // "BFA"
 * const singleWordPrefix = derivePrefix('Kingsway'); // "K"
 * ```
 */
export function derivePrefix(schoolName: string): string {
  return schoolName
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .slice(0, 3)
    .map((word) => word[0].toUpperCase())
    .join('');
}
