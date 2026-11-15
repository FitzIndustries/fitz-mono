import { describe, expect, it } from "vitest";

import { schema } from "~/index";
import { queries } from "~/queries";

// Does not connect to Postgres or Zero Cache. Database-backed isolation tests
// remain under apps/hono-api/tests with their own explicit command.
describe("Zero Shared unit project", () => {
  it("loads the schema and query registry without service credentials", () => {
    expect(schema.tables.organization.name).toBe("organization");
    expect(typeof queries.organizations.all.fn).toBe("function");
  });
});
