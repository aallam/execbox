# @execbox/isolated-vm

`isolated-vm` executor backend for `@execbox/core`.

[![npm version](https://img.shields.io/npm/v/%40execbox%2Fisolated-vm?style=flat-square)](https://www.npmjs.com/package/@execbox/isolated-vm)
[![License](https://img.shields.io/github/license/aallam/execbox?style=flat-square)](https://github.com/aallam/execbox/blob/main/LICENSE)

Docs: https://execbox.aallam.com

## Choose `isolated-vm` When

- you explicitly want the `isolated-vm` runtime instead of QuickJS
- your environment can support the native addon install
- you are prepared to run Node 22+ with `--no-node-snapshot`

If you want the simpler default backend, use [`@execbox/quickjs`](https://www.npmjs.com/package/@execbox/quickjs) instead.

## Examples

- [Basic provider execution on `isolated-vm`](https://github.com/aallam/execbox/blob/main/examples/execbox-isolated-vm-basic.ts)
- [QuickJS-based execbox examples for the shared API surface](https://github.com/aallam/execbox/blob/main/examples/execbox-basic.ts)
- [Worker-backed QuickJS example for the alternate transport-backed path](https://github.com/aallam/execbox/blob/main/examples/execbox-worker.ts)
- [Full examples index](https://github.com/aallam/execbox/tree/main/examples)

## Install

```bash
npm install @execbox/core @execbox/isolated-vm
```

## Requirements

- Node 22+ must run with `--no-node-snapshot`
- the optional `isolated-vm` native dependency must install successfully in the host environment
- native-addon failures are surfaced when `IsolatedVmExecutor` is constructed or used
- advanced consumers can import the reusable runner from `@execbox/isolated-vm/runner`

## Security Notes

- Each execution gets a fresh `isolated-vm` context with JSON-only tool and result boundaries.
- In the default deployment model, provider definitions are controlled by the host application, while hostile users control guest code and tool inputs.
- This package is still in-process execution. It should not be marketed or relied on as a hard security boundary for hostile code.
- Providers remain the real capability boundary. If a tool is dangerous, guest code can invoke it.

## Architecture Docs

- [Execbox architecture overview](https://github.com/aallam/execbox/blob/main/docs/architecture/README.md)
- [Execbox executors](https://github.com/aallam/execbox/blob/main/docs/architecture/execbox-executors.md)
- [Execbox MCP adapters and protocol](https://github.com/aallam/execbox/blob/main/docs/architecture/execbox-mcp-and-protocol.md)

## Usage

```ts
import { resolveProvider } from "@execbox/core";
import { IsolatedVmExecutor } from "@execbox/isolated-vm";

const provider = resolveProvider({
  tools: {
    echo: {
      execute: async (input) => input,
    },
  },
});

const executor = new IsolatedVmExecutor();
const result = await executor.execute("await codemode.echo({ ok: true })", [
  provider,
]);
```

This package is verified through the workspace security flows:

```bash
npm run test:security
npm run test:isolated-vm
npm run verify:isolated-vm
```

The required CI lane runs the isolated-vm suite on Node 24 with `--no-node-snapshot`, which is the best local environment to match when validating native-runtime changes.

`isolated-vm` is not documented here as a hard security boundary. If process stability matters more than in-process performance, prefer process isolation around the executor.
