---
title: Runtime Choices
description: Choose between inline QuickJS and worker-hosted QuickJS for execbox.
---

Execbox v1 has one executor package: `@execbox/quickjs`. Start inline, then move
to worker-hosted QuickJS when your application needs off-main-thread execution
or pooled worker shells.

## Inline QuickJS

Inline QuickJS is the default constructor path and the smallest setup.

```ts
import { QuickJsExecutor } from "@execbox/quickjs";

const executor = new QuickJsExecutor();
```

Use it when you are proving out provider shape, running trusted code paths, or
optimizing for the fewest moving parts. Each execution gets fresh QuickJS runtime
state while host tools stay in the application process.

## Worker-hosted QuickJS

Worker-hosted QuickJS keeps the same `QuickJsExecutor` API and moves guest
runtime work into a worker thread.

```ts
import { QuickJsExecutor } from "@execbox/quickjs";

const executor = new QuickJsExecutor({
  host: "worker",
});
```

Use it when you want worker lifecycle control, pooled worker reuse, and guest
runtime work away from the main thread. Worker mode is pooled by default; use
`mode: "ephemeral"` when a fresh worker shell per execution is more important
than latency.

## Decision guide

| Need                                  | Recommended path                          |
| ------------------------------------- | ----------------------------------------- |
| Smallest install and development path | `new QuickJsExecutor()`                   |
| Lowest local latency                  | Inline QuickJS                            |
| Off-main-thread execution             | `new QuickJsExecutor({ host: "worker" })` |
| Warm reusable worker shells           | Worker-hosted QuickJS with pooled mode    |
| Fresh worker shell per execution      | Worker-hosted QuickJS with ephemeral mode |

## Production boundary guidance

Inline and worker-hosted QuickJS are local runtime placement choices. For
hostile-code or multi-tenant deployments, put the application-level execution
service behind a process, container, VM, or equivalent operational boundary and
keep providers scoped to the capabilities each caller should receive.

Next:

- [Getting Started](/getting-started/) for the smallest working example
- [Providers & Tools](/providers-and-tools/) for provider design
- [Security](/security/) before choosing a production deployment shape
