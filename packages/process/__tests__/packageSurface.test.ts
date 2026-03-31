import { describe, expect, it } from "vitest";

describe("@execbox/process package surface", () => {
  it("exports ProcessExecutor from the dedicated process package", async () => {
    const processExecutor = await import("@execbox/process");

    expect(processExecutor).toHaveProperty("ProcessExecutor");
  });
});
