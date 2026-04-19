import { describe, expect, it } from "vitest";

describe("@execbox/protocol package surface", () => {
  it("keeps only transport-safe session helpers on the public surface", async () => {
    const protocol = await import("@execbox/protocol");

    expect(protocol).not.toHaveProperty("extractProviderManifests");
    expect(protocol).not.toHaveProperty("createToolCallDispatcher");
    expect(protocol).toHaveProperty("createResourcePool");
    expect(protocol).toHaveProperty("getNodeTransportExecArgv");
    expect(protocol).toHaveProperty("runHostTransportSession");
  });
});
