---
title: Security & Boundaries
description: Understand execbox's defense-in-depth controls, capability boundary, and production trust model.
---

Execbox provides defense-in-depth controls for guest code execution. The
supported v1 runtime choices are inline QuickJS and worker-hosted QuickJS, with
the provider surface acting as the application capability boundary.

## Built-in controls

- Fresh execution state for every call
- JSON-compatible tool inputs and results
- Schema validation before and after host tool execution
- Bounded log capture
- Timeout and memory controls in the executor
- Abort propagation into in-flight host tool work

## The real capability boundary

The provider/tool surface is the capability boundary.

Providers are explicit capability grants. Guest code receives the tool
namespaces you resolve and pass into an executor. Keep production providers
small, tenant-aware, and scoped to the exact operations the guest code should be
able to request.

## Choosing the deployment boundary

| Need                                 | Recommended path                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------------------- |
| Smallest trusted-code path           | Inline `QuickJsExecutor`                                                                      |
| Off-main-thread local execution      | `QuickJsExecutor` with `host: "worker"`                                                       |
| Hostile-code or multi-tenant service | Process, container, VM, or equivalent boundary around the application-level execution service |

Inline and worker-hosted QuickJS are runtime placement choices inside a Node.js
application. For hostile-code or multi-tenant deployments, run the
application-level execution service behind an operational boundary you control
and pass only the providers each caller should receive.

## MCP and upstream tools

Wrapping MCP tools is a dependency-trust decision as well as a provider design
decision. Treat an upstream MCP catalog as host capability, then expose a small
resolved provider to guest code. Keep upstream client ownership, authentication,
and tenant routing in host code.

## Deeper reading

- [Architecture Overview](/architecture/)
- [Runtime Choices](/runtime-choices/)
- [Providers & Tools](/providers-and-tools/)
- [MCP Integration](/mcp-integration/)
- [Performance](/performance/)
