import { describe, expect, it } from "vitest";

import { unused } from "~/index";

// Infrastructure smoke test only; FITZ-30 adds substantive validation cases.
describe("validators unit project", () => {
  it("loads a TypeScript source export through the package alias", () => {
    expect(unused.parse("harness")).toBe("harness");
  });
});
