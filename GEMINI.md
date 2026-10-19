# GEMINI.md

Context file for AI agents working in this repository. Read this before making changes.

## Project

**EduTrack AI API** — School Management System REST API, built by Dragks Technologies.
Manages schools, classes, subjects, students, teachers, grading, promotions, sessions, and audit logging for a multi-school platform, with a companion Flutter mobile app as a client.

## Stack

- **Framework:** NestJS 10 (Express platform)
- **ORM:** Prisma 5.13, PostgreSQL
- **Auth:** Passport + JWT (`@nestjs/passport`, `@nestjs/jwt`), role-based guards
- **Validation:** `class-validator` / `class-transformer`
- **Docs:** `@nestjs/swagger` — but see "Swagger UI" below, the built-in renderer is disabled
- **Deployment:** Vercel (serverless functions), CI via GitHub Actions
- **Language:** TypeScript 5.4, strict null checks off, `esModuleInterop: true`

## Project layout

```
src/
  main.ts            — bootstrap: security, CORS, prefix/versioning, Swagger, guards
  app.module.ts       — root module
  app.controller.ts    — public welcome route at GET /
  common/             — decorators (@Public), guards, filters, interceptors
  prisma/             — PrismaService
  auth/ users/ schools/ classes/ subjects/ students/ teachers/
  sessions/ grading/ promotions/ dashboard/ audit/ files/
prisma/
  schema.prisma       — single schema, binaryTargets set for both local + Vercel
```

Routing convention: global prefix `api`, URI versioning with default version `1` (`app.enableVersioning`), so most routes resolve to `/api/v1/...`. The root welcome route (`AppController`) is deliberately both prefix-excluded and `@Version(VERSION_NEUTRAL)` to serve at the true `/`.

## Commands

```bash
npm run start:dev          # watch mode, local dev
npm run build               # nest build — run this locally before pushing
npm run seed                 # ts-node prisma/seed.ts
npm run lint / npm run format
```

Always run `npm run build` locally before pushing — CI (`nest build` on Vercel) is the authority on TypeScript errors, and iterating via push-and-wait-for-CI is slow.

## Deployment gotchas (do not reintroduce these)

This project runs on **Vercel serverless functions**, which behave differently from a normal Node server in ways that have caused real production incidents. Keep these in mind for any new code:

1. **Filesystem is read-only except `/tmp`.** Never write to `process.cwd()`-relative paths or any `./something` directory at runtime (multer disk storage, generated files, logs). Use `os.tmpdir()`, or better, avoid disk writes entirely (memory buffers, direct response streaming). File uploads use `multer.memoryStorage()`, not disk storage — keep it that way.
2. **Prisma's query engine binary target must include `rhel-openssl-3.0.x`.** CI builds on Debian/Ubuntu, but Vercel's runtime is Amazon Linux. `prisma/schema.prisma`'s `generator client` block has `binaryTargets = ["native", "rhel-openssl-3.0.x"]` — don't remove it.
3. **Swagger UI's built-in static assets don't survive Vercel's build tracer.** `swaggerUiEnabled: false` is set deliberately; the UI at `/api/docs` is a hand-written HTML page (in `main.ts`) that loads Swagger UI entirely from cdnjs — do not revert to the default `SwaggerModule.setup()` UI, it will 404 on every asset in production.
4. **Helmet's default CSP blocks the above CDN assets.** `main.ts` extends `contentSecurityPolicy` directives to allow `cdnjs.cloudflare.com` for script/style/img. If you add other CDN dependencies anywhere, extend this CSP rather than disabling it.
5. **`esModuleInterop: true` is required in `tsconfig.json`.** Default-importing CommonJS packages (e.g. `import compression from 'compression'`) silently resolves to `undefined` at runtime without it, even though it type-checks fine — this already caused a production crash once.
6. **Environment variables are scoped per Vercel environment** (Production / Preview / Development) — a var added for Production won't exist in Preview deployments unless explicitly checked there too. If a Preview deployment throws `Environment variable not found`, check the Vercel dashboard scoping before assuming it's a code bug.
7. **Global guards are on by default.** `JwtAuthGuard` + `RolesGuard` are applied globally in `main.ts`. Any new route intended to be public needs the `@Public()` decorator (`common/decorators/public.decorator.ts`), or it will 401.

## Conventions

- Add production-ready docstrings (TSDoc style) on all functions, methods, classes, and modules — parameters, return types, example codes and exceptions where relevant. Also add docstrings to all files.
- Prisma queries: never pass a typed DTO class directly into a JSON field — cast with `{ ...dto } as any` (see `schools.service.ts`'s audit log writes for the pattern).
- Prisma `findMany`/`findUnique` calls: never mix `select` and `include` at the same level — nest relation selection inside `select` instead.
- Audit logging: significant mutations (school updates, settings changes) write before/after snapshots via the audit module — follow existing patterns in `schools.service.ts` when adding new mutating endpoints.

## Before committing

1. `npm run build` — must be clean.
2. If you touched anything under `prisma/`, confirm `binaryTargets` in `schema.prisma` is untouched.
3. If you touched `main.ts`, confirm the CSP, Swagger CDN setup, and prefix/versioning exclusions are still intact.
4. Write a clear, conventional commit message (`fix(scope): ...`, `feat(scope): ...`).