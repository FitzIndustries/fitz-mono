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
  organization: {
    updateProfile: defineMutator(
      z.object({
        name: z.string().trim().min(1).max(255),
        slug: z
          .string()
          .trim()
          .min(1)
          .max(100)
          .regex(/^[a-z0-9-]+$/),
      }),
      async ({ args, ctx, tx }) => {
        if (!ctx?.organizationId || !ctx.membershipId) {
          throw new Error("Organization context is required");
        }

        if (tx.location === "server") {
          const membership = await tx.run(
            zql.organizationMember
              .where("id", ctx.membershipId)
              .where("organizationId", ctx.organizationId)
              .where("isActive", true)
              .one(),
          );

          if (membership?.role !== "owner" && membership?.role !== "admin") {
            throw new Error(
              "You do not have permission to update this organization",
            );
          }

          const existingWithSlug = await tx.run(
            zql.organization.where("slug", args.slug).one(),
          );

          if (existingWithSlug && existingWithSlug.id !== ctx.organizationId) {
            throw new Error("Subdomain is already in use");
          }
        }

        await tx.mutate.organization.update({
          id: ctx.organizationId,
          name: args.name,
          slug: args.slug,
          updatedAt: Date.now(),
        });
      },
    ),
  },

  team: {
    updateMemberRole: defineMutator(
      z.object({
        memberId: z.string().uuid(),
        role: z.enum(["owner", "admin", "agent", "viewer"]),
      }),
      async ({ args, ctx, tx }) => {
        if (!ctx?.organizationId || !ctx.membershipId) {
          throw new Error("Organization context is required");
        }

        if (tx.location === "server") {
          const currentMembership = await tx.run(
            zql.organizationMember
              .where("id", ctx.membershipId)
              .where("organizationId", ctx.organizationId)
              .where("isActive", true)
              .one(),
          );

          if (
            currentMembership?.role !== "owner" &&
            currentMembership?.role !== "admin"
          ) {
            throw new Error("You do not have permission to update team roles");
          }
        }

        const targetMembership = await tx.run(
          zql.organizationMember
            .where("id", args.memberId)
            .where("organizationId", ctx.organizationId)
            .one(),
        );

        if (!targetMembership) {
          throw new Error("Team member not found");
        }

        if (targetMembership.userId === ctx.userId) {
          throw new Error("You cannot change your own role");
        }

        await tx.mutate.organizationMember.update({
          id: args.memberId,
          role: args.role,
          updatedAt: Date.now(),
        });
      },
    ),
  },

  channels: {
    setEmailActive: defineMutator(
      z.object({
        channelId: z.string().uuid(),
        isActive: z.boolean(),
      }),
      async ({ args, ctx, tx }) => {
        if (!ctx?.organizationId || !ctx.membershipId) {
          throw new Error("Organization context is required");
        }

        if (tx.location === "server") {
          const membership = await tx.run(
            zql.organizationMember
              .where("id", ctx.membershipId)
              .where("organizationId", ctx.organizationId)
              .where("isActive", true)
              .one(),
          );

          if (membership?.role !== "owner" && membership?.role !== "admin") {
            throw new Error("You do not have permission to update channels");
          }
        }

        const channel = await tx.run(
          zql.emailChannel
            .where("id", args.channelId)
            .where("organizationId", ctx.organizationId)
            .one(),
        );

        if (!channel) {
          throw new Error("Email channel not found");
        }

        await tx.mutate.emailChannel.update({
          id: args.channelId,
          isActive: args.isActive,
          updatedAt: Date.now(),
        });
      },
    ),

    setWhatsappActive: defineMutator(
      z.object({
        channelId: z.string().uuid(),
        isActive: z.boolean(),
      }),
      async ({ args, ctx, tx }) => {
        if (!ctx?.organizationId || !ctx.membershipId) {
          throw new Error("Organization context is required");
        }

        if (tx.location === "server") {
          const membership = await tx.run(
            zql.organizationMember
              .where("id", ctx.membershipId)
              .where("organizationId", ctx.organizationId)
              .where("isActive", true)
              .one(),
          );

          if (membership?.role !== "owner" && membership?.role !== "admin") {
            throw new Error("You do not have permission to update channels");
          }
        }

        const channel = await tx.run(
          zql.whatsappChannel
            .where("id", args.channelId)
            .where("organizationId", ctx.organizationId)
            .one(),
        );

        if (!channel) {
          throw new Error("WhatsApp channel not found");
        }

        await tx.mutate.whatsappChannel.update({
          id: args.channelId,
          isActive: args.isActive,
          updatedAt: Date.now(),
        });
      },
    ),
  },

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
        if (!ctx?.organizationId || !ctx.membershipId) {
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
        if (!ctx?.organizationId || !ctx.membershipId) {
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
        if (!ctx?.organizationId) {
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

    updateTicketStatus: defineMutator(
      z.object({
        ticketId: z.string().uuid(),
        status: z.enum(["open", "in_progress", "resolved", "closed"]),
      }),
      async ({ args, ctx, tx }) => {
        if (!ctx?.organizationId) {
          throw new Error("Organization context is required");
        }

        const existingTicket = await tx.run(
          zql.ticket
            .where("id", args.ticketId)
            .where("organizationId", ctx.organizationId)
            .one(),
        );

        if (!existingTicket) {
          throw new Error("Ticket not found");
        }

        await tx.mutate.ticket.update({
          id: args.ticketId,
          status: args.status,
          resolvedAt:
            args.status === "resolved" || args.status === "closed"
              ? Date.now()
              : null,
          updatedAt: Date.now(),
        });
      },
    ),
  },

  preferences: {
    updateTheme: defineMutator(
      z.object({
        themeMode: z.enum(["light", "dark", "auto"]),
      }),
      async ({ args, ctx, tx }) => {
        if (!ctx) {
          throw new Error("User context is required");
        }

        const existingUser = await tx.run(
          zql.user.where("id", ctx.userId).one(),
        );

        if (!existingUser) {
          throw new Error("User not found");
        }

        await tx.mutate.user.update({
          id: ctx.userId,
          themeMode: args.themeMode,
          updatedAt: Date.now(),
        });
      },
    ),
  },
});
