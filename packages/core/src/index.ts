/**
 * @packageDocumentation
 * Public API for the `@execbox/core` package.
 */
export type { Executor, ExecutorPoolOptions } from "./executor/executor";
export {
  assertValidIdentifier,
  isReservedWord,
  isValidIdentifier,
  sanitizeIdentifier,
  serializePropertyName,
} from "./identifier";
export { sanitizeToolName } from "./sanitize";
export { ExecuteFailure, isExecuteFailure, isJsonSerializable } from "./errors";
export { resolveProvider } from "./provider/resolveProvider";
export { generateTypesFromJsonSchema } from "./typegen/jsonSchema";
export type {
  ExecutionOptions,
  ExecutorRuntimeOptions,
  ProviderManifest,
  ProviderToolManifest,
  ToolCall,
  ToolCallResult,
} from "./runner";
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
} from "./types";
