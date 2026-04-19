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

    expect(executorSource).toContain('} from "../../core/src/runtime.ts";');
    expect(bridgeSource).toContain(
      'import { ExecuteFailure } from "../../core/src/runtime.ts";',
    );
  });
});

runExecutorContractSuite(
  "QuickJsExecutor",
  (options) => new QuickJsExecutor(options),
);
