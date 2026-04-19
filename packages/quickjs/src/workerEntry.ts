import { parentPort } from "node:worker_threads";

import type { DispatcherMessage, RunnerMessage } from "@execbox/core/protocol";

import { attachQuickJsProtocolEndpoint } from "./runner/protocolEndpoint.ts";

if (!parentPort) {
  throw new Error("QuickJsExecutor worker host requires a worker parent port");
}

const workerPort = parentPort;

attachQuickJsProtocolEndpoint({
  onMessage(handler: (message: DispatcherMessage) => void): () => void {
    workerPort.on("message", handler);
    return () => workerPort.off("message", handler);
  },
  send(message: RunnerMessage): void {
    workerPort.postMessage(message);
  },
});
