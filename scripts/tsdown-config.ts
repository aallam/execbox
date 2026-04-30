import { defineConfig } from "tsdown";

const DTS_BANNER = `/**
 * @packageDocumentation
 * Public TypeScript declarations for this package entrypoint.
 */`;

/**
 * Defines the shared package build settings used by published workspaces.
 */
export function definePackageBuildConfig(options: {
  entry: string[];
  external?: string[];
}) {
  return defineConfig({
    attw: {
      enabled: "ci-only",
      level: "error",
      profile: "node16",
    },
    clean: true,
    dts: {
      banner: DTS_BANNER,
    },
    entry: options.entry,
    ...(options.external ? { external: options.external } : {}),
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
}
