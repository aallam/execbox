<div align="center">

# execbox

Portable code execution for [Model Context Protocol](https://modelcontextprotocol.io/) tools and wrapped MCP servers.

[![License](https://img.shields.io/github/license/aallam/execbox?style=flat-square)](https://github.com/aallam/execbox/blob/main/LICENSE)
[![Docs](https://img.shields.io/badge/docs-site-0ea5e9?style=flat-square)](https://execbox.aallam.com)
[![Packages](https://img.shields.io/badge/packages-3-111827?style=flat-square)](#package-map)

</div>

Execbox turns host tool catalogs into callable guest namespaces, supports MCP wrapping on both sides of the boundary, and lets you place guest JavaScript where it fits your deployment: inline QuickJS, worker-hosted QuickJS, or a remote runner behind your own transport.

## Package Map

| Package                                   | npm                                                                                                                           | What it is for                                                                            |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [`@execbox/core`](./packages/core/)       | [![npm](https://img.shields.io/npm/v/%40execbox%2Fcore?style=flat-square)](https://www.npmjs.com/package/@execbox/core)       | Core execution contract, provider resolution, MCP adapters, and runtime/protocol subpaths |
| [`@execbox/quickjs`](./packages/quickjs/) | [![npm](https://img.shields.io/npm/v/%40execbox%2Fquickjs?style=flat-square)](https://www.npmjs.com/package/@execbox/quickjs) | QuickJS executor for inline and worker hosts                                              |
| [`@execbox/remote`](./packages/remote/)   | [![npm](https://img.shields.io/npm/v/%40execbox%2Fremote?style=flat-square)](https://www.npmjs.com/package/@execbox/remote)   | Advanced transport-backed executor for app-owned runtime boundaries                       |

## Examples

Runnable examples live in [`examples/`](./examples/) and are indexed in [`examples/README.md`](./examples/README.md).

## Docs

- [Public Docs](https://execbox.aallam.com)
- [Getting Started Guide](./docs/src/content/docs/getting-started.md)
- [Execbox Architecture Overview](./docs/src/content/docs/architecture/index.md)
