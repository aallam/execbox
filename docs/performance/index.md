# Performance

This page summarizes practical performance guidance for choosing and configuring execbox executors.

## Executor Comparison

Each executor makes a different trade-off between isolation strength, startup cost, and steady-state latency.

| Executor                      | Isolation                                                    | Relative Latency                                                                 | Best For                                                              |
| ----------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `QuickJsExecutor`             | In-process QuickJS runtime                                   | Fastest steady-state path                                                        | Trusted code and the lowest possible latency                          |
| `WorkerExecutor` (pooled)     | Worker thread shell with a fresh guest runtime per execution | Low latency after startup                                                        | General use when you want strong local isolation with good throughput |
| `ProcessExecutor` (pooled)    | Child-process shell with a fresh guest runtime per execution | Low latency after startup, but typically wider tails than worker pooled           | Cases where process isolation matters more than tail latency          |
| `WorkerExecutor` (ephemeral)  | Fresh worker per execution                                   | High startup cost                                                                | Per-execution host isolation when you accept much higher latency      |
| `ProcessExecutor` (ephemeral) | Fresh child process per execution                            | Highest startup cost                                                             | Strict per-execution process boundaries                               |
| `RemoteExecutor`              | Network transport                                            | Depends on the transport and remote host                                         | Remote isolation, remote capacity, or remote scheduling               |

## Practical Characteristics

### Pooled executors are the default hot-path choice

`WorkerExecutor` and `ProcessExecutor` both default to pooled mode. Pooling reuses the worker or process shell while still creating a fresh guest runtime for each execution. That keeps the host boundary in place without paying shell startup cost on every call.

If you care about request latency or throughput, start with pooled mode. Ephemeral mode is primarily an isolation choice, not a speed choice.

### Tool-call overhead is usually not the bottleneck

Tool calls still pay for host dispatch, serialization, and the round-trip back into the guest runtime, but that overhead is usually small compared with the work inside the tool itself. In real applications, the tool's own network, disk, or service calls usually dominate end-to-end latency, and schema validation cost is typically small enough that correctness and interoperability should take priority over trying to tune it away.

### First execution is different from steady state

Fresh executors are slower than steady-state pooled executors because they still need to stand up the host shell and the guest runtime. Use `prewarm()` on pooled worker or process executors when you want warm shells ready before traffic arrives.

Do not rely on `prewarm()` as a guaranteed first-request speedup on every machine. Its main role is to bring pooled shells online ahead of demand so the first live request does not need to pay that setup cost itself.

## Pool Sizing

Pool `maxSize` is the main throughput control for pooled worker and process executors.

- Size the pool to the concurrency you actually expect, not just to the default.
- When requests outnumber available pooled shells, extra work queues behind the pool and latency rises quickly.
- `WorkerExecutor` generally gives the best throughput and tighter tail latency for local execution workloads.
- `ProcessExecutor` is still a valid choice when process isolation matters, but benchmark your own workload instead of assuming that a larger pool always helps.

```ts
const executor = new WorkerExecutor({
  pool: {
    maxSize: 4,
    minSize: 0,
    idleTimeoutMs: 30_000,
    prewarm: true,
  },
});
```

## Choosing An Executor

| Priority                                       | Recommended                                             |
| ---------------------------------------------- | ------------------------------------------------------- |
| Lowest latency for trusted code                | `QuickJsExecutor`                                       |
| Best local balance of isolation and throughput | `WorkerExecutor` (pooled)                               |
| Process isolation with warm shells             | `ProcessExecutor` (pooled)                              |
| Fresh host boundary every execution            | `WorkerExecutor` or `ProcessExecutor` in ephemeral mode |
| Remote isolation or remote capacity            | `RemoteExecutor`                                        |

For most applications, start with `WorkerExecutor` in pooled mode and only move away from it when you have a clear isolation or deployment reason.

Use `QuickJsExecutor` only for trusted code paths. See the [security model](/security) before treating an in-process runtime as if it were a hard tenant boundary.
