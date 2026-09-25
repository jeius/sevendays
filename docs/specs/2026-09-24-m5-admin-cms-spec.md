# Milestone 5 — Admin CMS (v1-track) (spec)

Consolidates every ruling of the M5 wayfinder map (#128, chartered 2026-09-24, closed with all four tickets resolved): the owner's eleven charting rulings (map Notes digest), the R2 media research (#129, pinned against current Cloudflare docs 2026-09-24), the catalog write-model grilling (#130), the admin-CMS prototype reactions (#131, seventeen frames plus nine amendment rounds — the compositions of record), and the landing-integration + verification grilling (#132). The media topology is ADR-0019 (presigned direct upload, public bucket, object-key storage — the ADR `AGENTS.md` names as its example). Authorization stands on M4's proven surfaces (`requireSession`, the admin's session-scoped client) and ADR-0018 (every CMS surface is shared by all staff; owner-only power is the M5.5 users page). Published as GitHub issue #134; `docs/plan.md`'s M5 checkboxes were red-penciled to match on 2026-09-25.

## Problem Statement

The studio's catalog lives in the database but the studio can't touch it. Every piece of content the landing site renders — the eleven service packages with their inclusions, the three branches, the studio services and their per-branch bookability, the add-ons and their applicability, the print sizes and attires — was seeded once and can only change by an engineer editing seed data. Three gaps follow:

1. **No write surface.** The admin app is a gated shell of stubs (M4 closed login; every screen behind it still renders its M3 placeholder). The API has exactly one mutating route (`POST /api/v1/appointments`) — nothing exists for catalog writes, and no screen, form, or editor to drive one.
2. **No media.** Packages render an initials placeholder because `coverImageKey` is null everywhere; the studio has no gallery and no testimonials at all — no tables, no reads, no UI. Photography is the product, and the site cannot show a single photograph the studio took.
3. **The seed is a liability in waiting.** `db:seed` upserts by name; the moment real content is edited through a CMS, a re-run would duplicate every renamed row. The seed must be demoted to a bootstrap/dev tool before the first real edit lands.

The roadmap's original six M5 checkboxes name pieces of this (package editing, branch editing, the R2 bucket, cover upload, landing reflection) but predate every decision this spec settles: which entities get a lifecycle (and that "lifecycle" never means delete), how deactivation flows through every read, the shape of the write model (one atomic package save, full-object PUTs, matrix full-replaces), the media pipeline (presigned direct-to-R2 with a trust-but-verify commit), the admin's compositions (ruled against a rendered prototype), and what "the landing reflects changes immediately" provably means.

## Solution

A session-gated admin API subtree (`/api/v1/admin/*`, one `requireSession` at its root) giving every catalog entity the same lifecycle — create, edit, deactivate; delete nowhere — plus two new public reads (`GET /api/v1/gallery`, `GET /api/v1/testimonials`) and a media seam (presign + commit-time verify/promote) over a new R2 bucket. The admin app fills its stub screens with the prototype-ruled compositions: the packages table with its full editor (cover, frames, inclusions with drag-reorder), branches with the selectable-card bookability matrix, studio services with the add-on checkbox matrix, the lookups screen, the gallery with batch upload and drag-reorder cards, and testimonials with row drag. The landing consumes the new reads client-side: the `/about` tabbed gallery ("All" first), the testimonial slot, and cover photos wherever the initials placeholder stands today — with every deactivated thing silently absent and every empty slot wearing an explicit state. All image handling stores R2 object keys in the database and resolves absolute URLs at read time (ADR-0019); the seed becomes dev-only. The milestone's gate is a new CDP verification scenario that drives the real admin API seam end to end — create a package, upload its cover, change its price, deactivate a print size, deactivate the package — asserting each change on a fresh page load of the landing site.

## User Stories

1. As a staff member, I want every CMS screen available to any signed-in staff session, so content work doesn't wait on the owner (ADR-0018).
2. As a staff member, I want to create a new service package, so the catalog tracks what the studio actually sells.
3. As a staff member, I want to edit a package's price, description, and duration, so a fresh page load of the landing site shows the new facts with no deploy.
4. As a staff member, I want to edit a package's full composition — frames, prints, privileges, each with kind, description, and attire checkboxes — in one editor, so the save is one coherent screen, not a pile of nested forms.
5. As a staff member, I want to reorder frames, prints, and privileges by dragging, so the catalog order matches the studio's sell order.
6. As a staff member, I want to upload a cover photo for a package straight from my browser, so the landing shows the real package art instead of initials.
7. As a staff member, I want to batch-upload dozens of gallery photos at once with per-file progress and retry, because batch is the studio's norm.
8. As a staff member, I want to assign each gallery photo to at most one category from a managed list, so the landing's tabs make sense.
9. As a staff member, I want to reorder gallery photos and categories by dragging, so the grid tells the story in my order.
10. As a staff member, I want to manage gallery categories (create, rename, reorder, deactivate), so tabs come and go with the studio's needs.
11. As a staff member, I want to manage testimonials — quote, person, drag-order — so the about page quotes real clients.
12. As a staff member, I want to edit branch information (name, address, phone, walk-in flag), so the landing stops showing `TODO(seed)` placeholders once the client supplies real values.
13. As a staff member, I want to create a new branch, so a fourth location isn't an engineering task.
14. As a staff member, I want to control which branches a studio service is bookable at by selecting name-only cards, so the matrix reads at a glance.
15. As a staff member, I want to control which add-on services apply to a studio service with checkboxes, so booking-time offerings stay correct.
16. As a staff member, I want to create and edit add-on services, so paid extras match the price list.
17. As a staff member, I want to manage print sizes and attires on one lookups screen, so the vocabulary the editors reference stays tidy.
18. As a staff member, I want to deactivate any catalog entity — and reactivate it — knowing nothing is ever deleted, so history is safe and retakes are free.
19. As a staff member, I want deactivated rows visible in the admin (dimmed, dotted) but never on the landing, so deactivation is reversible and never a surprise.
20. As a staff member, I want to edit a package slug only as an advanced field with a break-links warning, so I can't silently break a printed URL.
21. As a staff member, I want to upload straight-from-camera JPEGs without resizing first, so medium-format originals just work.
22. As a staff member, I want a file rejected for the wrong type before anything uploads, and for over-size at commit, so mistakes surface early where possible.
23. As a staff member, I want the tables readable on my phone (stacked rows) and the editors as bottom sheets, so a quick price fix doesn't need a desk.
24. As a staff member, I want drag-reorder on touch to need a long-press, so scrolling the gallery never fights the drag.
25. As the studio owner, I want no CMS action to hard-delete catalog rows, so existing bookings and their snapshots are untouchable by content work.
26. As the studio owner, I want the seed demoted to a dev/bootstrap tool, so it can never fight the CMS over production content.
27. As a customer, I want a fresh page load to show current packages, prices, and photos, so the site never lies about what's offered.
28. As a customer, I want to see real cover photos on package cards, details, and the home strip, so I can see what I'm buying.
29. As a customer, I want to browse the studio's gallery on the about page with category tabs (starting at "All"), so I can find the work that looks like mine.
30. As a customer, I want to read real testimonials on the about page, so other clients vouch for the studio.
31. As a customer, I want deactivated things simply absent — packages, branches, and the inclusions their lookups reference — so I never see a broken catalog.
32. As a customer visiting an old package URL, I want the existing not-found page, so a deactivated package doesn't look like a site error.
33. As a customer arriving before content exists, I want explicit lines ("Our packages are being refreshed…") instead of blank sections, so the site never looks broken.
34. As a developer, I want the whole admin write surface behind one `requireSession` at the subtree root, so the 401 envelope precedes all validation and no route can forget the gate.
35. As a developer, I want full-object PUTs that return the canonical read shape, so the Zod-parsing client and the editor state stay in lockstep with no merge semantics.
36. As a developer, I want every uniqueness collision as a 400 with field details, so the editor can mark the exact input that clashed.
37. As a developer, I want R2 object keys to never leave the API, so storage topology (including the M6 domain swap) stays a server-side concern.
38. As a developer, I want no cache layer added, so SSR per request makes "fresh page load shows current data" true by construction.
39. As a developer, I want the API suite as the write model's behavioral backbone, so every rule here has an executable proof.
40. As a developer, I want a CDP harness that drives the real admin API seam, so the milestone's exit claim is machine-verified, not hand-waved.

## Implementation Decisions

### Scope and lifecycle (the entity inventory)

- **Full lifecycle — create, edit, deactivate; delete nowhere** — for: service packages (including the full inclusions editor and cover), branches (create included), studio services, add-on services, print sizes, attires, gallery categories, gallery photos, testimonials. Frames have no standalone lifecycle: they live inside the package editor, and a frame's "removal" is composition editing, not entity deletion.
- **Deactivation means the same thing everywhere**: hidden from every public read, history untouched, reversible. Appointment snapshots are unaffected by any of it — deactivated branches still resolve their names in appointment reads.
- Availability (branch business hours + slot capacity) is **v2's payload**; M5 touches none of it.
- The two applicability matrices land in the CMS: **studio service → bookable-at-branch** (the #131 composition: selectable name-only cards, no checkbox inside, selected state read from the card) and **add-on → applies-to-service** (checkbox editor, the charting default — #131 amended only the branch matrix).

### Route topology and authorization

- New gated sub-app at **`/api/v1/admin/*`** with **one `use('*', requireSession)` at its root** — the uniform 401 envelope precedes all validation (the M4 ordering precedent). Every admin read — the ones that must include deactivated rows — lives only there. Public reads keep their paths, stay active-only, and grow no include-flags.
- Admin inventory per entity (`service-packages`, `branches`, `studio-services`, `addon-services`, `print-sizes`, `attires`, `gallery-categories`, `gallery-photos`, `testimonials`): `GET /` (all rows incl. deactivated), `GET /:id`, `POST /`, `PUT /:id`.
- Matrices save as **checkbox full-replaces keyed by the studio service**: `PUT /admin/studio-services/:id/branches` `{ branchIds: [] }` and `PUT /admin/studio-services/:id/addons` `{ addonServiceIds: [] }`. Server diffs and rewrites the rows in one transaction.
- The admin frontends reach all of this through the existing `getSessionScopedApiClient` seam (session cookie extracted server-side, `Authorization: Bearer` over the `API` service binding — ADR-0004/0016). Every CMS surface is shared by all staff sessions (ADR-0018); no role checks inside M5.

### Mutation shapes

- **Full-object PUT everywhere** — the CMS form always holds the whole entity; `updateX` = `createX` minus server-managed fields, no undefined-vs-null merge semantics. POST → 201, PUT → 200, both return the canonical read shape (Zod-parsed by the client).
- **The package save is one atomic PUT**: `POST`/`PUT /admin/service-packages/:id` carries entity fields + `coverImageKey` + `frames[]` + `inclusions[]` in one save — the inclusions editor is a screen, not a resource. Server-side: `frameNumber` = frames array order (renumbered), inclusion `position` = array order, attire junctions rewritten in-transaction. Create carries the same full shape.
- Deactivation is an `isActive` flip through the entity PUT — no separate deactivate endpoints.
- Zod schemas per entity in `packages/types`: `createX`/`updateX`, matrix payload schemas, admin read shapes, and the read-shape rename (`coverImageKey` → `coverImageUrl` on the wire). No new error shapes — the existing validated-input hooks and error envelope throughout; per-entity 404 wordings.

### Ordering and bulk operations (closing #131's deferred decision)

- **Collection reorder is one full-replace order PUT per positioned collection** — `PUT /admin/gallery-photos/order { photoIds: [] }`, likewise `gallery-categories/order` and `testimonials/order` — server renumbers in one transaction. A drag is atomic in meaning; client-looped per-row PUTs could half-apply on failure. The matrix full-replaces are the precedent.
- **Bulk status changes are client-looped entity PUTs** — the bulk bar ("3 selected — Deactivate") is a UI affordance over the existing per-entity surface. Staff volume doesn't justify a bulk endpoint or its new error semantics. No bulk API in M5.
- Package-internal ordering (frames, inclusions, junction attires) rides the atomic package save — array order is the position; no order endpoints.

### The media pipeline (ADR-0019)

The full topology, costs, and setup runbook are ADR-0019 and the research doc it cites (`docs/research/2026-09-24-r2-media-pipeline.md`, branch `research/r2-media-pipeline`); the spec pins the product-facing behavior:

- **Presign**: `POST /admin/media/presign` `{ purpose: 'package-cover' | 'gallery-photo', contentType }` → `{ key, uploadUrl }`. The key is server-assigned (`tmp/<uuid>.<ext>` — staging prefix, type-derived extension; the client never supplies key text). Content-Type is signed into the URL, so **type is enforced at presign** — a PUT with a different type fails the signature. Expiry ~15 minutes; URLs are minted per file on demand (never hoarded — an expired presign 403s without CORS headers and reads as an opaque browser error). Caps: `image/jpeg` only, **50 MiB/file**.
- **Commit is the verify step (trust-but-verify, closed)**: size is only *declared* at presign (a presigned PUT cannot carry a size condition); the entity-persist endpoint is the real gate. The package PUT HEAD-verifies `coverImageKey` **only when it changed** (null clears); `POST /admin/gallery-photos` `{ r2Key, title?, caption?, categoryId? }` verifies at persist. The commit: binding `head()` (strongly consistent) → caps pass → promote staging key to the **immutable final key** (`covers/<uuid>.jpg`, `gallery/<uuid>.jpg`, `cacheControl: immutable`) → delete the staging key → persist the final key. Miss or cap violation → **delete the object and 400** — the delete-on-violation step closes the loop.
- **Replace** = new key + DB update + delete the old key (captured in the service before the update). Never overwrite in place — immutable keys stay cache-correct through the M6 domain swap.
- **Orphans**: a bucket lifecycle rule scoped to `tmp/` (expire after 1 day) GCs uploaded-but-never-committed objects. Zero cron, zero sweeps; final-prefix objects never age out.
- **Storage vs. URLs**: the DB stores **object keys**; every read — public and admin — resolves absolute URLs at read time against `MEDIA_PUBLIC_BASE_URL` (the research runbook's name; #130's comment said `R2_PUBLIC_BASE_URL` — this spec pins `MEDIA_PUBLIC_BASE_URL`, matching the `MEDIA_BUCKET` binding family and the ADR-0019 runbook). Raw keys never leave the API; gallery reads emit `photoUrl`, package reads emit `coverImageUrl`.
- **Public reads**: r2.dev (the bucket's Public Development URL) is dev-only, rate-limited infrastructure — acceptable for staff-only admin previews and the teaser landing during M5, never the production answer. The **M6 swap is read-time only**: flip `MEDIA_PUBLIC_BASE_URL` to the custom domain (keys are domain-independent), disable r2.dev. One real prerequisite recorded for M6: the custom domain requires the zone in the **same Cloudflare account as the bucket** — a constraint on the ADR-0016 dedicated-account rotation (R2 has no bucket-move).
- **Admin thumbnails**: the Images binding (free tier: 5k unique transformations/month — a 200-photo grid × 2 variants sits far inside it) transforms bytes straight from the R2 binding; **no public read path needed**. Served through a gated by-id route (`GET /admin/gallery-photos/:id/thumb`) — the research's by-key sketch is refined to by-id so keys stay server-side. Files over the binding's 20 MB input fall back to the original. **No client-side resize anywhere.**
- **Batch upload client**: XHR per file (fetch has no upload progress), ~4 parallel, per-file retry (1–2 attempts), per-file status, "continue with successes / retry failures" — never an all-or-nothing barrier. Only committed files become savable.
- **One bucket, one DB, both editions**: `sevendays-media` shared by the teaser and v1 API Workers is not just sound but required (the editions share the DB, so rows point at the same keys). Both Workers carry the binding + the two S3-token secrets; CORS lists both admin origins; bucket-level config (lifecycle, r2.dev, future domain) is edition-shared; no per-edition deletes.

### Schema and migrations (house `db:generate`/`db:migrate` flow)

- New tables: `gallery_categories` (id, `name` unique, `position`, `is_active`, timestamps), `gallery_photos` (id, `r2_key` unique, `title`/`caption` nullable, `category_id` **nullable** FK — uncategorized photos are staff-only, absent from public reads, `position`, `is_active`, timestamps), `testimonials` (id, `quote`, `person`, `position`, `is_active`, timestamps).
- New columns + backfills: `branches.is_active`, `print_sizes.is_active`, `attires.is_active` (backfill: active), `package_inclusions.position`, `package_inclusion_attires.position` (backfill: today's id/`created_at` order). Existing `is_active` on service packages / studio services / add-on services unchanged. Uniqueness constraints otherwise stay as-is.
- Branch creation needs no seed-only constraint unwound: branches are plain rows; the CMS create covers the fourth-location story.

### Read assembly and public reads

- Public package reads: inclusions order by `(position, id)`, junctions by `(position, id)` — today's `created_at` key dies under full-replace.
- **Trim rules** (the refined deactivation ruling): a deactivated **attire trims from its inclusion's attire list** — the inclusion renders even with `attires: []`; a deactivated **print size hides its referencing inclusion entirely** (a sizeless print states nothing); privileges unaffected. Admin reads always assemble the **full** composition.
- **New public reads**: `GET /api/v1/gallery` → one assembled `{ categories, photos }` (active rows only, position-ordered, uncategorized photos absent) and `GET /api/v1/testimonials` (active, ordered) — one landing fetch feeds the about page.
- Public branches read becomes **active-only**; appointment-history joins are untouched (deactivated branch names keep resolving in gated appointment reads).
- By-slug package detail for an unknown **or deactivated** slug → the existing owner-ratified not-found page.

### Slugs and the conflict vocabulary

- Create: the server generates the slug via `slugifyName(name)` — name is unique on every slugged entity, so a create-time slug collision **is** a name collision → 400. Regenerate-from-name only at create.
- Edit: slug is an advanced PUT field (behind a break-links warning in the UI); a taken slug → `400` with field details. Old slugs 404 on landing (no redirects — out of scope).
- **All uniqueness collisions are 400-with-field-details** — service-level pre-check plus the PG `23505` catch mapped to the same 400. No 409; the status vocabulary stays {400, 401, 404, 500}.

### Admin UI compositions (the #131 rulings, verbatim)

The prototype's applied render (branch `prototype/131-admin-cms-compositions`, rounds through `ac9daca`) is the composition of record; frames + SDD ledger live in `.superpowers/sdd/2026-09-24-131-m5-prototype-admin-cms-compositions/` on that branch. UI-bearing tickets load the `prototype` + `ui-ux-pro-max` (+ `design-system`/`ui-styling`) skill set per the AGENTS.md rule; new compositions get rendered variants the owner reacts to (#94 amendment).

**Global patterns:**

- **Sheet for all catalog add/edit** — right-side Sheet everywhere; the shared primitive already animates (200ms slide+fade via Base UI state-attribute transitions) — the build verifies the travel feels right, strengthening only if the owner wants more.
- **Reorder = drag handle only, via a real dnd library — `@dnd-kit` pinned.** Up/down buttons die. Gallery cards and testimonial rows inherit the pattern; touch uses a long-press sensor (~300ms) so scrolling never conflicts; desktop drags use a small movement threshold; dragged rows carry a solid background.
- **Popup animation = Motion for React (13.4.2), the build pattern of record**: CSS transitions on Base UI popups provably never fire (Base UI strips `data-starting-style` within one paint); use Motion via the Base UI `render` prop with the AnimatePresence + `keepMounted` recipe, side-aware transform slides, `MotionConfig reducedMotion="user"` at the app root; exits need a local visible-latch + `onExitComplete` when the parent conditionally mounts; overlays ride the same Motion channel.
- **Mobile (< 768px, `useIsMobile`)**: dialogs **and** the right-side editors become bottom sheets (`rounded-t-xl`, `85dvh` scroll cap); tables converge with desktop (dot beside identity, description line 2, description in the mobile reveal).
- **Tables (desktop converges on the mobile format)**: status dot sits **under the identity with the description** (one-line truncate, full text on row expand) — dedicated Status columns die; actions are **icons** (Edit = SquarePen, Deactivate = PowerOff, Reactivate = Power) revealed on hover/focus (kebab on touch) with an always-visible chevron expand toggle; row expand/collapse is **animated**; the whole row is clickable to expand (chevron stays the keyboard toggle; actions excluded); expansion is deduplicated (the truncated line hides while the panel shows full text); action order [Edit] [Deactivate/Reactivate] [Chevron]; the actions header renders empty; `tabular-nums` on price columns; names truncate with a hover tooltip, descriptions truncate and expand; name and description share their left edge (the dot hangs left of both); mobile stacked rows are two-line per the data-table-design skill (~700px container query, restructure-never-shrink — the horizontal-scroll wrapper is the named anti-pattern).
- **Bulk bar planned** (checkbox column + action bar) over client-looped PUTs.
- **Selects**: triggers align with input radius; selected items render their **label** ("Graduation", "8x10"), not the value.

**Per screen:**

- **Packages**: Featured becomes a small primary badge beside the name (dedicated column dies); under the name: dot + description (slug leaves the table). **Package editor**: Core/Cover/Advanced as cards; Frames/Prints/Privileges as bg-card section groups behind a Separator; framed-picture and print rows keep the four-attire checkbox chips; **privilege rows lose attire checkboxes**; dnd rows with solid drag backgrounds; cover upload (presign → PUT → bind); slug as the advanced field with the break-links warning.
- **Branches**: dot + address beneath the name; phone keeps its desktop column and moves to the mobile reveal; walk-in badge is the mobile line-1 value. **Branch matrix** (in the studio-service editor): selectable name-only cards, address dropped, no checkbox inside — selected state reads from the card.
- **Studio services / Add-ons**: relations (branches / applies-to services) render as outline badges — dedicated column on desktop, visible only in the expanded reveal on mobile; state + description per the table consolidation.
- **Gallery**: card grid; **no status dot — a dimmed card is deactivated**; icon-only actions at the card's top-right on hover (desktop) / tap (mobile); the whole card is the drag handle (long-press on touch); batch upload with per-file progress; category assignment; the gallery screen owns its category management (create/rename/reorder/deactivate inline — `gallery-categories` CRUD routes underneath).
- **Testimonials**: Person is the main column with dot + quote beneath (Packages format); **no Position column** (array order dictates); row drag-n-drop with the same sensor constraints.
- **Lookups (Studio group, one screen)**: print sizes adopt the Packages format (code / dot + description); attires render the status dot **first**, then name. IA stays as-is: Gallery + Testimonials under Catalog; Lookups under Studio.
- New admin routes fill the shell: gallery, testimonials (Catalog), lookups (Studio); appointments and settings stay stubs (v2 / M5.5).

### Landing integration (client-side consumption)

- **`/about` tabbed grid**: tabs derive from the fetched `GET /gallery` payload — an **"All" tab first and default** plus one tab per category holding ≥1 active photo, in category position order. Client-side filtering; photos render position-ordered. Uncategorized photos surface nowhere.
- **Cover rendering rule**: `coverImageUrl` present → `<img>` (object-cover, alt = package name, `loading="lazy"` on list cards); null → **today's placeholder verbatim** (the CDP assertion "cover placeholder present ⇔ no cover" stays meaningful). Shared via a `CoverPanel` so list, detail, and home-featured all get it. Crop/aspect choices are execution UI work with rendered variants.
- **Empty/degraded states — never blank**: zero active packages → an explicit empty-state line in the house `TODO(owner-copy)` pattern (text CDP-assertable); home featured strip with zero → **collapses entirely** (no heading, no box) while home's gallery/testimonial strips stay untouched stand-ins; `/about` portfolio with zero photos (or categories) → tab row hidden + "Portfolio coming soon." placeholder line; zero testimonials → the existing "What clients say is coming soon." line stays.
- **Deactivated-lookup hiding is silent** — no notices, no badges; the landing renders the resolved read shape as-is. Edge pinned: a package whose inclusions all trim away still lists and renders (name/price/description) with the inclusions block **omitted entirely**, never an empty heading; no CMS-side guard prevents that state.
- **"Immediately" = a fresh page load shows current data** (SSR reads the DB per request; no cache layer added). The by-slug detail query keeps `staleTime: Infinity` — session-scoped staleness on client-side revisit is acceptable; fresh loads are always current.

### The seed demoted to bootstrap/dev-only

`db:seed` never runs against production content once the CMS owns the catalog — its name-keyed upserts would duplicate renamed rows. The script stays for fresh environments and dev resets; the runbook says so. (Ruling #6, made effective by this milestone's write model rather than by code — the seed needs no change, only its contract.)

### Environments and setup (owner-operated runbook, one-time)

The bucket/bootstrap is owner work per the #75 handover model; the durable runbook is ADR-0019's (from the research doc): create `sevendays-media`; enable the `MEDIA_BUCKET` binding staged in `apps/api/wrangler.toml`; mint the scoped R2 S3 token (Object Read & Write, this bucket only) → `R2_S3_ACCESS_KEY_ID`/`R2_S3_SECRET_ACCESS_KEY` secrets (both api Workers; `.dev.vars` locally); `CLOUDFLARE_ACCOUNT_ID` + `MEDIA_PUBLIC_BASE_URL` plain vars; set bucket CORS (PUT + `content-type` + exposed `ETag` + the exact admin origins — teaser, v1, localhost); the `tmp/` lifecycle rule; enable the r2.dev Public Development URL; the `[images]` binding. Plus `pnpm --filter @sevendays/api add aws4fetch`.

### Testing posture

- **Good tests assert external behavior**: HTTP status + response shape through the real routes, and payload-derived UI state at the lib seam — never service internals. Prior art: the api suite's integration tests over real Postgres (ADR-0008) and landing's plain-node lib-seam tests.
- **`apps/api` vitest suite stays the write model's behavioral backbone**: entity CRUD round-trips, the atomic package save (ordering renumbering, junction rewrites, rollback on bad payload), matrix full-replaces, trim rules in the public assembly, active-only branches, deactivated-slug 404, the slug lifecycle, 23505 → 400-with-field-details, the media seam's verify/promote/violation-delete contract (binding-shaped stubs where a real bucket can't reach CI), `requireSession` ordering (401 before validation) — over the compose database.
- **Admin's vitest suite seats in M5** (retiring the standing "admin has no tests" caveat at execution): landing-style plain-node **lib-seam tests only** — no component/DOM tests, no new deps. Initial seams: package-editor state → full PUT payload (frames/inclusions ordering), matrix checkbox state → `{branchIds}`/`{addonServiceIds}` payloads, the presign→upload→bind loop, conflict/error → field-error mapping.
- **The live gate** is the `cms-reflection.mjs` scenario (below) — machine-verified exit, main-only like the other owner harnesses.

### v1-pick posture

Every M5 ticket is written pick-aware (booking references will SPLIT; `docs/agents/v1-picks.md` is the runbook, ledger rows per merge):

- **Expected clean PICKs**: the schema/migration additions, `packages/types` additions, the admin subtree + its services (new files), gallery/testimonials public reads, the admin screens, `/about` gallery + testimonials + CoverPanel + empty states (variant-neutral compositions over surfaces both editions share).
- **Predicted SPLITs**: edits landing inside files that differ main↔v1 — the packages read assembly (trim rules land near booking-bearing code in the same modules) and any home-strip change touching the booking-CTA regions; the content pass resolves per the runbook's transformed-surface classes.
- **SKIP by path**: the `cms-reflection.mjs` harness and the runbook docs (owner harnesses/scripts are main-only per the seed's ruleset).
- The seed-contract note and ADR-0019 are edition-free content.

## Tickets

Execution tickets are cut after this spec via the spec → tickets → build loop (`to-tickets`); the sketch, in execution order:

1. **M5-01 — Schema + types**: migrations per the inventory above + backfills; `packages/types` Zod schemas (create/update/matrix/read shapes, the `coverImageUrl`/`photoUrl` wire rename); api suite grows the schema contracts.
2. **M5-02 — Media foundation**: the owner runbook executed (bucket, bindings, CORS, lifecycle, r2.dev, secrets/vars — ADR-0019); `aws4fetch` presign service + the commit verify/promote contract + the by-id thumb route; api tests for the commit contract.
3. **M5-03 — Admin write model**: the `/api/v1/admin` subtree + `requireSession`; entity CRUD, the atomic package save, matrix full-replaces, order PUTs, slug/conflict rules, resolved-URL admin reads; the api integration backbone.
4. **M5-04 — Public reads + trim rules**: `GET /gallery` + `GET /testimonials`, trim-rule assembly, active-only branches, deactivated-slug 404, resolved URLs on all reads.
5. **M5-05 — Admin screens, Catalog core** (UI-bearing; skill set named; owner-reacted variants): the shared patterns (Sheet, dnd, Motion popups, consolidated tables, mobile bottom sheets) + packages table/editor, branches + the branch matrix, studio services + the add-on matrix, add-ons.
6. **M5-06 — Admin screens, Gallery + testimonials + lookups**: batch upload UX, category panel, card dnd, testimonial rows, the lookups screen — consuming M5-05's patterns.
7. **M5-07 — Landing integration**: `/about` tabs, testimonials slot, `CoverPanel`, empty states, the staleTime pin; CDP coverage of the cover rule.
8. **M5-08 — Close-out**: admin lib-seam suite seats, seed contract demoted in the runbook, `cms-reflection.mjs` + the live gate, docs rotation (progress/tech-stack/AGENTS status lines), v1 picks + ledger.

Dependencies: 01 → {02, 03}; 03 → {04, 05}; 05 → 06; 04 + 06 → 07; 08 last.

## Verification (the milestone gate)

One new scenario, `apps/landing/scripts/verify/cms-reflection.mjs`, beside the existing five: the local-stack gate (Chrome `:9222`, API `:8787`, landing `:3000`), main-only. The **mutation leg drives the admin API seam, not the admin UI**: sign in over HTTP (the BetterAuth sign-in endpoint) → Bearer token → admin API calls. Credentials come from env-supplied `VERIFY_STAFF_EMAIL`/`VERIFY_STAFF_PASSWORD` on the operator's machine (never committed); one-time setup provisions a dedicated `harness@sevendays.test` via the documented `create-staff` CLI driver.

Flow, each step **fresh-load-asserted** by CDP:

1. Create a scratch package (unique-per-run name/price) → `/packages`, the by-slug detail, and home-featured all show it.
2. Presign + PUT a tiny JPEG → bind it as cover → the three surfaces render `<img>` (placeholder absent).
3. PUT a price change → fresh load shows it.
4. Deactivate a print size the scratch package references → the inclusion hides (the trim rule, live).
5. Deactivate the scratch package → fresh load shows it gone (list, detail, home).

Exit gate additionally: `pnpm check` green across touched packages; the api suite count grows by the write-model tests; the admin suite count > 0; v1 picks triaged with ledger rows.

**Exit criteria** (red-penciled from the roadmap's original): a signed-in staff member can manage the studio's entire catalog — create/edit/deactivate packages (with covers), branches, studio services + matrices, add-ons, lookups, gallery, testimonials — and a fresh page load of the landing site reflects every change with no deploy; the admin app has a real test suite; the seed is dev-only.

## Open items riding the build

- **Four unplanned strings** (owner copy, ratification deferred from #131): "No framed pictures in this frame yet."; "No studio services yet." / "No add-ons yet." / "No branches yet."; "Deactivated sizes stay on existing packages but disappear from new pickers." They land behind the existing copy-veto/`TODO(owner-copy)` discipline.
- **Two design-system token decisions** pending (rendered prototype-local at the owner's direction): the status-dot palette (Tailwind defaults today) and the card-radius step-down (if ratified globally it touches the M3 radius scale). The build flags both for a token ruling rather than hardcoding brand values silently.
- **Client copy slots** (about story, home blurb, packages empty-state line) stay placeholder-marked — blocked on client copy, not tooling.

## Out of Scope

- **Availability editing** — branch business hours + slot capacity (v2's availability spec owns the shape; the M5 red-pencil narrows the roadmap's stale wording).
- **Rich-text/free-form content blocks** — the about story and home blurb stay owner copy slots.
- **Old-slug redirect infrastructure** — revisit only if renames-with-link-preservation become a real need.
- **Home-page gallery band; per-package photo galleries beyond the single cover.**
- **Multi-tag gallery categories** (one category per photo).
- **Appointments dashboard and any booking-semantics editing** (standing v2 payload).
- **Hard deletes of catalog entities.**
- **User management / the M5.5 users page** — owner-only per ADR-0018, its own spec.
- **M6 media-domain work** — the custom domain, URL transformations on the landing, disabling r2.dev. M5 records the same-account prerequisite and keeps the swap read-time only.

## References

- Wayfinder map #128 and its tickets: #129 (R2 media research — `docs/research/2026-09-24-r2-media-pipeline.md`, branch `research/r2-media-pipeline`), #130 (catalog write model), #131 (admin CMS prototype — branch `prototype/131-admin-cms-compositions`), #132 (landing integration + verification)
- ADR-0004 (shared-tables token verification), ADR-0006 (shared api client), ADR-0008 (integration tests), ADR-0009 (normalized catalog lookups), ADR-0011 (per-request db client), ADR-0015 (two-edition artifacts), ADR-0016 (service bindings), ADR-0017 (shared UI package), ADR-0018 (two-role staff model), **ADR-0019 (R2 media topology — new, this milestone)**
- `docs/specs/2026-09-22-m4-admin-auth-spec.md` (the M4 seams this builds on), `docs/agents/v1-picks.md` (pick discipline)
- Skills named by the map for this milestone's tickets: spec — `to-spec`; schema/API — `drizzle-best-practices`, `zod`, `hono`, `better-auth-best-practices`; UI — `prototype`, `ui-ux-pro-max`, `design-system`, `ui-styling`
