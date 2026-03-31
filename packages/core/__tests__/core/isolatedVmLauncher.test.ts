import { describe, expect, it } from "vitest";

import {
  buildAbiMismatchMessage,
  buildUnsupportedNodeMessage,
  classifyPreflightFailure,
  getIsolatedVmCommandSpec,
  isSupportedIsolatedVmNodeMajor,
} from "../../../../scripts/isolatedVmLauncher";

describe("isolatedVmLauncher", () => {
  it("accepts supported Node majors", () => {
    expect(isSupportedIsolatedVmNodeMajor(22)).toBe(true);
    expect(isSupportedIsolatedVmNodeMajor(24)).toBe(true);
  });

  it("rejects unsupported Node majors", () => {
    expect(isSupportedIsolatedVmNodeMajor(25)).toBe(false);
  });

  it("classifies ABI mismatch failures", () => {
    const stderr =
      "The module '/tmp/execbox/node_modules/isolated-vm/out/isolated_vm.node'\n" +
      "was compiled against a different Node.js version using\n" +
      "NODE_MODULE_VERSION 141. This version of Node.js requires\n" +
      "NODE_MODULE_VERSION 137.";

    expect(classifyPreflightFailure(stderr)).toBe("abi-mismatch");
    expect(buildAbiMismatchMessage()).toContain("npm rebuild isolated-vm");
  });

  it("returns a clear unsupported-node message", () => {
    expect(buildUnsupportedNodeMessage("v25.8.2")).toContain("Node 22 or 24");
  });

  it("uses the raw example and test scripts", () => {
    expect(getIsolatedVmCommandSpec("example").args).toEqual([
      "--no-node-snapshot",
      "--import",
      "tsx",
      "examples/execbox-isolated-vm-basic.ts",
    ]);
    expect(getIsolatedVmCommandSpec("example").env).toEqual({
      NODE_OPTIONS: "--no-node-snapshot",
    });
    expect(getIsolatedVmCommandSpec("test").args).toEqual([
      "--no-node-snapshot",
      "./node_modules/vitest/vitest.mjs",
      "run",
      "packages/isolated-vm/__tests__",
    ]);
    expect(getIsolatedVmCommandSpec("test").env).toEqual({
      NODE_OPTIONS: "--no-node-snapshot",
      VITEST_INCLUDE_ISOLATED_VM: "1",
    });
  });
});
