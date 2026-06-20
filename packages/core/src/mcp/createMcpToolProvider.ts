import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Implementation } from "@modelcontextprotocol/sdk/types.js";

import { resolveProvider } from "../provider/resolveProvider";
import type {
  JsonSchema,
  ResolvedToolProvider,
  ToolAnnotations,
  ToolProvider,
} from "../types";
import { generateMcpWrappedToolTypes } from "./mcpWrappedToolTypes";

/**
 * Caller-owned MCP client source used by the convenience wrapper API.
 */
export type McpToolClientSource = {
  client: Client;
  serverInfo?: Implementation;
};

/**
 * Local MCP server source that requires explicit lifecycle cleanup.
 */
export type McpToolServerSource = {
  server: McpServer;
  serverInfo?: Implementation;
};

/**
 * Source used to discover MCP tools for wrapping.
 */
export type McpToolSource = McpToolClientSource | McpToolServerSource;

const DEFAULT_MCP_TOOL_CLIENT_INFO = {
  name: "mcp-tool-client",
  version: "0.0.0",
} satisfies Implementation;

/**
 * Returns the upstream server identity when the source can provide one.
 */
export function getMcpToolSourceServerInfo(
  source: McpToolSource,
): Implementation | undefined {
  if (source.serverInfo) {
    return source.serverInfo;
  }

  if ("client" in source) {
    return source.client.getServerVersion();
  }

  return undefined;
}

/**
 * Options for wrapping MCP tools into a code-execution provider.
 */
export interface CreateMcpToolProviderOptions {
  /** Namespace exposed to guest code for the wrapped tools. */
  namespace?: string;
  /** Implementation metadata exposed to local `{ server }` sources as the client identity. */
  clientInfo?: Implementation;
}

/**
 * Full wrapped MCP tool metadata used by progressive discovery surfaces.
 */
export interface McpWrappedToolDefinition {
  /** Optional MCP-compatible behavior hints copied from the upstream tool. */
  annotations?: ToolAnnotations;
  /** Optional human-readable description copied from the upstream tool. */
  description?: string;
  /** Normalized input schema used for wrapped tool argument validation. */
  inputSchema?: JsonSchema;
  /** Original upstream MCP tool name. */
  originalName: string;
  /** Upstream output schema for the tool's `structuredContent`, when provided. */
  outputSchema?: JsonSchema;
  /** Sanitized tool name visible in guest code. */
  safeName: string;
}

/**
 * Explicit handle for a wrapped MCP provider and any owned source connections.
 */
export interface McpToolProviderHandle {
  /** Resolved provider exposed to the executor or wrapper server. */
  provider: ResolvedToolProvider;
  /** Best-effort upstream server identity when available. */
  serverInfo?: Implementation;
  /** Full wrapped MCP tool definitions keyed by safe guest-visible name. */
  toolDefinitions: Record<string, McpWrappedToolDefinition>;
  /** Releases any internal MCP client/server connection opened for the provider. */
  close: () => Promise<void>;
}

interface OpenMcpToolClientResult {
  client: Client;
  close: () => Promise<void>;
}

async function closeAll(closers: Array<() => Promise<void>>): Promise<void> {
  const results = await Promise.allSettled(closers.map((close) => close()));
  const rejected = results.find(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );

  if (rejected) {
    throw rejected.reason;
  }
}

function asJsonSchema(schema: unknown): JsonSchema | undefined {
  return typeof schema === "object" && schema !== null
    ? (schema as JsonSchema)
    : undefined;
}

async function openMcpToolClient(
  source: McpToolSource,
  clientInfo: Implementation,
): Promise<OpenMcpToolClientResult> {
  if ("client" in source) {
    return {
      client: source.client,
      close: async () => {},
    };
  }

  if (source.server.isConnected()) {
    throw new Error("{ server } sources must be unconnected local MCP servers");
  }

  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client(clientInfo);
  let closePromise: Promise<void> | undefined;
  let serverConnected = false;

  try {
    await source.server.connect(serverTransport);
    serverConnected = true;
    await client.connect(clientTransport);
  } catch (error) {
    await Promise.allSettled([
      Promise.resolve().then(() => client.close()),
      serverConnected
        ? Promise.resolve().then(() => source.server.close())
        : Promise.resolve(),
    ]);
    throw error;
  }

  return {
    client,
    close: async () => {
      closePromise ??= closeAll([
        () => client.close(),
        () => source.server.close(),
      ]);
      return closePromise;
    },
  };
}

/**
 * Opens an MCP tool source as a resolved execution provider with explicit cleanup.
 */
export async function openMcpToolProvider(
  source: McpToolSource,
  options: CreateMcpToolProviderOptions = {},
): Promise<McpToolProviderHandle> {
  const connection = await openMcpToolClient(
    source,
    options.clientInfo ?? DEFAULT_MCP_TOOL_CLIENT_INFO,
  );

  try {
    const toolsResponse = await connection.client.listTools();
    const toolsByOriginalName = new Map(
      toolsResponse.tools.map((tool) => [tool.name, tool] as const),
    );
    const provider: ToolProvider = {
      name: options.namespace ?? "mcp",
      tools: {},
    };

    for (const tool of toolsResponse.tools) {
      provider.tools[tool.name] = {
        annotations: tool.annotations,
        description: tool.description,
        execute: async (input, context) => {
          const argumentsObject =
            typeof input === "object" && input !== null
              ? (input as Record<string, unknown>)
              : undefined;

          return connection.client.callTool(
            {
              arguments: argumentsObject,
              name: tool.name,
            },
            undefined,
            { signal: context.signal },
          );
        },
        inputSchema: tool.inputSchema,
      };
    }

    const resolvedProvider = resolveProvider(provider);
    const toolDefinitions = Object.fromEntries(
      Object.entries(resolvedProvider.tools).map(([safeName, descriptor]) => {
        const upstreamTool = toolsByOriginalName.get(descriptor.originalName);

        return [
          safeName,
          {
            annotations: descriptor.annotations,
            description: descriptor.description,
            inputSchema: descriptor.inputSchema,
            originalName: descriptor.originalName,
            outputSchema: asJsonSchema(upstreamTool?.outputSchema),
            safeName: descriptor.safeName,
          },
        ];
      }),
    );

    return {
      close: connection.close,
      provider: {
        ...resolvedProvider,
        types: generateMcpWrappedToolTypes(resolvedProvider),
      },
      serverInfo: getMcpToolSourceServerInfo(source),
      toolDefinitions,
    };
  } catch (error) {
    await connection.close().catch(() => {});
    throw error;
  }
}

/**
 * Wraps MCP tools from a caller-owned MCP client as a resolved execution provider.
 */
export async function createMcpToolProvider(
  source: McpToolClientSource,
  options: CreateMcpToolProviderOptions = {},
): Promise<ResolvedToolProvider> {
  if ("server" in (source as unknown as McpToolSource)) {
    throw new Error(
      "createMcpToolProvider() no longer accepts { server } sources. Use openMcpToolProvider() to receive a cleanup handle for owned local MCP server connections.",
    );
  }

  const handle = await openMcpToolProvider(source, options);
  return handle.provider;
}
