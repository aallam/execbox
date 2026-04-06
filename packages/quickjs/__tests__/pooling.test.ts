import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  runCalls: [] as unknown[],
}));

vi.mock("../src/runner/index", () => ({
  runQuickJsSession: vi.fn(async (_request: unknown, options: unknown) => {
    state.runCalls.push(options);
    return {
      durationMs: 0,
      logs: [],
      ok: true,
      result: 2,
    };
  }),
}));

describe("QuickJsExecutor pooling", () => {
  beforeEach(() => {
    state.runCalls = [];
  });

  it("prewarms one pooled module and reuses it across executions", async () => {
    const loadModule = vi.fn(async () => ({ kind: "fake-module" }));
    const { QuickJsExecutor } = await import("../src/index");
    const executor = new QuickJsExecutor({
      loadModule,
      pool: { maxSize: 1 },
    } as never);

    await (executor as { prewarm(count?: number): Promise<void> }).prewarm(1);
    await executor.execute("1 + 1", []);
    await executor.execute("1 + 1", []);

    expect(loadModule).toHaveBeenCalledTimes(1);
    expect(state.runCalls).toEqual([
      expect.objectContaining({
        module: { kind: "fake-module" },
      }),
      expect.objectContaining({
        module: { kind: "fake-module" },
      }),
    ]);
  });
});
