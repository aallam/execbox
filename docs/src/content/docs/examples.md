---
title: Examples
description: Runnable examples for each main execbox integration and runtime shape.
---

Use these examples when you want a runnable starting point for the main library
adoption paths.

## Run everything

```bash
npm install
npm run build
npm run examples
```

## Example index

| Example                                                                                                   | What it shows                                                      | When to start here                                                                |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| [`execbox-basic.ts`](https://github.com/aallam/execbox/blob/main/examples/execbox-basic.ts)               | Resolve a provider and execute guest code with QuickJS.            | You want the smallest end-to-end example.                                         |
| [`execbox-worker.ts`](https://github.com/aallam/execbox/blob/main/examples/execbox-worker.ts)             | Run the same provider flow with QuickJS hosted in a worker thread. | You want QuickJS off the main thread without leaving the process.                 |
| [`execbox-mcp-provider.ts`](https://github.com/aallam/execbox/blob/main/examples/execbox-mcp-provider.ts) | Wrap MCP tools into a provider and execute against them.           | You want guest code to call upstream MCP tools as code.                           |
| [`execbox-mcp-server.ts`](https://github.com/aallam/execbox/blob/main/examples/execbox-mcp-server.ts)     | Expose `mcp_search_tools`, `mcp_execute_code`, and `mcp_code`.     | You want downstream MCP clients to execute code against a wrapped tool namespace. |

## What to read next

- [Getting Started](/getting-started/) for the minimal QuickJS install path
- [Providers & Tools](/providers-and-tools/) for provider and schema guidance
- [Runtime Choices](/runtime-choices/) for inline and worker-hosted QuickJS
- [MCP Integration](/mcp-integration/) for MCP-backed flows
