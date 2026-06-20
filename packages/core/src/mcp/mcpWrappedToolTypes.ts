import type { ResolvedToolProvider } from "../types";
import { schemaToType } from "../typegen/jsonSchema";
import {
  renderDocComment,
  renderNamespaceDeclaration,
} from "../typegen/render";

const MCP_CALL_TOOL_RESULT_TYPE = [
  "type McpCallToolResult = {",
  "  content: Array<{",
  "    type: string;",
  "    text?: string;",
  "    data?: string;",
  "    mimeType?: string;",
  "    resource?: unknown;",
  "    uri?: string;",
  "    name?: string;",
  "    description?: string;",
  "  }>;",
  "  structuredContent?: unknown;",
  "  isError?: boolean;",
  "  _meta?: Record<string, unknown>;",
  "};",
].join("\n");

/**
 * Generates one wrapped MCP tool declaration exposed to guest code.
 */
export function generateMcpWrappedToolType(
  provider: ResolvedToolProvider,
  safeName: string,
): string {
  const tool = provider.tools[safeName];

  if (!tool) {
    throw new Error(`Unknown wrapped MCP tool: ${safeName}`);
  }

  const comment = renderDocComment([
    ...(tool.description ? [tool.description, ""] : []),
    "Wrapped MCP tool. Inspect structuredContent first, then fall back to content text items.",
  ]);

  return [
    comment,
    `function ${safeName}(input: ${schemaToType(tool.inputSchema)}): Promise<McpCallToolResult>;`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Generates the wrapped MCP tool namespace declarations exposed to guest code.
 */
export function generateMcpWrappedToolTypes(
  provider: ResolvedToolProvider,
): string {
  const declarations = [
    MCP_CALL_TOOL_RESULT_TYPE,
    ...Object.keys(provider.tools).map((safeName) =>
      generateMcpWrappedToolType(provider, safeName),
    ),
  ];

  return renderNamespaceDeclaration(provider.name, declarations);
}

/**
 * Generates the wrapped MCP tool namespace declaration for one selected tool.
 */
export function generateMcpWrappedSingleToolTypes(
  provider: ResolvedToolProvider,
  safeName: string,
): string {
  return renderNamespaceDeclaration(provider.name, [
    MCP_CALL_TOOL_RESULT_TYPE,
    generateMcpWrappedToolType(provider, safeName),
  ]);
}
