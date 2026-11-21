# Services Cover Photos Spec

*Drafted 2026-11-19 from wayfinder map [jeius/sevendays#324](https://github.com/jeius/sevendays/issues/324) — the owner accepted all recommended answers at charting ([the charting record](https://github.com/jeius/sevendays/issues/324#issuecomment-6994349920)); the spec was drafted from those rulings as [issue #330](https://github.com/jeius/sevendays/issues/330) (resolving task [ticket #326](https://github.com/jeius/sevendays/issues/326)) and sliced into four tickets the same day ([#331](https://github.com/jeius/sevendays/issues/331)–[#334](https://github.com/jeius/sevendays/issues/334), breakdown owner-approved). Status: **owner-settled at charting, 2026-11-19**; this document is the repo copy of issue #330.*

## Problem Statement

Studio services — photo recovery, tarpaulin & bulletin printing, portraits & ID photo, picture framing — are the one catalog family with no photo of their own. The landing renders them through name-matched hardcoded stock photos: `serviceBackground()` in `apps/landing/src/components/home-cards.tsx` maps service names onto four `/photos/service-*.jpg` stand-ins, consumed by the home `ServiceImageCard` and the `/services` `ServiceCard` (the photo-IS-the-card treatment). The mapping's own comment says "stand-ins; M5 swaps for the studio's own service shots" — M5 never came. Meanwhile every sibling surface carries real imagery: packages and branches have staff-managed cover photos (M5/M7, ADR-0019's pipeline), the site has its brand logo (M7 #215). Staff cannot put the studio's actual work on the services surfaces, and the catalog's most-photographed offerings are the ones wearing placeholders.

## Solution

Staff-settable cover photos for studio services, end to end, riding the exact media machinery the repo already runs — no new mechanics:

- **A fifth media purpose** (`service-cover`) joins the presign/commit contract, JPG-only per the #170 ruling, final keys under the shared immutable `covers/` directory.
- **`studio_services` gains a nullable cover key** (generated migration); the admin save runs the whole **tri-state cover law** (absent = keep, null = clear, staging string = bind/replace — the #214 law).
- **Every read resolves** `coverImageUrl` server-side; raw keys never leave the API.
- **The studio-services editor gains the Cover field** ported from the branch editor's composition.
- **The landing consumes the cover everywhere services render**; today's stand-ins demote to the **documented no-cover fallback** (owner ruling — the home stays photo-led with zero admin work).

## User Stories

1. As a Staff User, I want to set a cover photo on a studio service, so that the services surfaces show the studio's own work instead of stand-in stock photos.
2. As a Staff User, I want to replace a cover with one upload-and-save, so that refreshing imagery is a single step.
3. As a Staff User, I want to remove a cover, so that the service falls back to the familiar stand-in without my hunting for a placeholder image.
4. As a Staff User, I want the editor preview to reflect exactly what Save will commit, so that closing the editor without saving never surprises me.
5. As a Staff User, I want a wrong file (non-JPG, over the cap) to fail fast with a clear message, so that an upload mistake costs seconds, not a save.
6. As an Owner, I want a service with no cover to keep today's photo-led look with zero admin work, so that the home and /services never regress when covers are unset.
7. As an Owner, I want raw storage keys to never leave the API, so that a serving-domain change stays a var flip (ADR-0019's law).
8. As an Owner, I want every cover mutation audited like every other admin mutation, so that the Audit Log stays complete without a special case.
9. As an Owner, I want deleting a studio service to delete its stored cover object, so that the bucket holds no orphans (ADR-0019's entity-lifecycle delete).
10. As an implementer, I want the cover to ride the exact presign/commit contract packages, branches, and the site logo already run, so that no new media mechanics are invented.
11. As an implementer, I want the tri-state carried by the same seam shape as branches, so that the two editors and their suites stay symmetric.
12. As an Owner, I want to react to the rendered feature on the teaser before it is called done, so that visual acceptance stays a real gate (the #94 amendment).

## Implementation Decisions

**D1 — Database.** `studio_services` gains `cover_image_key` (`text`, nullable) — the `branches.coverImageKey` / `service_packages.coverImageKey` column shape. Generated via `pnpm --filter @sevendays/db db:generate` (next in the applied 0000–0014 chain; never hand-edited), then `db:migrate`. Born-null: every existing service reads as no-cover → the fallback.

**D2 — Types (`packages/types`).** The row mirror (`studioServiceSchema`) gains `coverImageKey: z.string().nullable()` — internal, mirroring the branch row. **The one canonical read** (`studioServiceWithBranchesSchema`) omits the key and extends `coverImageUrl: z.url().nullable()` — the `branchReadSchema` shape — and serves everything: the public `GET /api/v1/studio-services`, the admin list/get (staff-visible truth, all rows), and the landing's `ReadCatalog.services` (`apps/landing/src/lib/booking-read.ts`). Additive + nullable, so the api-client's Zod parse (ADR-0006) absorbs it with no consumer break; a pin asserts parsed output never carries the key. **The save schemas split** (the current `updateStudioServiceSchema = createStudioServiceSchema` alias breaks): create carries `coverImageKey: z.string().min(1).optional()` (bind only — null is meaningless on create), update carries `.nullable().optional()` (the full tri-state). The presign **pair check needs no edit**: the `superRefine` else-branch already enforces JPG-only for any non-`site-logo` purpose, so `'service-cover'` lands there automatically (the #170 ruling).

**D3 — Media pipeline (fifth purpose).** `mediaPurposeSchema` gains `'service-cover'`. `FINAL_PREFIXES` (`apps/api/src/services/media.ts` — a `Record<MediaPurpose, string>`, so the compiler forces the entry) gains `'service-cover': 'covers'` — the branch-cover ruling stands: one immutable-cover directory; the purpose names the owner, the prefix names the class. Final keys are `covers/<uuid>.jpg`, `cacheControl: immutable`. Everything else rides the existing contract: session-gated presign (server assigns the key — the client never supplies key text), commit-time HEAD verify → promote → staging delete, the 10 MiB global cap (`MEDIA_UPLOAD_CAP_BYTES`), missing credentials → the curated 503 `Media uploads are not configured.` **No new thumbnail work**: the editor's preview of a stored cover uses the resolved `coverImageUrl` (the branch editor's exact preview precedence); the Images-binding seam stays as-is.

**D4 — Admin save.** `createAdminStudioService` / `updateAdminStudioService` (`apps/api/src/services/admin-entities.ts`) gain `resolveServiceCover` — the `resolveBranchCover` ruling ported verbatim: presence-encoding makes "changed" structural (stored keys are immutable final keys, inputs are staging keys, and the staging-key regex rejects final keys — a present string is always a new bind); the commit runs **before** the transaction (bucket I/O never holds a tx open); a commit failure re-paths its details onto `coverImageKey` and resolves as the conflict failure (→ 400); update composes the stored key (absent = keep current, null = clear, string = the committed final key); replace = new key + DB update in one transaction, old object deleted **post-commit** (never overwrite in place). The save/list/get functions gain the `MEDIA_BUCKET` + `MEDIA_PUBLIC_BASE_URL` env picks (the branches' `BranchEnv` shape). **Audit rides the save's existing row** — studio-service create/update already write one row per committed mutation (the house pattern); no separate cover line.

**D5 — Reads.** Admin `list`/`get` resolve `coverImageUrl`, omit the raw key, all rows including deactivated. The public `listActiveStudioServicesWithBranches` (`apps/api/src/services/studio-services.ts`) gains the `MediaEnv` param and per-row resolution (the branches read's shape).

**D6 — Deletion.** The guarded `DELETE /api/v1/admin/studio-services/:id` deletes the stored cover object post-commit (the branch delete's shape — ADR-0019's entity-lifecycle delete). Clearing on update deletes the displaced key post-commit, same law.

**D7 — Admin UI (the studio-services editor).** The create/edit Sheet editor (`apps/admin/src/components/studio-services/studio-services-screen.tsx`) gains a **Cover** field ported from the branch editor's block (`apps/admin/src/components/branches/branches-screen.tsx`): **preview precedence** — a fresh bound upload shows the local object URL; a pending removal (key `null`) shows the placeholder; else the read's `coverImageUrl`; else the placeholder; the preview reflects state, never commits. Upload is picker-only (`accept="image/jpeg"`) over the existing seam (`apps/admin/src/lib/cover-upload.ts`'s `uploadCover(file, presign, onStatus, 'service-cover')`) wired to `presignAdminCoverUpload`, with the machine's status lines (Presigning… / Uploading… N% / "Cover ready — save to bind it.") and its courtesy pre-checks (JPG-only for this purpose, the cap — the commit re-verifies server-side). **Remove cover** sets `coverImageKey: null` in editor state — pending until Save; closing without saving keeps the stored cover; the sheet's async Save contract (close-only-on-success) governs, and a cover commit failure surfaces through the existing conflict/error channel on the cover field. The state seam (`apps/admin/src/lib/light-entity-state.ts`) carries the tri-state exactly like the branch builder: `StudioServiceEditorState` gains `coverImageKey: string | null | undefined`; `newStudioServiceState`/`studioServiceStateFromRead` start `undefined`; `buildStudioServicePayload` encodes absent/null/string like the branch builder; `buildStudioServiceFlipPayload` carries the field unchanged. The gallery drag-and-drop tray stays out (M7 #220 — cover fields are picker-only).

**D8 — Landing consumption.** Every surface where studio services render swaps the img source; **compositions unchanged**: home `ServiceImageCard` and `/services` `ServiceCard` consume `service.coverImageUrl ?? serviceBackground(service.name)` through one pure precedence helper beside the stand-in map; `serviceBackground` demotes to the **documented no-cover fallback** in both files' comments. The card treatment law is untouched: the photo IS the card (the two-layer ink wash + bottom scrim, the measured white-on-ink AA pairs) — a real cover rides the exact same tints; `alt=''` + `aria-hidden` stay (the photo is decorative behind text); lazy-loading stays. **The booking flow has nothing to consume**: the offering step's choice cards, summary rail, and confirmation card render no imagery today (draft-time fact, verified across `book.tsx` + the booking components); if booking imagery is ever added, it consumes `coverImageUrl` by this law.

**D9 — Edge cache.** None needed: `GET /api/v1/studio-services` is not edge-cached today (`apps/api/src/services/read-cache.ts`: "addon-services + studio-services (no cached read embeds them): absent") — no ADR-0025 eviction work; verify-only that adding the field doesn't touch the cache seam.

## Testing Decisions

A good test here pins externally observable contracts, not internals: what a caller gets from a seam, never how the seam is wired inside.

- **packages/types**: the read parses a resolved `coverImageUrl` and a null one; parsed read output never carries the key; update tri-state accepted (absent/null/staging string), create rejects `null` on the key — the `branch.test.ts` pins, ported.
- **apps/api media suite**: the `'service-cover'` presign pair — JPG accepted, PNG answers the pair-check 400 with the purpose-naming message; the commit promotes a service-cover staging key to an immutable `covers/<uuid>.jpg`. Prior art: the #246 pair-check pins.
- **apps/api admin-entity suite**: bind-on-create (staging → final key persisted, object promoted); update absent = keep; null = clear (key cleared, object deleted post-commit); string = replace (new key stored, old object deleted post-commit); commit failure → 400 with details pathed at `coverImageKey`; the public read resolves URLs active-only; guarded DELETE removes the object. Prior art: the branch-cover pins (#214) and the guarded-delete pins (#213).
- **apps/landing lib-seams**: the precedence helper's pins (cover wins / fallback on null / fallback on absent) + every documented stand-in still resolves. Prior art: the landing lib-seam floor (plain-node, no component/DOM tests per the house rule).
- **apps/admin lib-seams**: the studio-service state/payload tri-state pins — new-row `undefined`, build-payload encodes absent/null/string exactly like the branch builder's pins, flip payload carries unchanged. Prior art: the #212 editor-seam pins.

## Out of Scope

- **Touching the live package / branch / site-logo cover flows** — only studio services gain covers (map ruling; the charting record's scope line).
- **Booking-flow imagery** — none exists today (D8); adding it is a future decision, not this spec's.
- **Edge-cache changes** — the studio-services read is uncached (D9).
- **Thumbnail-serving changes** — the Images-binding seam and the versioned-thumb law (ADR-0019 amendment #287) are untouched (D3).
- **Drag-and-drop upload for covers** — the M7 #220 maturation is gallery-only by ruling; cover fields stay picker-only.
- **The map's sibling features** — the landing image viewer (#329's spec) and the create-button polish (#327) are separately-shippable specs, not this one's work.

## Further Notes

- **Delivery split (owner-approved 2026-11-19)**: four tickets as sub-issues of issue #330, native blocking wired — [#331 API spine](https://github.com/jeius/sevendays/issues/331) (frontier: purpose + column + whole tri-state save + resolved reads + deletion cleanup) → parallel [#332 admin editor Cover field](https://github.com/jeius/sevendays/issues/332) + [#333 landing consumption](https://github.com/jeius/sevendays/issues/333) → [#334 teaser variant pass + owner reaction](https://github.com/jeius/sevendays/issues/334). Ticket 1 keeps the tri-state whole: splitting bind from clear would cut `resolveServiceCover` mid-ruling.
- **The rendered-variants step** (the #94 amendment; ticket #334): no *new* composition exists — both surfaces extend owner-ruled compositions (the branch editor's Cover field; the photo-IS-the-card treatment) — so the owner reaction is one teaser walk (a real cover beside a fallback service, all four editor preview states, both themes) before the feature is called done. Skill set for the pass: `prototype` + `ui-ux-pro-max`, loaded at draft time for this spec; owner rulings recorded as overrides (the stand-in fallback posture, picker-only upload, JPG-only).
- **Ledger hygiene on landing**: `docs/progress.md` gains the services-cover line when the tickets land; the `serviceBackground()` comment's "M5 swaps for the studio's own service shots" promise closes with #333.
