---
title: Providers & Tools
description: Design execbox provider namespaces, tool schemas, result boundaries, and guest types.
---

Providers are the main application-facing concept in `@execbox/core`. A provider
is a named collection of host tools that execbox turns into an async
guest-visible namespace.

## Provider shape

Use `resolveProvider()` to turn host tool definitions into the executor-ready
shape.

```ts
import { resolveProvider } from "@execbox/core";

const provider = resolveProvider({
  name: "docs",
  tools: {
    search: {
      description: "Search documentation.",
      inputSchema: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string" },
        },
      },
      execute: async (input) => {
        const { query } = input as { query: string };
        return { hits: [`found ${query}`] };
      },
    },
  },
});
```

Guest code receives the namespace by provider name:

```ts
await docs.search({ query: "quickjs" });
```

## Namespaces and safe tool names

Provider names must be valid JavaScript identifiers because they become
guest-visible namespaces. Tool names may come from host code, MCP catalogs, or
other sources, so `resolveProvider()` normalizes them before guest code sees
them.

The resolved provider keeps both directions:

- `originalToSafeName` explains how original tool names map to guest-safe names.
- `safeToOriginalName` traces a guest-visible name back to the original tool.

This matters for MCP tools such as `search-docs`, which become guest-callable as
`search_docs`.

## Schemas

Tools can declare schemas with JSON Schema, Zod schemas, or raw Zod shapes.
Execbox normalizes those schemas before execution and validates input before the
host tool runs.

Declare the narrowest useful input and output shapes. They act as the contract
between guest code and host capabilities, and they also improve generated guest
types.

## Result boundary

Tool inputs and results cross a JSON-compatible boundary. Return plain data such
as objects, arrays, strings, numbers, booleans, and null. Keep host-only values
such as clients, file handles, secrets, and tenant maps inside the host tool
implementation.

When a tool throws, execbox maps the failure into the stable `ExecuteResult`
error vocabulary so callers and MCP wrappers can handle failures consistently.

## Tool execution context

Tool implementations receive abort-aware execution context from execbox. Use it
when host work can be cancelled or when you need request metadata supplied by
the executor.

```ts
execute: async (input, context) => {
  const response = await fetch("https://example.com", {
    signal: context.signal,
  });

  return response.json();
};
```

## Type guidance

Resolved providers carry generated namespace declarations for guest code. Those
types are useful when you show code to users, prepare model prompts, or build an
editor experience around the available tools.

For hand-authored TypeScript on the host side, keep the host tool input type
close to the schema declaration. For generated or MCP-backed tools, rely on the
resolved provider maps and generated declarations instead of assuming original
tool names are valid JavaScript identifiers.

## Next

- [Getting Started](/getting-started/) for the smallest runnable provider flow
- [Runtime Choices](/runtime-choices/) for inline and worker-hosted QuickJS
- [MCP Integration](/mcp-integration/) for MCP-backed providers
