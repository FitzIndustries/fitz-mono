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
    ENCRYPTION_KEY: z.string().length(64),
    RESEND_API_KEY: z.string().optional(),
    RESEND_WEBHOOK_SECRET: z.string().optional(),
  },
  runtimeEnv: process.env,
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
