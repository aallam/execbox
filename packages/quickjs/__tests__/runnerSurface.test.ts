import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("@execbox/quickjs runner surface", () => {
  it("keeps runtime core helpers source-local for prebuild execution", () => {
    const source = readFileSync(
      new URL("../src/runner/index.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain('} from "@execbox/core/_internal";');
  });

  it("exports runQuickJsSession for transport-backed runtimes", async () => {
    const runner = await import("../src/runner/index.ts");

    expect(runner).toHaveProperty("runQuickJsSession");
  });
});
