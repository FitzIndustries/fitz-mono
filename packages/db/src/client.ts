import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const connectionString = process.env.POSTGRES_URL;
if (typeof connectionString !== "string" || connectionString === "") {
  throw new Error("POSTGRES_URL environment variable is required");
}

const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema, casing: "snake_case" });
