import type { Config } from "drizzle-kit";

if (!process.env.POSTGRES_URL) {
  throw new Error("Missing POSTGRES_URL");
}

const nonPoolingUrl = process.env.POSTGRES_URL.replace(":6543", ":5432");

export default {
  dialect: "postgresql",
  // Pick up all our schema files
  schema: "./src/schema.ts",
  // schema: ["./src/**/*.sql.ts", "./src/**/*.relations.ts"],
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: { url: nonPoolingUrl },
} satisfies Config;
