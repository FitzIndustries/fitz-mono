// src/routes/api/mutate.ts
import { mustGetMutator } from "@rocicorp/zero";
import { handleMutateRequest } from "@rocicorp/zero/server";
import { createFileRoute } from "@tanstack/react-router";

import { dbProvider } from "@fitzindustries/db/client";
import { mutators } from "@fitzindustries/zero-shared";

export const Route = createFileRoute("/api/mutate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const result = await handleMutateRequest(
          dbProvider,
          (transact) =>
            transact((tx, name, args) => {
              const mutator = mustGetMutator(mutators, name);
              return mutator.fn({
                args,
                tx,
                ctx: { userId: "anon" },
              });
            }),
          request,
        );

        return Response.json(result);
      },
    },
  },
});
