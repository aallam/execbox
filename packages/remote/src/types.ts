import type { ExecutorRuntimeOptions } from "@execbox/core";
import type {
  HostTransport,
  TransportCloseReason,
} from "@execbox/core/protocol";

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
  /** Registers a close callback for transport shutdown notifications. */
  onClose?(
    handler: (reason?: TransportCloseReason) => void,
  ): void | (() => void);

  /** Registers an error callback for transport-level failures. */
  onError?(handler: (error: Error) => void): void | (() => void);

  /** Registers a handler for inbound runner messages. */
  onMessage(handler: (message: unknown) => void): void | (() => void);

  /** Sends a transport message to the attached host session. */
  send(message: unknown): void | Promise<void>;
}

/**
 * Options for constructing a {@link RemoteExecutor}.
 */
export interface RemoteExecutorOptions extends ExecutorRuntimeOptions {
  /** Time to wait before forcefully tearing down a hung remote session. */
  cancelGraceMs?: number;

  /** Factory that establishes one fresh transport for an execution. */
  connectTransport: RemoteTransportFactory;
}
