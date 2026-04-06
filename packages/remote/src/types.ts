import type { HostTransport, TransportCloseReason } from "@execbox/protocol";
import type { ExecutorPoolOptions, ExecutorRuntimeOptions } from "@execbox/core";

/**
 * Factory that creates a fresh transport connection for one remote execution.
 */
export type RemoteTransportFactory = () =>
  | HostTransport
  | Promise<HostTransport>;

/**
 * Minimal runner-side port for transport-backed QuickJS execution.
 */
export interface RemoteRunnerPort {
  onClose?(
    handler: (reason?: TransportCloseReason) => void,
  ): void | (() => void);
  onError?(handler: (error: Error) => void): void | (() => void);
  onMessage(handler: (message: unknown) => void): void | (() => void);
  send(message: unknown): void | Promise<void>;
}

/**
 * Options for constructing a {@link RemoteExecutor}.
 */
export interface RemoteExecutorOptions extends ExecutorRuntimeOptions {
  cancelGraceMs?: number;
  connectTransport: RemoteTransportFactory;
  pool?: ExecutorPoolOptions;
}
