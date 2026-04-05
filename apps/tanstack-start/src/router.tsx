import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import SuperJSON from "superjson";

import type { AppRouter } from "@fitzindustries/api";
import type { Zero } from "@fitzindustries/zero-shared/zero";

import { makeTRPCClient, TRPCProvider } from "~/lib/trpc";
import { routeTree } from "./routeTree.gen";

export interface RouterContext {
  queryClient: QueryClient;
  trpc: TRPCOptionsProxy<AppRouter>;
  zero: Zero;
}

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      dehydrate: { serializeData: SuperJSON.serialize },
      hydrate: { deserializeData: SuperJSON.deserialize },
    },
  });
  const trpcClient = makeTRPCClient();
  const trpc = createTRPCOptionsProxy({
    client: trpcClient,
    queryClient,
  });

  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    // It is fine to call Zero multiple times for same query, Zero dedupes the
    // queries internally.
    defaultPreloadStaleTime: 0,
    // We don't want TanStack skipping any calls to us. We want to be asked to
    // preload every link. This is fine because Zero has its own internal
    // deduping and caching.
    defaultPreloadGcTime: 0,
    context: {
      queryClient,
      trpc,
      zero: undefined as unknown as Zero,
    } satisfies RouterContext,
    Wrap: (props) => (
      <TRPCProvider
        trpcClient={trpcClient}
        queryClient={queryClient}
        {...props}
      />
    ),
  });
  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
