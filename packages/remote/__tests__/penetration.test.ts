import { runWrappedMcpPenetrationSuite } from "../../core/test-support/runWrappedMcpPenetrationSuite";
import { createLoopbackTransport } from "../test-support/createLoopbackTransport";
import { RemoteExecutor } from "../src/index";

runWrappedMcpPenetrationSuite("RemoteExecutor wrapped MCP", (options) => {
  return new RemoteExecutor({
    ...options,
    connectTransport: () => createLoopbackTransport(),
  });
});
