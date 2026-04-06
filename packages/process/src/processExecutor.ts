import { randomUUID } from "node:crypto";
import { fork, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  createResourcePool,
  getNodeTransportExecArgv,
  runHostTransportSession,
  type HostTransport,
  type ExecutorRuntimeOptions,
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

import type { ProcessExecutorOptions } from "./types";

const DEFAULT_CANCEL_GRACE_MS = 25;
const DEFAULT_MAX_LOG_CHARS = 64_000;
const DEFAULT_MAX_LOG_LINES = 100;
const DEFAULT_MEMORY_LIMIT_BYTES = 64 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 5000;

interface ProcessShell {
  child: ChildProcess;
  transport: HostTransport;
}

function resolveProcessEntryPath(): string {
  const extension = import.meta.url.endsWith(".ts") ? ".ts" : ".js";
  return fileURLToPath(new URL(`./processEntry${extension}`, import.meta.url));
}

function createRuntimeOptions(
  options: ProcessExecutorOptions,
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

function createProcessShell(): ProcessShell {
  const child = createChildProcess();
  return {
    child,
    transport: createProcessTransport(child),
  };
}

function createProcessTransport(child: ChildProcess): HostTransport {
  let terminated = false;

  const terminateChild = () => {
    if (terminated) {
      return;
    }

    terminated = true;
    child.kill("SIGKILL");
  };

  return {
    dispose: () => {
      terminateChild();
    },
    onClose: (handler) => {
      const onDisconnect = () => {
        handler({
          message: "Child process disconnected unexpectedly",
        });
      };
      const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
        handler({
          code,
          message: createUnexpectedExitMessage(code, signal),
          signal,
        });
      };

      child.on("disconnect", onDisconnect);
      child.on("exit", onExit);
      return () => {
        child.off("disconnect", onDisconnect);
        child.off("exit", onExit);
      };
    },
    onError: (handler) => {
      child.on("error", handler);
      return () => child.off("error", handler);
    },
    onMessage: (handler) => {
      const wrapped = (message: unknown) => {
        handler(message as RunnerMessage);
      };
      child.on("message", wrapped);
      return () => child.off("message", wrapped);
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
 * Child-process executor that runs guest code inside a dedicated QuickJS runtime per call.
 */
export class ProcessExecutor implements Executor {
  private readonly cancelGraceMs: number;
  private readonly options: ProcessExecutorOptions;
  private readonly pool: ResourcePool<ProcessShell> | undefined;
  private readonly warmup: Promise<void> | undefined;

  /**
   * Creates a process-backed executor with hard-stop timeout behavior.
   */
  constructor(options: ProcessExecutorOptions = {}) {
    this.cancelGraceMs = options.cancelGraceMs ?? DEFAULT_CANCEL_GRACE_MS;
    this.options = options;
    if (options.pool) {
      this.pool = createResourcePool({
        create: async () => createProcessShell(),
        destroy: async (shell) => {
          shell.transport.dispose();
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
   * Disposes any pooled child-process shells owned by this executor.
   */
  async dispose(): Promise<void> {
    await this.pool?.dispose();
  }

  /**
   * Preloads pooled child-process shells when pooling is enabled.
   */
  async prewarm(count?: number): Promise<void> {
    await this.pool?.prewarm(count);
  }

  /**
   * Executes JavaScript inside a fresh child process running QuickJS.
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

    return await runHostTransportSession({
      cancelGraceMs: this.cancelGraceMs,
      code,
      executionId: randomUUID(),
      providers,
      runtimeOptions: createRuntimeOptions(this.options, options),
      signal: options.signal,
      transport: createProcessTransport(child),
    });
  }
}
