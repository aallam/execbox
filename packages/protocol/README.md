# @execbox/protocol

Transport-safe messages and host-session helpers for transport-backed execbox runtimes.

[![npm version](https://img.shields.io/npm/v/%40execbox%2Fprotocol?style=flat-square)](https://www.npmjs.com/package/@execbox/protocol)
[![License](https://img.shields.io/github/license/aallam/execbox?style=flat-square)](https://github.com/aallam/execbox/blob/main/LICENSE)

## What This Package Is For

This is a low-level package for building transport-backed execbox runtimes. It does not execute guest code by itself.

It currently provides:

- runner/dispatcher message types
- a shared host transport session for worker/process-style executors
- the same host transport session shape used by `@execbox/remote`
- transport-facing access to the shared manifest and dispatcher model from `@execbox/core`

Most application code should use `@execbox/core` plus an executor package directly instead of importing this package.
Treat this package as experimental and transport-internal while the execution architecture is still evolving.

## Used By

- `@execbox/worker`
- `@execbox/process`
- `@execbox/remote`

`@execbox/quickjs` and `@execbox/isolated-vm` use the shared runner semantics from `@execbox/core` directly and do not currently depend on this package.

## Install

```bash
npm install @execbox/core @execbox/protocol
```

## Security Notes

- This package is protocol glue, not a sandbox.
- It does not provide isolation by itself.
- The host tool surface remains the real capability boundary.
- Worker/process lifecycle isolation comes from the surrounding executor package, not from this package alone.

## Architecture Docs

- [Execbox architecture overview](https://github.com/aallam/execbox/blob/main/docs/architecture/README.md)
- [Execbox protocol reference](https://github.com/aallam/execbox/blob/main/docs/architecture/execbox-protocol-reference.md)
- [Execbox remote execution workflow](https://github.com/aallam/execbox/blob/main/docs/architecture/execbox-remote-workflow.md)
- [Execbox runner specification](https://github.com/aallam/execbox/blob/main/docs/architecture/execbox-runner-specification.md)
- [Execbox MCP adapters and protocol overview](https://github.com/aallam/execbox/blob/main/docs/architecture/execbox-mcp-and-protocol.md)
