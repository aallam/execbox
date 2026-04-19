---
"@execbox/quickjs": minor
"@execbox/protocol": minor
---

`@execbox/quickjs` now covers inline, worker-hosted, and process-hosted QuickJS execution through `new QuickJsExecutor({ host })`. Migrate `@execbox/process` usage to `new QuickJsExecutor({ host: "process" })` and `@execbox/worker` usage to `new QuickJsExecutor({ host: "worker" })`.

`@execbox/protocol` no longer re-exports `createToolCallDispatcher` or `extractProviderManifests`. Import those helpers from `@execbox/core` instead.
