# Examples

Runnable examples for library adopters using `@execbox/core` and
`@execbox/quickjs`.

[![Examples](https://img.shields.io/badge/examples-runnable-0ea5e9?style=flat-square)](https://github.com/aallam/execbox/tree/main/examples)
[![CI](https://img.shields.io/github/actions/workflow/status/aallam/execbox/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/aallam/execbox/actions/workflows/ci.yml)

## Run the examples

```bash
npm install
npm run build
npm run examples
```

See the public [Examples docs](https://execbox.aallam.com/examples) for when to
start with each example.

## Example index

| File                                                   | What it shows                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------- |
| [`execbox-basic.ts`](./execbox-basic.ts)               | Resolve a provider and execute guest code with inline QuickJS |
| [`execbox-worker.ts`](./execbox-worker.ts)             | Run the same provider flow with worker-hosted QuickJS         |
| [`execbox-mcp-provider.ts`](./execbox-mcp-provider.ts) | Wrap MCP tools into a provider and execute against them       |
| [`execbox-mcp-server.ts`](./execbox-mcp-server.ts)     | Expose `mcp_search_tools`, `mcp_execute_code`, and `mcp_code` |

Read [Providers & Tools](https://execbox.aallam.com/providers-and-tools),
[Runtime Choices](https://execbox.aallam.com/runtime-choices), and
[MCP Integration](https://execbox.aallam.com/mcp-integration) for the matching
guides.
