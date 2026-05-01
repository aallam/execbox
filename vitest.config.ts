import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { createVitestAliases } from "./scripts/workspace-entrypoints.ts";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: createVitestAliases(repoRoot),
  },
  test: {
    environment: "node",
    globals: true,
    include: ["packages/*/__tests__/**/*.test.ts"],
  },
});
