import { QuickJsExecutor } from "@execbox/quickjs";
import { runExecutorContractSuite } from "../../core/test-support/runExecutorContractSuite";

runExecutorContractSuite(
  "QuickJsExecutor",
  (options) => new QuickJsExecutor(options),
);
