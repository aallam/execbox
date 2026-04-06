import { EventEmitter } from "node:events";

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExecuteResult } from "@execbox/core";

class FakeChildProcess extends EventEmitter {
  connected = true;

  kill = vi.fn(() => true);
  send = vi.fn();
}

const state = vi.hoisted(() => ({
  children: [] as FakeChildProcess[],
  results: [] as ExecuteResult[],
  transports: [] as unknown[],
}));

vi.mock("node:child_process", () => ({
  fork: vi.fn(() => {
    const child = new FakeChildProcess();
    state.children.push(child);
    return child;
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

describe("ProcessExecutor pooling", () => {
  beforeEach(() => {
    state.children = [];
    state.results = [];
    state.transports = [];
  });

  it("reuses one child process for sequential executions by default", async () => {
    const { ProcessExecutor } = await import("../src/index");
    const executor = new ProcessExecutor();

    await executor.execute("1 + 1", []);
    await executor.execute("1 + 1", []);

    expect(state.children).toHaveLength(1);
  });

  it("uses a fresh child process per execution in ephemeral mode", async () => {
    const { ProcessExecutor } = await import("../src/index");
    const executor = new ProcessExecutor({
      mode: "ephemeral",
      pool: { maxSize: 1 },
    } as never);

    await executor.execute("1 + 1", []);
    await executor.execute("1 + 1", []);

    expect(state.children).toHaveLength(2);
  });

  it("evicts a pooled child after a timeout result", async () => {
    const { ProcessExecutor } = await import("../src/index");
    const executor = new ProcessExecutor({
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

    expect(state.children).toHaveLength(2);
  });
});
