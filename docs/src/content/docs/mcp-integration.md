---
title: MCP Integration
description: Wrap MCP tools as execbox providers or expose execbox execution as MCP tools.
---

Execbox has two MCP adoption paths. Use MCP providers when guest code should
call upstream MCP tools. Use the code MCP server when an MCP client should call
execbox.

## Wrap MCP tools as a provider

Use `@execbox/core/mcp` to adapt an MCP tool catalog into a resolved provider.
The provider can then be passed to any execbox executor.

```ts
import { openMcpToolProvider } from "@execbox/core/mcp";
import { QuickJsExecutor } from "@execbox/quickjs";

const handle = await openMcpToolProvider({ server: upstreamServer });

try {
  const executor = new QuickJsExecutor();
  const result = await executor.execute(
    '(await mcp.search_docs({ query: "quickjs" })).structuredContent',
    [handle.provider],
  );

  console.log(result);
} finally {
  await handle.close();
}
```

Use `createMcpToolProvider({ client })` when the caller owns an already
connected MCP client. Use `openMcpToolProvider({ server })` when execbox opens a
local server connection and should return a cleanup handle.

## Expose execbox as MCP tools

Use `codeMcpServer()` when downstream MCP clients should execute code against a
wrapped tool namespace.

```ts
import { codeMcpServer } from "@execbox/core/mcp";
import { QuickJsExecutor } from "@execbox/quickjs";

const server = await codeMcpServer(
  { client: upstreamClient },
  { executor: new QuickJsExecutor() },
);
```

The wrapper server exposes:

| Tool               | Purpose                                              |
| ------------------ | ---------------------------------------------------- |
| `mcp_search_tools` | Search the wrapped MCP catalog                       |
| `mcp_execute_code` | Execute guest JavaScript against the wrapped catalog |
| `mcp_code`         | Return the code-execution tool description           |

## Result handling

Wrapped MCP tools preserve MCP `CallToolResult` envelopes. Guest code can read
`structuredContent` first and fall back to `content` when a tool only returns
text or other MCP content items.

```ts
const result = await mcp.search_docs({ query: "quickjs" });
result.structuredContent?.hits ?? result.content;
```

## Boundaries

MCP integration changes where tools come from or how execbox is exposed. The
provider surface remains the capability boundary:

- wrap only the MCP tools a caller should be able to invoke
- keep upstream clients, secrets, and tenant routing in host code
- close handles returned by `openMcpToolProvider()`
- choose inline or worker-hosted QuickJS separately from the MCP adapter shape

## Examples

- [`execbox-mcp-provider.ts`](https://github.com/aallam/execbox/blob/main/examples/execbox-mcp-provider.ts)
  wraps an upstream MCP server into a provider.
- [`execbox-mcp-server.ts`](https://github.com/aallam/execbox/blob/main/examples/execbox-mcp-server.ts)
  exposes execbox execution through MCP tools.

Next:

- [Providers & Tools](/providers-and-tools/) for provider design
- [Security & Boundaries](/security/) for capability and deployment guidance
- [Protocol](/architecture/execbox-protocol-reference/) for the advanced worker
  message contract
