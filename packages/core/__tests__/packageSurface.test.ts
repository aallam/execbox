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

  it("declares an internal helper subpath for execbox-owned packages", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as {
      exports: Record<string, unknown>;
    };

    expect(packageJson.exports).toHaveProperty("./_internal");
  });

  it("exports the protocol transport helpers without re-exporting core dispatch", async () => {
    const protocol = await import("@execbox/core/protocol");

    expect(protocol).toHaveProperty("runHostTransportSession");
    expect(protocol).toHaveProperty("createResourcePool");
    expect(protocol).toHaveProperty("isDispatcherMessage");
    expect(protocol).toHaveProperty("isRunnerMessage");
    expect(protocol).not.toHaveProperty("createToolCallDispatcher");
    expect(protocol).not.toHaveProperty("extractProviderManifests");
  });

  it("exports the internal helper seam without promoting it onto public entrypoints", async () => {
    const core = await import("@execbox/core");
    const protocol = await import("@execbox/core/protocol");
    const internal = await import("@execbox/core/_internal");

    expect(internal).toHaveProperty("createTimeoutExecuteResult");
    expect(internal).toHaveProperty("resolveExecutorRuntimeOptions");
    expect(internal).toHaveProperty("createToolCallDispatcher");
    expect(internal).toHaveProperty("extractProviderManifests");
    expect(internal).toHaveProperty("ExecuteFailure");

    expect(core).not.toHaveProperty("isDispatcherMessage");
    expect(protocol).not.toHaveProperty("createTimeoutExecuteResult");
  });
});
