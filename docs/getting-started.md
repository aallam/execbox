# Getting Started

Execbox works best when you start small: define one provider, run one snippet, then choose a stronger boundary only when your deployment needs it.

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
const result = await executor.execute(
  `await tools.greet({ name: "World" })`,
  [provider],
);

console.log(result);
```

## Which package should I use?

- Use `@execbox/quickjs` first unless you already know you need a stronger boundary.
- Use `@execbox/process` when you want QuickJS semantics in a separate child process.
- Use `@execbox/worker` when you want QuickJS off the main thread with pooled workers.
- Use `@execbox/remote` when your runtime already lives behind an application-owned transport.
- Use `@execbox/isolated-vm` only when you explicitly want that runtime and can support `--no-node-snapshot`.

## Run the examples

The repo includes runnable examples for each main deployment shape:

```bash
npm install
npm run build
npm run examples
```

For the isolated-vm lane:

```bash
npm run example:execbox-isolated-vm
npm run verify:isolated-vm
```

Next:

- [Examples](/examples) for runnable flows
- [Architecture](/architecture/) for the deeper technical model
- [Security](/security) before choosing a production boundary
