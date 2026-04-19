import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const core = await import(
  pathToFileURL(path.join(repoRoot, "packages/core/dist/index.js")).href
);
const coreMcp = await import(
  pathToFileURL(path.join(repoRoot, "packages/core/dist/mcp/index.js")).href
);
const protocol = await import(
  pathToFileURL(path.join(repoRoot, "packages/protocol/dist/index.js")).href
);

assert.equal(typeof core.resolveProvider, "function");
assert.equal(typeof core.createToolCallDispatcher, "function");
assert.equal(typeof coreMcp.createMcpToolProvider, "function");
assert.equal(typeof coreMcp.openMcpToolProvider, "function");
assert.equal(typeof coreMcp.codeMcpServer, "function");
assert.equal(typeof protocol.runHostTransportSession, "function");
assert.equal(typeof protocol.createResourcePool, "function");
assert.equal(typeof protocol.getNodeTransportExecArgv, "function");

console.log("Built dist smoke test passed");
