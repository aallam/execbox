<div align="center">

# execbox

Portable code execution for host tools and [Model Context Protocol](https://modelcontextprotocol.io/) integrations.

[![License](https://img.shields.io/github/license/aallam/execbox?style=flat-square)](https://github.com/aallam/execbox/blob/main/LICENSE)
[![Docs](https://img.shields.io/badge/docs-site-0ea5e9?style=flat-square)](https://execbox.aallam.com)
[![Packages](https://img.shields.io/badge/packages-2-111827?style=flat-square)](#package-map)

</div>

Execbox turns host tool catalogs into callable guest namespaces and runs guest
JavaScript through inline or worker-hosted QuickJS. Use `@execbox/core` for
providers, schemas, and MCP adapters; use `@execbox/quickjs` for the runtime.

## Package Map

| Package                                   | npm                                                                                                                           | What it is for                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| [`@execbox/core`](./packages/core/)       | [![npm](https://img.shields.io/npm/v/%40execbox%2Fcore?style=flat-square)](https://www.npmjs.com/package/@execbox/core)       | Provider contracts, schema validation, MCP adapters |
| [`@execbox/quickjs`](./packages/quickjs/) | [![npm](https://img.shields.io/npm/v/%40execbox%2Fquickjs?style=flat-square)](https://www.npmjs.com/package/@execbox/quickjs) | Inline and worker-hosted QuickJS execution          |

## Install

```bash
npm install @execbox/core @execbox/quickjs
```

## Examples

Runnable examples live in [`examples/`](./examples/) and are indexed in [`examples/README.md`](./examples/README.md).

## Docs

- [Public Docs](https://execbox.aallam.com)
- [Getting Started Guide](./docs/src/content/docs/getting-started.md)
- [Providers & Tools](./docs/src/content/docs/providers-and-tools.md)
- [Runtime Choices](./docs/src/content/docs/runtime-choices.md)
- [MCP Integration](./docs/src/content/docs/mcp-integration.md)
