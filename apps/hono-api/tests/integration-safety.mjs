// No caller-supplied connection strings: all destructive state belongs to Compose.
/** @param {string | undefined} value @param {string} database */
export function assertTestDatabase(value, database) {
  const url = new URL(value ?? "invalid:");
  if (
    url.protocol !== "postgres:" ||
    url.hostname !== "postgres" ||
    url.port !== "5432" ||
    url.username !== "fitz_test" ||
    url.password !== "disposable-test-only" ||
    url.pathname !== `/${database}` ||
    !database.endsWith("_test") ||
    url.search ||
    url.hash
  ) {
    throw new Error("Refusing non-isolated test database target");
  }
}

export function assertTestEnvironment() {
  for (const key of ["POSTGRES_URL", "TEST_POSTGRES_URL", "ZERO_UPSTREAM_DB"]) {
    assertTestDatabase(process.env[key], "fitz_app_test");
  }
  for (const key of ["ZERO_CVR_DB", "ZERO_CHANGE_DB"]) {
    assertTestDatabase(process.env[key], "fitz_zero_test");
  }
  if (!/^fitz_test_[0-9a-f]{12}$/.test(process.env.ZERO_APP_ID ?? "")) {
    throw new Error("Refusing non-test Zero app ID");
  }
}
