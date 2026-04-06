import { EventEmitter } from "node:events";

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExecuteResult } from "@execbox/core";

class FakeWorker extends EventEmitter {
  readonly terminate = vi.fn(async () => 0);
  readonly postMessage = vi.fn();
}

const state = vi.hoisted(() => ({
  results: [] as ExecuteResult[],
  transports: [] as unknown[],
  workers: [] as FakeWorker[],
}));

vi.mock("node:worker_threads", () => ({
  Worker: vi.fn(() => {
    const worker = new FakeWorker();
    state.workers.push(worker);
    return worker;
  }),
}));

vi.mock("@execbox/protocol", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;

  return {
    ...actual,
    getNodeTransportExecArgv: vi.fn(() => []),
    runHostTransportSession: vi.fn(async (options) => {
      state.transports.push(options.transport);
      const result = state.results.shift() ?? {
        durationMs: 0,
        logs: [],
        ok: true,
        result: 1,
      };
      await Promise.resolve(options.onSettled?.(result));
      await Promise.resolve(options.transport.dispose());
      return result;
    }),
  };
});

describe("WorkerExecutor pooling", () => {
  beforeEach(() => {
    state.results = [];
    state.transports = [];
    state.workers = [];
  });

  it("reuses one worker for sequential pooled executions", async () => {
    const { WorkerExecutor } = await import("../src/index");
    const executor = new WorkerExecutor({
      pool: { maxSize: 1 },
    } as never);

    await executor.execute("1 + 1", []);
    await executor.execute("1 + 1", []);

    expect(state.workers).toHaveLength(1);
  });

  it("evicts a pooled worker after a timeout result", async () => {
    const { WorkerExecutor } = await import("../src/index");
    const executor = new WorkerExecutor({
      pool: { maxSize: 1 },
    } as never);
    state.results = [
      {
        durationMs: 0,
        error: {
          code: "timeout",
          message: "Execution timed out",
        },
        logs: [],
        ok: false,
      },
      {
        durationMs: 0,
        logs: [],
        ok: true,
        result: 1,
      },
    ];

    await executor.execute("1 + 1", []);
    await executor.execute("1 + 1", []);

    expect(state.workers).toHaveLength(2);
  });
});
