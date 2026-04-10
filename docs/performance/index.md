# Performance

This page covers the performance characteristics of execbox executors and offers guidance for choosing the right backend and pool configuration.

## Executor Comparison

Each executor makes a different trade-off between isolation strength and execution speed.

| Executor                      | Isolation                 | Relative Latency     | Best For                            |
| ----------------------------- | ------------------------- | -------------------- | ----------------------------------- |
| `QuickJsExecutor`             | In-process (WASM sandbox) | Fastest              | Trusted code, lowest latency        |
| `WorkerExecutor` (pooled)     | Worker thread             | Near in-process      | General use, good isolation + speed |
| `ProcessExecutor` (pooled)    | Child process             | Near in-process      | Strongest local isolation           |
| `WorkerExecutor` (ephemeral)  | Worker thread             | ~50–100x slower      | Strict per-execution isolation      |
| `ProcessExecutor` (ephemeral) | Child process             | ~150–300x slower     | Strict per-execution isolation      |
| `RemoteExecutor`              | Network transport         | Depends on transport | Network-level isolation             |

**Pooled mode** (the default for `WorkerExecutor` and `ProcessExecutor`) reuses a warm shell between executions while still creating a fresh guest runtime each time. This eliminates the worker/process startup cost that dominates ephemeral mode.

**In-process QuickJS** avoids IPC entirely and scales nearly linearly with concurrency.

## Key Characteristics

### Tool-call dispatch overhead is low

Each tool call incurs a small fixed overhead for dispatch lookup, JSON serialization, and the host round-trip. This overhead is consistent across executor types and does not grow with the number of calls. The total latency of a tool call is dominated by the tool's own work — a tool that makes a network request or database query will be far slower than one that returns immediately.

### Schema validation is effectively free

Schemas are compiled at provider-resolution time, so runtime validation is a single compiled-function call with negligible overhead (under 5%). Always use schemas — the performance cost is effectively zero for the safety they provide.

### Cold-start cost matters for the first execution

The first execution on a fresh executor pays a one-time cost to load the QuickJS WASM module and (for out-of-process executors) spawn the host shell. Call `executor.prewarm()` during application startup to pay this cost eagerly:

```ts
const executor = new WorkerExecutor();
await executor.prewarm(2); // warm 2 pooled shells
```

This is most impactful for `WorkerExecutor`, where it reduces first-execution latency by roughly 15–20%.

## Pool Sizing

Pool `maxSize` directly controls throughput. Requests that arrive when all pooled shells are busy will queue until a shell becomes available.

**Guidelines:**

- Set `maxSize` to at least the expected concurrent request count
- `WorkerExecutor` pool scales well — throughput increases roughly linearly with pool size
- `ProcessExecutor` pool can degrade at higher sizes (4+) under heavy concurrency due to OS scheduling contention between child processes
- For throughput-sensitive workloads, prefer `WorkerExecutor` over `ProcessExecutor`

```ts
const executor = new WorkerExecutor({
  pool: {
    maxSize: 4, // match expected concurrency
    minSize: 0, // allow idle eviction
    idleTimeoutMs: 30_000,
    prewarm: true, // warm on construction
  },
});
```

## Choosing an Executor

| Priority                                  | Recommended                |
| ----------------------------------------- | -------------------------- |
| Lowest latency, highest throughput        | `QuickJsExecutor`          |
| Thread-level isolation + good performance | `WorkerExecutor` (pooled)  |
| Process-level isolation                   | `ProcessExecutor` (pooled) |
| Remote / network isolation                | `RemoteExecutor`           |

For most applications, `WorkerExecutor` in pooled mode provides the best balance of isolation and performance.

Use `QuickJsExecutor` when running trusted code and latency is the primary concern. See the [security model](/security) before choosing an in-process executor for untrusted workloads.

