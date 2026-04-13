import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ci workflow", () => {
  it("declares least-privilege GITHUB_TOKEN permissions", () => {
    const workflow = readFileSync(
      new URL("../../../../.github/workflows/ci.yml", import.meta.url),
      "utf8",
    );

    expect(workflow).toContain("permissions:");
    expect(workflow).toContain("contents: read");
  });
});
