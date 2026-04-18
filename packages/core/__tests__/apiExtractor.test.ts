import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  apiExtractorTargets,
  createApiExtractorArgs,
} from "../../../scripts/run-api-extractor";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

describe("run-api-extractor", () => {
  it("covers the phase 1 public entrypoints", () => {
    expect(apiExtractorTargets).toEqual([
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
      {
        configFilePath: "packages/quickjs/api-extractor.json",
        workspace: "@execbox/quickjs",
      },
      {
        configFilePath: "packages/quickjs/api-extractor.runner.json",
        workspace: "@execbox/quickjs",
      },
      {
        configFilePath: "packages/quickjs/api-extractor.protocol-endpoint.json",
        workspace: "@execbox/quickjs",
      },
      {
        configFilePath: "packages/remote/api-extractor.json",
        workspace: "@execbox/remote",
      },
      {
        configFilePath: "packages/process/api-extractor.json",
        workspace: "@execbox/process",
      },
      {
        configFilePath: "packages/worker/api-extractor.json",
        workspace: "@execbox/worker",
      },
      {
        configFilePath: "packages/isolated-vm/api-extractor.json",
        workspace: "@execbox/isolated-vm",
      },
      {
        configFilePath: "packages/isolated-vm/api-extractor.runner.json",
        workspace: "@execbox/isolated-vm",
      },
    ]);
  });

  it("builds CLI args for CI and local report updates", () => {
    expect(
      createApiExtractorArgs({
        configFilePath: "packages/core/api-extractor.json",
        local: false,
      }),
    ).toEqual([
      "run",
      "--config",
      "packages/core/api-extractor.json",
      "--typescript-compiler-folder",
      "node_modules/typescript",
    ]);

    expect(
      createApiExtractorArgs({
        configFilePath: "packages/core/api-extractor.json",
        local: true,
      }),
    ).toEqual([
      "run",
      "--config",
      "packages/core/api-extractor.json",
      "--local",
      "--typescript-compiler-folder",
      "node_modules/typescript",
    ]);
  });

  it("defines root scripts and committed phase 1 API report configs", () => {
    const packageJson = JSON.parse(
      readFileSync(path.join(repoRoot, "package.json"), "utf8"),
    ) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts["api:check"]).toBe(
      "npm run build --workspace @execbox/core && npm run build --workspace @execbox/protocol && npm run build --workspace @execbox/quickjs && npm run build --workspace @execbox/remote && npm run build --workspace @execbox/process && npm run build --workspace @execbox/worker && npm run build --workspace @execbox/isolated-vm && node --import tsx scripts/run-api-extractor.ts",
    );
    expect(packageJson.scripts["api:update"]).toBe(
      "npm run build --workspace @execbox/core && npm run build --workspace @execbox/protocol && npm run build --workspace @execbox/quickjs && npm run build --workspace @execbox/remote && npm run build --workspace @execbox/process && npm run build --workspace @execbox/worker && npm run build --workspace @execbox/isolated-vm && node --import tsx scripts/run-api-extractor.ts --local",
    );

    expect(
      JSON.parse(
        readFileSync(
          path.join(repoRoot, "packages/core/api-extractor.json"),
          "utf8",
        ),
      ),
    ).toMatchObject({
      apiReport: {
        enabled: true,
        reportFileName: "execbox-core.api.md",
        reportFolder: "<projectFolder>/etc",
        reportTempFolder: "<projectFolder>/temp/api-extractor",
      },
      dtsRollup: {
        enabled: false,
      },
      mainEntryPointFilePath: "<projectFolder>/dist/index.d.ts",
    });

    expect(
      JSON.parse(
        readFileSync(
          path.join(repoRoot, "packages/core/api-extractor.mcp.json"),
          "utf8",
        ),
      ),
    ).toMatchObject({
      apiReport: {
        enabled: true,
        reportFileName: "execbox-core-mcp.api.md",
      },
      mainEntryPointFilePath: "<projectFolder>/dist/mcp/index.d.ts",
    });

    expect(
      JSON.parse(
        readFileSync(
          path.join(repoRoot, "packages/protocol/api-extractor.json"),
          "utf8",
        ),
      ),
    ).toMatchObject({
      apiReport: {
        enabled: true,
        reportFileName: "execbox-protocol.api.md",
      },
      mainEntryPointFilePath: "<projectFolder>/dist/index.d.ts",
    });

    expect(
      JSON.parse(
        readFileSync(
          path.join(repoRoot, "packages/quickjs/api-extractor.json"),
          "utf8",
        ),
      ),
    ).toMatchObject({
      apiReport: {
        enabled: true,
        reportFileName: "execbox-quickjs.api.md",
      },
      mainEntryPointFilePath: "<projectFolder>/dist/index.d.ts",
    });

    expect(
      JSON.parse(
        readFileSync(
          path.join(repoRoot, "packages/quickjs/api-extractor.runner.json"),
          "utf8",
        ),
      ),
    ).toMatchObject({
      apiReport: {
        enabled: true,
        reportFileName: "execbox-quickjs-runner.api.md",
      },
      mainEntryPointFilePath: "<projectFolder>/dist/runner/index.d.ts",
    });

    expect(
      JSON.parse(
        readFileSync(
          path.join(
            repoRoot,
            "packages/quickjs/api-extractor.protocol-endpoint.json",
          ),
          "utf8",
        ),
      ),
    ).toMatchObject({
      apiReport: {
        enabled: true,
        reportFileName: "execbox-quickjs-runner-protocol-endpoint.api.md",
      },
      mainEntryPointFilePath:
        "<projectFolder>/dist/runner/protocolEndpoint.d.ts",
    });

    expect(
      JSON.parse(
        readFileSync(
          path.join(repoRoot, "packages/remote/api-extractor.json"),
          "utf8",
        ),
      ),
    ).toMatchObject({
      apiReport: {
        enabled: true,
        reportFileName: "execbox-remote.api.md",
      },
      mainEntryPointFilePath: "<projectFolder>/dist/index.d.ts",
    });

    expect(
      JSON.parse(
        readFileSync(
          path.join(repoRoot, "packages/process/api-extractor.json"),
          "utf8",
        ),
      ),
    ).toMatchObject({
      apiReport: {
        enabled: true,
        reportFileName: "execbox-process.api.md",
      },
      mainEntryPointFilePath: "<projectFolder>/dist/index.d.ts",
    });

    expect(
      JSON.parse(
        readFileSync(
          path.join(repoRoot, "packages/worker/api-extractor.json"),
          "utf8",
        ),
      ),
    ).toMatchObject({
      apiReport: {
        enabled: true,
        reportFileName: "execbox-worker.api.md",
      },
      mainEntryPointFilePath: "<projectFolder>/dist/index.d.ts",
    });

    expect(
      JSON.parse(
        readFileSync(
          path.join(repoRoot, "packages/isolated-vm/api-extractor.json"),
          "utf8",
        ),
      ),
    ).toMatchObject({
      apiReport: {
        enabled: true,
        reportFileName: "execbox-isolated-vm.api.md",
      },
      mainEntryPointFilePath: "<projectFolder>/dist/index.d.ts",
    });

    expect(
      JSON.parse(
        readFileSync(
          path.join(repoRoot, "packages/isolated-vm/api-extractor.runner.json"),
          "utf8",
        ),
      ),
    ).toMatchObject({
      apiReport: {
        enabled: true,
        reportFileName: "execbox-isolated-vm-runner.api.md",
      },
      mainEntryPointFilePath: "<projectFolder>/dist/runner/index.d.ts",
    });

    expect(
      readFileSync(
        path.join(repoRoot, "packages/core/etc/execbox-core.api.md"),
        "utf8",
      ),
    ).toContain("## API Report File");
    expect(
      readFileSync(
        path.join(repoRoot, "packages/core/etc/execbox-core-mcp.api.md"),
        "utf8",
      ),
    ).toContain("## API Report File");
    expect(
      readFileSync(
        path.join(repoRoot, "packages/protocol/etc/execbox-protocol.api.md"),
        "utf8",
      ),
    ).toContain("## API Report File");
    expect(
      readFileSync(
        path.join(repoRoot, "packages/quickjs/etc/execbox-quickjs.api.md"),
        "utf8",
      ),
    ).toContain("## API Report File");
    expect(
      readFileSync(
        path.join(
          repoRoot,
          "packages/quickjs/etc/execbox-quickjs-runner.api.md",
        ),
        "utf8",
      ),
    ).toContain("## API Report File");
    expect(
      readFileSync(
        path.join(
          repoRoot,
          "packages/quickjs/etc/execbox-quickjs-runner-protocol-endpoint.api.md",
        ),
        "utf8",
      ),
    ).toContain("## API Report File");
    expect(
      readFileSync(
        path.join(repoRoot, "packages/remote/etc/execbox-remote.api.md"),
        "utf8",
      ),
    ).toContain("## API Report File");
    expect(
      readFileSync(
        path.join(repoRoot, "packages/process/etc/execbox-process.api.md"),
        "utf8",
      ),
    ).toContain("## API Report File");
    expect(
      readFileSync(
        path.join(repoRoot, "packages/worker/etc/execbox-worker.api.md"),
        "utf8",
      ),
    ).toContain("## API Report File");
    expect(
      readFileSync(
        path.join(
          repoRoot,
          "packages/isolated-vm/etc/execbox-isolated-vm.api.md",
        ),
        "utf8",
      ),
    ).toContain("## API Report File");
    expect(
      readFileSync(
        path.join(
          repoRoot,
          "packages/isolated-vm/etc/execbox-isolated-vm-runner.api.md",
        ),
        "utf8",
      ),
    ).toContain("## API Report File");
  });
});
