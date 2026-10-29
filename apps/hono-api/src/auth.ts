import { initAuth } from "@fitzindustries/auth";

import { env } from "~/env";

export const auth = initAuth({
  baseUrl: env.VITE_API_URL,
  secret: env.AUTH_SECRET,
  trustedOrigins: [env.WEB_APP_URL],
});
