import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import type { ZeroContext } from "@fitzindustries/zero-shared";
import * as tables from "@fitzindustries/db/schema";
import { queries, schema } from "@fitzindustries/zero-shared";
import { zeroDrizzle } from "@fitzindustries/zero-shared/server";

// Deliberately do not load the developer .env. This suite inserts fixtures and
// must only run against an explicitly supplied, disposable test database.
const connectionString = process.env.TEST_POSTGRES_URL;
if (
  !connectionString ||
  !new URL(connectionString).pathname.endsWith("_test")
) {
  throw new Error(
    "TEST_POSTGRES_URL must name a disposable database ending in _test",
  );
}
const pool = new Pool({ connectionString });
const db = drizzle(pool, { schema: tables, casing: "snake_case" });
const provider = zeroDrizzle(schema, db);

function fixture() {
  return {
    userId: randomUUID(),
    organizationId: randomUUID(),
    membershipId: randomUUID(),
    customer: randomUUID(),
    conversation: randomUUID(),
    message: randomUUID(),
    team: randomUUID(),
    ticket: randomUUID(),
    note: randomUUID(),
    canned: randomUUID(),
    whatsapp: randomUUID(),
    email: randomUUID(),
    article: randomUUID(),
    audit: randomUUID(),
    metric: randomUUID(),
  };
}
const a = fixture();
const b = fixture();

before(async () => {
  for (const f of [a, b]) {
    await db.insert(tables.user).values({
      id: f.userId,
      name: "Tenant test",
      email: `${f.userId}@example.com`,
    });
    await db.insert(tables.organization).values({
      id: f.organizationId,
      name: "Tenant test",
      slug: f.organizationId,
    });
    await db.insert(tables.organizationMember).values({
      id: f.membershipId,
      userId: f.userId,
      organizationId: f.organizationId,
      role: "owner",
    });
    await db.insert(tables.customer).values({
      id: f.customer,
      organizationId: f.organizationId,
      name: f.customer,
    });
    await db
      .insert(tables.team)
      .values({ id: f.team, organizationId: f.organizationId, name: f.team });
    await db.insert(tables.conversation).values({
      id: f.conversation,
      organizationId: f.organizationId,
      customerId: f.customer,
      channel: "email",
      assignedAgentId: f.membershipId,
    });
    await db.insert(tables.message).values({
      id: f.message,
      conversationId: f.conversation,
      senderType: "customer",
      content: f.message,
      direction: "inbound",
    });
    await db.insert(tables.ticket).values({
      id: f.ticket,
      organizationId: f.organizationId,
      conversationId: f.conversation,
      ticketType: "info",
    });
    await db.insert(tables.internalNote).values({
      id: f.note,
      organizationId: f.organizationId,
      conversationId: f.conversation,
      agentId: f.membershipId,
      content: f.note,
    });
    await db.insert(tables.cannedResponse).values({
      id: f.canned,
      organizationId: f.organizationId,
      title: f.canned,
      content: "Test",
    });
    await db.insert(tables.whatsappChannel).values({
      id: f.whatsapp,
      organizationId: f.organizationId,
      name: "Test",
      phoneNumber: "+10000000000",
      phoneNumberId: f.whatsapp,
      accessTokenEncrypted: "test-only",
    });
    await db.insert(tables.emailChannel).values({
      id: f.email,
      organizationId: f.organizationId,
      name: "Test",
      emailAddress: `${f.email}@example.com`,
      fromName: "Test",
    });
    await db.insert(tables.article).values({
      id: f.article,
      organizationId: f.organizationId,
      title: "Test",
      slug: f.article,
      content: "Test",
    });
    await db.insert(tables.auditLog).values({
      id: f.audit,
      organizationId: f.organizationId,
      action: "test",
      resource: "test",
    });
    await db.insert(tables.conversationMetric).values({
      id: f.metric,
      organizationId: f.organizationId,
      conversationId: f.conversation,
    });
  }
});

// The caller owns the disposable DB and removes it after the run. Never truncate
// or reset tables here; closing the pool also lets failed runs terminate cleanly.
after(async () => {
  await pool.end();
});

type Fixture = ReturnType<typeof fixture>;
interface Case {
  name: string;
  run: (ctx: ZeroContext | undefined) => Promise<readonly { id: string }[]>;
  id: (f: Fixture) => string;
}
const cases: Case[] = [
  {
    name: "organizations.all",
    run: (ctx) => provider.run(queries.organizations.all.fn({ ctx })),
    id: (f) => f.organizationId,
  },
  {
    name: "organizationMembers.all",
    run: (ctx) => provider.run(queries.organizationMembers.all.fn({ ctx })),
    id: (f) => f.membershipId,
  },
  {
    name: "conversations.all",
    run: (ctx) => provider.run(queries.conversations.all.fn({ ctx })),
    id: (f) => f.conversation,
  },
  {
    name: "messages.all",
    run: (ctx) => provider.run(queries.messages.all.fn({ ctx })),
    id: (f) => f.message,
  },
  {
    name: "customers.all",
    run: (ctx) => provider.run(queries.customers.all.fn({ ctx })),
    id: (f) => f.customer,
  },
  {
    name: "teams.all",
    run: (ctx) => provider.run(queries.teams.all.fn({ ctx })),
    id: (f) => f.team,
  },
  {
    name: "tickets.all",
    run: (ctx) => provider.run(queries.tickets.all.fn({ ctx })),
    id: (f) => f.ticket,
  },
  {
    name: "internalNotes.all",
    run: (ctx) => provider.run(queries.internalNotes.all.fn({ ctx })),
    id: (f) => f.note,
  },
  {
    name: "cannedResponses.all",
    run: (ctx) => provider.run(queries.cannedResponses.all.fn({ ctx })),
    id: (f) => f.canned,
  },
  {
    name: "whatsappChannels.all",
    run: (ctx) => provider.run(queries.whatsappChannels.all.fn({ ctx })),
    id: (f) => f.whatsapp,
  },
  {
    name: "emailChannels.all",
    run: (ctx) => provider.run(queries.emailChannels.all.fn({ ctx })),
    id: (f) => f.email,
  },
  {
    name: "articles.all",
    run: (ctx) => provider.run(queries.articles.all.fn({ ctx })),
    id: (f) => f.article,
  },
  {
    name: "auditLogs.all",
    run: (ctx) => provider.run(queries.auditLogs.all.fn({ ctx })),
    id: (f) => f.audit,
  },
  {
    name: "conversationMetrics.all",
    run: (ctx) => provider.run(queries.conversationMetrics.all.fn({ ctx })),
    id: (f) => f.metric,
  },
  {
    name: "support.inbox",
    run: (ctx) =>
      provider.run(queries.support.inbox.fn({ args: { scope: "team" }, ctx })),
    id: (f) => f.conversation,
  },
  {
    name: "support.customers",
    run: (ctx) => provider.run(queries.support.customers.fn({ ctx })),
    id: (f) => f.customer,
  },
  {
    name: "support.tickets",
    run: (ctx) => provider.run(queries.support.tickets.fn({ ctx })),
    id: (f) => f.ticket,
  },
  {
    name: "support.members",
    run: (ctx) => provider.run(queries.support.members.fn({ ctx })),
    id: (f) => f.membershipId,
  },
];
void test("every registered query has an explicit isolation test or global exception", () => {
  const registered = Object.entries(queries)
    .filter(([namespace]) => namespace !== "~")
    .flatMap(([namespace, definitions]) =>
      Object.keys(definitions)
        .filter((name) => name !== "~")
        .map((name) => `${namespace}.${name}`),
    );
  const covered = [
    ...cases.map((entry) => entry.name),
    "support.conversation",
    "support.channels",
    "preferences.currentUser",
    "posts.all",
  ];
  assert.deepEqual(registered.sort(), covered.sort());
});

for (const entry of cases) {
  void test(`${entry.name}: both tenants see only their own rows; anonymous sees none`, async () => {
    assert.deepEqual(
      (await entry.run(a)).map((r) => r.id),
      [entry.id(a)],
    );
    assert.deepEqual(
      (await entry.run(b)).map((r) => r.id),
      [entry.id(b)],
    );
    assert.deepEqual(await entry.run(undefined), []);
  });
}

void test("single-record queries reject a different tenant's ID", async () => {
  assert.equal(
    await provider.run(
      queries.support.conversation.fn({ args: b.conversation, ctx: a }),
    ),
    undefined,
  );
  assert.equal(
    await provider.run(
      queries.support.conversation.fn({ args: a.conversation, ctx: undefined }),
    ),
    undefined,
  );
  for (const f of [a, b]) {
    assert.equal(
      (await provider.run(queries.preferences.currentUser.fn({ ctx: f })))?.id,
      f.userId,
    );
    const channels = await provider.run(
      queries.support.channels.fn({ ctx: f }),
    );
    assert.equal(channels?.id, f.organizationId);
    assert.deepEqual(
      channels.whatsappChannels.map((r) => r.id),
      [f.whatsapp],
    );
    assert.deepEqual(
      channels.emailChannels.map((r) => r.id),
      [f.email],
    );
  }
  assert.equal(
    await provider.run(queries.preferences.currentUser.fn({ ctx: undefined })),
    undefined,
  );
  assert.equal(
    await provider.run(queries.support.channels.fn({ ctx: undefined })),
    undefined,
  );
});

void test("generic messages cannot expose an orphaned conversation", async () => {
  await db.insert(tables.message).values({
    id: randomUUID(),
    conversationId: randomUUID(),
    senderType: "customer",
    direction: "inbound",
    content: "orphan",
  });
  assert.deepEqual(
    (await provider.run(queries.messages.all.fn({ ctx: a }))).map((r) => r.id),
    [a.message],
  );
});

void test("related records cannot cross tenants through inconsistent references", async () => {
  await db
    .update(tables.conversation)
    .set({ customerId: b.customer, assignedAgentId: b.membershipId })
    .where(eq(tables.conversation.id, a.conversation));
  await db
    .update(tables.conversation)
    .set({ customerId: a.customer })
    .where(eq(tables.conversation.id, b.conversation));
  await db
    .update(tables.ticket)
    .set({ conversationId: b.conversation })
    .where(eq(tables.ticket.id, a.ticket));
  await db
    .update(tables.ticket)
    .set({ conversationId: a.conversation })
    .where(eq(tables.ticket.id, b.ticket));

  const inbox = await provider.run(
    queries.support.inbox.fn({ args: { scope: "team" }, ctx: a }),
  );
  assert.equal(inbox.length, 1);
  assert.ok(!inbox[0]?.customer);
  assert.ok(!inbox[0]?.assignedAgent);
  const conversation = await provider.run(
    queries.support.conversation.fn({ args: a.conversation, ctx: a }),
  );
  assert.ok(conversation);
  assert.ok(!conversation.customer);
  assert.ok(!conversation.assignedAgent);
  assert.deepEqual(conversation.tickets, []);
  assert.deepEqual(
    conversation.messages.map((row) => row.id),
    [a.message],
  );
  const tickets = await provider.run(queries.support.tickets.fn({ ctx: a }));
  assert.equal(tickets.length, 1);
  assert.ok(!tickets[0]?.conversation);
  const customers = await provider.run(
    queries.support.customers.fn({ ctx: a }),
  );
  assert.deepEqual(customers[0]?.conversations, []);
});

void test("demo posts remain explicitly global", async () => {
  const id = randomUUID();
  await db
    .insert(tables.Post)
    .values({ id, title: "Demo", content: "Not tenant data" });
  const ids = (await provider.run(queries.posts.all.fn({ ctx: a }))).map(
    (r) => r.id,
  );
  assert.deepEqual(ids, [id]);
});
