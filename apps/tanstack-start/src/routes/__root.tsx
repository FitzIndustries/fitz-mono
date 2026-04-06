/// <reference types="vite/client" />
import type { QueryClient } from "@tanstack/react-query";
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";
import type * as React from "react";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import type { AppRouter } from "@fitzindustries/api";
import type { Zero } from "@fitzindustries/zero-shared/zero";
import { Toaster } from "@fitzindustries/ui/components/sonner";
import appCss from "@fitzindustries/ui/global.css?url";

import { env } from "~/env";
import { AppProviders } from "~/providers";

const zeroCacheURL = env.VITE_ZERO_CACHE_URL;

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  trpc: TRPCOptionsProxy<AppRouter>;
  zero: Zero;
}>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Support Platform",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "preconnect",
        href: zeroCacheURL,
      },
    ],
  }),
  pendingComponent: RootPending,
  errorComponent: RootError,
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <AppProviders>
        <Outlet />
        <Toaster />
      </AppProviders>
    </RootDocument>
  );
}

function RootPending() {
  return <div className="bg-background min-h-screen" />;
}

function RootError() {
  return (
    <div className="bg-background text-foreground flex min-h-screen items-center justify-center p-6">
      <p className="text-sm">Something went wrong while loading the app.</p>
    </div>
  );
}

function RootDocument({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground min-h-screen font-sans antialiased">
        {children}

        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}
