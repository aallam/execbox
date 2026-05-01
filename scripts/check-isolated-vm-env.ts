import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

type IsolatedVmContext = {
  eval: (code: string) => Promise<unknown>;
  release?: () => void;
};

type IsolatedVmIsolate = {
  createContext: () => Promise<IsolatedVmContext>;
  dispose: () => void;
};

type IsolatedVmModule = {
  Isolate: new (options?: { memoryLimit?: number }) => IsolatedVmIsolate;
};

export function parseToolVersionsNodeVersion(
  contents: string,
): string | undefined {
  for (const line of contents.split(/\r?\n/u)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const [tool, version] = trimmed.split(/\s+/u);

    if ((tool === "node" || tool === "nodejs") && version) {
      return version;
    }
  }

  return undefined;
}

export function isExpectedNodeVersion(
  activeVersion: string,
  expectedVersion: string,
): boolean {
  return (
    getNodeMajorVersion(activeVersion) === getNodeMajorVersion(expectedVersion)
  );
}

export function formatNodeVersionMismatchMessage(
  activeVersion: string,
  expectedVersion: string,
): string {
  const expectedMajorVersion = getNodeMajorVersion(expectedVersion);

  return [
    `isolated-vm tests must run with Node ${expectedMajorVersion}.x from .tool-versions; active Node is ${activeVersion}.`,
    `Run: mise exec node@${expectedVersion} -- npm run test:isolated-vm`,
  ].join("\n");
}

function getNodeMajorVersion(version: string): string {
  return version.replace(/^v/u, "").split(".")[0] ?? "";
}

export function isNativeAddonVersionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("NODE_MODULE_VERSION") ||
    message.includes("compiled against a different Node.js version") ||
    message.includes("ERR_DLOPEN_FAILED")
  );
}

export function formatNativeAddonFailureMessage(
  error: unknown,
  expectedVersion: string,
): string {
  const message = error instanceof Error ? error.message : String(error);

  return [
    `isolated-vm could not load under Node ${process.version}.`,
    "The native addon may have been built for a different Node ABI.",
    `Run: mise exec node@${expectedVersion} -- npm rebuild isolated-vm`,
    `Then: mise exec node@${expectedVersion} -- npm run test:isolated-vm`,
    `Original error: ${message}`,
  ].join("\n");
}

async function loadIsolatedVmModule(): Promise<IsolatedVmModule> {
  const loaded = await import("isolated-vm");
  const candidate = ("default" in loaded ? loaded.default : loaded) as unknown;

  return candidate as IsolatedVmModule;
}

async function verifyIsolatedVmRuntime(): Promise<void> {
  let isolate: IsolatedVmIsolate | undefined;
  let context: IsolatedVmContext | undefined;

  try {
    const ivm = await loadIsolatedVmModule();
    isolate = new ivm.Isolate({ memoryLimit: 8 });
    context = await isolate.createContext();

    const result = await context.eval("1 + 1");
    if (result !== 2) {
      throw new Error(`isolated-vm smoke check returned ${String(result)}`);
    }
  } finally {
    context?.release?.();
    isolate?.dispose();
  }
}

async function run(): Promise<never | void> {
  const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const expectedVersion = parseToolVersionsNodeVersion(
    readFileSync(path.join(repoRoot, ".tool-versions"), "utf8"),
  );

  if (!expectedVersion) {
    console.error("No nodejs entry found in .tool-versions.");
    process.exit(1);
  }

  if (!isExpectedNodeVersion(process.version, expectedVersion)) {
    console.error(
      formatNodeVersionMismatchMessage(process.version, expectedVersion),
    );
    process.exit(1);
  }

  try {
    await verifyIsolatedVmRuntime();
  } catch (error) {
    if (isNativeAddonVersionError(error)) {
      console.error(formatNativeAddonFailureMessage(error, expectedVersion));
    } else {
      console.error(
        `isolated-vm preflight failed under Node ${process.version}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    process.exit(1);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await run();
}
