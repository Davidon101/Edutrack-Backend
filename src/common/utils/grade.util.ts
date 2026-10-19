/**
 * @fileoverview Grading calculation utilities and default grading system constants.
 * Provides grade determination and score summation logic.
 * @module common/utils/grade
 */

import { GradingScale } from '@prisma/client';

/**
 * Result of a successful grade evaluation.
 */
export interface GradeResult {
  /**
   * Letter grade assigned (e.g., 'A1', 'B2', 'C4').
   */
  grade: string;

  /**
   * Remark or performance comment associated with the grade (e.g., 'Excellent', 'Credit').
   */
  remark: string;
}

/**
 * Calculates letter grade and remark from a total score against an active grading scale.
 *
 * The grading scale array is evaluated in ascending `order` sequence among active items.
 *
 * @param total - Total student score (typically 0-100).
 * @param gradingScales - List of school grading scales loaded from database.
 * @returns {GradeResult | null} Matching GradeResult object, or null if no scale range covers the total.
 *
 * @example
 * ```ts
 * const scales = [
 *   { id: '1', grade: 'A1', minScore: 75, maxScore: 100, remark: 'Excellent', order: 1, isActive: true, schoolId: 's1', createdAt: new Date() },
 * ];
 * const result = calculateGrade(82, scales);
 * // result => { grade: 'A1', remark: 'Excellent' }
 * ```
 */
export function calculateGrade(
  total: number,
  gradingScales: GradingScale[],
): GradeResult | null {
  const match = gradingScales
    .filter((g) => g.isActive)
    .sort((a, b) => a.order - b.order)
    .find((g) => total >= g.minScore && total <= g.maxScore);

  if (!match) return null;
  return { grade: match.grade, remark: match.remark };
}

/**
 * Computes cumulative total score from continuous assessments (CAs) and examination score.
 *
 * Null or undefined parameters are treated as zero.
 *
 * @param ca1 - First continuous assessment score or null.
 * @param ca2 - Second continuous assessment score or null.
 * @param ca3 - Third continuous assessment score or null.
 * @param ca4 - Fourth continuous assessment score or null.
 * @param exam - Final examination score or null.
 * @returns {number} Sum of all assessment components.
 *
 * @example
 * ```ts
 * const total = calculateTotal(15, 12, null, null, 50);
 * // total => 77
 * ```
 */
export function calculateTotal(
  ca1: number | null,
  ca2: number | null,
  ca3: number | null,
  ca4: number | null,
  exam: number | null,
): number {
  return (ca1 ?? 0) + (ca2 ?? 0) + (ca3 ?? 0) + (ca4 ?? 0) + (exam ?? 0);
}

/**
 * Default Nigerian WAEC grading scale (A1–F9).
 * Used when initializing a new school's default grading configuration upon registration.
 */
export const DEFAULT_NIGERIAN_GRADING = [
  { grade: 'A1', minScore: 75, maxScore: 100, remark: 'Excellent',  order: 1 },
  { grade: 'B2', minScore: 70, maxScore: 74,  remark: 'Very Good',  order: 2 },
  { grade: 'B3', minScore: 65, maxScore: 69,  remark: 'Good',       order: 3 },
  { grade: 'C4', minScore: 60, maxScore: 64,  remark: 'Credit',     order: 4 },
  { grade: 'C5', minScore: 55, maxScore: 59,  remark: 'Credit',     order: 5 },
  { grade: 'C6', minScore: 50, maxScore: 54,  remark: 'Credit',     order: 6 },
  { grade: 'D7', minScore: 45, maxScore: 49,  remark: 'Pass',       order: 7 },
  { grade: 'E8', minScore: 40, maxScore: 44,  remark: 'Pass',       order: 8 },
  { grade: 'F9', minScore: 0,  maxScore: 39,  remark: 'Fail',       order: 9 },
];
