# QuickJS Pooling Baseline

Captured on `2026-04-06 21:14:37Z` with:

- command: `npm run benchmark:quickjs-pooling`
- Node: `v25.9.0`
- host: `Darwin arm64`
- warmups: `5`
- iterations: `25`

This benchmark targets short scripts with zero, one, and two host tool calls. It compares ephemeral versus pooled execution only for the executors that still support pooling: `@execbox/process` and `@execbox/worker`.

As of `2026-04-06`, pooled mode is the default for both packages. The pooled columns below therefore represent the new default behavior, while ephemeral execution remains available through `mode: "ephemeral"`.

## Median / p95

### short-script-no-tools

| Executor  | Ephemeral median / p95 | Pooled median / p95 | Median delta |
| --------- | ---------------------- | ------------------- | ------------ |
| `process` | `241.20ms / 252.79ms`  | `1.98ms / 2.22ms`   | `-99.2%`     |
| `worker`  | `125.11ms / 170.48ms`  | `1.78ms / 2.06ms`   | `-98.6%`     |

### short-script-one-tool

| Executor  | Ephemeral median / p95 | Pooled median / p95 | Median delta |
| --------- | ---------------------- | ------------------- | ------------ |
| `process` | `247.01ms / 273.24ms`  | `3.26ms / 3.87ms`   | `-98.7%`     |
| `worker`  | `128.04ms / 131.16ms`  | `3.23ms / 3.79ms`   | `-97.5%`     |

### short-script-two-tools

| Executor  | Ephemeral median / p95 | Pooled median / p95 | Median delta |
| --------- | ---------------------- | ------------------- | ------------ |
| `process` | `245.69ms / 256.12ms`  | `4.44ms / 5.08ms`   | `-98.2%`     |
| `worker`  | `131.17ms / 136.03ms`  | `4.24ms / 4.78ms`   | `-96.8%`     |

## Notes

- Pooling materially improves the transport-backed executors because child and worker startup dominate the ephemeral path.
- That delta is large enough that `process` and `worker` now default to pooled shells. Callers that require strict per-call child or worker teardown should opt into `mode: "ephemeral"` explicitly.
- `quickjs` and `remote` no longer expose pooling. Their benchmark deltas were not strong enough to justify the extra API surface and lifecycle semantics.
