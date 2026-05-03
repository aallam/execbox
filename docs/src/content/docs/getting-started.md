---
title: Getting Started
description: Install execbox, run the smallest QuickJS example, and choose what to read next.
---

Start with one provider and inline QuickJS. That path exercises the same
provider, schema, and result contracts you will use later with worker-hosted
QuickJS or MCP integration.

## Requirements

- Node.js 22+
- npm

## Install

```bash
npm install @execbox/core @execbox/quickjs
```

## Smallest working example

This example defines one host tool, resolves it into the guest-visible `tools`
namespace, and runs guest JavaScript that calls `tools.greet(...)`.

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
      execute: async (input) => `Hello, ${(input as { name: string }).name}!`,
    },
  },
});

const executor = new QuickJsExecutor();
const result = await executor.execute(`await tools.greet({ name: "World" })`, [
  provider,
]);

console.log(result);
```

`execute()` returns an `ExecuteResult` envelope. Successful executions include
the guest result, captured logs, and duration. Validation, runtime, timeout, and
tool failures use the same envelope with a stable error code.

## What you just used

- `@execbox/core` resolved host tools into a deterministic provider namespace.
- `@execbox/quickjs` created the runtime and injected async guest tool proxies.
- The tool input crossed the host boundary as JSON-compatible data and was
  checked against the declared schema.

## Move to a worker when needed

The inline executor is the smallest path. Use worker-hosted QuickJS when you
want guest execution off the main thread while keeping the same provider and
executor API.

```ts
const executor = new QuickJsExecutor({
  host: "worker",
});
```

## Run the examples

The repo includes runnable examples for the main adoption paths:

```bash
npm install
npm run build
npm run examples
```

Next:

- [Providers & Tools](/providers-and-tools/) for provider shape, schemas, safe
  names, and type guidance
- [Runtime Choices](/runtime-choices/) for inline and worker-hosted QuickJS
  tradeoffs
- [MCP Integration](/mcp-integration/) when your tools come from MCP or need to
  be exposed through MCP
