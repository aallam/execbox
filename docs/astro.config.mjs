import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import mermaid from "astro-mermaid";

export default defineConfig({
  site: "https://execbox.aallam.com",
  integrations: [
    mermaid({
      autoTheme: true,
      enableLog: false,
      mermaidConfig: {
        securityLevel: "loose",
      },
    }),
    starlight({
      title: "execbox",
      description:
        "Portable code execution for MCP tools and wrapped MCP servers.",
      customCss: ["/src/styles/custom.css"],
      lastUpdated: true,
      pagefind: true,
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/aallam/execbox",
        },
      ],
      sidebar: [
        {
          label: "Start",
          items: [
            { label: "Overview", link: "/" },
            { label: "Getting Started", slug: "getting-started" },
            { label: "Runtime Choices", slug: "runtime-choices" },
          ],
        },
        {
          label: "Use",
          items: [
            { label: "Examples", slug: "examples" },
            {
              label: "MCP Provider",
              slug: "architecture/execbox-mcp-and-protocol",
            },
          ],
        },
        {
          label: "Understand",
          items: [
            { label: "Security", slug: "security" },
            { label: "Architecture", slug: "architecture" },
            { label: "Performance", slug: "performance" },
          ],
        },
        {
          label: "Reference",
          items: [
            {
              label: "Protocol",
              slug: "architecture/execbox-protocol-reference",
            },
          ],
        },
      ],
    }),
  ],
});
