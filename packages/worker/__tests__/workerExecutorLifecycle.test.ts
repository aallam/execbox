import { EventEmitter } from "node:events";

import { beforeEach, describe, expect, it, vi } from "vitest";

class FakeWorker extends EventEmitter {
  readonly postMessage = vi.fn();
  readonly terminate = vi.fn(async () => 0);
}

const state = vi.hoisted(() => ({
  autoExitOnStart: true,
  options: undefined as Record<string, unknown> | undefined,
  worker: undefined as FakeWorker | undefined,
}));

vi.mock("node:worker_threads", () => ({
  Worker: vi.fn((_filename: unknown, options?: Record<string, unknown>) => {
    const worker = new FakeWorker();
    state.options = options;
    state.worker = worker;
    if (state.autoExitOnStart) {
      queueMicrotask(() => {
        worker.emit("exit", 17);
      });
    }
    return worker;
  }),
}));

describe("WorkerExecutor lifecycle", () => {
  beforeEach(() => {
    state.autoExitOnStart = true;
    state.options = undefined;
    state.worker = undefined;
  });

  it("returns internal_error when the worker exits before sending a result", async () => {
    const { WorkerExecutor } = await import("../src/index");
    const executor = new WorkerExecutor();

    const result = await executor.execute("1 + 1", []);

    expect(result).toMatchObject({
      error: {
        code: "internal_error",
        message: "Worker exited unexpectedly with code 17",
      },
      ok: false,
    });
  });

  it("uses explicit source bootstrap conditions in repo source mode", async () => {
    const { WorkerExecutor } = await import("../src/index");
    const executor = new WorkerExecutor();

    await executor.execute("1 + 1", []);

    expect(state.options).toMatchObject({
      execArgv: expect.arrayContaining([
        "--conditions=source",
        "--import",
        "tsx",
      ]),
    });
  });

  it("terminates a silent worker only once when execution times out", async () => {
    vi.useFakeTimers();
    state.autoExitOnStart = false;
    const { WorkerExecutor } = await import("../src/index");
    const executor = new WorkerExecutor({
      cancelGraceMs: 0,
      timeoutMs: 10,
    });

    const resultPromise = executor.execute("while (true) {}", []);
    await vi.advanceTimersByTimeAsync(200);
    const result = await resultPromise;

    expect(result).toMatchObject({
      error: {
        code: "timeout",
      },
      ok: false,
    });
    expect(state.worker?.terminate).toHaveBeenCalledTimes(1);
  });

  it("does not create a worker when the caller signal is already aborted", async () => {
    const { WorkerExecutor } = await import("../src/index");
    const executor = new WorkerExecutor();
    const controller = new AbortController();
    controller.abort();

    const result = await executor.execute("1 + 1", [], {
      signal: controller.signal,
    });

    expect(result).toMatchObject({
      error: {
        code: "timeout",
      },
      ok: false,
    });
    expect(state.worker).toBeUndefined();
  });

  it("terminates a silent worker only once when the caller aborts", async () => {
    vi.useFakeTimers();
    state.autoExitOnStart = false;
    const { WorkerExecutor } = await import("../src/index");
    const executor = new WorkerExecutor({
      cancelGraceMs: 0,
      timeoutMs: 1_000,
    });
    const controller = new AbortController();

    const resultPromise = executor.execute("while (true) {}", [], {
      signal: controller.signal,
    });
    controller.abort();
    await vi.advanceTimersByTimeAsync(0);
    const result = await resultPromise;

    expect(result).toMatchObject({
      error: {
        code: "timeout",
      },
      ok: false,
    });
    expect(state.worker?.terminate).toHaveBeenCalledTimes(1);
  });
});
