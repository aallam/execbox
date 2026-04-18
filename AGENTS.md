# AGENTS.md

## Project Overview

- `execbox` is a Node.js 22+ npm workspace that publishes the `@execbox/*` package family.
- Core source lives under `packages/*/src`, tests live under `packages/*/__tests__`, runnable examples live under `examples/`, and the public docs site lives under `docs/`.
- The workspace currently contains `@execbox/core`, `@execbox/protocol`, `@execbox/quickjs`, `@execbox/remote`, `@execbox/process`, `@execbox/worker`, and `@execbox/isolated-vm`.
- Keep changes aligned with existing package boundaries. Prefer changing the owning package instead of introducing cross-package shortcuts.

## Setup Commands

- Install dependencies: `npm ci`
- Lint: `npm run lint`
- Type-check: `npm run typecheck`
- Test default workspace lanes: `npm test`
- Build published packages: `npm run build`
- Build docs site: `npm run docs:build`
- Run security-focused suites: `npm run test:security`
- Run isolated-vm tests only when needed: `npm run test:isolated-vm`
- Run the full isolated-vm verification lane: `npm run verify:isolated-vm`

## Codebase Conventions

- Do not edit generated `dist/` output under `packages/*/dist`; build artifacts are produced from source.
- Preserve the existing ESM + TypeScript workspace structure and root script orchestration.
- When you change exported APIs in `packages/*/src`, keep JSDoc in sync. ESLint requires JSDoc coverage for exported package symbols.
- Prefer inline type imports where possible; the ESLint config enforces `@typescript-eslint/consistent-type-imports`.
- Update examples or docs when you change public package behavior, developer workflow, or recommended runtime choices.

## Testing Instructions

- For most code changes, run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
- If you change the public API of `@execbox/core`, `@execbox/core/mcp`, or `@execbox/protocol`, also run `npm run api:check`.
- If you change docs site content, navigation, or VitePress config, also run `npm run docs:build`.
- If you touch execution boundaries, timeout handling, abort propagation, schema validation, or log/memory controls, also run `npm run test:security`.
- If you touch `@execbox/isolated-vm` or codepaths guarded by `VITEST_INCLUDE_ISOLATED_VM`, run `npm run test:isolated-vm` or `npm run verify:isolated-vm`.

## Security Notes

- The provider and tool surface is the real capability boundary. Treat additions to provider exposure as security-relevant changes.
- Preserve JSON-only boundaries, schema validation, bounded logs, timeout handling, memory controls, and abort propagation semantics.
- Do not describe in-process runtimes as a hard security boundary for hostile or multi-tenant code. The current project security model is documented in `docs/security.md`.

## Release Notes

- Use Conventional Commits for git commit messages, for example `docs: add agent and contributor guides` or `fix(worker): handle timeout classification`.
- Published package releases are managed with Changesets and GitHub Actions.
- Add a `.changeset/*.md` entry when a change affects published package behavior, public APIs, or release notes for one or more `@execbox/*` packages.
- If you intentionally change a checked-in API report for `@execbox/core`, `@execbox/core/mcp`, or `@execbox/protocol`, update it with `npm run api:update` in the same change as the code and changeset.
- Skip a changeset for docs-only, examples-only, CI-only, or internal maintenance changes that do not affect published package behavior.

## Useful References

- Start with `README.md` for the package map.
- Use `docs/getting-started.md` for install and example expectations.
- Use `docs/security.md` and `docs/architecture/README.md` before changing execution boundaries or runtime claims.
- For the human-oriented contribution workflow, see `CONTRIBUTING.md`.
