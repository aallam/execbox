import { IsolatedVmExecutor } from "@execbox/isolated-vm";

import { runWrappedMcpPenetrationSuite } from "../../core/test-support/runWrappedMcpPenetrationSuite";

runWrappedMcpPenetrationSuite(
  "isolated-vm wrapped MCP penetration tests",
  (options) => {
    return new IsolatedVmExecutor(options);
  },
);
