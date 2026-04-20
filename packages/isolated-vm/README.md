# @execbox/isolated-vm

`isolated-vm` executor backend for execbox. Use it when you explicitly want the `isolated-vm` runtime instead of QuickJS and can support its native and runtime constraints.

[![npm version](https://img.shields.io/npm/v/%40execbox%2Fisolated-vm?style=flat-square)](https://www.npmjs.com/package/@execbox/isolated-vm)
[![License](https://img.shields.io/github/license/aallam/execbox?style=flat-square)](https://github.com/aallam/execbox/blob/main/LICENSE)
[![Docs](https://img.shields.io/badge/docs-site-0ea5e9?style=flat-square)](https://execbox.aallam.com)

## Use `@execbox/isolated-vm` When

- you explicitly want the `isolated-vm` runtime instead of the default QuickJS path
- your environment can install the native addon successfully
- you are prepared to run Node 22+ with `--no-node-snapshot`

If you want the lowest-friction default backend, use [`@execbox/quickjs`](https://www.npmjs.com/package/@execbox/quickjs) instead.

## Install

```bash
npm install @execbox/core @execbox/isolated-vm
```

## Runtime Requirements

- Node 22+ must run with `--no-node-snapshot`
- the optional `isolated-vm` dependency must install successfully in the host environment
- advanced consumers can also import the reusable runner from `@execbox/isolated-vm/runner`

## Smallest Working Usage

```ts
import { resolveProvider } from "@execbox/core";
import { IsolatedVmExecutor } from "@execbox/isolated-vm";

const provider = resolveProvider({
  name: "tools",
  tools: {
    echo: {
      execute: async (input) => input,
    },
  },
});

const executor = new IsolatedVmExecutor();
const result = await executor.execute(`await tools.echo({ ok: true })`, [
  provider,
]);

console.log(result);
```

## Operational Notes

- Each execution gets a fresh `isolated-vm` context with JSON-only tool and result boundaries.
- This package is still an in-process runtime choice, not a substitute for a container, VM, or separate trust domain.
- Providers remain the real capability boundary. If a tool is dangerous, guest code can invoke it.
- If you need stronger lifecycle separation than in-process execution, prefer QuickJS with `host: "process"` or a remote transport boundary.

## Read Next

- [Getting Started](https://execbox.aallam.com/getting-started)
- [Examples](https://execbox.aallam.com/examples)
- [Security & Boundaries](https://execbox.aallam.com/security)
- [Executors](https://execbox.aallam.com/architecture/execbox-executors)
- [MCP And Protocol](https://execbox.aallam.com/architecture/execbox-mcp-and-protocol)
