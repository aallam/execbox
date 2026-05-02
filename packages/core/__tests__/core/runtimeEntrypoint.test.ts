import { describe, expect, it } from "vitest";
import * as core from "@execbox/core";
import {
  createToolCallDispatcher,
  resolveExecutorRuntimeOptions,
} from "@execbox/core/runtime";

describe("@execbox/core/runtime", () => {
  it("exposes executor-author helpers from the runtime entrypoint", () => {
    expect(typeof resolveExecutorRuntimeOptions).toBe("function");
    expect(typeof createToolCallDispatcher).toBe("function");
  });

  it("keeps executor-author helpers out of the app-facing core entrypoint", () => {
    expect(core).not.toHaveProperty("assertValidIdentifier");
    expect(core).not.toHaveProperty("createToolCallDispatcher");
    expect(core).not.toHaveProperty("createTimeoutExecuteResult");
    expect(core).not.toHaveProperty("formatConsoleLine");
    expect(core).not.toHaveProperty("generateTypesFromJsonSchema");
    expect(core).not.toHaveProperty("isJsonSerializable");
    expect(core).not.toHaveProperty("normalizeThrownMessage");
    expect(core).not.toHaveProperty("sanitizeIdentifier");
    expect(core).not.toHaveProperty("sanitizeToolName");
    expect(core).not.toHaveProperty("serializePropertyName");
  });
});
