import { fork, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  createResourcePool,
  getNodeTransportExecArgv,
  type HostTransport,
  type ResourcePool,
  type RunnerMessage,
  type TransportCloseReason,
} from "@execbox/core/protocol";
import { createTimeoutExecuteResult } from "@execbox/core/_internal";
import type {
  ExecutionOptions,
  Executor,
  ExecutorPoolOptions,
  ExecuteResult,
  ResolvedToolProvider,
} from "@execbox/core";

import type { QuickJsProcessExecutorOptions } from "../types.ts";
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

interface ProcessShell {
  child: ChildProcess;
  transport: HostTransport;
}

function resolveProcessEntryPath(): string {
  const extension = import.meta.url.endsWith(".ts") ? ".ts" : ".js";
  return fileURLToPath(new URL(`../processEntry${extension}`, import.meta.url));
}

function createUnexpectedExitMessage(
  code: number | null,
  signal: NodeJS.Signals | null,
): string {
  if (code !== null) {
    return `Child process exited unexpectedly with code ${code}`;
  }

  if (signal) {
    return `Child process exited unexpectedly with signal ${signal}`;
  }

  return "Child process exited unexpectedly";
}

function createChildProcess(): ChildProcess {
  return fork(resolveProcessEntryPath(), [], {
    execArgv: getNodeTransportExecArgv(import.meta.url),
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  });
}

function createProcessTransport(child: ChildProcess): HostTransport {
  let terminated = false;
  let closeReason: TransportCloseReason | undefined;
  const closeHandlers = new Set<(reason?: TransportCloseReason) => void>();
  const errorHandlers = new Set<(error: Error) => void>();
  const messageHandlers = new Set<(message: RunnerMessage) => void>();

  const terminateChild = () => {
    if (terminated) {
      return;
    }

    terminated = true;
    child.kill("SIGKILL");
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

  const onDisconnect = () => {
    notifyClose({
      message: "Child process disconnected unexpectedly",
    });
  };
  const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
    notifyClose({
      code,
      message: createUnexpectedExitMessage(code, signal),
      signal,
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

  child.on("disconnect", onDisconnect);
  child.on("exit", onExit);
  child.on("error", onError);
  child.on("message", onMessage);

  return {
    dispose: () => {
      child.off("disconnect", onDisconnect);
      child.off("exit", onExit);
      child.off("error", onError);
      child.off("message", onMessage);
      terminateChild();
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
      return () => {
        closeHandlers.delete(handler);
      };
    },
    onError: (handler) => {
      errorHandlers.add(handler);
      return () => errorHandlers.delete(handler);
    },
    onMessage: (handler) => {
      messageHandlers.add(handler);
      return () => messageHandlers.delete(handler);
    },
    send: (message) =>
      new Promise<void>((resolve, reject) => {
        if (!child.connected || typeof child.send !== "function") {
          reject(new Error("Child process disconnected unexpectedly"));
          return;
        }

        child.send(message, (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
    terminate: () => {
      terminateChild();
    },
  };
}

function createProcessShell(): ProcessShell {
  const child = createChildProcess();
  return {
    child,
    transport: createProcessTransport(child),
  };
}

function resolvePoolOptions(
  options: QuickJsProcessExecutorOptions,
): ExecutorPoolOptions | undefined {
  if (options.mode === "ephemeral") {
    return undefined;
  }

  return {
    ...DEFAULT_POOL_OPTIONS,
    ...options.pool,
  };
}

/**
 * Child-process executor that runs guest code inside a dedicated QuickJS runtime per call.
 */
export class ProcessHostedQuickJsExecutor implements Executor {
  private readonly cancelGraceMs: number;
  private readonly options: QuickJsProcessExecutorOptions;
  private readonly pool: ResourcePool<ProcessShell> | undefined;
  private readonly poolOptions: ExecutorPoolOptions | undefined;
  private readonly warmup: Promise<void> | undefined;

  /**
   * Creates a hosted QuickJS executor that launches child-process shells on demand.
   */
  constructor(options: QuickJsProcessExecutorOptions) {
    this.cancelGraceMs = options.cancelGraceMs ?? DEFAULT_CANCEL_GRACE_MS;
    this.options = options;
    const poolOptions = resolvePoolOptions(options);
    this.poolOptions = poolOptions;

    if (poolOptions) {
      this.pool = createResourcePool({
        create: async () => createProcessShell(),
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
   * Disposes any pooled child-process shells owned by this executor.
   */
  async dispose(): Promise<void> {
    await this.pool?.dispose();
  }

  /**
   * Prewarms pooled child-process shells up to the requested count.
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
      value: ProcessShell;
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
      label: "child process",
      onRelease: async (lease, reusable) => await lease.release(reusable),
      runSession: async (transport, code, providers) =>
        await this.runTransportSession(transport, code, providers),
      shells: leases,
    });
  }

  /**
   * Executes guest code in a child-process-hosted QuickJS shell.
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

    let child: ChildProcess;

    try {
      child = createChildProcess();
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

    return await this.runTransportSession(
      createProcessTransport(child),
      code,
      providers,
      options,
    );
  }
}
