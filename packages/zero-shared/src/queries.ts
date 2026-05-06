import { defineQueries, defineQuery } from "@rocicorp/zero";
import { z } from "zod/v4";

import { zql } from "./schema";

const inboxArgsSchema = z.object({
  scope: z.enum(["my", "team"]).default("team"),
  status: z.enum(["open", "pending", "resolved", "closed"]).optional(),
});

const noConversationRows = () => zql.conversation.where(({ or }) => or());
const noCustomerRows = () => zql.customer.where(({ or }) => or());
const noTicketRows = () => zql.ticket.where(({ or }) => or());
const noMemberRows = () =>
  zql.organizationMember.where(({ or }) => or());
const noOrganizationRows = () => zql.organization.where(({ or }) => or());
const noUserRows = () => zql.user.where(({ or }) => or());

export const queries = defineQueries({
  posts: {
    all: defineQuery(() => zql.Post),
  },

  support: {
    inbox: defineQuery(inboxArgsSchema, ({ args, ctx }) => {
      let query = zql.conversation
        .where((operators) =>
          ctx?.organizationId
            ? operators.cmp("organizationId", ctx.organizationId)
            : operators.or(),
        )
        .related("customer")
        .related("assignedAgent")
        .related("messages", (messageQuery) =>
          messageQuery.orderBy("createdAt", "desc").limit(1),
        )
        .orderBy("lastMessageAt", "desc");

      if (args.scope === "my") {
        query = ctx?.membershipId
          ? query.where("assignedAgentId", ctx.membershipId)
          : query.where(({ or }) => or());
      }

      if (args.status) {
        query = query.where("status", args.status);
      }

      return query;
    }),

    conversation: defineQuery(z.string(), ({ args, ctx }) =>
      (ctx ? zql.conversation : noConversationRows())
        .where("id", args)
        .where((operators) =>
          ctx?.organizationId
            ? operators.cmp("organizationId", ctx.organizationId)
            : operators.or(),
        )
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
      (ctx ? zql.customer : noCustomerRows())
        .where((operators) =>
          ctx?.organizationId
            ? operators.cmp("organizationId", ctx.organizationId)
            : operators.or(),
        )
        .related("conversations", (conversationQuery) =>
          conversationQuery.orderBy("lastMessageAt", "desc").limit(1),
        )
        .orderBy("createdAt", "desc"),
    ),

    tickets: defineQuery(({ ctx }) =>
      (ctx ? zql.ticket : noTicketRows())
        .where((operators) =>
          ctx?.organizationId
            ? operators.cmp("organizationId", ctx.organizationId)
            : operators.or(),
        )
        .related("conversation", (conversationQuery) =>
          conversationQuery.related("customer").one(),
        )
        .orderBy("createdAt", "desc"),
    ),

    members: defineQuery(({ ctx }) =>
      (ctx ? zql.organizationMember : noMemberRows())
        .where((operators) =>
          ctx?.organizationId
            ? operators.cmp("organizationId", ctx.organizationId)
            : operators.or(),
        )
        .related("organization")
        .orderBy("createdAt", "asc"),
    ),

    channels: defineQuery(({ ctx }) =>
      (ctx ? zql.organization : noOrganizationRows())
        .where((operators) =>
          ctx?.organizationId
            ? operators.cmp("id", ctx.organizationId)
            : operators.or(),
        )
        .related("whatsappChannels")
        .related("emailChannels")
        .one(),
    ),
  },

  preferences: {
    currentUser: defineQuery(({ ctx }) =>
      (ctx ? zql.user : noUserRows())
        .where((operators) =>
          ctx?.userId ? operators.cmp("id", ctx.userId) : operators.or(),
        )
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
