/**
 * One checked-out pooled resource plus its release hook.
 */
export interface ResourcePoolLease<T> {
  release(reusable?: boolean): Promise<void>;
  value: T;
}

/**
 * Configuration for a reusable async resource pool.
 */
export interface ResourcePoolOptions<T> {
  create: () => Promise<T> | T;
  destroy: (value: T) => Promise<void> | void;
  idleTimeoutMs?: number;
  maxSize: number;
  minSize?: number;
}

/**
 * Minimal async pool contract used by the pooled executors.
 */
export interface ResourcePool<T> {
  acquire(): Promise<ResourcePoolLease<T>>;
  dispose(): Promise<void>;
  prewarm(count?: number): Promise<void>;
}

interface PoolEntry<T> {
  idleTimer: NodeJS.Timeout | undefined;
  value: T;
}

function clampTarget(value: number, maxSize: number): number {
  return Math.max(0, Math.min(value, maxSize));
}

/**
 * Creates a bounded async resource pool with optional idle eviction.
 */
export function createResourcePool<T>(
  options: ResourcePoolOptions<T>,
): ResourcePool<T> {
  const available: PoolEntry<T>[] = [];
  const waiters: Array<{
    reject: (error: Error) => void;
    resolve: (lease: ResourcePoolLease<T>) => void;
  }> = [];
  const inUse = new Set<PoolEntry<T>>();
  let disposed = false;
  let totalSize = 0;

  const minSize = clampTarget(options.minSize ?? 0, options.maxSize);

  const createEntry = async (): Promise<PoolEntry<T>> => {
    totalSize += 1;

    try {
      return {
        idleTimer: undefined,
        value: await options.create(),
      };
    } catch (error) {
      totalSize -= 1;
      throw error;
    }
  };

  const removeAvailableEntry = (entry: PoolEntry<T>): void => {
    const index = available.indexOf(entry);

    if (index >= 0) {
      available.splice(index, 1);
    }
  };

  const clearIdleTimer = (entry: PoolEntry<T>): void => {
    if (entry.idleTimer) {
      clearTimeout(entry.idleTimer);
      entry.idleTimer = undefined;
    }
  };

  const queueAvailableEntry = (entry: PoolEntry<T>): void => {
    available.push(entry);

    if ((options.idleTimeoutMs ?? 0) > 0) {
      entry.idleTimer = setTimeout(() => {
        if (disposed) {
          return;
        }

        if (available.includes(entry) && totalSize > minSize) {
          void destroyEntry(entry);
        }
      }, options.idleTimeoutMs);
    }
  };

  const destroyEntry = async (entry: PoolEntry<T>): Promise<void> => {
    clearIdleTimer(entry);
    removeAvailableEntry(entry);
    inUse.delete(entry);
    totalSize -= 1;
    await options.destroy(entry.value);
  };

  const leaseEntry = (entry: PoolEntry<T>): ResourcePoolLease<T> => {
    clearIdleTimer(entry);
    removeAvailableEntry(entry);
    inUse.add(entry);

    return {
      release: async (reusable = true) => {
        if (!inUse.has(entry)) {
          return;
        }

        inUse.delete(entry);

        if (disposed || !reusable) {
          await destroyEntry(entry);
          await fillWaiters();
          return;
        }

        const waiter = waiters.shift();
        if (waiter) {
          waiter.resolve(leaseEntry(entry));
          return;
        }

        queueAvailableEntry(entry);
      },
      value: entry.value,
    };
  };

  const fillWaiters = async (): Promise<void> => {
    while (!disposed && waiters.length > 0 && totalSize < options.maxSize) {
      const waiter = waiters.shift();
      if (!waiter) {
        return;
      }

      try {
        waiter.resolve(leaseEntry(await createEntry()));
      } catch (error) {
        waiter.reject(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }
  };

  return {
    acquire: async () => {
      if (disposed) {
        throw new Error("Resource pool is disposed");
      }

      const entry = available.pop();
      if (entry) {
        return leaseEntry(entry);
      }

      if (totalSize < options.maxSize) {
        return leaseEntry(await createEntry());
      }

      return await new Promise<ResourcePoolLease<T>>((resolve, reject) => {
        waiters.push({ reject, resolve });
      });
    },
    dispose: async () => {
      if (disposed) {
        return;
      }

      disposed = true;

      while (waiters.length > 0) {
        waiters.shift()?.reject(new Error("Resource pool is disposed"));
      }

      const idleEntries = [...available];
      available.length = 0;
      await Promise.all(idleEntries.map((entry) => destroyEntry(entry)));
    },
    prewarm: async (count) => {
      if (disposed) {
        throw new Error("Resource pool is disposed");
      }

      const target = clampTarget(count ?? minSize, options.maxSize);
      const missing = target - totalSize;

      if (missing <= 0) {
        return;
      }

      const created = await Promise.all(
        Array.from({ length: missing }, async () => await createEntry()),
      );

      for (const entry of created) {
        queueAvailableEntry(entry);
      }
    },
  };
}
