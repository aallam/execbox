import { definePackageBuildConfig } from "../../scripts/tsdown-config.ts";

export default definePackageBuildConfig({
  entry: ["src/index.ts", "src/runner/index.ts"],
  external: ["isolated-vm"],
});
