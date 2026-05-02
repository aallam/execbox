---
title: execbox
description: Portable code execution for MCP tools and wrapped MCP servers.
next: false
---

Execbox is a Node.js 22+ library for running guest JavaScript against
host-defined tools and wrapped MCP servers. Start with the QuickJS executor,
get one provider call working, then choose a runtime placement that matches your
deployment boundary.

## Install

```bash
npm install @execbox/core @execbox/quickjs
```

## Smallest example

Use [Getting Started](/getting-started/) to define one host tool and call it
from guest JavaScript through `QuickJsExecutor`.

## Packages

| Package            | Use it for                                                   |
| ------------------ | ------------------------------------------------------------ |
| `@execbox/core`    | Provider contracts, MCP adapters, and shared runtime helpers |
| `@execbox/quickjs` | Inline and worker-hosted QuickJS execution                   |
| `@execbox/remote`  | Transport-backed execution with an app-owned remote runtime  |

## Read next

### Start

- [Getting Started](/getting-started/) - install execbox and run the smallest
  QuickJS flow
- [Runtime Choices](/runtime-choices/) - choose between inline, worker, and
  remote execution

### Use

- [Examples](/examples/) - run the main example flows from the repo
- [MCP Provider](/architecture/execbox-mcp-and-protocol/) - wrap upstream MCP
  tools as guest-callable namespaces
- [Remote Runner](/architecture/execbox-remote-workflow/) - move guest
  execution behind your own transport

### Understand

- [Security & Boundaries](/security/) - understand what execbox does and does
  not isolate
- [Architecture](/architecture/) - review the package and runtime model
- [Performance](/performance/) - compare runtime placement and pooling tradeoffs
