# execbox Performance Benchmark Results

**Date:** 2026-04-10
**Environment:** Node v24.13.1 | darwin arm64 (Apple Silicon)
**Configuration:** iterations=15, warmups=3

---

## 1. Single-Execution Latency

| Executor | No Tools (median) | 1 Tool Call (median) | 2 Tool Calls (median) |
|---|---|---|---|
| QuickJS (in-process) | **1.65ms** | **2.80ms** | **4.74ms** |
| Worker (ephemeral) | 102.32ms | 103.61ms | 156.79ms |
| Worker (pooled) | 2.75ms | 3.37ms | 4.36ms |
| Process (ephemeral) | 298.19ms | 623.76ms | 444.02ms |
| Process (pooled) | 1.96ms | 6.31ms | 6.70ms |

### Key Observations

- **QuickJS in-process is the fastest executor** at ~1.65ms median for trivial scripts. It avoids all IPC overhead since everything runs in the same V8 process.
- **Pooled executors are competitive** with in-process QuickJS once warmed, at 2-3ms for trivial scripts. The pool reuse eliminates the dominant cost (spawning a worker/process).
- **Ephemeral mode is extremely expensive**: Worker ephemeral costs ~100ms (60x slower than pooled), Process ephemeral costs ~300-600ms (150-300x slower than pooled). This is the single largest bottleneck in the library.

---

## 2. Cold-Start vs Warm-Start

| Executor | Cold First-Run (median) | Warm First-Run (median) | Speedup |
|---|---|---|---|
| QuickJS (in-process) | 2.32ms | 1.64ms | 29.6% |
| Worker (ephemeral) | 161.43ms | 162.45ms | -0.6% (N/A) |
| Worker (pooled) | 120.05ms | 100.70ms | 16.1% |
| Process (ephemeral) | 343.01ms | 301.22ms | 12.2% |
| Process (pooled) | 304.10ms | 298.08ms | 2.0% |

### Key Observations

- **Prewarming helps QuickJS the most** (29.6% improvement) because the WASM module load is the one-time cold cost.
- **Worker pooled prewarm saves ~20ms** on first execution (16.1%), meaningful for latency-sensitive paths.
- **Process pooled prewarm is negligible** (2.0%) — the first execution still pays ~300ms for process fork + QuickJS boot regardless. The prewarm benefit only manifests on the *second* execution when the pool has a warm shell ready.
- **Ephemeral prewarm has no effect** (as expected — each execution spawns a fresh worker/process anyway).

---

## 3. Tool-Call Overhead Scaling

| Tool Calls | QuickJS (median) | Worker Pooled (median) |
|---|---|---|
| 0 | 1.48ms | 1.67ms |
| 1 | 2.76ms | 3.13ms |
| 5 | 7.67ms | 8.06ms |
| 10 | 13.73ms | 13.98ms |

**Marginal cost per tool call:**

| | QuickJS | Worker (pooled) |
|---|---|---|
| From 1 call | 1.28ms/call | 1.45ms/call |
| From 5 calls | 1.24ms/call | 1.28ms/call |
| From 10 calls | 1.22ms/call | 1.23ms/call |

### Key Observations

- **Tool calls cost ~1.2-1.5ms each**, remarkably consistent regardless of executor type or call count. This represents: host-side dispatch lookup + tool `execute()` + JSON serialization round-trip.
- **Worker overhead converges with QuickJS** at higher call counts, meaning the per-call IPC cost through the message channel is minimal (~0.01ms per additional call). The initial ~0.2ms gap is the first message-channel round-trip overhead.
- **Linear scaling is good** — no evidence of accumulation or degradation as tool calls increase.

---

## 4. Schema Validation Overhead

| Executor | With Schema (median) | Without Schema (median) | Overhead |
|---|---|---|---|
| QuickJS (in-process) | 2.88ms | 2.83ms | **0.06ms (2.0%)** |
| Worker (pooled) | 3.01ms | 2.89ms | **0.11ms (4.0%)** |

### Key Observations

- **Schema validation overhead is negligible** (< 0.12ms per call). AJV compiles schemas at provider resolution time, so runtime validation is a single compiled-function call.
- This is a non-bottleneck — schema validation can and should always be used without performance concern.

---

## 5. Concurrent Throughput

| Executor | Conc=1 (exec/s) | Conc=2 | Conc=4 | Conc=8 |
|---|---|---|---|---|
| QuickJS (in-process) | 365.8 | 692.1 | **1130.9** | **1591.2** |
| Worker (pooled) | 353.6 | 626.1 | 595.3 | 631.6 |
| Process (pooled) | 330.6 | 521.1 | 556.1 | 501.5 |

### Key Observations

- **QuickJS scales nearly linearly** with concurrency (365 -> 1591 exec/s at 8x). Since each execution is a synchronous QuickJS runtime in a promise, Node's event loop can interleave tool-call I/O waits across concurrent executions effectively.
- **Worker (pooled) hits a ceiling at ~630 exec/s beyond concurrency=2**. With pool maxSize=2, requests 3-8 must wait for a worker to become available. Throughput plateaus rather than increasing. Latency doubles from 3ms to 12ms.
- **Process (pooled) hits the same ceiling** (~500-560 exec/s) and latency degrades more sharply to ~13ms median, ~24ms p95. This is the pool contention bottleneck.
- **Bottleneck: pool maxSize=2 is the limiting factor** for out-of-process executors under concurrent load. The pool acts as a natural throttle.

---

## 6. Pool Contention (Small Pool, Many Concurrent Requests)

| Executor | Pool Size | Throughput (exec/s) | Median Latency | P95 Latency | Max Latency |
|---|---|---|---|---|---|
| Worker | 1 | 339.6 | 23.22ms | 24.59ms | 24.60ms |
| Worker | 2 | 612.6 | 11.65ms | 15.10ms | 17.99ms |
| Worker | 4 | **936.8** | 6.30ms | 14.08ms | 14.85ms |
| Process | 1 | 309.7 | 25.18ms | 27.50ms | 27.59ms |
| Process | 2 | 472.2 | 14.05ms | 24.35ms | 24.90ms |
| Process | 4 | 196.4 | 10.91ms | 26.77ms | **152.71ms** |

### Key Observations

- **Worker pool scales well with size**: 1 -> 2 -> 4 gives nearly linear throughput improvement (340 -> 613 -> 937 exec/s).
- **Process pool has a scaling anomaly at size=4**: Throughput *drops* to 196.4 exec/s (vs 472 at size=2), and max latency spikes to 152.71ms. This suggests OS-level contention or scheduling overhead when 4 child processes compete for CPU alongside 8 concurrent requests. This is a significant bottleneck.
- **Worker is strictly better than Process under contention** — lower latency, higher throughput, and more predictable behavior at every pool size tested.

---

## 7. Memory Footprint (50 Executions)

| Executor | Heap Delta | RSS Delta | External Delta |
|---|---|---|---|
| QuickJS (in-process) | -2.69MB | +4.84MB | -0.03MB |
| Worker (ephemeral) | -1.88MB | -8.34MB | 0.00MB |
| Worker (pooled) | +1.12MB | +0.55MB | 0.00MB |
| Process (ephemeral) | -1.58MB | -106.95MB | 0.00MB |
| Process (pooled) | +0.13MB | +2.63MB | +0.01MB |

### Key Observations

- **All executors show minimal heap growth** (< 1.2MB after 50 runs). No evidence of memory leaks.
- **Process ephemeral shows -107MB RSS delta** — this is expected: child processes are spawned and terminated, so RSS fluctuates as the OS reclaims pages. The negative delta means GC ran between measurements and OS reclaimed child-process memory.
- **Pooled executors show small positive RSS growth** (0.5-2.6MB) — the pooled shell stays resident, accumulating minor allocations. This is acceptable and expected.

---

## Identified Bottlenecks

### B1: Ephemeral executor spawn cost (CRITICAL)

- **Impact:** 100-600ms per execution (vs 2-3ms pooled)
- **Cause:** Worker ephemeral spawns a new Node worker thread + loads QuickJS WASM per execution. Process ephemeral forks a new child process + loads QuickJS.
- **Where:** `WorkerExecutor` with `mode: "ephemeral"`, `ProcessExecutor` with `mode: "ephemeral"`
- **Recommendation:** Default to pooled mode (already the case). Document that ephemeral mode should only be used when strict per-execution isolation is required. Consider lazy module caching for ephemeral worker threads.

### B2: Process executor under concurrent load (HIGH)

- **Impact:** Process pool throughput drops at pool size=4 with 8 concurrent requests (196 exec/s vs worker's 937). Max latency spikes to 152ms.
- **Cause:** OS process scheduling overhead + IPC serialization through stdio/fork channels. Child processes compete for CPU time more aggressively than worker threads.
- **Where:** `ProcessExecutor` with pool maxSize >= 4 under high concurrency
- **Recommendation:** Prefer `WorkerExecutor` for high-throughput scenarios. If process isolation is required, keep pool size <= 2 or benchmark for your specific workload.

### B3: Pool size as throughput ceiling (MEDIUM)

- **Impact:** With pool maxSize=2, throughput caps at ~600-630 exec/s regardless of concurrency level. Beyond 2 concurrent requests, latency degrades linearly.
- **Cause:** Fixed pool size means requests queue behind available shells. The pool's FIFO waiter queue adds latency proportional to queue depth.
- **Where:** `createResourcePool` in `@execbox/protocol`
- **Recommendation:** The pool default should be documented with guidance on sizing. For latency-sensitive applications, pool maxSize should be >= expected concurrency. Consider adding pool metrics (queue depth, wait time) for observability.

### B4: Cold-start cost for first execution (LOW)

- **Impact:** First execution of any pooled executor costs ~100-300ms (worker: 100-120ms, process: 300ms). Subsequent executions are 2-7ms.
- **Cause:** QuickJS WASM module must be loaded and compiled. For out-of-process executors, the shell process must also be spawned.
- **Where:** All executors, but primarily out-of-process ones
- **Recommendation:** Use `executor.prewarm()` during application startup. This is already supported and effective for workers (16% speedup). Process prewarm benefit is minimal for the first call but critical for subsequent calls.

### Non-Bottlenecks (Good Performance)

- **Tool call dispatch**: ~1.2ms/call, scales linearly, minimal IPC overhead
- **Schema validation**: < 0.12ms overhead (2-4%), effectively free at runtime
- **Memory footprint**: No leaks detected, all executors well-behaved
- **QuickJS in-process scaling**: Near-linear throughput scaling to 1591 exec/s at concurrency=8
