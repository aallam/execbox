---
"@execbox/core": minor
"@execbox/quickjs": minor
"@execbox/remote": minor
"@execbox/isolated-vm": patch
---

Simplify pre-1.0 runtime boundaries. `@execbox/core/runtime` replaces the unsupported `@execbox/core/_internal` subpath and now owns executor-author helpers such as runtime option resolution, manifest dispatch, code normalization, timeout helpers, log formatting, and error normalization. The main `@execbox/core` entrypoint is now focused on app-facing provider, executor, result, error, and typegen APIs.

Move the QuickJS remote runner endpoint to `@execbox/quickjs/remote-endpoint` and remove the hidden `@execbox/quickjs` dependency from `@execbox/remote`. Remote transports now expose only `RemoteExecutor`, `RemoteRunnerPort`, and transport contracts from `@execbox/remote`.
