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
| QuickJS (in-process) | **1.80ms**        | **2.83ms**           | **4.04ms**            |
| Worker (ephemeral)   | 98.48ms           | 95.82ms              | 97.43ms               |
| Worker (pooled)      | 1.76ms            | 3.07ms               | 4.19ms                |
| Process (ephemeral)  | 207.84ms          | 214.66ms             | 210.96ms              |
| Process (pooled)     | 1.93ms            | 3.33ms               | 4.62ms                |

### Notes

- On this machine, the warmed pooled executors stayed close to QuickJS for trivial scripts.
- Ephemeral executors remained far slower than pooled executors because each execution pays the worker or process startup cost again.
- Process pooled stayed competitive for median latency, but its tails were consistently wider than worker pooled in the throughput and contention suites below.

---

## 2. Cold-Start vs Warm-Start

Only pooled executors expose explicit `prewarm()`. QuickJS and ephemeral executors are reported as fresh-executor first-run only.

| Executor             | Cold First-Run (median) | Warm First-Run (median) | Speedup |
| -------------------- | ----------------------- | ----------------------- | ------- |
| QuickJS (in-process) | 1.64ms                  | N/A                     | N/A     |
| Worker (ephemeral)   | 92.88ms                 | N/A                     | N/A     |
| Worker (pooled)      | 93.64ms                 | 94.35ms                 | -0.8%   |
| Process (ephemeral)  | 200.38ms                | N/A                     | N/A     |
| Process (pooled)     | 198.13ms                | 203.52ms                | -2.7%   |

### Notes

- In this run, explicit `prewarm()` did not materially improve first-request latency for pooled worker or process executors.
- That result should be treated as a local data point, not proof that prewarm never helps. The supported use of `prewarm()` is still to stand up pooled shells ahead of demand instead of relying on the first live request to do it.

---

## 3. Tool-Call Overhead Scaling

| Tool Calls | QuickJS (median) | Worker Pooled (median) |
| ---------- | ---------------- | ---------------------- |
| 0          | 1.55ms           | 1.63ms                 |
| 1          | 2.78ms           | 2.95ms                 |
| 5          | 7.64ms           | 8.16ms                 |
| 10         | 13.73ms          | 13.38ms                |

**Marginal cost per tool call**

|               | QuickJS     | Worker (pooled) |
| ------------- | ----------- | --------------- |
| From 1 call   | 1.23ms/call | 1.32ms/call     |
| From 5 calls  | 1.22ms/call | 1.31ms/call     |
| From 10 calls | 1.22ms/call | 1.17ms/call     |

### Notes

- Tool-call cost stayed close to linear in this run.
- The absolute per-call overhead was still small enough that real tool work is likely to dominate end-to-end latency once tools do anything non-trivial.

---

## 4. Schema Validation Overhead

| Executor             | With Schema (median) | Without Schema (median) | Overhead      |
| -------------------- | -------------------- | ----------------------- | ------------- |
| QuickJS (in-process) | 2.95ms               | 2.73ms                  | 0.22ms (7.9%) |
| Worker (pooled)      | 3.07ms               | 2.99ms                  | 0.08ms (2.7%) |

### Notes

- Absolute schema overhead was small in this run.
- The QuickJS percentage looks larger because the overall operation is very fast; the absolute delta still stayed well under a millisecond.

---

## 5. Concurrent Throughput

| Executor             | Conc=1 (exec/s) | Conc=2 | Conc=4     | Conc=8 |
| -------------------- | --------------- | ------ | ---------- | ------ |
| QuickJS (in-process) | 366.4           | 679.7  | **1134.0** | 392.3  |
| Worker (pooled)      | 350.4           | 665.3  | 636.5      | 634.1  |
| Process (pooled)     | 336.7           | 495.0  | 518.2      | 513.1  |

### Notes

- Worker pooled and process pooled both flattened once concurrency moved past the default pool size of 2.
- QuickJS was the fastest path up through concurrency 4 on this machine. The concurrency-8 drop in this snapshot was materially worse than its concurrency-4 result, so treat that specific number as noisy rather than as a hard scaling rule.

---

## 6. Pool Contention

| Executor | Pool Size | Throughput (exec/s) | Median Latency | P95 Latency | Max Latency |
| -------- | --------- | ------------------- | -------------- | ----------- | ----------- |
| Worker   | 1         | 346.2               | 22.62ms        | 23.56ms     | 23.63ms     |
| Worker   | 2         | 595.1               | 12.06ms        | 15.24ms     | 17.90ms     |
| Worker   | 4         | **904.4**           | 6.52ms         | 14.49ms     | 15.28ms     |
| Process  | 1         | 311.5               | 24.89ms        | 27.76ms     | 28.07ms     |
| Process  | 2         | 463.9               | 13.70ms        | 26.04ms     | 26.81ms     |
| Process  | 4         | 521.3               | 7.99ms         | 33.77ms     | 36.92ms     |

### Notes

- Increasing pool size improved throughput for both worker and process executors in this run.
- Worker pooled kept the better mix of throughput and tail latency at every pool size tested.
- Process pooled improved at pool size 4 in this snapshot, but its tail latency remained substantially worse than worker pooled.

---

## 7. Host-Process Memory Delta

This suite only measures the parent Node process. It does not attempt to attribute child-process RSS back to `ProcessExecutor`.

| Executor             | Heap Delta | RSS Delta | External Delta |
| -------------------- | ---------- | --------- | -------------- |
| QuickJS (in-process) | -0.49MB    | +0.42MB   | -0.01MB        |
| Worker (ephemeral)   | +0.03MB    | -38.36MB  | 0.00MB         |
| Worker (pooled)      | -0.00MB    | +4.13MB   | 0.00MB         |

### Notes

- This is a host-process stability signal, not a full-system memory profile.
- No obvious upward host-process heap trend showed up in this run, but that should not be interpreted as a complete leak analysis for every executor mode.

---

## Summary

### High-value takeaways from this snapshot

- QuickJS remained the lowest-latency option for trusted, in-process workloads.
- Worker pooled remained the best general-purpose trade-off between isolation, throughput, and tail latency.
- Process pooled stayed viable when process isolation matters, but it carried worse tail latency under contention.
- Ephemeral modes remained dramatically slower than pooled modes and are best reserved for cases that need a fresh host boundary per execution.
- Pool size still acted as the main throughput control for out-of-process executors.

### What this snapshot does not prove

- It does not prove that `prewarm()` is useless everywhere. It only shows that explicit prewarm did not materially improve first-request latency on this machine in this run.
- It does not prove memory behavior for `ProcessExecutor`, because the memory suite intentionally avoids reporting child-process RSS as if it were host-process memory.
