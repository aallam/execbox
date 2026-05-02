---
"@execbox/core": minor
"@execbox/quickjs": minor
"@execbox/remote": minor
---

Tighten the pre-1.0 public API surface by keeping low-level core helpers out of the main `@execbox/core` entrypoint, removing unsupported QuickJS runner subpath exports, and keeping runner-side remote endpoint types with `@execbox/quickjs/remote-endpoint`.
