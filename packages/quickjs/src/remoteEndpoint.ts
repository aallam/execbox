/**
 * @packageDocumentation
 * QuickJS remote runner endpoint for `@execbox/remote` transports.
 */
import {
  isDispatcherMessage,
  type DispatcherMessage,
  type RunnerMessage,
  type TransportCloseReason,
} from "@execbox/core/protocol";

import { attachQuickJsProtocolEndpoint } from "./runner/protocolEndpoint.ts";

/**
 * Minimal runner-side port for transport-backed QuickJS execution.
 */
export interface QuickJsRemoteEndpointPort {
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
 * Attaches the shared QuickJS protocol endpoint to a remote runner transport
 * and tears it down automatically when the transport closes or errors.
 */
export function attachQuickJsRemoteEndpoint(
  port: QuickJsRemoteEndpointPort,
): () => void {
  const detachProtocol = attachQuickJsProtocolEndpoint({
    onMessage(handler: (message: DispatcherMessage) => void): () => void {
      const maybeDetach = port.onMessage((message: unknown) => {
        if (!isDispatcherMessage(message)) {
          return;
        }

        handler(message);
      });

      return () => {
        if (typeof maybeDetach === "function") {
          maybeDetach();
        }
      };
    },
    send(message: RunnerMessage): void {
      void Promise.resolve(port.send(message)).catch(() => {});
    },
  });

  const offClose = port.onClose?.(() => {
    cleanup();
  });
  const offError = port.onError?.(() => {
    cleanup();
  });

  function cleanup(): void {
    if (typeof offClose === "function") {
      offClose();
    }
    if (typeof offError === "function") {
      offError();
    }
    detachProtocol();
  }

  return cleanup;
}
