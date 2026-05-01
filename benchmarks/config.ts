import type { Executor } from "@execbox/core";
import { QuickJsExecutor } from "@execbox/quickjs";

export type DisposableExecutor = Executor & {
  dispose?(): Promise<void>;
  prewarm?(count?: number): Promise<void>;
};

export interface ExecutorFactory {
  name: string;
  create: () => DisposableExecutor;
  supportsExplicitPrewarm?: boolean;
}

export const BENCHMARK_USAGE =
  "npm run benchmark -- --iterations=N --warmups=N --suite=name";

export const DEFAULT_POOLED_BENCHMARK_POOL_OPTIONS = {
  idleTimeoutMs: 30_000,
  maxSize: 2,
  minSize: 0,
  prewarm: false,
} as const;

export const MEMORY_BENCHMARK_FACTORY_NAMES = [
  "quickjs (in-process)",
  "worker (ephemeral)",
  "worker (pooled)",
] as const;

export function createPooledBenchmarkOptions(): {
  pool: typeof DEFAULT_POOLED_BENCHMARK_POOL_OPTIONS;
} {
  return {
    pool: { ...DEFAULT_POOLED_BENCHMARK_POOL_OPTIONS },
  };
}

export function createContentionPoolOptions(poolSize: number) {
  return {
    idleTimeoutMs: 30_000,
    maxSize: poolSize,
    minSize: 0,
    prewarm: false,
  } as const;
}

export function createBenchmarkFactories(): ExecutorFactory[] {
  return [
    {
      name: "quickjs (in-process)",
      create: () => new QuickJsExecutor(),
      supportsExplicitPrewarm: false,
    },
    {
      name: "worker (ephemeral)",
      create: () =>
        new QuickJsExecutor({
          host: "worker",
          mode: "ephemeral",
        }) as DisposableExecutor,
      supportsExplicitPrewarm: false,
    },
    {
      name: "worker (pooled)",
      create: () =>
        new QuickJsExecutor({
          host: "worker",
          ...createPooledBenchmarkOptions(),
        }) as DisposableExecutor,
      supportsExplicitPrewarm: true,
    },
  ];
}

export function createMemoryBenchmarkFactories(
  factories: ExecutorFactory[] = createBenchmarkFactories(),
): ExecutorFactory[] {
  const allowedNames = new Set<string>(MEMORY_BENCHMARK_FACTORY_NAMES);
  return factories.filter((factory) => allowedNames.has(factory.name));
}

export function createContentionExecutor(poolSize: number): DisposableExecutor {
  const pool = createContentionPoolOptions(poolSize);
  return new QuickJsExecutor({ host: "worker", pool }) as DisposableExecutor;
}
