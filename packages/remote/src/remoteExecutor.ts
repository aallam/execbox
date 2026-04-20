import { randomUUID } from "node:crypto";

import {
  runHostTransportSession,
  type HostTransport,
} from "@execbox/core/protocol";
import {
  createTimeoutExecuteResult,
  resolveExecutorRuntimeOptions,
} from "@execbox/core/_internal";
import type {
  ExecutionOptions,
  ExecuteResult,
  Executor,
  ResolvedToolProvider,
} from "@execbox/core";

import type { RemoteExecutorOptions } from "./types";

const DEFAULT_CANCEL_GRACE_MS = 25;
/**
 * Transport-backed executor that runs guest code outside the host process.
 */
export class RemoteExecutor implements Executor {
  private readonly cancelGraceMs: number;
  private readonly options: RemoteExecutorOptions;

  /**
   * Creates a transport-backed executor with caller-supplied remote connectivity.
   */
  constructor(options: RemoteExecutorOptions) {
    this.cancelGraceMs = options.cancelGraceMs ?? DEFAULT_CANCEL_GRACE_MS;
    this.options = options;
  }

  /**
   * Executes JavaScript against the provided tool namespaces over a remote transport.
   */
  async execute(
    code: string,
    providers: ResolvedToolProvider[],
    options: ExecutionOptions = {},
  ): Promise<ExecuteResult> {
    if (options.signal?.aborted) {
      return createTimeoutExecuteResult();
    }

    let transport: HostTransport;

    try {
      transport = await this.options.connectTransport();
    } catch (error) {
      return {
        durationMs: 0,
        error: {
          code: "internal_error",
          message: error instanceof Error ? error.message : String(error),
        },
        logs: [],
        ok: false,
      };
    }

    return await runHostTransportSession({
      cancelGraceMs: this.cancelGraceMs,
      code,
      executionId: randomUUID(),
      providers,
      runtimeOptions: resolveExecutorRuntimeOptions(this.options, options),
      signal: options.signal,
      transport,
    });
  }
}
