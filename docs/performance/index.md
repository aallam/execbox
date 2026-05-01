# Performance

This page summarizes practical performance guidance for choosing and configuring execbox executors.

## Executor Comparison

Each executor makes a different trade-off between runtime placement, startup cost, and steady-state latency.

| Executor                                        | Runtime placement                                            | Relative Latency                         | Best For                                                            |
| ----------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------- |
| `QuickJsExecutor`                               | In-process QuickJS runtime                                   | Fastest steady-state path                | Trusted code and the lowest possible latency                        |
| `QuickJsExecutor` (`host: "worker"`, pooled)    | Worker thread shell with a fresh guest runtime per execution | Low latency after startup                | Off-main-thread execution with good local throughput                |
| `QuickJsExecutor` (`host: "worker"`, ephemeral) | Fresh worker per execution                                   | High startup cost                        | Fresh worker lifecycle per execution when higher latency is allowed |
| `RemoteExecutor`                                | Caller-owned transport to a remote runner                    | Depends on the transport and remote host | App-owned runtime boundaries, remote capacity, or remote scheduling |

## Practical Characteristics

### Pooled executors are the default hot-path choice

Worker-hosted `QuickJsExecutor` defaults to pooled mode. Pooling reuses the worker shell while still creating a fresh guest runtime for each execution. That keeps the off-main-thread shell warm without paying worker startup cost on every call.

If you care about request latency or throughput, start with pooled mode. Ephemeral mode is primarily an isolation choice, not a speed choice.

### Tool-call overhead is usually not the bottleneck

Tool calls still pay for host dispatch, serialization, and the round-trip back into the guest runtime, but that overhead is usually small compared with the work inside the tool itself. In real applications, the tool's own network, disk, or service calls usually dominate end-to-end latency, and schema validation cost is typically small enough that correctness and interoperability should take priority over trying to tune it away.

### First execution is different from steady state

Fresh worker shells are slower than steady-state pooled executors because they still need to stand up the shell and the guest runtime. Use `prewarm()` on pooled worker hosts when you want those costs paid before traffic arrives; it warms both the outer shell and a real no-op guest execution path.

## Pool Sizing

Pool `maxSize` is the main throughput control for worker-hosted QuickJS executors.

- `QuickJsExecutor` with `host: "worker"` starts with a CPU-aware default pool size based on available parallelism, capped at `4`.
- Size the pool to the concurrency you actually expect, not just to the default.
- When requests outnumber available pooled shells, extra work queues behind the pool and latency rises quickly.
- `QuickJsExecutor` with `host: "worker"` generally gives the best throughput and tighter tail latency for local execution workloads.

```ts
const executor = new QuickJsExecutor({
  host: "worker",
  pool: {
    maxSize: 4,
    minSize: 0,
    idleTimeoutMs: 30_000,
    prewarm: true,
  },
});
```

## Choosing An Executor

| Priority                                      | Recommended                                            |
| --------------------------------------------- | ------------------------------------------------------ |
| Lowest latency for trusted code               | `QuickJsExecutor`                                      |
| Best local off-main-thread throughput         | `QuickJsExecutor` with `host: "worker"` in pooled mode |
| Fresh worker lifecycle every execution        | `QuickJsExecutor` with worker `mode: "ephemeral"`      |
| App-owned runtime boundary or remote capacity | `RemoteExecutor`                                       |

For most applications, start with `QuickJsExecutor` and move to `host: "worker"` when you want local execution off the main thread without leaving the package.

Use `QuickJsExecutor` only for trusted code paths. See [Security & Boundaries](/security) before treating an in-process runtime as if it were a hard tenant boundary.
