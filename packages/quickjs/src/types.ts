import type { ExecutorPoolOptions, ExecutorRuntimeOptions } from "@execbox/core";

/**
 * Options for constructing a {@link QuickJsExecutor}.
 */
export interface QuickJsExecutorOptions extends ExecutorRuntimeOptions {
  /** Optional QuickJS module loader override for tests or custom builds. */
  loadModule?: () => Promise<unknown> | unknown;
  /** Optional host-side shell pooling controls. */
  pool?: ExecutorPoolOptions;
}
