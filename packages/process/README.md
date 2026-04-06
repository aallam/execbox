# @execbox/process

Child-process executor for `@execbox/core`, using the shared QuickJS runner behind a Node IPC boundary.

[![npm version](https://img.shields.io/npm/v/%40execbox%2Fprocess?style=flat-square)](https://www.npmjs.com/package/@execbox/process)
[![License](https://img.shields.io/github/license/aallam/execbox?style=flat-square)](https://github.com/aallam/execbox/blob/main/LICENSE)

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

`ProcessExecutor` now defaults to pooled child-process reuse. Each `execute()` call still gets a fresh QuickJS runtime/context inside the child; only the outer child-process shell is reused.

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

Use `mode: "ephemeral"` to keep the previous behavior of creating a fresh child process for every execution, even if a `pool` config is present:

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

## Security Notes

- This package improves lifecycle isolation by moving the QuickJS runtime to a fresh child process.
- It is still not documented as a hard hostile-code boundary equivalent to a container or VM.
- Providers remain the real capability boundary.
- Internally it is a thin transport adapter over the shared `execbox-protocol` host session and the shared QuickJS protocol endpoint.

## Examples

- [Process-backed execbox execution](https://github.com/aallam/execbox/blob/main/examples/execbox-process.ts)
- [Architecture overview](https://github.com/aallam/execbox/blob/main/docs/architecture/README.md)
- [Executors architecture](https://github.com/aallam/execbox/blob/main/docs/architecture/execbox-executors.md)
