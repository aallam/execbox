import type { ExecutorPoolOptions } from "@execbox/core";

/** Supported host-side lifecycle modes for {@link ProcessExecutor}. */
export type ProcessExecutorMode = "pooled" | "ephemeral";

/**
 * Options for constructing a {@link ProcessExecutor}.
 */
export interface ProcessExecutorOptions {
  /** Extra grace period after timeout before force-killing the child process. */
  cancelGraceMs?: number;
  /** Maximum total characters preserved across captured log lines. */
  maxLogChars?: number;
  /** Maximum number of captured log lines returned in the result. */
  maxLogLines?: number;
  /** Guest memory limit in bytes enforced by QuickJS inside the child process. */
  memoryLimitBytes?: number;
  /** Host-side execution mode. Defaults to `pooled`. */
  mode?: ProcessExecutorMode;
  /** Optional host-side shell pooling controls used in pooled mode only. */
  pool?: ExecutorPoolOptions;
  /** Wall-clock execution timeout in milliseconds. */
  timeoutMs?: number;
}
