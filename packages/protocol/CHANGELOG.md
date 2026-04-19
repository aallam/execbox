# @execbox/protocol

## 0.2.1

### Patch Changes

- 4d8aeeb: Fix published export metadata so CommonJS entrypoints resolve their `.d.cts`
  declaration files correctly, and add package validation with `publint` and
  Are the Types Wrong in CI.
- Updated dependencies [4d8aeeb]
  - @execbox/core@0.3.1

## 0.2.0

### Minor Changes

- 737b151: Add host-side pooling support for the QuickJS transport-backed executors and the shared APIs they depend on.

  `@execbox/process` and `@execbox/worker` now default to pooled child-process and worker-shell reuse, while still creating a fresh QuickJS runtime for every `execute()` call. Both executors add `mode: "pooled" | "ephemeral"`, `pool` controls, and optional `prewarm()` / `dispose()` lifecycle hooks.

  `@execbox/core` now exports `ExecutorPoolOptions` and allows executors to expose optional `prewarm()` and `dispose()` methods. `@execbox/protocol` now exports the shared `createResourcePool()` helper used to lease, queue, evict, and dispose reusable shells. `@execbox/quickjs` extends the reusable runner so callers can inject a preloaded QuickJS WASM module when they want to manage that outer host-side cache themselves.

### Patch Changes

- Updated dependencies [737b151]
  - @execbox/core@0.3.0

## 0.1.2

### Patch Changes

- b68b70a: Harden transport and executor security coverage, ignore malformed protocol frames safely, and avoid duplicate hard-stop termination in process and worker executors.

## 0.1.1

### Patch Changes

- Updated dependencies [8cd7b02]
  - @execbox/core@0.2.0

## 0.1.0

### Minor Changes

- 5d5fbe2: Initial release of the execbox monorepo under the `@execbox/*` scope.

### Patch Changes

- Updated dependencies [5d5fbe2]
  - @execbox/core@0.1.0
