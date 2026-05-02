# @execbox/core

## 0.6.0

### Minor Changes

- 1fa0edc: Tighten the pre-1.0 public API surface by keeping low-level core helpers out of the main `@execbox/core` entrypoint and removing unsupported QuickJS runner subpath exports. The v1 runtime surface is now inline QuickJS plus worker-hosted QuickJS.

## 0.5.0

### Minor Changes

- 02330b6: Simplify pre-1.0 runtime boundaries. `@execbox/core/runtime` replaces the unsupported `@execbox/core/_internal` subpath and now owns executor-author helpers such as runtime option resolution, manifest dispatch, code normalization, timeout helpers, log formatting, and error normalization. The main `@execbox/core` entrypoint is now focused on app-facing provider, executor, result, error, and typegen APIs.

## 0.4.1

### Patch Changes

- 241b575: Ship an internal `@execbox/core/_internal` subpath for execbox-owned packages so hosted and remote runtimes no longer import private `packages/core/src/*` files directly.

## 0.4.0

### Minor Changes

- bb3b2a0: Move the standalone protocol helpers into the new `@execbox/core/protocol` entrypoint and remove the separate `@execbox/protocol` package. Transport-backed integrations should now import protocol messages, host-session helpers, and resource-pool utilities from `@execbox/core/protocol`.

## 0.3.1

### Patch Changes

- 4d8aeeb: Fix published export metadata so CommonJS entrypoints resolve their `.d.cts`
  declaration files correctly, and add package validation with `publint` and
  Are the Types Wrong in CI.

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
