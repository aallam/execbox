import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Implementation } from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod";

import type { Executor } from "../executor/executor";
import type { ResolvedToolProvider, ToolAnnotations } from "../types";
import {
  openMcpToolProvider,
  type CreateMcpToolProviderOptions,
  type McpWrappedToolDefinition,
  type McpToolSource,
} from "./createMcpToolProvider";
import { generateMcpWrappedSingleToolTypes } from "./mcpWrappedToolTypes";

/**
 * Options for exposing wrapped MCP tool execution through an MCP server.
 */
export interface CodeMcpServerOptions extends CreateMcpToolProviderOptions {
  /** Executor used to run guest JavaScript against the wrapped provider. */
  executor: Executor;
  /** Implementation metadata exposed to downstream clients as the wrapper server identity. */
  serverInfo?: Implementation;
  /** Maximum number of text characters returned in text content blocks. */
  maxTextChars?: number;
  /** Wrapper tool layout to expose on the returned server. */
  mode?: "both" | "progressive" | "single";
  /** Optional custom names for the wrapper tools. */
  names?: {
    details?: string;
    execute?: string;
    search?: string;
    single?: string;
  };
}

const DEFAULT_MAX_TEXT_CHARS = 24_000;
const CODE_EXECUTION_TOOL_ANNOTATIONS = {
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
  readOnlyHint: false,
} satisfies ToolAnnotations;
const READ_ONLY_TOOL_ANNOTATIONS = {
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
  readOnlyHint: true,
} satisfies ToolAnnotations;
const DEFAULT_MCP_CODE_WRAPPER_SERVER_INFO = {
  name: "mcp-code-wrapper",
  version: "0.0.0",
} satisfies Implementation;

function truncateText(text: string, maxTextChars: number): string {
  return text.length <= maxTextChars ? text : text.slice(0, maxTextChars);
}

function renderText(value: unknown, maxTextChars: number): string {
  return truncateText(JSON.stringify(value, null, 2), maxTextChars);
}

function searchTools(
  toolDefinitions: Record<string, McpWrappedToolDefinition>,
  namespace: string,
  query: string | undefined,
  limit: number,
): Record<string, unknown> {
  const normalizedQuery = query?.toLowerCase().trim();
  const matches = Object.values(toolDefinitions)
    .filter((tool) => {
      if (!normalizedQuery) {
        return true;
      }

      return [tool.originalName, tool.safeName, tool.description ?? ""].some(
        (field) => field.toLowerCase().includes(normalizedQuery),
      );
    })
    .slice(0, limit)
    .map((tool) => ({
      annotations: tool.annotations,
      description: tool.description,
      originalName: tool.originalName,
      safeName: tool.safeName,
    }));

  return {
    namespace,
    tools: matches,
  };
}

function getToolDetails(
  provider: ResolvedToolProvider,
  toolDefinitions: Record<string, McpWrappedToolDefinition>,
  safeName: string,
): Record<string, unknown> {
  const tool = toolDefinitions[safeName];

  if (!tool) {
    throw new Error(`Unknown wrapped MCP tool: ${safeName}`);
  }

  return {
    annotations: tool.annotations,
    description: tool.description,
    inputSchema: tool.inputSchema,
    originalName: tool.originalName,
    outputSchema: tool.outputSchema,
    safeName: tool.safeName,
    types: generateMcpWrappedSingleToolTypes(provider, safeName),
  };
}

function registerExecuteTool(
  server: McpServer,
  name: string,
  provider: ResolvedToolProvider,
  executor: Executor,
  maxTextChars: number,
  description: string,
): void {
  // Cast required: McpServer.registerTool's generic signature doesn't support
  // the narrow input/output shape we need for the code-execution tool.
  const registerTool = server.registerTool.bind(server) as (
    toolName: string,
    config: {
      annotations: ToolAnnotations;
      description: string;
      inputSchema: Record<string, z.ZodTypeAny>;
    },
    handler: (args: { code: string }) => Promise<{
      content: Array<{ text: string; type: "text" }>;
      isError: boolean;
      structuredContent: Record<string, unknown>;
    }>,
  ) => void;

  registerTool(
    name,
    {
      annotations: CODE_EXECUTION_TOOL_ANNOTATIONS,
      description,
      inputSchema: {
        code: z.string(),
      },
    },
    async (args: { code: string }) => {
      const execution = await executor.execute(args.code, [provider]);

      return {
        content: [{ text: renderText(execution, maxTextChars), type: "text" }],
        isError: !execution.ok,
        // ExecuteResult is JSON-safe; cast satisfies the SDK's generic record type.
        structuredContent: execution as Record<string, unknown>,
      };
    },
  );
}

function registerSearchTool(
  server: McpServer,
  name: string,
  namespace: string,
  toolDefinitions: Record<string, McpWrappedToolDefinition>,
  maxTextChars: number,
): void {
  // Cast required: same rationale as registerExecuteTool above.
  const registerTool = server.registerTool.bind(server) as (
    toolName: string,
    config: {
      annotations: ToolAnnotations;
      description: string;
      inputSchema: Record<string, z.ZodTypeAny>;
    },
    handler: (args: { limit?: number; query?: string }) => Promise<{
      content: Array<{ text: string; type: "text" }>;
      structuredContent: Record<string, unknown>;
    }>,
  ) => void;

  registerTool(
    name,
    {
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
      description: `Search wrapped MCP tools exposed under the ${namespace} namespace. Returns concise catalog entries only; call the details tool for schemas.`,
      inputSchema: {
        limit: z.number().int().optional(),
        query: z.string().optional(),
      },
    },
    async (args: { limit?: number; query?: string }) => {
      const structuredContent = searchTools(
        toolDefinitions,
        namespace,
        args.query,
        args.limit ?? 20,
      );
      return {
        content: [
          { text: renderText(structuredContent, maxTextChars), type: "text" },
        ],
        structuredContent,
      };
    },
  );
}

function registerDetailsTool(
  server: McpServer,
  name: string,
  provider: ResolvedToolProvider,
  toolDefinitions: Record<string, McpWrappedToolDefinition>,
  maxTextChars: number,
): void {
  // Cast required: same rationale as registerExecuteTool above.
  const registerTool = server.registerTool.bind(server) as (
    toolName: string,
    config: {
      annotations: ToolAnnotations;
      description: string;
      inputSchema: Record<string, z.ZodTypeAny>;
    },
    handler: (args: { safeName: string }) => Promise<{
      content: Array<{ text: string; type: "text" }>;
      structuredContent: Record<string, unknown>;
    }>,
  ) => void;

  registerTool(
    name,
    {
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
      description: `Return the full schema and generated TypeScript declaration for one wrapped ${provider.name} MCP tool.`,
      inputSchema: {
        safeName: z.string(),
      },
    },
    async (args: { safeName: string }) => {
      const structuredContent = getToolDetails(
        provider,
        toolDefinitions,
        args.safeName,
      );
      return {
        content: [
          { text: renderText(structuredContent, maxTextChars), type: "text" },
        ],
        structuredContent,
      };
    },
  );
}

function attachOwnedClose(
  server: McpServer,
  closeOwnedResources: () => Promise<void>,
): McpServer {
  const originalClose = server.close.bind(server);
  let closePromise: Promise<void> | undefined;

  server.close = async () => {
    closePromise ??= (async () => {
      const results = await Promise.allSettled([
        originalClose(),
        closeOwnedResources(),
      ]);
      const rejected = results.find(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected",
      );

      if (rejected) {
        throw rejected.reason;
      }
    })();

    return closePromise;
  };

  return server;
}

/**
 * Creates an MCP server that exposes code-execution tools for a wrapped MCP source.
 */
export async function codeMcpServer(
  source: McpToolSource,
  options: CodeMcpServerOptions,
): Promise<McpServer> {
  const maxTextChars = options.maxTextChars ?? DEFAULT_MAX_TEXT_CHARS;
  const mode = options.mode ?? "progressive";
  const names = {
    details: options.names?.details ?? "mcp_get_tool_details",
    execute: options.names?.execute ?? "mcp_execute_code",
    search: options.names?.search ?? "mcp_search_tools",
    single: options.names?.single ?? "mcp_code",
  };
  const handle = await openMcpToolProvider(source, {
    clientInfo: options.clientInfo,
    namespace: options.namespace ?? "mcp",
  });
  const provider = handle.provider;
  const server = new McpServer(
    options.serverInfo ??
      handle.serverInfo ??
      DEFAULT_MCP_CODE_WRAPPER_SERVER_INFO,
  );

  try {
    if (mode === "both" || mode === "progressive") {
      registerSearchTool(
        server,
        names.search,
        provider.name,
        handle.toolDefinitions,
        maxTextChars,
      );
      registerDetailsTool(
        server,
        names.details,
        provider,
        handle.toolDefinitions,
        maxTextChars,
      );
      registerExecuteTool(
        server,
        names.execute,
        provider,
        options.executor,
        maxTextChars,
        `Execute JavaScript against the wrapped ${provider.name} MCP tool namespace. Use the search and details tools before writing code.`,
      );
    }

    if (mode === "both" || mode === "single") {
      registerExecuteTool(
        server,
        names.single,
        provider,
        options.executor,
        maxTextChars,
        `Execute JavaScript against the wrapped ${provider.name} MCP tool namespace.\n\n${provider.types}`,
      );
    }

    return attachOwnedClose(server, handle.close);
  } catch (error) {
    await handle.close().catch(() => {});
    throw error;
  }
}
