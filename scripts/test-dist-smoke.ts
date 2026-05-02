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
const coreRuntime = await import(
  pathToFileURL(path.join(repoRoot, "packages/core/dist/runtime.js")).href
);
const coreRuntimeCjs = require(
  path.join(repoRoot, "packages/core/dist/runtime.cjs"),
) as Record<string, unknown>;
const quickjsRemoteEndpoint = await import(
  pathToFileURL(path.join(repoRoot, "packages/quickjs/dist/remoteEndpoint.js"))
    .href
);

assert.equal(typeof core.resolveProvider, "function");
assert.equal(core.assertValidIdentifier, undefined);
assert.equal(core.createToolCallDispatcher, undefined);
assert.equal(typeof coreMcp.createMcpToolProvider, "function");
assert.equal(typeof coreMcp.openMcpToolProvider, "function");
assert.equal(typeof coreMcp.codeMcpServer, "function");
assert.equal(core.generateTypesFromJsonSchema, undefined);
assert.equal(core.isJsonSerializable, undefined);
assert.equal(core.sanitizeIdentifier, undefined);
assert.equal(core.sanitizeToolName, undefined);
assert.equal(core.serializePropertyName, undefined);
assert.equal(typeof coreProtocol.runHostTransportSession, "function");
assert.equal(typeof coreProtocol.createResourcePool, "function");
assert.equal(typeof coreProtocol.getNodeTransportExecArgv, "function");
assert.equal(typeof coreRuntime.resolveExecutorRuntimeOptions, "function");
assert.equal(typeof coreRuntime.createTimeoutExecuteResult, "function");
assert.equal(typeof coreRuntimeCjs.resolveExecutorRuntimeOptions, "function");
assert.equal(typeof coreRuntimeCjs.createTimeoutExecuteResult, "function");
assert.equal(
  typeof quickjsRemoteEndpoint.attachQuickJsRemoteEndpoint,
  "function",
);

console.log("Built dist smoke test passed");
