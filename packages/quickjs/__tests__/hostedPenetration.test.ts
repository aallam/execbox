import { QuickJsExecutor } from "../src/index";
import { runWrappedMcpPenetrationSuite } from "../../core/test-support/runWrappedMcpPenetrationSuite";

runWrappedMcpPenetrationSuite(
  "QuickJsExecutor worker host wrapped MCP",
  (options) => {
    return new QuickJsExecutor({
      ...options,
      host: "worker",
    });
  },
);
