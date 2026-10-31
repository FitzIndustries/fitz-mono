import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { Auth } from "@fitzindustries/auth";

import { env } from "~/env";

export const authClient = createAuthClient({
  baseURL: env.VITE_API_URL,
  plugins: [inferAdditionalFields<Auth>()],
});
