---
"@execbox/quickjs": major
---

Remove `QuickJsExecutor({ host: "process" })` and its process-hosted runner entrypoint. Use `host: "worker"` for local hosted QuickJS execution, or `@execbox/remote` for app-owned process, container, or VM boundaries.
