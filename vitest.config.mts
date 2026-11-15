import { defineConfig, mergeConfig } from "vitest/config";

import shared from "./vitest.shared.config.mts";

export default mergeConfig(
  shared,
  defineConfig({
    root: import.meta.dirname,
    test: {
      projects: [
        "packages/validators/vitest.config.ts",
        "packages/zero-shared/vitest.config.ts",
      ],
      coverage: {
        include: [
          "packages/validators/src/**/*.ts",
          "packages/zero-shared/src/**/*.ts",
        ],
        exclude: ["**/*.d.ts", "packages/zero-shared/src/schema.ts"],
      },
    },
  }),
);
