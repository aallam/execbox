import path from "node:path";

export interface WorkspaceEntrypoint {
  specifier: string;
  sourcePath: string;
}

export interface VitestAlias {
  find: string;
  replacement: string;
}

export const workspaceEntrypoints = [
  {
    specifier: "@execbox/core",
    sourcePath: "packages/core/src/index.ts",
  },
  {
    specifier: "@execbox/core/runtime",
    sourcePath: "packages/core/src/runtime.ts",
  },
  {
    specifier: "@execbox/core/mcp",
    sourcePath: "packages/core/src/mcp/index.ts",
  },
  {
    specifier: "@execbox/core/protocol",
    sourcePath: "packages/core/src/protocol/index.ts",
  },
  {
    specifier: "@execbox/quickjs",
    sourcePath: "packages/quickjs/src/index.ts",
  },
  {
    specifier: "@execbox/quickjs/remote-endpoint",
    sourcePath: "packages/quickjs/src/remoteEndpoint.ts",
  },
  {
    specifier: "@execbox/quickjs/runner",
    sourcePath: "packages/quickjs/src/runner/index.ts",
  },
  {
    specifier: "@execbox/quickjs/runner/protocol-endpoint",
    sourcePath: "packages/quickjs/src/runner/protocolEndpoint.ts",
  },
  {
    specifier: "@execbox/remote",
    sourcePath: "packages/remote/src/index.ts",
  },
  {
    specifier: "@execbox/isolated-vm",
    sourcePath: "packages/isolated-vm/src/index.ts",
  },
  {
    specifier: "@execbox/isolated-vm/runner",
    sourcePath: "packages/isolated-vm/src/runner/index.ts",
  },
] as const satisfies readonly WorkspaceEntrypoint[];

export function createTsconfigPaths(): Record<string, string[]> {
  return Object.fromEntries(
    workspaceEntrypoints.map(({ sourcePath, specifier }) => [
      specifier,
      [`./${sourcePath}`],
    ]),
  );
}

export function createVitestAliases(repoRoot: string): VitestAlias[] {
  return [...workspaceEntrypoints]
    .sort(
      (left, right) =>
        right.specifier.length - left.specifier.length ||
        left.specifier.localeCompare(right.specifier),
    )
    .map(({ sourcePath, specifier }) => ({
      find: specifier,
      replacement: path.join(repoRoot, sourcePath),
    }));
}
