import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as tables from "@fitzindustries/db/schema";

import { assertTestEnvironment } from "./integration-safety.mjs";

// Deterministic data only, no assertions, no sessions/accounts with real credentials,
// no channel credentials and no email/webhook dispatch. Fresh DB required each run.
assertTestEnvironment();
const pool = new Pool({ connectionString: process.env.TEST_POSTGRES_URL });
const db = drizzle(pool, { schema: tables, casing: "snake_case" });
const timestamp = new Date("2026-01-01T00:00:00.000Z");
try {
  await db.transaction(async (tx) => {
    for (const tenant of ["a", "b"]) {
      const id = `00000000-0000-4000-8000-00000000000${tenant === "a" ? "1" : "2"}`;
      await tx.insert(tables.user).values({
        id,
        name: `Test ${tenant}`,
        email: `${tenant}@example.invalid`,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      await tx.insert(tables.organization).values({
        id,
        name: `Test ${tenant}`,
        slug: `fitz-test-${tenant}`,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      await tx.insert(tables.organizationMember).values({
        id,
        userId: id,
        organizationId: id,
        role: "owner",
        joinedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      await tx.insert(tables.customer).values({
        id,
        organizationId: id,
        name: `Customer ${tenant}`,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      await tx.insert(tables.conversation).values({
        id,
        organizationId: id,
        customerId: id,
        channel: "email",
        assignedAgentId: id,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      await tx.insert(tables.message).values({
        id,
        conversationId: id,
        senderType: "customer",
        direction: "inbound",
        content: `Fixture ${tenant}`,
        createdAt: timestamp,
      });
    }
  });
  console.log("Deterministic tenants fitz-test-a and fitz-test-b inserted");
} finally {
  await pool.end();
}
