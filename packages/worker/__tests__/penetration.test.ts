import { runWrappedMcpPenetrationSuite } from "../../core/test-support/runWrappedMcpPenetrationSuite";
import { WorkerExecutor } from "../src/index";

runWrappedMcpPenetrationSuite("WorkerExecutor wrapped MCP", (options) => {
  return new WorkerExecutor(options);
});
