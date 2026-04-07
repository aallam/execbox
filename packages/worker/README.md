# @execbox/worker

Worker-thread executor for `@execbox/core`, using the shared QuickJS runner behind a message boundary.

[![npm version](https://img.shields.io/npm/v/%40execbox%2Fworker?style=flat-square)](https://www.npmjs.com/package/@execbox/worker)
[![License](https://img.shields.io/github/license/aallam/execbox?style=flat-square)](https://github.com/aallam/execbox/blob/main/LICENSE)

Docs: https://execbox.aallam.com

## Choose `execbox-worker` When

- you want QuickJS semantics without running the runtime on the main thread
- you want a worker termination backstop for timeouts
- you want pooled worker reuse by default, with explicit ephemeral opt-out when needed

If you want the simplest default backend, use [`@execbox/quickjs`](https://www.npmjs.com/package/@execbox/quickjs) instead.

## Install

```bash
npm install @execbox/core @execbox/worker
```

## Usage

```ts
import { resolveProvider } from "@execbox/core";
import { WorkerExecutor } from "@execbox/worker";

const provider = resolveProvider({
  name: "tools",
  tools: {
    echo: {
      execute: async (input) => input,
    },
  },
});

const executor = new WorkerExecutor();
const result = await executor.execute("await tools.echo({ ok: true })", [
  provider,
]);
```

## Pooling

`WorkerExecutor` defaults to pooled worker reuse. Each `execute()` call still gets a fresh QuickJS runtime/context inside the worker; only the outer worker shell is reused.

```ts
const executor = new WorkerExecutor({
  mode: "pooled",
  pool: {
    idleTimeoutMs: 30_000,
    maxSize: 2,
    prewarm: true,
  },
});

await executor.prewarm?.(2);
await executor.dispose?.();
```

Use `mode: "ephemeral"` when you want a fresh worker for every execution, even if a `pool` config is present:

```ts
const executor = new WorkerExecutor({
  mode: "ephemeral",
});
```

Default pooled settings are:

- `maxSize: 1`
- `minSize: 0`
- `idleTimeoutMs: 30_000`
- `prewarm: false`

Call `dispose()` in long-lived applications and tests when you want deterministic cleanup of pooled workers.

### Pooling Internals

`WorkerExecutor` does not keep a QuickJS runtime alive between executions. The pooled resource is the outer worker shell only.

- the worker starts once and attaches the shared QuickJS protocol endpoint
- each `execute()` call sends one execute message to that endpoint, which starts a fresh `runQuickJsSession()` inside the worker
- the parent acquires one pooled shell lease, runs `runHostTransportSession()` for that execution, then releases or evicts the lease when the session settles
- pooled mode uses a borrowed transport wrapper because the host session always disposes its transport at the end of an execution, while the real pooled worker must stay alive for reuse
- if all pooled workers are busy and the pool is already at `maxSize`, new executions wait in an internal FIFO queue until a shell is released or replaced

Shell reuse rules are:

- success returns the worker to the pool
- normal guest/tool/runtime failures also return it
- `timeout` and `internal_error` evict it
- idle workers are evicted after `idleTimeoutMs`

The transport wrapper also caches the first unexpected close reason and replays it to late listeners. That prevents pooled executions from hanging if the worker exits before the host session has attached its close handler.

Queue wait time is pool backpressure, not execution time. The configured execution timeout starts only after the lease has been acquired and the host transport session begins.

## Security Notes

- This package improves lifecycle isolation by moving the QuickJS runtime to a worker thread.
- It is still same-process execution and is not documented as a hard hostile-code boundary.
- Providers remain the real capability boundary.
- Internally it is a thin transport adapter over the shared `execbox-protocol` host session and the shared QuickJS protocol endpoint.

## Examples

- [Worker-backed execbox execution](https://github.com/aallam/execbox/blob/main/examples/execbox-worker.ts)
- [Architecture overview](https://github.com/aallam/execbox/blob/main/docs/architecture/README.md)
- [Executors architecture](https://github.com/aallam/execbox/blob/main/docs/architecture/execbox-executors.md)
