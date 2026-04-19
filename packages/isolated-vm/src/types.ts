import type { ExecutorRuntimeOptions } from "@execbox/core";

/**
 * Options for constructing an isolated-vm executor.
 */
export interface IsolatedVmExecutorOptions extends ExecutorRuntimeOptions {
  /** Optional isolated-vm module loader override for tests or custom builds. */
  loadModule?: () => Promise<unknown> | unknown;
}
