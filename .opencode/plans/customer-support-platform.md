# Customer Support Platform - Implementation Plan

## Overview

A multi-tenant customer support platform for the entertainment and events industry, supporting **Email** and **WhatsApp** channels, with real-time sync via Zero, Stripe billing for per-seat pricing, and BotPress integration for chatbot automation.

---

## Tech Stack

| Component     | Technology                  |
| ------------- | --------------------------- |
| **API**       | Hono + tRPC                 |
| **Database**  | PostgreSQL + Drizzle ORM    |
| **Auth**      | Better Auth                 |
| **Real-time** | @rocicorp/Zero              |
| **Web App**   | Tanstack Start + React 19   |
| **Mobile**    | Expo + React Native         |
| **UI**        | shadcn/ui + Tailwind CSS v4 |
| **Email**     | AWS SES (or SendGrid)       |
| **Billing**   | Stripe                      |
| **Chatbots**  | BotPress                    |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SUPPORT AGENTS                               │
│         ┌─────────────────────┐  ┌─────────────────────┐       │
│         │  Web App            │  │  Mobile App (Expo)  │       │
│         │  Tanstack Start     │  │                     │       │
│         └──────────┬──────────┘  └──────────┬──────────┘       │
│                    │                        │                   │
│                    └────────┬───────────────┘                   │
│                             │                                   │
│                    ┌────────▼────────┐                         │
│                    │   Zero Client   │                         │
│                    │  (React Hooks)  │                         │
│                    └────────┬────────┘                         │
└─────────────────────────────┼─────────────────────────────────┘
                              │ HTTP (query/mutate)
┌─────────────────────────────▼─────────────────────────────────┐
│                     Hono API Server                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐ │
│  │ tRPC Endpoints  │  │ Zero Query/Mute │  │  Webhooks      │ │
│  │ (admin ops)     │  │                 │  │               │ │
│  └─────────────────┘  └────────┬────────┘  └────────┬───────┘ │
└────────────────────────────────┼────────────────────┼──────────┘
                                 │                    │
                    ┌────────────▼────────────────────▼────────┐
                    │           Zero Cache Server               │
                    └──────────────────────┬────────────────────┘
                                            │
┌───────────────────────────────────────────▼────────────────────┐
│                      PostgreSQL                                  │
│  ┌────────────┐ ┌────────────┐ ┌─────────┐ ┌──────────────────┐ │
│  │ users      │ │ organizations│ │agents  │ │ conversations    │ │
│  │ (auth)    │ │            │ │        │ │                  │ │
│  └────────────┘ └────────────┘ └─────────┘ └──────────────────┘ │
└────────────────────────────────────────────────────────────────┘
                                            ▲
                    ┌───────────────────────┴───────┐
                    │                               │
┌───────────────────┴───────────────────────────────┴────────────┐
│                     External Services                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ WhatsApp      │  │ AWS SES      │  │ BotPress     │          │
│  │ (Meta API)  │  │ (SendGrid)   │  │ (Chatbots)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                             │
│  ┌──────────────┐                                           │
│  │ Stripe       │  ← Seat-based billing                     │
│  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## User & Organization Model

### Pattern: Workspace/Organization Pattern

Users can belong to multiple organizations and switch between them (like Slack, Notion, Linear).

```
┌─────────────────────────────────────────────────────────┐
│                          User                           │
│  (One auth account - email/password, OAuth, etc.)       │
│                         │                               │
│           ┌─────────────┼─────────────┐                   │
│           │             │             │                   │
│           ▼             ▼             ▼                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐         │
│  │Organization│  │Organization│  │Organization│         │
│  │ "Acme Co"  │  │ "Best Fest"│  │ "VIP Tick" │         │
│  │ Role: admin│  │ Role: agent│  │ Role: agent│         │
│  └────────────┘  └────────────┘  └────────────┘         │
└─────────────────────────────────────────────────────────┘
```

### Database Schema

#### 1. Organization

```typescript
export const organization = pgTable("organization", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 255 }).notNull(),
  slug: varchar({ length: 100 }).unique().notNull(),
  logoUrl: text(),
  stripeCustomerId: text(),
  stripeSubscriptionId: text(),
  plan: text().$type<"starter" | "pro" | "enterprise">().default("starter"),
  seatLimit: integer().default(3),
  settings: jsonb().$type<OrgSettings>(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().$onUpdateFn(() => sql`now()`),
});
```

#### 2. Organization Membership

```typescript
export const organizationMember = pgTable(
  "organization_member",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id),
    organizationId: uuid()
      .notNull()
      .references(() => organization.id),
    role: text()
      .$type<"owner" | "admin" | "agent" | "viewer">()
      .default("agent"),
    invitedBy: text().references(() => user.id),
    joinedAt: timestamp().defaultNow().notNull(),
  },
  (t) => [
    index("org_member_user_idx").on(t.userId),
    index("org_member_org_idx").on(t.organizationId),
    unique("org_member_unique").on(t.userId, t.organizationId),
  ],
);
```

#### 3. WhatsApp Channel (per-org)

```typescript
export const whatsappChannel = pgTable("whatsapp_channel", {
  id: uuid().primaryKey().defaultRandom(),
  organizationId: uuid()
    .notNull()
    .references(() => organization.id),
  name: varchar({ length: 100 }).notNull(),
  phoneNumber: varchar({ length: 20 }).notNull(),
  phoneNumberId: varchar({ length: 100 }).notNull(),
  accessToken_encrypted: text().notNull(),
  webhookVerifyToken: text(),
  botpressBotId: text(),
  isActive: boolean().default(true),
  createdAt: timestamp().defaultNow().notNull(),
});
```

#### 4. Email Channel (per-org)

```typescript
export const emailChannel = pgTable("email_channel", {
  id: uuid().primaryKey().defaultRandom(),
  organizationId: uuid()
    .notNull()
    .references(() => organization.id),
  name: varchar({ length: 100 }).notNull(),
  emailAddress: varchar({ length: 255 }).notNull(),
  fromName: varchar({ length: 100 }).notNull(),
  awsSesArn: text(),
  botpressBotId: text(),
  isActive: boolean().default(true),
  createdAt: timestamp().defaultNow().notNull(),
});
```

#### 5. Customer

```typescript
export const customer = pgTable("customer", {
  id: uuid().primaryKey().defaultRandom(),
  organizationId: uuid()
    .notNull()
    .references(() => organization.id),
  email: varchar({ length: 255 }),
  phone: varchar({ length: 50 }),
  name: varchar({ length: 255 }),
  metadata: jsonb().$type<Record<string, unknown>>(),
  tags: text().array(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().$onUpdateFn(() => sql`now()`),
});
```

#### 6. Conversation

```typescript
export const conversation = pgTable("conversation", {
  id: uuid().primaryKey().defaultRandom(),
  organizationId: uuid()
    .notNull()
    .references(() => organization.id),
  customerId: uuid()
    .notNull()
    .references(() => customer.id),
  channel: text().notNull().$type<"email" | "whatsapp">(),
  channelId: uuid(),
  status: text()
    .$type<"open" | "pending" | "resolved" | "closed">()
    .default("open"),
  teamId: uuid().references(() => team.id),
  assignedAgentId: uuid().references(() => organizationMember.id),
  subject: varchar({ length: 500 }),
  lastMessageAt: timestamp().defaultNow().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().$onUpdateFn(() => sql`now()`),
});
```

#### 7. Message

```typescript
export const message = pgTable("message", {
  id: uuid().primaryKey().defaultRandom(),
  conversationId: uuid()
    .notNull()
    .references(() => conversation.id, { onDelete: "cascade" }),
  senderType: text().notNull().$type<"customer" | "agent" | "system" | "bot">(),
  senderId: text(),
  content: text().notNull(),
  contentType: text()
    .$type<"text" | "template" | "attachment" | "bot_response">()
    .default("text"),
  direction: text().notNull().$type<"inbound" | "outbound">(),
  metadata: jsonb().$type<Record<string, unknown>>(),
  createdAt: timestamp().defaultNow().notNull(),
});
```

#### 8. Team

```typescript
export const team = pgTable("team", {
  id: uuid().primaryKey().defaultRandom(),
  organizationId: uuid()
    .notNull()
    .references(() => organization.id),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  priority: integer().default(0),
  autoAssign: boolean().default(false),
  createdAt: timestamp().defaultNow().notNull(),
});
```

#### 9. Ticket

```typescript
export const ticket = pgTable("ticket", {
  id: uuid().primaryKey().defaultRandom(),
  organizationId: uuid()
    .notNull()
    .references(() => organization.id),
  conversationId: uuid()
    .notNull()
    .references(() => conversation.id),
  ticketType: text()
    .$type<"booking" | "refund" | "info" | "complaint" | "other">()
    .notNull(),
  priority: text()
    .$type<"low" | "medium" | "high" | "urgent">()
    .default("medium"),
  status: text()
    .$type<"open" | "in_progress" | "resolved" | "closed">()
    .default("open"),
  eventId: text(),
  orderId: text(),
  createdAt: timestamp().defaultNow().notNull(),
  resolvedAt: timestamp(),
});
```

#### 10. Canned Response

```typescript
export const cannedResponse = pgTable("canned_response", {
  id: uuid().primaryKey().defaultRandom(),
  organizationId: uuid()
    .notNull()
    .references(() => organization.id),
  teamId: uuid().references(() => team.id),
  title: varchar({ length: 255 }).notNull(),
  content: text().notNull(),
  shortcut: varchar({ length: 50 }),
  createdAt: timestamp().defaultNow().notNull(),
});
```

---

## Billing (Stripe)

### Seat-based Pricing Model

```
Starter: $15/seat/month (max 3 seats)
Pro: $25/seat/month (unlimited seats)
Enterprise: Custom pricing
```

### Stripe Integration

#### 1. Create Stripe Customer on Org Creation

```typescript
const stripeCustomer = await stripe.customers.create({
  email: org.owner.email,
  metadata: { organizationId: org.id },
});
```

#### 2. Create Subscription with Seat Count

```typescript
const subscription = await stripe.subscriptions.create({
  customer: stripeCustomerId,
  items: [{ price: STORAGE_PRICES[org.plan] }],
  quantity: memberCount,
  metadata: { organizationId: org.id },
});
```

#### 3. Update Quantity on Seat Changes

```typescript
await stripe.subscriptions.update(subscriptionId, {
  items: [{ id: itemId, quantity: newCount }],
});
```

#### 4. Webhook Handling

- `customer.subscription.created` - Activate org
- `customer.subscription.updated` - Update plan/seats
- `customer.subscription.deleted` - Pause org
- `invoice.payment_failed` - Notify org, grace period

### Seat Enforcement

```typescript
const members = await db.query.organizationMember.findMany({
  where: eq(organizationMember.organizationId, orgId),
});

const seatLimit = await getSeatLimit(orgId);

if (members.length >= seatLimit) {
  throw new Error("Seat limit reached. Upgrade your plan.");
}
```

---

## Channel Integrations

### WhatsApp (Meta Business API)

#### Webhook Handler

```typescript
app.post("/webhooks/whatsapp", async (c) => {
  const body = await c.req.json();

  const mode = c.req.query("hub.mode");
  const token = c.req.query("hub.verify_token");

  if (mode === "subscribe") {
    const valid = await db.query.whatsappChannel.findFirst({
      where: eq(whatsappChannel.webhookVerifyToken, token),
    });
    if (valid) return c.text(body["hub.challenge"]);
    return c.text("Forbidden", 403);
  }

  const phoneNumberId =
    body.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
  const channel = await db.query.whatsappChannel.findFirst({
    where: eq(whatsappChannel.phoneNumberId, phoneNumberId),
  });

  if (!channel) return c.json({ error: "Unknown channel" }, 404);

  for (const msg of body.entry[0].changes[0].value.messages ?? []) {
    await processWhatsAppMessage({
      organizationId: channel.organizationId,
      channelId: channel.id,
      message: msg,
    });
  }

  return c.json({ status: "ok" });
});
```

#### Outbound Sending

```typescript
async function sendWhatsAppMessage(
  channelId: string,
  to: string,
  content: string,
) {
  const channel = await db.query.whatsappChannel.findFirst({
    where: eq(whatsappChannel.id, channelId),
  });

  const accessToken = decrypt(channel.accessToken_encrypted);

  await fetch(
    `https://graph.facebook.com/v18.0/${channel.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: content },
      }),
    },
  );
}
```

### Email (AWS SES)

#### Outbound

```typescript
import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";

async function sendEmail(
  channelId: string,
  to: string,
  subject: string,
  body: string,
) {
  const channel = await db.query.emailChannel.findFirst({
    where: eq(emailChannel.id, channelId),
  });

  const client = new SESClient({ region: process.env.AWS_REGION });

  await client.send(
    new SendEmailCommand({
      Source: `${channel.fromName} <${channel.emailAddress}>`,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject },
        Body: { Html: { Data: body } },
      },
    }),
  );
}
```

### BotPress Integration

#### Why BotPress?

- Visual flow builder for chatbots
- Natural language understanding (NLU)
- Handles common queries automatically
- Escalates to human agents when needed
- Multi-channel (WhatsApp, Email, Web)

#### Integration

```typescript
async function processWithBot(
  channelId: string,
  conversationId: string,
  message: string,
) {
  const channel = await getChannel(channelId);

  if (!channel.botpressBotId) return null;

  const response = await fetch(
    `https://api.botpress.cloud/v1/bots/${channel.botpressBotId}/converse`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.BOTPRESS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        conversationId,
        userId: conversationId,
      }),
    },
  );

  const { replies } = await response.json();

  for (const reply of replies) {
    await saveMessage({
      conversationId,
      senderType: "bot",
      content: reply.content,
      contentType: "bot_response",
      direction: "outbound",
    });
  }

  return replies;
}
```

---

## Real-time with Zero

### Context for Multi-tenancy

```typescript
app.post("/api/zero/mutate", async (c) => {
  const session = await auth.api.getSession(c.req.raw);

  const organizationId =
    session?.user.currentOrganizationId ?? c.req.query("organizationId");

  const ctx = session
    ? {
        userId: session.user.id,
        organizationId,
      }
    : undefined;

  // ... handle mutation with context
});
```

### Zero Queries (with org filtering)

```typescript
export const supportQueries = defineQueries({
  inbox: defineQuery(
    (_args, ctx: { organizationId: string }) =>
      zql.conversation.where({ organizationId: ctx.organizationId }),
    { order: [["lastMessageAt", "desc"]] },
  ),

  conversation: defineQuery((id: string, ctx: { organizationId: string }) =>
    zql.conversation.filter((c) =>
      c.id.equals(id).and(c.organizationId.equals(ctx.organizationId)),
    ),
  ),

  messages: defineQuery((conversationId: string) =>
    zql.message.where({ conversationId }),
  ),

  customers: defineQuery((_args, ctx: { organizationId: string }) =>
    zql.customer.where({ organizationId: ctx.organizationId }),
  ),

  teams: defineQuery((_args, ctx: { organizationId: string }) =>
    zql.team.where({ organizationId: ctx.organizationId }),
  ),

  channels: defineQuery((_args, ctx: { organizationId: string }) =>
    zql.whatsappChannel.where({ organizationId: ctx.organizationId }),
  ),
});
```

---

## UI Components (shadcn/ui)

### New Components

```
packages/ui/src/
├── support/
│   ├── inbox.tsx
│   ├── conversation-view.tsx
│   ├── message-bubble.tsx
│   ├── chat-input.tsx
│   ├── channel-badge.tsx
│   ├── ticket-card.tsx
│   └── customer-card.tsx
├── org/
│   ├── org-switcher.tsx
│   ├── member-list.tsx
│   └── invite-modal.tsx
├── billing/
│   ├── plan-card.tsx
│   └── seat-counter.tsx
└── channels/
    ├── whatsapp-config.tsx
    ├── email-config.tsx
    └── channel-card.tsx
```

---

## Web App Routes

```
apps/tanstack-start/src/routes/
├── (auth)/
│   ├── login.tsx
│   └── register.tsx
├── (app)/
│   ├── layout.tsx
│   ├── _index.tsx
│   ├── inbox/
│   ├── customers/
│   ├── tickets/
│   ├── team/
│   ├── channels/
│   │   ├── whatsapp/setup.tsx
│   │   └── email/setup.tsx
│   ├── settings/
│   │   └── billing.tsx
│   └── bots/
└── api/
    └── [...trpc].ts
```

---

## Mobile App Routes (Expo)

```
apps/expo/app/
├── (auth)/
│   ├── login.tsx
│   └── register.tsx
├── (tabs)/
│   ├── inbox.tsx
│   └── settings.tsx
├── conversation/
│   └── [id].tsx
└── customer/
    └── [id].tsx
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

- Database Schema with organizations
- Zero Schema Regeneration
- Auth Enhancement with org context
- Basic UI Shell with org switcher

### Phase 2: Channels (Week 2-3)

- WhatsApp Integration (webhook + send)
- Email Integration (SES)
- Real-time sync via Zero

### Phase 3: Core Support (Week 3-4)

- Inbox UI
- Customer Management
- Team Management

### Phase 4: Billing (Week 4-5)

- Stripe Integration
- Seat Management
- Plan upgrades

### Phase 5: Automation (Week 5-6)

- BotPress Integration
- Canned Responses
- SLA Tracking

### Phase 6: Mobile (Week 6-7)

- Expo App
- Push Notifications
- Offline support

---

## Environment Variables

```bash
# Database
POSTGRES_URL=

# Auth
AUTH_SECRET=

# AWS SES
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STARTER_PRICE_ID=
STRIPE_PRO_PRICE_ID=

# BotPress
BOTPRESS_API_KEY=
BOTPRESS_WORKSPACE_ID=
```

---

## Testing Checklist

- [ ] User can create organization
- [ ] User can switch between organizations
- [ ] Agents can only see their org's data
- [ ] WhatsApp messages route to correct org
- [ ] Email messages route to correct org
- [ ] Real-time updates via Zero
- [ ] Stripe billing for seats
- [ ] Seat limit enforced
- [ ] BotPress responses appear in conversation
- [ ] Mobile app syncs conversations
