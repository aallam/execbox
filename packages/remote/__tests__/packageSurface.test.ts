import { describe, expect, it } from "vitest";

describe("@execbox/remote package surface", () => {
  it("exports RemoteExecutor and attachQuickJsRemoteEndpoint", async () => {
    const remote = await import("@execbox/remote");

    expect(remote).toHaveProperty("RemoteExecutor");
    expect(remote).toHaveProperty("attachQuickJsRemoteEndpoint");
  });
});
