import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

const tsdownConfigPaths = [
  "packages/core/tsdown.config.ts",
  "packages/protocol/tsdown.config.ts",
  "packages/quickjs/tsdown.config.ts",
  "packages/remote/tsdown.config.ts",
  "packages/process/tsdown.config.ts",
  "packages/worker/tsdown.config.ts",
  "packages/isolated-vm/tsdown.config.ts",
];

describe("package validation", () => {
  it("defines the package validation lane in scripts, configs, and CI", () => {
    const packageJson = JSON.parse(
      readFileSync(path.join(repoRoot, "package.json"), "utf8"),
    ) as {
      devDependencies: Record<string, string>;
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts["package:check"]).toBe(
      "npm_config_cache=$PWD/.npm-cache CI=1 npm run build --workspace @execbox/core && npm_config_cache=$PWD/.npm-cache CI=1 npm run build --workspace @execbox/protocol && npm_config_cache=$PWD/.npm-cache CI=1 npm run build --workspace @execbox/quickjs && npm_config_cache=$PWD/.npm-cache CI=1 npm run build --workspace @execbox/remote && npm_config_cache=$PWD/.npm-cache CI=1 npm run build --workspace @execbox/process && npm_config_cache=$PWD/.npm-cache CI=1 npm run build --workspace @execbox/worker && npm_config_cache=$PWD/.npm-cache CI=1 npm run build --workspace @execbox/isolated-vm",
    );
    expect(packageJson.devDependencies).toMatchObject({
      "@arethetypeswrong/core": expect.any(String),
      publint: expect.any(String),
    });

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
  });
});
