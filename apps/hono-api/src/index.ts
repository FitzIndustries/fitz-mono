import { serve } from "@hono/node-server";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { appRouter, createTRPCContext } from "@fitzindustries/api";
import {
  mutators,
  queries,
  schema,
  ZERO_ORGANIZATION_HEADER,
} from "@fitzindustries/zero-shared";
import {
  handleMutateRequest,
  handleQueryRequest,
} from "@fitzindustries/zero-shared/server";
import { mustGetMutator, mustGetQuery } from "@fitzindustries/zero-shared/zero";

import { env } from "~/env";
import { auth } from "./auth";
import { getViewerStateFromRequest } from "./lib/viewer";
import { dbProvider } from "./lib/zero-db";
import { handleEmailWebhook } from "./webhooks/email";
import { handleWhatsAppWebhook } from "./webhooks/whatsapp";

const app = new Hono();

app.use(logger());
app.use(
  "/api/*",
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://yoda0ne.exe.xyz:3000",
    ],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "trpc-accept",
      "x-trpc-source",
      "Cookie",
      ZERO_ORGANIZATION_HEADER,
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
        appUrl: env.WEB_APP_URL,
        auth,
        encryptionKey: env.ENCRYPTION_KEY,
        headers: c.req.raw.headers,
        platformEmailFrom: env.PLATFORM_EMAIL_FROM,
        resendApiKey: env.RESEND_API_KEY,
      }),
    onError: ({ error, path }) => {
      console.error(`>>> tRPC Error on '${path}'`, error);
    },
  }),
);

app.post("/api/zero/query", async (c) => {
  const ctx = await getZeroContext(c.req.raw);

  if (!ctx) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const result = await handleQueryRequest({
    handler: (name, args) => {
      const query = mustGetQuery(queries, name);
      return query.fn({ args, ctx });
    },
    schema,
    request: c.req.raw,
    userID: ctx.userId,
  });

  return c.json(result);
});

app.post("/api/zero/mutate", async (c) => {
  const ctx = await getZeroContext(c.req.raw);

  if (!ctx) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const result = await handleMutateRequest({
    dbProvider,
    handler: (transact) =>
      transact((tx, name, args) => {
        const mutator = mustGetMutator(mutators, name);
        return mutator.fn({ args, tx, ctx });
      }),
    request: c.req.raw,
    userID: ctx.userId,
  });

  return c.json(result);
});

const port = env.PORT;

console.log(`Starting API server on port ${String(port)}`);

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API server running at http://localhost:${String(info.port)}`);
});

let isShuttingDown = false;

function shutDown(signal: NodeJS.Signals) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`Received ${signal}; shutting down API server`);

  server.close((error) => {
    if (error) {
      console.error("Failed to shut down API server", error);
      process.exit(1);
    }

    console.log("API server shut down");
    process.exit(0);
  });
}

process.once("SIGINT", shutDown);
process.once("SIGTERM", shutDown);

async function getZeroContext(request: Request) {
  const requestedOrganizationId = request.headers.get(ZERO_ORGANIZATION_HEADER);
  const state = await getViewerStateFromRequest(
    request,
    requestedOrganizationId ?? undefined,
  );

  if (
    !state?.viewer.currentOrganizationId ||
    (requestedOrganizationId !== null &&
      state.viewer.currentOrganizationId !== requestedOrganizationId)
  ) {
    return undefined;
  }

  return {
    userId: state.session.user.id,
    organizationId: state.viewer.currentOrganizationId,
    membershipId: state.viewer.currentMembershipId,
  };
}
