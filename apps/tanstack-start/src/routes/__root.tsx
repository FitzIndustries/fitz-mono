/// <reference types="vite/client" />
import type { QueryClient } from "@tanstack/react-query";
import type * as React from "react";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { z } from "zod/v4";

import appCss from "@fitzindustries/ui/global.css?url";

const rootSearchSchema = z.object({
  org: z.string().optional(),
});

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  validateSearch: rootSearchSchema,
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
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
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
        <Scripts />
      </body>
    </html>
  );
}
