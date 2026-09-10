/**
 * ID generation utilities for EduTrack AI
 * All IDs follow the format: {PREFIX}/{TYPE}/{SEQUENCE}
 * e.g. BFA/TCH/001, BFA/STU/042
 */

/**
 * Generate next Staff ID for a teacher
 * Format: {prefix}/TCH/{sequence padded to 3 digits}
 * e.g. BFA/TCH/001
 */
export function generateStaffId(prefix: string, sequence: number): string {
  const paddedSeq = String(sequence).padStart(3, '0');
  return `${prefix.toUpperCase()}/TCH/${paddedSeq}`;
}

/**
 * Generate next Student ID (login credential)
 * Format: {prefix}/STU/{sequence padded to 3 digits}
 * e.g. BFA/STU/042
 * NOTE: This is the LOGIN CREDENTIAL — separate from admissionNumber
 */
export function generateStudentId(prefix: string, sequence: number): string {
  const paddedSeq = String(sequence).padStart(3, '0');
  return `${prefix.toUpperCase()}/STU/${paddedSeq}`;
}

/**
 * Derive default prefix from school name
 * Takes first 3 letters, uppercase
 * e.g. "Bright Future Academy" → "BFA"
 */
export function derivePrefix(schoolName: string): string {
  return schoolName
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .slice(0, 3)
    .map((word) => word[0].toUpperCase())
    .join('');
}
