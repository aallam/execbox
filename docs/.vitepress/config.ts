import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

export default withMermaid(
  defineConfig({
    title: "execbox",
    description:
      "Portable code execution for MCP tools and wrapped MCP servers.",
    base: "/",
    cleanUrls: true,
    lastUpdated: true,
    mermaid: {
      securityLevel: "loose",
    },
    themeConfig: {
      footer: {
        copyright: "Copyright © 2026 Mouaad Aallam",
        message: "Released under the MIT License.",
      },
      nav: [
        { link: "/getting-started", text: "Getting Started" },
        { link: "/examples", text: "Examples" },
        { link: "/architecture/", text: "Architecture" },
        { link: "/performance/", text: "Performance" },
        { link: "/security", text: "Security" },
      ],
      search: {
        provider: "local",
      },
      sidebar: {
        "/architecture/": [
          {
            items: [
              { link: "/architecture/", text: "Overview" },
              { link: "/architecture/execbox-core", text: "Core" },
              { link: "/architecture/execbox-executors", text: "Executors" },
              {
                link: "/architecture/execbox-mcp-and-protocol",
                text: "MCP And Protocol",
              },
              {
                link: "/architecture/execbox-remote-workflow",
                text: "Remote Workflow",
              },
              {
                link: "/architecture/execbox-protocol-reference",
                text: "Protocol Reference",
              },
              {
                link: "/architecture/execbox-runner-specification",
                text: "Runner Specification",
              },
            ],
            text: "Architecture",
          },
        ],
        "/performance/": [
          {
            items: [{ link: "/performance/", text: "Overview" }],
            text: "Performance",
          },
        ],
      },
      socialLinks: [
        { icon: "github", link: "https://github.com/aallam/execbox" },
      ],
      siteTitle: "execbox",
    },
  }),
);
