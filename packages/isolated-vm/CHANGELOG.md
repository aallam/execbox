# @execbox/isolated-vm

## 0.1.6

### Patch Changes

- 3778810: Add source export conditions for workspace-aware TypeScript tooling.

## 0.1.5

### Patch Changes

- 02330b6: Simplify pre-1.0 runtime boundaries. `@execbox/core/runtime` replaces the unsupported `@execbox/core/_internal` subpath and now owns executor-author helpers such as runtime option resolution, manifest dispatch, code normalization, timeout helpers, log formatting, and error normalization. The main `@execbox/core` entrypoint is now focused on app-facing provider, executor, result, error, and typegen APIs.

  Move the QuickJS remote runner endpoint to `@execbox/quickjs/remote-endpoint` and remove the hidden `@execbox/quickjs` dependency from `@execbox/remote`. Remote transports now expose only `RemoteExecutor`, `RemoteRunnerPort`, and transport contracts from `@execbox/remote`.

- Updated dependencies [02330b6]
  - @execbox/core@0.5.0

## 0.1.4

### Patch Changes

- Updated dependencies [bb3b2a0]
  - @execbox/core@0.4.0

## 0.1.3

### Patch Changes

- 4d8aeeb: Fix published export metadata so CommonJS entrypoints resolve their `.d.cts`
  declaration files correctly, and add package validation with `publint` and
  Are the Types Wrong in CI.
- Updated dependencies [4d8aeeb]
  - @execbox/core@0.3.1

## 0.1.2

### Patch Changes

- Updated dependencies [737b151]
  - @execbox/core@0.3.0

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
