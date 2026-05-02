import path from "node:path";

export interface WorkspaceEntrypoint {
  apiReportFileName: string;
  declarationPath: string;
  exportPath: "." | `./${string}`;
  packageDir: string;
  packageName: string;
  sourcePath: string;
}

export interface VitestAlias {
  find: string;
  replacement: string;
}

export const workspaceEntrypoints = [
  {
    apiReportFileName: "execbox-core.api.md",
    declarationPath: "dist/index.d.ts",
    exportPath: ".",
    packageDir: "packages/core",
    packageName: "@execbox/core",
    sourcePath: "packages/core/src/index.ts",
  },
  {
    apiReportFileName: "execbox-core-runtime.api.md",
    declarationPath: "dist/runtime.d.ts",
    exportPath: "./runtime",
    packageDir: "packages/core",
    packageName: "@execbox/core",
    sourcePath: "packages/core/src/runtime.ts",
  },
  {
    apiReportFileName: "execbox-core-mcp.api.md",
    declarationPath: "dist/mcp/index.d.ts",
    exportPath: "./mcp",
    packageDir: "packages/core",
    packageName: "@execbox/core",
    sourcePath: "packages/core/src/mcp/index.ts",
  },
  {
    apiReportFileName: "execbox-core-protocol.api.md",
    declarationPath: "dist/protocol/index.d.ts",
    exportPath: "./protocol",
    packageDir: "packages/core",
    packageName: "@execbox/core",
    sourcePath: "packages/core/src/protocol/index.ts",
  },
  {
    apiReportFileName: "execbox-quickjs.api.md",
    declarationPath: "dist/index.d.ts",
    exportPath: ".",
    packageDir: "packages/quickjs",
    packageName: "@execbox/quickjs",
    sourcePath: "packages/quickjs/src/index.ts",
  },
  {
    apiReportFileName: "execbox-quickjs-remote-endpoint.api.md",
    declarationPath: "dist/remoteEndpoint.d.ts",
    exportPath: "./remote-endpoint",
    packageDir: "packages/quickjs",
    packageName: "@execbox/quickjs",
    sourcePath: "packages/quickjs/src/remoteEndpoint.ts",
  },
  {
    apiReportFileName: "execbox-remote.api.md",
    declarationPath: "dist/index.d.ts",
    exportPath: ".",
    packageDir: "packages/remote",
    packageName: "@execbox/remote",
    sourcePath: "packages/remote/src/index.ts",
  },
] as const satisfies readonly WorkspaceEntrypoint[];

export function createEntrypointSpecifier(
  entrypoint: WorkspaceEntrypoint,
): string {
  if (entrypoint.exportPath === ".") {
    return entrypoint.packageName;
  }

  return `${entrypoint.packageName}/${entrypoint.exportPath.slice(2)}`;
}

export function createPackageSourceCondition(
  entrypoint: WorkspaceEntrypoint,
): string {
  return `./${path.posix.relative(entrypoint.packageDir, entrypoint.sourcePath)}`;
}

export function createTsconfigPaths(): Record<string, string[]> {
  return Object.fromEntries(
    workspaceEntrypoints.map((entrypoint) => [
      createEntrypointSpecifier(entrypoint),
      [`./${entrypoint.sourcePath}`],
    ]),
  );
}

export function createVitestAliases(repoRoot: string): VitestAlias[] {
  return [...workspaceEntrypoints]
    .sort(
      (left, right) =>
        createEntrypointSpecifier(right).length -
          createEntrypointSpecifier(left).length ||
        createEntrypointSpecifier(left).localeCompare(
          createEntrypointSpecifier(right),
        ),
    )
    .map((entrypoint) => ({
      find: createEntrypointSpecifier(entrypoint),
      replacement: path.join(repoRoot, entrypoint.sourcePath),
    }));
}
