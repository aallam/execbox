import type { ExecutionOptions } from "../runner";
import type { ExecuteResult, ResolvedToolProvider } from "../types";

/**
 * Optional pooling controls for executor implementations that can reuse
 * host-side shells while still creating a fresh guest runtime per execution.
 */
export interface ExecutorPoolOptions {
  idleTimeoutMs?: number;
  maxSize: number;
  minSize?: number;
  prewarm?: boolean | number;
}

/**
 * Executes JavaScript against one or more resolved tool providers.
 */
export interface Executor {
  execute(
    code: string,
    providers: ResolvedToolProvider[],
    options?: ExecutionOptions,
  ): Promise<ExecuteResult>;
  dispose?(): Promise<void> | void;
  prewarm?(count?: number): Promise<void>;
}
