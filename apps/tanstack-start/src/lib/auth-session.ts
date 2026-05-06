import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import type { Session } from "@fitzindustries/auth";

import { authClient } from "~/auth/client";
import { env } from "~/env";

export const getAuthSession = createIsomorphicFn()
  .server(async () => {
    const requestHeaders = new Headers(getRequestHeaders());
    const cookie = requestHeaders.get("cookie");

    if (!cookie) {
      return null;
    }

    const response = await fetch(`${env.VITE_API_URL}/api/auth/get-session`, {
      headers: { cookie },
    });

    if (!response.ok) {
      return null;
    }

    return response.json() as Promise<Session | null>;
  })
  .client(async () => {
    const session = await authClient.getSession();

    return session.data;
  });
