# @execbox/core

## 0.3.0

### Minor Changes

- 737b151: Add host-side pooling support for the QuickJS transport-backed executors and the shared APIs they depend on.

  `@execbox/process` and `@execbox/worker` now default to pooled child-process and worker-shell reuse, while still creating a fresh QuickJS runtime for every `execute()` call. Both executors add `mode: "pooled" | "ephemeral"`, `pool` controls, and optional `prewarm()` / `dispose()` lifecycle hooks.

  `@execbox/core` now exports `ExecutorPoolOptions` and allows executors to expose optional `prewarm()` and `dispose()` methods. `@execbox/protocol` now exports the shared `createResourcePool()` helper used to lease, queue, evict, and dispose reusable shells. `@execbox/quickjs` extends the reusable runner so callers can inject a preloaded QuickJS WASM module when they want to manage that outer host-side cache themselves.

## 0.2.0

### Minor Changes

- 8cd7b02: Require `openMcpToolProvider()` for local `{ server }` MCP sources, close owned MCP resources on setup failure, and make transport-backed sessions terminate promptly when the caller aborts.

## 0.1.0

### Minor Changes

- 5d5fbe2: Initial release of the execbox monorepo under the `@execbox/*` scope.
