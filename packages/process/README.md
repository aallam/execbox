# @execbox/process

Child-process executor for `@execbox/core`, using the shared QuickJS runner behind a Node IPC boundary.

[![npm version](https://img.shields.io/npm/v/%40execbox%2Fprocess?style=flat-square)](https://www.npmjs.com/package/@execbox/process)
[![License](https://img.shields.io/github/license/aallam/execbox?style=flat-square)](https://github.com/aallam/execbox/blob/main/LICENSE)

## Choose `execbox-process` When

- you want QuickJS semantics with a stronger lifecycle boundary than worker threads
- you want to hard-kill the execution process on timeout
- you are comfortable paying child-process startup overhead per execution

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

## Security Notes

- This package improves lifecycle isolation by moving the QuickJS runtime to a fresh child process.
- It is still not documented as a hard hostile-code boundary equivalent to a container or VM.
- Providers remain the real capability boundary.
- Internally it is a thin transport adapter over the shared `execbox-protocol` host session and the shared QuickJS protocol endpoint.

## Examples

- [Process-backed execbox execution](https://github.com/aallam/execbox/blob/main/examples/execbox-process.ts)
- [Architecture overview](https://github.com/aallam/execbox/blob/main/docs/architecture/README.md)
- [Executors architecture](https://github.com/aallam/execbox/blob/main/docs/architecture/execbox-executors.md)
