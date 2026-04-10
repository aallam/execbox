---
"@execbox/process": patch
"@execbox/worker": patch
---

Improve pooled executor warmup so `prewarm()` runs a real no-op QuickJS session inside each warmed shell before it is returned to the pool. This reduces first-request startup work for warmed worker and process executors.

`WorkerExecutor` now also uses a CPU-aware default pooled `maxSize`, capped at `4`, instead of always defaulting to a single worker shell.
