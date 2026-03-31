import { parentPort } from "node:worker_threads";

import { attachQuickJsProtocolEndpoint } from "@execbox/quickjs/runner/protocol-endpoint";
import type { DispatcherMessage, RunnerMessage } from "@execbox/protocol";

if (!parentPort) {
  throw new Error("WorkerExecutor requires a worker parent port");
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
