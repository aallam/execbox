import { randomUUID } from "node:crypto";

import {
  runHostTransportSession,
  type HostTransport,
} from "@execbox/core/protocol";
import type { ExecutorPoolOptions } from "@execbox/core";
import { resolveExecutorRuntimeOptions } from "@execbox/core/_internal";
import type {
  ExecutionOptions,
  ExecuteResult,
  ExecutorRuntimeOptions,
  ResolvedToolProvider,
} from "@execbox/core";

/**
 * Default grace period before a hosted shell is forcefully terminated.
 */
const DEFAULT_CANCEL_GRACE_MS = 25;

/**
 * Default pooling limits shared by the hosted QuickJS executors.
 */
const DEFAULT_POOL_OPTIONS: Required<ExecutorPoolOptions> = {
  idleTimeoutMs: 30_000,
  maxSize: 1,
  minSize: 0,
  prewarm: false,
};

/**
 * Minimal code used to warm a hosted shell without touching user providers.
 */
const DEFAULT_PREWARM_CODE = "undefined";

export { DEFAULT_CANCEL_GRACE_MS, DEFAULT_POOL_OPTIONS, DEFAULT_PREWARM_CODE };

/**
 * Wraps a transport so warmup and pooled execution can borrow it without
 * taking ownership of its lifecycle.
 */
export function createBorrowedTransport(
  transport: HostTransport,
): HostTransport {
  return {
    dispose() {},
    onClose: transport.onClose,
    onError: transport.onError,
    onMessage: transport.onMessage,
    send: transport.send,
    terminate: transport.terminate,
  };
}

/**
 * Resolves how many pooled shells should be prewarmed from the pool settings.
 */
export function getPrewarmCount(pool: ExecutorPoolOptions | undefined): number {
  if (!pool?.prewarm) {
    return 0;
  }

  if (typeof pool.prewarm === "number") {
    return Math.max(0, Math.min(pool.prewarm, pool.maxSize));
  }

  return Math.max(1, Math.min(pool.minSize ?? 1, pool.maxSize));
}

/**
 * Caps an explicit warmup request to the configured pool boundaries.
 */
export function getWarmupTarget(
  count: number | undefined,
  poolOptions: ExecutorPoolOptions,
): number {
  return Math.max(
    0,
    Math.min(count ?? poolOptions.minSize ?? 0, poolOptions.maxSize),
  );
}

/**
 * Returns whether a hosted execution result is safe to return to a pool.
 */
export function isReusableResult(result: ExecuteResult): boolean {
  return (
    result.ok || !["internal_error", "timeout"].includes(result.error.code)
  );
}

/**
 * Normalizes a failed warmup result into an actionable host-side error.
 */
export function toWarmupError(label: string, result: ExecuteResult): Error {
  if (result.ok) {
    return new Error(`Failed to prewarm pooled ${label}`);
  }

  return new Error(
    `Failed to prewarm pooled ${label}: ${result.error.message}`,
  );
}

/**
 * Runs one transport-backed execution session with resolved runtime limits and
 * a fresh execution identifier.
 */
export async function runHostedTransportSession(options: {
  cancelGraceMs: number;
  code: string;
  executorOptions: ExecutorRuntimeOptions;
  onSettled?: (result: ExecuteResult) => Promise<void> | void;
  providers: ResolvedToolProvider[];
  requestOptions?: ExecutionOptions;
  transport: HostTransport;
}): Promise<ExecuteResult> {
  return await runHostTransportSession({
    cancelGraceMs: options.cancelGraceMs,
    code: options.code,
    executionId: randomUUID(),
    onSettled: options.onSettled,
    providers: options.providers,
    runtimeOptions: resolveExecutorRuntimeOptions(
      options.executorOptions,
      options.requestOptions,
    ),
    signal: options.requestOptions?.signal,
    transport: options.transport,
  });
}

/**
 * Exercises a set of leased shells with a warmup run and releases each lease
 * according to the warmup result.
 */
export async function warmHostedPool<Shell>(options: {
  count: number;
  getTransport: (shell: Shell) => HostTransport;
  label: string;
  onRelease: (shell: Shell, reusable: boolean) => Promise<void>;
  runSession: (
    transport: HostTransport,
    code: string,
    providers: ResolvedToolProvider[],
  ) => Promise<ExecuteResult>;
  shells: Shell[];
}): Promise<void> {
  const results = await Promise.allSettled(
    options.shells.map(async (shell) => {
      let reusable = false;

      try {
        const result = await options.runSession(
          createBorrowedTransport(options.getTransport(shell)),
          DEFAULT_PREWARM_CODE,
          [],
        );
        reusable = result.ok;
        if (!result.ok) {
          throw toWarmupError(options.label, result);
        }
      } finally {
        await options.onRelease(shell, reusable);
      }
    }),
  );

  const rejected = results.find((result) => result.status === "rejected");
  if (rejected?.status === "rejected") {
    throw rejected.reason;
  }
}
