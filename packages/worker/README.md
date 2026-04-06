# @execbox/worker

Worker-thread executor for `@execbox/core`, using the shared QuickJS runner behind a message boundary.

[![npm version](https://img.shields.io/npm/v/%40execbox%2Fworker?style=flat-square)](https://www.npmjs.com/package/@execbox/worker)
[![License](https://img.shields.io/github/license/aallam/execbox?style=flat-square)](https://github.com/aallam/execbox/blob/main/LICENSE)

## Choose `execbox-worker` When

- you want QuickJS semantics without running the runtime on the main thread
- you want a worker termination backstop for timeouts
- you are comfortable paying worker startup overhead per execution

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

`WorkerExecutor` can reuse worker-thread shells between executions when you opt into pooling:

```ts
const executor = new WorkerExecutor({
  pool: {
    idleTimeoutMs: 30_000,
    maxSize: 2,
    prewarm: true,
  },
});

await executor.prewarm?.(2);
await executor.dispose?.();
```

Each execution still gets a fresh QuickJS runtime inside the worker. Pooling only reuses the worker shell.

## Security Notes

- This package improves lifecycle isolation by moving the QuickJS runtime to a worker thread.
- It is still same-process execution and is not documented as a hard hostile-code boundary.
- Providers remain the real capability boundary.
- Internally it is a thin transport adapter over the shared `execbox-protocol` host session and the shared QuickJS protocol endpoint.

## Examples

- [Worker-backed execbox execution](https://github.com/aallam/execbox/blob/main/examples/execbox-worker.ts)
- [Architecture overview](https://github.com/aallam/execbox/blob/main/docs/architecture/README.md)
- [Executors architecture](https://github.com/aallam/execbox/blob/main/docs/architecture/execbox-executors.md)
