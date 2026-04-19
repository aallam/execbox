import { EventEmitter } from "node:events";

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExecuteResult } from "@execbox/core";

class FakeChildProcess extends EventEmitter {
  connected = true;

  kill = vi.fn(() => true);
  send = vi.fn();
}

const state = vi.hoisted(() => ({
  blockExecutions: false,
  blockedResolvers: [] as Array<() => void>,
  children: [] as FakeChildProcess[],
  results: [] as ExecuteResult[],
  sessions: [] as Array<{
    code: string;
    providersCount: number;
    transport: unknown;
  }>,
}));

vi.mock("node:child_process", () => ({
  fork: vi.fn(() => {
    const child = new FakeChildProcess();
    state.children.push(child);
    return child;
  }),
}));

vi.mock("@execbox/core/protocol", async (importOriginal) => {
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

describe("QuickJsExecutor process host pooling", () => {
  beforeEach(() => {
    state.blockExecutions = false;
    state.blockedResolvers = [];
    state.children = [];
    state.results = [];
    state.sessions = [];
  });

  it("reuses one child process for sequential executions by default", async () => {
    const { QuickJsExecutor } = await import("../src/index");
    const executor = new QuickJsExecutor({ host: "process" });

    await executor.execute("1 + 1", []);
    await executor.execute("1 + 1", []);

    expect(state.children).toHaveLength(1);
  });

  it("uses a fresh child process per execution in ephemeral mode", async () => {
    const { QuickJsExecutor } = await import("../src/index");
    const executor = new QuickJsExecutor({
      host: "process",
      mode: "ephemeral",
      pool: { maxSize: 1 },
    });

    await executor.execute("1 + 1", []);
    await executor.execute("1 + 1", []);

    expect(state.children).toHaveLength(2);
  });

  it("runs real warmup sessions before the first pooled execution", async () => {
    const { QuickJsExecutor } = await import("../src/index");
    const executor = new QuickJsExecutor({
      host: "process",
      pool: { maxSize: 2, prewarm: 2 },
    });

    await executor.execute("1 + 1", []);

    expect(state.children).toHaveLength(2);
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

  it("rejects failed explicit prewarm and evicts the broken child", async () => {
    const { QuickJsExecutor } = await import("../src/index");
    const executor = new QuickJsExecutor({
      host: "process",
      pool: { maxSize: 1 },
    });
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

    expect(state.children).toHaveLength(2);
    expect(state.sessions).toHaveLength(2);
    expect(state.sessions[0]?.code).toBe("undefined");
    expect(state.sessions[1]?.code).toBe("1 + 1");
  });

  it("evicts a pooled child after a timeout result", async () => {
    const { QuickJsExecutor } = await import("../src/index");
    const executor = new QuickJsExecutor({
      host: "process",
      pool: { maxSize: 1 },
    });
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
