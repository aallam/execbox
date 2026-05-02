import {
  isFail,
  type QuickJSContext,
  type QuickJSHandle,
  type QuickJSRuntime,
} from "quickjs-emscripten";

import {
  ExecuteFailure,
  getExecutionTimeoutMessage,
  isExecuteFailure,
  isKnownExecuteErrorCode,
  normalizeThrownMessage,
} from "@execbox/core/runtime";
import type { ExecuteError } from "@execbox/core";

/**
 * Converts unexpected executor failures into stable public result errors.
 */
export function toExecuteError(error: unknown, deadline: number): ExecuteError {
  if (isExecuteFailure(error)) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  const message = normalizeThrownMessage(error);

  if (Date.now() > deadline || message.includes("interrupted")) {
    return {
      code: "timeout",
      message: getExecutionTimeoutMessage(),
    };
  }

  if (message.toLowerCase().includes("out of memory")) {
    return {
      code: "memory_limit",
      message,
    };
  }

  return {
    code: "runtime_error",
    message,
  };
}

/**
 * Converts a guest-side error handle into the public execbox error shape.
 */
export function errorFromGuestHandle(
  context: QuickJSContext,
  handle: QuickJSHandle,
  trustedHostErrorKey: string,
): ExecuteError {
  const codeHandle = context.getProp(handle, "code");
  const messageHandle = context.getProp(handle, "message");
  const trustedMarkerHandle = context.getProp(handle, trustedHostErrorKey);

  try {
    const code =
      context.typeof(codeHandle) === "string"
        ? context.getString(codeHandle)
        : undefined;
    const trustedHostError = context.typeof(trustedMarkerHandle) === "boolean";
    const message =
      context.typeof(messageHandle) === "string"
        ? context.getString(messageHandle)
        : normalizeThrownMessage(context.dump(handle));

    if (trustedHostError && isKnownExecuteErrorCode(code)) {
      return {
        code,
        message,
      };
    }

    return {
      code: "runtime_error",
      message,
    };
  } finally {
    codeHandle.dispose();
    messageHandle.dispose();
    trustedMarkerHandle.dispose();
  }
}

/**
 * Advances QuickJS pending jobs until the resolved promise settles or times out.
 */
export async function waitForPromiseSettlement(
  runtime: QuickJSRuntime,
  promise: Promise<unknown>,
  deadline: number,
  trustedHostErrorKey: string,
): Promise<void> {
  let settled = false;
  let rejection: unknown;

  promise.then(
    () => {
      settled = true;
    },
    (error) => {
      settled = true;
      rejection = error;
    },
  );

  while (!settled) {
    if (Date.now() > deadline) {
      throw new ExecuteFailure("timeout", getExecutionTimeoutMessage());
    }

    const pendingJobsResult = runtime.executePendingJobs(-1);
    if (isFail(pendingJobsResult)) {
      const pendingError = pendingJobsResult.error;

      try {
        const executeError = errorFromGuestHandle(
          pendingError.context,
          pendingError,
          trustedHostErrorKey,
        );
        throw new ExecuteFailure(executeError.code, executeError.message);
      } finally {
        pendingError.dispose();
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  if (rejection !== undefined) {
    throw rejection;
  }
}
