import type { DispatcherMessage, RunnerMessage } from "@execbox/protocol";

import { attachQuickJsProtocolEndpoint } from "./runner/protocolEndpoint.ts";

if (typeof process.send !== "function") {
  throw new Error(
    "QuickJsExecutor process host requires a child process IPC channel",
  );
}

attachQuickJsProtocolEndpoint({
  onMessage(handler: (message: DispatcherMessage) => void): () => void {
    process.on("message", handler);
    return () => process.off("message", handler);
  },
  send(message: RunnerMessage): void {
    process.send?.(message);
  },
});
