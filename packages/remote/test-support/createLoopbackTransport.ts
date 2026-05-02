import { attachQuickJsRemoteEndpoint } from "@execbox/quickjs/remote-endpoint";
import type {
  DispatcherMessage,
  HostTransport,
  RunnerMessage,
  TransportCloseReason,
} from "@execbox/core/protocol";

type CloseHandler = (reason?: TransportCloseReason) => void;
type ErrorHandler = (error: Error) => void;
type MessageHandler = (message: RunnerMessage) => void;
type RunnerMessageHandler = (message: DispatcherMessage) => void;

export function createLoopbackTransport(): HostTransport {
  const closeHandlers = new Set<CloseHandler>();
  const errorHandlers = new Set<ErrorHandler>();
  const messageHandlers = new Set<MessageHandler>();
  const runnerHandlers = new Set<RunnerMessageHandler>();
  let closed = false;

  const emitClose = (reason?: TransportCloseReason) => {
    closed = true;
    for (const handler of closeHandlers) {
      handler(reason);
    }
  };

  attachQuickJsRemoteEndpoint({
    onMessage(handler) {
      const runnerHandler = handler as RunnerMessageHandler;
      runnerHandlers.add(runnerHandler);
      return () => runnerHandlers.delete(runnerHandler);
    },
    send(message) {
      queueMicrotask(() => {
        for (const handler of messageHandlers) {
          handler(message as RunnerMessage);
        }
      });
    },
  });

  return {
    dispose() {
      closed = true;
    },
    onClose(handler) {
      closeHandlers.add(handler);
      return () => closeHandlers.delete(handler);
    },
    onError(handler) {
      errorHandlers.add(handler);
      return () => errorHandlers.delete(handler);
    },
    onMessage(handler) {
      messageHandlers.add(handler);
      return () => messageHandlers.delete(handler);
    },
    send(message) {
      if (closed) {
        for (const handler of errorHandlers) {
          handler(new Error("Remote transport closed"));
        }
        return;
      }

      queueMicrotask(() => {
        for (const handler of runnerHandlers) {
          handler(message);
        }
      });
    },
    terminate() {
      emitClose({ message: "Remote transport terminated" });
    },
  };
}
