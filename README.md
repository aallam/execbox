<div align="center">

# execbox

Portable code execution for [Model Context Protocol](https://modelcontextprotocol.io/) tools and wrapped MCP servers.

[![License](https://img.shields.io/github/license/aallam/execbox?style=flat-square)](https://github.com/aallam/execbox/blob/main/LICENSE)
[![Docs](https://img.shields.io/badge/docs-site-0ea5e9?style=flat-square)](https://execbox.aallam.com)
[![Packages](https://img.shields.io/badge/packages-2-111827?style=flat-square)](#package-map)

</div>

Execbox turns host tool catalogs into callable guest namespaces, supports MCP wrapping on both sides of the boundary, and lets you run guest JavaScript through inline QuickJS or worker-hosted QuickJS.

## Package Map

| Package                                   | npm                                                                                                                           | What it is for                                                                            |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [`@execbox/core`](./packages/core/)       | [![npm](https://img.shields.io/npm/v/%40execbox%2Fcore?style=flat-square)](https://www.npmjs.com/package/@execbox/core)       | Core execution contract, provider resolution, MCP adapters, and runtime/protocol subpaths |
| [`@execbox/quickjs`](./packages/quickjs/) | [![npm](https://img.shields.io/npm/v/%40execbox%2Fquickjs?style=flat-square)](https://www.npmjs.com/package/@execbox/quickjs) | QuickJS executor for inline and worker hosts                                              |

## Examples

Runnable examples live in [`examples/`](./examples/) and are indexed in [`examples/README.md`](./examples/README.md).

## Docs

- [Public Docs](https://execbox.aallam.com)
- [Getting Started Guide](./docs/src/content/docs/getting-started.md)
- [Execbox Architecture Overview](./docs/src/content/docs/architecture/index.md)
