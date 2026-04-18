# Contributing

Thanks for contributing to `execbox`.

This guide is for both humans and coding agents. Agent-specific operating instructions live in `AGENTS.md`.

## Development Setup

- Use Node.js 22 or newer. CI runs on Node 22 and Node 24.
- Install dependencies with `npm ci`.
- The repo is an npm workspace. Packages live under `packages/`, runnable examples live under `examples/`, and the public docs site lives under `docs/`.

## Working In This Repo

- Make changes in the package that owns the behavior you are updating.
- Keep exported API documentation current when you change exported symbols in `packages/*/src`; the ESLint config requires JSDoc for exported package APIs.
- Update tests with behavior changes.
- Update examples and docs when public behavior, recommended setup, or runtime tradeoffs change.

## Verification

- General code changes: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`
- Docs site changes: `npm run docs:build`
- Security or execution-boundary changes: `npm run test:security`
- `@execbox/isolated-vm` changes: `npm run test:isolated-vm` or `npm run verify:isolated-vm`

Choose the smallest verification set that covers your change, and include the commands you ran in your PR or handoff notes when the context would help reviewers.

- Public API changes to `@execbox/core`, `@execbox/core/mcp`, `@execbox/protocol`, `@execbox/quickjs`, `@execbox/quickjs/runner`, or `@execbox/quickjs/runner/protocol-endpoint`: run `npm run api:check`

## Changesets

- Add a `.changeset/*.md` file for user-facing changes to published `@execbox/*` packages.
- Skip changesets for docs-only, examples-only, CI-only, or internal refactors that do not change published package behavior.
- Keep the changeset summary focused on the externally visible change.
- If you intentionally change a checked-in API report, update the report baseline with `npm run api:update` and add the corresponding changeset in the same change.

## Commits

- Use Conventional Commits for git commit messages.
- Pick the smallest truthful type for the primary change, such as `docs`, `fix`, `feat`, `refactor`, `test`, or `ci`.
- Keep the subject concise and imperative, for example `docs: document contributor workflow`.

## Pull Requests

- Keep each PR focused on one change or closely related set of changes.
- Mention which packages, examples, or docs areas are affected.
- Call out any docs, example, test, or changeset updates that are part of the change.
- If you change runtime boundaries, security-sensitive behavior, or public API expectations, say so explicitly in the PR description.
