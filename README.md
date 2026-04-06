<div align="center">

# execbox

Secure code execution for [Model Context Protocol](https://modelcontextprotocol.io/) tools and wrapped MCP servers.

[![License](https://img.shields.io/github/license/aallam/execbox?style=flat-square)](https://github.com/aallam/execbox/blob/main/LICENSE)
[![Packages](https://img.shields.io/badge/packages-7-111827?style=flat-square)](#package-map)

</div>

Execbox turns host tool catalogs into callable guest namespaces, supports MCP wrapping on both sides of the boundary, and lets you choose where guest JavaScript runs: in-process, in a worker, in a child process, or behind your own remote transport.

The transport-backed QuickJS executors that benefit from it now reuse host-side shells. `@execbox/process` and `@execbox/worker` default to pooled shells while still creating a fresh QuickJS runtime/context on every `execute()` call. `@execbox/quickjs` and `@execbox/remote` stay ephemeral.

## Package Map

| Package                                           | npm                                                                                                                                   | What it is for                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [`@execbox/core`](./packages/core/)               | [![npm](https://img.shields.io/npm/v/%40execbox%2Fcore?style=flat-square)](https://www.npmjs.com/package/@execbox/core)               | Core execution contract, provider resolution, and MCP adapters |
| [`@execbox/protocol`](./packages/protocol/)       | [![npm](https://img.shields.io/npm/v/%40execbox%2Fprotocol?style=flat-square)](https://www.npmjs.com/package/@execbox/protocol)       | Transport-safe messages and shared host-session helpers        |
| [`@execbox/quickjs`](./packages/quickjs/)         | [![npm](https://img.shields.io/npm/v/%40execbox%2Fquickjs?style=flat-square)](https://www.npmjs.com/package/@execbox/quickjs)         | QuickJS backend for execbox                                    |
| [`@execbox/remote`](./packages/remote/)           | [![npm](https://img.shields.io/npm/v/%40execbox%2Fremote?style=flat-square)](https://www.npmjs.com/package/@execbox/remote)           | Transport-backed remote executor                               |
| [`@execbox/process`](./packages/process/)         | [![npm](https://img.shields.io/npm/v/%40execbox%2Fprocess?style=flat-square)](https://www.npmjs.com/package/@execbox/process)         | Child-process QuickJS executor                                 |
| [`@execbox/worker`](./packages/worker/)           | [![npm](https://img.shields.io/npm/v/%40execbox%2Fworker?style=flat-square)](https://www.npmjs.com/package/@execbox/worker)           | Worker-thread QuickJS executor                                 |
| [`@execbox/isolated-vm`](./packages/isolated-vm/) | [![npm](https://img.shields.io/npm/v/%40execbox%2Fisolated-vm?style=flat-square)](https://www.npmjs.com/package/@execbox/isolated-vm) | `isolated-vm` backend for execbox                              |

## Examples

Runnable examples live in [`examples/`](./examples/) and are indexed in [`examples/README.md`](./examples/README.md).

## Docs

- [Execbox Architecture Overview](./docs/architecture/README.md)
- [QuickJS Pooling Baseline](./docs/performance/quickjs-pooling-baseline.md)
