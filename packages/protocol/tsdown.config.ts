import { defineConfig } from "tsdown";

const DTS_BANNER = `/**
 * @packageDocumentation
 * Public TypeScript declarations for this package entrypoint.
 */`;

export default defineConfig({
  clean: true,
  dts: {
    banner: DTS_BANNER,
  },
  entry: ["src/index.ts"],
  fixedExtension: false,
  format: ["esm", "cjs"],
  platform: "node",
  sourcemap: true,
  target: "node20",
});
