# Disposable integration stack (FITZ-32)

This is stack infrastructure, not a test suite or a CI job. It uses the existing
**development** runtime, one worker, the committed Drizzle schema and deterministic
two-tenant fixtures. It does not depend on FITZ-29 or production packaging.

## Prerequisites and one command

Linux, Python 3, Git, and a running local Docker Engine with Compose v2 supporting
`up --wait`. The current user must have access to `/var/run/docker.sock`. The first
build needs network access to Docker Hub and the public npm registry, disk space
for workspace dependencies and enough RAM for Vite and Zero. No host Node/pnpm,
Postgres, application `.env`, GitHub/Linear credentials or external secrets are
needed by this command.

From the repository root:

```sh
python3 scripts/integration/stack.py run
```

This builds a source snapshot, starts disposable Postgres, applies Drizzle via
`drizzle-kit push --force`, inserts fixtures, starts Hono, TanStack Start/Vite and
Zero Cache, waits for real readiness, records evidence, and **tears down**. A
nonzero exit means setup/readiness/cleanup failed. The same command is suitable
for a fresh Linux CI runner with the prerequisites above; no CI job is added here.
Node comes from `.nvmrc` (currently `v24.19.0`) and pnpm from the root
`packageManager` (`pnpm@10.19.0`); dependencies use the frozen lockfile. Build
scripts run inside the image, not against the host checkout.

To run a future integration command while the stack is ready:

```sh
python3 scripts/integration/stack.py run -- pnpm --filter @fitzindustries/hono-api test:tenant-queries
```

The existing Node tenant-query test is independent of fixture setup; no Vitest or
Playwright infrastructure is introduced. Commands execute inside the runtime
container with the isolated `TEST_POSTGRES_URL`. Keep consumers serial:
`TEST_WORKERS=1`; Zero also has one sync worker. No parallel test-worker safety is
claimed.

For interactive local development of tests, keep the supervisor in the foreground:

```sh
python3 scripts/integration/stack.py serve
# Ctrl-C / SIGTERM: logs captured, containers/network/volumes removed.
```

Default **host loopback only** ports:

| Service  | Host address                | Container port |
| -------- | --------------------------- | -------------- |
| Postgres | `127.0.0.1:45432`           | 5432           |
| Hono     | `127.0.0.1:43100/health`    | 3100           |
| Web      | `127.0.0.1:43000/`          | 3000           |
| Zero     | `127.0.0.1:44848/keepalive` | 4848           |

For an independent concurrent run, add `--port-offset 10` **before** `--`.
Vite's internal `/api` proxy continues to use Hono on 3100. Browser-facing URLs
use the dedicated host ports; the Zero query/mutation callbacks use container
loopback and **exact matching allowlists**, not a wildcard or allowlist bypass.
With pinned Zero 1.11.3, `ZERO_QUERY_URL` and `ZERO_MUTATE_URL` themselves
are URLPattern allowlists; the singleton exact URLs above are the supported
controls (there are no `*_URL_ALLOWED` settings). This was checked against the
installed package configuration source.
This is a local test environment, not an exe.dev/public deployment configuration.

## Isolation and safety

- Unique project `fitz_test_<12 hex digits>`; no fixed container names. Project
  volumes hold Postgres and Zero SQLite/sidecars. Zero uses the project-specific
  app ID (and consequently replication metadata namespace/slot), app DB
  `fitz_app_test`, and separate metadata DB `fitz_zero_test` for CVR/change state.
- The runtime has no host mounts and no inherited application environment. Only
  tracked source files and explicitly listed FITZ-32 files enter the build context;
  `.env*`, `.npmrc`, `.netrc`, private key files and `.git` are excluded. Docker uses an empty per-stack CLI configuration, not personal registry auth. No auth
  directory or developer database is copied, queried or reset.
- Fixed test-only DB credentials and auth/encryption placeholders are not personal
  secrets. No Resend key, channel credentials or production account is configured.
  The **internal Docker network blocks external egress** for both services, so
  email/webhook/provider calls cannot reach real destinations even if attempted.
  External integrations are intentionally unavailable to tests; use local sinks in
  future work rather than supplying real credentials.
- Shell `POSTGRES_URL`, `TEST_POSTGRES_URL` and `ZERO_*` variables are rejected,
  not silently accepted. App/metadata URLs, safe DB names, Zero app ID, loopback
  bindings and project-owned volume/network names are checked before startup and
  before cleanup. Fixture code independently validates the exact test DB targets.
  There is no truncate/reset command; every run gets a fresh volume.
- Never use `pnpm reset-db`, `destroy-db`, or the developer Compose file for this
  stack. Do not edit generated Compose/evidence state or supply personal secrets.

## Deadlines, failure, cancellation and stop

Startup has a 180-second readiness deadline (override `--timeout 1..600`), plus
at most 30 seconds for the Compose CLI to return. Postgres uses TCP `pg_isready -h 127.0.0.1` (not the temporary bootstrap socket);
container health requires HTTP 200 from **all** Hono `/health` (including JSON
status), web `/login` (the public page; `/` redirects unauthenticated users) and Zero `/keepalive`, with per-request deadlines. Readiness is
polled by Docker health checks, never inferred from fixed sleeps. Schema/fixture
failures and application exits fail startup. Image build/install has a separate
1200-second deadline; command execution has a 600-second deadline.

On success, failure, SIGINT or SIGTERM, the supervisor saves logs then runs bounded
project-scoped teardown and checks for leaked project containers, volumes and
networks. Graceful shutdown is followed by Docker's forced stop deadline.

Exercise the failure path:

```sh
python3 scripts/integration/stack.py run --fail-start --timeout 20
# Expected: nonzero, preserved logs, no remaining project resources.
```

If the supervisor is killed with SIGKILL, the host reboots, or Docker itself is
unavailable, automatic teardown cannot be guaranteed. Use the **printed run ID**
after Docker recovers:

```sh
python3 scripts/integration/stack.py stop --id fitz_test_012345abcdef
```

The stop command only accepts this stack's run IDs and validates the saved
configuration before removing resources. It never accepts a database URL. Retrying
stop is safe. Cleanup also removes only this run's unique runtime image tag, to
avoid accumulating multi-gigabyte images across source changes. Base images and
BuildKit dependency caches may remain; the command never performs a global prune.

## Fixtures and evidence

`apps/hono-api/tests/integration-fixtures.ts` seeds two organizations with users,
owner memberships, customers, email conversations and inbound messages, in one
transaction. Tenant IDs are `00000000-0000-4000-8000-000000000001` and
`00000000-0000-4000-8000-000000000002`; slugs are `fitz-test-a` and `fitz-test-b`;
users have `a@example.invalid` / `b@example.invalid`. Explicit timestamps are
`2026-01-01T00:00:00Z`. There are no authenticated sessions or outbound channels.
Fixtures are not assertions and fail on reuse rather than resetting a database.

Ignored, private `.cache/integration/<run-id>/` preserves sanitized build,
configuration, startup, HTTP health, fixture, optional command, service, resource
and teardown logs even on startup failure. Database URL passwords and common
credential-like log fields are redacted before writing. A killed build can leave
its credential-free source snapshot in that run directory. Capture this directory
as private CI evidence if needed, not as a public artifact. Do not put personal
secrets in tests or logs; sanitization is defense in depth, not a secret scanner.

## Implementation verification (this VM)

Base: `80039b2808845e31dd1445e7bcda8a4434072281`; branch:
`feat/fitz-32-isolated-test-stack`. All changes are uncommitted. No other VM or
FITZ-29 work was used. Application/developer configuration files are unchanged.

Commands and observed outcomes:

```sh
python3 scripts/integration/stack.py run --port-offset 10 -- pnpm --filter @fitzindustries/hono-api test:tenant-queries
# PASS: Postgres + three HTTP health checks, deterministic fixtures, 23/23 existing
# tenant-query checks, normal teardown. Run fitz_test_93270257425e.

python3 scripts/integration/stack.py run -- node --input-type=module -e 'try { await fetch("https://example.com", {signal: AbortSignal.timeout(2000)}); throw new Error("External egress unexpectedly reachable"); } catch (error) { if (error.message === "External egress unexpectedly reachable") throw error; console.log("External egress blocked"); }'
# PASS: second fresh startup on default ports, real readiness, blocked external
# egress, normal teardown. Run fitz_test_caa93b7ad741.

python3 scripts/integration/stack.py run --port-offset 20 --fail-start --timeout 20
# Expected exit 1: intentional setup failure; logs preserved; no leaks.
# Run fitz_test_e118b3861e7b.

python3 scripts/integration/stack.py run --port-offset 20 --timeout 1
# Expected exit 1: bounded readiness deadline; logs preserved; no leaks.
# Run fitz_test_3e89a0b70a42. Build time is separate from readiness time.

python3 scripts/integration/stack.py serve --port-offset 20
# Sent SIGTERM after READY; expected exit 1, logs preserved, no leaks.
# Run fitz_test_a635400945dd. SIGINT uses the same handler but wasn't separately exercised.
```

The following ran inside the pinned development image (not the VM's Node), with
only these new test sources mounted for the targeted Hono checks. The broader
build used the source-only image and fixed test environment values, with no network:

```sh
node --test scripts/integration/safety.test.mjs
# PASS: exact test DB accepted; absent/developer/remote/alternate-role/parameterized targets rejected.
pnpm --filter @fitzindustries/hono-api lint
pnpm --filter @fitzindustries/hono-api format
pnpm --filter @fitzindustries/hono-api typecheck
pnpm --filter @fitzindustries/hono-api build
# All PASS.
pnpm exec turbo run lint typecheck build --filter=@fitzindustries/tanstack-start... --filter=@fitzindustries/zero-cache
# PASS: 27/27 tasks. Workspace validation (pnpm lint:ws) also passed during image installation.
```

Evidence: `.cache/integration/<run-id>/` and
`.cache/integration/verification/` (including the lifecycle driver and checker
output). Final inspection found zero containers, zero volumes, and only Docker's
three default networks. Per-run images are now removed during teardown; base images
and BuildKit caches may remain. Python
syntax/Ruff checks, log-redaction examples and `git diff --check` passed.

**Limitations:** no actual GitHub runner was used, and no authenticated browser
Zero query/mutation flow or external-provider integration was exercised. The pinned
Zero development package logs a COPY-driver compatibility warning and a transient
`_zero.tableMetadata` replication-status warning during initial sync; readiness
and the existing tenant tests still passed. These warnings are preserved, not
hidden or "fixed" by upgrading dependencies (normal compatibility work belongs to
FITZ-18). Production packaging, test suites and CI jobs remain out of scope.
SIGKILL/OOM, Docker loss or corrupted saved configuration require manual recovery;
cleanup deliberately refuses a saved configuration that no longer passes safety
validation. The supervisor currently buffers each command's output in memory;
very noisy future test commands should use bounded output.

A final rebuild exhausted this 25 GiB VM after repeated source-changing verification
builds had retained unique runtime images. The failure reported unavailable evidence
storage and still removed its test containers/volumes/network. Only this ticket's
explicitly named generated images were reclaimed (no global prune or VM resize).
Cleanup now removes its validated per-run image tag as well; it never force-removes
an image or touches unrelated Docker resources. Disk-full evidence is preserved in
`.cache/integration/verification/disk-full.log` for run `fitz_test_86ab9927aeab`;
its build log could not be saved. This is not counted as a passing startup.

Final repeat with TCP Postgres readiness and per-run image cleanup: `python3 scripts/integration/stack.py run` passed (run `fitz_test_5586eaf65d5e`). All three HTTP checks and fixture inspection passed; cleanup removed the runtime image tag as well as containers, volumes and network.
