# Testing

## Fast Node unit tests

Use the repository's pinned Node and pnpm versions. Install dependencies with `pnpm install --frozen-lockfile`.

```bash
pnpm test:unit               # run all participating workspace unit tasks once
pnpm test:unit:watch         # explicitly watch the root Vitest projects
pnpm test:unit:coverage      # workspace unit tasks with V8 coverage
```

The initial Node projects are `@fitzindustries/validators` and `@fitzindustries/zero-shared`. Vitest and `@vitest/coverage-v8` are pinned to matching versions. Only `tests/unit/**/*.test.ts` files are discovered. These tests require no Postgres, Zero Cache, app server, credentials, or external API access. Initial tests validate the harness and source imports; substantive behavioral cases and coverage thresholds belong to FITZ-30.

### Select a workspace, file, or test

```bash
pnpm --filter @fitzindustries/validators test:unit
pnpm --filter @fitzindustries/validators test:unit:watch
pnpm --filter @fitzindustries/validators test:unit:coverage

# Root Vitest project selection (also supports multiple --project options)
pnpm exec vitest run --project @fitzindustries/zero-shared

# Single file or named test from the workspace
pnpm --filter @fitzindustries/validators test:unit tests/unit/harness.test.ts
pnpm --filter @fitzindustries/validators test:unit -t 'loads a TypeScript source export'
```

`pnpm exec vitest run` runs the root project list without Turbo. `pnpm exec vitest run --coverage` produces one combined coverage report. Watch mode is intentionally explicit; CI must use `run` commands. A failed assertion or an unexpectedly empty project returns a nonzero exit status.

### Configuration and reports

- `vitest.shared.config.mts`: shared Node environment, discovery, reporters, coverage and no-test policy.
- `vitest.config.mts`: root project list and combined report configuration.
- `packages/*/vitest.config.ts`: workspace project identity, root and `~/` source alias.
- `packages/*/tests/unit/tsconfig.json`: test typechecking and editor/ESLint project discovery. Tests are outside `src`, so declaration builds do not emit test files.

Workspace commands produce `test-results/unit.xml` (JUnit), plus `coverage/lcov.info`, `coverage/coverage-summary.json`, and console coverage when enabled. Direct root commands write the equivalent combined outputs at the repository root. Reports are gitignored; future CI jobs can upload them as artifacts.

Coverage currently excludes declaration files and Zero's generated schema. A harness smoke test does **not** establish useful application coverage: uncovered query/mutator code is intentionally visible and thresholds are not yet enforced. Do not interpret the validators placeholder's high percentage as meaningful validation coverage.

### Turbo behavior

Unit tasks hash workspace files, the lockfile/dependency graph and both root Vitest configs. Upstream builds provide declaration exports; they do not start services. Declared report outputs are restored on cache hits. Use `pnpm test:unit --force` or `pnpm test:unit:coverage --force` for a fresh execution. Watch tasks are persistent and uncached. Database integration and E2E results must not be cached as unit tasks.

### Add a unit-test project

1. Declare `vitest: catalog:` in the workspace dev dependencies; add Node types if required.
2. Add a workspace config that merges the shared config, sets its root and unique package name, and defines needed aliases.
3. Add `test:unit`, `test:unit:watch`, and `test:unit:coverage` package scripts matching the existing projects.
4. Add tests under `tests/unit/` and a dedicated test tsconfig; include that tsconfig in the package's typecheck script.
5. Add the project path and source coverage glob to the root config. Document any justified exclusions.
6. Verify single-project tests, root tests, coverage, lint and typecheck. Do not add live service dependencies to unit tests.

## Database integration tests

The 23 retained Zero tenant-isolation tests use Node's test runner and `tsx`, not Vitest. They are deliberately excluded from unit discovery. See [the API integration-test instructions](apps/hono-api/tests/README.md) for the disposable `_test` database guard, schema setup, exact command and cleanup.

FITZ-32 adds automatic isolated-stack provisioning. FITZ-33 can adapt/reuse the existing isolation tests when adding broader Vitest/HTTP integration coverage.

## Browser tests and CI

Playwright setup and black-box journeys are planned under FITZ-34 through FITZ-36. Browser tests should use actual public UI/HTTP/WebSocket behavior and an isolated stack, not app internals or the developer database.

FITZ-37 and FITZ-38 add unit/coverage and integration/browser jobs to GitHub Actions. This infrastructure ticket does not yet enable new CI test jobs or required branch checks. FITZ-39 tracks that enforcement rollout.
