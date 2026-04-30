import type { ExecutorRuntimeOptions } from "./runner.ts";

/**
 * Fully resolved executor runtime limits after defaults and overrides apply.
 */
export type ResolvedExecutorRuntimeOptions = Readonly<
  Required<ExecutorRuntimeOptions>
>;

/**
 * Default runtime limits shared across the built-in executor implementations.
 */
const DEFAULT_EXECUTOR_RUNTIME_OPTIONS: ResolvedExecutorRuntimeOptions = {
  maxLogChars: 64_000,
  maxLogLines: 100,
  memoryLimitBytes: 64 * 1024 * 1024,
  timeoutMs: 5000,
};

export { DEFAULT_EXECUTOR_RUNTIME_OPTIONS };

/**
 * Resolves executor runtime limits by applying explicit overrides on top of a
 * base options object and finally the shared defaults.
 */
export function resolveExecutorRuntimeOptions(
  options: ExecutorRuntimeOptions = {},
  overrides: ExecutorRuntimeOptions = {},
): Required<ExecutorRuntimeOptions> {
  return {
    maxLogChars:
      overrides.maxLogChars ??
      options.maxLogChars ??
      DEFAULT_EXECUTOR_RUNTIME_OPTIONS.maxLogChars,
    maxLogLines:
      overrides.maxLogLines ??
      options.maxLogLines ??
      DEFAULT_EXECUTOR_RUNTIME_OPTIONS.maxLogLines,
    memoryLimitBytes:
      overrides.memoryLimitBytes ??
      options.memoryLimitBytes ??
      DEFAULT_EXECUTOR_RUNTIME_OPTIONS.memoryLimitBytes,
    timeoutMs:
      overrides.timeoutMs ??
      options.timeoutMs ??
      DEFAULT_EXECUTOR_RUNTIME_OPTIONS.timeoutMs,
  };
}
