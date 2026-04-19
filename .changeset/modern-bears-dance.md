---
"@execbox/core": minor
"@execbox/quickjs": minor
"@execbox/remote": minor
---

Move the standalone protocol helpers into the new `@execbox/core/protocol` entrypoint and remove the separate `@execbox/protocol` package. Transport-backed integrations should now import protocol messages, host-session helpers, and resource-pool utilities from `@execbox/core/protocol`.
