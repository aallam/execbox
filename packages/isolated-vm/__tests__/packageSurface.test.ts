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
});
