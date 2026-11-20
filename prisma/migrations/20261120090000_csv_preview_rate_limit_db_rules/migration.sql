-- ============================================================================
-- 1. CSV previews and rate-limit counters now live in the database
--    (previously in server memory, which breaks on serverless hosts).
-- ============================================================================

-- CreateTable
CREATE TABLE "csv_previews" (
    "token" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "fileId" TEXT,
    "rows" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "csv_previews_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "key" TEXT NOT NULL,
    "hits" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "csv_previews_expiresAt_idx" ON "csv_previews"("expiresAt");

-- CreateIndex
CREATE INDEX "csv_previews_schoolId_idx" ON "csv_previews"("schoolId");

-- CreateIndex
CREATE INDEX "rate_limits_expiresAt_idx" ON "rate_limits"("expiresAt");

-- ============================================================================
-- 2. Business rules enforced by the database itself.
--    Prisma cannot express partial unique indexes or triggers, so they are
--    written by hand here. Prisma ignores them, so `migrate dev` leaves them alone.
--    NOTE: this migration fails if existing data already breaks a rule - fix the
--    data first (the error names the index).
-- ============================================================================

-- Exactly one SUPER_ADMIN on the whole platform.
CREATE UNIQUE INDEX "users_one_super_admin"
    ON "users" ("role") WHERE "role" = 'SUPER_ADMIN';

-- At most one ADMIN and one RECORD_ADMIN per school.
CREATE UNIQUE INDEX "users_one_admin_per_school"
    ON "users" ("schoolId") WHERE "role" = 'ADMIN';
CREATE UNIQUE INDEX "users_one_record_admin_per_school"
    ON "users" ("schoolId") WHERE "role" = 'RECORD_ADMIN';

-- At most one active session per school.
CREATE UNIQUE INDEX "academic_sessions_one_active_per_school"
    ON "academic_sessions" ("schoolId") WHERE "isActive" = true;

-- At most one open term per school (terms reference the school through their
-- session, so a partial index is not possible - use a trigger instead).
-- The advisory lock serialises concurrent attempts for the same school.
CREATE OR REPLACE FUNCTION enforce_single_open_term() RETURNS trigger AS $$
DECLARE
    school_id TEXT;
BEGIN
    IF NEW."isOpen" THEN
        SELECT "schoolId" INTO school_id FROM "academic_sessions" WHERE "id" = NEW."sessionId";
        PERFORM pg_advisory_xact_lock(hashtext('open_term:' || school_id));
        IF EXISTS (
            SELECT 1
            FROM "terms" t
            JOIN "academic_sessions" s ON s."id" = t."sessionId"
            WHERE s."schoolId" = school_id AND t."isOpen" = true AND t."id" <> NEW."id"
        ) THEN
            RAISE EXCEPTION 'Only one term can be open per school'
                USING ERRCODE = '23505';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "terms_single_open"
    BEFORE INSERT OR UPDATE OF "isOpen" ON "terms"
    FOR EACH ROW EXECUTE FUNCTION enforce_single_open_term();
