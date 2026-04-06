import { runExecutorContractSuite } from "../../core/test-support/runExecutorContractSuite";
import { WorkerExecutor } from "../src/index";

runExecutorContractSuite(
  "WorkerExecutor",
  (options) => new WorkerExecutor(options),
  { supportsPooling: true },
);
