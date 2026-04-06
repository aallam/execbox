# QuickJS Pooling Baseline

Captured on `2026-04-06 20:23:48Z` with:

- command: `npm run benchmark:quickjs-pooling`
- Node: `v25.9.0`
- host: `Darwin arm64`
- warmups: `5`
- iterations: `25`

This benchmark targets short scripts with zero, one, and two host tool calls. The comparison is always one-shot execution versus pooled execution on the same executor package.

## Median / p95

### short-script-no-tools

| Executor | One-shot median / p95 | Pooled median / p95 | Median delta |
| --- | --- | --- | --- |
| `quickjs` | `1.68ms / 1.98ms` | `1.54ms / 1.76ms` | `-8.3%` |
| `process` | `241.83ms / 264.12ms` | `2.05ms / 2.32ms` | `-99.2%` |
| `worker` | `115.83ms / 120.13ms` | `1.59ms / 1.79ms` | `-98.6%` |
| `remote` | `1.55ms / 1.59ms` | `1.54ms / 1.71ms` | `-0.6%` |

### short-script-one-tool

| Executor | One-shot median / p95 | Pooled median / p95 | Median delta |
| --- | --- | --- | --- |
| `quickjs` | `2.83ms / 3.07ms` | `2.92ms / 3.22ms` | `+3.2%` |
| `process` | `245.67ms / 253.32ms` | `3.12ms / 3.63ms` | `-98.7%` |
| `worker` | `117.28ms / 121.30ms` | `2.96ms / 3.25ms` | `-97.5%` |
| `remote` | `2.83ms / 3.04ms` | `2.83ms / 3.13ms` | `0.0%` |

### short-script-two-tools

| Executor | One-shot median / p95 | Pooled median / p95 | Median delta |
| --- | --- | --- | --- |
| `quickjs` | `4.21ms / 4.58ms` | `4.26ms / 4.47ms` | `+1.2%` |
| `process` | `246.55ms / 260.09ms` | `4.44ms / 5.28ms` | `-98.2%` |
| `worker` | `118.80ms / 122.71ms` | `4.19ms / 4.37ms` | `-96.5%` |
| `remote` | `4.06ms / 4.34ms` | `4.23ms / 4.49ms` | `+4.2%` |

## Notes

- Pooling materially improves the transport-backed executors because child and worker startup dominate the one-shot path.
- `quickjs` already reuses the shared WASM module in the one-shot path, so pooled mode is primarily a lifecycle/prewarm feature rather than a large latency win.
- Loopback `remote` is already low-overhead in this benchmark because the transport stays in-process. Pooling there is mainly for real reusable remote transports, not the local loopback harness.
