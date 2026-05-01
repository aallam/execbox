import { runWrappedMcpPenetrationSuite } from "../../../core/test-support/runWrappedMcpPenetrationSuite";
import { QuickJsExecutor } from "../../src/index";

runWrappedMcpPenetrationSuite(
  "QuickJsExecutor worker host wrapped MCP",
  (options) => {
    return new QuickJsExecutor({
      ...options,
      host: "worker",
    });
  },
);
