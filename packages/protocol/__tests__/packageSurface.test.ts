import { describe, expect, it } from "vitest";

describe("@execbox/protocol package surface", () => {
  it("exports the transport-safe manifest and dispatcher helpers", async () => {
    const protocol = await import("@execbox/protocol");

    expect(protocol).toHaveProperty("extractProviderManifests");
    expect(protocol).toHaveProperty("createToolCallDispatcher");
    expect(protocol).toHaveProperty("runHostTransportSession");
  });
});
