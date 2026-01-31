import {
  baseConfig,
  restrictEnvAccess,
} from "@fitzindustries/eslint-config/base";
import { nextjsConfig } from "@fitzindustries/eslint-config/nextjs";
import { reactConfig } from "@fitzindustries/eslint-config/react";
import { defineConfig } from "eslint/config";

export default defineConfig(
  {
    ignores: [".next/**"],
  },
  baseConfig,
  reactConfig,
  nextjsConfig,
  restrictEnvAccess,
);
