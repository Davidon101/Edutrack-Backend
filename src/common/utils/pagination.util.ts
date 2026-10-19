/**
 * @fileoverview Pagination helper utilities and types for query parameters and responses.
 * Provides skip/take calculation and standard envelope generation.
 * @module common/utils/pagination
 */

/**
 * Standard metadata object returned with paginated API responses.
 */
export interface PaginationMeta {
  /**
   * Total number of records matching query filter.
   */
  total: number;

  /**
   * Current page number (1-indexed).
   */
  page: number;

  /**
   * Number of items per page.
   */
  limit: number;

  /**
   * Total number of pages available.
   */
  pages: number;
}

/**
 * Common query parameters for paginated endpoints.
 */
export interface PaginationQuery {
  /**
   * Requested page index (1-based).
   */
  page?: number;

  /**
   * Requested number of items per page.
   */
  limit?: number;
}

/**
 * Result structure of calculated pagination parameters for database queries.
 */
export interface CalculatedPagination {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

/**
 * Calculates Prisma `skip` and `take` offsets from user pagination parameters.
 * Guarantees minimum page of 1 and bounds limit between 1 and 100.
 *
 * @param query - Input pagination parameters with optional page and limit.
 * @returns {CalculatedPagination} Normalized pagination parameters.
 *
 * @example
 * ```ts
 * const { skip, take, page, limit } = getPaginationParams({ page: 2, limit: 10 });
 * // skip: 10, take: 10, page: 2, limit: 10
 * ```
 */
export function getPaginationParams(query: PaginationQuery): CalculatedPagination {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  return { skip: (page - 1) * limit, take: limit, page, limit };
}

/**
 * Constructs the metadata summary object for a paginated list response.
 *
 * @param total - Total count of matching items in the database.
 * @param page - Current page number.
 * @param limit - Maximum items per page.
 * @returns {PaginationMeta} Pagination metadata object.
 *
 * @example
 * ```ts
 * const meta = buildMeta(95, 1, 20);
 * // { total: 95, page: 1, limit: 20, pages: 5 }
 * ```
 */
export function buildMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  return {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

/**
 * Builds a standardized paginated response envelope wrapping a list of records.
 *
 * @template T - Type of the items in the data array.
 * @param data - Array of entities or records for the current page.
 * @param total - Total count of records matching criteria.
 * @param page - Current page number.
 * @param limit - Limit of records per page.
 * @param message - Optional success message (defaults to 'OK').
 * @returns Standardized envelope containing success flag, data, meta, and message.
 *
 * @example
 * ```ts
 * const response = paginatedResponse(users, 50, 1, 10, 'Users retrieved');
 * ```
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  message = 'OK',
) {
  return {
    success: true,
    data,
    meta: buildMeta(total, page, limit),
    message,
  };
}
