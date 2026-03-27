import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export * from "./auth-schema";

// ============================================
// ORGANIZATION (Multi-tenancy)
// ============================================

export const organization = pgTable(
  "organization",
  {
    id: uuid().notNull().primaryKey().defaultRandom(),
    name: varchar({ length: 255 }).notNull(),
    slug: varchar({ length: 100 }).notNull().unique(),
    logoUrl: text(),
    stripeCustomerId: text(),
    stripeSubscriptionId: text(),
    stripeItemId: text(),
    plan: varchar({ length: 20 })
      .$type<"starter" | "pro" | "enterprise">()
      .default("starter"),
    seatLimit: integer().default(3),
    seatUsed: integer().default(0),
    settings: jsonb().$type<Record<string, unknown>>().default({}),
    isActive: boolean().default(true).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (t) => [index("org_slug_idx").on(t.slug)],
);

export const organizationMember = pgTable(
  "organization_member",
  {
    id: uuid().notNull().primaryKey().defaultRandom(),
    userId: text().notNull(),
    organizationId: uuid().notNull(),
    role: varchar({ length: 20 })
      .$type<"owner" | "admin" | "agent" | "viewer">()
      .default("agent")
      .notNull(),
    invitedBy: text(),
    isActive: boolean().default(true).notNull(),
    joinedAt: timestamp().defaultNow().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (t) => [
    index("org_member_user_idx").on(t.userId),
    index("org_member_org_idx").on(t.organizationId),
    unique("org_member_unique").on(t.userId, t.organizationId),
  ],
);

// ============================================
// CHANNELS
// ============================================

export const whatsappChannel = pgTable(
  "whatsapp_channel",
  {
    id: uuid().notNull().primaryKey().defaultRandom(),
    organizationId: uuid().notNull(),
    name: varchar({ length: 100 }).notNull(),
    phoneNumber: varchar({ length: 20 }).notNull(),
    phoneNumberId: varchar({ length: 100 }).notNull(),
    accessTokenEncrypted: text().notNull(),
    webhookVerifyToken: text(),
    botpressBotId: text(),
    isActive: boolean().default(true).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (t) => [
    index("wa_channel_org_idx").on(t.organizationId),
    index("wa_channel_phone_idx").on(t.phoneNumber),
  ],
);

export const emailChannel = pgTable(
  "email_channel",
  {
    id: uuid().notNull().primaryKey().defaultRandom(),
    organizationId: uuid().notNull(),
    name: varchar({ length: 100 }).notNull(),
    emailAddress: varchar({ length: 255 }).notNull(),
    fromName: varchar({ length: 100 }).notNull(),
    awsSesArn: text(),
    awsSesVerified: boolean().default(false),
    botpressBotId: text(),
    isActive: boolean().default(true).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (t) => [
    index("email_channel_org_idx").on(t.organizationId),
    index("email_channel_email_idx").on(t.emailAddress),
  ],
);

// ============================================
// CUSTOMERS
// ============================================

export const customer = pgTable(
  "customer",
  {
    id: uuid().notNull().primaryKey().defaultRandom(),
    organizationId: uuid().notNull(),
    email: varchar({ length: 255 }),
    phone: varchar({ length: 50 }),
    name: varchar({ length: 255 }),
    metadata: jsonb().$type<Record<string, unknown>>().default({}),
    tags: text().array().default([]),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (t) => [
    index("customer_org_idx").on(t.organizationId),
    index("customer_email_idx").on(t.email),
    index("customer_phone_idx").on(t.phone),
  ],
);

// ============================================
// TEAMS
// ============================================

export const team = pgTable(
  "team",
  {
    id: uuid().notNull().primaryKey().defaultRandom(),
    organizationId: uuid().notNull(),
    name: varchar({ length: 100 }).notNull(),
    description: text(),
    priority: integer().default(0),
    autoAssign: boolean().default(false).notNull(),
    isActive: boolean().default(true).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (t) => [index("team_org_idx").on(t.organizationId)],
);

// ============================================
// CONVERSATIONS
// ============================================

export const conversation = pgTable(
  "conversation",
  {
    id: uuid().notNull().primaryKey().defaultRandom(),
    organizationId: uuid().notNull(),
    customerId: uuid().notNull(),
    channel: varchar({ length: 20 }).$type<"email" | "whatsapp">().notNull(),
    channelId: uuid(),
    status: varchar({ length: 20 })
      .$type<"open" | "pending" | "resolved" | "closed">()
      .default("open")
      .notNull(),
    teamId: uuid(),
    assignedAgentId: uuid(),
    subject: varchar({ length: 500 }),
    lastMessageAt: timestamp().defaultNow().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (t) => [
    index("conv_org_idx").on(t.organizationId),
    index("conv_customer_idx").on(t.customerId),
    index("conv_status_idx").on(t.status),
    index("conv_channel_idx").on(t.channel),
    index("conv_team_idx").on(t.teamId),
    index("conv_last_msg_idx").on(t.lastMessageAt),
  ],
);

// ============================================
// MESSAGES
// ============================================

export const message = pgTable(
  "message",
  {
    id: uuid().notNull().primaryKey().defaultRandom(),
    conversationId: uuid().notNull(),
    senderType: varchar({ length: 20 })
      .$type<"customer" | "agent" | "system" | "bot">()
      .notNull(),
    senderId: text(),
    content: text().notNull(),
    contentType: varchar({ length: 20 })
      .$type<"text" | "template" | "attachment" | "bot_response">()
      .default("text")
      .notNull(),
    direction: varchar({ length: 10 })
      .$type<"inbound" | "outbound">()
      .notNull(),
    metadata: jsonb().$type<Record<string, unknown>>().default({}),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (t) => [
    index("msg_conv_idx").on(t.conversationId),
    index("msg_created_idx").on(t.createdAt),
  ],
);

// ============================================
// INTERNAL NOTES
// ============================================

export const internalNote = pgTable(
  "internal_note",
  {
    id: uuid().notNull().primaryKey().defaultRandom(),
    organizationId: uuid().notNull(),
    conversationId: uuid().notNull(),
    agentId: uuid().notNull(),
    content: text().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (t) => [
    index("note_org_idx").on(t.organizationId),
    index("note_conv_idx").on(t.conversationId),
    index("note_agent_idx").on(t.agentId),
  ],
);

// ============================================
// TICKETS (Event-specific)
// ============================================

export const ticket = pgTable(
  "ticket",
  {
    id: uuid().notNull().primaryKey().defaultRandom(),
    organizationId: uuid().notNull(),
    conversationId: uuid().notNull(),
    ticketType: varchar({ length: 20 })
      .$type<"booking" | "refund" | "info" | "complaint" | "other">()
      .notNull(),
    priority: varchar({ length: 20 })
      .$type<"low" | "medium" | "high" | "urgent">()
      .default("medium")
      .notNull(),
    status: varchar({ length: 20 })
      .$type<"open" | "in_progress" | "resolved" | "closed">()
      .default("open")
      .notNull(),
    eventId: text(),
    orderId: text(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    resolvedAt: timestamp(),
  },
  (t) => [
    index("ticket_org_idx").on(t.organizationId),
    index("ticket_conv_idx").on(t.conversationId),
    index("ticket_status_idx").on(t.status),
    index("ticket_type_idx").on(t.ticketType),
  ],
);

// ============================================
// CANNED RESPONSES
// ============================================

export const cannedResponse = pgTable(
  "canned_response",
  {
    id: uuid().notNull().primaryKey().defaultRandom(),
    organizationId: uuid().notNull(),
    teamId: uuid(),
    title: varchar({ length: 255 }).notNull(),
    content: text().notNull(),
    shortcut: varchar({ length: 50 }),
    category: varchar({ length: 100 }),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (t) => [
    index("canned_org_idx").on(t.organizationId),
    index("canned_shortcut_idx").on(t.shortcut),
  ],
);

// ============================================
// ANALYTICS
// ============================================

export const conversationMetric = pgTable(
  "conversation_metric",
  {
    id: uuid().notNull().primaryKey().defaultRandom(),
    organizationId: uuid().notNull(),
    conversationId: uuid().notNull(),
    firstResponseAt: timestamp(),
    resolvedAt: timestamp(),
    agentResponseCount: integer().default(0).notNull(),
    customerResponseCount: integer().default(0).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (t) => [
    index("conv_metric_org_idx").on(t.organizationId),
    index("conv_metric_conv_idx").on(t.conversationId),
  ],
);

// ============================================
// KNOWLEDGE BASE
// ============================================

export const article = pgTable(
  "article",
  {
    id: uuid().notNull().primaryKey().defaultRandom(),
    organizationId: uuid().notNull(),
    title: varchar({ length: 255 }).notNull(),
    content: text().notNull(),
    slug: varchar({ length: 100 }).notNull(),
    category: varchar({ length: 100 }),
    published: boolean().default(false).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (t) => [
    index("article_org_idx").on(t.organizationId),
    index("article_slug_idx").on(t.slug),
    index("article_category_idx").on(t.category),
  ],
);

// ============================================
// AUDIT LOG
// ============================================

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid().notNull().primaryKey().defaultRandom(),
    organizationId: uuid().notNull(),
    actorId: text(),
    action: varchar({ length: 100 }).notNull(),
    resource: varchar({ length: 100 }).notNull(),
    resourceId: text(),
    metadata: jsonb().$type<Record<string, unknown>>().default({}),
    ipAddress: varchar({ length: 50 }),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (t) => [
    index("audit_org_idx").on(t.organizationId),
    index("audit_created_idx").on(t.createdAt),
    index("audit_actor_idx").on(t.actorId),
  ],
);

// ============================================
// INSERT SCHEMAS (for validation)
// ============================================

export const CreateOrganizationSchema = createInsertSchema(organization, {
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
}).omit({
  id: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  stripeItemId: true,
  seatUsed: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateOrganizationMemberSchema = createInsertSchema(
  organizationMember,
  {
    role: z.enum(["owner", "admin", "agent", "viewer"]),
  },
).omit({
  id: true,
  isActive: true,
  joinedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateWhatsappChannelSchema = createInsertSchema(whatsappChannel, {
  name: z.string().min(1).max(100),
  phoneNumber: z.string().min(1).max(20),
  phoneNumberId: z.string().min(1).max(100),
}).omit({
  id: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateEmailChannelSchema = createInsertSchema(emailChannel, {
  name: z.string().min(1).max(100),
  emailAddress: z.string().email().max(255),
  fromName: z.string().min(1).max(100),
}).omit({
  id: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateCustomerSchema = createInsertSchema(customer, {
  email: z.string().email().max(255).optional(),
  phone: z.string().max(50).optional(),
  name: z.string().max(255).optional(),
}).omit({
  id: true,
  metadata: true,
  tags: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateTeamSchema = createInsertSchema(team, {
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  priority: z.number().int().min(0).default(0),
  autoAssign: z.boolean().default(false),
}).omit({
  id: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateConversationSchema = createInsertSchema(conversation, {
  channel: z.enum(["email", "whatsapp"]),
  status: z.enum(["open", "pending", "resolved", "closed"]).default("open"),
  subject: z.string().max(500).optional(),
}).omit({
  id: true,
  lastMessageAt: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateMessageSchema = createInsertSchema(message, {
  senderType: z.enum(["customer", "agent", "system", "bot"]),
  contentType: z
    .enum(["text", "template", "attachment", "bot_response"])
    .default("text"),
  direction: z.enum(["inbound", "outbound"]),
}).omit({
  id: true,
  metadata: true,
  createdAt: true,
});

export const CreateInternalNoteSchema = createInsertSchema(internalNote, {
  content: z.string().min(1),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateTicketSchema = createInsertSchema(ticket, {
  ticketType: z.enum(["booking", "refund", "info", "complaint", "other"]),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).default("open"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
});

export const CreateCannedResponseSchema = createInsertSchema(cannedResponse, {
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  shortcut: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateArticleSchema = createInsertSchema(article, {
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  category: z.string().max(100).optional(),
  published: z.boolean().default(false),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ============================================
// RELATIONS
// ============================================

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(organizationMember),
  teams: many(team),
  customers: many(customer),
  conversations: many(conversation),
  whatsappChannels: many(whatsappChannel),
  emailChannels: many(emailChannel),
  cannedResponses: many(cannedResponse),
  articles: many(article),
  auditLogs: many(auditLog),
}));

export const organizationMemberRelations = relations(
  organizationMember,
  ({ one }) => ({
    organization: one(organization, {
      fields: [organizationMember.organizationId],
      references: [organization.id],
    }),
  }),
);

export const teamRelations = relations(team, ({ one, many }) => ({
  organization: one(organization, {
    fields: [team.organizationId],
    references: [organization.id],
  }),
  conversations: many(conversation),
  cannedResponses: many(cannedResponse),
}));

export const customerRelations = relations(customer, ({ one, many }) => ({
  organization: one(organization, {
    fields: [customer.organizationId],
    references: [organization.id],
  }),
  conversations: many(conversation),
}));

export const conversationRelations = relations(
  conversation,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [conversation.organizationId],
      references: [organization.id],
    }),
    customer: one(customer, {
      fields: [conversation.customerId],
      references: [customer.id],
    }),
    team: one(team, {
      fields: [conversation.teamId],
      references: [team.id],
    }),
    assignedAgent: one(organizationMember, {
      fields: [conversation.assignedAgentId],
      references: [organizationMember.id],
    }),
    messages: many(message),
    internalNotes: many(internalNote),
    tickets: many(ticket),
    metric: one(conversationMetric),
  }),
);

export const messageRelations = relations(message, ({ one }) => ({
  conversation: one(conversation, {
    fields: [message.conversationId],
    references: [conversation.id],
  }),
}));

export const internalNoteRelations = relations(internalNote, ({ one }) => ({
  organization: one(organization, {
    fields: [internalNote.organizationId],
    references: [organization.id],
  }),
  conversation: one(conversation, {
    fields: [internalNote.conversationId],
    references: [conversation.id],
  }),
  agent: one(organizationMember, {
    fields: [internalNote.agentId],
    references: [organizationMember.id],
  }),
}));

export const ticketRelations = relations(ticket, ({ one }) => ({
  organization: one(organization, {
    fields: [ticket.organizationId],
    references: [organization.id],
  }),
  conversation: one(conversation, {
    fields: [ticket.conversationId],
    references: [conversation.id],
  }),
}));

export const cannedResponseRelations = relations(cannedResponse, ({ one }) => ({
  organization: one(organization, {
    fields: [cannedResponse.organizationId],
    references: [organization.id],
  }),
  team: one(team, {
    fields: [cannedResponse.teamId],
    references: [team.id],
  }),
}));

export const conversationMetricRelations = relations(
  conversationMetric,
  ({ one }) => ({
    organization: one(organization, {
      fields: [conversationMetric.organizationId],
      references: [organization.id],
    }),
    conversation: one(conversation, {
      fields: [conversationMetric.conversationId],
      references: [conversation.id],
    }),
  }),
);

export const articleRelations = relations(article, ({ one }) => ({
  organization: one(organization, {
    fields: [article.organizationId],
    references: [organization.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  organization: one(organization, {
    fields: [auditLog.organizationId],
    references: [organization.id],
  }),
}));

export const whatsappChannelRelations = relations(
  whatsappChannel,
  ({ one }) => ({
    organization: one(organization, {
      fields: [whatsappChannel.organizationId],
      references: [organization.id],
    }),
  }),
);

export const emailChannelRelations = relations(emailChannel, ({ one }) => ({
  organization: one(organization, {
    fields: [emailChannel.organizationId],
    references: [organization.id],
  }),
}));

// ============================================
// POST (existing - kept for reference)
// ============================================

export const Post = pgTable("post", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  title: t.varchar({ length: 256 }).notNull(),
  content: t.text().notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => sql`now()`),
}));

export const CreatePostSchema = createInsertSchema(Post, {
  title: z.string().max(256),
  content: z.string().max(256),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
