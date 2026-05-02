---
title: Getting Started
description: Install execbox, run the smallest QuickJS example, and choose what to read next.
---

Execbox works best when you start with inline QuickJS, get one provider flow working, and then choose a different runtime placement only when your deployment needs it.

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

- Use `@execbox/quickjs` first for trusted code and the smallest setup.
- Use `new QuickJsExecutor({ host: "worker" })` when you want QuickJS off the main thread with pooled worker shells.

Worker-hosted QuickJS improves local lifecycle control, but it still shares the host process. Read [Security](/security/) before treating any runtime placement as a production trust boundary.

## Run the examples

The repo includes runnable examples for each main deployment shape:

```bash
npm install
npm run build
npm run examples
```

Next:

- [Runtime Choices](/runtime-choices/) for executor selection guidance
- [Examples](/examples/) for runnable flows
- [Architecture](/architecture/) for architecture, security, and performance guidance
- [Security](/security/) before choosing a production boundary
