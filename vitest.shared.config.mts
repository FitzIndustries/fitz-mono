import { defineConfig } from "vitest/config";

// Node-only unit tests. Database integration and browser suites deliberately
// have different commands and are not discovered by these projects.
export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["tests/unit/**/*.test.ts"],
    passWithNoTests: false,
    reporters: ["default", "junit"],
    outputFile: {
      junit: "test-results/unit.xml",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      reportsDirectory: "coverage",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/schema.ts"],
    },
  },
});
