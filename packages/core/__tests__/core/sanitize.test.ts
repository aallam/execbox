import { describe, expect, it } from "vitest";
import { sanitizeIdentifier } from "../../src/identifier";
import { sanitizeToolName } from "../../src/sanitize";

describe("sanitizeToolName", () => {
  it("replaces punctuation and spaces with underscores", () => {
    expect(sanitizeToolName("my-tool.with spaces")).toBe("my_tool_with_spaces");
  });

  it("prefixes names that start with a digit", () => {
    expect(sanitizeToolName("3d.render")).toBe("_3d_render");
  });

  it("rewrites reserved words safely", () => {
    expect(sanitizeToolName("delete")).toBe("delete_");
  });

  it("falls back to an underscore for empty names", () => {
    expect(sanitizeToolName("")).toBe("_");
  });
});

describe("sanitizeIdentifier", () => {
  it("removes leading and trailing replacement underscores", () => {
    expect(sanitizeIdentifier("  ---tool name---  ")).toBe("tool_name");
  });

  it("preserves internal underscores while trimming the edges", () => {
    expect(sanitizeIdentifier("tool---name")).toBe("tool_name");
  });

  it("falls back to an underscore when all characters are trimmed away", () => {
    expect(sanitizeIdentifier("---")).toBe("_");
  });
});
