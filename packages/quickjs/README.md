# @execbox/quickjs

Default execbox executor. It runs guest JavaScript in QuickJS and keeps the same
API as you move between inline and worker-hosted execution.

[![npm version](https://img.shields.io/npm/v/%40execbox%2Fquickjs?style=flat-square)](https://www.npmjs.com/package/@execbox/quickjs)
[![License](https://img.shields.io/github/license/aallam/execbox?style=flat-square)](https://github.com/aallam/execbox/blob/main/LICENSE)
[![Docs](https://img.shields.io/badge/docs-site-0ea5e9?style=flat-square)](https://execbox.aallam.com)

## Use `@execbox/quickjs` When

- you want the default execbox path with the easiest setup
- you do not want a native addon in local development or CI
- you want one package that can stay inline or move off-thread later

## Install

```bash
npm install @execbox/core @execbox/quickjs
```

## Smallest Working Usage

```ts
import { resolveProvider } from "@execbox/core";
import { QuickJsExecutor } from "@execbox/quickjs";

const provider = resolveProvider({
  name: "tools",
  tools: {
    echo: {
      execute: async (input) => input,
    },
  },
});

const executor = new QuickJsExecutor();
const result = await executor.execute(`await tools.echo({ ok: true })`, [
  provider,
]);

console.log(result);
```

## Host Modes

`QuickJsExecutor` keeps the same execution API while changing where the runtime lives:

| Mode             | Use it when                                                     |
| ---------------- | --------------------------------------------------------------- |
| Inline (default) | You want the smallest trusted-code path.                        |
| `host: "worker"` | You want QuickJS off the main thread with pooled worker shells. |

```ts
const executor = new QuickJsExecutor({
  host: "worker",
  pool: {
    maxSize: 4,
    prewarm: true,
  },
});

await executor.prewarm();
```

## Operational Notes

- Each execution gets a fresh QuickJS runtime with JSON-only tool and result boundaries.
- Inline mode and worker mode are local execution placement choices.
- Worker mode moves QuickJS off the main thread and keeps the same provider API.
- For hostile-code or multi-tenant deployments, put the application-level execution service behind a process, container, VM, or equivalent operational boundary.

## Read Next

- [Getting Started](https://execbox.aallam.com/getting-started)
- [Providers & Tools](https://execbox.aallam.com/providers-and-tools)
- [Runtime Choices](https://execbox.aallam.com/runtime-choices)
- [Examples](https://execbox.aallam.com/examples)
- [Security & Boundaries](https://execbox.aallam.com/security)
- [MCP Integration](https://execbox.aallam.com/mcp-integration)
