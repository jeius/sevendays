# Map #298 research: admin global search — command palette vs inline dropdown, client-side vs server-side

Research findings for issue #301 (child of wayfinder map #298 "admin notifications & search"). Scope: pin the modern approaches + best practices for admin-dashboard global search over a small CMS catalog, so the downstream scope + prototype tickets can build on one recommendation. Surveyed: the command-palette pattern (cmdk et al.) vs a topbar inline dropdown; client-side fuzzy search (fuse.js over prefetched lists) vs server-side search (Postgres pg_trgm/FTS behind new API endpoints); keyboard-entry conventions (⌘K); what comparable TanStack Start + Hono stacks do.

All citations are current primary-source pages (cmdk, shadcn, Base UI, Fuse.js, PostgreSQL, Drizzle, Hono, React docs, and the referenced GitHub repos) fetched 2026-11-15. The research skill's primary-source discipline was followed: every load-bearing claim below traces to a fetched doc page or the repo itself (worktree at `origin/main` @ `6f74c36`). One secondary citation (Nielsen Norman Group) could not be fetched directly and is labeled as such.

## 0. Executive summary

- **Recommendation: a ⌘K command palette** (the shadcn `command` component, cmdk-based, pulled into `packages/ui` via the already-wired `shadcn add command` on the `base-rhea` style) **searching a client-side index built from the #288-cached admin list queries**, with **fuse.js as the fuzzy engine** (one variant for the prototype ticket keeps cmdk's built-in scoring for zero extra deps). The existing topbar Input becomes the palette's visible trigger; ⌘K / Ctrl+K opens it from anywhere.
- **Client-side beats server-side by a wide margin at this scale.** The four v1 search entities (packages, branches, testimonials, gallery) are dozens of rows each, already fetched and 5-minute-cached by M8 #288's query factories with shell-priming — the search index is free. Server-side search would buy nothing the user can perceive while costing four new session-gated endpoints (route + Zod schema in `packages/types` + api-client wrapper + loopback tests each, per ADR-0006) and a second freshness path.
- **Inline topbar dropdown loses on convention, keyboard, and mobile.** It is buildable (Base UI's new Autocomplete primitive fits it well) and stays on the table as the prototype's posture variant, but the palette is the ecosystem-standard for shadcn/TanStack admins, handles grouped multi-entity results with full keyboard navigation, and — unlike the topbar Input, which is `hidden … sm:block` — works on mobile.
- **Spec consequence for map #298:** with client-side search, "search ranking/field-tuning details" stays a client concern and does **not** graduate to server work; the v2-fence lines to write down are appointments/users/audit-log search plus the server-side graduation triggers (Section 7).

## 1. Repo facts that decide this question

Every fact below was verified in the worktree at `origin/main` @ `6f74c36`.

1. **No `command` primitive exists yet.** `packages/ui/src/components/` holds 24 components (button, input, dialog, popover, dropdown-menu, sidebar, tooltip, …) — no `command`. No `cmdk` or `fuse.js` dependency anywhere (`packages/ui/package.json`, `apps/admin/package.json`). The vendored `sidebar.tsx` carries no cmdk slot (unlike upstream shadcn templates).
2. **`shadcn add command` is available on this repo's style.** `packages/ui/components.json` pins `"style": "base-rhea"`. The shadcn registry serves a base-rhea `command` component: npm dependencies `cn` + `cmdk`, registry dependencies `dialog` + `input-group` (verified in the registry JSON, see Evidence). `dialog` already exists in `packages/ui`; `input-group` would arrive with it. M3 #95 wired `shadcn add` from either app, routing primitives into `packages/ui`.
3. **The lists a search index needs are already fetched, cached, and shell-primed.** `apps/admin/src/lib/cms-queries.ts` (M8 #288, the Warm/Cold contract) gives every CMS entity a shared factory with `CMS_STALENESS_MS = 300_000` and `refetchOnWindowFocus: true`, including exactly the four v1 search cores: `adminPackageQueries`, `adminBranchQueries`, `adminTestimonialQueries`, `adminGalleryQueries.photos()`/`.categories()`. Loader-priming thunks (lines ~205–210) warm them at shell load. Own-mutation invalidation overrides staleness, so search results can never be staler than the screens they navigate into — the same freshness contract the screens already have.
4. **Admin list reads are full arrays, no pagination.** e.g. `listAdminTestimonials` / `listAdminGalleryPhotos` in `apps/api/src/services/admin-gallery.ts` are `select()` all rows ordered `(position, id)`. Nothing to paginate around on the client; the whole searchable corpus arrives in the list payloads the admin already holds.
5. **Admin reads include deactivated rows** (the All/Active/Deactivated segment lives on every list). Deactivated items are exactly what an admin often needs to find (find-then-reactivate); a client index over the admin reads gets them for free, whereas search over *public* reads would not (e.g. the public branches read is active-only).
6. **Searchable text per entity** (Drizzle schema, `packages/db/src/schema/`): packages — `name`, `description`, `slug`; branches — `name`, `address`, `phone`; testimonials — `quote`, `person`; gallery photos — `title` (nullable), `caption` (nullable); gallery categories — `name`. Short fields, no long-form documents anywhere.
7. **Scale is dozens of rows per entity.** A photography studio with 3 branches; the seed (`packages/db/scripts/catalog.ts`) carries a handful of packages/studio services; gallery grows by staff upload. Total searchable corpus across the four cores is comfortably under a few hundred rows today.
8. **No search endpoints exist in `apps/api`.** No route takes a query param today. Per the house rules, each new read means a thin route + logic in a service + a Zod schema added to `packages/types` + an api-client wrapper (ADR-0006 — the only supported path) + loopback tests, session-gated for admin data (the M4 cookie→Bearer seam).
9. **The inert topbar search Input** (`apps/admin/src/components/admin-topbar.tsx`) is `hidden w-56 sm:block` — invisible below `sm`. Any search UI anchored to it inherits that mobile gap; a dialog-based palette does not.
10. **Navigation targets exist for every entity**: `/packages/$packageId/edit`, `/packages/new`, `/branches`, `/testimonials`, `/gallery`, … (`apps/admin/src/routes/`).
11. **React 19.2** in the admin (`apps/admin/package.json`) — cmdk needs React 18+ hooks (`useId`, `useSyncExternalStore`) and `useDeferredValue` is available for responsive filtering.

## 2. UI pattern: command palette (cmdk) vs topbar inline dropdown

### 2.1 The command palette

cmdk describes itself as a "Fast, unstyled command menu React component that can also be used as an accessible combobox. You render items, it filters and sorts them automatically." Key facts from the README:

- Composable parts: `Command`, `Command.Dialog`, `Command.Input`, `Command.List`, `Command.Item` (with optional `keywords` for extra match terms), `Command.Group` (hidden by attribute, not unmounted), `Command.Empty`, `Command.Separator`, `Command.Loading`, plus a `useCommandState` hook. `loop` wraps arrow-key navigation.
- `Command.Dialog` composes Radix UI's Dialog; the README recommends Radix Popover for popover usage. (In the shadcn base-rhea wrapper, `CommandDialog` composes the repo's own Base-UI-based dialog primitive — the registry dependency is the local `dialog`, see Section 1 fact 2.)
- Filtering: a built-in scored filter, a custom `filter` prop, or `shouldFilter={false}` — which the FAQ notes gives "better memory usage and performance" and enables bring-your-own filtering/sorting. This is exactly the hook for a fuse.js-driven palette.
- Performance: no built-in virtualization; built-in filtering "performs well up to roughly 2,000–3,000 items" — three orders of magnitude above this catalog.
- Keyboard: cmdk deliberately ships **no keybind listener** — the FAQ answers "No, do it yourself to have full control over keybind context" — the README's own example is a `keydown` listener toggling on `k` with meta/ctrl held.
- Unstyled (styling via `cmdk-*` selectors), client-only, tested accessible with VoiceOver.

The shadcn `Command` component is the styled wrap of cmdk: current docs present it with **Base UI as the default style variant** (beside React Aria and Radix variants), installed with `pnpm dlx shadcn@latest add command`, exposing `CommandDialog`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`, `CommandSeparator`, `CommandShortcut` — and pointing back to cmdk for the deeper API.

**Trade-offs.** Pros: the ecosystem-standard global-search surface for shadcn/TanStack admins (Section 5); grouped multi-entity results with headings; complete keyboard model (arrows/enter/escape/loop) bought, not built; a dialog works on mobile and dims the page behind; `keywords` lets one item match more than its label; extendable later to command-style actions (theme toggle, navigation shortcuts) without a redesign; on this repo's base it is one `shadcn add command` away (plus `input-group` riding along). Cons: brings the `cmdk` npm dependency into `packages/ui`; an overlay is modal where a dropdown is glanceable; ⌘K alone is an expert gesture — mitigated by keeping the visible topbar Input as a click-to-open trigger (the shadcn-admin pattern, Section 5); per the spec #94 amendment, new compositions get rendered variants — so the prototype ticket owes the owner palette-posture variants regardless.

### 2.2 The topbar inline dropdown

Three ways to build it on this repo's primitives:

- **Existing `popover` + `input`** (`packages/ui` has both): zero new dependencies, fully bespoke. Cost: hand-rolled list keyboarding and grouping semantics — precisely the part cmdk has already solved and tested.
- **Base UI `Autocomplete`** (the repo's primitive base shipped one; docs: "An input that suggests options as you type"): free-form input, popup list with `Group`/`GroupLabel`, built-in `filter` plus `Autocomplete.useFilter()` (e.g. `contains` with `sensitivity: 'base'`), `filter={null}` to drive results externally, an async example using `AbortController` + `useTransition` + a `Status` part, `limit`, and virtualization via `@tanstack/react-virtual` (memoized items viable to ~1,000 entries). Its usage guidelines position it as the search-widget primitive — Combobox's own docs say "For search widgets, consider using Autocomplete instead" (Combobox is "a filterable Select" that "does not allow free-form text input").
- **Base UI `Combobox`**: wrong tool per its own guidelines (selection state, closed vocabulary) — listed only to rule it out.

**Trade-offs.** Pros: no new npm dep (popover route); results render in-place next to the input; no modal. Cons: anchoring grouped, scrollable, four-entity results inside a `h-14` topbar is cramped and fights the mobile gap (fact 9 — the Input itself is hidden below `sm`); keyboard conventions are weaker/bespoke (or, on Autocomplete, single-list oriented rather than command-oriented); adding actions or navigation commands later means outgrowing the widget; a11y is only as good as the composition (cmdk is VoiceOver-tested out of the box).

### 2.3 The hybrid posture (what the recommendation actually is)

The two patterns are not exclusive: the ecosystem standard is a **visible search input in the topbar that opens the palette** on focus/click, with ⌘K as the accelerator. That keeps the discoverable affordance the topbar already has (the present-but-inert Input from M3) and adds the keyboard path. The prototype ticket should render this posture plus the pure-dialog variant for the owner to react to.

## 3. Engine: client-side fuzzy vs server-side (pg_trgm/FTS)

### 3.1 Client-side fuzzy over prefetched lists

Three tiers, all compatible with cmdk via `shouldFilter={false}` or the custom `filter` prop:

- **cmdk's built-in scored filter** — zero extra dependencies; handles the dozens-of-rows corpus trivially. Weakest typo tolerance.
- **fuse.js** — "Lightweight fuzzy-search library, with zero dependencies," typo-tolerant via the Bitap algorithm; `keys` with per-key **weights** (name > quote > slug), `includeScore`, extended-search operators and `$and`/`$or` if ever needed; bundle cost 6.8 kB gzip (basic build) / 8.6 kB (full). The weighted multi-key model maps one-to-one onto the per-entity field table (fact 6) — one fuse instance over a flattened cross-entity index, weights encoding field priority.
- **match-sorter** — the filter Base UI's own docs use in their fuzzy-filter example; lighter than fuse but no distance-based typo tolerance. Worth naming as the third rail, not the pick.

Responsiveness on React 19: `useDeferredValue` is the documented tool for "keeping input responsive during expensive re-renders" — the filter pass runs against a deferred query, the re-render is interruptible ("if the user types again, React abandons it and restarts"), with the docs' caveats (memo the list child; pass stable index objects). At this corpus size this is belt-and-suspenders, but it is the house-idiomatic shape and costs one line.

**Trade-offs.** Pros: zero API work — the index is `useQueries` over the four #288 factories the shell already primes; instant (no Worker→Supabase round trip per keystroke); inherits #288's freshness semantics exactly (5-minute staleness background refetch, own-mutation invalidation) so results and screens can never disagree; finds deactivated rows (fact 5); index shape (label/sublabel/keywords/route) is pure app-local presentation, no schema pressure. Cons: corpus limited to what the list reads return (true today for all four cores); typo-tolerance tuning (threshold, weights) is client-side taste the prototype variants should settle; memory grows with the catalog — irrelevant below thousands of rows.

### 3.2 Server-side: pg_trgm / FTS behind new endpoints

What Postgres actually offers (both extensions available on Supabase):

- **pg_trgm** — "functions and operators for determining the similarity of alphanumeric text based on trigram matching, plus index operator classes." `similarity(text, text)` (0–1), the `%` threshold operator, GIN (larger/static data) and GiST (supports nearest-neighbor `ORDER BY t <-> 'word' LIMIT k`) indexes; since PostgreSQL 9.1 these indexes also accelerate `LIKE`/`ILIKE`. This is the right server-side tool for typo-tolerant matching over short fields — `ILIKE '%q%'` with a trigram GIN index is the boring-good version.
- **Full-text search** — designed for natural-language *documents*: `tsvector` lexemes, stemming dictionaries, `@@` with `tsquery`, GIN indexes, `ts_rank` ordering. The docs' own contrast is the verdict here: FTS exists because plain pattern matching has "no linguistic support," "no ordering (ranking) of results… when thousands of matching documents are found," and "no index support." None of those three pain points exists at dozens of short rows — FTS would add lexeme maintenance and query-shape complexity for nothing pg_trgm (or the client) doesn't already cover.
- **Drizzle surface**: `ilike(table.column, '%q%')` (parameterized automatically) inside `and`/`or`; raw `sql` templates reach `similarity()` if ranked trigram search were wanted. All DB access stays inside `packages/db` per house rules.
- **Transport**: any endpoint rides the Hono RPC chain — `hc<AppType>` with `InferRequestType`/`InferResponseType` (ADR-0006 client, Zod-parsed), admin reads session-gated over the M4 seam. Note also that the admin entity reads are **not** the #263 edge-cached public surface — a public search endpoint would open new cache-semantics decisions; an admin search endpoint sidesteps them but adds the four-endpoint bill.

**Trade-offs.** Pros: authoritative freshness at query time; scales past what you'd prefetch; one ranking authority; the only option for entities never list-prefetched. Cons at this scale: four endpoints × (route + `packages/types` schema + api-client wrapper + loopback tests); a freshness paradox — server-fresh hits navigate into 5-minute-stale screens, so the perceived consistency is *worse* than the client index that shares the cache; per-keystroke latency vs local filtering; index migrations if trigram/FTS indexes are added; and it re-fetches data the browser already holds.

### 3.3 Verdict

Client-side. The deciding facts are #288 (the data is already cached in the exact shape needed), fact 4/5 (full lists incl. deactivated rows), and fact 7 (corpus size is ~10³× below where server-side machinery pays for itself).

## 4. Keyboard-entry conventions (⌘K)

- **⌘K / Ctrl+K is the de-facto open gesture** for command palettes: cmdk's README demo and FAQ (which defers the listener to the app "to have full control over keybind context"), and shadcn's `CommandDialog` examples. On this repo: one `keydown` listener in a client component at the shell level matching `(metaKey || ctrlKey) && key === 'k'`; only modified combos are globally safe (plain-letter shortcuts would steal keystrokes from inputs).
- In-palette: ↑/↓ move (with `loop` wrapping), ⏎ selects, Esc closes (dialog primitive behavior), typing filters. `CommandShortcut` renders affordances like "⌘P" on items if actions ever join the palette.
- The palette-as-accelerator posture (discoverable trigger + expert shortcut) matches the long-standing usability guidance on accelerators — Nielsen Norman Group's ["Accelerators Maximize Efficiency in User Interfaces"](https://www.nngroup.com/articles/accelerators/) (Oct 2024) is the usual citation; the page could not be fetched directly for this survey, so it is corroboration, not a load-bearing source.

## 5. What comparable TanStack Start + Hono stacks do

- **The ecosystem reference is [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin)** (~16.7k stars): TanStack Router + Vite SPA + shadcn; its README feature list leads with "Global search command," implemented with the shadcn Command component (cmdk) opened from the topbar search trigger. This is the pattern the repo's own shadcn-base invites.
- **TanStack Start admins** (e.g. [arhamkhnz/tanstack-shadcn-admin-dashboard](https://github.com/arhamkhnz/tanstack-shadcn-admin-dashboard) — TanStack Start, React 19, Tailwind v4, shadcn) ship no global search at all — notable mainly as evidence that TanStack Start has **no first-party search/command primitive**: search is an ordinary React client concern, and cmdk (a plain React 18+ library) drops in unchanged. Roundups of TanStack Start admin templates list "global command search" as a headline shadcn-template feature (secondary source, [adminlte.io roundup](https://adminlte.io/blog/tanstack-start-admin-dashboard-templates)).
- **Hono adds nothing search-specific.** The comparable-stack question lives entirely in the frontend: Hono's role would only be transport (the RPC client) if server-side search were ever built. No Hono-community admin-search pattern exists to copy — the cmdk-over-prefetched-data shape is the React/shadcn-layer consensus.

## 6. Options with trade-offs

| | A. cmdk palette + client index (cmdk filter) | B. cmdk palette + fuse.js | C. Topbar inline dropdown + client filter | D. Server-side pg_trgm (or FTS) endpoints |
|---|---|---|---|---|
| New primitives/deps | `command` (+`input-group`) | A + `fuse.js` (6.8 kB gzip) | none (popover+input) or none-new-but-bespoke; Autocomplete would also be a pull | none UI-side; 4 endpoints + schemas + client wrappers (+ optional trgm migration) |
| API/packages work | **zero** | **zero** | **zero** | large (ADR-0006 chain ×4, session-gated) |
| Freshness | rides #288 exactly (≤5 min + invalidation) | same | same | query-fresh but navigates into 5-min-stale screens |
| Deactivated rows | found (admin lists) | found | found | only if built on admin-session reads |
| Typo tolerance | weak (subsequence scoring) | **strong (Bitap, weighted keys)** | depends on filter chosen | strong (trgm) / linguistic (FTS, overkill) |
| Keyboard + a11y | **best (cmdk, VoiceOver-tested)** | same | bespoke or single-list oriented | depends on UI choice |
| Mobile | **works (dialog)** | same | topbar Input hidden < `sm` | depends on UI choice |
| Scales to | ~2–3k items built-in | thousands, easily | ~1k memoized (Autocomplete docs) | unbounded (the only option that is) |
| Extensible to actions later | **yes (palette = commands + results)** | same | awkward | n/a |

## 7. Recommendation — what the scope + prototype tickets build on

**Build option B (with A as the rendered variant): a ⌘K command palette over a client-side fuse.js index built from the #288-cached admin list queries, the topbar Input as its visible trigger.**

Concrete shape for the downstream tickets:

1. **Primitive**: `pnpm dlx shadcn@latest add command` from `apps/admin` (routes into `packages/ui` on `base-rhea`; `dialog` already present, `input-group` arrives with it; npm dep `cmdk`). `fuse.js` joins `apps/admin` deps (or is deferred if variant A wins).
2. **Trigger**: repurpose the inert Input in `admin-topbar.tsx` into a button-like trigger (readonly, ⌘K hint), click/focus opens the palette; shell-level ⌘K/Ctrl+K listener (modified combos only). Works on mobile where the Input is hidden today.
3. **Index**: `useQueries` over `adminPackageQueries.all()`, `adminBranchQueries.all()`, `adminTestimonialQueries.all()`, `adminGalleryQueries.photos()` + `.categories()` — warm navigation, zero extra network. Flatten to `{ entity, id, label, sublabel, keywords, to }`.
4. **Filter**: fuse.js with weighted keys (name/title/person > quote/caption/address/description > slug), `includeScore`, `limit` per entity; drive cmdk with `shouldFilter={false}`; `useDeferredValue` + a memo'd result list for typing responsiveness. Variant A: drop fuse, use cmdk's built-in scoring (zero deps) — the prototype owes the owner both feels, plus the posture variant (palette vs inline dropdown) per the #94 amendment.
5. **Results**: one `CommandGroup` per entity (Packages / Branches / Testimonials / Gallery — categories and photos grouped apart), top-N per entity with counts, `CommandEmpty` for no hits, deactivated items badged.
6. **Select**: `router.navigate({ to })` to the entity's screen (`/packages/$packageId/edit`, `/branches`, `/testimonials`, `/gallery`); palette closes on select.
7. **v1 core stays ruled**: packages, branches, testimonials, gallery. **v2-fence lines for the spec**: appointments/users/audit-log search; and the **server-side graduation triggers** — revisit if gallery photos grow into the thousands, if the owner demands cross-entity ranked authority beyond client taste, or when an entity too large to prefetch (appointments) enters scope. Until then: no pg_trgm/FTS, no migrations, no new endpoints.
8. **Spec consequence (map #298 "Not yet specified")**: "Search ranking/field-tuning details — graduates only if the research lands on a server-side approach" — the research lands client-side, so ranking/field-tuning stays inside the prototype ticket's variant set and does **not** graduate.

## Evidence

Primary sources fetched 2026-11-15:

- cmdk — README (features, Dialog/Radix composition, `filter`/`shouldFilter`, keybind FAQ, ~2–3k item performance, React 18+): https://github.com/pacocoursey/cmdk
- shadcn/ui Command docs (cmdk-based; Base UI default variant; `shadcn add command`; CommandDialog anatomy): https://ui.shadcn.com/docs/components/command
- shadcn registry, base-rhea `command` JSON (npm deps `cn`+`cmdk`; registry deps `dialog`+`input-group`): https://ui.shadcn.com/r/styles/base-rhea/command.json
- Base UI Autocomplete (search-widget primitive; `filter={null}`, `useFilter`, async/AbortController example, virtualization, ~1,000-item memoization): https://base-ui.com/react/components/autocomplete
- Base UI Combobox ("a filterable Select"; "For search widgets, consider using Autocomplete instead"): https://base-ui.com/react/components/combobox
- Fuse.js (zero-dep Bitap fuzzy; keys/weights; 6.8/8.6 kB gzip builds): https://www.fusejs.io/
- PostgreSQL pg_trgm (trigrams, `similarity`/`%`, GIN/GiST, LIKE/ILIKE acceleration): https://www.postgresql.org/docs/17/pgtrgm.html
- PostgreSQL FTS intro (tsvector/tsquery, GIN, what FTS is for vs pattern matching): https://www.postgresql.org/docs/current/textsearch-intro.html
- Drizzle ORM operators (`ilike`, `and`/`or`, parameterization): https://orm.drizzle.team/docs/operators
- Hono RPC guide (`hc<AppType>`, Infer types, monorepo constraints): https://hono.dev/guides/rpc
- React `useDeferredValue` (interruptible deferred re-render; memo caveat): https://react.dev/reference/react/useDeferredValue
- satnaing/shadcn-admin (TanStack Router + shadcn; "Global search command"): https://github.com/satnaing/shadcn-admin
- arhamkhnz/tanstack-shadcn-admin-dashboard (TanStack Start + React 19 + shadcn; no first-party search): https://github.com/arhamkhnz/tanstack-shadcn-admin-dashboard

Secondary (labeled, not load-bearing):

- NN/g, "Accelerators Maximize Efficiency in User Interfaces" (Oct 2024; page not fetchable from this environment): https://www.nngroup.com/articles/accelerators/
- adminlte.io roundup of TanStack Start admin templates ("global command search" as a headline feature): https://adminlte.io/blog/tanstack-start-admin-dashboard-templates

Repo (worktree `research/admin-search-approaches`, base `origin/main` @ `6f74c36`): `apps/admin/src/components/admin-topbar.tsx`, `apps/admin/src/lib/cms-queries.ts`, `apps/admin/src/lib/admin.functions.ts`, `apps/api/src/services/admin-gallery.ts`, `apps/api/src/routes/`, `packages/api-client/src/routes/admin.ts`, `packages/db/src/schema/`, `packages/db/scripts/catalog.ts`, `packages/ui/src/components/`, `packages/ui/components.json`.
