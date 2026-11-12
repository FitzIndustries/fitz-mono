import { defineQueries, defineQuery } from "@rocicorp/zero";
import { z } from "zod/v4";

import { zql } from "./schema";

const inboxArgsSchema = z.object({
  scope: z.enum(["my", "team"]).default("team"),
  status: z.enum(["open", "pending", "resolved", "closed"]).optional(),
});

// All primary keys are non-null. IS NULL denies reads without producing an
// empty OR expression (which is invalid in the server Postgres adapter).
const emptyConversationQuery = () => zql.conversation.where("id", "IS", null);
const emptyCustomerQuery = () => zql.customer.where("id", "IS", null);
const emptyTicketQuery = () => zql.ticket.where("id", "IS", null);
const emptyMemberQuery = () => zql.organizationMember.where("id", "IS", null);
const emptyOrganizationQuery = () => zql.organization.where("id", "IS", null);
const emptyUserQuery = () => zql.user.where("id", "IS", null);

export const queries = defineQueries({
  // Legacy Expo demo content is intentionally global, not tenant-owned data.
  // Do not store customer or organization records in this table.
  posts: {
    all: defineQuery(() => zql.Post),
  },

  support: {
    inbox: defineQuery(inboxArgsSchema, ({ args, ctx }) => {
      let query = zql.conversation
        .where((operators) =>
          ctx?.organizationId
            ? operators.cmp("organizationId", ctx.organizationId)
            : operators.cmp("id", "IS", null),
        )
        .related("customer", (customerQuery) =>
          customerQuery.where((operators) =>
            ctx?.organizationId
              ? operators.cmp("organizationId", ctx.organizationId)
              : operators.cmp("id", "IS", null),
          ),
        )
        .related("assignedAgent", (memberQuery) =>
          memberQuery.where((operators) =>
            ctx?.organizationId
              ? operators.cmp("organizationId", ctx.organizationId)
              : operators.cmp("id", "IS", null),
          ),
        )
        .related("messages", (messageQuery) =>
          messageQuery.orderBy("createdAt", "desc").limit(1),
        )
        .orderBy("lastMessageAt", "desc");

      if (args.scope === "my") {
        query = ctx?.membershipId
          ? query.where("assignedAgentId", ctx.membershipId)
          : query.where("id", "IS", null);
      }

      if (args.status) {
        query = query.where("status", args.status);
      }

      return query;
    }),

    conversation: defineQuery(z.string(), ({ args, ctx }) =>
      (ctx ? zql.conversation : emptyConversationQuery())
        .where("id", args)
        .where((operators) =>
          ctx?.organizationId
            ? operators.cmp("organizationId", ctx.organizationId)
            : operators.cmp("id", "IS", null),
        )
        .related("customer", (customerQuery) =>
          customerQuery.where((operators) =>
            ctx?.organizationId
              ? operators.cmp("organizationId", ctx.organizationId)
              : operators.cmp("id", "IS", null),
          ),
        )
        .related("assignedAgent", (memberQuery) =>
          memberQuery.where((operators) =>
            ctx?.organizationId
              ? operators.cmp("organizationId", ctx.organizationId)
              : operators.cmp("id", "IS", null),
          ),
        )
        .related("tickets", (ticketQuery) =>
          ticketQuery
            .where((operators) =>
              ctx?.organizationId
                ? operators.cmp("organizationId", ctx.organizationId)
                : operators.cmp("id", "IS", null),
            )
            .orderBy("createdAt", "desc"),
        )
        .related("messages", (messageQuery) =>
          messageQuery.orderBy("createdAt", "asc"),
        )
        .one(),
    ),

    customers: defineQuery(({ ctx }) =>
      (ctx ? zql.customer : emptyCustomerQuery())
        .where((operators) =>
          ctx?.organizationId
            ? operators.cmp("organizationId", ctx.organizationId)
            : operators.cmp("id", "IS", null),
        )
        .related("conversations", (conversationQuery) =>
          conversationQuery
            .where((operators) =>
              ctx?.organizationId
                ? operators.cmp("organizationId", ctx.organizationId)
                : operators.cmp("id", "IS", null),
            )
            .orderBy("lastMessageAt", "desc")
            .limit(1),
        )
        .orderBy("createdAt", "desc"),
    ),

    tickets: defineQuery(({ ctx }) =>
      (ctx ? zql.ticket : emptyTicketQuery())
        .where((operators) =>
          ctx?.organizationId
            ? operators.cmp("organizationId", ctx.organizationId)
            : operators.cmp("id", "IS", null),
        )
        .related("conversation", (conversationQuery) =>
          conversationQuery
            .where((operators) =>
              ctx?.organizationId
                ? operators.cmp("organizationId", ctx.organizationId)
                : operators.cmp("id", "IS", null),
            )
            .related("customer", (customerQuery) =>
              customerQuery.where((operators) =>
                ctx?.organizationId
                  ? operators.cmp("organizationId", ctx.organizationId)
                  : operators.cmp("id", "IS", null),
              ),
            )
            .related("assignedAgent", (memberQuery) =>
              memberQuery.where((operators) =>
                ctx?.organizationId
                  ? operators.cmp("organizationId", ctx.organizationId)
                  : operators.cmp("id", "IS", null),
              ),
            )
            .one(),
        )
        .orderBy("createdAt", "desc"),
    ),

    members: defineQuery(({ ctx }) =>
      (ctx ? zql.organizationMember : emptyMemberQuery())
        .where((operators) =>
          ctx?.organizationId
            ? operators.cmp("organizationId", ctx.organizationId)
            : operators.cmp("id", "IS", null),
        )
        .related("organization")
        .orderBy("createdAt", "asc"),
    ),

    channels: defineQuery(({ ctx }) =>
      (ctx ? zql.organization : emptyOrganizationQuery())
        .where((operators) =>
          ctx?.organizationId
            ? operators.cmp("id", ctx.organizationId)
            : operators.cmp("id", "IS", null),
        )
        .related("whatsappChannels")
        .related("emailChannels")
        .one(),
    ),
  },

  preferences: {
    currentUser: defineQuery(({ ctx }) =>
      (ctx ? zql.user : emptyUserQuery())
        .where((operators) =>
          ctx?.userId
            ? operators.cmp("id", ctx.userId)
            : operators.cmp("id", "IS", null),
        )
        .one(),
    ),
  },

  organizations: {
    all: defineQuery(({ ctx }) =>
      zql.organization.where((operators) =>
        ctx?.organizationId
          ? operators.cmp("id", ctx.organizationId)
          : operators.cmp("id", "IS", null),
      ),
    ),
  },

  organizationMembers: {
    all: defineQuery(({ ctx }) =>
      zql.organizationMember.where((operators) =>
        ctx?.organizationId
          ? operators.cmp("organizationId", ctx.organizationId)
          : operators.cmp("id", "IS", null),
      ),
    ),
  },

  conversations: {
    all: defineQuery(({ ctx }) =>
      zql.conversation.where((operators) =>
        ctx?.organizationId
          ? operators.cmp("organizationId", ctx.organizationId)
          : operators.cmp("id", "IS", null),
      ),
    ),
  },

  messages: {
    all: defineQuery(({ ctx }) =>
      zql.message.whereExists("conversation", (conversationQuery) =>
        conversationQuery.where((operators) =>
          ctx?.organizationId
            ? operators.cmp("organizationId", ctx.organizationId)
            : operators.cmp("id", "IS", null),
        ),
      ),
    ),
  },

  customers: {
    all: defineQuery(({ ctx }) =>
      zql.customer.where((operators) =>
        ctx?.organizationId
          ? operators.cmp("organizationId", ctx.organizationId)
          : operators.cmp("id", "IS", null),
      ),
    ),
  },

  teams: {
    all: defineQuery(({ ctx }) =>
      zql.team.where((operators) =>
        ctx?.organizationId
          ? operators.cmp("organizationId", ctx.organizationId)
          : operators.cmp("id", "IS", null),
      ),
    ),
  },

  tickets: {
    all: defineQuery(({ ctx }) =>
      zql.ticket.where((operators) =>
        ctx?.organizationId
          ? operators.cmp("organizationId", ctx.organizationId)
          : operators.cmp("id", "IS", null),
      ),
    ),
  },

  internalNotes: {
    all: defineQuery(({ ctx }) =>
      zql.internalNote.where((operators) =>
        ctx?.organizationId
          ? operators.cmp("organizationId", ctx.organizationId)
          : operators.cmp("id", "IS", null),
      ),
    ),
  },

  cannedResponses: {
    all: defineQuery(({ ctx }) =>
      zql.cannedResponse.where((operators) =>
        ctx?.organizationId
          ? operators.cmp("organizationId", ctx.organizationId)
          : operators.cmp("id", "IS", null),
      ),
    ),
  },

  whatsappChannels: {
    all: defineQuery(({ ctx }) =>
      zql.whatsappChannel.where((operators) =>
        ctx?.organizationId
          ? operators.cmp("organizationId", ctx.organizationId)
          : operators.cmp("id", "IS", null),
      ),
    ),
  },

  emailChannels: {
    all: defineQuery(({ ctx }) =>
      zql.emailChannel.where((operators) =>
        ctx?.organizationId
          ? operators.cmp("organizationId", ctx.organizationId)
          : operators.cmp("id", "IS", null),
      ),
    ),
  },

  articles: {
    all: defineQuery(({ ctx }) =>
      zql.article.where((operators) =>
        ctx?.organizationId
          ? operators.cmp("organizationId", ctx.organizationId)
          : operators.cmp("id", "IS", null),
      ),
    ),
  },

  auditLogs: {
    all: defineQuery(({ ctx }) =>
      zql.auditLog.where((operators) =>
        ctx?.organizationId
          ? operators.cmp("organizationId", ctx.organizationId)
          : operators.cmp("id", "IS", null),
      ),
    ),
  },

  conversationMetrics: {
    all: defineQuery(({ ctx }) =>
      zql.conversationMetric.where((operators) =>
        ctx?.organizationId
          ? operators.cmp("organizationId", ctx.organizationId)
          : operators.cmp("id", "IS", null),
      ),
    ),
  },
});
