import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";

import { openMcpToolProvider } from "@execbox/core/mcp";
import { QuickJsExecutor } from "@execbox/quickjs";

async function main(): Promise<void> {
  const upstreamServer = new McpServer({
    name: "upstream",
    version: "1.0.0",
  });

  upstreamServer.registerTool(
    "search-docs",
    {
      description: "Search documentation.",
      inputSchema: {
        query: z.string(),
      },
      outputSchema: {
        hits: z.array(z.string()),
      },
    },
    async (args) => ({
      content: [{ text: `found ${args.query}`, type: "text" }],
      structuredContent: {
        hits: [args.query],
      },
    }),
  );

  const handle = await openMcpToolProvider({ server: upstreamServer });

  try {
    const executor = new QuickJsExecutor();
    const execution = await executor.execute(
      '(await mcp.search_docs({ query: "quickjs" })).structuredContent',
      [handle.provider],
    );

    console.log("mcp provider example result");
    console.log(
      JSON.stringify(
        {
          execution,
          namespace: handle.provider.name,
          originalToSafeName: handle.provider.originalToSafeName,
        },
        null,
        2,
      ),
    );
  } finally {
    await handle.close();
  }
}

void main();
