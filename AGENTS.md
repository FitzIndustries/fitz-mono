# AGENTS.md

## Purpose

- This repo is a `pnpm` + Turborepo TypeScript monorepo.
- Workspaces live in `apps/*`, `packages/*`, and `tooling/*`.
- Use this file as the default guide for coding agents in this repository.

## Stack

- TypeScript with strict compiler settings.
- Node `^24.12.0` and `pnpm@10.19.0`.
- TanStack Start web app, Hono API, Expo mobile app.
- tRPC, Drizzle ORM, Postgres, Zod v4.
- Prettier for formatting and ESLint flat config for linting.

## Workspace Map

- `apps/tanstack-start`: web app.
- `apps/hono-api`: API server.
- `apps/expo`: mobile app.
- `apps/zero-cache`: Zero cache dev tooling.
- `packages/api`: shared tRPC router/context.
- `packages/auth`: auth utilities and env helpers.
- `packages/db`: schema, DB client, DB scripts.
- `packages/ui`: shared UI components/theme.
- `packages/zero-shared`: Zero schema, queries, mutators, React helpers.
- `packages/validators`: shared Zod validators.
- `tooling/eslint`, `tooling/prettier`, `tooling/typescript`: shared config.

## Root Commands

- Install: `pnpm install`
- Dev all: `pnpm dev`
- Build all: `pnpm build`
- Lint all: `pnpm lint`
- Lint fix: `pnpm lint:fix`
- Format check: `pnpm format`
- Format write: `pnpm format:fix`
- Typecheck all: `pnpm typecheck`
- Clean workspace outputs: `pnpm clean:workspaces`
- Start DB: `pnpm start-db`
- Stop DB: `pnpm stop-db`

## Targeted Commands

- Run one workspace script: `pnpm --filter <workspace> <script>`
- Web dev: `pnpm --filter @fitzindustries/tanstack-start dev`
- API dev: `pnpm --filter @fitzindustries/hono-api dev`
- Expo dev: `pnpm --filter @fitzindustries/expo dev`
- Build one workspace: `pnpm --filter <workspace> build`
- Lint one workspace: `pnpm --filter <workspace> lint`
- Format one workspace: `pnpm --filter <workspace> format`
- Typecheck one workspace: `pnpm --filter <workspace> typecheck`

## Useful Package Scripts

- `@fitzindustries/tanstack-start`: `dev`, `build`, `start`, `preview`, `lint`, `format`, `typecheck`
- `@fitzindustries/hono-api`: `dev`, `build`, `start`, `lint`, `format`, `typecheck`
- `@fitzindustries/expo`: `dev`, `dev:android`, `dev:ios`, `android`, `ios`, `lint`, `format`, `typecheck`
- `@fitzindustries/db`: `build`, `dev`, `lint`, `format`, `typecheck`, `push`, `studio`, `start-db`, `stop-db`, `generate`
- `@fitzindustries/api`, `@fitzindustries/zero-shared`, `@fitzindustries/validators`: `build`, `dev`, `lint`, `format`, `typecheck`
- `@fitzindustries/auth`: `lint`, `format`, `typecheck`, `generate`
- `@fitzindustries/ui`: `lint`, `format`, `typecheck`, `ui-add`
- `@fitzindustries/zero-cache`: `dev`, `zero-cache-dev`, `lint`, `format`

## Tests

- There is no root `test` script.
- There are no committed `*.test.*` or `*.spec.*` files.
- There is no committed Vitest, Jest, or Playwright config.
- Do not report tests as passing unless you added a test runner and actually ran it.

## Single-Test Guidance

- There is no canonical single-test command today because no test harness is configured.
- Before suggesting test commands, inspect the target workspace `package.json`.
- If you add a test runner, prefer `pnpm --filter <workspace> <test command>` and document the exact single-test command in the same change.

## DB And Env Commands

- Generate Zero schema from Drizzle: `pnpm db:generate`
- Push Drizzle schema: `pnpm db:push`
- Open Drizzle Studio: `pnpm db:studio`
- `packages/db`, web, and API scripts commonly load `.env` via `dotenv -e ../../.env --`.

## Cursor And Copilot Rules

- No `.cursorrules` file was found.
- No `.cursor/rules/` directory was found.
- No `.github/copilot-instructions.md` file was found.
- If any of those files are added later, follow the most specific rule for the subtree you are editing and update this file if needed.

## Required Agent Workflow

- Read the nearest `package.json`, `eslint.config.*`, and relevant source files before editing.
- Prefer targeted workspace commands over full-repo commands.
- Run `lint` and `typecheck` for touched workspaces before finishing.
- Run `build` for touched buildable packages when the change affects runtime or packaging.
- Avoid modifying generated files unless the source change requires regeneration.

## Formatting

- Prettier is the formatting authority.
- Imports are sorted by `@ianvs/prettier-plugin-sort-imports`.
- Tailwind classes are sorted by `prettier-plugin-tailwindcss`.
- Do not preserve manual import ordering that conflicts with the formatter.
- Keep files Prettier-clean rather than hand-aligned.

## Import Rules

- Use `import type` for type-only imports.
- Keep type imports separate; ESLint prefers separate type imports.
- Import order is: types, React/React Native, Next, Expo, third-party, blank line, `@fitzindustries/*`, blank line, `~/...`, parent, same-folder.
- Prefer workspace package imports over deep relative imports across packages.
- In web app code, prefer the local `~/...` alias for app-internal modules.

## TypeScript Rules

- The shared TS config enables `strict`, `noUncheckedIndexedAccess`, `isolatedModules`, and `checkJs`.
- Prefer narrowing over assertions.
- Non-null assertions are forbidden.
- Unused vars are errors unless prefixed with `_`.
- Prefer `unknown` for untrusted inputs and validate immediately.
- Use `satisfies` to preserve narrow object inference when appropriate.
- Add explicit types when they improve clarity at boundaries; otherwise lean on inference.

## Env Access

- Do not access `process.env` directly in app code.
- Use the validated `env` object from the local `~/env` module.
- Direct `process.env` access is restricted by shared ESLint rules outside env-definition files.

## Validation And Error Handling

- Validate request bodies and other external input with Zod.
- Common server pattern: parse JSON to `unknown`, then `safeParse`.
- For invalid input, return structured `4xx` responses instead of throwing raw errors.
- For impossible hook/context states, throwing is acceptable and already used in the repo.
- In UI async flows, catch failures and present safe user-facing errors.
- Keep `console.error` messages specific when logging unexpected failures.

## Naming

- Components: PascalCase.
- Hooks: `useX`.
- Route files export `Route` from `createFileRoute(...)`.
- Functions, variables, and helpers: camelCase.
- Drizzle tables/exported schema objects are singular camelCase nouns like `organization`, `message`, and `ticket`.
- Prefer descriptive names over short abbreviations unless the abbreviation is already a domain term.

## React, UI, And Server Conventions

- Prefer function components and keep state close to usage.
- Avoid one-off abstractions unless they remove real duplication.
- Reuse `@fitzindustries/ui` components before adding app-local primitives.
- Use the shared `cn(...)` helper for class composition.
- Hono handlers usually validate auth early and return `401` when missing.
- Keep handler responses JSON-shaped and predictable.
- Use shared package exports from `@fitzindustries/api`, `@fitzindustries/db`, and `@fitzindustries/zero-shared` instead of reimplementing logic locally.

## Database Conventions

- Drizzle schema is the source of truth.
- Match existing timestamp, index, and constraint patterns when adding tables/columns.
- Keep schema naming consistent with existing singular exports.
- Regenerate dependent artifacts when schema changes require it.

## Change Scope

- Make the smallest correct change.
- Match the style already present in the touched file.
- Do not add wrappers, helpers, or compatibility layers without a concrete need.

## Verification Checklist

- `pnpm --filter <touched-workspace> lint`
- `pnpm --filter <touched-workspace> typecheck`
- `pnpm --filter <touched-workspace> build` when relevant
- Run generation commands for DB/auth/schema changes when required
- If you add tests, document and run the exact test command
