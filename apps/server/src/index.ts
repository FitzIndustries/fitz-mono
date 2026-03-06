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

import { auth } from "~/auth";
import { env } from "~/env";

const app = new Hono();

app.use(logger());
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  }),
);

app.get("/health", (c) => c.json({ status: "ok" }));

app.on(["GET", "POST"], "/api/auth/**", (c) => auth.handler(c.req.raw));

app.use(
  "/api/trpc/*",
  trpcServer({
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

app.post("/api/query", async (c) => {
  const result = await handleQueryRequest(
    (name, args) => {
      const query = mustGetQuery(queries, name);
      return query.fn({ args, ctx: { userId: "anon" } });
    },
    schema,
    c.req.raw,
  );

  return c.json(result);
});

app.post("/api/mutate", async (c) => {
  const result = await handleMutateRequest(
    dbProvider,
    (transact) =>
      transact((tx, name, args) => {
        const mutator = mustGetMutator(mutators, name);
        return mutator.fn({ args, tx, ctx: { userId: "anon" } });
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
