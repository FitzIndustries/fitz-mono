import { mustGetQuery } from "@rocicorp/zero";
import { handleQueryRequest } from "@rocicorp/zero/server";
import { createFileRoute } from "@tanstack/react-router";

import { queries, schema } from "@fitzindustries/zero-shared";

export const Route = createFileRoute("/api/zero/query")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const result = await handleQueryRequest(
          (name, args) => {
            const query = mustGetQuery(queries, name);
            return query.fn({ args, ctx: { userId: "anon" } });
          },
          schema,
          request,
        );

        return Response.json(result);
      },
    },
  },
});
