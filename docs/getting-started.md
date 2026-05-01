# Getting Started

Execbox works best when you start with QuickJS, get one provider flow working, and then choose a stronger boundary only when your deployment needs it.

## Requirements

- Node.js 22+
- npm

## Install

```bash
npm install @execbox/core @execbox/quickjs
```

## Smallest working example

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

## Which package should I use?

- Use `@execbox/quickjs` first unless you already know you need a separate runtime boundary.
- Use `new QuickJsExecutor({ host: "worker" })` when you want QuickJS off the main thread with pooled workers.
- Use `@execbox/remote` only when your runtime already lives behind an application-owned transport.

## Run the examples

The repo includes runnable examples for each main deployment shape:

```bash
npm install
npm run build
npm run examples
```

Next:

- [Examples](/examples) for runnable flows
- [Concepts](/architecture/) for architecture, security, and performance guidance
- [Security](/security) before choosing a production boundary
