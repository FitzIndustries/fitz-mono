import { initAuth } from "@fitzindustries/auth";

import { env } from "~/env";

const getBaseUrl = () => {
  const port = env.PORT;
  return `http://localhost:${String(port)}`;
};

export const auth = initAuth({
  baseUrl: getBaseUrl(),
  secret: env.AUTH_SECRET,
});
