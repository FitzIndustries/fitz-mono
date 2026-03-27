import { serve } from "@hono/node-server";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { z } from "zod/v4";

import { appRouter, createTRPCContext } from "@fitzindustries/api";
import { eq } from "@fitzindustries/db";
import { db, dbProvider } from "@fitzindustries/db/client";
import {
  conversation,
  emailChannel,
  message,
  organization,
  organizationMember,
  ticket,
  user,
  whatsappChannel,
} from "@fitzindustries/db/schema";
import { mutators, queries, schema } from "@fitzindustries/zero-shared";
import {
  handleMutateRequest,
  handleQueryRequest,
} from "@fitzindustries/zero-shared/server";
import { mustGetMutator, mustGetQuery } from "@fitzindustries/zero-shared/zero";

import { env } from "~/env";
import { auth } from "./auth";
import { encryptChannelSecret } from "./lib/channel-crypto";
import {
  canAccessOrganization,
  ensureViewerOrganization,
  getViewerState,
  getViewerStateFromRequest,
  persistCurrentOrganization,
} from "./lib/viewer";
import { handleEmailWebhook, sendEmail } from "./webhooks/email";
import {
  handleWhatsAppWebhook,
  sendWhatsAppMessage,
} from "./webhooks/whatsapp";

const app = new Hono();

app.use(logger());
app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "trpc-accept",
      "x-trpc-source",
      "Cookie",
    ],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);

app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/api/viewer", async (c) => {
  const state = await ensureViewerOrganization(c);
  if (!state) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return c.json(state.viewer);
});

app.get("/api/preferences", async (c) => {
  const state = await getViewerState(c);
  if (!state) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, state.session.user.id),
  });

  return c.json({
    preferences: {
      themeMode: currentUser?.themeMode ?? "auto",
    },
  });
});

app.put("/api/preferences", async (c) => {
  const state = await getViewerState(c);
  if (!state) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body: unknown = await c.req.json();
  const parsed = z
    .object({
      themeMode: z.enum(["light", "dark", "auto"]),
    })
    .safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid preferences payload" }, 400);
  }

  const [updatedUser] = await db
    .update(user)
    .set({
      themeMode: parsed.data.themeMode,
      updatedAt: new Date(),
    })
    .where(eq(user.id, state.session.user.id))
    .returning();

  return c.json({
    preferences: {
      themeMode: updatedUser?.themeMode ?? parsed.data.themeMode,
    },
  });
});

app.post("/api/viewer/organization", async (c) => {
  const state = await getViewerState(c);
  if (!state) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body: unknown = await c.req.json();
  const parsed = z
    .object({ organizationId: z.string().uuid() })
    .safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid organization selection" }, 400);
  }

  const membership = await canAccessOrganization(
    state.session.user.id,
    parsed.data.organizationId,
  );
  if (!membership) {
    return c.json({ error: "Organization not found" }, 404);
  }

  persistCurrentOrganization(c, parsed.data.organizationId);
  return c.json({ ok: true });
});

app.get("/api/organization", async (c) => {
  const state = await ensureViewerOrganization(c);
  if (!state?.viewer.currentOrganizationId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const currentOrganizationId = state.viewer.currentOrganizationId;

  const currentOrganization = await db.query.organization.findFirst({
    where: eq(organization.id, currentOrganizationId),
  });

  return c.json({ organization: currentOrganization });
});

app.put("/api/organization", async (c) => {
  const state = await ensureViewerOrganization(c);
  if (!state?.viewer.currentOrganizationId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const currentOrganizationId = state.viewer.currentOrganizationId;

  const body: unknown = await c.req.json();
  const parsed = z
    .object({
      name: z.string().min(1).max(255),
      slug: z
        .string()
        .min(1)
        .max(100)
        .regex(/^[a-z0-9-]+$/),
      logoUrl: z.string().url().nullable().optional(),
      settings: z.record(z.string(), z.unknown()).default({}),
    })
    .safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid organization payload" }, 400);
  }

  const existingWithSlug = await db.query.organization.findFirst({
    where: eq(organization.slug, parsed.data.slug),
  });

  if (existingWithSlug && existingWithSlug.id !== currentOrganizationId) {
    return c.json({ error: "Subdomain is already in use" }, 409);
  }

  const [updated] = await db
    .update(organization)
    .set({
      name: parsed.data.name,
      slug: parsed.data.slug,
      logoUrl: parsed.data.logoUrl ?? null,
      settings: parsed.data.settings,
      updatedAt: new Date(),
    })
    .where(eq(organization.id, currentOrganizationId))
    .returning();

  return c.json({ organization: updated });
});

app.get("/api/team", async (c) => {
  const state = await ensureViewerOrganization(c);
  if (!state?.viewer.currentOrganizationId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const currentOrganizationId = state.viewer.currentOrganizationId;

  const memberships = await db.query.organizationMember.findMany({
    where: eq(organizationMember.organizationId, currentOrganizationId),
    orderBy: (membershipsTable, { asc }) => [asc(membershipsTable.createdAt)],
  });

  const userIds = memberships.map((membership) => membership.userId);
  const users = userIds.length
    ? await db.query.user.findMany({
        where: (usersTable, { inArray }) => inArray(usersTable.id, userIds),
      })
    : [];
  const usersById = new Map(
    users.map((memberUser) => [memberUser.id, memberUser]),
  );

  return c.json({
    members: memberships.map((membership) => ({
      ...membership,
      user: usersById.get(membership.userId) ?? null,
    })),
  });
});

app.post("/api/team", async (c) => {
  const state = await ensureViewerOrganization(c);
  if (
    !state?.viewer.currentOrganizationId ||
    !state.viewer.currentMembershipId
  ) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const currentOrganizationId = state.viewer.currentOrganizationId;

  const body: unknown = await c.req.json();
  const parsed = z
    .object({
      email: z.string().email(),
      role: z.enum(["owner", "admin", "agent", "viewer"]),
    })
    .safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid team member payload" }, 400);
  }

  const memberUser = await db.query.user.findFirst({
    where: eq(user.email, parsed.data.email),
  });
  if (!memberUser) {
    return c.json(
      {
        error: "That user needs to create an account before they can be added.",
      },
      404,
    );
  }

  const existingMembership = await db.query.organizationMember.findFirst({
    where: (membershipsTable, { and }) =>
      and(
        eq(membershipsTable.organizationId, currentOrganizationId),
        eq(membershipsTable.userId, memberUser.id),
      ),
  });

  if (existingMembership?.isActive) {
    return c.json(
      { error: "That user is already part of this workspace." },
      409,
    );
  }

  const currentOrganization = await db.query.organization.findFirst({
    where: eq(organization.id, currentOrganizationId),
  });
  if (!currentOrganization) {
    return c.json({ error: "Organization not found" }, 404);
  }

  const activeSeatCount = await countActiveMembers(currentOrganizationId);
  const isReactivation = !!existingMembership && !existingMembership.isActive;
  if (
    (isReactivation || !existingMembership) &&
    activeSeatCount >= (currentOrganization.seatLimit ?? 0)
  ) {
    return c.json({ error: "Seat limit reached for this plan" }, 409);
  }

  if (existingMembership) {
    const [updatedMembership] = await db
      .update(organizationMember)
      .set({
        role: parsed.data.role,
        isActive: true,
        invitedBy: state.session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(organizationMember.id, existingMembership.id))
      .returning();

    await syncSeatUsage(currentOrganizationId);

    return c.json({ member: updatedMembership });
  }

  const [newMembership] = await db
    .insert(organizationMember)
    .values({
      id: crypto.randomUUID(),
      organizationId: currentOrganizationId,
      userId: memberUser.id,
      role: parsed.data.role,
      invitedBy: state.session.user.id,
      isActive: true,
    })
    .returning();

  await syncSeatUsage(currentOrganizationId);

  return c.json({ member: newMembership });
});

app.patch("/api/team/:memberId", async (c) => {
  const state = await ensureViewerOrganization(c);
  if (!state?.viewer.currentOrganizationId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const currentOrganizationId = state.viewer.currentOrganizationId;

  const body: unknown = await c.req.json();
  const parsed = z
    .object({
      role: z.enum(["owner", "admin", "agent", "viewer"]).optional(),
      isActive: z.boolean().optional(),
    })
    .safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid team member update" }, 400);
  }

  const member = await db.query.organizationMember.findFirst({
    where: eq(organizationMember.id, c.req.param("memberId")),
  });
  if (member?.organizationId !== currentOrganizationId) {
    return c.json({ error: "Team member not found" }, 404);
  }

  const [updatedMembership] = await db
    .update(organizationMember)
    .set({
      role: parsed.data.role ?? member.role,
      isActive: parsed.data.isActive ?? member.isActive,
      updatedAt: new Date(),
    })
    .where(eq(organizationMember.id, member.id))
    .returning();

  await syncSeatUsage(currentOrganizationId);

  return c.json({ member: updatedMembership });
});

app.get("/api/billing", async (c) => {
  const state = await ensureViewerOrganization(c);
  if (!state?.viewer.currentOrganizationId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const currentOrganization = await db.query.organization.findFirst({
    where: eq(organization.id, state.viewer.currentOrganizationId),
  });

  return c.json({ billing: currentOrganization });
});

app.put("/api/billing", async (c) => {
  const state = await ensureViewerOrganization(c);
  if (!state?.viewer.currentOrganizationId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const currentOrganizationId = state.viewer.currentOrganizationId;

  const body: unknown = await c.req.json();
  const parsed = z
    .object({
      plan: z.enum(["starter", "pro", "enterprise"]),
      seatLimit: z.number().int().min(1).max(10_000),
    })
    .safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid billing payload" }, 400);
  }

  const [updatedOrganization] = await db
    .update(organization)
    .set({
      plan: parsed.data.plan,
      seatLimit: parsed.data.seatLimit,
      updatedAt: new Date(),
    })
    .where(eq(organization.id, currentOrganizationId))
    .returning();

  return c.json({ billing: updatedOrganization });
});

app.post("/api/conversations/:conversationId/reply", async (c) => {
  const state = await ensureViewerOrganization(c);
  if (
    !state?.viewer.currentOrganizationId ||
    !state.viewer.currentMembershipId
  ) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const currentOrganizationId = state.viewer.currentOrganizationId;

  const body: unknown = await c.req.json();
  const parsed = z
    .object({
      content: z.string().min(1).max(10_000),
    })
    .safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid reply payload" }, 400);
  }

  const currentConversation = await db.query.conversation.findFirst({
    where: eq(conversation.id, c.req.param("conversationId")),
    with: {
      customer: true,
    },
  });

  if (currentConversation?.organizationId !== currentOrganizationId) {
    return c.json({ error: "Conversation not found" }, 404);
  }

  try {
    if (currentConversation.channel === "whatsapp") {
      if (
        !currentConversation.channelId ||
        !currentConversation.customer.phone
      ) {
        return c.json({ error: "Missing WhatsApp delivery details" }, 400);
      }

      await sendWhatsAppMessage(
        currentConversation.channelId,
        currentConversation.customer.phone,
        parsed.data.content,
      );
    } else {
      if (
        !currentConversation.channelId ||
        !currentConversation.customer.email
      ) {
        return c.json({ error: "Missing email delivery details" }, 400);
      }

      await sendEmail(
        currentConversation.channelId,
        currentConversation.customer.email,
        currentConversation.subject
          ? `Re: ${currentConversation.subject}`
          : "Support update",
        `<p>${escapeHtml(parsed.data.content).replace(/\n/g, "<br />")}</p>`,
      );
    }

    const now = new Date();
    const [createdMessage] = await db
      .insert(message)
      .values({
        id: crypto.randomUUID(),
        conversationId: currentConversation.id,
        senderType: "agent",
        senderId: state.viewer.currentMembershipId,
        content: parsed.data.content,
        contentType: "text",
        direction: "outbound",
        metadata: { delivered: true },
        createdAt: now,
      })
      .returning();

    await db
      .update(conversation)
      .set({
        assignedAgentId:
          currentConversation.assignedAgentId ??
          state.viewer.currentMembershipId,
        lastMessageAt: now,
        updatedAt: now,
      })
      .where(eq(conversation.id, currentConversation.id));

    return c.json({ message: createdMessage });
  } catch (error) {
    console.error("Failed to deliver support reply", error);
    return c.json({ error: "Failed to deliver reply" }, 500);
  }
});

app.post("/api/tickets", async (c) => {
  const state = await ensureViewerOrganization(c);
  if (
    !state?.viewer.currentOrganizationId ||
    !state.viewer.currentMembershipId
  ) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const currentOrganizationId = state.viewer.currentOrganizationId;

  const body: unknown = await c.req.json();
  const parsed = z
    .object({
      conversationId: z.string().uuid(),
      ticketType: z.enum(["booking", "refund", "info", "complaint", "other"]),
      priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
      eventId: z.string().optional().nullable(),
      orderId: z.string().optional().nullable(),
    })
    .safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid ticket payload" }, 400);
  }

  const currentConversation = await db.query.conversation.findFirst({
    where: eq(conversation.id, parsed.data.conversationId),
  });

  if (currentConversation?.organizationId !== currentOrganizationId) {
    return c.json({ error: "Conversation not found" }, 404);
  }

  const openTicket = await db.query.ticket.findFirst({
    where: eq(ticket.conversationId, currentConversation.id),
    orderBy: (ticketsTable, { desc }) => [desc(ticketsTable.createdAt)],
  });

  if (openTicket && openTicket.status !== "closed") {
    return c.json({ ticket: openTicket, duplicate: true });
  }

  const [createdTicket] = await db
    .insert(ticket)
    .values({
      id: crypto.randomUUID(),
      organizationId: currentOrganizationId,
      conversationId: currentConversation.id,
      ticketType: parsed.data.ticketType,
      priority: parsed.data.priority,
      status: "open",
      eventId: parsed.data.eventId ?? null,
      orderId: parsed.data.orderId ?? null,
    })
    .returning();

  return c.json({ ticket: createdTicket });
});

app.get("/api/channels", async (c) => {
  const state = await ensureViewerOrganization(c);
  if (!state?.viewer.currentOrganizationId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const currentOrganizationId = state.viewer.currentOrganizationId;

  const [whatsapp, email] = await Promise.all([
    db.query.whatsappChannel.findFirst({
      where: eq(whatsappChannel.organizationId, currentOrganizationId),
    }),
    db.query.emailChannel.findFirst({
      where: eq(emailChannel.organizationId, currentOrganizationId),
    }),
  ]);

  return c.json({
    whatsapp: whatsapp
      ? {
          id: whatsapp.id,
          name: whatsapp.name,
          phoneNumber: whatsapp.phoneNumber,
          phoneNumberId: whatsapp.phoneNumberId,
          webhookVerifyToken: whatsapp.webhookVerifyToken,
          isActive: whatsapp.isActive,
        }
      : null,
    email,
  });
});

app.put("/api/channels/whatsapp", async (c) => {
  const state = await ensureViewerOrganization(c);
  if (!state?.viewer.currentOrganizationId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const currentOrganizationId = state.viewer.currentOrganizationId;

  const body: unknown = await c.req.json();
  const parsed = z
    .object({
      name: z.string().min(1).max(100),
      phoneNumber: z.string().min(1).max(20),
      phoneNumberId: z.string().min(1).max(100),
      accessToken: z.string().min(1).optional(),
      webhookVerifyToken: z.string().min(1),
      isActive: z.boolean().default(true),
    })
    .safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid WhatsApp channel payload" }, 400);
  }

  const existingChannel = await db.query.whatsappChannel.findFirst({
    where: eq(whatsappChannel.organizationId, currentOrganizationId),
  });

  const values = {
    organizationId: currentOrganizationId,
    name: parsed.data.name,
    phoneNumber: parsed.data.phoneNumber,
    phoneNumberId: parsed.data.phoneNumberId,
    accessTokenEncrypted:
      parsed.data.accessToken && parsed.data.accessToken.length > 0
        ? encryptChannelSecret(parsed.data.accessToken)
        : (existingChannel?.accessTokenEncrypted ?? ""),
    webhookVerifyToken: parsed.data.webhookVerifyToken,
    isActive: parsed.data.isActive,
    updatedAt: new Date(),
  };

  if (!values.accessTokenEncrypted) {
    return c.json({ error: "Access token is required" }, 400);
  }

  const channel = existingChannel
    ? (
        await db
          .update(whatsappChannel)
          .set(values)
          .where(eq(whatsappChannel.id, existingChannel.id))
          .returning()
      )[0]
    : (
        await db
          .insert(whatsappChannel)
          .values({ id: crypto.randomUUID(), ...values })
          .returning()
      )[0];

  if (!channel) {
    return c.json({ error: "Failed to save WhatsApp channel" }, 500);
  }

  return c.json({
    whatsapp: {
      id: channel.id,
      name: channel.name,
      phoneNumber: channel.phoneNumber,
      phoneNumberId: channel.phoneNumberId,
      webhookVerifyToken: channel.webhookVerifyToken,
      isActive: channel.isActive,
    },
  });
});

app.put("/api/channels/email", async (c) => {
  const state = await ensureViewerOrganization(c);
  if (!state?.viewer.currentOrganizationId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const currentOrganizationId = state.viewer.currentOrganizationId;

  const body: unknown = await c.req.json();
  const parsed = z
    .object({
      name: z.string().min(1).max(100),
      emailAddress: z.string().email(),
      fromName: z.string().min(1).max(100),
      awsSesArn: z.string().optional().nullable(),
      isActive: z.boolean().default(true),
    })
    .safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid email channel payload" }, 400);
  }

  const existingChannel = await db.query.emailChannel.findFirst({
    where: eq(emailChannel.organizationId, currentOrganizationId),
  });

  const values = {
    organizationId: currentOrganizationId,
    name: parsed.data.name,
    emailAddress: parsed.data.emailAddress,
    fromName: parsed.data.fromName,
    awsSesArn: parsed.data.awsSesArn ?? null,
    awsSesVerified: !!parsed.data.awsSesArn,
    isActive: parsed.data.isActive,
    updatedAt: new Date(),
  };

  const channel = existingChannel
    ? (
        await db
          .update(emailChannel)
          .set(values)
          .where(eq(emailChannel.id, existingChannel.id))
          .returning()
      )[0]
    : (
        await db
          .insert(emailChannel)
          .values({ id: crypto.randomUUID(), ...values })
          .returning()
      )[0];

  return c.json({ email: channel });
});

app.on(["GET", "POST"], "/api/auth/**", (c) => auth.handler(c.req.raw));
app.get("/api/webhooks/whatsapp", handleWhatsAppWebhook);
app.post("/api/webhooks/whatsapp", handleWhatsAppWebhook);
app.post("/api/webhooks/email", handleEmailWebhook);

app.use(
  "/api/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext: (_opts, c) =>
      createTRPCContext({
        auth,
        headers: c.req.raw.headers,
      }),
    onError: ({ error, path }) => {
      console.error(`>>> tRPC Error on '${path}'`, error);
    },
  }),
);

app.post("/api/zero/query", async (c) => {
  const ctx = await getZeroContext(c.req.raw);

  if (!ctx) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const result = await handleQueryRequest(
    (name, args) => {
      const query = mustGetQuery(queries, name);
      return query.fn({ args, ctx });
    },
    schema,
    c.req.raw,
  );

  return c.json(result);
});

app.post("/api/zero/mutate", async (c) => {
  const ctx = await getZeroContext(c.req.raw);

  if (!ctx) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const result = await handleMutateRequest(
    dbProvider,
    (transact) =>
      transact((tx, name, args) => {
        const mutator = mustGetMutator(mutators, name);
        return mutator.fn({ args, tx, ctx });
      }),
    c.req.raw,
  );

  return c.json(result);
});

const port = env.PORT;

console.log(`Starting API server on port ${String(port)}`);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API server running at http://localhost:${String(info.port)}`);
});

async function getZeroContext(request: Request) {
  const state = await getViewerStateFromRequest(request);

  if (!state) {
    return undefined;
  }

  if (!state.viewer.currentOrganizationId) {
    return undefined;
  }

  return {
    userId: state.session.user.id,
    organizationId: state.viewer.currentOrganizationId,
    membershipId: state.viewer.currentMembershipId,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function countActiveMembers(organizationId: string) {
  const memberships = await db.query.organizationMember.findMany({
    where: eq(organizationMember.organizationId, organizationId),
  });

  return memberships.filter((membership) => membership.isActive).length;
}

async function syncSeatUsage(organizationId: string) {
  const seatUsed = await countActiveMembers(organizationId);

  await db
    .update(organization)
    .set({ seatUsed, updatedAt: new Date() })
    .where(eq(organization.id, organizationId));
}
