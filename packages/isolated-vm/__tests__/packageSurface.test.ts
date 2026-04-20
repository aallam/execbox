import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("@execbox/isolated-vm package surface", () => {
  it("exports IsolatedVmExecutor from the dedicated executor package", async () => {
    const isolatedVm = await import("@execbox/isolated-vm");

    expect(isolatedVm).toHaveProperty("IsolatedVmExecutor");
  });

  it("exports the reusable runner from the dedicated subpath", async () => {
    const runner = await import("@execbox/isolated-vm/runner");

    expect(runner).toHaveProperty("runIsolatedVmSession");
  });

  it("keeps runtime core helpers on the internal core seam", () => {
    const source = readFileSync(
      new URL("../src/runner/index.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain(
      'import { resolveExecutorRuntimeOptions } from "@execbox/core/_internal";',
    );
  });
});
