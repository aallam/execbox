import { spawnSync } from "node:child_process";

const COMMANDS = {
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
} as const;

const command = process.argv[2];
const supportedNodeMajors = new Set([22, 24]);
const nodeMajor = Number.parseInt(
  process.versions.node.split(".")[0] ?? "",
  10,
);

if (command !== "example" && command !== "test") {
  process.stderr.write(
    "Usage: node --import tsx scripts/isolatedVmLauncher.ts <example|test>\n",
  );
  process.exit(1);
}

if (!supportedNodeMajors.has(nodeMajor)) {
  process.stderr.write(
    `isolated-vm scripts only support Node 22 or 24. Current runtime is ${process.version}.\n`,
  );
  process.exit(1);
}

const selectedCommand = COMMANDS[command];
const result = spawnSync(process.execPath, selectedCommand.args, {
  stdio: "inherit",
  env: {
    ...process.env,
    ...selectedCommand.env,
  },
});

if (result.error) {
  process.stderr.write(`${result.error.message}\n`);
  process.exit(1);
}

process.exit(result.status ?? 1);
