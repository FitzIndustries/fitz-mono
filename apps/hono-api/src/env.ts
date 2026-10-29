import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";

import { authEnv } from "@fitzindustries/auth/env";

export const env = createEnv({
  extends: [authEnv()],
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    POSTGRES_URL: z.url(),
    PORT: z.coerce.number().default(3100),
    VITE_API_URL: z.url().default("http://localhost:3100"),
    WEB_APP_URL: z.url().default("http://localhost:3000"),
    ENCRYPTION_KEY: z.string().length(64),
    PLATFORM_EMAIL_FROM: z.string().min(1).optional(),
    RESEND_API_KEY: z.string().optional(),
    RESEND_WEBHOOK_SECRET: z.string().optional(),
  },
  runtimeEnv: process.env,
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
