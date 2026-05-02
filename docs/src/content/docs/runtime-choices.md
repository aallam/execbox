---
title: Runtime Choices
description: Choose between inline QuickJS and worker-hosted QuickJS for execbox.
---

Execbox keeps the execution contract stable while letting you move guest JavaScript to the runtime boundary that fits your deployment.

## Start with QuickJS

Use `@execbox/quickjs` first when you want the smallest setup and the default development path.

```ts
import { QuickJsExecutor } from "@execbox/quickjs";

const executor = new QuickJsExecutor();
```

Inline QuickJS is the lowest-friction path for trusted code. It gives each execution fresh runtime state inside the host process.

## Move QuickJS to a worker

Use worker-hosted QuickJS when you want guest execution off the main thread while staying in the same package.

```ts
import { QuickJsExecutor } from "@execbox/quickjs";

const executor = new QuickJsExecutor({
  host: "worker",
});
```

Worker mode is useful for lifecycle control, pooled worker reuse, and keeping guest runtime work away from the main thread. It runs in a worker thread that shares the host process.

## Decision guide

| Need                                        | Recommended path                         |
| ------------------------------------------- | ---------------------------------------- |
| Smallest install and development path       | `@execbox/quickjs`                       |
| Off-main-thread local execution             | `@execbox/quickjs` with `host: "worker"` |
| Host wrapping of upstream MCP tool catalogs | MCP provider guide                       |

Next:

- [Getting Started](/getting-started/) for the smallest working example
- [Security](/security/) before choosing a production boundary
