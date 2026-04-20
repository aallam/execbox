import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { QuickJsExecutor } from "@execbox/quickjs";
import { runExecutorContractSuite } from "../../core/test-support/runExecutorContractSuite";

describe("@execbox/quickjs package source safety", () => {
  it("keeps internal runtime core helpers source-local for prebuild execution", () => {
    const executorSource = readFileSync(
      new URL("../src/quickjsExecutor.ts", import.meta.url),
      "utf8",
    );
    const bridgeSource = readFileSync(
      new URL("../src/quickjsBridge.ts", import.meta.url),
      "utf8",
    );

    expect(executorSource).toContain('} from "@execbox/core/_internal";');
    expect(bridgeSource).toContain(
      'import { ExecuteFailure } from "@execbox/core/_internal";',
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

runExecutorContractSuite(
  "QuickJsExecutor (process host)",
  (options) =>
    new QuickJsExecutor({
      ...options,
      host: "process",
    }),
  { supportsPooling: true },
);
