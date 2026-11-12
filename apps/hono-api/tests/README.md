# Zero tenant-query regression tests

These are database integration tests using Node's built-in test runner and the existing `tsx` dependency. They execute the actual registered Zero queries through the Postgres adapter. They are not browser/E2E tests, and do not replace the planned Vitest/Playwright setup.

The suite covers all registered queries, two organizations, anonymous contexts, foreign record IDs, orphaned messages and inconsistent cross-tenant relationship references. The legacy Expo `posts.all` query remains explicitly global demo content; never place tenant data in that table.

## Run locally

From the repository root, with the local Docker Postgres container running:

```bash
set -e
name="fitz_queries_$(date +%s)_test"
docker exec fitz-mono-postgres createdb -U postgres "$name"
trap 'docker exec fitz-mono-postgres dropdb -U postgres --force "$name"' EXIT

POSTGRES_URL="postgresql://postgres:postgres@127.0.0.1:5432/$name" \
  pnpm --filter @fitzindustries/db exec drizzle-kit push --force

TEST_POSTGRES_URL="postgresql://postgres:postgres@127.0.0.1:5432/$name" \
  pnpm --filter @fitzindustries/hono-api test:tenant-queries
```

The suite refuses to run unless `TEST_POSTGRES_URL` names a database ending in `_test`. It does not read the developer `.env` or reset/truncate any database. The caller must create an empty database, apply the schema, and drop it afterward, including after failed runs. Use a fresh database for every run.

To select a single regression with Node's test-name pattern:

```bash
TEST_POSTGRES_URL="$TEST_POSTGRES_URL" pnpm --filter @fitzindustries/hono-api \
  exec node --import tsx --test --test-name-pattern='messages' tests/zero-tenant-queries.test.ts
```

The Turbo task `test:tenant-queries` is uncached and declares `TEST_POSTGRES_URL`. CI wiring belongs to FITZ-33/FITZ-38; these tests must run against a disposable CI database, never the shared development database.
