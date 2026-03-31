import { describe, expect, it } from "vitest";

describe("@execbox/worker package surface", () => {
  it("exports WorkerExecutor from the dedicated worker package", async () => {
    const worker = await import("@execbox/worker");

    expect(worker).toHaveProperty("WorkerExecutor");
  });
});
