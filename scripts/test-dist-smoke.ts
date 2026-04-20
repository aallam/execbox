import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const require = createRequire(import.meta.url);

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
const coreInternal = await import(
  pathToFileURL(path.join(repoRoot, "packages/core/dist/_internal/index.js"))
    .href
);
const coreInternalCjs = require(
  path.join(repoRoot, "packages/core/dist/_internal/index.cjs"),
) as Record<string, unknown>;

assert.equal(typeof core.resolveProvider, "function");
assert.equal(typeof core.createToolCallDispatcher, "function");
assert.equal(typeof coreMcp.createMcpToolProvider, "function");
assert.equal(typeof coreMcp.openMcpToolProvider, "function");
assert.equal(typeof coreMcp.codeMcpServer, "function");
assert.equal(typeof coreProtocol.runHostTransportSession, "function");
assert.equal(typeof coreProtocol.createResourcePool, "function");
assert.equal(typeof coreProtocol.getNodeTransportExecArgv, "function");
assert.equal(typeof coreInternal.resolveExecutorRuntimeOptions, "function");
assert.equal(typeof coreInternal.createTimeoutExecuteResult, "function");
assert.equal(typeof coreInternalCjs.resolveExecutorRuntimeOptions, "function");
assert.equal(typeof coreInternalCjs.createTimeoutExecuteResult, "function");

console.log("Built dist smoke test passed");
