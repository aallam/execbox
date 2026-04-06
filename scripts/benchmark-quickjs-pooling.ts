import { performance } from "node:perf_hooks";

import {
  resolveProvider,
  type Executor,
  type ResolvedToolProvider,
} from "@execbox/core";
import { ProcessExecutor } from "@execbox/process";
import { WorkerExecutor } from "@execbox/worker";

interface BenchmarkCase {
  code: string;
  name: string;
  providers: ResolvedToolProvider[];
}

interface BenchmarkVariant {
  createExecutor: () => Executor;
  mode: "ephemeral" | "pooled";
  name: string;
}

const DEFAULT_ITERATIONS = 25;
const DEFAULT_WARMUPS = 5;

function parseNumberFlag(name: string, fallback: number): number {
  const flag = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (!flag) {
    return fallback;
  }

  const parsed = Number(flag.slice(name.length + 3));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function median(samples: number[]): number {
  const sorted = [...samples].sort((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[midpoint - 1] + sorted[midpoint]) / 2;
  }

  return sorted[midpoint] ?? 0;
}

function percentile(samples: number[], rank: number): number {
  const sorted = [...samples].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((rank / 100) * sorted.length) - 1),
  );

  return sorted[index] ?? 0;
}

function formatMs(value: number): string {
  return `${value.toFixed(2)}ms`;
}

async function runBenchmarkCase(
  variant: BenchmarkVariant,
  benchmarkCase: BenchmarkCase,
  warmups: number,
  iterations: number,
): Promise<{ medianMs: number; p95Ms: number; samples: number[] }> {
  const executor = variant.createExecutor() as Executor & {
    dispose?(): Promise<void>;
    prewarm?(count?: number): Promise<void>;
  };

  try {
    await executor.prewarm?.(1);

    for (let index = 0; index < warmups; index += 1) {
      await executor.execute(benchmarkCase.code, benchmarkCase.providers);
    }

    const samples: number[] = [];
    for (let index = 0; index < iterations; index += 1) {
      const startedAt = performance.now();
      const result = await executor.execute(
        benchmarkCase.code,
        benchmarkCase.providers,
      );
      const elapsed = performance.now() - startedAt;
      if (!result.ok) {
        throw new Error(
          `${variant.name}/${variant.mode}/${benchmarkCase.name} failed: ${result.error.code} ${result.error.message}`,
        );
      }
      samples.push(elapsed);
    }

    return {
      medianMs: median(samples),
      p95Ms: percentile(samples, 95),
      samples,
    };
  } finally {
    await executor.dispose?.();
  }
}

const toolProvider = resolveProvider({
  name: "tools",
  tools: {
    echo: {
      execute: async (input) => input,
    },
    sum: {
      execute: async (input) => {
        const payload = input as { x: number; y: number };
        return { sum: payload.x + payload.y };
      },
    },
  },
});

const benchmarkCases: BenchmarkCase[] = [
  {
    code: "41 + 1",
    name: "short-script-no-tools",
    providers: [],
  },
  {
    code: "await tools.echo({ value: 42 })",
    name: "short-script-one-tool",
    providers: [toolProvider],
  },
  {
    code: `
      const first = await tools.sum({ x: 20, y: 1 });
      const second = await tools.sum({ x: first.sum, y: 21 });
      second.sum;
    `,
    name: "short-script-two-tools",
    providers: [toolProvider],
  },
];

const pooledConfig = {
  pool: {
    idleTimeoutMs: 30_000,
    maxSize: 1,
    minSize: 0,
    prewarm: true,
  },
};

const variants: BenchmarkVariant[] = [
  {
    createExecutor: () => new ProcessExecutor({ mode: "ephemeral" }),
    mode: "ephemeral",
    name: "process",
  },
  {
    createExecutor: () => new ProcessExecutor(pooledConfig),
    mode: "pooled",
    name: "process",
  },
  {
    createExecutor: () => new WorkerExecutor({ mode: "ephemeral" }),
    mode: "ephemeral",
    name: "worker",
  },
  {
    createExecutor: () => new WorkerExecutor(pooledConfig),
    mode: "pooled",
    name: "worker",
  },
];

const iterations = parseNumberFlag("iterations", DEFAULT_ITERATIONS);
const warmups = parseNumberFlag("warmups", DEFAULT_WARMUPS);

console.log(
  `QuickJS pooling benchmark: warmups=${warmups}, iterations=${iterations}`,
);

for (const benchmarkCase of benchmarkCases) {
  console.log(`\n[${benchmarkCase.name}]`);

  for (const variant of variants) {
    const result = await runBenchmarkCase(
      variant,
      benchmarkCase,
      warmups,
      iterations,
    );

    console.log(
      `${variant.name.padEnd(8)} ${variant.mode.padEnd(8)} median=${formatMs(result.medianMs)} p95=${formatMs(result.p95Ms)}`,
    );
  }
}
