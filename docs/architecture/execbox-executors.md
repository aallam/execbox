# Execbox Executors

This page explains how the available executors and QuickJS host modes differ and what trade-offs they make.

## Executor Comparison

| Executor or mode                        | Runtime boundary                      | Tool bridge style               | Main strengths                                   | Main constraints                                |
| --------------------------------------- | ------------------------------------- | ------------------------------- | ------------------------------------------------ | ----------------------------------------------- |
| `QuickJsExecutor`                       | Fresh in-process QuickJS runtime      | Shared runner callback          | No native addon, simple install, default backend | Still in-process                                |
| `QuickJsExecutor` with `host: "worker"` | Worker thread + fresh QuickJS runtime | Shared host session + messages  | Hard-stop worker termination, pooled by default  | Still same OS process; ephemeral mode is slower |
| `RemoteExecutor`                        | App-defined remote transport boundary | Shared host session + transport | Same API across a remote boundary                | You own transport/runtime deployment            |

```mermaid
flowchart LR
    HOST["Host application"]
    QJS["QuickJsExecutor"]
    QJSRT["QuickJS runtime"]
    REM["RemoteExecutor"]
    REMRT["Remote runner"]
    WQJS["QuickJsExecutor\nhost: worker"]
    THREAD["Worker thread"]
    RUNNER["core runner semantics"]
    PROTO["@execbox/core/protocol<br/>messages + host session"]
    WQJSRT["QuickJS runtime in worker"]

    HOST --> QJS --> QJSRT
    HOST --> REM --> REMRT
    HOST --> WQJS --> THREAD --> WQJSRT
    QJS --> RUNNER
    REM --> PROTO
    REMRT --> RUNNER
    WQJS --> PROTO
    THREAD --> RUNNER
```

## QuickJS

`QuickJsExecutor` is the default reference implementation for execbox. It uses the shared runner semantics from `@execbox/core/runtime`: providers are converted to manifests, host tool calls are dispatched through the shared dispatcher helper, and the reusable QuickJS runner turns them back into guest-visible async functions.

That design gives QuickJS two useful properties:

- the runtime semantics are centralized in one runner implementation
- the same guest/tool-call model can be reused behind hosted worker and remote transport boundaries

## Worker-Hosted QuickJS

`QuickJsExecutor` with `host: "worker"` uses a worker thread for lifecycle isolation, but it does not invent a second scripting model. It loads the same QuickJS session runner used by the inline QuickJS executor, reuses the shared QuickJS protocol endpoint inside the worker, and uses the shared `@execbox/core/protocol` host session on the parent side. By default it keeps a worker shell warm between executions; `mode: "ephemeral"` switches to a fresh worker per execution.

```mermaid
sequenceDiagram
    participant Host as Host app
    participant Exec as QuickJsExecutor(host=worker)
    participant Worker as Worker thread
    participant Runner as QuickJS runner

    Host->>Exec: execute(code, providers)
    Exec->>Worker: execute message + manifests
    Worker->>Runner: start QuickJS session
    Runner-->>Exec: started
    Runner-->>Exec: tool_call
    Exec-->>Runner: tool_result
    Runner-->>Exec: done
    Exec-->>Host: ExecuteResult
```

## Timeout, Memory, and Abort Trade-offs

The available executors expose the same public result shape, but they enforce limits differently.

| Concern             | QuickJS inline                            | Remote                                                                     | QuickJS host: worker                                                            |
| ------------------- | ----------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Timeout             | QuickJS interrupt/deadline handling       | Shared host-session timeout + remote cancel + transport teardown           | Shared host-session timeout + worker cancellation + worker termination backstop |
| Memory              | QuickJS runtime memory limit              | Remote runtime decides the hard boundary; execbox still forwards limits    | QuickJS memory limit inside worker, optional worker resource limits as backstop |
| Abort to host tools | Abort signal passed through core callback | Abort signal passed through shared host session                            | Abort signal passed through shared host session                                 |
| Log capture         | Captured inside runner                    | Captured inside the remote runner and returned over the transport boundary | Captured inside worker-side QuickJS runner                                      |

## Security and Operational Trade-offs

- All executor modes provide defense-in-depth measures, not standalone hard hostile-code boundaries.
- QuickJS is the easiest operational default and has the cleanest shared runtime story.
- Remote execution keeps the same executor API while moving the runtime behind an app-defined boundary, but execbox deliberately does not ship the network stack for you.
- Worker-hosted QuickJS improves lifecycle isolation and hard-stop behavior, but not process-level trust isolation.

## Pooled QuickJS Shells

The QuickJS-backed executors that benefit from pooling can keep the expensive outer shell warm without reusing guest runtime state:

- `QuickJsExecutor` with `host: "worker"`: pooled-by-default reusable worker threads, with `mode: "ephemeral"` opt-out

Every `execute()` call still creates a fresh QuickJS runtime/context, reinjects providers, and discards guest globals afterward. Timeouts and internal transport failures evict the affected shell from the pool instead of returning it to circulation.

### How The Pool Works

Pooling is implemented at the host-shell layer, not at the QuickJS runtime layer.

- `@execbox/core/protocol` exposes a small bounded async `createResourcePool()` helper that owns reusable shells, idle eviction, and `prewarm()` / `dispose()` support.
- Hosted `QuickJsExecutor` pools `Worker` shells. Each shell owns one long-lived transport wrapper plus one attached QuickJS protocol endpoint.
- The worker entrypoint only attaches `attachQuickJsProtocolEndpoint(...)` once. That endpoint accepts one active `execute` message at a time and starts a fresh `runQuickJsSession()` for each message.
- Concurrency therefore comes from pool size, not from multiplexing several executions through one shell.

At execution time the flow is:

1. The executor resolves pooled mode unless `mode: "ephemeral"` disables it.
2. The pooled path acquires one shell lease from the shared resource pool.
3. The executor passes a borrowed transport wrapper into `runHostTransportSession()`.
4. `runHostTransportSession()` drives the full execute/tool-call/cancel/done protocol for that one execution.
5. When the host session settles, `onSettled` releases the lease back to the pool or evicts it.

The borrowed transport wrapper matters because `runHostTransportSession()` always disposes the transport after a session ends. In pooled mode the executor must keep the underlying shell alive across executions, so it passes a wrapper whose `dispose()` is intentionally a no-op while still forwarding `send`, `onMessage`, `onError`, `onClose`, and `terminate`.

If all shells are busy and the pool is already at `maxSize`, the next `acquire()` call waits in the pool's internal queue instead of failing or creating another shell. When a reusable shell is released, the oldest waiter gets it immediately; if a shell is evicted instead, the pool creates a replacement for queued waiters when capacity is available again. This queueing delay happens before `runHostTransportSession()` starts, so it is backpressure rather than execution-timeout accounting.

### Reuse And Eviction Rules

- Successful executions return the shell to the pool.
- Normal guest/runtime/tool failures also return the shell, because they do not imply a poisoned host shell.
- `timeout` and `internal_error` results evict the shell, because those outcomes mean the worker/child or transport state may no longer be trustworthy.
- Idle pooled shells are evicted after `idleTimeoutMs`, down to `minSize`.
- `dispose()` tears down the executor-owned pool and any idle shells it still owns.

### Early Exit Handling

In pooled mode, a worker can exit before the host session subscribes to close events. The pooled transport wrappers retain the first close reason and replay it to later `onClose(...)` subscribers, so an early shell death still resolves as `internal_error` instead of hanging the execution.

### What Is Not Pooled

- `QuickJsExecutor` stays in-process and ephemeral because there is no expensive transport shell to reuse.
- `RemoteExecutor` stays transport-factory based and ephemeral because transport ownership belongs to the caller.

## Choosing an Executor

- Choose `QuickJsExecutor` when you want the default backend with the least operational friction.
- Choose `RemoteExecutor` when you want the same execution API but need the runtime to live behind an application-defined transport boundary.
- Choose `QuickJsExecutor` with `host: "worker"` when you want the QuickJS semantics off the main thread with a hard-stop termination path and low-latency pooled reuse by default.
