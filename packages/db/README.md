# @sevendays/db

Drizzle schema + client + the catalog seeder. The schema is the shared data
model (the package boundary is ADR-0003); migrations are generated via
`db:generate` and applied via `db:migrate` — never hand-edited under
`migrations/`.

## The seed contract (bootstrap/dev-only)

`pnpm --filter @sevendays/db db:seed` is a **bootstrap and dev-reset tool**.
Its natural-key upserts exist to stand up a fresh environment from
`docs/catalog.md` and to reset a dev database. It **never runs against
production content**: the admin CMS owns the catalog, and a seed re-run
after real edits would overwrite them by design — that is what "reset"
means. `docs/catalog.md` remains the seed's input of record; the CMS is the
catalog's.
