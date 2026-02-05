import { zeroDrizzle } from "@rocicorp/zero/server/adapters/drizzle";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { schema } from "@fitzindustries/zero-shared";

import * as drizzleSchema from "./schema";

const connectionString = process.env.POSTGRES_URL;
if (typeof connectionString !== "string" || connectionString === "") {
  throw new Error("POSTGRES_URL environment variable is required");
}

const pool = new Pool({ connectionString });

export const db = drizzle(pool, {
  schema: drizzleSchema,
  casing: "snake_case",
});

export const dbProvider = zeroDrizzle(schema, db);

// Register the database provider for type safety
declare module "@rocicorp/zero" {
  interface DefaultTypes {
    dbProvider: typeof dbProvider;
  }
}
