import { GradingScale } from '@prisma/client';

export interface GradeResult {
  grade: string;
  remark: string;
}

/**
 * Calculate grade and remark from a total score using the school's grading scale.
 * The scale is fetched from DB and passed in — no DB call inside this utility.
 * Returns null if no matching grade is found (shouldn't happen with a complete scale).
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
 * Calculate total score from individual components
 * All values are integers — nulls treated as 0
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
 * Default Nigerian WAEC grading scale (A1–F9)
 * Used when seeding a new school's grading scale on registration
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
