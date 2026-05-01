import { availableParallelism } from "node:os";
import { Worker } from "node:worker_threads";

import {
  createResourcePool,
  getNodeTransportExecArgv,
  type HostTransport,
  type ResourcePool,
  type RunnerMessage,
  type TransportCloseReason,
} from "@execbox/core/protocol";
import { createTimeoutExecuteResult } from "@execbox/core/runtime";
import type {
  ExecutionOptions,
  Executor,
  ExecutorPoolOptions,
  ExecuteResult,
  ResolvedToolProvider,
} from "@execbox/core";

import type { QuickJsWorkerExecutorOptions } from "../types.ts";
import {
  DEFAULT_CANCEL_GRACE_MS,
  DEFAULT_POOL_OPTIONS,
  createBorrowedTransport,
  getPrewarmCount,
  getWarmupTarget,
  isReusableResult,
  runHostedTransportSession,
  warmHostedPool,
} from "./shared.ts";

const DEFAULT_POOLED_WORKER_MAX_SIZE = 4;

interface WorkerShell {
  transport: HostTransport;
  worker: Worker;
}

function resolveWorkerEntryUrl(): URL {
  const extension = import.meta.url.endsWith(".ts") ? ".ts" : ".js";
  return new URL(`../workerEntry${extension}`, import.meta.url);
}

function createWorkerTransport(worker: Worker): HostTransport {
  let terminated = false;
  let closeReason: TransportCloseReason | undefined;
  const closeHandlers = new Set<(reason?: TransportCloseReason) => void>();
  const errorHandlers = new Set<(error: Error) => void>();
  const messageHandlers = new Set<(message: RunnerMessage) => void>();

  const terminateWorker = async () => {
    if (terminated) {
      return;
    }

    terminated = true;
    await worker.terminate().catch(() => {});
  };

  const notifyClose = (reason: TransportCloseReason) => {
    if (closeReason) {
      return;
    }

    closeReason = reason;
    for (const handler of closeHandlers) {
      handler(reason);
    }
  };

  const onExit = (code: number) => {
    notifyClose({
      code,
      message: `Worker exited unexpectedly with code ${code}`,
    });
  };
  const onError = (error: Error) => {
    for (const handler of errorHandlers) {
      handler(error);
    }
  };
  const onMessage = (message: unknown) => {
    for (const handler of messageHandlers) {
      handler(message as RunnerMessage);
    }
  };

  worker.on("exit", onExit);
  worker.on("error", onError);
  worker.on("message", onMessage);

  return {
    dispose: async () => {
      worker.off("exit", onExit);
      worker.off("error", onError);
      worker.off("message", onMessage);
      await terminateWorker();
    },
    onClose: (handler) => {
      closeHandlers.add(handler);
      if (closeReason) {
        queueMicrotask(() => {
          if (closeHandlers.has(handler)) {
            handler(closeReason);
          }
        });
      }
      return () => closeHandlers.delete(handler);
    },
    onError: (handler) => {
      errorHandlers.add(handler);
      return () => errorHandlers.delete(handler);
    },
    onMessage: (handler) => {
      messageHandlers.add(handler);
      return () => messageHandlers.delete(handler);
    },
    send: (message) => {
      worker.postMessage(message);
    },
    terminate: async () => {
      await terminateWorker();
    },
  };
}

function createWorkerShell(options: QuickJsWorkerExecutorOptions): WorkerShell {
  const worker = new Worker(resolveWorkerEntryUrl(), {
    execArgv: getNodeTransportExecArgv(import.meta.url),
    resourceLimits: options.workerResourceLimits,
  });

  return {
    transport: createWorkerTransport(worker),
    worker,
  };
}

function getDefaultPoolMaxSize(): number {
  try {
    return Math.max(
      1,
      Math.min(availableParallelism(), DEFAULT_POOLED_WORKER_MAX_SIZE),
    );
  } catch {
    return 1;
  }
}

function resolvePoolOptions(
  options: QuickJsWorkerExecutorOptions,
): ExecutorPoolOptions | undefined {
  if (options.mode === "ephemeral") {
    return undefined;
  }

  return {
    ...DEFAULT_POOL_OPTIONS,
    maxSize: getDefaultPoolMaxSize(),
    ...options.pool,
  };
}

/**
 * Worker-thread executor that runs guest code inside a dedicated QuickJS runtime per call.
 */
export class WorkerHostedQuickJsExecutor implements Executor {
  private readonly cancelGraceMs: number;
  private readonly options: QuickJsWorkerExecutorOptions;
  private readonly pool: ResourcePool<WorkerShell> | undefined;
  private readonly poolOptions: ExecutorPoolOptions | undefined;
  private readonly warmup: Promise<void> | undefined;

  /**
   * Creates a QuickJS executor that launches worker-thread shells on demand.
   */
  constructor(options: QuickJsWorkerExecutorOptions) {
    this.cancelGraceMs = options.cancelGraceMs ?? DEFAULT_CANCEL_GRACE_MS;
    this.options = options;
    const poolOptions = resolvePoolOptions(options);
    this.poolOptions = poolOptions;

    if (poolOptions) {
      this.pool = createResourcePool({
        create: async () => createWorkerShell(options),
        destroy: async (shell) => {
          await shell.transport.dispose();
        },
        idleTimeoutMs: poolOptions.idleTimeoutMs,
        maxSize: poolOptions.maxSize,
        minSize: poolOptions.minSize,
      });
      const prewarmCount = getPrewarmCount(poolOptions);
      if (prewarmCount > 0) {
        this.warmup = this.warmPool(prewarmCount);
      }
    }
  }

  /**
   * Disposes any pooled worker-thread shells owned by this executor.
   */
  async dispose(): Promise<void> {
    await this.pool?.dispose();
  }

  /**
   * Prewarms pooled worker-thread shells up to the requested count.
   */
  async prewarm(count?: number): Promise<void> {
    if (!this.pool || !this.poolOptions) {
      return;
    }

    const target = getWarmupTarget(count, this.poolOptions);
    if (target <= 0) {
      return;
    }

    await this.warmPool(target);
  }

  private async runTransportSession(
    transport: HostTransport,
    code: string,
    providers: ResolvedToolProvider[],
    options: ExecutionOptions = {},
    onSettled?: (result: ExecuteResult) => Promise<void> | void,
  ): Promise<ExecuteResult> {
    return await runHostedTransportSession({
      cancelGraceMs: this.cancelGraceMs,
      code,
      executorOptions: this.options,
      onSettled,
      providers,
      requestOptions: options,
      transport,
    });
  }

  private async warmPool(count: number): Promise<void> {
    if (!this.pool) {
      return;
    }

    await this.pool.prewarm(count);

    const leases: Array<{
      release: (reusable: boolean) => Promise<void>;
      value: WorkerShell;
    }> = [];
    try {
      for (let index = 0; index < count; index += 1) {
        leases.push(await this.pool.acquire());
      }
    } catch (error) {
      await Promise.allSettled(
        leases.map(async (lease) => await lease.release(false)),
      );
      throw error;
    }

    await warmHostedPool({
      count,
      getTransport: (lease) => lease.value.transport,
      label: "worker shell",
      onRelease: async (lease, reusable) => await lease.release(reusable),
      runSession: async (transport, code, providers) =>
        await this.runTransportSession(transport, code, providers),
      shells: leases,
    });
  }

  /**
   * Executes guest code in a worker-thread-hosted QuickJS shell.
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

      return await this.runTransportSession(
        createBorrowedTransport(lease.value.transport),
        code,
        providers,
        options,
        async (result) => {
          await lease.release(isReusableResult(result));
        },
      );
    }

    const worker = new Worker(resolveWorkerEntryUrl(), {
      execArgv: getNodeTransportExecArgv(import.meta.url),
      resourceLimits: this.options.workerResourceLimits,
    });

    return await this.runTransportSession(
      createWorkerTransport(worker),
      code,
      providers,
      options,
    );
  }
}
