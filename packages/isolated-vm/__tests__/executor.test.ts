import { IsolatedVmExecutor } from "@execbox/isolated-vm";
import { runExecutorContractSuite } from "../../core/test-support/runExecutorContractSuite";

runExecutorContractSuite(
  "IsolatedVmExecutor",
  (options) => new IsolatedVmExecutor(options),
);
