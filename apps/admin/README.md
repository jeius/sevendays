# Sevendays Admin

Internal dashboard for the Sevendays Photography studio (3 branches). Ships the app shell + information architecture (M3): labeled sidebar collapsing to an icon rail, stub screens naming their owning milestones. Staff auth lands with M4, content management (incl. R2 cover-photo uploads) with M5, and the appointments dashboard with v2.

## Commands (from the repo root)

- Dev: `pnpm --filter @sevendays/admin dev`
- Build: `pnpm --filter @sevendays/admin build`
- Lint / format / typecheck ride the repo's `pnpm lint` / `pnpm fix` / `pnpm typecheck`

Deployed as a Cloudflare Worker (TanStack Start on `@cloudflare/vite-plugin`) — see `wrangler.jsonc` and `docs/architecture.md`.

The UI is the shared design system: Tier-1 primitives live in `packages/ui` (ADR-0017) on the Base UI base; app components here compose them app-locally. Dev requires `apps/admin/.env.local` (`API_URL`) — see `.env.example`.
