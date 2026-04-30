# @execbox/remote

Transport-backed executor for execbox. Use it when you want the execbox API on the host side, but the actual runtime to live behind a transport and deployment boundary that your application already owns.

[![npm version](https://img.shields.io/npm/v/%40execbox%2Fremote?style=flat-square)](https://www.npmjs.com/package/@execbox/remote)
[![License](https://img.shields.io/github/license/aallam/execbox?style=flat-square)](https://github.com/aallam/execbox/blob/main/LICENSE)
[![Docs](https://img.shields.io/badge/docs-site-0ea5e9?style=flat-square)](https://execbox.aallam.com)

## Use `@execbox/remote` When

- you want execbox execution to live outside the application process
- you already own the network stack, process topology, or runtime placement
- you want to keep the same provider/executor model while moving the runtime behind your own boundary

## Install

```bash
npm install @execbox/core @execbox/remote
```

## How It Fits

`@execbox/remote` has two sides:

- the host uses `RemoteExecutor` and supplies `HostTransport` instances
- the runner attaches a protocol endpoint to an app-owned transport port

The package stays intentionally small. It does not create servers, own authentication, or prescribe an HTTP or WebSocket framework.

## Smallest Working Usage

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

const result = await executor.execute(`await tools.echo({ ok: true })`, [
  provider,
]);

console.log(result);
```

Runner side:

```ts
import { attachQuickJsRemoteEndpoint } from "@execbox/quickjs/remote-endpoint";

attachQuickJsRemoteEndpoint(myRunnerPort);
```

## Operational Notes

- `RemoteExecutor` is intentionally ephemeral and asks `connectTransport()` for a fresh transport per `execute()` call.
- Connection reuse, authentication, and transport lifecycle stay under caller control.
- Runtime-specific runner endpoints are owned by runtime packages such as `@execbox/quickjs`.
- Providers are still the capability boundary. Moving execution behind a transport does not change what guest code is allowed to call.
- The real trust boundary depends on the runtime and operational controls you deploy behind that transport.

## Read Next

- [Getting Started](https://execbox.aallam.com/getting-started)
- [Examples](https://execbox.aallam.com/examples)
- [Security & Boundaries](https://execbox.aallam.com/security)
- [Remote Workflow](https://execbox.aallam.com/architecture/execbox-remote-workflow)
- [Protocol Reference](https://execbox.aallam.com/architecture/execbox-protocol-reference)
- [Runner Specification](https://execbox.aallam.com/architecture/execbox-runner-specification)
