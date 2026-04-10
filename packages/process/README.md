# @execbox/process

Child-process executor for `@execbox/core`, using the shared QuickJS runner behind a Node IPC boundary.

[![npm version](https://img.shields.io/npm/v/%40execbox%2Fprocess?style=flat-square)](https://www.npmjs.com/package/@execbox/process)
[![License](https://img.shields.io/github/license/aallam/execbox?style=flat-square)](https://github.com/aallam/execbox/blob/main/LICENSE)

Docs: https://execbox.aallam.com

## Choose `execbox-process` When

- you want QuickJS semantics with a stronger lifecycle boundary than worker threads
- you want to hard-kill the execution process on timeout
- you want pooled child-process reuse by default, with explicit ephemeral opt-out when needed

If you want the simplest default backend, use [`@execbox/quickjs`](https://www.npmjs.com/package/@execbox/quickjs) instead.

## Install

```bash
npm install @execbox/core @execbox/process
```

## Usage

```ts
import { resolveProvider } from "@execbox/core";
import { ProcessExecutor } from "@execbox/process";

const provider = resolveProvider({
  name: "tools",
  tools: {
    echo: {
      execute: async (input) => input,
    },
  },
});

const executor = new ProcessExecutor();
const result = await executor.execute("await tools.echo({ ok: true })", [
  provider,
]);
```

## Pooling

`ProcessExecutor` defaults to pooled child-process reuse. Each `execute()` call still gets a fresh QuickJS runtime/context inside the child; only the outer child-process shell is reused.

```ts
const executor = new ProcessExecutor({
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

`prewarm()` now creates the pooled child processes and runs one no-op QuickJS session through each child so the first live request can reuse an already-initialized guest startup path.

Use `mode: "ephemeral"` when you want a fresh child process for every execution, even if a `pool` config is present:

```ts
const executor = new ProcessExecutor({
  mode: "ephemeral",
});
```

Default pooled settings are:

- `maxSize: 1`
- `minSize: 0`
- `idleTimeoutMs: 30_000`
- `prewarm: false`

Call `dispose()` in long-lived applications and tests when you want deterministic cleanup of pooled child processes.

### Pooling Internals

`ProcessExecutor` does not keep a QuickJS runtime alive between executions. The pooled resource is the outer child-process shell only.

- the child process starts once and attaches the shared QuickJS protocol endpoint
- each `execute()` call sends one execute message to that endpoint, which starts a fresh `runQuickJsSession()` inside the child
- `prewarm()` first creates pooled shells, then runs one no-op execution through each child so QuickJS startup happens before live traffic
- the parent acquires one pooled shell lease, runs `runHostTransportSession()` for that execution, then releases or evicts the lease when the session settles
- pooled mode uses a borrowed transport wrapper because the host session always disposes its transport at the end of an execution, while the real pooled child must stay alive for reuse
- if all pooled children are busy and the pool is already at `maxSize`, new executions wait in an internal FIFO queue until a shell is released or replaced

Shell reuse rules are:

- success returns the child to the pool
- normal guest/tool/runtime failures also return it
- `timeout` and `internal_error` evict it
- idle children are evicted after `idleTimeoutMs`

The transport wrapper also caches the first unexpected close reason and replays it to late listeners. That prevents pooled executions from hanging if the child exits before the host session has attached its close handler.

Queue wait time is pool backpressure, not execution time. The configured execution timeout starts only after the lease has been acquired and the host transport session begins.

## Security Notes

- This package improves lifecycle isolation by moving the QuickJS runtime to a fresh child process.
- It strengthens the lifecycle boundary, but it is still not equivalent to a container or VM for hostile code.
- Providers remain the real capability boundary.
- Internally it is a thin transport adapter over the shared `execbox-protocol` host session and the shared QuickJS protocol endpoint.

## Examples

- [Process-backed execbox execution](https://github.com/aallam/execbox/blob/main/examples/execbox-process.ts)
- [Architecture overview](https://github.com/aallam/execbox/blob/main/docs/architecture/README.md)
- [Executors architecture](https://github.com/aallam/execbox/blob/main/docs/architecture/execbox-executors.md)
