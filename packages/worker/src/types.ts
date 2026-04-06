import type { ExecutorPoolOptions } from "@execbox/core";

/** Supported host-side lifecycle modes for {@link WorkerExecutor}. */
export type WorkerExecutorMode = "pooled" | "ephemeral";

/**
 * Optional V8 heap limits used only as a backstop for worker thread safety.
 */
export interface WorkerResourceLimits {
  maxOldGenerationSizeMb?: number;
  maxYoungGenerationSizeMb?: number;
  stackSizeMb?: number;
}

/**
 * Options for constructing a {@link WorkerExecutor}.
 */
export interface WorkerExecutorOptions {
  /** Extra grace period after timeout before force-terminating the worker. */
  cancelGraceMs?: number;
  /** Maximum total characters preserved across captured log lines. */
  maxLogChars?: number;
  /** Maximum number of captured log lines returned in the result. */
  maxLogLines?: number;
  /** Guest memory limit in bytes enforced by QuickJS inside the worker. */
  memoryLimitBytes?: number;
  /** Host-side execution mode. Defaults to `pooled`. */
  mode?: WorkerExecutorMode;
  /** Optional host-side shell pooling controls used in pooled mode only. */
  pool?: ExecutorPoolOptions;
  /** Wall-clock execution timeout in milliseconds. */
  timeoutMs?: number;
  /** Optional Node worker heap limits used as a backstop only. */
  workerResourceLimits?: WorkerResourceLimits;
}
