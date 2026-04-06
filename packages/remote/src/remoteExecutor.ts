import { randomUUID } from "node:crypto";

import {
  createResourcePool,
  runHostTransportSession,
  type HostTransport,
  type ExecutorRuntimeOptions,
  type ResourcePool,
} from "@execbox/protocol";
import {
  createTimeoutExecuteResult,
  type ExecutionOptions,
  type ExecutorPoolOptions,
  type ExecuteResult,
  type Executor,
  type ResolvedToolProvider,
} from "@execbox/core";

import type { RemoteExecutorOptions } from "./types";

const DEFAULT_CANCEL_GRACE_MS = 25;
const DEFAULT_MAX_LOG_CHARS = 64_000;
const DEFAULT_MAX_LOG_LINES = 100;
const DEFAULT_MEMORY_LIMIT_BYTES = 64 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 5000;

function createBorrowedTransport(transport: HostTransport): HostTransport {
  return {
    dispose() {},
    onClose: transport.onClose,
    onError: transport.onError,
    onMessage: transport.onMessage,
    send: transport.send,
    terminate: transport.terminate,
  };
}

function createRuntimeOptions(
  options: RemoteExecutorOptions,
  overrides: ExecutionOptions = {},
): Required<ExecutorRuntimeOptions> {
  return {
    maxLogChars:
      overrides.maxLogChars ?? options.maxLogChars ?? DEFAULT_MAX_LOG_CHARS,
    maxLogLines:
      overrides.maxLogLines ?? options.maxLogLines ?? DEFAULT_MAX_LOG_LINES,
    memoryLimitBytes:
      overrides.memoryLimitBytes ??
      options.memoryLimitBytes ??
      DEFAULT_MEMORY_LIMIT_BYTES,
    timeoutMs: overrides.timeoutMs ?? options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  };
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

function isReusableResult(result: ExecuteResult): boolean {
  return result.ok || !["internal_error", "timeout"].includes(result.error.code);
}

/**
 * Transport-backed executor that runs guest code outside the host process.
 */
export class RemoteExecutor implements Executor {
  private readonly cancelGraceMs: number;
  private readonly options: RemoteExecutorOptions;
  private readonly pool: ResourcePool<HostTransport> | undefined;
  private readonly warmup: Promise<void> | undefined;

  /**
   * Creates a transport-backed executor with caller-supplied remote connectivity.
   */
  constructor(options: RemoteExecutorOptions) {
    this.cancelGraceMs = options.cancelGraceMs ?? DEFAULT_CANCEL_GRACE_MS;
    this.options = options;
    if (options.pool) {
      this.pool = createResourcePool({
        create: async () => await this.options.connectTransport(),
        destroy: async (transport) => {
          await Promise.resolve(transport.terminate()).catch(() => {});
          await Promise.resolve(transport.dispose()).catch(() => {});
        },
        idleTimeoutMs: options.pool.idleTimeoutMs,
        maxSize: options.pool.maxSize,
        minSize: options.pool.minSize,
      });
      const prewarmCount = getPrewarmCount(options.pool);
      if (prewarmCount > 0) {
        this.warmup = this.pool.prewarm(prewarmCount);
      }
    }
  }

  /**
   * Disposes any pooled remote transports owned by this executor.
   */
  async dispose(): Promise<void> {
    await this.pool?.dispose();
  }

  /**
   * Preloads pooled remote transports when pooling is enabled.
   */
  async prewarm(count?: number): Promise<void> {
    await this.pool?.prewarm(count);
  }

  /**
   * Executes JavaScript against the provided tool namespaces over a remote transport.
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
    if (this.pool) {
      const lease = await this.pool.acquire();

      return await runHostTransportSession({
        cancelGraceMs: this.cancelGraceMs,
        code,
        executionId: randomUUID(),
        onSettled: async (result) => {
          await lease.release(isReusableResult(result));
        },
        providers,
        runtimeOptions: createRuntimeOptions(this.options, options),
        signal: options.signal,
        transport: createBorrowedTransport(lease.value),
      });
    }

    let transport: HostTransport;

    try {
      transport = await this.options.connectTransport();
    } catch (error) {
      return {
        durationMs: 0,
        error: {
          code: "internal_error",
          message: error instanceof Error ? error.message : String(error),
        },
        logs: [],
        ok: false,
      };
    }

    return await runHostTransportSession({
      cancelGraceMs: this.cancelGraceMs,
      code,
      executionId: randomUUID(),
      providers,
      runtimeOptions: createRuntimeOptions(this.options, options),
      signal: options.signal,
      transport,
    });
  }
}
