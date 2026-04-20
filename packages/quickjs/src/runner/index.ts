/**
 * @packageDocumentation
 * Public API for the `@execbox/quickjs/runner` entrypoint.
 */
import { randomUUID } from "node:crypto";

import {
  RELEASE_SYNC,
  isFail,
  memoizePromiseFactory,
  newQuickJSWASMModule,
  shouldInterruptAfterDeadline,
  type QuickJSContext,
  type QuickJSHandle,
  type QuickJSRuntime,
  type QuickJSWASMModule,
} from "quickjs-emscripten";

import {
  ExecuteFailure,
  formatConsoleLine,
  getExecutionTimeoutMessage,
  isExecuteFailure,
  isKnownExecuteErrorCode,
  normalizeCode,
  normalizeThrownMessage,
  resolveExecutorRuntimeOptions,
  truncateLogs,
} from "@execbox/core/_internal";
import type {
  ExecuteError,
  ExecuteResult,
  ExecutorRuntimeOptions,
  ProviderManifest,
  ToolCall,
  ToolCallResult,
} from "@execbox/core";

import {
  createGuestErrorHandle,
  fromGuestHandle,
  toGuestHandle,
} from "../quickjsBridge.ts";
import type { QuickJsInlineExecutorOptions } from "../types.ts";

export type {
  QuickJsExecutorHost,
  QuickJsExecutorOptions,
  QuickJsHostedMode,
  QuickJsInlineExecutorOptions,
  QuickJsProcessExecutorOptions,
  QuickJsWorkerExecutorOptions,
  WorkerResourceLimits,
} from "../types.ts";

const loadDefaultModule = memoizePromiseFactory(() =>
  newQuickJSWASMModule(RELEASE_SYNC),
);

/**
 * Transport-neutral host tool call emitted from a QuickJS session.
 */
export type QuickJsSessionToolCall = ToolCall;

/**
 * Input required to run one transport-backed QuickJS execution session.
 */
export interface QuickJsSessionRequest {
  /** Optional abort controller that should be triggered when execution stops. */
  abortController?: AbortController;

  /** Guest JavaScript source to evaluate inside QuickJS. */
  code: string;

  /** Host callback used to fulfill guest tool calls. */
  onToolCall: (call: ToolCall) => Promise<ToolCallResult> | ToolCallResult;

  /** Optional hook invoked once the guest runtime has started. */
  onStarted?: () => void;

  /** Transport-safe provider manifests exposed to the guest runtime. */
  providers: ProviderManifest[];

  /** Optional caller-owned abort signal for the session. */
  signal?: AbortSignal;
}

/**
 * Options controlling one transport-backed QuickJS session.
 */
export type QuickJsSessionOptions = ExecutorRuntimeOptions &
  Pick<QuickJsInlineExecutorOptions, "loadModule"> & {
    /** Optional preloaded QuickJS WASM module instance. */
    module?: QuickJSWASMModule;
  };

/**
 * Converts unexpected executor failures into stable public result errors.
 */
function toExecuteError(error: unknown, deadline: number): ExecuteError {
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

function errorFromGuestHandle(
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

async function waitForPromiseSettlement(
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

function injectConsole(context: QuickJSContext, logs: string[]): void {
  const consoleHandle = context.newObject();

  try {
    for (const methodName of ["log", "info", "warn", "error"]) {
      const methodHandle = context.newFunction(methodName, (...args) => {
        logs.push(formatConsoleLine(args.map((arg) => context.dump(arg))));
        return context.undefined;
      });

      context.setProp(consoleHandle, methodName, methodHandle);
      methodHandle.dispose();
    }

    context.setProp(context.global, "console", consoleHandle);
  } finally {
    consoleHandle.dispose();
  }
}

function injectProviders(
  context: QuickJSContext,
  providers: ProviderManifest[],
  signal: AbortSignal,
  trustedHostErrorKey: string,
  onToolCall: QuickJsSessionRequest["onToolCall"],
): void {
  for (const provider of providers) {
    const providerHandle = context.newObject();

    try {
      for (const [safeToolName] of Object.entries(provider.tools)) {
        const toolHandle = createToolHandle(
          context,
          provider.name,
          safeToolName,
          signal,
          trustedHostErrorKey,
          onToolCall,
        );
        context.setProp(providerHandle, safeToolName, toolHandle);
        toolHandle.dispose();
      }

      context.setProp(context.global, provider.name, providerHandle);
    } finally {
      providerHandle.dispose();
    }
  }
}

function createToolHandle(
  context: QuickJSContext,
  providerName: string,
  safeToolName: string,
  signal: AbortSignal,
  trustedHostErrorKey: string,
  onToolCall: QuickJsSessionRequest["onToolCall"],
): QuickJSHandle {
  return context.newFunction(safeToolName, (...args) => {
    const deferred = context.newPromise();
    const disposeDeferred = () => {
      if (context.alive && deferred.alive) {
        deferred.dispose();
      }
    };
    let input: unknown;

    try {
      input =
        args[0] === undefined ? undefined : fromGuestHandle(context, args[0]);
    } catch (error) {
      const executeError = isExecuteFailure(error)
        ? error
        : new ExecuteFailure(
            "serialization_error",
            "Guest code passed a non-serializable tool input",
          );
      const errorHandle = createGuestErrorHandle(
        context,
        executeError.code,
        executeError.message,
        trustedHostErrorKey,
      );

      try {
        deferred.reject(errorHandle);
        return deferred.handle;
      } finally {
        errorHandle.dispose();
        queueMicrotask(disposeDeferred);
      }
    }
    const onAbort = () => {
      signal.removeEventListener("abort", onAbort);
      if (!context.alive || !deferred.alive) {
        disposeDeferred();
        return;
      }

      const errorHandle = createGuestErrorHandle(
        context,
        "timeout",
        getExecutionTimeoutMessage(),
        trustedHostErrorKey,
      );

      try {
        deferred.reject(errorHandle);
      } finally {
        errorHandle.dispose();
        disposeDeferred();
      }
    };

    signal.addEventListener("abort", onAbort, { once: true });

    let responsePromise: Promise<ToolCallResult>;

    try {
      if (signal.aborted) {
        throw new ExecuteFailure("timeout", getExecutionTimeoutMessage());
      }

      responsePromise = Promise.resolve(
        onToolCall({
          input,
          providerName,
          safeToolName,
        }),
      );
    } catch (error) {
      responsePromise = Promise.reject(error);
    }

    void responsePromise
      .then((response) => {
        signal.removeEventListener("abort", onAbort);
        if (!context.alive || !deferred.alive) {
          disposeDeferred();
          return;
        }

        let resultHandle: QuickJSHandle | undefined;

        try {
          if (!response.ok) {
            const errorHandle = createGuestErrorHandle(
              context,
              response.error.code,
              response.error.message,
              trustedHostErrorKey,
            );
            deferred.reject(errorHandle);
            errorHandle.dispose();
            return;
          }

          resultHandle = toGuestHandle(context, response.result);
          deferred.resolve(resultHandle);
        } finally {
          resultHandle?.dispose();
          disposeDeferred();
        }
      })
      .catch((error) => {
        signal.removeEventListener("abort", onAbort);
        if (!context.alive || !deferred.alive) {
          disposeDeferred();
          return;
        }

        const errorHandle = createGuestErrorHandle(
          context,
          isExecuteFailure(error) ? error.code : "internal_error",
          normalizeThrownMessage(error),
          trustedHostErrorKey,
        );

        try {
          deferred.reject(errorHandle);
        } finally {
          errorHandle.dispose();
          disposeDeferred();
        }
      });

    return deferred.handle;
  });
}

/**
 * Runs one QuickJS-backed execution session using a transport-neutral tool callback.
 */
export async function runQuickJsSession(
  request: QuickJsSessionRequest,
  options: QuickJsSessionOptions = {},
): Promise<ExecuteResult> {
  const runtimeOptions = resolveExecutorRuntimeOptions(options);
  const loadModule = async () => {
    if (options.module) {
      return options.module;
    }

    const loaded = options.loadModule
      ? await options.loadModule()
      : await loadDefaultModule();
    return loaded as QuickJSWASMModule;
  };
  const { maxLogChars, maxLogLines, memoryLimitBytes, timeoutMs } =
    runtimeOptions;
  const startedAt = Date.now();
  const logs: string[] = [];
  const abortController = new AbortController();
  const trustedHostErrorKey = `__execboxHostError_${randomUUID()}`;
  const signal =
    request.abortController?.signal ?? request.signal ?? abortController.signal;
  const module = await loadModule();
  const runtime = module.newRuntime();
  let deadline = Number.POSITIVE_INFINITY;
  runtime.setMemoryLimit(memoryLimitBytes);
  const context = runtime.newContext();

  try {
    injectConsole(context, logs);
    injectProviders(
      context,
      request.providers,
      signal,
      trustedHostErrorKey,
      request.onToolCall,
    );
    const executionStartedAt = Date.now();
    deadline = executionStartedAt + timeoutMs;
    const shouldInterrupt = shouldInterruptAfterDeadline(deadline);
    runtime.setInterruptHandler((currentRuntime) => {
      return signal.aborted || shouldInterrupt(currentRuntime);
    });
    request.onStarted?.();

    const executableSource = normalizeCode(request.code);
    const functionHandle = context.unwrapResult(
      context.evalCode(`(${executableSource})`, "sandbox-user-code.js"),
    );

    try {
      const promiseHandle = context.unwrapResult(
        context.callFunction(functionHandle, context.undefined),
      );

      try {
        const promiseResult = context.resolvePromise(promiseHandle);
        await waitForPromiseSettlement(
          runtime,
          promiseResult,
          deadline,
          trustedHostErrorKey,
        );
        const settledResult = await promiseResult;

        if (isFail(settledResult)) {
          const errorHandle = settledResult.error;

          try {
            return {
              durationMs: Date.now() - startedAt,
              error: errorFromGuestHandle(
                context,
                errorHandle,
                trustedHostErrorKey,
              ),
              logs: truncateLogs(logs, maxLogLines, maxLogChars),
              ok: false,
            };
          } finally {
            errorHandle.dispose();
          }
        }

        try {
          const value = fromGuestHandle(context, settledResult.value);

          return {
            durationMs: Date.now() - startedAt,
            logs: truncateLogs(logs, maxLogLines, maxLogChars),
            ok: true,
            result: value,
          };
        } catch (error) {
          return {
            durationMs: Date.now() - startedAt,
            error: toExecuteError(error, deadline),
            logs: truncateLogs(logs, maxLogLines, maxLogChars),
            ok: false,
          };
        } finally {
          settledResult.value.dispose();
        }
      } finally {
        promiseHandle.dispose();
      }
    } finally {
      functionHandle.dispose();
    }
  } catch (error) {
    abortController.abort();

    return {
      durationMs: Date.now() - startedAt,
      error: toExecuteError(error, deadline),
      logs: truncateLogs(logs, maxLogLines, maxLogChars),
      ok: false,
    };
  } finally {
    request.abortController?.abort();
    abortController.abort();
    context.dispose();
    runtime.dispose();
  }
}
