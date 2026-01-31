import { defineConfig } from "eslint/config";

import { baseConfig } from "@fitzindustries/eslint-config/base";
import { reactConfig } from "@fitzindustries/eslint-config/react";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
  reactConfig,
);
