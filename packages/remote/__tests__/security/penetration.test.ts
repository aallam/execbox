import { runWrappedMcpPenetrationSuite } from "../../../core/test-support/runWrappedMcpPenetrationSuite";
import { RemoteExecutor } from "../../src/index";
import { createLoopbackTransport } from "../../test-support/createLoopbackTransport";

runWrappedMcpPenetrationSuite("RemoteExecutor wrapped MCP", (options) => {
  return new RemoteExecutor({
    ...options,
    connectTransport: () => createLoopbackTransport(),
  });
});
