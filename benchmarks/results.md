# execbox Performance Benchmark Results

- **Date:** 2026-05-01
- **Environment:** Node v24.13.1 | darwin arm64 (Apple Silicon)
- **Configuration:** iterations=15, warmups=3
- **Command:** `npm run benchmark -- --iterations=15 --warmups=3`

This file records the current local benchmark run. Treat the tables as measured data for this environment, not universal library guarantees.

---

## 1. Single-Execution Latency

| Executor             | No Tools (median) | 1 Tool Call (median) | 2 Tool Calls (median) |
| -------------------- | ----------------- | -------------------- | --------------------- |
| QuickJS (in-process) | **1.47ms**        | **2.71ms**           | **3.94ms**            |
| Worker (ephemeral)   | 62.40ms           | 64.16ms              | 65.67ms               |
| Worker (pooled)      | 1.53ms            | 2.81ms               | 4.10ms                |
| Process (ephemeral)  | 202.37ms          | 204.10ms             | 207.70ms              |
| Process (pooled)     | 1.61ms            | 2.92ms               | 4.18ms                |

### Notes

- On this machine, warmed pooled executors stayed close to QuickJS for trivial scripts.
- Ephemeral executors remained far slower than pooled executors because each execution still pays worker or process startup cost.
- Process pooled stayed low-latency in median terms, but its process startup path remained much more expensive than worker startup.

---

## 2. Cold-Start vs Warm-Start

Only pooled executors expose explicit `prewarm()`. QuickJS and ephemeral executors are reported as fresh-executor first-run only.

| Executor             | Cold First-Run (median) | Warm First-Run (median) | Speedup |
| -------------------- | ----------------------- | ----------------------- | ------- |
| QuickJS (in-process) | 1.46ms                  | N/A                     | N/A     |
| Worker (ephemeral)   | 62.70ms                 | N/A                     | N/A     |
| Worker (pooled)      | 62.30ms                 | 1.81ms                  | 97.1%   |
| Process (ephemeral)  | 202.51ms                | N/A                     | N/A     |
| Process (pooled)     | 202.31ms                | 2.32ms                  | 98.9%   |

### Notes

- True `prewarm()` delivered the intended first-request behavior in this run: pooled worker and pooled process executors dropped from shell-plus-guest startup latency to low-single-digit warm execution latency.
- `prewarm()` pays the host-shell and guest-startup path before live traffic arrives.

---

## 3. Tool-Call Overhead Scaling

| Tool Calls | QuickJS (median) | Worker Pooled (median) |
| ---------- | ---------------- | ---------------------- |
| 0          | 1.39ms           | 1.48ms                 |
| 1          | 2.63ms           | 2.77ms                 |
| 5          | 7.65ms           | 7.88ms                 |
| 10         | 13.93ms          | 14.28ms                |

**Marginal cost per tool call**

|               | QuickJS     | Worker (pooled) |
| ------------- | ----------- | --------------- |
| From 1 call   | 1.24ms/call | 1.29ms/call     |
| From 5 calls  | 1.25ms/call | 1.28ms/call     |
| From 10 calls | 1.25ms/call | 1.28ms/call     |

### Notes

- Tool-call cost still scaled roughly linearly in this run.
- QuickJS and worker pooled stayed close enough that real tool work is still likely to dominate end-to-end latency once tools do anything non-trivial.

---

## 4. Schema Validation Overhead

| Executor             | With Schema (median) | Without Schema (median) | Overhead        |
| -------------------- | -------------------- | ----------------------- | --------------- |
| QuickJS (in-process) | 2.72ms               | 2.76ms                  | -0.05ms (-1.7%) |
| Worker (pooled)      | 2.82ms               | 2.79ms                  | 0.04ms (1.4%)   |

### Notes

- Schema validation remained a small absolute cost in this run.
- The measured deltas are close enough to local noise that this still reinforces the guidance that schema validation is not the place to chase meaningful latency gains.

---

## 5. Concurrent Throughput

The pooled benchmark factories in this suite use a fixed `pool.maxSize: 2`.

| Executor             | Conc=1 (exec/s) | Conc=2 | Conc=4 | Conc=8     |
| -------------------- | --------------- | ------ | ------ | ---------- |
| QuickJS (in-process) | **395.3**       | 684.6  | 1078.8 | **1635.1** |
| Worker (pooled)      | 356.5           | 722.9  | 706.4  | 749.8      |
| Process (pooled)     | 352.3           | 653.2  | 634.5  | 675.1      |

### Notes

- QuickJS stayed the strongest path for trusted, in-process workloads at low and high concurrency in this run, while worker pooled edged ahead at concurrency 2.
- Worker and process pooled executors paid visible queueing once demand moved past the benchmark pool size.
- Process pooled stayed competitive, but it still trailed worker pooled at every tested concurrency level.

---

## 6. Pool Contention

| Executor | Pool Size | Throughput (exec/s) | Median Latency | P95 Latency | Max Latency |
| -------- | --------- | ------------------- | -------------- | ----------- | ----------- |
| Worker   | 1         | 362.6               | 22.18ms        | 22.51ms     | 22.53ms     |
| Worker   | 2         | 704.2               | 10.97ms        | 11.64ms     | 12.39ms     |
| Worker   | 4         | **1327.2**          | 5.60ms         | 6.95ms      | 6.99ms      |
| Process  | 1         | 351.0               | 22.54ms        | 23.66ms     | 23.97ms     |
| Process  | 2         | 693.3               | 11.02ms        | 12.95ms     | 12.99ms     |
| Process  | 4         | 1111.3              | 6.50ms         | 8.73ms      | 8.75ms      |

### Notes

- Increasing pool size improved both worker and process executors in this run.
- Worker pooled still kept the better mix of throughput and tail latency at every pool size tested.
- Process pooled also scaled up well here, but its tails remained wider than worker pooled at the same pool size.

---

## 7. Host-Process Memory Delta

This suite only measures the parent Node process. It does not attempt to attribute child-process RSS back to `QuickJsExecutor({ host: "process" })`.

| Executor             | Heap Delta | RSS Delta | External Delta |
| -------------------- | ---------- | --------- | -------------- |
| QuickJS (in-process) | -0.47MB    | +0.02MB   | -0.03MB        |
| Worker (ephemeral)   | +0.01MB    | -30.92MB  | 0.00MB         |
| Worker (pooled)      | +0.01MB    | +1.45MB   | 0.00MB         |

### Notes

- This is a host-process stability signal, not a full-system memory profile.
- No obvious upward host-process heap trend showed up in this run, but that should not be interpreted as a complete leak analysis for every executor mode.
- RSS deltas are noisy for worker teardown paths, especially in the ephemeral worker case.

---

## Summary

### High-value takeaways from this snapshot

- QuickJS remained the lowest-latency option for trusted, in-process workloads on this machine.
- True `prewarm()` delivered the intended first-request benefit for pooled worker and pooled process executors.
- Worker pooled remained the strongest general-purpose local trade-off between isolation, throughput, and tail latency.
- Process pooled stayed viable when process isolation matters, but it still trailed worker pooled on throughput and tail latency.
- Ephemeral modes remained dramatically slower than pooled modes and are best reserved for cases that need a fresh host boundary per execution.

### What this snapshot does not prove

- It does not prove exact throughput rankings for every workload or host. The concurrency and tool-call suites are still sensitive to local scheduler noise.
- It does not prove memory behavior for `QuickJsExecutor({ host: "process" })`, because the memory suite intentionally avoids reporting child-process RSS as if it were host-process memory.
- It does not measure `RemoteExecutor`, because remote performance depends on the caller-owned transport and remote runtime deployment.
- It does not measure `IsolatedVmExecutor`, which has a separate native/runtime verification lane.
