import { tanstackStartCookies } from "better-auth/tanstack-start";

import { initAuth } from "@fitzindustries/auth";

import { env } from "~/env";
import { getBaseUrl } from "~/lib/url";

export const auth = initAuth({
  baseUrl: getBaseUrl(),
  secret: env.AUTH_SECRET,

  extraPlugins: [tanstackStartCookies()],
});
