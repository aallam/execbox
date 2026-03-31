import { describe, expect, expectTypeOf, it } from "vitest";
import type { ExecuteResult } from "@execbox/core";
import { isExecuteFailureResult, isExecuteSuccess } from "@execbox/core";

describe("execute result helpers", () => {
  it("identifies successful execution results", () => {
    const result: ExecuteResult<{ sum: number }> = {
      durationMs: 1,
      logs: [],
      ok: true,
      result: {
        sum: 7,
      },
    };

    expect(isExecuteSuccess(result)).toBe(true);
    expect(isExecuteFailureResult(result)).toBe(false);
  });

  it("identifies failed execution results", () => {
    const result: ExecuteResult = {
      durationMs: 1,
      error: {
        code: "runtime_error",
        message: "boom",
      },
      logs: [],
      ok: false,
    };

    expect(isExecuteSuccess(result)).toBe(false);
    expect(isExecuteFailureResult(result)).toBe(true);
  });

  it("narrows success results to the result payload", () => {
    const result: ExecuteResult<{ sum: number }> = {
      durationMs: 1,
      logs: [],
      ok: true,
      result: {
        sum: 7,
      },
    };

    if (!isExecuteSuccess(result)) {
      throw new Error("Expected success result");
    }

    expectTypeOf(result.result).toEqualTypeOf<{ sum: number }>();
    expect(result.result.sum).toBe(7);
  });

  it("narrows failure results to the error payload", () => {
    const result: ExecuteResult<{ sum: number }> = {
      durationMs: 1,
      error: {
        code: "tool_error",
        message: "boom",
      },
      logs: [],
      ok: false,
    };

    if (!isExecuteFailureResult(result)) {
      throw new Error("Expected failure result");
    }

    expectTypeOf(result.error.code).toEqualTypeOf<
      | "timeout"
      | "memory_limit"
      | "validation_error"
      | "tool_error"
      | "runtime_error"
      | "serialization_error"
      | "internal_error"
    >();
    expect(result.error).toMatchObject({
      code: "tool_error",
      message: "boom",
    });
  });
});
