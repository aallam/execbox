import { describe, expect, it } from "vitest";

describe("@execbox/quickjs package surface", () => {
  it("exports QuickJsExecutor from the dedicated executor package", async () => {
    const quickjs = await import("@execbox/quickjs");

    expect(quickjs).toHaveProperty("QuickJsExecutor");
  });

  it("exports the transport-backed runner from the dedicated subpath", async () => {
    const runner = await import("@execbox/quickjs/runner");

    expect(runner).toHaveProperty("runQuickJsSession");
  });

  it("exports the QuickJS protocol endpoint from a dedicated subpath", async () => {
    const endpoint = await import("@execbox/quickjs/runner/protocol-endpoint");

    expect(endpoint).toHaveProperty("attachQuickJsProtocolEndpoint");
  });
});
