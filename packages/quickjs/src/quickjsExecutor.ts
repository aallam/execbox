import {
  createTimeoutExecuteResult,
  createToolCallDispatcher,
  extractProviderManifests,
  type ExecutionOptions,
  type ExecutorPoolOptions,
  type ExecuteResult,
  type Executor,
  type ResolvedToolProvider,
} from "@execbox/core";
import { createResourcePool, type ResourcePool } from "@execbox/protocol";
import type { QuickJSWASMModule } from "quickjs-emscripten";

import { runQuickJsSession } from "./runner/index";
import type { QuickJsExecutorOptions } from "./types";

interface QuickJsShell {
  module: QuickJSWASMModule | undefined;
}

function getPrewarmCount(pool: ExecutorPoolOptions | undefined): number {
  if (!pool?.prewarm) {
    return 0;
  }

  if (typeof pool.prewarm === "number") {
    return Math.max(0, Math.min(pool.prewarm, pool.maxSize));
  }

  return Math.max(1, Math.min(pool.minSize ?? 1, pool.maxSize));
}

/**
 * QuickJS-backed executor for one-shot sandboxed JavaScript runs.
 */
export class QuickJsExecutor implements Executor {
  private readonly options: QuickJsExecutorOptions;
  private readonly pool: ResourcePool<QuickJsShell> | undefined;
  private readonly warmup: Promise<void> | undefined;

  /**
   * Creates a QuickJS executor with one-shot runtime limits and host bridging configuration.
   */
  constructor(options: QuickJsExecutorOptions = {}) {
    this.options = options;
    if (options.pool) {
      const pool = createResourcePool<QuickJsShell>({
        create: async () => ({
          module: options.loadModule
            ? ((await options.loadModule()) as QuickJSWASMModule)
            : undefined,
        }),
        destroy: async () => {},
        idleTimeoutMs: options.pool.idleTimeoutMs,
        maxSize: options.pool.maxSize,
        minSize: options.pool.minSize,
      });
      this.pool = pool;
      const prewarmCount = getPrewarmCount(options.pool);
      if (prewarmCount > 0) {
        this.warmup = pool.prewarm(prewarmCount);
      }
    }
  }

  /**
   * Disposes any pooled QuickJS shells owned by this executor.
   */
  async dispose(): Promise<void> {
    await this.pool?.dispose();
  }

  /**
   * Preloads pooled QuickJS shells when pooling is enabled.
   */
  async prewarm(count?: number): Promise<void> {
    if (this.pool) {
      await this.pool.prewarm(count);
      return;
    }

    if (this.options.loadModule) {
      await this.options.loadModule();
    }
  }

  /**
   * Executes JavaScript against the provided tool namespaces in a fresh QuickJS runtime.
   */
  async execute(
    code: string,
    providers: ResolvedToolProvider[],
    options: ExecutionOptions = {},
  ): Promise<ExecuteResult> {
    if (options.signal?.aborted) {
      return createTimeoutExecuteResult();
    }

    await this.warmup;
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
      const lease = this.pool ? await this.pool.acquire() : undefined;

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
          module: lease?.value.module,
          ...options,
        },
      );
      } finally {
        await lease?.release();
      }
    } finally {
      options.signal?.removeEventListener("abort", onAbort);
      abortController.abort();
    }
  }
}
