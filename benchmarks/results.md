# execbox Performance Benchmark Results

**Date:** 2026-04-10
**Environment:** Node v25.9.0 | darwin arm64 (Apple Silicon)
**Configuration:** iterations=15, warmups=3
**Command:** `npm run benchmark -- --iterations=15 --warmups=3`

This file is a snapshot from one local run. Treat the tables as measured data for this environment, not universal product guarantees.

---

## 1. Single-Execution Latency

| Executor             | No Tools (median) | 1 Tool Call (median) | 2 Tool Calls (median) |
| -------------------- | ----------------- | -------------------- | --------------------- |
| QuickJS (in-process) | **1.81ms**        | **3.13ms**           | **5.09ms**            |
| Worker (ephemeral)   | 97.37ms           | 98.43ms              | 105.44ms              |
| Worker (pooled)      | 1.84ms            | 3.26ms               | 4.80ms                |
| Process (ephemeral)  | 222.33ms          | 222.68ms             | 335.43ms              |
| Process (pooled)     | 2.27ms            | 3.66ms               | 5.38ms                |

### Notes

- On this machine, warmed pooled executors stayed close to QuickJS for trivial scripts.
- Ephemeral executors remained far slower than pooled executors because each execution still pays worker or process startup cost.
- Process pooled stayed competitive for median latency, but its variance was visibly wider than worker pooled in the later throughput and contention suites.

---

## 2. Cold-Start vs Warm-Start

Only pooled executors expose explicit `prewarm()`. QuickJS and ephemeral executors are reported as fresh-executor first-run only.

| Executor             | Cold First-Run (median) | Warm First-Run (median) | Speedup |
| -------------------- | ----------------------- | ----------------------- | ------- |
| QuickJS (in-process) | 1.72ms                  | N/A                     | N/A     |
| Worker (ephemeral)   | 133.79ms                | N/A                     | N/A     |
| Worker (pooled)      | 116.67ms                | 2.47ms                  | 97.9%   |
| Process (ephemeral)  | 307.29ms                | N/A                     | N/A     |
| Process (pooled)     | 318.78ms                | 4.38ms                  | 98.6%   |

### Notes

- True `prewarm()` materially changed first-request behavior in this run: both pooled worker and pooled process executors dropped from shell-plus-guest startup latency to low-single-digit warm execution latency.
- That is the intended effect of prewarm after the benchmark harness and executor updates: pay the host-shell and guest-startup path before live traffic arrives.

---

## 3. Tool-Call Overhead Scaling

| Tool Calls | QuickJS (median) | Worker Pooled (median) |
| ---------- | ---------------- | ---------------------- |
| 0          | 1.65ms           | 2.00ms                 |
| 1          | 3.00ms           | 3.87ms                 |
| 5          | 8.35ms           | 11.72ms                |
| 10         | 14.36ms          | 15.99ms                |

**Marginal cost per tool call**

|               | QuickJS     | Worker (pooled) |
| ------------- | ----------- | --------------- |
| From 1 call   | 1.34ms/call | 1.87ms/call     |
| From 5 calls  | 1.34ms/call | 1.94ms/call     |
| From 10 calls | 1.27ms/call | 1.40ms/call     |

### Notes

- Tool-call cost still scaled roughly linearly in this run.
- Worker pooled carried a slightly higher per-call overhead than QuickJS, but the absolute delta stayed small compared with the startup gap between pooled and ephemeral execution modes.

---

## 4. Schema Validation Overhead

| Executor             | With Schema (median) | Without Schema (median) | Overhead        |
| -------------------- | -------------------- | ----------------------- | --------------- |
| QuickJS (in-process) | 3.06ms               | 3.24ms                  | -0.17ms (-5.4%) |
| Worker (pooled)      | 4.25ms               | 4.07ms                  | 0.17ms (4.3%)   |

### Notes

- The small negative QuickJS delta is measurement noise, not evidence that schema validation makes execution faster.
- On the worker pooled path, schema validation remained a small absolute cost compared with overall execution time.

---

## 5. Concurrent Throughput

The pooled benchmark factories in this suite use a fixed `pool.maxSize: 2`.

| Executor             | Conc=1 (exec/s) | Conc=2 | Conc=4 | Conc=8     |
| -------------------- | --------------- | ------ | ------ | ---------- |
| QuickJS (in-process) | 301.3           | 549.8  | 914.9  | **1365.2** |
| Worker (pooled)      | 257.9           | 506.1  | 490.0  | 222.4      |
| Process (pooled)     | 175.0           | 105.5  | 273.4  | 290.9      |

### Notes

- QuickJS was the highest-throughput path in this run for trusted, in-process workloads.
- Worker pooled tracked closely through concurrency 2, then paid visible queueing once demand moved past the benchmark pool size.
- Process pooled results were materially noisier in this suite, so use the exact ordering here as a local data point rather than a stable ranking.

---

## 6. Pool Contention

| Executor | Pool Size | Throughput (exec/s) | Median Latency | P95 Latency | Max Latency |
| -------- | --------- | ------------------- | -------------- | ----------- | ----------- |
| Worker   | 1         | 196.6               | 39.51ms        | 43.84ms     | 44.00ms     |
| Worker   | 2         | 271.7               | 25.14ms        | 41.91ms     | 46.19ms     |
| Worker   | 4         | **400.7**           | 15.55ms        | 37.65ms     | 37.84ms     |
| Process  | 1         | 123.5               | 63.71ms        | 81.57ms     | 82.85ms     |
| Process  | 2         | **286.5**           | 26.13ms        | 34.02ms     | 34.14ms     |
| Process  | 4         | 236.8               | 29.69ms        | 61.02ms     | 61.20ms     |

### Notes

- Worker pooled improved steadily as pool size increased in this run.
- Process pooled improved sharply from pool size 1 to 2, but did not hold that benefit at pool size 4 on this machine.
- Pool size is still the main throughput control for out-of-process executors, but process sizing looks more workload-sensitive than worker sizing.

---

## 7. Host-Process Memory Delta

This suite only measures the parent Node process. It does not attempt to attribute child-process RSS back to `ProcessExecutor`.

| Executor             | Heap Delta | RSS Delta | External Delta |
| -------------------- | ---------- | --------- | -------------- |
| QuickJS (in-process) | -0.49MB    | +3.61MB   | -0.00MB        |
| Worker (ephemeral)   | +0.02MB    | +21.34MB  | 0.00MB         |
| Worker (pooled)      | +0.01MB    | -1.33MB   | 0.00MB         |

### Notes

- This is a host-process stability signal, not a full-system memory profile.
- No obvious upward host-process heap trend showed up in this run, but that should not be interpreted as a complete leak analysis for every executor mode.

---

## Summary

### High-value takeaways from this snapshot

- QuickJS remained the lowest-latency and highest-throughput option for trusted, in-process workloads on this machine.
- True `prewarm()` now delivered the intended first-request benefit for pooled worker and pooled process executors in this run.
- Worker pooled remained the strongest general-purpose local trade-off between isolation, throughput, and tail latency.
- Process pooled stayed viable when process isolation matters, but its concurrency and contention behavior was more workload-sensitive in this snapshot.
- Ephemeral modes remained dramatically slower than pooled modes and are best reserved for cases that need a fresh host boundary per execution.

### What this snapshot does not prove

- It does not prove exact throughput rankings for every workload or host. The concurrency and tool-call suites are still sensitive to local scheduler noise.
- It does not prove memory behavior for `ProcessExecutor`, because the memory suite intentionally avoids reporting child-process RSS as if it were host-process memory.
