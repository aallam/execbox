import { definePackageBuildConfig } from "../../scripts/tsdown-config.ts";

export default definePackageBuildConfig({
  entry: [
    "src/index.ts",
    "src/remoteEndpoint.ts",
    "src/runner/index.ts",
    "src/runner/protocolEndpoint.ts",
    "src/workerEntry.ts",
  ],
});
