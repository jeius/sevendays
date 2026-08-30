# packages/config — Shared Config (Biome, TypeScript, Vitest)

Exports shared tooling config for the monorepo.

## What this package exports

- `@sevendays/config/ts/*` — TypeScript configs: `base.json`, `node.json`, `react.json`, `vite.json` (src/typescript/)
- `@sevendays/config/biome/*` — Biome configs (src/biome/): `base.json` (runtime-neutral) + tier fragments `vite.json` (landing/admin), `worker.json` (api), `node.json` (libraries). Consumers extend **both** base and their fragment — fragments are deltas, they do not extend base themselves (nested extends breaks `files.includes` propagation).
- `@sevendays/config/vitest` — Vitest shared config

## Rules

- Packages extend the runtime-appropriate `@sevendays/config/ts/<runtime>.json` and import biome config from here. Don't hand-roll a tsconfig or biome config in a package.
- Shared strict-baseline changes land in `packages/config/src/typescript/{base,node,react,vite}.json`, not duplicated per consumer.
- No domain vocabulary — no CONTEXT.md. See root `AGENTS.md` and `CONTEXT-MAP.md`.

## Pointer to root

Cross-cutting (commands, conventions, commit style) → root `AGENTS.md`.
