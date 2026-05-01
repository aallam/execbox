import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createTsconfigPaths } from "./workspace-entrypoints.ts";

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

interface WorkspaceTsconfig {
  compilerOptions?: {
    paths?: Record<string, string[]>;
  };
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
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  run();
}
