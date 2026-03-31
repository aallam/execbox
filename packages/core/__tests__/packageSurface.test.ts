import { describe, expect, it } from "vitest";

describe("@execbox/core package surface", () => {
  it("exports the core symbols without bundling QuickJS", async () => {
    const core = await import("@execbox/core");

    expect(core).toHaveProperty("createToolCallDispatcher");
    expect(core).toHaveProperty("extractProviderManifests");
    expect(core).toHaveProperty("isExecuteFailureResult");
    expect(core).toHaveProperty("isExecuteSuccess");
    expect(core).toHaveProperty("normalizeCode");
    expect(core).toHaveProperty("sanitizeToolName");
    expect(core).toHaveProperty("resolveProvider");
    expect(core).not.toHaveProperty("QuickJsExecutor");
  });

  it("exports the MCP adapter symbols", async () => {
    const mcp = await import("@execbox/core/mcp");

    expect(mcp).toHaveProperty("createMcpToolProvider");
    expect(mcp).toHaveProperty("codeMcpServer");
    expect(mcp).toHaveProperty("openMcpToolProvider");
  });
});
