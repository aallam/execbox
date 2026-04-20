/**
 * @packageDocumentation
 * Public API for the `@execbox/core/protocol` entrypoint.
 */
export { runHostTransportSession } from "./hostSession.ts";
export { getNodeTransportExecArgv } from "./nodeBootstrap.ts";
export { createResourcePool } from "./resourcePool.ts";
export type {
  CancelMessage,
  DispatcherMessage,
  DoneFailureMessage,
  DoneMessage,
  DoneSuccessMessage,
  ExecuteMessage,
  RunnerMessage,
  StartedMessage,
  ToolCallMessage,
  ToolResultMessage,
} from "./messages.ts";
export { isDispatcherMessage, isRunnerMessage } from "./messages.ts";
export type {
  HostTransport,
  HostTransportSessionOptions,
  TransportCloseReason,
} from "./hostSession.ts";
export type {
  ResourcePool,
  ResourcePoolLease,
  ResourcePoolOptions,
} from "./resourcePool.ts";
export type {
  ExecutorRuntimeOptions,
  ProviderManifest,
  ProviderToolManifest,
  ToolCall,
  ToolCallResult,
} from "../runner.ts";
export type {
  ExecuteError,
  ExecuteErrorCode,
  ExecuteResult,
  JsonSchema,
  ResolvedToolDescriptor,
  ResolvedToolProvider,
  ToolExecutionContext,
} from "../types.ts";
