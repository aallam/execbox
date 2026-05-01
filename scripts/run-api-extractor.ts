import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { workspaceEntrypoints } from "./workspace-entrypoints.ts";

export interface ApiExtractorTarget {
  entryPointFilePath: string;
  packageDir: string;
  reportFileName: string;
  workspace: string;
}

export const apiExtractorTargets: ApiExtractorTarget[] =
  workspaceEntrypoints.map((entrypoint) => ({
    entryPointFilePath: entrypoint.declarationPath,
    packageDir: entrypoint.packageDir,
    reportFileName: entrypoint.apiReportFileName,
    workspace: entrypoint.packageName,
  }));

export function createApiExtractorConfig(target: ApiExtractorTarget): unknown {
  return {
    $schema:
      "https://developer.microsoft.com/json-schemas/api-extractor/v7/api-extractor.schema.json",
    apiReport: {
      enabled: true,
      reportFileName: target.reportFileName,
      reportFolder: "<projectFolder>/etc",
      reportTempFolder: "<projectFolder>/temp/api-extractor",
    },
    docModel: {
      enabled: false,
    },
    dtsRollup: {
      enabled: false,
    },
    mainEntryPointFilePath: `<projectFolder>/${target.entryPointFilePath}`,
    messages: {
      extractorMessageReporting: {
        "ae-missing-release-tag": {
          logLevel: "none",
        },
      },
    },
    tsdocMetadata: {
      enabled: false,
    },
  };
}

export function writeApiExtractorConfig(target: ApiExtractorTarget): string {
  const configDir = path.join(
    target.packageDir,
    "temp",
    "api-extractor",
    "configs",
  );
  const configFilePath = path.join(
    configDir,
    target.reportFileName.replaceAll(".", "-") + ".json",
  );

  mkdirSync(configDir, { recursive: true });
  writeFileSync(
    configFilePath,
    `${JSON.stringify(createApiExtractorConfig(target), null, 2)}\n`,
  );

  return configFilePath;
}

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
    const configFilePath = writeApiExtractorConfig(target);
    const result = spawnSync(
      command,
      createApiExtractorArgs({
        configFilePath,
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
