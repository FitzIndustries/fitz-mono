import { mustGetQuery } from "@rocicorp/zero";
import { handleQueryRequest } from "@rocicorp/zero/server";
import { createFileRoute } from "@tanstack/react-router";

import { queries, schema } from "@fitzindustries/zero-shared";

import { auth } from "~/auth/server";

export const Route = createFileRoute("/api/zero/query")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await auth.api.getSession(request);
        const ctx = session ? { userId: session.user.id } : undefined;

        const result = await handleQueryRequest(
          (name, args) => {
            const query = mustGetQuery(queries, name);
            return query.fn({ args, ctx });
          },
          schema,
          request,
        );

        return Response.json(result);
      },
    },
  },
});
