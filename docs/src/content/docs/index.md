---
title: execbox
description: Portable code execution for MCP tools and wrapped MCP servers.
template: splash
next: false
hero:
  title: execbox
  tagline: Run guest JavaScript against host-defined tools and wrapped MCP servers with one portable execution contract.
  actions:
    - text: Getting Started
      link: /getting-started/
      variant: primary
---

<section class="execbox-start">
  <div>
    <p class="execbox-eyebrow">Node.js 22+ library for tool-backed JavaScript execution</p>
    <h2>Start with one provider and one guest call.</h2>
    <p>
      Execbox turns host tool catalogs into scoped guest namespaces. Begin with
      the QuickJS package, execute a small provider flow, then move into examples
      or MCP wrapping when the contract is clear.
    </p>
  </div>
  <div class="execbox-command" aria-label="Install execbox">
    <div class="execbox-command__bar">
      <span>Install</span>
      <code>npm</code>
    </div>
    <pre><code>npm install @execbox/core @execbox/quickjs</code></pre>
  </div>
</section>

<section class="execbox-paths" aria-labelledby="start-building">
  <div class="execbox-section-heading">
    <p class="execbox-eyebrow">Start building</p>
    <h2 id="start-building">Follow the shortest path into the docs.</h2>
  </div>
  <div class="execbox-path-grid">
    <a class="execbox-path execbox-path--primary" href="/getting-started/">
      <span class="execbox-path__step">01</span>
      <h3>Run the smallest example</h3>
      <p>Install the packages, define one host tool, and call it from guest JavaScript.</p>
      <strong>Open Getting Started</strong>
    </a>
    <a class="execbox-path" href="/examples/">
      <span class="execbox-path__step">02</span>
      <h3>Try the runnable flows</h3>
      <p>Compare the basic, worker, remote, MCP provider, and MCP server examples.</p>
      <strong>Browse Examples</strong>
    </a>
    <a class="execbox-path" href="/architecture/execbox-mcp-and-protocol/">
      <span class="execbox-path__step">03</span>
      <h3>Wrap MCP tools</h3>
      <p>Expose upstream MCP catalogs as callable guest namespaces through the execbox protocol.</p>
      <strong>Read MCP Provider</strong>
    </a>
  </div>
</section>

<section class="execbox-contract" aria-labelledby="contract">
  <div class="execbox-section-heading">
    <p class="execbox-eyebrow">What stays consistent</p>
    <h2 id="contract">A small contract between host tools and guest code.</h2>
  </div>
  <div class="execbox-contract-grid">
    <div>
      <h3>Host-owned capabilities</h3>
      <p>Applications decide which tools exist and how each call is executed.</p>
    </div>
    <div>
      <h3>Scoped guest namespaces</h3>
      <p>Guest code calls named providers instead of reaching into host internals.</p>
    </div>
    <div>
      <h3>JSON-only transport shape</h3>
      <p>Inputs, outputs, logs, and tool calls stay serializable across boundaries.</p>
    </div>
  </div>
</section>
