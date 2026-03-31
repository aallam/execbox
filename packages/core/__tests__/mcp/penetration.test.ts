import { QuickJsExecutor } from "@execbox/quickjs";

import { runWrappedMcpPenetrationSuite } from "../../test-support/runWrappedMcpPenetrationSuite";

runWrappedMcpPenetrationSuite(
  "QuickJS wrapped MCP penetration tests",
  (options) => {
    return new QuickJsExecutor(options);
  },
);
