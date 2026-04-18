/**
 * @packageDocumentation
 * Public API for the `@execbox/protocol` package.
 */
export { createToolCallDispatcher } from "./dispatcher";
export { runHostTransportSession } from "./hostSession";
export { extractProviderManifests } from "./manifest";
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
} from "@execbox/core";
