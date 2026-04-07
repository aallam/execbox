# Execbox MCP Adapters And Protocol

This page covers two related but separate parts of the execbox architecture:

- MCP adapters in `@execbox/core`
- transport-safe execution plumbing in `@execbox/protocol`

Use this page as the overview. For the remote execution control flow, read [execbox-remote-workflow.md](./execbox-remote-workflow.md). For the message-level protocol contract, read [execbox-protocol-reference.md](./execbox-protocol-reference.md). For the normative runner specification, read [execbox-runner-specification.md](./execbox-runner-specification.md).

## MCP Adapter Responsibilities

The MCP adapter layer lets execbox sit on either side of an MCP tool catalog:

- `createMcpToolProvider({ client })` wraps caller-owned MCP client connections as execbox providers
- `openMcpToolProvider({ client | server })` opens a provider handle and is required when execbox owns a local `{ server }` connection
- `codeMcpServer()` exposes execbox execution back out as MCP tools such as `mcp_execute_code`, `mcp_search_tools`, and `mcp_code`

```mermaid
flowchart LR
    UP["Upstream MCP client or server"]
    WRAP["openMcpToolProvider / createMcpToolProvider"]
    PROVIDER["ResolvedToolProvider<br/>namespace + types + tool wrappers"]
    EXEC["Executor"]
    SERVER["codeMcpServer"]
    DOWN["Downstream MCP client"]

    UP --> WRAP --> PROVIDER
    PROVIDER --> EXEC
    PROVIDER --> SERVER
    EXEC --> SERVER
    SERVER --> DOWN
```

### Ownership Model

- `{ client }` sources stay caller-owned. `createMcpToolProvider()` is the ergonomic helper for that path.
- `{ server }` sources are execbox-owned. Callers use `openMcpToolProvider()` and close the returned handle.
- `codeMcpServer()` uses the same handle path internally and closes any resources it owns with the wrapper server.

## Protocol Responsibilities

`@execbox/protocol` is not a sandbox runtime. It provides the transport-safe layer that lets a trusted host and a runtime exchange execution messages without sharing host closures.

It owns:

- the `execute`, `cancel`, `started`, `tool_call`, `tool_result`, and `done` message types
- the shared host transport session used by `@execbox/process`, `@execbox/worker`, and `@execbox/remote`
- Node transport bootstrap helpers for worker and child-process execution
- the reusable async resource pool used by pooled process and worker shells
- transport-facing access to the shared manifest and dispatcher model defined in `@execbox/core`

The architecture split is:

- `@execbox/core` owns provider resolution, manifest extraction, and host-side tool dispatch semantics
- `@execbox/protocol` owns wire messages, host-session lifecycle, and host-side shell pooling utilities around those semantics

## How The Packages Fit Together

- `QuickJsExecutor` uses the shared runner semantics from `@execbox/core` directly.
- `IsolatedVmExecutor` uses the same core runner semantics, but keeps a direct `isolated-vm` bridge instead of transport messages.
- `ProcessExecutor` and `WorkerExecutor` use the shared host session from `@execbox/protocol` plus the shared QuickJS protocol endpoint inside the child or worker.
- `RemoteExecutor` uses that same host session across an app-owned transport boundary.
- Pooled process and worker execution reuse only the outer host shell. Each `execute()` call still starts a fresh QuickJS runtime through the shared protocol endpoint.

```mermaid
flowchart TB
    subgraph Core["Core runner semantics"]
        CORE["@execbox/core<br/>provider resolution + manifests + host tool dispatch"]
    end

    subgraph InProcess["In-process executors"]
        QJS["QuickJsExecutor"]
        IVM["IsolatedVmExecutor"]
    end

    subgraph TransportBacked["Transport-backed executors"]
        PROTO["@execbox/protocol<br/>messages + host session + resource pool"]
        PROC["ProcessExecutor"]
        WORKER["WorkerExecutor"]
        REM["RemoteExecutor"]
        ENDPOINT["QuickJS protocol endpoint"]
    end

    CORE --> QJS
    CORE --> IVM
    CORE --> PROTO
    PROC --> PROTO
    WORKER --> PROTO
    REM --> PROTO
    PROC --> ENDPOINT
    WORKER --> ENDPOINT
    REM --> ENDPOINT
```

## Transport-Backed Execution Flow

The same host-session model is used for process, worker, and remote execution:

```mermaid
sequenceDiagram
    participant Host as Trusted host
    participant Session as Host transport session
    participant Runner as Transport-backed runner
    participant Tool as Resolved tool wrapper

    Host->>Session: execute(code, providers, options)
    Session->>Runner: execute(id, code, options, manifests)
    Runner-->>Session: started
    Runner-->>Session: tool_call(callId, providerName, safeToolName, input)
    Session->>Tool: dispatch trusted tool call
    Tool-->>Session: result or ExecuteError
    Session-->>Runner: tool_result(callId, ok/result or error)
    Runner-->>Session: done(ExecuteResult)
    Session-->>Host: ExecuteResult
```

Important implications:

- tool closures and secrets stay on the host side
- runners only receive code, runtime options, provider metadata, and JSON-safe tool inputs and results
- the host session is responsible for timeout backstops, caller cancellation, transport failure handling, and tool-call correlation

## Boundaries And Trust

- MCP adapters decide how tool catalogs are discovered, wrapped, and re-exposed.
- The protocol decides how a transport-backed runtime asks the trusted host to invoke those tools.
- The provider surface remains the real capability boundary.
- Transport-backed execution changes where guest code runs, not who owns host capabilities.
