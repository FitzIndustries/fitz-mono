import { defineConfig, mergeConfig } from "vitest/config";

import shared from "../../vitest.shared.config.mts";

export default mergeConfig(
  shared,
  defineConfig({
    root: import.meta.dirname,
    resolve: {
      alias: { "~": new URL("./src", import.meta.url).pathname },
    },
    test: {
      name: "@fitzindustries/validators",
    },
  }),
);
