# Security & Boundaries

Execbox provides defense-in-depth controls for guest code execution. The isolation level you get depends on the executor and deployment boundary you choose.

## What execbox does provide

- Fresh execution state per call
- JSON-only tool and result boundaries
- Schema validation around host tool execution
- Bounded logs
- Timeout and memory controls
- Abort propagation into in-flight host tool work

## What execbox does not claim

- A hard security boundary for hostile or multi-tenant code by default
- That in-process runtimes are equivalent to a container, VM, or separate trust domain
- That wrapping a third-party MCP server removes the need to evaluate that dependency

## The real capability boundary

The provider/tool surface is the capability boundary.

Providers are explicit capability grants. If guest code can call a dangerous tool, guest code can exercise that authority. Execbox changes how tool access is exposed and controlled; it does not erase the authority behind the tool itself.

## Choosing the right boundary

| Need | Recommended path |
| --- | --- |
| Lowest friction | `@execbox/quickjs` |
| Off-main-thread lifecycle isolation | `@execbox/worker` |
| Stronger lifecycle split and hard-kill timeout path | `@execbox/process` |
| Application-owned remote/runtime boundary | `@execbox/remote` |
| Explicit `isolated-vm` runtime choice | `@execbox/isolated-vm` |

For hostile-code or multi-tenant deployments, prefer `@execbox/process` or `@execbox/remote` behind a container, VM, or equivalent boundary that you control operationally.

## Deeper reading

- [Architecture Overview](/architecture/)
- [Executors](/architecture/execbox-executors)
- [MCP And Protocol](/architecture/execbox-mcp-and-protocol)
