import { defineQueries, defineQuery } from "@rocicorp/zero";
import { z } from "zod/v4";

import { zql } from "./schema";

const inboxArgsSchema = z.object({
  scope: z.enum(["my", "team"]).default("team"),
  status: z.enum(["open", "pending", "resolved", "closed"]).optional(),
});

export const queries = defineQueries({
  posts: {
    all: defineQuery(() => zql.Post),
  },

  support: {
    inbox: defineQuery(inboxArgsSchema, ({ args, ctx }) => {
      let query = zql.conversation
        .where("organizationId", ctx.organizationId)
        .related("customer")
        .related("assignedAgent")
        .related("messages", (messageQuery) =>
          messageQuery.orderBy("createdAt", "desc").limit(1),
        )
        .orderBy("lastMessageAt", "desc");

      if (args.scope === "my") {
        query = ctx.membershipId
          ? query.where("assignedAgentId", ctx.membershipId)
          : query.where("id", "__no-membership__");
      }

      if (args.status) {
        query = query.where("status", args.status);
      }

      return query;
    }),

    conversation: defineQuery(z.string(), ({ args, ctx }) =>
      zql.conversation
        .where("id", args)
        .where("organizationId", ctx.organizationId)
        .related("customer")
        .related("assignedAgent")
        .related("tickets", (ticketQuery) =>
          ticketQuery.orderBy("createdAt", "desc"),
        )
        .related("messages", (messageQuery) =>
          messageQuery.orderBy("createdAt", "asc"),
        )
        .one(),
    ),

    customers: defineQuery(({ ctx }) =>
      zql.customer
        .where("organizationId", ctx.organizationId)
        .related("conversations", (conversationQuery) =>
          conversationQuery.orderBy("lastMessageAt", "desc").limit(1),
        )
        .orderBy("createdAt", "desc"),
    ),

    tickets: defineQuery(({ ctx }) =>
      zql.ticket
        .where("organizationId", ctx.organizationId)
        .related("conversation", (conversationQuery) =>
          conversationQuery.related("customer").one(),
        )
        .orderBy("createdAt", "desc"),
    ),

    members: defineQuery(({ ctx }) =>
      zql.organizationMember
        .where("organizationId", ctx.organizationId)
        .related("organization")
        .orderBy("createdAt", "asc"),
    ),

    channels: defineQuery(({ ctx }) =>
      zql.organization
        .where("id", ctx.organizationId)
        .related("whatsappChannels")
        .related("emailChannels")
        .one(),
    ),
  },

  organizations: {
    all: defineQuery(() => zql.organization),
  },

  organizationMembers: {
    all: defineQuery(() => zql.organizationMember),
  },

  conversations: {
    all: defineQuery(() => zql.conversation),
  },

  messages: {
    all: defineQuery(() => zql.message),
  },

  customers: {
    all: defineQuery(() => zql.customer),
  },

  teams: {
    all: defineQuery(() => zql.team),
  },

  tickets: {
    all: defineQuery(() => zql.ticket),
  },

  internalNotes: {
    all: defineQuery(() => zql.internalNote),
  },

  cannedResponses: {
    all: defineQuery(() => zql.cannedResponse),
  },

  whatsappChannels: {
    all: defineQuery(() => zql.whatsappChannel),
  },

  emailChannels: {
    all: defineQuery(() => zql.emailChannel),
  },

  articles: {
    all: defineQuery(() => zql.article),
  },

  auditLogs: {
    all: defineQuery(() => zql.auditLog),
  },

  conversationMetrics: {
    all: defineQuery(() => zql.conversationMetric),
  },
});
