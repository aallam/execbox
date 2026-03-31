import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type IsolatedVmCommand = "example" | "test";
export type PreflightFailureKind = "abi-mismatch" | "runtime-failure";

type CommandSpec = {
  args: string[];
  env?: Record<string, string>;
};

const SUPPORTED_NODE_MAJORS = new Set([22, 24]);
const PREFLIGHT_SOURCE = [
  'import ivm from "isolated-vm";',
  "const isolate = new ivm.Isolate({ memoryLimit: 16 });",
  "isolate.dispose();",
].join(" ");

const COMMAND_SPECS: Record<IsolatedVmCommand, CommandSpec> = {
  example: {
    args: [
      "--no-node-snapshot",
      "--import",
      "tsx",
      "examples/execbox-isolated-vm-basic.ts",
    ],
    env: {
      NODE_OPTIONS: "--no-node-snapshot",
    },
  },
  test: {
    args: [
      "--no-node-snapshot",
      "./node_modules/vitest/vitest.mjs",
      "run",
      "packages/isolated-vm/__tests__",
    ],
    env: {
      NODE_OPTIONS: "--no-node-snapshot",
      VITEST_INCLUDE_ISOLATED_VM: "1",
    },
  },
};

export function isSupportedIsolatedVmNodeMajor(major: number): boolean {
  return SUPPORTED_NODE_MAJORS.has(major);
}

export function buildUnsupportedNodeMessage(version: string): string {
  return [
    `isolated-vm scripts only support Node 22 or 24. Current runtime is ${version}.`,
    "Switch to Node 22 or 24, then rebuild isolated-vm under that same Node version if needed.",
  ].join(" ");
}

export function classifyPreflightFailure(stderr: string): PreflightFailureKind {
  if (
    /NODE_MODULE_VERSION|compiled against a different Node\.js version|ERR_DLOPEN_FAILED/i.test(
      stderr,
    )
  ) {
    return "abi-mismatch";
  }

  return "runtime-failure";
}

export function buildAbiMismatchMessage(): string {
  return [
    "isolated-vm was built for a different Node.js version.",
    "Rebuild it under the current runtime with `npm rebuild isolated-vm` (or reinstall dependencies) and try again.",
  ].join(" ");
}

export function buildRuntimeFailureMessage(version: string): string {
  return [
    `isolated-vm failed its runtime preflight under ${version}.`,
    "Ensure the native addon installed successfully for this Node version and rebuild it after switching runtimes.",
  ].join(" ");
}

export function getIsolatedVmCommandSpec(
  command: IsolatedVmCommand,
): CommandSpec {
  return COMMAND_SPECS[command];
}

function runPreflight(
  nodeExecutable: string,
  spawnSyncImpl: typeof spawnSync,
): SpawnSyncReturns<string> {
  return spawnSyncImpl(
    nodeExecutable,
    ["--no-node-snapshot", "--input-type=module", "-e", PREFLIGHT_SOURCE],
    {
      encoding: "utf8",
      stdio: "pipe",
    },
  );
}

function printMessage(message: string): void {
  process.stderr.write(`${message}\n`);
}

export function runIsolatedVmCommand(
  command: IsolatedVmCommand,
  spawnSyncImpl: typeof spawnSync = spawnSync,
): number {
  const nodeMajor = Number.parseInt(
    process.versions.node.split(".")[0] ?? "",
    10,
  );

  if (!isSupportedIsolatedVmNodeMajor(nodeMajor)) {
    printMessage(buildUnsupportedNodeMessage(process.version));
    return 1;
  }

  const preflight = runPreflight(process.execPath, spawnSyncImpl);

  if (preflight.error) {
    printMessage(buildRuntimeFailureMessage(process.version));
    return 1;
  }

  if (preflight.status !== 0) {
    const stderr = preflight.stderr ?? "";
    const message =
      classifyPreflightFailure(stderr) === "abi-mismatch"
        ? buildAbiMismatchMessage()
        : buildRuntimeFailureMessage(process.version);
    printMessage(message);
    return preflight.status ?? 1;
  }

  const spec = getIsolatedVmCommandSpec(command);
  const result = spawnSyncImpl(process.execPath, spec.args, {
    stdio: "inherit",
    env: {
      ...process.env,
      ...spec.env,
    },
  });

  if (result.error) {
    printMessage(result.error.message);
    return 1;
  }

  return result.status ?? 1;
}

export function main(argv: string[] = process.argv.slice(2)): number {
  const command = argv[0];

  if (command !== "example" && command !== "test") {
    printMessage(
      "Usage: node --import tsx scripts/isolatedVmLauncher.ts <example|test>",
    );
    return 1;
  }

  return runIsolatedVmCommand(command);
}

const modulePath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (invokedPath === modulePath) {
  process.exit(main());
}
