/**
 * @packageDocumentation
 * Internal reusable QuickJS session runner.
 */
import { randomUUID } from "node:crypto";

import {
  RELEASE_SYNC,
  isFail,
  memoizePromiseFactory,
  newQuickJSWASMModule,
  shouldInterruptAfterDeadline,
  type QuickJSWASMModule,
} from "quickjs-emscripten";

import {
  normalizeCode,
  resolveExecutorRuntimeOptions,
  truncateLogs,
} from "@execbox/core/runtime";
import type { ExecuteResult, ExecutorRuntimeOptions } from "@execbox/core";
import type {
  ProviderManifest,
  ToolCall,
  ToolCallResult,
} from "@execbox/core/runtime";

import { fromGuestHandle } from "../quickjsBridge.ts";
import type { QuickJsInlineExecutorOptions } from "../types.ts";
import { injectConsole, injectProviders } from "./guestEnvironment.ts";
import {
  errorFromGuestHandle,
  toExecuteError,
  waitForPromiseSettlement,
} from "./sessionErrors.ts";

export type {
  QuickJsExecutorHost,
  QuickJsExecutorOptions,
  QuickJsHostedMode,
  QuickJsInlineExecutorOptions,
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
