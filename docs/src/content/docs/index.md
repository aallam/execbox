---
title: execbox
description: Portable code execution for host tools and MCP integrations.
next: false
---

Execbox is a Node.js 22+ library for running guest JavaScript against
host-defined tools and MCP tool catalogs. It gives you a small provider model in
`@execbox/core` and a QuickJS executor in `@execbox/quickjs` that can run inline
or in a worker thread.

Start by defining one provider, run it with QuickJS, then decide whether your
application should keep QuickJS inline or move it off the main thread.

## Install

```bash
npm install @execbox/core @execbox/quickjs
```

## Smallest example

Use [Getting Started](/getting-started/) to define one host tool, resolve it
with `@execbox/core`, and call it from guest JavaScript through
`QuickJsExecutor`.

## Packages

| Package            | Use it for                                              |
| ------------------ | ------------------------------------------------------- |
| `@execbox/core`    | Provider contracts, schema validation, and MCP adapters |
| `@execbox/quickjs` | Inline and worker-hosted QuickJS execution              |

## Read next

### Start

- [Getting Started](/getting-started/) - install execbox and run the smallest
  QuickJS flow
- [Providers & Tools](/providers-and-tools/) - design host tool namespaces,
  schemas, and result boundaries
- [Runtime Choices](/runtime-choices/) - choose between inline and worker-hosted
  QuickJS execution

### Use

- [Examples](/examples/) - run the main example flows from the repo
- [MCP Integration](/mcp-integration/) - wrap upstream MCP tools or expose
  execbox as MCP tools

### Understand

- [Security & Boundaries](/security/) - understand the capability boundary and
  deployment guidance
- [Architecture](/architecture/) - review the package and execution model
- [Performance](/performance/) - compare runtime placement and pooling tradeoffs
