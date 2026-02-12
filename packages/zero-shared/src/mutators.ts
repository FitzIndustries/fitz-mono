// zero/mutators.ts
import { defineMutator, defineMutators } from "./zero";
import { z } from "zod/v4";

export const mutators = defineMutators({
  posts: {
    create: defineMutator(
      z.object({
        id: z.string(),
        title: z.string(),
        content: z.string(),
        createdAt: z.number(),
        updatedAt: z.number(),
      }),
      async ({ args, tx }) => {
        await tx.mutate.Post.insert({
          id: args.id,
          title: args.title,
          content: args.content,
          createdAt: args.createdAt,
          updatedAt: args.updatedAt,
        });
      },
    ),
  },
});
