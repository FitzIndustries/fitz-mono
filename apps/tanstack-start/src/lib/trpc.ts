import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import {
  createTRPCClient,
  httpBatchStreamLink,
  loggerLink,
} from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import SuperJSON from "superjson";

import type { AppRouter } from "@fitzindustries/api";

import { env } from "~/env";

export const makeTRPCClient = createIsomorphicFn()
  .server(() => {
    return createTRPCClient<AppRouter>({
      links: [
        httpBatchStreamLink({
          transformer: SuperJSON,
          url: env.API_INTERNAL_URL + "/api/trpc",
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: "include",
            });
          },
          headers() {
            const headers = new Headers(getRequestHeaders());
            headers.set("x-trpc-source", "tanstack-start-server");
            return headers;
          },
        }),
      ],
    });
  })
  .client(() => {
    return createTRPCClient<AppRouter>({
      links: [
        loggerLink({
          enabled: (op) =>
            env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        httpBatchStreamLink({
          transformer: SuperJSON,
          url: env.VITE_API_URL + "/api/trpc",
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: "include",
            });
          },
          headers() {
            const headers = new Headers();
            headers.set("x-trpc-source", "tanstack-start-client");
            return headers;
          },
        }),
      ],
    });
  });

export const { useTRPC, TRPCProvider } = createTRPCContext<AppRouter>();
