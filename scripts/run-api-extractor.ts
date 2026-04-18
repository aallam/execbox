import { spawnSync } from "node:child_process";
import process from "node:process";

export interface ApiExtractorTarget {
  configFilePath: string;
  workspace: string;
}

export const apiExtractorTargets: ApiExtractorTarget[] = [
  {
    configFilePath: "packages/core/api-extractor.json",
    workspace: "@execbox/core",
  },
  {
    configFilePath: "packages/core/api-extractor.mcp.json",
    workspace: "@execbox/core",
  },
  {
    configFilePath: "packages/protocol/api-extractor.json",
    workspace: "@execbox/protocol",
  },
];

export function createApiExtractorArgs(options: {
  configFilePath: string;
  local: boolean;
}): string[] {
  return [
    "run",
    "--config",
    options.configFilePath,
    ...(options.local ? ["--local"] : []),
    "--typescript-compiler-folder",
    "node_modules/typescript",
  ];
}

function run(): never | void {
  const local = process.argv.includes("--local");
  const command =
    process.platform === "win32" ? "api-extractor.cmd" : "api-extractor";

  for (const target of apiExtractorTargets) {
    const result = spawnSync(
      command,
      createApiExtractorArgs({
        configFilePath: target.configFilePath,
        local,
      }),
      {
        stdio: "inherit",
      },
    );

    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  run();
}
