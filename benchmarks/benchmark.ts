/**
 * Comprehensive execbox performance benchmark suite.
 *
 * Covers:
 *   1. Single-execution latency across inline and worker-hosted executors
 *   2. Cold-start vs warm (pooled/prewarmed) first-execution cost
 *   3. Tool-call overhead scaling (0, 1, 5, 10 tool calls)
 *   4. Schema validation overhead (with vs without input/output schemas)
 *   5. Concurrent throughput under varying concurrency levels
 *   6. Pool contention behavior (small pool, many concurrent requests)
 *   7. Host-process memory delta during sustained execution
 *
 * Usage:
 *   npm run benchmark -- --iterations=N --warmups=N --suite=name
 *
 * Suites: latency, coldstart, toolcalls, schema, concurrency, contention, memory, all (default)
 */

import { performance } from "node:perf_hooks";
import { z } from "zod";

import { resolveProvider, type ResolvedToolProvider } from "@execbox/core";

import {
  BENCHMARK_USAGE,
  createBenchmarkFactories,
  createContentionExecutor,
  createMemoryBenchmarkFactories,
  type DisposableExecutor,
} from "./config";

// ---------------------------------------------------------------------------
// CLI helpers
// ---------------------------------------------------------------------------

function parseFlag(name: string, fallback: string): string {
  const flag = process.argv.find((v) => v.startsWith(`--${name}=`));
  return flag ? flag.slice(name.length + 3) : fallback;
}

function parseNumberFlag(name: string, fallback: number): number {
  const raw = parseFlag(name, String(fallback));
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const ITERATIONS = parseNumberFlag("iterations", 20);
const WARMUPS = parseNumberFlag("warmups", 3);
const SUITE = parseFlag("suite", "all");

// ---------------------------------------------------------------------------
// Stats utilities
// ---------------------------------------------------------------------------

function median(s: number[]): number {
  const sorted = [...s].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : (sorted[mid] ?? 0);
}

function percentile(s: number[], rank: number): number {
  const sorted = [...s].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((rank / 100) * sorted.length) - 1),
  );
  return sorted[idx] ?? 0;
}

function mean(s: number[]): number {
  return s.reduce((a, b) => a + b, 0) / s.length;
}

function stddev(s: number[]): number {
  const m = mean(s);
  return Math.sqrt(s.reduce((sum, v) => sum + (v - m) ** 2, 0) / s.length);
}

function min(s: number[]): number {
  return Math.min(...s);
}

function max(s: number[]): number {
  return Math.max(...s);
}

function fmt(ms: number): string {
  return `${ms.toFixed(2)}ms`;
}

function printStats(label: string, samples: number[]): void {
  console.log(
    `  ${label.padEnd(42)} ` +
      `min=${fmt(min(samples))} median=${fmt(median(samples))} ` +
      `mean=${fmt(mean(samples))} p95=${fmt(percentile(samples, 95))} ` +
      `max=${fmt(max(samples))} stddev=${fmt(stddev(samples))}`,
  );
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

const simpleProvider = resolveProvider({
  name: "tools",
  tools: {
    echo: {
      description: "Echoes input back",
      execute: async (input) => input,
    },
    sum: {
      description: "Sums two numbers",
      execute: async (input) => {
        const p = input as { x: number; y: number };
        return { sum: p.x + p.y };
      },
    },
    multiply: {
      description: "Multiplies two numbers",
      execute: async (input) => {
        const p = input as { a: number; b: number };
        return { product: p.a * p.b };
      },
    },
  },
});

const validatedProvider = resolveProvider({
  name: "validated",
  tools: {
    add: {
      description: "Validated add",
      inputSchema: z.object({ x: z.number(), y: z.number() }),
      outputSchema: z.object({ sum: z.number() }),
      execute: async (input) => {
        const p = input as { x: number; y: number };
        return { sum: p.x + p.y };
      },
    },
  },
});

const unvalidatedProvider = resolveProvider({
  name: "unvalidated",
  tools: {
    add: {
      description: "Unvalidated add",
      execute: async (input) => {
        const p = input as { x: number; y: number };
        return { sum: p.x + p.y };
      },
    },
  },
});

const factories = createBenchmarkFactories();

function getForcedGc(): (() => void) | undefined {
  const maybeGc = (globalThis as typeof globalThis & { gc?: () => void }).gc;
  return typeof maybeGc === "function" ? maybeGc : undefined;
}

// ---------------------------------------------------------------------------
// Benchmark runner
// ---------------------------------------------------------------------------

async function benchSequential(
  executor: DisposableExecutor,
  code: string,
  providers: ResolvedToolProvider[],
  warmups: number,
  iterations: number,
): Promise<number[]> {
  for (let i = 0; i < warmups; i++) {
    const r = await executor.execute(code, providers);
    if (!r.ok)
      throw new Error(`Warmup failed: ${r.error.code} ${r.error.message}`);
  }

  const samples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    const r = await executor.execute(code, providers);
    samples.push(performance.now() - t0);
    if (!r.ok)
      throw new Error(`Run failed: ${r.error.code} ${r.error.message}`);
  }
  return samples;
}

async function benchConcurrent(
  executor: DisposableExecutor,
  code: string,
  providers: ResolvedToolProvider[],
  concurrency: number,
  totalRuns: number,
): Promise<{ totalMs: number; perRequestMs: number[] }> {
  // Warmup
  for (let i = 0; i < 3; i++) {
    await executor.execute(code, providers);
  }

  const perRequestMs: number[] = [];
  const t0 = performance.now();
  let completed = 0;

  async function worker(): Promise<void> {
    while (completed < totalRuns) {
      completed++;
      const start = performance.now();
      const r = await executor.execute(code, providers);
      perRequestMs.push(performance.now() - start);
      if (!r.ok) throw new Error(`Concurrent run failed: ${r.error.code}`);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return { totalMs: performance.now() - t0, perRequestMs };
}

// ---------------------------------------------------------------------------
// Suite: Single-execution latency
// ---------------------------------------------------------------------------

async function suiteLatency(): Promise<void> {
  console.log("\n" + "=".repeat(80));
  console.log("SUITE: Single-Execution Latency");
  console.log("=".repeat(80));

  const cases = [
    {
      name: "no tools (42 + 1)",
      code: "42 + 1",
      providers: [] as ResolvedToolProvider[],
    },
    {
      name: "1 tool call",
      code: "await tools.echo({ v: 1 })",
      providers: [simpleProvider],
    },
    {
      name: "2 sequential tool calls",
      code: `const a = await tools.sum({x:1,y:2}); await tools.sum({x:a.sum,y:3});`,
      providers: [simpleProvider],
    },
  ];

  for (const c of cases) {
    console.log(`\n  [${c.name}]`);
    for (const f of factories) {
      const executor = f.create();
      try {
        await executor.prewarm?.(1);
        const samples = await benchSequential(
          executor,
          c.code,
          c.providers,
          WARMUPS,
          ITERATIONS,
        );
        printStats(f.name, samples);
      } finally {
        await executor.dispose?.();
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Suite: Cold-start cost
// ---------------------------------------------------------------------------

async function suiteColdStart(): Promise<void> {
  console.log("\n" + "=".repeat(80));
  console.log("SUITE: Cold-Start vs Warm-Start (first-execution latency)");
  console.log("=".repeat(80));

  const code = "42 + 1";
  const coldRuns = 5;

  for (const f of factories) {
    const coldSamples: number[] = [];

    // Cold: create fresh executor each time with no explicit prewarm.
    for (let i = 0; i < coldRuns; i++) {
      const executor = f.create();
      try {
        const t0 = performance.now();
        await executor.execute(code, []);
        coldSamples.push(performance.now() - t0);
      } finally {
        await executor.dispose?.();
      }
    }

    console.log(`\n  [${f.name}]`);
    printStats("cold (fresh executor)", coldSamples);

    if (!f.supportsExplicitPrewarm) {
      console.log(
        "  warm (prewarmed)                         N/A (explicit prewarm not supported)",
      );
      continue;
    }

    const warmSamples: number[] = [];
    for (let i = 0; i < coldRuns; i++) {
      const executor = f.create();
      try {
        await executor.prewarm?.(1);
        const t0 = performance.now();
        await executor.execute(code, []);
        warmSamples.push(performance.now() - t0);
      } finally {
        await executor.dispose?.();
      }
    }

    printStats("warm (prewarmed)", warmSamples);

    const coldMed = median(coldSamples);
    const warmMed = median(warmSamples);
    const speedup = coldMed > 0 ? ((coldMed - warmMed) / coldMed) * 100 : 0;
    console.log(
      `    -> prewarm speedup: ${speedup.toFixed(1)}% ` +
        `(${fmt(coldMed)} -> ${fmt(warmMed)})`,
    );
  }
}

// ---------------------------------------------------------------------------
// Suite: Tool-call overhead scaling
// ---------------------------------------------------------------------------

async function suiteToolCalls(): Promise<void> {
  console.log("\n" + "=".repeat(80));
  console.log("SUITE: Tool-Call Overhead Scaling");
  console.log("=".repeat(80));

  const toolCounts = [0, 1, 5, 10];

  function makeCode(n: number): string {
    if (n === 0) return "42";
    return Array.from(
      { length: n },
      (_, i) => `await tools.echo({ step: ${i} })`,
    ).join(";\n");
  }

  // Use quickjs (fastest) and worker-pooled (representative hosted local mode)
  const testFactories = factories.filter(
    (f) => f.name === "quickjs (in-process)" || f.name === "worker (pooled)",
  );

  for (const f of testFactories) {
    console.log(`\n  [${f.name}]`);
    const perCallOverheads: { count: number; medianMs: number }[] = [];

    for (const count of toolCounts) {
      const code = makeCode(count);
      const providers = count > 0 ? [simpleProvider] : [];
      const executor = f.create();
      try {
        await executor.prewarm?.(1);
        const samples = await benchSequential(
          executor,
          code,
          providers,
          WARMUPS,
          ITERATIONS,
        );
        printStats(`${count} tool calls`, samples);
        perCallOverheads.push({ count, medianMs: median(samples) });
      } finally {
        await executor.dispose?.();
      }
    }

    // Compute marginal cost per tool call
    const base = perCallOverheads.find((o) => o.count === 0)!.medianMs;
    for (const o of perCallOverheads) {
      if (o.count > 0) {
        const marginal = (o.medianMs - base) / o.count;
        console.log(
          `    -> marginal cost per tool call (${o.count} calls): ${fmt(marginal)}`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Suite: Schema validation overhead
// ---------------------------------------------------------------------------

async function suiteSchema(): Promise<void> {
  console.log("\n" + "=".repeat(80));
  console.log("SUITE: Schema Validation Overhead");
  console.log("=".repeat(80));

  const codeValidated = "await validated.add({ x: 1, y: 2 })";
  const codeUnvalidated = "await unvalidated.add({ x: 1, y: 2 })";

  // Test with quickjs and worker-pooled
  const testFactories = factories.filter(
    (f) => f.name === "quickjs (in-process)" || f.name === "worker (pooled)",
  );

  for (const f of testFactories) {
    console.log(`\n  [${f.name}]`);

    const executor = f.create();
    try {
      await executor.prewarm?.(1);

      const withSchema = await benchSequential(
        executor,
        codeValidated,
        [validatedProvider],
        WARMUPS,
        ITERATIONS,
      );
      printStats("with input+output schema", withSchema);

      const withoutSchema = await benchSequential(
        executor,
        codeUnvalidated,
        [unvalidatedProvider],
        WARMUPS,
        ITERATIONS,
      );
      printStats("without schema", withoutSchema);

      const diff = median(withSchema) - median(withoutSchema);
      console.log(
        `    -> schema validation overhead: ${fmt(diff)} ` +
          `(${((diff / median(withoutSchema)) * 100).toFixed(1)}%)`,
      );
    } finally {
      await executor.dispose?.();
    }
  }
}

// ---------------------------------------------------------------------------
// Suite: Concurrent throughput
// ---------------------------------------------------------------------------

async function suiteConcurrency(): Promise<void> {
  console.log("\n" + "=".repeat(80));
  console.log("SUITE: Concurrent Throughput");
  console.log("=".repeat(80));

  const code = "await tools.echo({ v: 1 })";
  const concurrencyLevels = [1, 2, 4, 8];
  const totalRuns = 40;

  // Only test pooled executors (ephemeral would be too slow)
  const testFactories = factories.filter(
    (f) => f.name.includes("pooled") || f.name === "quickjs (in-process)",
  );

  for (const f of testFactories) {
    console.log(`\n  [${f.name}]`);

    for (const concurrency of concurrencyLevels) {
      const executor = f.create();
      try {
        await executor.prewarm?.(Math.min(concurrency, 4));
        const { totalMs, perRequestMs } = await benchConcurrent(
          executor,
          code,
          [simpleProvider],
          concurrency,
          totalRuns,
        );
        const throughput = (totalRuns / totalMs) * 1000;
        console.log(
          `    concurrency=${String(concurrency).padEnd(2)} ` +
            `throughput=${throughput.toFixed(1)} exec/s ` +
            `median_latency=${fmt(median(perRequestMs))} ` +
            `p95_latency=${fmt(percentile(perRequestMs, 95))} ` +
            `total=${fmt(totalMs)}`,
        );
      } finally {
        await executor.dispose?.();
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Suite: Pool contention
// ---------------------------------------------------------------------------

async function suiteContention(): Promise<void> {
  console.log("\n" + "=".repeat(80));
  console.log("SUITE: Pool Contention (small pool, many concurrent requests)");
  console.log("=".repeat(80));

  const code = "await tools.echo({ v: 1 })";
  const totalRuns = 30;

  // Pool size 1 with different concurrency levels to measure wait time
  const poolSizes = [1, 2, 4];
  const concurrency = 8;

  console.log("\n  [worker]");

  for (const poolSize of poolSizes) {
    const executor = createContentionExecutor(poolSize);
    try {
      await executor.prewarm?.(poolSize);
      const { totalMs, perRequestMs } = await benchConcurrent(
        executor,
        code,
        [simpleProvider],
        concurrency,
        totalRuns,
      );
      const throughput = (totalRuns / totalMs) * 1000;
      console.log(
        `    pool_size=${String(poolSize).padEnd(2)} concurrency=${concurrency} ` +
          `throughput=${throughput.toFixed(1)} exec/s ` +
          `median=${fmt(median(perRequestMs))} ` +
          `p95=${fmt(percentile(perRequestMs, 95))} ` +
          `max=${fmt(max(perRequestMs))}`,
      );
    } finally {
      await executor.dispose?.();
    }
  }
}

// ---------------------------------------------------------------------------
// Suite: Memory footprint
// ---------------------------------------------------------------------------

async function suiteMemory(): Promise<void> {
  console.log("\n" + "=".repeat(80));
  console.log("SUITE: Host-Process Memory Delta During Sustained Execution");
  console.log("=".repeat(80));

  const gc = getForcedGc();
  if (!gc) {
    console.log(
      "  [SKIPPED] Memory suite requires --expose-gc for stable host-process deltas.",
    );
    return;
  }

  const code = "await tools.echo({ data: 'x'.repeat(1000) })";
  const runs = 50;

  for (const f of createMemoryBenchmarkFactories(factories)) {
    const executor = f.create();
    try {
      await executor.prewarm?.(1);

      gc();
      const before = process.memoryUsage();

      for (let i = 0; i < runs; i++) {
        await executor.execute(code, [simpleProvider]);
      }

      gc();
      const after = process.memoryUsage();

      const heapDelta = (after.heapUsed - before.heapUsed) / 1024 / 1024;
      const rssDelta = (after.rss - before.rss) / 1024 / 1024;
      const externalDelta = (after.external - before.external) / 1024 / 1024;

      console.log(
        `  ${f.name.padEnd(24)} ` +
          `heap_delta=${heapDelta.toFixed(2)}MB ` +
          `rss_delta=${rssDelta.toFixed(2)}MB ` +
          `external_delta=${externalDelta.toFixed(2)}MB ` +
          `(${runs} executions)`,
      );
    } finally {
      await executor.dispose?.();
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const suites: Record<string, () => Promise<void>> = {
  latency: suiteLatency,
  coldstart: suiteColdStart,
  toolcalls: suiteToolCalls,
  schema: suiteSchema,
  concurrency: suiteConcurrency,
  contention: suiteContention,
  memory: suiteMemory,
};

async function main(): Promise<void> {
  console.log("=".repeat(80));
  console.log("execbox Performance Benchmark Suite");
  console.log(`iterations=${ITERATIONS} warmups=${WARMUPS} suite=${SUITE}`);
  console.log(`Node ${process.version} | ${process.platform} ${process.arch}`);
  console.log(`Usage: ${BENCHMARK_USAGE}`);
  console.log("=".repeat(80));

  const startTime = performance.now();

  if (SUITE === "all") {
    for (const [name, fn] of Object.entries(suites)) {
      try {
        await fn();
      } catch (err) {
        console.error(`\n  [ERROR in ${name}]`, err);
      }
    }
  } else if (suites[SUITE]) {
    await suites[SUITE]();
  } else {
    console.error(
      `Unknown suite: ${SUITE}. Available: ${Object.keys(suites).join(", ")}, all`,
    );
    process.exit(1);
  }

  const totalTime = performance.now() - startTime;
  console.log("\n" + "=".repeat(80));
  console.log(`Total benchmark time: ${(totalTime / 1000).toFixed(1)}s`);
  console.log("=".repeat(80));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
