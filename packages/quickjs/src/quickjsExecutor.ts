import {
  createTimeoutExecuteResult,
  createToolCallDispatcher,
  extractProviderManifests,
} from "@execbox/core/runtime";
import type {
  ExecutionOptions,
  ExecuteResult,
  Executor,
  ResolvedToolProvider,
} from "@execbox/core";

import { WorkerHostedQuickJsExecutor } from "./hosted/workerHostedExecutor.ts";
import { runQuickJsSession } from "./runner/index.ts";
import type {
  QuickJsExecutorOptions,
  QuickJsInlineExecutorOptions,
  QuickJsWorkerExecutorOptions,
} from "./types";

function isWorkerOptions(
  options: QuickJsExecutorOptions,
): options is QuickJsWorkerExecutorOptions {
  return options.host === "worker";
}

function getUnsupportedHost(
  options: QuickJsExecutorOptions,
): string | undefined {
  const host = (options as { host?: unknown }).host;
  if (host === undefined || host === "inline" || host === "worker") {
    return undefined;
  }

  return String(host);
}

/**
 * QuickJS-backed executor for inline or worker-backed JavaScript runs.
 */
export class QuickJsExecutor implements Executor {
  private readonly hostedExecutor: Executor | undefined;
  private readonly options: QuickJsInlineExecutorOptions | undefined;

  /**
   * Creates a QuickJS executor with inline QuickJS by default, or a hosted
   * worker shell when `host` is explicitly set.
   */
  constructor(options: QuickJsExecutorOptions = {}) {
    const unsupportedHost = getUnsupportedHost(options);
    if (unsupportedHost !== undefined) {
      throw new Error(
        `QuickJsExecutor host "${unsupportedHost}" is no longer supported. ` +
          'Use host "worker" for local hosted execution, or @execbox/remote ' +
          "for process, container, or VM boundaries.",
      );
    }

    if (isWorkerOptions(options)) {
      this.hostedExecutor = new WorkerHostedQuickJsExecutor(options);
      return;
    }

    this.options = options;
  }

  /**
   * Disposes any pooled hosted shells owned by this executor.
   */
  async dispose(): Promise<void> {
    await this.hostedExecutor?.dispose?.();
  }

  /**
   * Prewarms pooled hosted shells when the executor is running in worker mode.
   * Inline mode treats this as a no-op.
   */
  async prewarm(count?: number): Promise<void> {
    await this.hostedExecutor?.prewarm?.(count);
  }

  /**
   * Executes JavaScript against the provided tool namespaces in a fresh QuickJS runtime.
   */
  async execute(
    code: string,
    providers: ResolvedToolProvider[],
    options: ExecutionOptions = {},
  ): Promise<ExecuteResult> {
    if (this.hostedExecutor) {
      return await this.hostedExecutor.execute(code, providers, options);
    }

    if (options.signal?.aborted) {
      return createTimeoutExecuteResult();
    }

    const abortController = new AbortController();
    const onToolCall = createToolCallDispatcher(
      providers,
      abortController.signal,
    );
    const onAbort = () => {
      abortController.abort();
    };

    options.signal?.addEventListener("abort", onAbort, { once: true });

    try {
      return await runQuickJsSession(
        {
          abortController,
          code,
          onToolCall,
          providers: extractProviderManifests(providers),
        },
        {
          ...this.options,
          ...options,
        },
      );
    } finally {
      options.signal?.removeEventListener("abort", onAbort);
      abortController.abort();
    }
  }
}
