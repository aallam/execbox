import type { ExecutorRuntimeOptions } from "@execbox/core";
import type { HostTransport } from "@execbox/core/protocol";

/**
 * Factory that creates a fresh transport connection for one remote execution.
 */
export type RemoteTransportFactory = () =>
  | HostTransport
  | Promise<HostTransport>;

/**
 * Options for constructing a {@link RemoteExecutor}.
 */
export interface RemoteExecutorOptions extends ExecutorRuntimeOptions {
  /** Time to wait before forcefully tearing down a hung remote session. */
  cancelGraceMs?: number;

  /** Factory that establishes one fresh transport for an execution. */
  connectTransport: RemoteTransportFactory;
}
