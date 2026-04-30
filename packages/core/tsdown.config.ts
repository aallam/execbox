import { definePackageBuildConfig } from "../../scripts/tsdown-config.ts";

export default definePackageBuildConfig({
  entry: [
    "src/index.ts",
    "src/mcp/index.ts",
    "src/protocol/index.ts",
    "src/runtime.ts",
  ],
});
