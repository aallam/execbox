import { EventEmitter } from "node:events";

import { beforeEach, describe, expect, it, vi } from "vitest";

class FakeChildProcess extends EventEmitter {
  connected = true;

  kill = vi.fn(() => true);
  send = vi.fn();

  disconnect(): void {
    this.connected = false;
    this.emit("disconnect");
  }
}

const state = vi.hoisted(() => ({
  autoExitOnStart: true,
  child: undefined as FakeChildProcess | undefined,
  options: undefined as Record<string, unknown> | undefined,
}));

vi.mock("node:child_process", () => ({
  fork: vi.fn(
    (_path: string, _args: string[], options?: Record<string, unknown>) => {
      const child = new FakeChildProcess();
      state.options = options;
      state.child = child;
      if (state.autoExitOnStart) {
        queueMicrotask(() => {
          child.emit("exit", 17, null);
        });
      }
      return child;
    },
  ),
}));

describe("QuickJsExecutor process host lifecycle", () => {
  beforeEach(() => {
    state.autoExitOnStart = true;
    state.child = undefined;
    state.options = undefined;
  });

  it("returns internal_error when the child exits before sending a result", async () => {
    const { QuickJsExecutor } = await import("../src/index");
    const executor = new QuickJsExecutor({ host: "process" });

    const result = await executor.execute("1 + 1", []);

    expect(result).toMatchObject({
      error: {
        code: "internal_error",
        message: "Child process exited unexpectedly with code 17",
      },
      ok: false,
    });
  });

  it("uses explicit source bootstrap conditions in repo source mode", async () => {
    const { QuickJsExecutor } = await import("../src/index");
    const executor = new QuickJsExecutor({ host: "process" });

    await executor.execute("1 + 1", []);

    expect(state.options).toMatchObject({
      execArgv: expect.arrayContaining([
        "--conditions=source",
        "--import",
        "tsx",
      ]),
    });
  });

  it("force-kills a silent child process only once when execution times out", async () => {
    vi.useFakeTimers();
    state.autoExitOnStart = false;
    const { QuickJsExecutor } = await import("../src/index");
    const executor = new QuickJsExecutor({
      host: "process",
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
    expect(state.child?.kill).toHaveBeenCalledTimes(1);
    expect(state.child?.kill).toHaveBeenCalledWith("SIGKILL");
  });

  it("does not create a child process when the caller signal is already aborted", async () => {
    const { QuickJsExecutor } = await import("../src/index");
    const executor = new QuickJsExecutor({ host: "process" });
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
    expect(state.child).toBeUndefined();
  });

  it("force-kills a silent child process only once when the caller aborts", async () => {
    vi.useFakeTimers();
    state.autoExitOnStart = false;
    const { QuickJsExecutor } = await import("../src/index");
    const executor = new QuickJsExecutor({
      host: "process",
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
    expect(state.child?.kill).toHaveBeenCalledTimes(1);
    expect(state.child?.kill).toHaveBeenCalledWith("SIGKILL");
  });
});
