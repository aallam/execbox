import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  createPackageSourceCondition,
  createTsconfigPaths,
  workspaceEntrypoints,
  type WorkspaceEntrypoint,
} from "./workspace-entrypoints.ts";

export type TsconfigPathDrift =
  | {
      actual?: string[];
      expected: string[];
      issue: "changed" | "missing";
      specifier: string;
    }
  | {
      actual: string[];
      expected?: undefined;
      issue: "unexpected";
      specifier: string;
    };

export function getTsconfigPathDrift(
  actualPaths: Record<string, string[]> | undefined,
  expectedPaths: Record<string, string[]>,
): TsconfigPathDrift[] {
  const actual = actualPaths ?? {};
  const drift: TsconfigPathDrift[] = [];

  for (const [specifier, expected] of Object.entries(expectedPaths)) {
    const current = actual[specifier];

    if (!current) {
      drift.push({
        expected,
        issue: "missing",
        specifier,
      });
      continue;
    }

    if (JSON.stringify(current) !== JSON.stringify(expected)) {
      drift.push({
        actual: current,
        expected,
        issue: "changed",
        specifier,
      });
    }
  }

  for (const [specifier, current] of Object.entries(actual)) {
    if (!(specifier in expectedPaths)) {
      drift.push({
        actual: current,
        issue: "unexpected",
        specifier,
      });
    }
  }

  return drift;
}

export function formatTsconfigPathDrift(drift: TsconfigPathDrift[]): string {
  return drift
    .map((entry) => {
      if (entry.issue === "missing") {
        return `- ${entry.specifier}: missing ${JSON.stringify(entry.expected)}`;
      }

      if (entry.issue === "unexpected") {
        return `- ${entry.specifier}: unexpected ${JSON.stringify(entry.actual)}`;
      }

      return `- ${entry.specifier}: expected ${JSON.stringify(entry.expected)}, found ${JSON.stringify(entry.actual)}`;
    })
    .join("\n");
}

export type PackageExportDrift =
  | {
      actual?: string;
      expected: string;
      exportPath: string;
      issue: "changed-source" | "missing-export";
      packageName: string;
    }
  | {
      actual: string;
      expected?: undefined;
      exportPath: string;
      issue: "unexpected-export";
      packageName: string;
    };

export function getPackageExportDrift(options: {
  entrypoints: readonly WorkspaceEntrypoint[];
  manifest: PackageManifest;
}): PackageExportDrift[] {
  const expectedByExportPath = Object.fromEntries(
    options.entrypoints.map((entrypoint) => [
      entrypoint.exportPath,
      createPackageSourceCondition(entrypoint),
    ]),
  );
  const actualExports = options.manifest.exports ?? {};
  const drift: PackageExportDrift[] = [];

  for (const [exportPath, expected] of Object.entries(expectedByExportPath)) {
    const actual = actualExports[exportPath]?.source;

    if (!actual) {
      drift.push({
        expected,
        exportPath,
        issue: "missing-export",
        packageName: options.manifest.name,
      });
      continue;
    }

    if (actual !== expected) {
      drift.push({
        actual,
        expected,
        exportPath,
        issue: "changed-source",
        packageName: options.manifest.name,
      });
    }
  }

  for (const exportPath of Object.keys(actualExports)) {
    if (!(exportPath in expectedByExportPath)) {
      drift.push({
        actual: actualExports[exportPath]?.source ?? "<missing source>",
        exportPath,
        issue: "unexpected-export",
        packageName: options.manifest.name,
      });
    }
  }

  return drift;
}

export function formatPackageExportDrift(drift: PackageExportDrift[]): string {
  return drift
    .map((entry) => {
      const prefix = `- ${entry.packageName} ${entry.exportPath}`;

      if (entry.issue === "missing-export") {
        return `${prefix}: missing export with source ${JSON.stringify(entry.expected)}`;
      }

      if (entry.issue === "unexpected-export") {
        return `${prefix}: unexpected export with source ${JSON.stringify(entry.actual)}`;
      }

      return `${prefix}: expected source ${JSON.stringify(entry.expected)}, found ${JSON.stringify(entry.actual)}`;
    })
    .join("\n");
}

interface WorkspaceTsconfig {
  compilerOptions?: {
    paths?: Record<string, string[]>;
  };
}

interface PackageManifest {
  exports?: Record<string, { source?: string }>;
  name: string;
}

function groupEntrypointsByPackageDir(): Map<string, WorkspaceEntrypoint[]> {
  const grouped = new Map<string, WorkspaceEntrypoint[]>();

  for (const entrypoint of workspaceEntrypoints) {
    const entrypoints = grouped.get(entrypoint.packageDir) ?? [];
    entrypoints.push(entrypoint);
    grouped.set(entrypoint.packageDir, entrypoints);
  }

  return grouped;
}

function run(): never | void {
  const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const tsconfig = JSON.parse(
    readFileSync(path.join(repoRoot, "tsconfig.json"), "utf8"),
  ) as WorkspaceTsconfig;
  const expectedPaths = createTsconfigPaths();
  const drift = getTsconfigPathDrift(
    tsconfig.compilerOptions?.paths,
    expectedPaths,
  );
  const packageExportDrift = [];

  for (const [packageDir, entrypoints] of groupEntrypointsByPackageDir()) {
    const manifest = JSON.parse(
      readFileSync(path.join(repoRoot, packageDir, "package.json"), "utf8"),
    ) as PackageManifest;
    const expectedPackageName = entrypoints[0]?.packageName;

    if (manifest.name !== expectedPackageName) {
      packageExportDrift.push(
        `- ${packageDir}: expected package name ${JSON.stringify(expectedPackageName)}, found ${JSON.stringify(manifest.name)}`,
      );
      continue;
    }

    const exportDrift = getPackageExportDrift({
      entrypoints,
      manifest,
    });

    if (exportDrift.length > 0) {
      packageExportDrift.push(formatPackageExportDrift(exportDrift));
    }
  }

  if (drift.length > 0) {
    console.error(
      [
        "tsconfig compilerOptions.paths is out of sync with scripts/workspace-entrypoints.ts.",
        formatTsconfigPathDrift(drift),
        "Expected paths:",
        JSON.stringify(expectedPaths, null, 2),
      ].join("\n"),
    );
    process.exit(1);
  }

  if (packageExportDrift.length > 0) {
    console.error(
      [
        "Package exports are out of sync with scripts/workspace-entrypoints.ts.",
        packageExportDrift.join("\n"),
      ].join("\n"),
    );
    process.exit(1);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  run();
}
