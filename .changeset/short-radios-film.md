---
"@execbox/core": patch
---

Ship an internal `@execbox/core/_internal` subpath for execbox-owned packages so hosted and remote runtimes no longer import private `packages/core/src/*` files directly.
