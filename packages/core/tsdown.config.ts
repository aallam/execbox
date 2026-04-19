import { defineConfig } from "tsdown";

const DTS_BANNER = `/**
 * @packageDocumentation
 * Public TypeScript declarations for this package entrypoint.
 */`;

export default defineConfig({
  attw: {
    enabled: "ci-only",
    level: "error",
    profile: "node16",
  },
  clean: true,
  dts: {
    banner: DTS_BANNER,
  },
  entry: ["src/index.ts", "src/mcp/index.ts", "src/protocol/index.ts"],
  fixedExtension: false,
  format: ["esm", "cjs"],
  platform: "node",
  publint: {
    enabled: "ci-only",
    level: "error",
  },
  sourcemap: true,
  target: "node20",
});
