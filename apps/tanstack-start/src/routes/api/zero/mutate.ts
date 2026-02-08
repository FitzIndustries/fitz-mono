import { mustGetMutator } from "@rocicorp/zero";
import { handleMutateRequest } from "@rocicorp/zero/server";
import { createFileRoute } from "@tanstack/react-router";

import { dbProvider } from "@fitzindustries/db/client";
import { mutators } from "@fitzindustries/zero-shared";

import { auth } from "~/auth/server";

export const Route = createFileRoute("/api/zero/mutate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await auth.api.getSession(request);
        const ctx = session ? { userId: session.user.id } : undefined;

        const result = await handleMutateRequest(
          dbProvider,
          (transact) =>
            transact((tx, name, args) => {
              const mutator = mustGetMutator(mutators, name);
              return mutator.fn({
                args,
                tx,
                ctx,
              });
            }),
          request,
        );

        return Response.json(result);
      },
    },
  },
});
