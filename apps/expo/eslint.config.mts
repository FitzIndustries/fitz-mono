import { baseConfig } from "@fitzindustries/eslint-config/base";
import { reactConfig } from "@fitzindustries/eslint-config/react";
import { defineConfig } from "eslint/config";

export default defineConfig(
  {
    ignores: [".expo/**", "expo-plugins/**"],
  },
  baseConfig,
  reactConfig,
);
