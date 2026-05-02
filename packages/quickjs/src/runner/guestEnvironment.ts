import type { QuickJSContext, QuickJSHandle } from "quickjs-emscripten";

import {
  ExecuteFailure,
  formatConsoleLine,
  getExecutionTimeoutMessage,
  isExecuteFailure,
  normalizeThrownMessage,
} from "@execbox/core/runtime";
import type { ProviderManifest, ToolCallResult } from "@execbox/core/runtime";

import {
  createGuestErrorHandle,
  fromGuestHandle,
  toGuestHandle,
} from "../quickjsBridge.ts";
import type { QuickJsSessionRequest } from "./index.ts";

/**
 * Installs the bounded console capture surface into a QuickJS context.
 */
export function injectConsole(context: QuickJSContext, logs: string[]): void {
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

/**
 * Installs provider namespaces as guest-visible async tool proxies.
 */
export function injectProviders(
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
