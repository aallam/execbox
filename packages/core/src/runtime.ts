/**
 * @packageDocumentation
 * Runtime implementer API for executor and runner authors.
 *
 * This entrypoint contains the shared helpers used by execbox runtime packages
 * to normalize execution limits, logs, manifests, thrown values, and tool-call
 * dispatch. Application code should usually import from `@execbox/core`
 * instead.
 */
export {
  createTimeoutExecuteResult,
  createExecutionContext,
  formatConsoleLine,
  getExecutionTimeoutMessage,
  isKnownExecuteErrorCode,
  normalizeThrownMessage,
  normalizeThrownName,
  truncateLogs,
} from "./executor/shared.ts";
export { normalizeCode } from "./normalize.ts";
export {
  ExecuteFailure,
  isExecuteFailure,
  isJsonSerializable,
} from "./errors.ts";
export {
  createToolCallDispatcher,
  extractProviderManifests,
} from "./runner.ts";
export {
  DEFAULT_EXECUTOR_RUNTIME_OPTIONS,
  resolveExecutorRuntimeOptions,
} from "./runtimeOptions.ts";
export type { ResolvedExecutorRuntimeOptions } from "./runtimeOptions.ts";
export type { Executor } from "./executor/executor.ts";
export type {
  ExecuteError,
  ExecuteErrorCode,
  ExecuteResult,
  JsonSchema,
  ResolvedToolDescriptor,
  ResolvedToolProvider,
  ToolDescriptor,
  ToolExecutionContext,
  ToolProvider,
  ToolSchema,
  TypegenToolDescriptor,
} from "./types.ts";
export type {
  ExecutionOptions,
  ExecutorRuntimeOptions,
  ProviderManifest,
  ProviderToolManifest,
  ToolCall,
  ToolCallResult,
} from "./runner.ts";
