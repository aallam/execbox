import { describe, expect, it, vi } from "vitest";

import { createResourcePool } from "@execbox/core/protocol";

describe("createResourcePool", () => {
  it("reuses released resources when capacity is available", async () => {
    const create = vi.fn(async () => ({ id: Symbol("resource") }));
    const destroy = vi.fn(async () => {});
    const pool = createResourcePool({
      create,
      destroy,
      maxSize: 1,
    });

    const firstLease = await pool.acquire();
    const firstValue = firstLease.value;
    await firstLease.release();

    const secondLease = await pool.acquire();

    expect(create).toHaveBeenCalledTimes(1);
    expect(secondLease.value).toBe(firstValue);

    await secondLease.release();
    await pool.dispose();
  });

  it("creates multiple resources for concurrent leases up to maxSize", async () => {
    const create = vi.fn(async () => ({ id: Symbol("resource") }));
    const destroy = vi.fn(async () => {});
    const pool = createResourcePool({
      create,
      destroy,
      maxSize: 2,
    });

    const firstLease = await pool.acquire();
    const secondLease = await pool.acquire();

    expect(create).toHaveBeenCalledTimes(2);
    expect(secondLease.value).not.toBe(firstLease.value);

    await firstLease.release();
    await secondLease.release();
    await pool.dispose();
  });

  it("evicts idle resources after the idle timeout", async () => {
    vi.useFakeTimers();

    try {
      const create = vi.fn(async () => ({ id: Symbol("resource") }));
      const destroy = vi.fn(async () => {});
      const pool = createResourcePool({
        create,
        destroy,
        idleTimeoutMs: 100,
        maxSize: 1,
      });

      const lease = await pool.acquire();
      await lease.release();

      await vi.advanceTimersByTimeAsync(100);

      expect(destroy).toHaveBeenCalledTimes(1);
      await pool.dispose();
    } finally {
      vi.useRealTimers();
    }
  });
});
