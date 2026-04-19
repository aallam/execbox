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
const coreProtocol = await import(
  pathToFileURL(path.join(repoRoot, "packages/core/dist/protocol/index.js"))
    .href
);

assert.equal(typeof core.resolveProvider, "function");
assert.equal(typeof core.createToolCallDispatcher, "function");
assert.equal(typeof coreMcp.createMcpToolProvider, "function");
assert.equal(typeof coreMcp.openMcpToolProvider, "function");
assert.equal(typeof coreMcp.codeMcpServer, "function");
assert.equal(typeof coreProtocol.runHostTransportSession, "function");
assert.equal(typeof coreProtocol.createResourcePool, "function");
assert.equal(typeof coreProtocol.getNodeTransportExecArgv, "function");

console.log("Built dist smoke test passed");
