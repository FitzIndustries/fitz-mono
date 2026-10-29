---
name: fitz-zero-sync
description: Work safely with Rocicorp Zero in the Fitz Industries monorepo. Use when changing Zero schemas, queries, mutators, cache configuration, authentication context, or debugging sync in web or Expo.
metadata:
  library: "@rocicorp/zero"
  project-version: "1.1.1"
---

# Fitz Zero Sync

This repository uses Rocicorp Zero `1.1.1`. Check `pnpm-workspace.yaml` and the lockfile before relying on APIs from newer Zero releases.

## Authoritative sources

- Current Zero documentation: https://zero.rocicorp.dev/docs
- Package source installed in `node_modules/@rocicorp/zero`
- Project architecture and commands: `AGENTS.md`

When documentation and installed types disagree, follow the installed version and record the mismatch before proposing an upgrade.

## Project map

- Drizzle source schema: `packages/db/src/schema.ts`
- Generated Zero schema: `packages/zero-shared/src/schema.ts`
- Shared Zero context: `packages/zero-shared/src/index.ts`
- Queries: `packages/zero-shared/src/queries.ts`
- Mutators: `packages/zero-shared/src/mutators.ts`
- React/Expo provider helpers: `packages/zero-shared/src/react.ts`, `packages/zero-shared/src/expo-sqlite.ts`
- Server query/mutate helpers: `packages/zero-shared/src/server.ts`
- Hono Zero endpoints: `apps/hono-api/src/index.ts`
- Web provider: `apps/tanstack-start/src/providers/zero-provider.tsx`
- Expo provider: `apps/expo/src/providers/zero-provider.tsx`
- Zero Cache launcher: `apps/zero-cache/src/scripts/dev.ts`

## Required context and tenancy

Every authenticated Zero operation is organization-scoped. The shared context is:

```ts
interface ZeroContext {
  userId: string;
  organizationId: string;
  membershipId: string | null;
}
```

Do not initialize authenticated Zero queries or mutators with only `userId`. Resolve the current viewer organization first. Ensure every tenant-owned query and mutator constrains access using `organizationId`; verify membership server-side rather than trusting client context alone.

## Reads and writes

- Define reusable reads with `defineQuery`/`defineQueries` in `packages/zero-shared/src/queries.ts`.
- Define writes with `defineMutator`/`defineMutators` in `packages/zero-shared/src/mutators.ts`.
- Keep client and server behavior in the shared definitions; do not add app-local duplicate queries or mutations.
- Use tRPC for request/response operations that are not local-first or live; reserve direct Hono routes for protocol boundaries.
- Validate external mutator arguments with Zod and enforce authorization again on the server transaction.

## Schema workflow

Drizzle is the source of truth. After changing `packages/db/src/schema.ts`:

```bash
pnpm db:generate
pnpm db:push
pnpm --filter @fitzindustries/zero-shared typecheck
```

Review the generated schema diff. Do not hand-edit `packages/zero-shared/src/schema.ts` unless the generator explicitly requires a supported customization.

Zero cannot use database defaults for optimistic client writes. For IDs, timestamps, status values, and other required defaults used by a mutator, set values explicitly in the mutator. Treat `drizzle-zero` warnings about database defaults as actionable for any table written through Zero.

## Local development

- PostgreSQL: `localhost:5432`
- Hono query/mutate endpoints: `http://127.0.0.1:3100/api/zero/*`
- Zero Cache: `localhost:4848`
- Preferred web stack command: `pnpm dev:web`
- Full DB reset: `pnpm reset-db` (destructive)

Browser traffic must use HTTPS/same-origin URLs when the app is opened through exe.dev. Server-side traffic should use internal HTTP URLs. Do not introduce browser calls from an HTTPS page to `http://...` resources.

## Verification checklist

1. Run `pnpm db:generate` after Drizzle schema changes and inspect the generated diff.
2. Run lint and typecheck for DB, Zero Shared, Hono, web, and Expo workspaces touched.
3. Confirm anonymous users do not receive tenant data.
4. Confirm two organizations cannot query or mutate each other's records.
5. Confirm optimistic writes use explicit IDs/default values needed before server acknowledgement.
6. Confirm a fresh browser session connects to Zero Cache without mixed-content, CORS, or auth-loop errors.
7. Check Zero Cache and Hono logs for query, mutation, and replication failures.

## Upgrade guardrail

Zero is fast-moving. Before upgrading `@rocicorp/zero`, inspect every release note between the installed and target versions, then verify:

- query and mutator definition APIs,
- `cacheURL`, auth, and connection configuration,
- custom mutator server handling,
- generated schema format,
- Zero Cache environment variables,
- Expo storage integration.

Perform a Zero upgrade separately from unrelated dependency updates.
