import type { Config } from "drizzle-kit";

// Use a dummy URL for schema-only operations (like drizzle-zero generation)
// Real DB operations require POSTGRES_URL to be set
const nonPoolingUrl = process.env.POSTGRES_URL
  ? process.env.POSTGRES_URL.replace(":6543", ":5432")
  : "postgresql://localhost:5432/dummy";

export default {
  dialect: "postgresql",
  // Pick up all our schema files
  schema: "./src/schema.ts",
  // schema: ["./src/**/*.sql.ts", "./src/**/*.relations.ts"],
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: { url: nonPoolingUrl },
} satisfies Config;
