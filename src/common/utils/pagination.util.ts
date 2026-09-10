export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

/**
 * Build Prisma skip/take from page and limit
 */
export function getPaginationParams(query: PaginationQuery): {
  skip: number;
  take: number;
  page: number;
  limit: number;
} {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  return { skip: (page - 1) * limit, take: limit, page, limit };
}

/**
 * Build the meta object for paginated list responses
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
 * Build a standard paginated response
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
