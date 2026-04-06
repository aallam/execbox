import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ExecuteResult } from "@execbox/core";
import type { HostTransport } from "@execbox/protocol";

const state = vi.hoisted(() => ({
  results: [] as ExecuteResult[],
  transports: [] as HostTransport[],
}));

vi.mock("@execbox/protocol", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;

  return {
    ...actual,
    runHostTransportSession: vi.fn(async (options) => {
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

describe("RemoteExecutor pooling", () => {
  beforeEach(() => {
    state.results = [];
    state.transports = [];
  });

  it("reuses one connected transport for sequential pooled executions", async () => {
    const { RemoteExecutor } = await import("../src/index");
    const connectTransport = vi.fn(async () => {
      const transport: HostTransport = {
        dispose() {},
        onClose() {
          return () => {};
        },
        onError() {
          return () => {};
        },
        onMessage() {
          return () => {};
        },
        send() {},
        terminate() {},
      };
      state.transports.push(transport);
      return transport;
    });
    const executor = new RemoteExecutor({
      connectTransport,
      pool: { maxSize: 1 },
    } as never);

    await executor.execute("1 + 1", []);
    await executor.execute("1 + 1", []);

    expect(connectTransport).toHaveBeenCalledTimes(1);
    expect(state.transports).toHaveLength(1);
  });

  it("evicts a pooled transport after a timeout result", async () => {
    const { RemoteExecutor } = await import("../src/index");
    const connectTransport = vi.fn(async () => {
      const transport: HostTransport = {
        dispose() {},
        onClose() {
          return () => {};
        },
        onError() {
          return () => {};
        },
        onMessage() {
          return () => {};
        },
        send() {},
        terminate() {},
      };
      state.transports.push(transport);
      return transport;
    });
    const executor = new RemoteExecutor({
      connectTransport,
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

    expect(connectTransport).toHaveBeenCalledTimes(2);
    expect(state.transports).toHaveLength(2);
  });
});
