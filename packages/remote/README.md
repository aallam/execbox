# @execbox/remote

Transport-backed remote executor for `@execbox/core`.

[![npm version](https://img.shields.io/npm/v/%40execbox%2Fremote?style=flat-square)](https://www.npmjs.com/package/@execbox/remote)
[![License](https://img.shields.io/github/license/aallam/execbox?style=flat-square)](https://github.com/aallam/execbox/blob/main/LICENSE)

Docs: https://execbox.aallam.com

## Choose `@execbox/remote` When

- you want execbox execution to live outside the application process
- you already own the transport and runtime deployment shape
- you want to keep the same `Executor` API while placing execution behind an application-defined boundary

## Install

```bash
npm install @execbox/core @execbox/remote
```

## Usage

Host side:

```ts
import { resolveProvider } from "@execbox/core";
import { RemoteExecutor } from "@execbox/remote";

const provider = resolveProvider({
  name: "tools",
  tools: {
    echo: {
      execute: async (input) => input,
    },
  },
});

const executor = new RemoteExecutor({
  connectTransport: async () => myHostTransport,
  timeoutMs: 1000,
});

const result = await executor.execute(
  "await tools.echo({ ok: true })",
  [provider],
  { timeoutMs: 250 },
);
```

Runner side:

```ts
import { attachQuickJsRemoteEndpoint } from "@execbox/remote";

attachQuickJsRemoteEndpoint(myRunnerPort);
```

`RemoteExecutor` stays transport-agnostic. Your application owns the network stack and provides the `HostTransport` instances that execution runs on. `attachQuickJsRemoteEndpoint()` binds the shared QuickJS runner protocol to an app-provided remote port on the runner side.

`RemoteExecutor` intentionally stays ephemeral. It asks `connectTransport()` for a fresh transport per `execute()` call and leaves any connection reuse policy to the caller-owned transport layer.

## Security Notes

- This package moves execution behind a caller-supplied transport.
- The actual trust boundary depends on the remote runtime and operational controls you deploy behind that transport.
- Providers remain the capability boundary.
- The package is intentionally small: it does not create servers, own authentication, or prescribe an HTTP/WebSocket framework.

## Examples

- [Remote execbox execution](https://github.com/aallam/execbox/blob/main/examples/execbox-remote.ts)
- [Execbox architecture overview](https://github.com/aallam/execbox/blob/main/docs/architecture/README.md)
- [Execbox remote execution workflow](https://github.com/aallam/execbox/blob/main/docs/architecture/execbox-remote-workflow.md)
- [Execbox protocol reference](https://github.com/aallam/execbox/blob/main/docs/architecture/execbox-protocol-reference.md)
- [Execbox runner specification](https://github.com/aallam/execbox/blob/main/docs/architecture/execbox-runner-specification.md)
- [Execbox MCP adapters and protocol overview](https://github.com/aallam/execbox/blob/main/docs/architecture/execbox-mcp-and-protocol.md)
