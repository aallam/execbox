# @execbox/core

Core execution contract for execbox. Use it to resolve host tools into callable guest namespaces, validate tool boundaries, and bridge MCP servers or clients into the same execution model.

[![npm version](https://img.shields.io/npm/v/%40execbox%2Fcore?style=flat-square)](https://www.npmjs.com/package/@execbox/core)
[![License](https://img.shields.io/github/license/aallam/execbox?style=flat-square)](https://github.com/aallam/execbox/blob/main/LICENSE)
[![Docs](https://img.shields.io/badge/docs-site-0ea5e9?style=flat-square)](https://execbox.aallam.com)

## Use `@execbox/core` When

- you want to expose host capabilities to guest code through explicit tool providers
- you want one execution contract across inline and worker-hosted QuickJS
- you want to wrap MCP servers or clients into callable namespaces instead of exposing raw tool loops

## Pair It With an Executor

`@execbox/core` defines the provider and tool boundary, but it does not execute guest code on its own.

| Package                                                              | Start here when                                                 |
| -------------------------------------------------------------------- | --------------------------------------------------------------- |
| [`@execbox/quickjs`](https://www.npmjs.com/package/@execbox/quickjs) | You want the default path with inline or worker-hosted QuickJS. |

## Install

Most users start with QuickJS:

```bash
npm install @execbox/core @execbox/quickjs
```

## Runtime Implementer Surface

Most application code can skip this section.

Application code should usually import from `@execbox/core` or `@execbox/core/mcp`.
The `@execbox/core/protocol` and `@execbox/core/runtime` subpaths exist for execbox-owned runtime packages. `@execbox/core/protocol` carries the worker-hosted QuickJS message contract, while `@execbox/core/runtime` contains the manifest dispatcher, runtime option defaults, timeout helpers, log formatting, code normalization, and error normalization used to keep runtime implementations aligned.

## Smallest Working Usage

```ts
import { resolveProvider } from "@execbox/core";
import { QuickJsExecutor } from "@execbox/quickjs";

const provider = resolveProvider({
  name: "tools",
  tools: {
    greet: {
      inputSchema: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
        },
      },
      execute: async (input) => ({
        message: `Hello, ${(input as { name: string }).name}!`,
      }),
    },
  },
});

const executor = new QuickJsExecutor();
const result = await executor.execute(`await tools.greet({ name: "World" })`, [
  provider,
]);

console.log(result);
```

## MCP Support

Use `@execbox/core/mcp` when you want MCP on either side of the boundary:

- wrap an upstream MCP server or client into a provider with `createMcpToolProvider()` or `openMcpToolProvider()`
- expose execbox code execution back out through an MCP server with `codeMcpServer()`
- preserve raw MCP `CallToolResult` envelopes so guest code can inspect `structuredContent` first and fall back to `content`

## Operational Notes

- Providers are the capability boundary. If guest code can call a tool, it can exercise that authority.
- Execbox gives you JSON-only tool/result boundaries, schema validation, bounded logs, and timeout-aware execution controls.
- Hard isolation depends on the executor and deployment boundary you choose, not on `@execbox/core` by itself.

## Read Next

- [Getting Started](https://execbox.aallam.com/getting-started)
- [Examples](https://execbox.aallam.com/examples)
- [Security & Boundaries](https://execbox.aallam.com/security)
- [Architecture Overview](https://execbox.aallam.com/architecture/)
- [Core Architecture](https://execbox.aallam.com/architecture/execbox-core)
- [MCP And Protocol](https://execbox.aallam.com/architecture/execbox-mcp-and-protocol)
