import assert from "node:assert/strict";
import { test } from "node:test";

import { assertTestDatabase } from "../../apps/hono-api/tests/integration-safety.mjs";

test("only exact isolated test database targets are accepted", () => {
  const safe =
    "postgres://fitz_test:disposable-test-only@postgres:5432/fitz_app_test";
  assert.doesNotThrow(() => assertTestDatabase(safe, "fitz_app_test"));
  for (const unsafe of [
    undefined,
    "postgres://postgres:password@localhost:5432/postgres",
    safe.replace("fitz_app_test", "developer"),
    safe.replace("@postgres:", "@production.example:"),
    safe.replace("fitz_test:", "postgres:"),
    `${safe}?host=production.example`,
    `${safe}#ignored`,
  ]) {
    assert.throws(() => assertTestDatabase(unsafe, "fitz_app_test"));
  }
});
