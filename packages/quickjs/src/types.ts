import type { ExecutorRuntimeOptions } from "@execbox/core";

/**
 * Options for constructing a QuickJS executor.
 */
export interface QuickJsExecutorOptions extends ExecutorRuntimeOptions {
  /** Optional QuickJS module loader override for tests or custom builds. */
  loadModule?: () => Promise<unknown> | unknown;
}
