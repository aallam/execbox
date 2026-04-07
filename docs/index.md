---
layout: home
title: execbox
titleTemplate: false

hero:
  name: execbox
  text: Portable code execution for MCP tools
  tagline: Turn host tool catalogs into callable code, add defense-in-depth controls around guest execution, and choose the boundary that fits your deployment.
  actions:
    - theme: brand
      text: Getting Started
      link: /getting-started
    - theme: alt
      text: Explore Examples
      link: /examples
    - theme: alt
      text: Read the Architecture
      link: /architecture/

features:
  - title: Code-first tool use
    details: Let agents write code against typed tool namespaces instead of serializing every intermediate step back through tool calls.
  - title: Execution boundary choice
    details: Start with in-process QuickJS, move to worker threads or child processes, or push execution behind your own remote transport.
  - title: MCP on both sides
    details: Wrap upstream MCP tools into guest namespaces and expose execbox execution back out as MCP tools for downstream clients.
---

## What execbox is

Execbox is a Node.js library for running guest JavaScript against host-defined tools and wrapped MCP servers. It separates:

- what tools are available
- where guest code runs
- how calls cross boundaries

That split gives you one execution contract across QuickJS, worker-thread, child-process, remote, and `isolated-vm` backends.

## Choose a backend

| Backend | Package | Start here when |
| --- | --- | --- |
| In-process QuickJS | `@execbox/quickjs` | You want the easiest install and the default development path. |
| Worker-backed QuickJS | `@execbox/worker` | You want the runtime off the main thread with pooled worker reuse. |
| Process-backed QuickJS | `@execbox/process` | You want a stronger lifecycle boundary and hard-kill timeout behavior. |
| Remote transport | `@execbox/remote` | You already own the transport/runtime boundary and want execbox to plug into it. |
| isolated-vm | `@execbox/isolated-vm` | You explicitly want `isolated-vm` and can support its native/runtime constraints. |

## Security posture

Execbox provides defense-in-depth controls around guest code execution:

- It provides fresh runtimes, JSON-only boundaries, schema validation, bounded logs, and execution limits.
- Hard isolation depends on the executor and deployment boundary you choose.
- The provider/tool surface is the capability boundary.

Read [Security](/security) before deciding which executor to use in production.
