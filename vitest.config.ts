import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const includeIsolatedVm = process.env.VITEST_INCLUDE_ISOLATED_VM === "1";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@execbox/core/runtime",
        replacement: path.join(repoRoot, "packages/core/src/runtime.ts"),
      },
      {
        find: "@execbox/core/mcp",
        replacement: path.join(repoRoot, "packages/core/src/mcp/index.ts"),
      },
      {
        find: "@execbox/core/protocol",
        replacement: path.join(repoRoot, "packages/core/src/protocol/index.ts"),
      },
      {
        find: "@execbox/quickjs/runner/protocol-endpoint",
        replacement: path.join(
          repoRoot,
          "packages/quickjs/src/runner/protocolEndpoint.ts",
        ),
      },
      {
        find: "@execbox/quickjs/remote-endpoint",
        replacement: path.join(
          repoRoot,
          "packages/quickjs/src/remoteEndpoint.ts",
        ),
      },
      {
        find: "@execbox/quickjs/runner",
        replacement: path.join(
          repoRoot,
          "packages/quickjs/src/runner/index.ts",
        ),
      },
      {
        find: "@execbox/quickjs",
        replacement: path.join(repoRoot, "packages/quickjs/src/index.ts"),
      },
      {
        find: "@execbox/remote",
        replacement: path.join(repoRoot, "packages/remote/src/index.ts"),
      },
      {
        find: "@execbox/isolated-vm/runner",
        replacement: path.join(
          repoRoot,
          "packages/isolated-vm/src/runner/index.ts",
        ),
      },
      {
        find: "@execbox/isolated-vm",
        replacement: path.join(repoRoot, "packages/isolated-vm/src/index.ts"),
      },
      {
        find: "@execbox/core",
        replacement: path.join(repoRoot, "packages/core/src/index.ts"),
      },
    ],
  },
  test: {
    environment: "node",
    globals: true,
    include: ["packages/*/__tests__/**/*.test.ts"],
    exclude: includeIsolatedVm
      ? []
      : ["packages/isolated-vm/__tests__/**/*.test.ts"],
  },
});
