import { definePackageBuildConfig } from "../../scripts/tsdown-config.ts";

export default definePackageBuildConfig({
  entry: ["src/index.ts", "src/remoteEndpoint.ts", "src/workerEntry.ts"],
});
