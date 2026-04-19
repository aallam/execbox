/**
 * @packageDocumentation
 * Public API for the `@execbox/core/protocol` entrypoint.
 */
export { runHostTransportSession } from "./hostSession";
export { getNodeTransportExecArgv } from "./nodeBootstrap";
export { createResourcePool } from "./resourcePool";
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
} from "./messages";
export { isDispatcherMessage, isRunnerMessage } from "./messages";
export type {
  HostTransport,
  HostTransportSessionOptions,
  TransportCloseReason,
} from "./hostSession";
export type {
  ResourcePool,
  ResourcePoolLease,
  ResourcePoolOptions,
} from "./resourcePool";
export type {
  ExecutorRuntimeOptions,
  ProviderManifest,
  ProviderToolManifest,
  ToolCall,
  ToolCallResult,
} from "../runner";
export type {
  ExecuteError,
  ExecuteErrorCode,
  ExecuteResult,
  JsonSchema,
  ResolvedToolDescriptor,
  ResolvedToolProvider,
  ToolExecutionContext,
} from "../types";
