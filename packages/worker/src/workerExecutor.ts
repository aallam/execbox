import { randomUUID } from "node:crypto";
import { Worker } from "node:worker_threads";

import {
  createResourcePool,
  type ExecutorRuntimeOptions,
  runHostTransportSession,
  getNodeTransportExecArgv,
  type HostTransport,
  type ResourcePool,
  type RunnerMessage,
} from "@execbox/protocol";
import {
  createTimeoutExecuteResult,
  type ExecutionOptions,
  type ExecutorPoolOptions,
  type ExecuteResult,
  type Executor,
  type ResolvedToolProvider,
} from "@execbox/core";

import type { WorkerExecutorOptions } from "./types";

const DEFAULT_CANCEL_GRACE_MS = 25;
const DEFAULT_MAX_LOG_CHARS = 64_000;
const DEFAULT_MAX_LOG_LINES = 100;
const DEFAULT_MEMORY_LIMIT_BYTES = 64 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 5000;

interface WorkerShell {
  transport: HostTransport;
  worker: Worker;
}

function resolveWorkerEntryUrl(): URL {
  const extension = import.meta.url.endsWith(".ts") ? ".ts" : ".js";
  return new URL(`./workerEntry${extension}`, import.meta.url);
}

function createRuntimeOptions(
  options: WorkerExecutorOptions,
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

function createWorkerTransport(worker: Worker): HostTransport {
  let terminated = false;

  const terminateWorker = async () => {
    if (terminated) {
      return;
    }

    terminated = true;
    await worker.terminate().catch(() => {});
  };

  return {
    dispose: async () => {
      await terminateWorker();
    },
    onClose: (handler) => {
      const wrapped = (code: number) => {
        handler({
          code,
          message: `Worker exited unexpectedly with code ${code}`,
        });
      };
      worker.on("exit", wrapped);
      return () => worker.off("exit", wrapped);
    },
    onError: (handler) => {
      worker.on("error", handler);
      return () => worker.off("error", handler);
    },
    onMessage: (handler) => {
      const wrapped = (message: unknown) => {
        handler(message as RunnerMessage);
      };
      worker.on("message", wrapped);
      return () => worker.off("message", wrapped);
    },
    send: (message) => {
      worker.postMessage(message);
    },
    terminate: async () => {
      await terminateWorker();
    },
  };
}

function createWorkerShell(options: WorkerExecutorOptions): WorkerShell {
  const worker = new Worker(resolveWorkerEntryUrl(), {
    execArgv: getNodeTransportExecArgv(import.meta.url),
    resourceLimits: options.workerResourceLimits,
  });

  return {
    transport: createWorkerTransport(worker),
    worker,
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
 * Worker-thread executor that runs guest code inside a dedicated QuickJS runtime per call.
 */
export class WorkerExecutor implements Executor {
  private readonly cancelGraceMs: number;
  private readonly options: WorkerExecutorOptions;
  private readonly pool: ResourcePool<WorkerShell> | undefined;
  private readonly warmup: Promise<void> | undefined;

  /**
   * Creates a worker-backed executor with hard-stop timeout behavior.
   */
  constructor(options: WorkerExecutorOptions = {}) {
    this.cancelGraceMs = options.cancelGraceMs ?? DEFAULT_CANCEL_GRACE_MS;
    this.options = options;
    if (options.pool) {
      this.pool = createResourcePool({
        create: async () => createWorkerShell(options),
        destroy: async (shell) => {
          await shell.transport.dispose();
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
   * Disposes any pooled worker shells owned by this executor.
   */
  async dispose(): Promise<void> {
    await this.pool?.dispose();
  }

  /**
   * Preloads pooled worker shells when pooling is enabled.
   */
  async prewarm(count?: number): Promise<void> {
    await this.pool?.prewarm(count);
  }

  /**
   * Executes JavaScript inside a fresh worker thread running QuickJS.
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
        transport: createBorrowedTransport(lease.value.transport),
      });
    }

    const worker = new Worker(resolveWorkerEntryUrl(), {
      execArgv: getNodeTransportExecArgv(import.meta.url),
      resourceLimits: this.options.workerResourceLimits,
    });

    return await runHostTransportSession({
      cancelGraceMs: this.cancelGraceMs,
      code,
      executionId: randomUUID(),
      providers,
      runtimeOptions: createRuntimeOptions(this.options, options),
      signal: options.signal,
      transport: createWorkerTransport(worker),
    });
  }
}
