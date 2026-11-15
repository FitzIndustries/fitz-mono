import { spawn } from "node:child_process";

import { assertTestEnvironment } from "../../apps/hono-api/tests/integration-safety.mjs";

assertTestEnvironment();
const children = new Set();
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  // Docker's init reaps descendants; container teardown kills any stragglers.
  setTimeout(() => process.exit(code), 3000).unref();
  process.exitCode = code;
}
process.on("SIGTERM", () => stop(143));
process.on("SIGINT", () => stop(130));
function start(cwd, args) {
  const child = spawn("pnpm", args, {
    cwd,
    stdio: "inherit",
    env: process.env,
  });
  children.add(child);
  child.on("error", () => stop(1));
  child.on("exit", (code) => {
    children.delete(child);
    if (!stopping) stop(code || 1);
  });
  return child;
}
async function setup(cwd, args) {
  const child = spawn("pnpm", args, {
    cwd,
    stdio: "inherit",
    env: process.env,
  });
  children.add(child);
  const code = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", resolve);
  });
  children.delete(child);
  if (code !== 0 || stopping) throw new Error("Test database setup failed");
}
try {
  // Direct exec deliberately bypasses all dotenv/developer DB scripts.
  await setup("packages/db", ["exec", "drizzle-kit", "push", "--force"]);
  await setup("apps/hono-api", [
    "exec",
    "tsx",
    "tests/integration-fixtures.ts",
  ]);
  if (process.env.FITZ_TEST_FAIL_START === "1") {
    throw new Error("Intentional startup failure for cleanup verification");
  }
  start("apps/hono-api", ["exec", "tsx", "src/index.ts"]);
  start("apps/tanstack-start", ["exec", "vite", "dev", "--host", "0.0.0.0"]);
  start("apps/zero-cache", ["exec", "zero-cache"]);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Startup failed");
  stop(1);
}
