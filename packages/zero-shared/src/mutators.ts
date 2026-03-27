import { defineMutator, defineMutators } from "@rocicorp/zero";
import { z } from "zod/v4";

import { zql } from "./schema";

function generateId() {
  const cryptoApi = (
    globalThis as typeof globalThis & {
      crypto?: { randomUUID: () => string };
    }
  ).crypto;

  if (!cryptoApi?.randomUUID) {
    throw new Error("randomUUID is not available");
  }

  return cryptoApi.randomUUID();
}

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

  support: {
    assignSelf: defineMutator(
      z.object({
        conversationId: z.string().uuid(),
      }),
      async ({ args, ctx, tx }) => {
        if (!ctx.organizationId || !ctx.membershipId) {
          throw new Error("Organization context is required");
        }

        const existingConversation = await tx.run(
          zql.conversation
            .where("id", args.conversationId)
            .where("organizationId", ctx.organizationId)
            .one(),
        );

        if (!existingConversation) {
          throw new Error("Conversation not found");
        }

        await tx.mutate.conversation.update({
          id: args.conversationId,
          assignedAgentId: ctx.membershipId,
          updatedAt: Date.now(),
        });
      },
    ),

    sendMessage: defineMutator(
      z.object({
        conversationId: z.string().uuid(),
        content: z.string().min(1).max(10_000),
      }),
      async ({ args, ctx, tx }) => {
        if (!ctx.organizationId || !ctx.membershipId) {
          throw new Error("Organization context is required");
        }

        const existingConversation = await tx.run(
          zql.conversation
            .where("id", args.conversationId)
            .where("organizationId", ctx.organizationId)
            .one(),
        );

        if (!existingConversation) {
          throw new Error("Conversation not found");
        }

        const now = Date.now();

        await tx.mutate.message.insert({
          id: generateId(),
          conversationId: args.conversationId,
          senderType: "agent",
          senderId: ctx.membershipId,
          content: args.content,
          contentType: "text",
          direction: "outbound",
          metadata: {},
          createdAt: now,
        });

        await tx.mutate.conversation.update({
          id: args.conversationId,
          lastMessageAt: now,
          updatedAt: now,
        });
      },
    ),

    updateStatus: defineMutator(
      z.object({
        conversationId: z.string().uuid(),
        status: z.enum(["open", "pending", "resolved", "closed"]),
      }),
      async ({ args, ctx, tx }) => {
        if (!ctx.organizationId) {
          throw new Error("Organization context is required");
        }

        const existingConversation = await tx.run(
          zql.conversation
            .where("id", args.conversationId)
            .where("organizationId", ctx.organizationId)
            .one(),
        );

        if (!existingConversation) {
          throw new Error("Conversation not found");
        }

        await tx.mutate.conversation.update({
          id: args.conversationId,
          status: args.status,
          updatedAt: Date.now(),
        });
      },
    ),
  },
});
