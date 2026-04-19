import type {
  ExecutorPoolOptions,
  ExecutorRuntimeOptions,
} from "@execbox/core";

/**
 * Host boundary options available to the QuickJS executor.
 */
export type QuickJsExecutorHost = "inline" | "worker" | "process";

/**
 * Lifecycle modes for hosted QuickJS shells.
 */
export type QuickJsHostedMode = "pooled" | "ephemeral";

/**
 * Optional V8 heap limits used only as a backstop for worker thread safety.
 */
export interface WorkerResourceLimits {
  /** Maximum size of the old generation heap in megabytes. */
  maxOldGenerationSizeMb?: number;
  /** Maximum size of the young generation heap in megabytes. */
  maxYoungGenerationSizeMb?: number;
  /** Maximum V8 stack size in megabytes. */
  stackSizeMb?: number;
}

/**
 * Options for constructing an inline QuickJS executor.
 */
export interface QuickJsInlineExecutorOptions extends ExecutorRuntimeOptions {
  /** Uses inline QuickJS execution inside the current process. */
  host?: "inline";

  /** Optional QuickJS module loader override for tests or custom builds. */
  loadModule?: () => Promise<unknown> | unknown;
}

/**
 * Options for constructing a worker-backed QuickJS executor.
 */
export interface QuickJsWorkerExecutorOptions extends ExecutorRuntimeOptions {
  /** Uses a worker thread to host each QuickJS runtime. */
  host: "worker";

  /** Time to wait before forcefully tearing down a hung hosted shell. */
  cancelGraceMs?: number;

  /** Whether to reuse hosted shells or spawn a fresh one per execution. */
  mode?: QuickJsHostedMode;

  /** Pool sizing and idle-eviction settings for pooled hosted shells. */
  pool?: ExecutorPoolOptions;

  /** Optional worker thread V8 limits used as a coarse safety backstop. */
  workerResourceLimits?: WorkerResourceLimits;
}

/**
 * Options for constructing a process-backed QuickJS executor.
 */
export interface QuickJsProcessExecutorOptions extends ExecutorRuntimeOptions {
  /** Uses a child process to host each QuickJS runtime. */
  host: "process";

  /** Time to wait before forcefully tearing down a hung hosted shell. */
  cancelGraceMs?: number;

  /** Whether to reuse hosted shells or spawn a fresh one per execution. */
  mode?: QuickJsHostedMode;

  /** Pool sizing and idle-eviction settings for pooled hosted shells. */
  pool?: ExecutorPoolOptions;
}

/**
 * Options for constructing a QuickJS executor.
 */
export type QuickJsExecutorOptions =
  | QuickJsInlineExecutorOptions
  | QuickJsWorkerExecutorOptions
  | QuickJsProcessExecutorOptions;
