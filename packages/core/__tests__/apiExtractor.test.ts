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
  it("covers the current public entrypoints", () => {
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
        configFilePath: "packages/core/api-extractor.protocol.json",
        workspace: "@execbox/core",
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

  it("defines root scripts and committed API report configs", () => {
    const packageJson = JSON.parse(
      readFileSync(path.join(repoRoot, "package.json"), "utf8"),
    ) as {
      devDependencies: Record<string, string>;
      scripts: Record<string, string>;
      workspaces: string[];
    };

    expect(packageJson.scripts.build).toBe(
      "npm run build --workspaces --if-present",
    );
    expect(packageJson.scripts["api:check"]).toBe(
      "npm run build && node --import tsx scripts/run-api-extractor.ts",
    );
    expect(packageJson.scripts["api:update"]).toBe(
      "npm run build && node --import tsx scripts/run-api-extractor.ts --local",
    );
    expect(packageJson.scripts["package:check"]).toBe(
      "npm_config_cache=$PWD/.npm-cache CI=1 npm run build",
    );
    expect(packageJson.workspaces).not.toContain("packages/protocol");
    expect(packageJson.devDependencies).toMatchObject({
      "@arethetypeswrong/core": expect.any(String),
      publint: expect.any(String),
    });

    const tsdownConfigPaths = [
      "packages/core/tsdown.config.ts",
      "packages/quickjs/tsdown.config.ts",
      "packages/remote/tsdown.config.ts",
      "packages/isolated-vm/tsdown.config.ts",
    ];

    for (const configPath of tsdownConfigPaths) {
      const configSource = readFileSync(
        path.join(repoRoot, configPath),
        "utf8",
      );

      expect(configSource).toMatch(
        /attw:\s*\{\s*enabled:\s*"ci-only",\s*level:\s*"error",\s*profile:\s*"node16",\s*\}/s,
      );
      expect(configSource).toMatch(
        /publint:\s*\{\s*enabled:\s*"ci-only",\s*level:\s*"error",\s*\}/s,
      );
    }

    const ciWorkflow = readFileSync(
      path.join(repoRoot, ".github/workflows/ci.yml"),
      "utf8",
    );

    expect(ciWorkflow).toContain("name: Package validation");
    expect(ciWorkflow).toContain("run: npm run package:check");

    const gitignore = readFileSync(path.join(repoRoot, ".gitignore"), "utf8");

    expect(gitignore).toContain(".npm-cache/");

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
          path.join(repoRoot, "packages/core/api-extractor.protocol.json"),
          "utf8",
        ),
      ),
    ).toMatchObject({
      apiReport: {
        enabled: true,
        reportFileName: "execbox-core-protocol.api.md",
      },
      mainEntryPointFilePath: "<projectFolder>/dist/protocol/index.d.ts",
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
        path.join(repoRoot, "packages/core/etc/execbox-core-protocol.api.md"),
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

  it("commits warning-free API reports with package documentation", () => {
    const reportPaths = [
      "packages/core/etc/execbox-core.api.md",
      "packages/core/etc/execbox-core-mcp.api.md",
      "packages/core/etc/execbox-core-protocol.api.md",
      "packages/quickjs/etc/execbox-quickjs.api.md",
      "packages/quickjs/etc/execbox-quickjs-runner.api.md",
      "packages/quickjs/etc/execbox-quickjs-runner-protocol-endpoint.api.md",
      "packages/remote/etc/execbox-remote.api.md",
      "packages/isolated-vm/etc/execbox-isolated-vm.api.md",
      "packages/isolated-vm/etc/execbox-isolated-vm-runner.api.md",
    ];

    for (const reportPath of reportPaths) {
      const report = readFileSync(path.join(repoRoot, reportPath), "utf8");

      expect(report, reportPath).not.toContain("Warning:");
      expect(report, reportPath).not.toContain(
        "(No @packageDocumentation comment for this package)",
      );
    }
  });
});
