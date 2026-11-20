/**
 * @fileoverview Rate-limit storage backed by PostgreSQL.
 *
 * The default throttler storage keeps counters in server memory, so on a
 * serverless host (each request may run on a different instance) every
 * instance counts separately and the limit is effectively not enforced.
 * This storage keeps one counter row per key in the shared database instead.
 *
 * Each hit is a single atomic upsert, so concurrent requests cannot lose counts.
 * If the database is unreachable the storage "fails open" (allows the request)
 * so a database blip never locks every user out.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PrismaThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(PrismaThrottlerStorage.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Count one hit for `key` inside a rolling window of `ttl` milliseconds.
   * @param key - Throttle key (route + client IP, built by ThrottlerGuard).
   * @param ttl - Window length in milliseconds.
   * @returns Total hits in the current window and seconds until it resets.
   */
  async increment(key: string, ttl: number): Promise<ThrottlerStorageRecord> {
    try {
      const rows = await this.prisma.$queryRaw<
        { hits: number; seconds: number }[]
      >`
        INSERT INTO "rate_limits" ("key", "hits", "expiresAt")
        VALUES (${key}, 1, NOW() + make_interval(secs => ${ttl}::double precision / 1000.0))
        ON CONFLICT ("key") DO UPDATE SET
          "hits" = CASE WHEN "rate_limits"."expiresAt" <= NOW()
                        THEN 1 ELSE "rate_limits"."hits" + 1 END,
          "expiresAt" = CASE WHEN "rate_limits"."expiresAt" <= NOW()
                             THEN NOW() + make_interval(secs => ${ttl}::double precision / 1000.0)
                             ELSE "rate_limits"."expiresAt" END
        RETURNING "hits"::int AS "hits",
                  GREATEST(1, CEIL(EXTRACT(EPOCH FROM ("expiresAt" - NOW()))))::int AS "seconds"
      `;

      // Opportunistic cleanup (~1% of calls) so the table stays small.
      if (Math.random() < 0.01) {
        this.prisma
          .$executeRaw`DELETE FROM "rate_limits" WHERE "expiresAt" < NOW()`
          .catch(() => undefined);
      }

      return { totalHits: rows[0].hits, timeToExpire: rows[0].seconds };
    } catch (err) {
      this.logger.warn(`Rate-limit storage unavailable, allowing request: ${err.message}`);
      return { totalHits: 1, timeToExpire: Math.ceil(ttl / 1000) };
    }
  }
}
