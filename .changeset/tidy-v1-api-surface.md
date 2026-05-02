---
"@execbox/core": minor
"@execbox/quickjs": minor
---

Tighten the pre-1.0 public API surface by keeping low-level core helpers out of the main `@execbox/core` entrypoint and removing unsupported QuickJS runner subpath exports. The v1 runtime surface is now inline QuickJS plus worker-hosted QuickJS.
