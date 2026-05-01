---
title: execbox
description: Portable code execution for MCP tools and wrapped MCP servers.
template: splash
next: false
hero:
  title: execbox
  tagline: Portable code execution for MCP tools and wrapped MCP servers, with runtime boundaries you choose.
  actions:
    - text: Getting Started
      link: /getting-started/
      variant: primary
---

## What execbox does

Execbox is a Node.js library for running guest JavaScript against host-defined tools and wrapped MCP servers. It separates:

- what tools are available
- where guest code runs
- how calls cross boundaries

That split gives you one execution contract across inline QuickJS, worker-hosted QuickJS, and remote transport-backed execution.

<div class="execbox-card-grid">
  <a class="execbox-card" href="/getting-started/">
    <h3>Install and run</h3>
    <p>Start with the smallest QuickJS example and one provider flow.</p>
  </a>
  <a class="execbox-card" href="/runtime-choices/">
    <h3>Choose a runtime</h3>
    <p>Pick inline QuickJS, worker-hosted QuickJS, or a remote runner.</p>
  </a>
  <a class="execbox-card" href="/architecture/execbox-mcp-and-protocol/">
    <h3>Wrap MCP tools</h3>
    <p>Expose upstream MCP catalogs as callable guest namespaces.</p>
  </a>
  <a class="execbox-card" href="/security/">
    <h3>Review boundaries</h3>
    <p>Understand the provider capability surface before production use.</p>
  </a>
</div>

## Runtime packages

| Backend               | Package            | Start here when                                                                      |
| --------------------- | ------------------ | ------------------------------------------------------------------------------------ |
| In-process QuickJS    | `@execbox/quickjs` | You want the easiest install and the default development path.                       |
| Worker-backed QuickJS | `@execbox/quickjs` | You want the runtime off the main thread with pooled worker reuse.                   |
| Remote transport      | `@execbox/remote`  | Your application owns the process, container, VM, or network boundary for a runtime. |
