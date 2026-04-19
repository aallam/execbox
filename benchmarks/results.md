# execbox Performance Benchmark Results

- **Date:** 2026-04-11
- **Environment:** Node v24.13.1 | darwin arm64 (Apple Silicon)
- **Configuration:** iterations=15, warmups=3
- **Command:** `npm run benchmark -- --iterations=15 --warmups=3`

This file records the current local benchmark run. Treat the tables as measured data for this environment, not universal library guarantees.

---

## 1. Single-Execution Latency

| Executor             | No Tools (median) | 1 Tool Call (median) | 2 Tool Calls (median) |
| -------------------- | ----------------- | -------------------- | --------------------- |
| QuickJS (in-process) | 2.23ms            | **2.91ms**           | **4.13ms**            |
| Worker (ephemeral)   | 122.59ms          | 122.77ms             | 126.03ms              |
| Worker (pooled)      | **1.72ms**        | 3.02ms               | 4.38ms                |
| Process (ephemeral)  | 342.67ms          | 347.26ms             | 354.62ms              |
| Process (pooled)     | 2.11ms            | 3.47ms               | 4.86ms                |

### Notes

- On this machine, warmed pooled executors stayed close to QuickJS for trivial scripts.
- Ephemeral executors remained far slower than pooled executors because each execution still pays worker or process startup cost.
- Process pooled stayed low-latency in median terms, but its variability was still visibly wider than worker pooled on the no-tool case.

---

## 2. Cold-Start vs Warm-Start

Only pooled executors expose explicit `prewarm()`. QuickJS and ephemeral executors are reported as fresh-executor first-run only.

| Executor             | Cold First-Run (median) | Warm First-Run (median) | Speedup |
| -------------------- | ----------------------- | ----------------------- | ------- |
| QuickJS (in-process) | 1.90ms                  | N/A                     | N/A     |
| Worker (ephemeral)   | 123.82ms                | N/A                     | N/A     |
| Worker (pooled)      | 126.61ms                | 2.51ms                  | 98.0%   |
| Process (ephemeral)  | 352.19ms                | N/A                     | N/A     |
| Process (pooled)     | 350.72ms                | 3.44ms                  | 99.0%   |

### Notes

- True `prewarm()` delivered the intended first-request behavior in this run: pooled worker and pooled process executors dropped from shell-plus-guest startup latency to low-single-digit warm execution latency.
- `prewarm()` pays the host-shell and guest-startup path before live traffic arrives.

---

## 3. Tool-Call Overhead Scaling

| Tool Calls | QuickJS (median) | Worker Pooled (median) |
| ---------- | ---------------- | ---------------------- |
| 0          | 1.58ms           | 1.81ms                 |
| 1          | 2.83ms           | 3.23ms                 |
| 5          | 7.83ms           | 8.60ms                 |
| 10         | 13.67ms          | 14.44ms                |

**Marginal cost per tool call**

|               | QuickJS     | Worker (pooled) |
| ------------- | ----------- | --------------- |
| From 1 call   | 1.25ms/call | 1.42ms/call     |
| From 5 calls  | 1.25ms/call | 1.36ms/call     |
| From 10 calls | 1.21ms/call | 1.26ms/call     |

### Notes

- Tool-call cost still scaled roughly linearly in this run.
- QuickJS and worker pooled stayed close enough that real tool work is still likely to dominate end-to-end latency once tools do anything non-trivial.

---

## 4. Schema Validation Overhead

| Executor             | With Schema (median) | Without Schema (median) | Overhead      |
| -------------------- | -------------------- | ----------------------- | ------------- |
| QuickJS (in-process) | 2.79ms               | 2.72ms                  | 0.08ms (2.8%) |
| Worker (pooled)      | 3.19ms               | 2.95ms                  | 0.24ms (8.1%) |

### Notes

- Schema validation remained a small absolute cost in this run.
- The QuickJS delta was near zero, which reinforces the earlier guidance that schema validation is not the place to chase meaningful latency gains.

---

## 5. Concurrent Throughput

The pooled benchmark factories in this suite use a fixed `pool.maxSize: 2`.

| Executor             | Conc=1 (exec/s) | Conc=2 | Conc=4 | Conc=8     |
| -------------------- | --------------- | ------ | ------ | ---------- |
| QuickJS (in-process) | 361.6           | 683.8  | 1178.7 | **1759.0** |
| Worker (pooled)      | 323.2           | 637.6  | 654.7  | 653.3      |
| Process (pooled)     | 322.6           | 573.8  | 564.0  | 542.3      |

### Notes

- QuickJS was the highest-throughput path in this run for trusted, in-process workloads.
- Worker pooled tracked closely through concurrency 2, then paid visible queueing once demand moved past the benchmark pool size.
- Process pooled stayed competitive, but it still trailed worker pooled at every tested concurrency level above 2.

---

## 6. Pool Contention

| Executor | Pool Size | Throughput (exec/s) | Median Latency | P95 Latency | Max Latency |
| -------- | --------- | ------------------- | -------------- | ----------- | ----------- |
| Worker   | 1         | 326.2               | 24.40ms        | 25.73ms     | 26.11ms     |
| Worker   | 2         | 633.1               | 12.17ms        | 13.81ms     | 15.50ms     |
| Worker   | 4         | **1117.0**          | 6.51ms         | 8.86ms      | 8.92ms      |
| Process  | 1         | 309.5               | 25.58ms        | 27.46ms     | 27.83ms     |
| Process  | 2         | 546.4               | 13.44ms        | 16.39ms     | 17.81ms     |
| Process  | 4         | 793.5               | 8.14ms         | 12.03ms     | 12.45ms     |

### Notes

- Increasing pool size improved both worker and process executors in this run.
- Worker pooled still kept the better mix of throughput and tail latency at every pool size tested.
- Process pooled also scaled up well here, but its tails remained wider than worker pooled at the same pool size.

---

## 7. Host-Process Memory Delta

This suite only measures the parent Node process. It does not attempt to attribute child-process RSS back to `QuickJsExecutor({ host: "process" })`.

| Executor             | Heap Delta | RSS Delta | External Delta |
| -------------------- | ---------- | --------- | -------------- |
| QuickJS (in-process) | -0.49MB    | +2.48MB   | -0.02MB        |
| Worker (ephemeral)   | +0.01MB    | -8.42MB   | 0.00MB         |
| Worker (pooled)      | +0.01MB    | +0.52MB   | 0.00MB         |

### Notes

- This is a host-process stability signal, not a full-system memory profile.
- No obvious upward host-process heap trend showed up in this run, but that should not be interpreted as a complete leak analysis for every executor mode.

---

## Summary

### High-value takeaways from this snapshot

- QuickJS remained the lowest-latency and highest-throughput option for trusted, in-process workloads on this machine.
- True `prewarm()` delivered the intended first-request benefit for pooled worker and pooled process executors.
- Worker pooled remained the strongest general-purpose local trade-off between isolation, throughput, and tail latency.
- Process pooled stayed viable when process isolation matters, but it still trailed worker pooled on throughput and tail latency.
- Ephemeral modes remained dramatically slower than pooled modes and are best reserved for cases that need a fresh host boundary per execution.

### What this snapshot does not prove

- It does not prove exact throughput rankings for every workload or host. The concurrency and tool-call suites are still sensitive to local scheduler noise.
- It does not prove memory behavior for `QuickJsExecutor({ host: "process" })`, because the memory suite intentionally avoids reporting child-process RSS as if it were host-process memory.
