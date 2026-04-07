# @execbox/core

Executor-agnostic core for guest JavaScript that can call host tools directly or wrap MCP servers and clients into callable namespaces.

[![npm version](https://img.shields.io/npm/v/%40execbox%2Fcore?style=flat-square)](https://www.npmjs.com/package/@execbox/core)
[![License](https://img.shields.io/github/license/aallam/execbox?style=flat-square)](https://github.com/aallam/execbox/blob/main/LICENSE)

Docs: https://execbox.aallam.com

## What You Get

- Resolve host tools into deterministic guest namespaces with name sanitization.
- Validate tool inputs and outputs with JSON Schema, full Zod schemas, or MCP SDK-style raw Zod shapes.
- Normalize user code before execution and generate namespace typings from resolved schemas.
- Wrap MCP servers or clients into execbox providers, or expose code-execution tools from an MCP server.

## Pair It With an Executor

`@execbox/core` does not execute code on its own. Pair it with one of the executor packages:

| Package                                                                      | Best for                                                             |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [`@execbox/quickjs`](https://www.npmjs.com/package/@execbox/quickjs)         | Easiest setup, no native addon, good default backend                 |
| [`@execbox/remote`](https://www.npmjs.com/package/@execbox/remote)           | Same executor API, but with a caller-supplied remote boundary        |
| [`@execbox/process`](https://www.npmjs.com/package/@execbox/process)         | QuickJS execution in a child process with a stronger lifecycle split |
| [`@execbox/worker`](https://www.npmjs.com/package/@execbox/worker)           | QuickJS execution on a worker thread with a message boundary         |
| [`@execbox/isolated-vm`](https://www.npmjs.com/package/@execbox/isolated-vm) | Native `isolated-vm` backend when you specifically want that runtime |

## Examples

- [Basic provider execution](https://github.com/aallam/execbox/blob/main/examples/execbox-basic.ts)
- [Process-backed provider execution](https://github.com/aallam/execbox/blob/main/examples/execbox-process.ts)
- [Remote provider execution](https://github.com/aallam/execbox/blob/main/examples/execbox-remote.ts)
- [Worker-backed provider execution](https://github.com/aallam/execbox/blob/main/examples/execbox-worker.ts)
- [Wrap MCP tools into a provider](https://github.com/aallam/execbox/blob/main/examples/execbox-mcp-provider.ts)
- [Expose MCP code-execution tools from a server](https://github.com/aallam/execbox/blob/main/examples/execbox-mcp-server.ts)
- [Run the same flow on `isolated-vm`](https://github.com/aallam/execbox/blob/main/examples/execbox-isolated-vm-basic.ts)
- [Full examples index](https://github.com/aallam/execbox/tree/main/examples)

## Install

```bash
npm install @execbox/core @execbox/quickjs
```

Swap in `@execbox/isolated-vm` when you want the native executor instead.
Swap in `@execbox/process` when you want the QuickJS runtime to live in a fresh child process.
Swap in `@execbox/remote` when you want the same API but a caller-managed remote transport boundary.

## Security Posture

- Execbox gives you fresh execution state, JSON-only tool boundaries, schema validation, timeout handling, memory limits, and bounded logs.
- Execbox does not give you a hard security boundary for hostile code by itself. The actual boundary depends on which executor you pair it with.
- Providers are explicit capability grants. Every tool you expose is authority you are handing to guest code.
- In the default deployment model, provider and MCP tool definitions are controlled by the application, not by the end user.
- Third-party MCP integrations should be reviewed as dependency-trust decisions, not folded into the primary end-user attacker model.
- If the code source is hostile, prefer stronger isolation such as `@execbox/process`, `@execbox/remote`, a container, or a VM.

## Architecture Docs

- [Execbox architecture overview](https://github.com/aallam/execbox/blob/main/docs/architecture/README.md)
- [Execbox core architecture](https://github.com/aallam/execbox/blob/main/docs/architecture/execbox-core.md)
- [Execbox executors](https://github.com/aallam/execbox/blob/main/docs/architecture/execbox-executors.md)
- [Execbox MCP adapters and protocol](https://github.com/aallam/execbox/blob/main/docs/architecture/execbox-mcp-and-protocol.md)

## Exports

- `@execbox/core`
  - `ExecutionOptions`
  - `resolveProvider`
  - `normalizeCode`
  - `sanitizeToolName`
  - `extractProviderManifests`
  - `createToolCallDispatcher`
  - JSON Schema type generation and executor/result types
- `@execbox/core/mcp`
  - `createMcpToolProvider`
  - `openMcpToolProvider`
  - `getMcpToolSourceServerInfo`
  - `McpToolClientSource`
  - `McpToolServerSource`
  - `codeMcpServer`

## Basic Usage

```ts
import { resolveProvider } from "@execbox/core";
import { QuickJsExecutor } from "@execbox/quickjs";
import * as z from "zod";

const provider = resolveProvider({
  name: "tools",
  tools: {
    add: {
      inputSchema: z.object({
        x: z.number(),
        y: z.number(),
      }),
      execute: async (input) => {
        const { x, y } = input as { x: number; y: number };
        return { sum: x + y };
      },
    },
  },
});

const executor = new QuickJsExecutor();
const result = await executor.execute(
  "await tools.add({ x: 2, y: 5 })",
  [provider],
  { timeoutMs: 250 },
);
```

## MCP Adapters

Use `@execbox/core/mcp` when you want to wrap an MCP server or client into a tool provider, or expose code-execution tools from an MCP server. Wrapped tools preserve raw MCP `CallToolResult` envelopes so guest code can inspect `structuredContent` first and fall back to `content`.

- `createMcpToolProvider({ client })` is the convenience API when the caller already owns the upstream MCP client lifecycle.
- `openMcpToolProvider({ server | client })` returns an `McpToolProviderHandle` and is the required API when execbox owns a local `{ server }` connection.
- `codeMcpServer()` owns any local wrapper connection it opens and releases it when the wrapper server closes.
