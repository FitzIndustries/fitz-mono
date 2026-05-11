import { serve } from "@hono/node-server";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { appRouter, createTRPCContext } from "@fitzindustries/api";
import { dbProvider } from "@fitzindustries/db/client";
import { mutators, queries, schema } from "@fitzindustries/zero-shared";
import {
  handleMutateRequest,
  handleQueryRequest,
} from "@fitzindustries/zero-shared/server";
import { mustGetMutator, mustGetQuery } from "@fitzindustries/zero-shared/zero";

import { env } from "~/env";
import { auth } from "./auth";
import { getViewerStateFromRequest } from "./lib/viewer";
import { handleEmailWebhook } from "./webhooks/email";
import { handleWhatsAppWebhook } from "./webhooks/whatsapp";

const app = new Hono();

app.use(logger());
app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "trpc-accept",
      "x-trpc-source",
      "Cookie",
    ],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);

app.get("/health", (c) => c.json({ status: "ok" }));

app.on(["GET", "POST"], "/api/auth/**", (c) => auth.handler(c.req.raw));
app.get("/api/webhooks/whatsapp", handleWhatsAppWebhook);
app.post("/api/webhooks/whatsapp", handleWhatsAppWebhook);
app.post("/api/webhooks/email", handleEmailWebhook);

app.use(
  "/api/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext: (_opts, c) =>
      createTRPCContext({
        auth,
        headers: c.req.raw.headers,
      }),
    onError: ({ error, path }) => {
      console.error(`>>> tRPC Error on '${path}'`, error);
    },
  }),
);

app.post("/api/zero/query", async (c) => {
  const ctx = await getZeroContext(c.req.raw);

  const result = await handleQueryRequest(
    (name, args) => {
      const query = mustGetQuery(queries, name);
      return query.fn({ args, ctx });
    },
    schema,
    c.req.raw,
  );

  return c.json(result);
});

app.post("/api/zero/mutate", async (c) => {
  const ctx = await getZeroContext(c.req.raw);

  if (!ctx) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const result = await handleMutateRequest(
    dbProvider,
    (transact) =>
      transact((tx, name, args) => {
        const mutator = mustGetMutator(mutators, name);
        return mutator.fn({ args, tx, ctx });
      }),
    c.req.raw,
  );

  return c.json(result);
});

const port = env.PORT;

console.log(`Starting API server on port ${String(port)}`);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API server running at http://localhost:${String(info.port)}`);
});

async function getZeroContext(request: Request) {
  const state = await getViewerStateFromRequest(request);

  if (!state?.viewer.currentOrganizationId) {
    return undefined;
  }

  return {
    userId: state.session.user.id,
    organizationId: state.viewer.currentOrganizationId,
    membershipId: state.viewer.currentMembershipId,
  };
}
