import { QuickJsExecutor } from "@execbox/quickjs";
import { runExecutorContractSuite } from "../../core/test-support/runExecutorContractSuite";

runExecutorContractSuite(
  "QuickJsExecutor",
  (options) => new QuickJsExecutor(options),
);

runExecutorContractSuite(
  "QuickJsExecutor (worker host)",
  (options) =>
    new QuickJsExecutor({
      ...options,
      host: "worker",
    }),
  { supportsPooling: true },
);

runExecutorContractSuite(
  "QuickJsExecutor (process host)",
  (options) =>
    new QuickJsExecutor({
      ...options,
      host: "process",
    }),
  { supportsPooling: true },
);
