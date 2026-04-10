import { EventEmitter } from "node:events";

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExecuteResult } from "@execbox/core";

class FakeWorker extends EventEmitter {
  readonly terminate = vi.fn(async () => 0);
  readonly postMessage = vi.fn();
}

const state = vi.hoisted(() => ({
  blockExecutions: false,
  blockedResolvers: [] as Array<() => void>,
  parallelism: 1,
  results: [] as ExecuteResult[],
  sessions: [] as Array<{
    code: string;
    providersCount: number;
    transport: unknown;
  }>,
  workers: [] as FakeWorker[],
}));

function releaseBlockedExecutions(): void {
  const resolvers = [...state.blockedResolvers];
  state.blockedResolvers = [];
  state.blockExecutions = false;
  for (const resolve of resolvers) {
    resolve();
  }
}

async function waitForWorkers(expectedCount: number): Promise<void> {
  const deadline = Date.now() + 250;

  while (Date.now() < deadline) {
    if (state.workers.length === expectedCount) {
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 5);
    });
  }

  expect(state.workers).toHaveLength(expectedCount);
}

vi.mock("node:os", () => ({
  availableParallelism: vi.fn(() => state.parallelism),
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
      state.sessions.push({
        code: options.code,
        providersCount: options.providers.length,
        transport: options.transport,
      });
      if (state.blockExecutions) {
        await new Promise<void>((resolve) => {
          state.blockedResolvers.push(resolve);
        });
      }
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
    state.blockExecutions = false;
    state.blockedResolvers = [];
    state.parallelism = 1;
    state.results = [];
    state.sessions = [];
    state.workers = [];
  });

  it("reuses one worker for sequential executions by default", async () => {
    const { WorkerExecutor } = await import("../src/index");
    const executor = new WorkerExecutor();

    await executor.execute("1 + 1", []);
    await executor.execute("1 + 1", []);

    expect(state.workers).toHaveLength(1);
  });

  it("uses a CPU-aware default pooled size under concurrent load", async () => {
    const { WorkerExecutor } = await import("../src/index");
    state.blockExecutions = true;
    state.parallelism = 8;
    const executor = new WorkerExecutor();

    const executions = Array.from({ length: 5 }, () =>
      executor.execute("1 + 1", []),
    );

    await waitForWorkers(4);

    releaseBlockedExecutions();
    await Promise.all(executions);
  });

  it("uses a fresh worker per execution in ephemeral mode", async () => {
    const { WorkerExecutor } = await import("../src/index");
    const executor = new WorkerExecutor({
      mode: "ephemeral",
      pool: { maxSize: 1 },
    } as never);

    await executor.execute("1 + 1", []);
    await executor.execute("1 + 1", []);

    expect(state.workers).toHaveLength(2);
  });

  it("runs real warmup sessions before the first pooled execution", async () => {
    const { WorkerExecutor } = await import("../src/index");
    const executor = new WorkerExecutor({
      pool: { maxSize: 2, prewarm: 2 },
    } as never);

    await executor.execute("1 + 1", []);

    expect(state.workers).toHaveLength(2);
    expect(state.sessions).toHaveLength(3);
    expect(state.sessions[0]).toMatchObject({
      code: "undefined",
      providersCount: 0,
    });
    expect(state.sessions[1]).toMatchObject({
      code: "undefined",
      providersCount: 0,
    });
    expect(state.sessions[2]).toMatchObject({
      code: "1 + 1",
      providersCount: 0,
    });
  });

  it("rejects failed explicit prewarm and evicts the broken worker", async () => {
    const { WorkerExecutor } = await import("../src/index");
    const executor = new WorkerExecutor({
      pool: { maxSize: 1 },
    } as never);
    state.results = [
      {
        durationMs: 0,
        error: {
          code: "internal_error",
          message: "warmup failed",
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

    await expect(executor.prewarm(1)).rejects.toThrow("warmup failed");
    await executor.execute("1 + 1", []);

    expect(state.workers).toHaveLength(2);
    expect(state.sessions).toHaveLength(2);
    expect(state.sessions[0]?.code).toBe("undefined");
    expect(state.sessions[1]?.code).toBe("1 + 1");
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
