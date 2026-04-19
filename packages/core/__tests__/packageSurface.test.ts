import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("@execbox/core package surface", () => {
  it("exports the core symbols without bundling QuickJS", async () => {
    const core = await import("@execbox/core");

    expect(core).toHaveProperty("createToolCallDispatcher");
    expect(core).toHaveProperty("extractProviderManifests");
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

  it("declares the protocol transport helpers under the core package", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as {
      exports: Record<string, unknown>;
    };

    expect(packageJson.exports).toHaveProperty("./protocol");
  });

  it("exports the protocol transport helpers without re-exporting core dispatch", async () => {
    const protocol = await import("@execbox/core/protocol");

    expect(protocol).toHaveProperty("runHostTransportSession");
    expect(protocol).toHaveProperty("createResourcePool");
    expect(protocol).not.toHaveProperty("createToolCallDispatcher");
    expect(protocol).not.toHaveProperty("extractProviderManifests");
  });
});
