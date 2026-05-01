import { QuickJsExecutor } from "@execbox/quickjs";
import { runExecutorContractSuite } from "../../core/test-support/runExecutorContractSuite";

describe("QuickJsExecutor host selection", () => {
  it("rejects the removed process host at runtime", () => {
    expect(
      () => new QuickJsExecutor({ host: "process" } as never),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: QuickJsExecutor host "process" is no longer supported. Use host "worker" for local hosted execution, or @execbox/remote for process, container, or VM boundaries.]`,
    );
  });
});

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
