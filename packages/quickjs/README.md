# @execbox/quickjs

QuickJS executor backend for `@execbox/core`.

[![npm version](https://img.shields.io/npm/v/%40execbox%2Fquickjs?style=flat-square)](https://www.npmjs.com/package/@execbox/quickjs)
[![License](https://img.shields.io/github/license/aallam/execbox?style=flat-square)](https://github.com/aallam/execbox/blob/main/LICENSE)

## Choose QuickJS When

- you want the easiest execbox backend to install
- you do not want a native addon in CI or local development
- you want fresh runtimes, captured `console.*` output, and JSON-only tool boundaries

## Security Notes

- Each execution gets a fresh QuickJS runtime with no ambient Node globals injected by execbox.
- Tool calls cross a JSON-only bridge, and executor timeouts propagate abort signals to in-flight provider work.
- In the default deployment model, provider definitions are controlled by the host application, while hostile users control guest code and tool inputs.
- This package is not presented as a hard security boundary for hostile code. It is best-effort in-process isolation.
- If you need a stronger boundary, run execbox behind a separate process or container.

## Architecture Docs

- [Execbox architecture overview](https://github.com/aallam/execbox/blob/main/docs/execbox/architecture/README.md)
- [Execbox executors](https://github.com/aallam/execbox/blob/main/docs/execbox/architecture/execbox-executors.md)
- [Execbox MCP adapters and protocol](https://github.com/aallam/execbox/blob/main/docs/execbox/architecture/execbox-mcp-and-protocol.md)

## Examples

- [Basic provider execution](https://github.com/aallam/execbox/blob/main/examples/execbox-basic.ts)
- [Worker-backed QuickJS execution](https://github.com/aallam/execbox/blob/main/examples/execbox-worker.ts)
- [MCP provider wrapping](https://github.com/aallam/execbox/blob/main/examples/execbox-mcp-provider.ts)
- [MCP server wrapper](https://github.com/aallam/execbox/blob/main/examples/execbox-mcp-server.ts)
- [Full examples index](https://github.com/aallam/execbox/tree/main/examples)

## Install

```bash
npm install @execbox/core @execbox/quickjs
```

Advanced consumers can also import the reusable QuickJS runner from `@execbox/quickjs/runner`.
Transport-backed executors such as `@execbox/worker` and `@execbox/process` also reuse the shared QuickJS protocol endpoint from `@execbox/quickjs/runner/protocol-endpoint`.

## Usage

```ts
import { resolveProvider } from "@execbox/core";
import { QuickJsExecutor } from "@execbox/quickjs";

const provider = resolveProvider({
  tools: {
    echo: {
      execute: async (input) => input,
    },
  },
});

const executor = new QuickJsExecutor();
const result = await executor.execute("await codemode.echo({ ok: true })", [
  provider,
]);
```

Each execution runs in a fresh QuickJS runtime with timeout handling, captured logs, and JSON-only result and tool boundaries.
