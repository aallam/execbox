---
title: Runtime Choices
description: Choose between inline QuickJS, worker-hosted QuickJS, and remote execution for execbox.
---

Execbox keeps the execution contract stable while letting you move guest JavaScript to the runtime boundary that fits your deployment.

## Start with QuickJS

Use `@execbox/quickjs` first when you want the smallest setup and the default development path.

```ts
import { QuickJsExecutor } from "@execbox/quickjs";

const executor = new QuickJsExecutor();
```

Inline QuickJS is the lowest-friction path for trusted code. It gives each execution fresh runtime state, but it still runs inside the host process.

## Move QuickJS to a worker

Use worker-hosted QuickJS when you want guest execution off the main thread while staying in the same package.

```ts
import { QuickJsExecutor } from "@execbox/quickjs";

const executor = new QuickJsExecutor({
  host: "worker",
});
```

Worker mode is useful for lifecycle control, pooled worker reuse, and keeping guest runtime work away from the main thread. It is still not a hard tenant boundary because the worker shares the host process.

## Use a remote runner

Use `@execbox/remote` when your application owns a process, container, VM, or network boundary for guest execution.

```ts
import { RemoteExecutor } from "@execbox/remote";

const executor = new RemoteExecutor({
  connectTransport,
});
```

Remote execution is the right direction for hostile-code or multi-tenant deployments, but the trust boundary is the infrastructure you deploy behind the transport. The host-side provider surface still decides what guest code can do.

## Decision guide

| Need                                        | Recommended path                         |
| ------------------------------------------- | ---------------------------------------- |
| Smallest install and development path       | `@execbox/quickjs`                       |
| Off-main-thread local execution             | `@execbox/quickjs` with `host: "worker"` |
| App-owned runtime or isolation boundary     | `@execbox/remote`                        |
| Non-TypeScript runner implementation        | Runner specification                     |
| Host wrapping of upstream MCP tool catalogs | MCP provider guide                       |

Next:

- [Getting Started](/getting-started/) for the smallest working example
- [Remote Runner](/architecture/execbox-remote-workflow/) for the transport-backed control flow
- [Security](/security/) before choosing a production boundary
