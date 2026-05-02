---
title: Security & Boundaries
description: Understand execbox's defense-in-depth controls, capability boundary, and production trust model.
---

Execbox provides defense-in-depth controls for guest code execution. The supported v1 runtime choices are inline QuickJS and worker-hosted QuickJS, with the provider surface acting as the capability boundary.

## Built-in controls

- Fresh execution state per call
- JSON-only tool and result boundaries
- Schema validation around host tool execution
- Bounded logs
- Timeout and memory controls
- Abort propagation into in-flight host tool work

## The real capability boundary

The provider/tool surface is the capability boundary.

Providers are explicit capability grants. Guest code receives only the tool namespaces you resolve and pass into an executor. Keep production providers small, tenant-aware, and scoped to the exact operations the guest code should be able to request.

## Choosing the right boundary

| Need                                | Recommended path                         |
| ----------------------------------- | ---------------------------------------- |
| Lowest friction                     | `@execbox/quickjs`                       |
| Off-main-thread lifecycle isolation | `@execbox/quickjs` with `host: "worker"` |

For hostile-code or multi-tenant deployments, run the application-level execution service behind a process, container, VM, or equivalent boundary that you control operationally, and keep the provider surface minimal.

## Deeper reading

- [Architecture Overview](/architecture/)
- [Runtime Choices](/runtime-choices/)
- [Executors](/architecture/execbox-executors/)
- [MCP And Protocol](/architecture/execbox-mcp-and-protocol/)
- [Performance](/performance/)
