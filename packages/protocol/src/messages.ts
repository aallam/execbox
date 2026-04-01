import type {
  ExecuteResult,
  ExecutorRuntimeOptions,
  ProviderManifest,
  ToolCall,
  ToolCallResult,
} from "@execbox/core";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRuntimeOptions(value: unknown): value is ExecutorRuntimeOptions {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isFiniteNumber(value.maxLogChars) &&
    isFiniteNumber(value.maxLogLines) &&
    isFiniteNumber(value.memoryLimitBytes) &&
    isFiniteNumber(value.timeoutMs)
  );
}

function isProviderManifest(value: unknown): value is ProviderManifest {
  if (!isRecord(value) || typeof value.name !== "string") {
    return false;
  }

  if (!isRecord(value.tools) || typeof value.types !== "string") {
    return false;
  }

  return Object.values(value.tools).every(
    (tool) =>
      isRecord(tool) &&
      typeof tool.originalName === "string" &&
      typeof tool.safeName === "string" &&
      (tool.description === undefined || typeof tool.description === "string"),
  );
}

function isExecuteError(
  value: unknown,
): value is { code: string; message: string } {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    typeof value.message === "string"
  );
}

function isDonePayload(value: unknown): value is DoneMessage {
  if (!isRecord(value) || !isFiniteNumber(value.durationMs)) {
    return false;
  }

  if (
    !Array.isArray(value.logs) ||
    !value.logs.every((log) => typeof log === "string")
  ) {
    return false;
  }

  if (typeof value.ok !== "boolean") {
    return false;
  }

  return value.ok ? true : isExecuteError(value.error);
}

/**
 * Message sent from dispatcher to runner to start one execution session.
 */
export interface ExecuteMessage {
  code: string;
  id: string;
  options: ExecutorRuntimeOptions;
  providers: ProviderManifest[];
  type: "execute";
}

/**
 * Message sent from dispatcher to request prompt cancellation.
 */
export interface CancelMessage {
  id: string;
  type: "cancel";
}

/**
 * Message sent from a runner when guest code invokes a host tool.
 */
export interface ToolCallMessage extends ToolCall {
  callId: string;
  type: "tool_call";
}

/**
 * Message carrying a trusted host tool result back to the runner.
 */
export type ToolResultMessage = {
  callId: string;
  type: "tool_result";
} & ToolCallResult;

/**
 * Message indicating the runner has finished bootstrapping guest execution timing.
 */
export interface StartedMessage {
  id: string;
  type: "started";
}

/**
 * Final successful execution result returned by a runner.
 *
 * Node IPC can omit `undefined` fields during serialization, so `result`
 * remains optional at the protocol boundary and is normalized by the host.
 */
export type DoneSuccessMessage<T = unknown> = {
  durationMs: number;
  id: string;
  logs: string[];
  ok: true;
  result?: T;
  type: "done";
};

/**
 * Final failed execution result returned by a runner.
 */
export type DoneFailureMessage = {
  id: string;
  type: "done";
} & Extract<ExecuteResult, { ok: false }>;

/**
 * Final execution result returned by a runner.
 */
export type DoneMessage = DoneSuccessMessage | DoneFailureMessage;

/**
 * Messages accepted by a runner transport endpoint.
 */
export type DispatcherMessage =
  | CancelMessage
  | ExecuteMessage
  | ToolResultMessage;

/**
 * Messages emitted by a runner transport endpoint.
 */
export type RunnerMessage = DoneMessage | StartedMessage | ToolCallMessage;

/**
 * Returns whether an unknown value is a dispatcher-to-runner message.
 */
export function isDispatcherMessage(
  value: unknown,
): value is DispatcherMessage {
  if (!isRecord(value) || typeof value.type !== "string") {
    return false;
  }

  switch (value.type) {
    case "cancel":
      return typeof value.id === "string";
    case "execute":
      return (
        typeof value.code === "string" &&
        typeof value.id === "string" &&
        isRuntimeOptions(value.options) &&
        Array.isArray(value.providers) &&
        value.providers.every(isProviderManifest)
      );
    case "tool_result":
      if (typeof value.callId !== "string" || typeof value.ok !== "boolean") {
        return false;
      }

      if (value.ok) {
        return "result" in value;
      }

      return isExecuteError(value.error);
    default:
      return false;
  }
}

/**
 * Returns whether an unknown value is a runner-to-dispatcher message.
 */
export function isRunnerMessage(value: unknown): value is RunnerMessage {
  if (!isRecord(value) || typeof value.type !== "string") {
    return false;
  }

  switch (value.type) {
    case "started":
      return typeof value.id === "string";
    case "tool_call":
      return (
        typeof value.callId === "string" &&
        typeof value.providerName === "string" &&
        typeof value.safeToolName === "string" &&
        "input" in value
      );
    case "done":
      return typeof value.id === "string" && isDonePayload(value);
    default:
      return false;
  }
}
