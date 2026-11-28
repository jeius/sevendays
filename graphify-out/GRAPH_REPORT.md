# Graph Report - em-dash-sweep-apps  (2026-11-28)

## Corpus Check
- 1053 files · ~1,787,594 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 72 file(s) not represented in the graph (top: .csv 53, (none) 9, .example 5)

## Summary
- 10387 nodes · 19969 edges · 608 communities (555 shown, 53 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 2689 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `66c11246`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Sevendays Service Catalog
- with
- Three separate Cloudflare Worker deployments (landing/admin/api)
- scripts
- admin/package.json
- landing package.json devDependencies
- Architecture-review specs: row shaping, read-stitch, error seam, intake
- api/package.json
- admin/src/routeTree.gen.ts
- dependencies
- landing/package.json
- ref_vitest
- packages/config package.json scripts
- scripts
- packages/types package.json
- The ship-provisioning runbook (#191) Implementation Plan
- landing/src/routeTree.gen.ts
- appointment-read.ts
- Shared TS config: base.json
- admin shadcn components.json
- landing shadcn components.json
- types tsconfig.build.json
- admin tsconfig.json
- api tsconfig.build.json
- landing tsconfig.json
- Spec: M1 real data layer
- db tsconfig.build.json
- package.ts
- ui/package.json
- Biome base: formatter
- Biome vite tier: rules
- createAuth
- compilerOptions
- Specs: M2 preflight API client + M1.4 plan
- env
- primitive
- package.json
- rules
- includes
- includes
- Plan: M1.1 preflight
- tasks
- Plan: M1.2 catalog schema
- Plan: M1.4 real routes + integration tests
- Biome worker tier
- Shared TS config: node.json
- db biome.json
- lookups-screen.tsx
- Implementation Decisions
- Plan: M1.3 provision, migrate, seed
- $id.thumb.ts
- api biome.json
- Plan: M1.5 exit verification
- migrate.ts
- ci.yml
- biome/base.json
- devDependencies
- Shared TS config: react.json
- check-env.mjs
- attire.ts
- db/package.json
- Task 5: `apps/admin` — the Users tab (UI-bearing)
- validate_data.py
- vitest/index.ts
- addon-service.ts
- gallery.ts
- Global Constraints
- ui/biome.json
- Agent docs: issue tracker & triage labels
- gray
- deploy-v1
- ref_postgres
- Plan: #350 — Handover polish: sweep the apps tree
- types biome.json
- Root biome.json
- steps
- Biome base: source settings
- deploy-teaser
- postgres
- book.tsx
- cms-reflection.mjs
- Implementation Decisions
- admin/vite.config.ts
- sidebar.tsx
- typescript/base.json
- Biome node tier
- appointment.ts
- input
- AGENTS rule: graphify query/update
- appointment.test.ts
- main
- admin.functions.ts
- Landing README: file-based routing
- healthcheck
- CI check job
- drizzle-kit
- exports
- booking-wizard.mjs
- allowBuilds
- $type
- json
- HomeImageLed
- ui-styling: Tailwind utilities reference
- design-system: slide search core
- brand: guidelines starter template
- design_system.py
- @tanstack/react-start
- design skill docs
- cip/core.py
- ui-styling: canvas design system
- organization-best-practices skill
- lib/auth.ts
- $type
- ui-ux-pro-max: prerequisites
- packages/api-client package.json
- spacing
- Workspace Task Orchestration
- Global Constraints
- search_stack
- pnpm/SKILL.md
- ui-styling: shadcn form & input components
- ui-styling: Tailwind responsive design
- nav-active-states: Configure Active Link States
- deploy-env-config: Configure Environment Variables Correctly
- better-auth security skill
- brand: typography specs
- color
- nav-relative-paths: Understand Relative Path Navigation
- nav-use-navigate: Use useNavigate for Programmatic Navigation
- brand: logo usage rules
- design-system: component specs
- preload-manual: Use Manual Preloading Strategically
- search-middleware: Use Search Param Middleware
- ui-styling: shadcn accessibility
- TailwindConfigGenerator
- FakeXhr
- requireSession
- design-system: HTML token validator
- ssr-selective: Apply Selective SSR When Beneficial
- M9 — Admin Notifications & Search Spec
- scripts/core.py
- pnpm: performance practices
- Release Management (v11.13.0+)
- err-fallback-data: Provide Fallback Data When Appropriate
- err-retry-config: Configure Retry Logic Appropriately
- mut-error-handling: Handle Mutation Errors Gracefully
- mut-loading-states: Use isPending for Mutation Loading States
- TestSearchDomains
- brand: asset approval checklist
- design: logo prompt engineering
- Two-factor auth best practices skill
- brand: color palette management
- design: CIP deliverable guide
- design: logo search scripts
- design-system: states & variants
- perf-notify-change-props: Limit Re-renders with notifyOnChangeProps
- ui-styling skill overview
- design: social photos workflow
- pf-ensure-query-data: Use ensureQueryData for Conditional Prefetching
- test_design_system_mode.py
- posthog.ts
- design-system skill overview
- radius
- ui-styling: Tailwind customization
- Env
- Migration to pnpm
- dropdown-menu.tsx
- create-auth skill
- pnpm Store
- pf-stale-time-config: Set staleTime When Prefetching
- ssr-hydration-boundary: Wrap with HydrationBoundary
- ctx-before-load: Extend Context in beforeLoad
- ADR-0004: API verifies BetterAuth sessions via shared tables, not cookies
- design: routing by task type
- design-system: slide generator
- ctx-dependency-injection: Use Context for Dependency Injection
- ui-styling: shadcn theming
- TestTailwindConfigGenerator
- vitest: core test API
- Mocking
- catalog-rows.ts
- Better Auth Integration Guide
- brand: asset organization
- design: logo color psychology
- design: logo types & style guide
- pnpm CI/CD Setup
- pnpm: patches
- Roadmap
- Root AGENTS.md conventions
- brand: consistency checklist
- design: CIP mockup prompts
- design-system: semantic colors
- csv
- Override Patterns
- pnpm: peer dependencies
- vitest: vi utilities
- vitest: describe API
- Code Coverage
- ADR-0010: URL path versioning
- api-client tsconfig.build.json
- pnpm CLI Commands
- tanstack-query: quick reference
- tanstack-router: quick reference
- tanstack-start: quick reference
- ADR-0005: Hourly slot grid with per-slot capacity for booking availability
- ShadcnInstaller
- 50
- vitest/SKILL.md
- Expect API
- Per-context CONTEXT docs
- ADRs: TS 6 pin & tiered Biome
- 800
- banner-design: sizes & styles
- design: banner sizes & styles
- icon/generate.py
- fontSize
- pnpm Workspaces
- pnpm Aliases
- load-loader-deps: Define loaderDeps for Cache Control
- padding-y
- Implementation Decisions
- book.tsx
- ui-ux-pro-max: catalog refresh tests
- vitest: test environments
- Type Testing
- Test Filtering
- Spec & plan: deepen appointment intake
- design: CIP design reference
- design: icon design reference
- design: slides copywriting
- slides: copywriting formulas
- org-file-based-routing: Prefer File-Based Routing for Conventions
- org-pathless-layouts: Use Pathless Routes for Shared Layouts
- preload-stale-time: Configure Preload Stale Time
- testimonial.ts
- sheet.tsx
- Commands
- vitest: lifecycle hooks
- Snapshot Testing
- Domain: Appointment context
- admin README: production build
- BranchRead
- Progress log & DB topology ADRs
- Catalog docs: packages
- Plan: M1.2 constraints
- DesignSystemGenerator
- banner-design skill overview
- brand: messaging framework
- brand: voice framework
- brand: color extraction script
- brand: asset validation script
- design: slides layout patterns
- design-system: Tailwind integration
- email & password best practices skill
- slides: layout patterns
- deploy-adapters: Choose Appropriate Deployment Adapter
- search-defaults: Provide Sensible Defaults for Search Params
- Seed the v1 branch — the one filter-repo pass (booking-free artifact line) (#80) Implementation Plan
- vitest: concurrency
- ADR template & domain-docs guide
- ADR-0008: Integration tests against real Postgres
- brand: update guide
- design: logo design reference
- design-system: token architecture
- destructive
- Global Virtual Store, Git Worktrees, Global Packages & Shims
- search-type-inheritance: Leverage Parent Search Param Types
- Projects
- scripts
- landing package.json scripts
- Plan: M1.4 file structure
- Plan: intake deepening file structure
- Tech stack doc
- destructive-foreground
- muted
- design-system: primitive tokens
- design-system: token validator
- pnpm Hooks (.pnpmfile.mjs)
- tanstack-integration rule: SSR dehydrate/hydrate
- tanstack-integration: quick reference
- tanstack-query rule: network mode
- tanstack-query rule: query persistence
- tanstack-query rule: cancellation
- tanstack-router rule: default options
- tanstack-router rule: search serializers
- tanstack-start rule: API routes
- tanstack-start rule: env functions
- tanstack-start rule: hydration safety
- ssr-prerender: Configure Static Prerendering and ISR
- split-auto-splitting: Enable autoCodeSplitting When Possible
- auth-cookie-security: Configure Secure Cookie Settings
- err-not-found: Handle Not-Found Scenarios
- ui-styling: tailwind config gen tests
- Plan: M2 E2E verification facts
- Plan: M1.5 file structure
- testimonial-submission.ts
- brand: visual identity
- brand: context injection script
- design: CIP style guide
- design-system: token embedding
- pnpm Configuration
- pnpm Catalogs
- pnpm Supply-Chain Security
- tanstack-integration rule: single cache source
- tanstack-query rule: placeholder data
- tanstack-query rule: infinite page params
- tanstack-query rule: select transform
- err-not-found: Handle Not-Found Routes Properly
- tanstack-router rule: ensureQueryData
- tanstack-router rule: parallel loading
- tanstack-router rule: Link component
- tanstack-router rule: route masks
- tanstack-router rule: virtual routes
- primary-foreground
- tanstack-start rule: request middleware
- tanstack-start rule: streaming SSR
- err-redirects: Use Redirects Appropriately
- ring
- secondary-foreground
- brand skill overview
- design: slide strategies
- white
- design-system: component tokens
- design-system: token generator
- Product — Sevendays (studio-wide record)
- pnpm Config Dependencies
- slides: slide strategies
- tanstack-integration rule: loader + query
- tanstack-query rule: mutation state
- tanstack-query rule: optimistic updates
- tanstack-query rule: useQueries
- tanstack-query rule: intent prefetch
- tanstack-router rule: root context
- tanstack-router rule: route loaders
- tanstack-router rule: preload on intent
- tanstack-router rule: search validation
- tanstack-router rule: lazy routes
- tanstack-router rule: useParams from
- tanstack-start rule: auth protection
- tanstack-start rule: session management
- tanstack-start rule: file separation
- tanstack-start rule: createServerFn
- tanstack-start rule: input validation
- Plan: #340 — Image viewer: package-detail cover zoom — the lone-image variant
- vitest: context & fixtures
- Domain: Branch context
- Draft: v2 offer sheet prototype
- v1 picks runbook
- Product requirements doc
- Spec: acquisition/error seam
- Plan: M1.1 constraints
- Plan: frame grouping & attire
- _shell.packages.tsx
- Plan: M2 preflight-5 facts
- brand: tokens sync script
- css
- tanstack-integration rule: QueryClient context
- tanstack-query rule: gcTime
- tanstack-query rule: error boundaries
- tanstack-query rule: invalidation
- tanstack-query rule: SSR dehydration
- tanstack-router rule: register router
- mw-composability: Compose Middleware Effectively
- Plan: #57 brand token unification
- Configuration
- vitest: reporters
- progress.tsx
- Architecture doc
- Spec hub: M1 data layer
- Spec hub: M2 preflight
- Spec hub: error seam
- Spec hub: row shaping
- Spec hub: intake deepening
- Spec hub: read-stitch
- Plan: M1.3 file structure
- cmdk
- @fontsource-variable/roboto-slab@^5.3.0
- react@^19.2.0
- Plan: M2 preflight-4 facts
- @sevendays/db overview refs
- tanstack-query rule: targeted invalidation
- tanstack-query rule: staleTime
- tanstack-query rule: key factories
- tanstack-query rule: hierarchical keys
- tanstack-query rule: serializable keys
- api-client/src/routes/admin.ts
- Progress log hub
- @sevendays/types@workspace:*
- File Structure
- design: slides reference
- design: HTML slide template
- slides: HTML template
- tanstack-query rule: array keys
- tanstack-query rule: key dependencies
- mw-context-flow: Properly Pass Context Through Middleware
- mw-function-middleware: Use Function Middleware for Server Functions
- Benchmarking (v5)
- vitest: test tags
- Spec: booking flow decisions
- slides skill overview
- sec-auth-middleware: Protect Routes with Auth Middleware
- sec-sensitive-data: Keep Secrets Server-Side Only
- ssr-data-loading: Load Data Appropriately for SSR
- gallery-screen.tsx
- api/src/index.ts
- Plan: M2-01 studio services catalog
- 3. Logo Usage
- @tailwindcss/vite@^4.1.18
- button
- inf-loading-guards: Check isFetchingNextPage Before Fetching More
- zod@^4.5.1
- api-client biome.json
- hasExactlyOneAppointmentOffering
- inf-max-pages: Consider maxPages for Large Datasets
- mut-rollback-context: Provide Rollback Context from onMutate
- perf-placeholder-data: Use placeholderData for Instant UI
- perf-structural-sharing: Leverage Structural Sharing
- Building For Production
- dependencies
- studio-service.ts
- ref_drizzle_orm
- design: slides create guide
- pnpm: generation notes
- slides: create guide
- pf-route-prefetch: Prefetch Data During Route Transitions
- ssr-client-per-request: Create QueryClient Per Request
- AppType
- submissions-tab.tsx
- vitest: generation notes
- ADR-0012: exactly-one booked offering
- ui/components.json
- Implementation Decisions
- events.ts
- admin-gallery.ts
- M3 Ticket 03 — Landing Chrome + Atmosphere: Ink Bands, SiteFooter, MobileNav, Wash Ground (#97) Implementation Plan
- filters.ts
- testimonials-screen.tsx
- landing/src/lib/queries.ts
- compilerOptions
- Plan: M2-08 booking confirmation
- unwrap.ts
- Verify script: confirmation emails
- ssr-stale-time-server: Set Higher staleTime on Server
- App READMEs (admin & landing)
- ADR-0013: one appointments table
- ADR-0014: email send topology
- Plan: #80 seed v1 branch
- Global Constraints
- Plan: edition-aware pipelines facts
- ADR-0015: two-edition mechanism
- react-dom@^19.2.0
- Global Constraints
- v1 export audit script
- package-editor.tsx
- scripts
- Plan: #78 export audit file structure
- global-search.ts
- admin-delete.ts
- studio-services-screen.tsx
- ADR-0017: Shared UI package — the shadcn monorepo pattern
- Plan: #82 pick discipline
- Global Constraints
- radius
- about.tsx
- Global Constraints
- notFound
- viewer.ts
- Phase A — the dedicated stack (no client dependency)
- v1 triage classifier script
- @sevendays/types@workspace:*
- metrics.functions.ts
- cf.ts
- M5 Prototype: Admin CMS Compositions (wayfinder #131) Implementation Plan
- createApiClient
- design-tokens-starter.json
- Global Constraints
- ADR-0018: Two-role staff model — the admin gate stays owner-held
- Ledger
- Plan: #334 — Service covers: teaser variant pass + owner reaction
- connect
- users-tab.tsx
- Plan: #341 — Image viewer: teaser variant pass + owner reaction
- /public/photos — PROTOTYPE stand-ins (#111)
- Global Constraints
- unwrap
- backfill-positions.mjs
- mock-api.ts
- src/media.ts
- admin/src/lib/api.server.ts
- Media bucket runbook — `sevendays-media` (ADR-0019)
- admin/src/routes/__root.tsx
- admin/src/lib/nav.ts
- read-cache.test.ts
- Staff provisioning & password reset (v1)
- Global Constraints
- ADR-0022: Standalone Playwright as the browser-E2E and visual-regression foundation
- admin-studio-services.ts
- ADR-0023: The observability data path — admin server functions own the analytics queries
- Plan: #338 — Create-button polish: teaser variant pass + owner reaction
- logAdminMutation
- load-deferred-data: Split Critical and Non-Critical Data
- Global Constraints
- r2.ts
- primitive
- org-index-routes: Understand Index vs Layout Routes
- Global Constraints
- Global Constraints
- branch.ts
- File Structure
- admin-sidebar.tsx
- ADR-0020: Unpriced catalog items — nullable prices end to end, snapshots included
- ship-media-copy.mjs
- ADR-0021: Reset emails — a second email class over the API's Resend seam, via the service binding
- measure-theme-pairs.mjs
- File Structure
- admin-entities.ts
- probes.ts
- ship-content-carry.mjs
- @sevendays/db
- File Structure
- Plan: #339 — Image viewer: viewer spine — the library, the seam, and the mosaic walls live
- services/media.ts
- system-health.tsx
- StudioServiceWithBranches
- org-route-tree-structure: Follow Hierarchical Route Tree Patterns
- chart.tsx
- pino
- e2e — the browser-test foundation (ADR-0022, M6 #189)
- admin/src/vite-env.d.ts
- detect_domain
- landing/src/vite-env.d.ts
- Global Constraints
- Global Constraints
- redesign.spec.ts
- refresh-button.tsx
- Global Constraints
- Global Constraints
- package-expanded-row.test.ts
- Global Constraints
- $.ts
- File Structure
- SiteSettings
- Global Constraints
- @posthog/react@^1.10.5
- Global Constraints
- @sevendays/ui@workspace:*
- posthog-js@^1.422.5
- File Structure
- File Structure
- File Structure
- File Structure
- commitUpload
- File Structure
- M8 — Admin-CMS Latency Spec
- types/src/index.ts
- types/src/index.ts
- ADR-0025: Read-through edge cache on the API's public catalog reads
- Plan: #337 — Create-button polish: Plus on every CMS create action + the New service rename
- Global Constraints
- Plan: #248 — Post-flight T8: branch Maps button (nullable coordinates, manual admin input, new-tab pin)
- card
- admin/src/router.tsx
- ADR-0026: Region placement of the api worker — the SIN hint
- users-state.ts
- Global Constraints
- split-critical-path: Keep Critical Config in Main Route File
- Create Button Polish Spec
- Landing Image Viewer Spec
- Global Constraints
- ts-query-options-loader: Use queryOptions in Loaders for Type Inference
- Global Constraints
- em-dash-sweep.mjs
- auth-server-functions: Verify Auth in Server Functions
- landing/src/lib/queries.ts
- probe-cold-hydration.mjs
- file-shared-validation: Share Validation Schemas Between Client and Server
- sec-csrf-protection: Implement CSRF Protection for Mutations
- ADR-0024: Hyperdrive connection caching (BURNED)
- sec-validate-inputs: Validate All User Inputs with Schemas
- Plan: #349 — Handover polish: sweep tool + the packages/scripts/e2e tree
- cache-defaults: Set Sensible Defaults at QueryClient Level
- cn@^0.3.0
- ts-route-context-typing: Type Route Context with createRootRouteWithContext
- file-functions-file: Use .functions.ts Pattern for Server Functions
- sf-method-selection: Choose Appropriate HTTP Method
- @sentry/tanstackstart-react@^10.72.0
- sf-response-headers: Customize Response Headers When Needed
- ADR-0028: Notifications are a derived view — the queue stays the notification
- @tanstack/react-devtools@latest
- @tanstack/react-query@^5.102.8
- @tanstack/react-router@latest
- stub-screen.tsx
- linter
- lucide-react@^1.37.0

## God Nodes (most connected - your core abstractions)
1. `Button()` - 78 edges
2. `GalleryScreen()` - 76 edges
3. `StudioServicesScreen()` - 70 edges
4. `requireSession()` - 68 edges
5. `BranchesScreen()` - 65 edges
6. `Ledger` - 65 edges
7. `AddonsScreen()` - 62 edges
8. `UsersTab()` - 62 edges
9. `TailwindConfigGenerator` - 58 edges
10. `TestimonialsScreen()` - 58 edges

## Surprising Connections (you probably didn't know these)
- `Task 3: Sign-out in the user card (the Option-2 inline affordance)` --references--> `AdminSidebar()`  [INFERRED]
  docs/superpowers/plans/2026-09-22-120-login-shell-gate.md → apps/admin/src/components/admin-sidebar.tsx
- `Task 1: Scaffold — worktree, fixtures, nav registry, route, prototype chrome` --references--> `AdminSidebar()`  [INFERRED]
  docs/superpowers/plans/2026-09-24-131-m5-prototype-admin-cms-compositions.md → apps/admin/src/components/admin-sidebar.tsx
- `Task 3: The bulk confirm's eligible-aware count (TDD seam + three screens)` --references--> `DeactivateConfirm()`  [INFERRED]
  docs/superpowers/plans/2026-09-29-155-owner-decisions.md → apps/admin/src/components/cms/shared.tsx
- `Task 3: the one-token fix (green)` --references--> `CategoryRail()`  [INFERRED]
  docs/superpowers/plans/2026-11-15-294-gallery-rail-mobile.md → apps/admin/src/components/gallery/gallery-screen.tsx
- `Not here` --references--> `onDragEnd()`  [INFERRED]
  docs/superpowers/plans/2026-11-15-309-dnd-tbody-nesting.md → apps/admin/src/components/testimonials/testimonials-screen.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Availability model (ADR-0005): Slots within Branch hours with remaining Slot capacity define bookable Availability** — apps_api_context_adr0005, apps_api_context_slot, apps_api_context_branch_hours, apps_api_context_slot_capacity, apps_api_context_availability [EXTRACTED 1.00]
- **Guest booking pipeline: Branch → Service Package → Slot → contact info → Confirmation, recorded as an Appointment** — apps_landing_context_booking_flow, apps_api_context_branch, apps_api_context_service_package, apps_api_context_slot, apps_landing_context_confirmation, apps_api_context_appointment [EXTRACTED 1.00]
- **Canonical domain vocabulary owned by the API context; landing and admin reference it via CONTEXT-MAP** — context_map, apps_api_context, apps_landing_context, apps_admin_context [EXTRACTED 1.00]
- **Sevendays ADR Series (ADR-0000 template through ADR-0011)** — docs_adr_0000_template_doc, docs_adr_0001_typescript_6_pin_and_biome_adoption_doc, docs_adr_0002_tiered_biome_configs_doc, docs_adr_0003_vitest_4_per_workspace_configs_doc, docs_adr_0004_betterauth_shared_tables_token_verification_adr_0004_api_verifies_betterauth_sessions_via_shared_tables_not_cookies, docs_adr_0005_hourly_slot_grid_capacity_doc, docs_adr_0006_shared_api_client_hono_rpc_doc, docs_adr_0007_database_connection_topology_doc, docs_adr_0008_integration_tests_vs_real_postgres_adr_0008_integration_tests_against_real_postgres, docs_adr_0009_normalized_catalog_lookups_doc, docs_adr_0010_url_path_versioning_adr_0010_url_path_versioning, docs_adr_0011_per_request_db_client_adr_0011_per_request_database_client [INFERRED 0.95]
- **Toolchain Consolidation (TS 6 pin, Biome tiers, Vitest per-workspace)** — docs_adr_0001_typescript_6_pin_and_biome_adoption_doc, docs_adr_0002_tiered_biome_configs_doc, docs_adr_0003_vitest_4_per_workspace_configs_doc, docs_tech_stack_doc, docs_progress_doc [INFERRED 0.85]
- **End-to-End Appointment Booking Flow (PRD -> availability -> API client -> milestones)** — docs_prd_guest_booking_flow, docs_adr_0005_hourly_slot_grid_capacity_hourly_slot_grid, docs_adr_0006_shared_api_client_hono_rpc_rpc_client, docs_plan_milestone_2_booking, docs_plan_milestone_3_availability, docs_architecture_doc [INFERRED 0.85]
- **Milestone 1 + M2 Pre-flight Planning Corpus** — docs_specs_2026_08_30_m1_real_data_layer_spec_m1_real_data_layer, docs_specs_2026_08_30_m2_preflight_api_client_spec_m2_preflight_api_client, docs_specs_2026_09_02_acquisition_error_seam_spec_acquisition_error_seam, docs_specs_2026_09_02_catalog_row_shaping_module_spec_catalog_row_shaping_module, docs_specs_2026_09_02_deepen_appointment_intake_spec_deepen_appointment_intake, docs_specs_2026_09_02_extract_read_stitch_module_spec_extract_read_stitch_module, docs_superpowers_plans_2026_08_30_m1_1_preflight_m1_1_preflight, docs_superpowers_plans_2026_08_31_m1_2_catalog_schema_m1_2_catalog_schema, docs_superpowers_plans_2026_08_31_m1_3_provision_migrate_seed_m1_3_provision_migrate_seed, docs_superpowers_plans_2026_09_01_frame_grouping_and_attire_normalization_frame_grouping_attire_normalization, docs_superpowers_plans_2026_09_01_m1_4_real_routes_integration_tests_m1_4_real_routes_integration_tests, docs_superpowers_plans_2026_09_02_deepen_appointment_intake_deepen_appointment_intake_plan, docs_superpowers_plans_2026_09_02_m1_5_exit_verification_m1_5_exit_verification [EXTRACTED 0.95]
- **2026-09-02 Architecture Review Candidates (A-D)** — docs_specs_2026_09_02_acquisition_error_seam_spec_acquisition_error_seam, docs_specs_2026_09_02_catalog_row_shaping_module_spec_catalog_row_shaping_module, docs_specs_2026_09_02_deepen_appointment_intake_spec_deepen_appointment_intake, docs_specs_2026_09_02_extract_read_stitch_module_spec_extract_read_stitch_module, docs_superpowers_plans_2026_09_02_deepen_appointment_intake_deepen_appointment_intake_plan [EXTRACTED 0.85]
- **Database Connection Topology + Seed Infrastructure** — docs_specs_2026_08_30_m1_real_data_layer_spec_two_connection_topology, docs_specs_2026_08_30_m1_real_data_layer_spec_adr_0007, docs_superpowers_plans_2026_08_31_m1_3_provision_migrate_seed_session_mode_pooler, docs_superpowers_plans_2026_08_31_m1_3_provision_migrate_seed_check_env_gate, docs_superpowers_plans_2026_08_31_m1_3_provision_migrate_seed_seed_upsert, docs_superpowers_plans_2026_08_31_m1_3_provision_migrate_seed_fk_indexes_natural_keys [INFERRED 0.85]

## Communities (608 total, 53 thin omitted)

### Community 0 - "Sevendays Service Catalog"
Cohesion: 0.17
Nodes (16): ADR-0009: Normalized catalog lookups for Print sizes, Attires, and Inclusions, Alternatives Considered, Attire Junction (package_inclusion_attires), Consequences, Context, Decision, ADR-0009: Normalized catalog lookups for Print sizes, Attires, Inclusions, Frames Table (+8 more)

### Community 1 - "with"
Cohesion: 0.05
Nodes (38): E2E_ADMIN_URL, E2E_API_URL, E2E_BASE_URL, E2E_SMOKE_STAFF_EMAIL, E2E_SMOKE_STAFF_PASSWORD, PLAYWRIGHT_BROWSERS_PATH, default, description (+30 more)

### Community 2 - "Three separate Cloudflare Worker deployments (landing/admin/api)"
Cohesion: 0.15
Nodes (15): @sevendays/admin — internal dashboard for content + appointments (TanStack Start), @sevendays/api — shared backend API (Hono on Cloudflare Workers), @sevendays/landing — public marketing site + appointment booking (TanStack Start), @sevendays/ui — shadcn/ui design tokens (CSS variables), Test coverage status: apps/api real vitest, landing/admin no-op, Three separate Cloudflare Worker deployments (landing/admin/api), Cloudflare Worker deploy — Vite plugin + wrangler.jsonc + wrangler secret put, @sevendays/api-client — the only supported path for both apps to call the API (+7 more)

### Community 3 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, build, db:generate, db:migrate, db:push, db:seed, db:studio, db:verify-seed (+7 more)

### Community 4 - "admin/package.json"
Cohesion: 0.08
Nodes (33): devDependencies, @cloudflare/vite-plugin@^1.54.2, @sevendays/config@workspace:*, @tailwindcss/typography@^0.5.16, @tanstack/devtools-vite@latest, @tanstack/router-cli@^1.167.33, @tanstack/router-plugin@latest, @types/node@^26.4.0 (+25 more)

### Community 5 - "landing package.json devDependencies"
Cohesion: 0.07
Nodes (29): devDependencies, @cloudflare/vite-plugin@^1.54.2, @sevendays/config@workspace:*, @tailwindcss/typography@^0.5.16, @tanstack/devtools-vite@latest, @tanstack/router-cli@^1.167.33, @tanstack/router-plugin@latest, @types/node@^26.4.0 (+21 more)

### Community 6 - "Architecture-review specs: row shaping, read-stitch, error seam, intake"
Cohesion: 0.16
Nodes (16): Candidate D — route-layer error seam, ADR-0007 seed/verify on session-mode URL, ADR-0008 minimal-fixtures stance, ADR-0009 Normalized Catalog Lookups + ordering, Candidate C — row-shaping builders, One Catalog Row-Shaping Module (Candidate C), Seeder's Natural-Key Upsert Flow, Opt-in Subpath Export (migrate precedent) (+8 more)

### Community 7 - "api/package.json"
Cohesion: 0.14
Nodes (19): devDependencies, @cloudflare/workers-types@^5, postgres@^3.4.9, @sevendays/config@workspace:*, @types/node@^26.4.0, typescript@^6.0.3, vitest@^4.1.11, wrangler@^4.127.1 (+11 more)

### Community 8 - "admin/src/routeTree.gen.ts"
Cohesion: 0.05
Nodes (38): Route, Route, Route, Route, Route, ApiAdminGalleryPhotosIdThumbRoute, ApiAuthSplatRoute, FileRoutesByFullPath (+30 more)

### Community 9 - "dependencies"
Cohesion: 0.06
Nodes (31): dependencies, better-auth@^1.7.5, class-variance-authority@^0.7.1, @dnd-kit/core@6.3.1, @dnd-kit/sortable@10.0.0, @dnd-kit/utilities@3.2.2, dotenv-cli@^11.0.0, @fontsource-variable/figtree@^5.3.0 (+23 more)

### Community 10 - "landing/package.json"
Cohesion: 0.05
Nodes (60): dependencies, class-variance-authority@^0.7.1, cn@^0.3.0, dotenv-cli@^11.0.0, @fontsource-variable/figtree@^5.3.0, @fontsource-variable/geist-mono@^5.3.0, @fontsource-variable/roboto-slab@^5.3.0, lucide-react@^1.37.0 (+52 more)

### Community 11 - "ref_vitest"
Cohesion: 0.04
Nodes (93): app, ADR-0006, ADR-0016, db, url, authed(), bearer(), db (+85 more)

### Community 12 - "packages/config package.json scripts"
Cohesion: 0.06
Nodes (35): author, description, devDependencies, @biomejs/biome@2.5.11, @types/node@^26.4.0, typescript@^6.0.3, vitest@^4.1.11, @vitest/coverage-istanbul@^4.1.10 (+27 more)

### Community 13 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, build:packages, check, clean, dev, em-dash, fix (+9 more)

### Community 14 - "packages/types package.json"
Cohesion: 0.08
Nodes (29): devDependencies, @sevendays/config@workspace:*, @types/node@^26.4.0, typescript@^6.0.3, vitest@^4.1.11, zod@^4.5.1, exports, @sevendays/config (+21 more)

### Community 15 - "The ship-provisioning runbook (#191) Implementation Plan"
Cohesion: 0.29
Nodes (6): Recon state this plan starts from (verified live 2026-10-11, pre-plan), Task 4: The media runbook — fresh-bucket steps + the corrected M6 pointer, Task 5: The docs rotation, Task 6: The PR, the close-out, the v1 pick (expected SPLIT — scripts picked, docs dropped), the ledger row, The ship-provisioning runbook (#191) Implementation Plan, What this runbook does not do

### Community 16 - "landing/src/routeTree.gen.ts"
Cohesion: 0.07
Nodes (29): options, APP, buildSentryOptions(), SentryFrontendInit, getRouter(), @tanstack/react-router, Register, Route (+21 more)

### Community 17 - "appointment-read.ts"
Cohesion: 0.24
Nodes (8): ADR-0013, appointmentFieldsSchema, EXACTLY_ONE_APPOINTMENT_MESSAGE, appointmentAddonEntrySchema, appointmentWithAddonsSchema, base, serviceOnly, ADR-0020

### Community 18 - "Shared TS config: base.json"
Cohesion: 0.12
Nodes (17): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleDetection (+9 more)

### Community 19 - "admin shadcn components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 20 - "landing shadcn components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 21 - "types tsconfig.build.json"
Cohesion: 0.13
Nodes (13): compilerOptions, declaration, declarationMap, noEmit, outDir, rootDir, exclude, extends (+5 more)

### Community 22 - "admin tsconfig.json"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, noFallthroughCasesInSwitch, noUncheckedSideEffectImports, noUnusedLocals, noUnusedParameters, paths, extends (+2 more)

### Community 23 - "api tsconfig.build.json"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, declarationMap, noEmit, outDir, rootDir, exclude, extends (+7 more)

### Community 24 - "landing tsconfig.json"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, noFallthroughCasesInSwitch, noUncheckedSideEffectImports, noUnusedLocals, noUnusedParameters, paths, extends (+2 more)

### Community 25 - "Spec: M1 real data layer"
Cohesion: 0.14
Nodes (15): GET /api/v1/addon-services, ADR-0005 Slot Capacity, ADR-0008 Integration Tests vs Real Postgres, ADR-0009 Normalized Catalog Lookups, ADR-0010 URL Path Versioning, appointment_addon_services join (price snapshot), Appointment Kind enum (scheduled|walk_in|visitation), POST /api/v1/appointments (+7 more)

### Community 26 - "db tsconfig.build.json"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, declarationMap, noEmit, outDir, rootDir, exclude, extends (+7 more)

### Community 27 - "package.ts"
Cohesion: 0.07
Nodes (32): Execution amendments (recorded at close-out, 2026-09-25), frameSchema, PackageFrame, PackageInclusion, packageInclusionKindSchema, packageInclusionSchema, ADR-0009, createServicePackageSchema (+24 more)

### Community 28 - "ui/package.json"
Cohesion: 0.06
Nodes (41): dependencies, @base-ui/react@^1.8.0, class-variance-authority@^0.7.1, cn@^0.3.0, lucide-react@^1.37.0, next-themes@^0.4.6, sonner@^2.0.8, devDependencies (+33 more)

### Community 29 - "Biome base: formatter"
Cohesion: 0.14
Nodes (16): formatter, attributePosition, bracketSameLine, bracketSpacing, enabled, expand, formatWithErrors, indentStyle (+8 more)

### Community 30 - "Biome vite tier: rules"
Cohesion: 0.12
Nodes (15): jsxQuoteStyle, javascript, formatter, linter, rules, useSortedClasses, noBarrelFile, noNamespaceImport (+7 more)

### Community 31 - "createAuth"
Cohesion: 0.23
Nodes (18): handleCreateSave(), createAuth(), banAdminUser, createAdminUser, fetchAdminUsers, fetchAdminUserSessions, listSummaries(), pluginErrorToResult() (+10 more)

### Community 32 - "compilerOptions"
Cohesion: 0.29
Nodes (7): compilerOptions, declaration, declarationMap, noEmit, outDir, rootDir, strictNullChecks

### Community 33 - "Specs: M2 preflight API client + M1.4 plan"
Cohesion: 0.23
Nodes (8): ADR-0003 Per-Workspace Vitest Configs, ADR-0004 Auth Session Sharing, ADR-0006 Shared API Client + Hono RPC, ApiClientError typed error class (status + details), @sevendays/api-client shared package, apiErrorSchema — one uniform error envelope, M2 Pre-flight — Shared API Client Spec, TanStack Query SSR wiring in both apps

### Community 34 - "env"
Cohesion: 0.19
Nodes (20): env, env, API_URL, BETTER_AUTH_URL, CF_ANALYTICS_READ_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, DATABASE_URL (+12 more)

### Community 35 - "primitive"
Cohesion: 0.18
Nodes (19): $type, $value, $type, $value, 500, 600, blue, green (+11 more)

### Community 36 - "package.json"
Cohesion: 0.14
Nodes (17): devDependencies, @biomejs/biome@2.5.11, @sevendays/config@workspace:*, turbo@^2.10.12, typescript@^6.0.3, vitest@^4.1.11, engines, node (+9 more)

### Community 37 - "rules"
Cohesion: 0.17
Nodes (12): noUnusedVariables, rules, recommended, noBarrelFile, noNamespaceImport, noReExportAll, correctness, nursery (+4 more)

### Community 38 - "includes"
Cohesion: 0.25
Nodes (7): extends, files, includes, @sevendays/config/biome/base, @sevendays/config/biome/vite, overrides, root

### Community 39 - "includes"
Cohesion: 0.29
Nodes (6): extends, files, includes, @sevendays/config/biome/base, @sevendays/config/biome/vite, root

### Community 40 - "Plan: M1.1 preflight"
Cohesion: 0.22
Nodes (8): ADR-0007 Database Connection Topology, ADR-0007 (authored in this plan), docs/plan.md Milestone 1 Checklist Rewrite, M1.1 Pre-flight Implementation Plan, Manifest Aligns (lucide-react ^1.37.0, @types/node ^26), GitHub Issue #3 — M1.1 pre-flight, Turbo globalPassThroughEnv Swap (DATABASE_URI → DATABASE_URL + DATABASE_MIGRATE_URL), ADR-0007 Amendment (probe outcome)

### Community 41 - "tasks"
Cohesion: 0.05
Nodes (37): dependsOn, env, inputs, outputs, cache, cache, cache, cache (+29 more)

### Community 42 - "Plan: M1.2 catalog schema"
Cohesion: 0.33
Nodes (7): ADR-0003 per-workspace vitest config, ADR-0009 Normalized Catalog Lookups, First Checked-In Migration 0000, Inclusion union (framed_picture|print|privilege), M1.2 Catalog Schema Implementation Plan, GitHub Issue #4 — M1.2 catalog schema, packages/types Vitest Harness

### Community 43 - "Plan: M1.4 real routes + integration tests"
Cohesion: 0.31
Nodes (7): ADR-0008 Integration Tests vs Real Postgres, ADR-0010 URL Path Versioning, /api/v1 Versioned Mount (app.route('/api/v1', api)), compose.yaml Postgres 17 Test Service, M1.4 Real API Routes + Integration Tests Plan, migrateDatabase Subpath Export in packages/db, GitHub Issue #6 — M1.4 real routes + integration tests

### Community 44 - "Biome worker tier"
Cohesion: 0.20
Nodes (9): linter, rules, noBarrelFile, noNamespaceImport, noReExportAll, performance, style, $schema (+1 more)

### Community 45 - "Shared TS config: node.json"
Cohesion: 0.25
Nodes (7): compilerOptions, module, moduleResolution, target, types, extends, $schema

### Community 46 - "db biome.json"
Cohesion: 0.29
Nodes (6): extends, files, includes, @sevendays/config/biome/base, @sevendays/config/biome/node, root

### Community 47 - "lookups-screen.tsx"
Cohesion: 0.05
Nodes (77): editButton(), openCreate(), openEdit(), AttireFlipInput, EditingTarget, LookupsScreen(), handleEditorSave(), openAttireCreate() (+69 more)

### Community 48 - "Implementation Decisions"
Cohesion: 0.14
Nodes (14): Admin UI compositions (the #131 rulings, verbatim), Environments and setup (owner-operated runbook, one-time), Implementation Decisions, Landing integration (client-side consumption), Mutation shapes, Ordering and bulk operations (closing #131's deferred decision), Read assembly and public reads, Route topology and authorization (+6 more)

### Community 49 - "Plan: M1.3 provision, migrate, seed"
Cohesion: 0.20
Nodes (8): ADR-0007 Alignment (session-pooler refinement), M1.3 Provision, Migrate, Seed Implementation Plan, GitHub Issue #5 — M1.3 provision/migrate/seed, db:verify-seed psql-Equivalent Read-Back, ADR-0009 Revised In Place (owner-sanctioned, once), Frame Grouping & Attire Normalization Implementation Plan, Frame Numbering Rules (Frame 1/2/3; unlabeled in listed order), Additive Migration 0001 (frames + junction)

### Community 50 - "$id.thumb.ts"
Cohesion: 0.23
Nodes (10): photo(), uuid(), THUMB_CACHE_IMMUTABLE, THUMB_CACHE_NO_STORE, thumbUrl(), ADR-0019, ADR-0025, Route (+2 more)

### Community 51 - "api biome.json"
Cohesion: 0.29
Nodes (6): extends, files, includes, @sevendays/config/biome/base, root, @sevendays/config/biome/worker

### Community 52 - "Plan: M1.5 exit verification"
Cohesion: 0.53
Nodes (4): Four-Act Exit Verification Runbook (pre-flight + acts 1-4), M1.5 M1 Exit Verification + Close-Out Implementation Plan, rehearsal-fixture.mjs Compose-Only Rehearsal, GitHub Issue #7 — M1.5 exit verification + close-out

### Community 53 - "migrate.ts"
Cohesion: 0.17
Nodes (7): Task 1: `packages/db` — the singleton `site_settings` table + migration 0011, Task 1: `packages/db` — the `testimonial_submissions` table + migration 0012, assertAppointmentRecord(), defaultMigrationsFolder, migrateDatabase(), ADR-0008, loadProbe()

### Community 54 - "ci.yml"
Cohesion: 0.14
Nodes (14): pnpm check gate (lint + format + typecheck + test), @sevendays/config — shared ts/biome/vitest tooling configs (built dist, gitignored), Turborepo-powered root commands (dev/build/lint/format/typecheck/test/check/fix), name, on, pull_request, push, permissions (+6 more)

### Community 55 - "biome/base.json"
Cohesion: 0.17
Nodes (10): extends, root, files, includes, javascript, $schema, vcs, clientKind (+2 more)

### Community 56 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, @sevendays/config@workspace:*, @sevendays/types@workspace:*, tsx@^4.23.13, @types/node@^26.4.0, typescript@^6.0.3, vitest@^4.1.11, @sevendays/config (+5 more)

### Community 57 - "Shared TS config: react.json"
Cohesion: 0.33
Nodes (5): compilerOptions, jsx, jsxImportSource, extends, $schema

### Community 58 - "check-env.mjs"
Cohesion: 0.14
Nodes (7): destinationDir, workspaceDirs, workspaceRoot, dbDir, dbEnvPath, devVarsPath, repoDir

### Community 59 - "attire.ts"
Cohesion: 0.36
Nodes (6): attireSchema, CreateAttireInput, createAttireSchema, ADR-0009, UpdateAttireInput, updateAttireSchema

### Community 60 - "db/package.json"
Cohesion: 0.20
Nodes (11): dependencies, drizzle-orm@^0.45.2, postgres@^3.4.9, drizzle-orm, postgres, main, name, private (+3 more)

### Community 61 - "Task 5: `apps/admin` — the Users tab (UI-bearing)"
Cohesion: 0.33
Nodes (7): AdminUserSummary, banRefusal(), deleteRefusal(), isActiveOwner(), refusalLines(), AdminUserRow, Task 5: `apps/admin` — the Users tab (UI-bearing)

### Community 62 - "validate_data.py"
Cohesion: 0.06
Nodes (44): read_rows(), TestAccessibilityGuidance, TestChartsTypographyAndIcons, TestCurrentReactGuidance, TestSemanticColors, TestGeneratedCatalogContract, _catalog_date(), _check_app_interface_contract() (+36 more)

### Community 63 - "vitest/index.ts"
Cohesion: 0.26
Nodes (4): ADR-0003, baseConfig, sharedConfig, uiConfig

### Community 64 - "addon-service.ts"
Cohesion: 0.53
Nodes (4): addonServiceSchema, createAddonServiceSchema, ADR-0020, updateAddonServiceSchema

### Community 65 - "gallery.ts"
Cohesion: 0.30
Nodes (12): createGalleryCategorySchema, createGalleryPhotoSchema, galleryCategoryOrderSchema, galleryCategorySchema, galleryPhotoOrderSchema, galleryPhotoSchema, galleryReadSchema, publicGalleryCategorySchema (+4 more)

### Community 66 - "Global Constraints"
Cohesion: 0.18
Nodes (11): A4 The fresh bucket (docs/media-bucket-runbook.md § Fresh bucket at ship), A5 Secrets + vars — the complete `v1` GitHub environment write-up, A6 The deploy under the scoped roles (the dry-run gate), A7 The CI re-point — the `v1` environment's deploy identity, B2 Domains + DNS (once the zone is Active), B3 The var flips + the cutover commit + the redeploy, B4 The production smoke — the runbook's last step, Global Constraints (+3 more)

### Community 67 - "ui/biome.json"
Cohesion: 0.33
Nodes (5): extends, @sevendays/config/biome/base, @sevendays/config/biome/vite, overrides, root

### Community 68 - "Agent docs: issue tracker & triage labels"
Cohesion: 0.17
Nodes (12): Conventions, Issue Tracker: GitHub via gh CLI, gh CLI Issue Workflow, Issue tracker: GitHub, Pull requests as a triage surface, Wayfinder Map + Child Tickets, Wayfinding operations, When a skill says "fetch the relevant ticket" (+4 more)

### Community 69 - "gray"
Cohesion: 0.11
Nodes (19): $type, $value, $type, $value, $type, $value, $type, $value (+11 more)

### Community 70 - "deploy-v1"
Cohesion: 0.18
Nodes (11): env, runs-on, environment, if, name, needs, runs-on, TEST_DATABASE_URL (+3 more)

### Community 71 - "ref_postgres"
Cohesion: 0.13
Nodes (8): sql, ADR-0007, parsed, sql, sql, AppointmentProbeAddon, AppointmentProbeExpected, AppointmentProbeResult

### Community 72 - "Plan: #350 — Handover polish: sweep the apps tree"
Cohesion: 0.20
Nodes (9): Branch law, Controller pre-flight (live-run, record before Task 1), Global Constraints, Plan: #350 — Handover polish: sweep the apps tree, Scope fences, Task 1 — the landing: product copy, placeholder glyphs, pins, echo, Task 3 — the api: visitor and staff copy, the email template, the pins, the echo, Task 4 — the mechanical sweep + the fix-up pass (+1 more)

### Community 73 - "types biome.json"
Cohesion: 0.40
Nodes (4): extends, @sevendays/config/biome/base, @sevendays/config/biome/node, root

### Community 74 - "Root biome.json"
Cohesion: 0.50
Nodes (3): extends, @sevendays/config/biome/base, $schema

### Community 75 - "steps"
Cohesion: 0.36
Nodes (10): steps, steps, steps, name, run, uses, with, working-directory (+2 more)

### Community 76 - "Biome base: source settings"
Cohesion: 0.50
Nodes (4): source, assist, actions, organizeImports

### Community 77 - "deploy-teaser"
Cohesion: 0.22
Nodes (10): cancel-in-progress, group, concurrency, environment, if, name, needs, runs-on (+2 more)

### Community 78 - "postgres"
Cohesion: 0.22
Nodes (9): services, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, env, image, options, ports (+1 more)

### Community 79 - "book.tsx"
Cohesion: 0.06
Nodes (48): addonTotalCents(), API_REASON_MAP, applicableAddonsFor(), BookingDetails, BookingSearchInit, branchChoicesFor(), branchFilterServiceId(), buildCreatePayload() (+40 more)

### Community 80 - "cms-reflection.mjs"
Cohesion: 0.22
Nodes (13): Client Config (auth-client.ts), api(), call(), request(), statusCall(), check(), JPEG, main() (+5 more)

### Community 81 - "Implementation Decisions"
Cohesion: 0.10
Nodes (20): API-side session verification (ADR-0004, made concrete), Closing the public appointments reads, Environments and secrets, Implementation Decisions, Login UI + shell gate (the UI-bearing ticket), Milestone 4 — Admin Auth (v1-track) (spec), Out of scope, Problem Statement (+12 more)

### Community 84 - "sidebar.tsx"
Cohesion: 0.10
Nodes (32): AdminSidebar(), initials(), ShellLayout(), Admin Shell + IA (Variant A) + the Tier-1 Pull-List (M3 ticket #100) Implementation Plan, Global Constraints, Self-Review, Task 1: The Tier-1 pull-list generated into packages/ui, Task 2: The decided form substrate — TanStack Form + zod 4 proven in the consuming app (+24 more)

### Community 85 - "typescript/base.json"
Cohesion: 0.22
Nodes (6): $schema, extends, $schema, exclude, extends, include

### Community 87 - "appointment.ts"
Cohesion: 0.22
Nodes (8): AppointmentKind, appointmentKindSchema, AppointmentStatus, appointmentStatusSchema, createAppointmentFieldsSchema, ADR-0020, UpdateAppointmentStatusInput, updateAppointmentStatusSchema

### Community 88 - "input"
Cohesion: 0.29
Nodes (8): padding-x, input, $type, $value, focus-ring, padding-x, $type, $value

### Community 94 - "appointment.test.ts"
Cohesion: 0.25
Nodes (7): appointmentSchema, createAppointmentSchema, baseCreate, neitherCreate, packageRow, serviceOnlyCreate, serviceRow

### Community 96 - "main"
Cohesion: 0.43
Nodes (6): check(), main(), pickDate(), peso(), phDate(), results

### Community 97 - "admin.functions.ts"
Cohesion: 0.05
Nodes (73): GROUP_ICONS, handleSaveFailure(), AdminDeleteResult, fetchAdminAddons, fetchAdminAttires, fetchAdminBranches, fetchAdminGalleryCategories, fetchAdminGalleryPhotos (+65 more)

### Community 99 - "healthcheck"
Cohesion: 0.14
Nodes (13): environment, healthcheck, image, ports, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, interval (+5 more)

### Community 104 - "exports"
Cohesion: 0.29
Nodes (7): default, types, exports, ./catalog-rows, ./migrate, default, types

### Community 105 - "booking-wizard.mjs"
Cohesion: 0.53
Nodes (5): check(), main(), peso(), phDate(), results

### Community 106 - "allowBuilds"
Cohesion: 0.20
Nodes (9): allowBuilds, core-js, esbuild, lightningcss, @sentry/cli, sharp, workerd, minimumReleaseAgeExclude (+1 more)

### Community 107 - "$type"
Cohesion: 0.60
Nodes (5): $type, $value, 700, 700, 700

### Community 108 - "json"
Cohesion: 0.05
Nodes (23): test_sync_parses_bundled_starter_template(), build_cip_prompt(), check_logo_required(), generate_cip_set(), generate_with_nano_banana(), load_env(), load_logo_image(), main() (+15 more)

### Community 109 - "HomeImageLed"
Cohesion: 0.08
Nodes (26): BranchStripItem(), HomeImageLed(), WalkInBadge(), FALLBACK_HEADING, FEATURED_COUNT, FEATURED_HEADING, selectFeaturedPackages(), A (+18 more)

### Community 110 - "ui-styling: Tailwind utilities reference"
Cohesion: 0.05
Nodes (43): Arbitrary Values, Aspect Ratio, Background Colors, Border Color, Border Radius, Border Style, Border Width, Borders (+35 more)

### Community 111 - "design-system: slide search core"
Cohesion: 0.08
Nodes (17): format_context(), format_result(), main(), BM25, calculate_pattern_break(), detect_domain(), get_background_config(), get_color_for_emotion() (+9 more)

### Community 112 - "brand: guidelines starter template"
Cohesion: 0.05
Nodes (37): 1. Color Palette, 2. Typography, 3. Logo Usage, 4. Voice & Tone, 5. Imagery Guidelines, 6. Design Components, Accessibility, AI Image Generation (+29 more)

### Community 113 - "design_system.py"
Cohesion: 0.04
Nodes (19): ansi_ljust(), _detect_page_type(), format_ascii_box(), format_markdown(), format_master_md(), format_page_override_md(), generate_design_system(), _generate_intelligent_overrides() (+11 more)

### Community 114 - "@tanstack/react-start"
Cohesion: 0.25
Nodes (8): compilerOptions, allowJs, jsx, jsxImportSource, module, noEmit, target, types

### Community 115 - "design skill docs"
Cohesion: 0.06
Nodes (35): Banner Design (Built-in), Banner: Design Rules, Banner: Quick Size Reference, Banner: Top Art Styles, Banner: Workflow, CIP Design (Built-in), CIP: Generate Brief, CIP: Generate Mockups (+27 more)

### Community 116 - "cip/core.py"
Cohesion: 0.12
Nodes (7): BM25, detect_domain(), get_cip_brief(), _load_csv(), search(), search_all(), _search_csv()

### Community 117 - "ui-styling: canvas design system"
Cohesion: 0.06
Nodes (35): 1. Visual Communication First, 2. Minimal Text Integration, 3. Expert Craftsmanship, 4. Systematic Patterns, Analog Meditation, Approach, Canvas Boundaries, Canvas Design System (+27 more)

### Community 118 - "organization-best-practices skill"
Cohesion: 0.06
Nodes (34): Active Organizations, Adding Members (Server-Side), Assigning Multiple Roles, Checking Permissions, Client-Side Setup, Complete Configuration Example, Controlling Organization Creation, Creating Custom Roles (+26 more)

### Community 119 - "lib/auth.ts"
Cohesion: 0.14
Nodes (10): auth, ADR-0011, ADR-0027, ensureSession, getSession, ADR-0011, ADR-0011, ADR-0021 (+2 more)

### Community 120 - "$type"
Cohesion: 0.60
Nodes (5): $type, $value, border, border, border

### Community 121 - "ui-ux-pro-max: prerequisites"
Cohesion: 0.06
Nodes (34): Accessibility, Available Domains, Available Stacks, Common Rules for Professional UI, Common Sticking Points, Example Workflow, How to Use This Skill, Icons & Visual Elements (+26 more)

### Community 122 - "packages/api-client package.json"
Cohesion: 0.07
Nodes (34): dependencies, hono@^4.6.0, @sevendays/types@workspace:*, zod@^4.5.1, devDependencies, @hono/zod-validator@^0.4.0, @sevendays/api@workspace:*, @sevendays/config@workspace:* (+26 more)

### Community 123 - "spacing"
Cohesion: 0.06
Nodes (34): $type, $value, $type, $value, $type, $value, $type, $value (+26 more)

### Community 124 - "Workspace Task Orchestration"
Cohesion: 0.15
Nodes (12): Commands that ignore `tasks`, Concurrency groups (v12.5.0), Cycles, Declaring task dependencies, Inspecting groups (v12.6.0), Inspecting the graph, Other dependency-aware commands, Per-task concurrency (+4 more)

### Community 125 - "Global Constraints"
Cohesion: 0.15
Nodes (12): #310 — the deployed-teaser cold-isolate hydration census — plan, Global Constraints, Not here, Self-review notes (plan-time), Task 1: branch + plan commit, Task 2: the census ruling comment on #310, Task 3: the BEFORE census (two passes) + the decision gate, Task 4: Phase B — the seam, the nine loaders, the docs (the preserved plan's Tasks 3–5, the pinned deltas) (+4 more)

### Community 126 - "search_stack"
Cohesion: 0.05
Nodes (7): _rows(), TestNativeDesktopStackFreshness, TestFixtureValidation, TestMetricMath, TestThresholdGate, _rows(), TestWebStackFreshness

### Community 127 - "pnpm/SKILL.md"
Cohesion: 0.18
Nodes (8): Cargo, Multi-Ecosystem: Python & Cargo (v12.4.0+, experimental), pnpr acceleration, Python, Rust toolchain (v12.11.0+), Best Practices, Core, Features

### Community 128 - "ui-styling: shadcn form & input components"
Cohesion: 0.06
Nodes (32): Accordion, Alert, Alert Dialog, Avatar, Badge, Button, Card, Checkbox (+24 more)

### Community 129 - "ui-styling: Tailwind responsive design"
Cohesion: 0.06
Nodes (32): 1. Mobile-First Design, 2. Consistent Breakpoint Usage, 3. Test at Breakpoint Boundaries, 4. Use Container for Content Width, 5. Progressive Enhancement, 6. Avoid Too Many Breakpoints, Best Practices, Breakpoint System (+24 more)

### Community 130 - "nav-active-states: Configure Active Link States"
Cohesion: 0.18
Nodes (10): activeOptions Reference, Bad Example, Context, Explanation, Good Example, Good Example: activeOptions, Good Example: CSS with data-status, Good Example: Render Prop for isActive (+2 more)

### Community 131 - "deploy-env-config: Configure Environment Variables Correctly"
Cohesion: 0.18
Nodes (10): Bad Example, Context, deploy-env-config: Configure Environment Variables Correctly, .env File Loading Order, Explanation, Good Example: Environment Variable Separation, Good Example: Runtime Client Variables via Server Functions, Good Example: Runtime Validation with Zod (+2 more)

### Community 132 - "better-auth security skill"
Cohesion: 0.06
Nodes (30): Account Enumeration Prevention, Background Tasks, Complete Security Configuration Example, Configuration, Configuring the Secret, Configuring Trusted Origins, Cookie Security, Cross-Subdomain Cookies (+22 more)

### Community 133 - "brand: typography specs"
Cohesion: 0.06
Nodes (30): Accessibility, Base System, Best Practices, Clean & Modern, Common Font Pairings, Contrast Requirements, CSS Implementation, Editorial (+22 more)

### Community 134 - "color"
Cohesion: 0.11
Nodes (19): $type, $value, background, foreground, muted-foreground, primary, primary-hover, secondary (+11 more)

### Community 135 - "nav-relative-paths: Understand Relative Path Navigation"
Cohesion: 0.20
Nodes (9): Bad Example, Context, Explanation, Good Example, Good Example: useNavigate with from, Good Example: Using Route.fullPath, nav-relative-paths: Understand Relative Path Navigation, Priority: MEDIUM (+1 more)

### Community 136 - "nav-use-navigate: Use useNavigate for Programmatic Navigation"
Cohesion: 0.20
Nodes (9): Bad Example, Context, Explanation, Good Example, Good Example: Route-Scoped useNavigate, Good Example: With Search Params and Replace, nav-use-navigate: Use useNavigate for Programmatic Navigation, NavigateOptions Reference (+1 more)

### Community 137 - "brand: logo usage rules"
Cohesion: 0.07
Nodes (28): Absolute Don'ts, Approved Backgrounds, Before Using Logo, Clear Space, Co-branding, Color Rules, Color Usage, Color Variants (+20 more)

### Community 138 - "design-system: component specs"
Cohesion: 0.07
Nodes (28): Alert, Anatomy, Anatomy, Anatomy, Anatomy, Anatomy, Badge, Button (+20 more)

### Community 139 - "preload-manual: Use Manual Preloading Strategically"
Cohesion: 0.20
Nodes (9): Bad Example, Context, Explanation, Good Example: After Data Fetch, Good Example: Predictive Preloading, Good Example: Preload Only JS Chunks, preload-manual: Use Manual Preloading Strategically, Preloading API (+1 more)

### Community 140 - "search-middleware: Use Search Param Middleware"
Cohesion: 0.20
Nodes (9): Bad Example, Context, Explanation, Good Example: Combining Middlewares, Good Example: Custom Middleware, Good Example: retainSearchParams, Good Example: stripSearchParams, Priority: HIGH (+1 more)

### Community 141 - "ui-styling: shadcn accessibility"
Cohesion: 0.07
Nodes (28): Accordion, Alert, ARIA Labels, Checkbox and Radio, Color Contrast, Command Palette Navigation, Component-Specific Patterns, Dialog/Modal Navigation (+20 more)

### Community 144 - "requireSession"
Cohesion: 0.04
Nodes (73): authenticationRequired(), createVerificationAuth(), requireSession(), SessionData, ADR-0004, ADR-0011, ADR-0027, VerificationAuth (+65 more)

### Community 145 - "design-system: HTML token validator"
Cohesion: 0.13
Nodes (12): get_context(), is_allowed_exception(), is_allowed_rgba(), is_inside_block(), load_css_variables(), main(), print_result(), print_summary() (+4 more)

### Community 146 - "ssr-selective: Apply Selective SSR When Beneficial"
Cohesion: 0.20
Nodes (9): Bad Example, Context, Explanation, Good Example, Good Example: Dynamic SSR with Function Form, Good Example: Global Default and Root Shell, Priority: MEDIUM, SSR Modes Reference (+1 more)

### Community 147 - "M9 — Admin Notifications & Search Spec"
Cohesion: 0.20
Nodes (9): Further Notes, Implementation Decisions, M9 — Admin Notifications & Search Spec, Out of Scope, Problem Statement, Solution, Testing Decisions, User Stories (+1 more)

### Community 148 - "scripts/core.py"
Cohesion: 0.06
Nodes (31): BM25, _contains_phrase(), detect_domain(), _domain_keywords(), _exact_match_diagnostic(), _exact_row_identity(), _exact_stack_identifier(), _file_signature() (+23 more)

### Community 149 - "pnpm: performance practices"
Cohesion: 0.07
Nodes (26): Benchmarking, Compare Install Times, Configuration Summary, Filter to Changed Packages, Global Virtual Store, Install Optimizations, Lockfile-only Mode, Lockfile Optimization (+18 more)

### Community 150 - "Release Management (v11.13.0+)"
Cohesion: 0.22
Nodes (8): Configuration (`versioning` in pnpm-workspace.yaml), Epics, Lanes, Recording a change, Release Management (v11.13.0+), Release notes on pnpr, Releasing, Validation & the ledger

### Community 151 - "err-fallback-data: Provide Fallback Data When Appropriate"
Cohesion: 0.22
Nodes (8): Bad Example, Context, err-fallback-data: Provide Fallback Data When Appropriate, Explanation, Good Example: keepPreviousData for Pagination, Good Example: placeholderData from Cache, placeholderData vs initialData, Priority: MEDIUM

### Community 152 - "err-retry-config: Configure Retry Logic Appropriately"
Cohesion: 0.22
Nodes (8): Bad Example, Context, err-retry-config: Configure Retry Logic Appropriately, Explanation, Good Example, Good Example: Global Retry Defaults, Priority: HIGH, Retry Option Reference

### Community 153 - "mut-error-handling: Handle Mutation Errors Gracefully"
Cohesion: 0.22
Nodes (7): Bad Example, Context, Explanation, Good Example: mutateAsync with try/catch, Good Example: onError Callback, mut-error-handling: Handle Mutation Errors Gracefully, Priority: HIGH

### Community 154 - "mut-loading-states: Use isPending for Mutation Loading States"
Cohesion: 0.22
Nodes (8): Bad Example, Context, Explanation, Good Example, Good Example: Inline Optimistic Item with variables, mut-loading-states: Use isPending for Mutation Loading States, Mutation Status Reference, Priority: MEDIUM

### Community 156 - "brand: asset approval checklist"
Cohesion: 0.08
Nodes (25): Accessibility, Archival, Asset Approval Checklist, Automation Support, Color Compliance, Common Issues & Fixes, Content Accessibility, Content Quality (+17 more)

### Community 157 - "design: logo prompt engineering"
Cohesion: 0.08
Nodes (25): Common Pitfalls, Core Prompt Structure, Detailed Brief, Eco/Sustainable, Effective Keywords by Style, Fashion Brand, Healthcare, Industry-Specific Prompts (+17 more)

### Community 158 - "Two-factor auth best practices skill"
Cohesion: 0.08
Nodes (25): Backup Code Configuration, Backup Codes, Client-Side Setup, Complete Configuration Example, Configuring OTP Delivery, Disabling 2FA, Displaying Backup Codes, Displaying the QR Code (+17 more)

### Community 159 - "brand: color palette management"
Cohesion: 0.08
Nodes (24): Accessibility Requirements, Brand Compliance Validation, Checking Contrast, Color Documentation Format, Color Extraction, Color Palette Examples, Color Palette Management, Color System Structure (+16 more)

### Community 160 - "design: CIP deliverable guide"
Cohesion: 0.08
Nodes (24): Apparel, Business Card, Car/Sedan, CIP Deliverable Guide, Core Identity, Digital Assets, Email Signature, Envelope (+16 more)

### Community 161 - "design: logo search scripts"
Cohesion: 0.12
Nodes (6): BM25, detect_domain(), _load_csv(), search(), search_all(), _search_csv()

### Community 162 - "design-system: states & variants"
Cohesion: 0.08
Nodes (24): Accessibility, Accessibility Requirements, ARIA States, Color Contrast, Color Variants, Disabled States, Error Messages, Error States (+16 more)

### Community 163 - "perf-notify-change-props: Limit Re-renders with notifyOnChangeProps"
Cohesion: 0.22
Nodes (8): Bad Example, Context, Explanation, Good Example, Good Example: Manual Override, Good Example: Prefetch Observer (No Re-renders), perf-notify-change-props: Limit Re-renders with notifyOnChangeProps, Priority: LOW

### Community 164 - "ui-styling skill overview"
Cohesion: 0.08
Nodes (24): Accessibility Patterns, Alternative: Tailwind-Only Setup, Best Practices, Common Patterns, Component Layer: shadcn/ui, Component Library Guide, Component + Styling Setup, Core Stack (+16 more)

### Community 165 - "design: social photos workflow"
Cohesion: 0.08
Nodes (23): Art Direction Styles (Reuse from Banner), Color & Contrast, Design Best Practices, HTML Design Rules, HTML Template Structure, Option A: Chrome Headless CLI (Recommended — zero dependencies), Option B: chrome-devtools skill, Option C: Playwright script (+15 more)

### Community 166 - "pf-ensure-query-data: Use ensureQueryData for Conditional Prefetching"
Cohesion: 0.22
Nodes (8): API Comparison, Bad Example, Context, Explanation, Good Example, Good Example: With revalidateIfStale, pf-ensure-query-data: Use ensureQueryData for Conditional Prefetching, Priority: MEDIUM

### Community 167 - "test_design_system_mode.py"
Cohesion: 0.07
Nodes (14): _contrast_ratio(), _derive_dark_palette(), _filter_anti_patterns_for_mode(), _palette_is_dark(), _query_wants_dark(), _relative_luminance(), _resolve_color_mode(), _select_palette_for_mode() (+6 more)

### Community 168 - "posthog.ts"
Cohesion: 0.14
Nodes (36): MetricsEnv, escapeHogqlString(), eventsFilter(), fetchTrafficMetrics(), hogqlHostList(), isoToHogqlDatetime(), mungeTopPages(), mungeTrafficSeries() (+28 more)

### Community 169 - "design-system skill overview"
Cohesion: 0.09
Nodes (22): Best Practices, Chart.js Integration, Command, Component Spec Pattern, Contextual Decision Flow, Decision System CSVs, Design System, Integration (+14 more)

### Community 170 - "radius"
Cohesion: 0.11
Nodes (27): $type, $value, lg, sm, $type, $value, $type, $value (+19 more)

### Community 171 - "ui-styling: Tailwind customization"
Cohesion: 0.09
Nodes (22): @apply Directive, Best Practices, Color Customization, Complete Tailwind Config, Configuration Examples, Content Configuration, Custom Color Palette, Custom Font Sizes (+14 more)

### Community 172 - "Env"
Cohesion: 0.06
Nodes (42): Env, envSchema, parseEnv(), ADR-0007, ADR-0021, acquireDb(), createTestAuth(), signOutSession() (+34 more)

### Community 173 - "Migration to pnpm"
Cohesion: 0.09
Nodes (22): CI/CD Migration, Configuration Migration, From Lerna, From npm, From npm Workspaces, From Yarn, From Yarn Workspaces, Gradual Migration (+14 more)

### Community 175 - "create-auth skill"
Cohesion: 0.10
Nodes (19): Auth UI Implementation, Common Plugins, Create Auth Skill, Database Adapters, Database Migrations, Drizzle Config (`drizzle.config.ts`), Drizzle + PostgreSQL Setup, Environment Variables (+11 more)

### Community 176 - "pnpm Store"
Cohesion: 0.08
Nodes (23): Check disk usage, Configuration, Disk Space Benefits, Global Virtual Store, Hard link issues (network drives, Docker), Hoisted Mode, How It Works, Isolated Mode (Default) (+15 more)

### Community 177 - "pf-stale-time-config: Set staleTime When Prefetching"
Cohesion: 0.22
Nodes (8): Bad Example, Context, Explanation, Good Example: Global Default for SSR/Prefetch Apps, Good Example: staleTime on useQuery, pf-stale-time-config: Set staleTime When Prefetching, Priority: MEDIUM, The Problem Visualized

### Community 178 - "ssr-hydration-boundary: Wrap with HydrationBoundary"
Cohesion: 0.22
Nodes (8): Bad Example, Context, Explanation, Good Example: Pages Router / Remix, Good Example: Remove Boilerplate in _app.tsx, Good Example: Server Components (App Router), Priority: HIGH, ssr-hydration-boundary: Wrap with HydrationBoundary

### Community 179 - "ctx-before-load: Extend Context in beforeLoad"
Cohesion: 0.22
Nodes (8): Bad Example, Context, ctx-before-load: Extend Context in beforeLoad, Execution Order, Explanation, Good Example, Good Example: Building Context Incrementally, Priority: LOW

### Community 180 - "ADR-0004: API verifies BetterAuth sessions via shared tables, not cookies"
Cohesion: 0.12
Nodes (31): BetterAuth Staff Auth, ADR-0004: API verifies BetterAuth sessions via shared tables, not cookies, Alternatives Considered, Consequences, Context, Decision, Shared Session Tables Token Verification, ADR-0005: Hourly slot grid with per-slot capacity (+23 more)

### Community 181 - "design: routing by task type"
Cohesion: 0.10
Nodes (19): Banner Design Tasks, Brand Identity Tasks, Component Creation, Corporate Identity Program Tasks, Design Routing Guide, Design System Migration, Icon Design Tasks, Implementation Tasks (+11 more)

### Community 182 - "design-system: slide generator"
Cohesion: 0.13
Nodes (11): _e(), generate_chart_slide(), generate_cta_slide(), generate_deck(), generate_metrics_slide(), generate_problem_slide(), generate_solution_slide(), generate_testimonial_slide() (+3 more)

### Community 183 - "ctx-dependency-injection: Use Context for Dependency Injection"
Cohesion: 0.22
Nodes (8): Bad Example, Context, ctx-dependency-injection: Use Context for Dependency Injection, Explanation, Good Example, Good Example: Invalidating on Context Change, Good Example: Passing React Hook Values, Priority: LOW

### Community 184 - "ui-styling: shadcn theming"
Cohesion: 0.10
Nodes (19): Base Color Presets, Best Practices, Color Customization, Color Format, Component Customization, CSS Variable System, Customize Styles, Customize Variants (+11 more)

### Community 186 - "vitest: core test API"
Cohesion: 0.10
Nodes (20): Async Tests, Basic Test, Benchmarks (v5), Concurrent Tests, Custom Test with Fixtures, Failing Tests, Focus Tests, Key Points (+12 more)

### Community 187 - "Mocking"
Cohesion: 0.09
Nodes (23): Async Timer Methods, Auto-advancing and Tick Modes, Auto-Cleanup with `using`, Auto-mock with Spy, Clearing Mocks, Conditional Mocking with vi.when (v5), Config Auto-Reset, Dynamic Mocking (vi.doMock) (+15 more)

### Community 188 - "catalog-rows.ts"
Cohesion: 0.09
Nodes (37): Catalog Row-Shaping Module — Implementation Plan, File Structure, Global Constraints, Task 0: Branch and environment bootstrap, Task 1: The row-shaping builders (TDD) + opt-in subpath export, Task 2: Derive the truncate table list from the exported schema, Task 3: Adopt the builders in the API test fixtures, Task 4: Adopt the builders in the seeder (+29 more)

### Community 189 - "Better Auth Integration Guide"
Cohesion: 0.10
Nodes (19): Better Auth Integration Guide, CLI Commands, Client, Common Gotchas, Core Config Options, Database, Documentation Version, Email Flows (+11 more)

### Community 190 - "brand: asset organization"
Cohesion: 0.11
Nodes (18): Asset Entry (manifest.json), Asset Organization Guide, By Campaign, By Status, By Type, Cleanup Workflow, Components, Directory Structure (+10 more)

### Community 191 - "design: logo color psychology"
Cohesion: 0.11
Nodes (18): Accessibility Considerations, Analogous, Black, Blue, Color Combinations by Industry, Color Harmony Types, Complementary, Green (+10 more)

### Community 192 - "design: logo types & style guide"
Cohesion: 0.11
Nodes (18): 1. Wordmark (Logotype), 2. Lettermark (Monogram), 3. Pictorial Mark (Brand Mark), 4. Abstract Mark, 5. Mascot, 6. Emblem, 7. Combination Mark, Aesthetic Styles (+10 more)

### Community 193 - "pnpm CI/CD Setup"
Cohesion: 0.10
Nodes (20): Basic Setup, Best Practices Summary, Build Changed Packages Only, Cache the metadata cache too, Docker, --frozen-lockfile, GitHub Actions, GitLab CI (+12 more)

### Community 194 - "pnpm: patches"
Cohesion: 0.11
Nodes (18): allowUnusedPatches, Best Practices, Creating a Patch, List Patched Packages, Managing Patches, Multiple Packages / Workspaces, Patch Configuration, Patch fails to apply (+10 more)

### Community 195 - "Roadmap"
Cohesion: 0.25
Nodes (8): Explicitly Deferred (post-v1, see PRD "Out of Scope"), Milestone 0 — Baseline (complete — exit criteria verified 2026-08-30), Milestone 1 — Real Data Layer, Milestone 2 — Public Booking Flow, Milestone 3 — Booking Availability, Milestone 4 — Admin Auth + Dashboard, Milestone 6 — Production Hardening, Roadmap

### Community 196 - "Root AGENTS.md conventions"
Cohesion: 0.11
Nodes (15): Agent skills, Commands, Current status of `pnpm test`, Directory Structure, Domain docs, Engineering Rules, graphify, Issue tracker (+7 more)

### Community 197 - "brand: consistency checklist"
Cohesion: 0.11
Nodes (17): Audit Frequency, Brand Consistency Checklist, Channel Audit, Collateral, Colors, Common Issues, Email, Imagery (+9 more)

### Community 198 - "design: CIP mockup prompts"
Cohesion: 0.11
Nodes (17): Apparel (Polo/T-Shirt), Base Prompt Structure, Business Card, CIP Mockup Prompt Engineering, Context Modifiers, Corporate Minimal, Deliverable-Specific Modifiers, Letterhead (+9 more)

### Community 199 - "design-system: semantic colors"
Cohesion: 0.11
Nodes (17): Accent, Applying Semantic Tokens, Background & Foreground, Border & Ring, Color Semantics, Dark Mode Overrides, Destructive, Interactive States (+9 more)

### Community 200 - "csv"
Cohesion: 0.06
Nodes (14): generate_css_for_background(), get_background_image(), get_curated_images(), get_overlay_css(), get_pexels_search_url(), load_backgrounds_config(), load_brand_colors(), main() (+6 more)

### Community 201 - "Override Patterns"
Cohesion: 0.10
Nodes (19): Basic Syntax, Common Use Cases, Convergence overrides, Debugging, Deduplicate Dependencies, Dependency-type selectors and wildcards, Fix Peer Dependency Issues, Hooks Alternative (+11 more)

### Community 202 - "pnpm: peer dependencies"
Cohesion: 0.11
Nodes (17): Adding Peer Dependencies via packageExtensions, Allow Multiple Major Versions, allowAny, allowedVersions, Auto-Install Peer Dependencies, Best Practices, Common Scenarios, Debugging Peer Dependencies (+9 more)

### Community 203 - "vitest: vi utilities"
Cohesion: 0.11
Nodes (18): Assertion Helpers — vi.defineHelper (4.1+), Conditional Mocking — vi.when (v5), Dynamic Mocking, Fake Timers, Global/Env Mocking, Global Mock Management, Hoisted Code, Key Points (+10 more)

### Community 204 - "vitest: describe API"
Cohesion: 0.11
Nodes (17): Basic Usage, Concurrent Suites, Describe API, describe.each, describe.for, Focus Suites, Hooks in Suites, Key Points (+9 more)

### Community 205 - "Code Coverage"
Cohesion: 0.11
Nodes (18): CI Integration, Code Coverage, Configuration, Coverage with Sharding, Ignoring Code, Istanbul, Istanbul, Key Points (+10 more)

### Community 206 - "ADR-0010: URL path versioning"
Cohesion: 0.15
Nodes (15): ADR-0006: Shared API client via Hono RPC type-sharing, called server-to-server only, Alternatives Considered, Consequences, Context, Decision, ADR-0006: Shared API client via Hono RPC type-sharing (server-to-server only), Hono RPC Shared API Client (packages/api-client), Server-Mediated Topology (browser -> own app -> api) (+7 more)

### Community 207 - "api-client tsconfig.build.json"
Cohesion: 0.13
Nodes (13): compilerOptions, declaration, declarationMap, noEmit, outDir, rootDir, exclude, extends (+5 more)

### Community 208 - "pnpm CLI Commands"
Cohesion: 0.09
Nodes (23): Cache (registry metadata), Clean / reproducible installs, dlx / pnx — run without installing, Filter patterns, Global packages (v11 isolated installs), Inspection / registry, Installation Commands, Key Points (+15 more)

### Community 209 - "tanstack-query: quick reference"
Cohesion: 0.12
Nodes (16): Caching (Prefix: `cache-`), Error Handling (Prefix: `err-`), Full Reference, How to Use, Infinite Queries (Prefix: `inf-`), Mutations (Prefix: `mut-`), Offline Support (Prefix: `offline-`), Parallel Queries (Prefix: `parallel-`) (+8 more)

### Community 210 - "tanstack-router: quick reference"
Cohesion: 0.12
Nodes (16): Code Splitting (Prefix: `split-`), Data Loading (Prefix: `load-`), Error Handling (Prefix: `err-`), Full Reference, How to Use, Navigation (Prefix: `nav-`), Preloading (Prefix: `preload-`), Quick Reference (+8 more)

### Community 211 - "tanstack-start: quick reference"
Cohesion: 0.12
Nodes (16): API Routes (Prefix: `api-`), Authentication (Prefix: `auth-`), Deployment (Prefix: `deploy-`), Environment (Prefix: `env-`), Error Handling (Prefix: `err-`), File Organization (Prefix: `file-`), Full Reference, How to Use (+8 more)

### Community 212 - "ADR-0005: Hourly slot grid with per-slot capacity for booking availability"
Cohesion: 0.40
Nodes (5): ADR-0005: Hourly slot grid with per-slot capacity for booking availability, Alternatives Considered, Consequences, Context, Decision

### Community 214 - "50"
Cohesion: 0.67
Nodes (4): $type, $value, 50, 50

### Community 215 - "vitest/SKILL.md"
Cohesion: 0.21
Nodes (3): Advanced, Core, Features

### Community 216 - "Expect API"
Cohesion: 0.11
Nodes (18): Assertion Count, Asymmetric Matchers, Basic Assertions, Chai-Style Spy Assertions (4.1+), Conditional Mock Exhaustion (v5), Error Assertions, Expect API, `expect.unreachable` (+10 more)

### Community 217 - "Per-context CONTEXT docs"
Cohesion: 0.13
Nodes (12): Admin, Language, Availability decision (ADR-0005), API, Availability (ADR-0005), Language, Landing, Language (+4 more)

### Community 218 - "ADRs: TS 6 pin & tiered Biome"
Cohesion: 0.14
Nodes (17): ADR-0001: Pin TypeScript to ^6.0.3 and standardize on Biome for lint + format, Alternatives Considered, Biome Replaces ESLint + Prettier, Consequences, Context, Decision, ADR-0001: Pin TypeScript to ^6.0.3, standardize on Biome, Maximal Biome Ruleset (preset all + nursery) (+9 more)

### Community 219 - "800"
Cohesion: 0.67
Nodes (4): $type, $value, 800, 800

### Community 220 - "banner-design: sizes & styles"
Cohesion: 0.12
Nodes (15): 22 Art Direction Styles, Banner Sizes & Art Direction Styles Reference, Complete Banner Sizes, CTA Rules, Design Principles, Pinterest Research Queries, Print, Print Specs (+7 more)

### Community 221 - "design: banner sizes & styles"
Cohesion: 0.12
Nodes (15): 22 Art Direction Styles, Banner Sizes & Art Direction Styles Reference, Complete Banner Sizes, CTA Rules, Design Principles, Pinterest Research Queries, Print, Print Specs (+7 more)

### Community 222 - "icon/generate.py"
Cohesion: 0.10
Nodes (13): apply_color(), apply_viewbox_size(), extract_svgs(), generate_batch(), generate_icon(), generate_sizes(), load_env(), main() (+5 more)

### Community 223 - "fontSize"
Cohesion: 0.11
Nodes (20): $type, $value, $type, $value, $type, $value, $type, $value (+12 more)

### Community 224 - "pnpm Workspaces"
Cohesion: 0.11
Nodes (18): Best Practices, Converting from `workspaces`, Cross-project task graphs, Dependency-based Filtering, Example Project Structure, Execute commands, Filtering Packages, Install dependencies (+10 more)

### Community 225 - "pnpm Aliases"
Cohesion: 0.12
Nodes (15): Add multiple versions, Add with alias, Basic Syntax, Best Practices, CLI Usage, Combined with Overrides, Git and Local Aliases, Multiple Versions of Same Package (+7 more)

### Community 226 - "load-loader-deps: Define loaderDeps for Cache Control"
Cohesion: 0.22
Nodes (8): Bad Example, Context, Explanation, Good Example, Good Example: With TanStack Query, How the Cache Key Works, load-loader-deps: Define loaderDeps for Cache Control, Priority: HIGH

### Community 227 - "padding-y"
Cohesion: 0.67
Nodes (4): padding-y, padding-y, $type, $value

### Community 228 - "Implementation Decisions"
Cohesion: 0.11
Nodes (18): Further Notes, Implementation Decisions, Milestone 6 — Production Hardening & Observability (spec), Out of Scope, Problem Statement, Sequencing (workstream order; the ticket-cut pass slices precisely), Ship-time provisioning, topology, domains, secrets (#176 + the #129 carry), Solution (+10 more)

### Community 229 - "book.tsx"
Cohesion: 0.12
Nodes (29): entityFields(), ChoiceCard(), ConfirmationCard(), HourChip(), HourChipGrid(), RejectionCard(), SummaryRail(), BookingWizard (+21 more)

### Community 231 - "vitest: test environments"
Cohesion: 0.12
Nodes (15): Available Environments, Browser Mode (Separate from Environments), Configuration, CSS and Assets, Custom Environment, Environment with VM, Fixing External Dependencies, happy-dom Environment (+7 more)

### Community 232 - "Type Testing"
Cohesion: 0.12
Nodes (16): assertType, Branded Types, Configuration, Equality vs Matching, expectTypeOf API, Function Types, Generic Types, Key Points (+8 more)

### Community 233 - "Test Filtering"
Cohesion: 0.12
Nodes (17): By File Path, By Test Name, Changed Files, CLI Filtering, Combining Filters, Environment-based Filtering, Focus Tests (.only), Include/Exclude Patterns (+9 more)

### Community 234 - "Spec & plan: deepen appointment intake"
Cohesion: 0.17
Nodes (11): ADR-0005 Slot Capacity (M3), ADR-0007 transaction-pooling refinement note, ADR-0008 compose integration suite, ADR-0011 per-request db client (untouched), Deepen the Appointment Intake Module (Candidate A), client-transaction.test.ts Compose Seam 2 Proof, db.transaction Wrapping Resolve + Both Inserts, Deepen the Appointment Intake Module Implementation Plan (+3 more)

### Community 235 - "design: CIP design reference"
Cohesion: 0.13
Nodes (14): CIP Brief (Start Here), CIP Design Reference, Commands, Deliverable Categories, Design Styles, Detailed References, Generate Mockups, HTML Presentation Features (+6 more)

### Community 236 - "design: icon design reference"
Cohesion: 0.13
Nodes (14): Available Styles, CLI Options, Commands, Generate Batch Variations, Generate Multiple Sizes, Generate Single Icon, Icon Categories, Icon Design Reference (+6 more)

### Community 237 - "design: slides copywriting"
Cohesion: 0.13
Nodes (14): AIDA (Attention-Interest-Desire-Action), Before-After-Bridge, Contrast Patterns, Copywriting Formulas, Core Formulas, Cost of Inaction, FAB (Features-Advantages-Benefits), Formula-to-Slide Mapping (+6 more)

### Community 238 - "slides: copywriting formulas"
Cohesion: 0.13
Nodes (14): AIDA (Attention-Interest-Desire-Action), Before-After-Bridge, Contrast Patterns, Copywriting Formulas, Core Formulas, Cost of Inaction, FAB (Features-Advantages-Benefits), Formula-to-Slide Mapping (+6 more)

### Community 239 - "org-file-based-routing: Prefer File-Based Routing for Conventions"
Cohesion: 0.22
Nodes (8): Bad Example, Bundler Setup, Context, Explanation, File Naming Conventions, Good Example, org-file-based-routing: Prefer File-Based Routing for Conventions, Priority: CRITICAL

### Community 240 - "org-pathless-layouts: Use Pathless Routes for Shared Layouts"
Cohesion: 0.22
Nodes (8): Bad Example, Context, Directory Style, Explanation, Good Example, Multiple Pathless Layouts, org-pathless-layouts: Use Pathless Routes for Shared Layouts, Priority: CRITICAL

### Community 241 - "preload-stale-time: Configure Preload Stale Time"
Cohesion: 0.22
Nodes (8): Bad Example, Cache Time Comparison, Context, Explanation, Good Example: Built-In Cache Tuning, Good Example: With TanStack Query, preload-stale-time: Configure Preload Stale Time, Priority: MEDIUM

### Community 243 - "testimonial.ts"
Cohesion: 0.18
Nodes (11): paginateTestimonials(), TESTIMONIAL_PAGE_SIZE, CreateTestimonialInput, createTestimonialSchema, PublicTestimonial, publicTestimonialSchema, TestimonialOrderInput, testimonialOrderSchema (+3 more)

### Community 244 - "sheet.tsx"
Cohesion: 0.19
Nodes (16): GlobalSearchResults(), SearchResultItem(), File Structure, Global Constraints, M9 Ticket 3 — Search everywhere (the below-sm top sheet + the `?focus=` landing) Implementation Plan, Task 3: The below-sm magnifier + top sheet — the narrow form of Global Search, Task 4: Gates, the owner's as-built variants reaction, the live walkthrough, docs rotation, PR, the v1 pick, issues, graphify, Sheet() (+8 more)

### Community 245 - "Commands"
Cohesion: 0.12
Nodes (16): Command Line Interface, Commands, Common Options, Key Points, Package.json Scripts, Sharding for CI, `vitest`, `vitest bench` (+8 more)

### Community 246 - "vitest: lifecycle hooks"
Cohesion: 0.13
Nodes (14): Around Hooks, aroundAll, Basic Hooks, Cleanup Return Pattern, Concurrent Test Hooks, Extended Test Hooks, Hook Execution Order, Hook Timeout (+6 more)

### Community 247 - "Snapshot Testing"
Cohesion: 0.13
Nodes (15): Basic Snapshot, Concurrent Test Snapshots, Custom Serializers, Custom Snapshot Matchers (4.1+), Error Snapshots, File Snapshots, Inline Snapshots, Key Points (+7 more)

### Community 248 - "Domain: Appointment context"
Cohesion: 0.23
Nodes (15): Dashboard — appointment-management view filterable by Branch and Status, Deactivate — catalog action hiding a Service Package from the landing site, Fulfillable — an Appointment staff still need to act on, Add-on Service — optional paid extra (hairstyle, makeup) attached to an Appointment at booking, Appointment — customer's reserved time at a Branch for a Service Package, Attire — wardrobe context (Toga, Filipiniana, Executive, Uniform), stored atomically, Deactivated Service Package — hidden from landing and new bookings, existing Appointments stay valid, Frame — physical frame bundled with a Service Package, numbered per package (+7 more)

### Community 249 - "admin README: production build"
Cohesion: 0.13
Nodes (15): Adding A Route, Adding Links, API Routes, Building For Production, Data Fetching, Deploy to Cloudflare Workers, Linting & Formatting, Optional Configuration (+7 more)

### Community 250 - "BranchRead"
Cohesion: 0.06
Nodes (36): FlipInput, bookableBranchNames(), BRANCHES, CALAMBA, DIPOLOG, ILIGAN, BookingCatalog, Delivery Versions — v1 (Free Handover) / v2 (Paid Booking System) (spec) (+28 more)

### Community 251 - "Progress log & DB topology ADRs"
Cohesion: 0.18
Nodes (14): Consequences, Database connection topology, ADR-0007: Database connection topology, ADR-0011: Per-request database client, Alternatives Considered, Consequences, Context, Decision (+6 more)

### Community 252 - "Catalog docs: packages"
Cohesion: 0.13
Nodes (15): Basic Package (BP), Customize Package (CP-1), Customize Package (CP-2), Discounts & Promotions, Package A, Package B, Package C, Package D (+7 more)

### Community 253 - "Plan: M1.2 constraints"
Cohesion: 0.13
Nodes (14): Global Constraints, M1.2 — Catalog schema: lookups, inclusions, add-ons, Kind — Implementation Plan, Task 10: Generate and review the first migration, Task 11: ADR-0009 — normalized catalog lookups, Task 12: Full verification + handoff, Task 1: Zod — Print size + Attire lookups, and the types test harness, Task 2: Zod — the Inclusion union, Task 3: Zod — Add-on Service (+6 more)

### Community 254 - "DesignSystemGenerator"
Cohesion: 0.06
Nodes (12): DesignSystemGenerator, apply_decision_rules(), _object_without_duplicates(), parse_decision_rules(), _validate_action(), TestReasoningMatch, read_rows(), split_values() (+4 more)

### Community 255 - "banner-design skill overview"
Cohesion: 0.14
Nodes (13): Art Direction Styles (Top 10), Banner Design - Multi-Format Creative Banner System, Banner Size Quick Reference, Design Rules, Prerequisites, Security, Step 1: Gather Requirements (AskUserQuestion), Step 2: Research & Art Direction (+5 more)

### Community 256 - "brand: messaging framework"
Cohesion: 0.14
Nodes (13): Core Statements, Elevator Pitches, Framework Structure, Message Architecture, Message by Audience, Message Testing, Messaging Framework, Mission Statement (+5 more)

### Community 257 - "brand: voice framework"
Cohesion: 0.14
Nodes (13): Brand Voice Framework, Character Spectrum, Emotion Spectrum, Language Spectrum, Step 1: Define Personality Traits, Step 2: Create Voice Chart, Step 3: Context Adaptation, Tone Spectrum (+5 more)

### Community 258 - "brand: color extraction script"
Cohesion: 0.20
Nodes (11): calculateCompliance(), colorDistance(), displayPalette(), extractHexColors(), findNearestBrandColor(), fs, generateImageMagickCommand(), hexToRgb() (+3 more)

### Community 259 - "brand: asset validation script"
Cohesion: 0.25
Nodes (13): checkManifest(), formatBytes(), formatOutput(), fs, main(), parseFilename(), path, RULES (+5 more)

### Community 260 - "design: slides layout patterns"
Cohesion: 0.14
Nodes (13): Card Styles, Component Variants, CSS Structures, Feature Grid (3 columns), Layout Decision Flow, Layout Patterns, Layout Selection by Use Case, Metric Styles (+5 more)

### Community 261 - "design-system: Tailwind integration"
Cohesion: 0.14
Nodes (13): Animation Tokens, Base Layer, Button Example, Component Classes, CSS Variables Setup, Dark Mode Toggle, HSL Format Benefits, shadcn/ui Alignment (+5 more)

### Community 262 - "email & password best practices skill"
Cohesion: 0.14
Nodes (13): Callback URLs, Client Side Validation, Custom Hashing Algorithm, Email Verification Setup, Password Hashing, Password Requirements, Password Reset Flows, Quick Start (+5 more)

### Community 263 - "slides: layout patterns"
Cohesion: 0.14
Nodes (13): Card Styles, Component Variants, CSS Structures, Feature Grid (3 columns), Layout Decision Flow, Layout Patterns, Layout Selection by Use Case, Metric Styles (+5 more)

### Community 264 - "deploy-adapters: Choose Appropriate Deployment Adapter"
Cohesion: 0.18
Nodes (10): Adapter Comparison, Bad Example, Context, deploy-adapters: Choose Appropriate Deployment Adapter, Explanation, Good Example: Bun, Good Example: Cloudflare Workers, Good Example: Netlify (+2 more)

### Community 265 - "search-defaults: Provide Sensible Defaults for Search Params"
Cohesion: 0.22
Nodes (7): Bad Example, Context, Explanation, Good Example: With Valibot (Standard Schema — No Adapter Needed), Good Example: With Zod Adapter (Recommended), Priority: HIGH, search-defaults: Provide Sensible Defaults for Search Params

### Community 266 - "Seed the v1 branch — the one filter-repo pass (booking-free artifact line) (#80) Implementation Plan"
Cohesion: 0.50
Nodes (3): Global Constraints, Seed the v1 branch — the one filter-repo pass (booking-free artifact line) (#80) Implementation Plan, Verified pre-plan facts (probed against the real workspace 2026-09-11, HEAD `0bdfe82`)

### Community 267 - "vitest: concurrency"
Cohesion: 0.14
Nodes (14): Bail on Failure, CI Example (GitHub Actions), Concurrency & Parallelism, Concurrent Tests, File Parallelism, Isolation, Key Points, Max Concurrency (+6 more)

### Community 268 - "ADR template & domain-docs guide"
Cohesion: 0.16
Nodes (13): ADR-XXXX: <short, decision-oriented title>, Alternatives Considered, Consequences, Context, Decision, ADR Template, Before exploring, read these, CONTEXT-MAP.md + per-context CONTEXT.md (+5 more)

### Community 269 - "ADR-0008: Integration tests against real Postgres"
Cohesion: 0.15
Nodes (13): ADR-0003: Vitest 4 with a per-workspace config requirement, Alternatives Considered, Consequences, Context, Decision, ADR-0003: Vitest 4 per-workspace config requirement, Per-Workspace Vitest Config Requirement, ADR-0008: Integration tests against real Postgres (+5 more)

### Community 270 - "brand: update guide"
Cohesion: 0.15
Nodes (12): Color Presets, Examples, Files Modified, Important, Overview, Skills Used, Step 1: Gather Brand Input, Step 2: Update Brand Guidelines (+4 more)

### Community 271 - "design: logo design reference"
Cohesion: 0.15
Nodes (12): Available Styles, Color Psychology, Commands, Design Brief (Start Here), Detailed References, Generate Logo, Industry Defaults, Logo Design Reference (+4 more)

### Community 272 - "design-system: token architecture"
Cohesion: 0.15
Nodes (12): Categories, Dark Mode, File Organization, Layer 1: Primitive Tokens, Layer 2: Semantic Tokens, Layer 3: Component Tokens, Layer Overview, Migration from Flat Tokens (+4 more)

### Community 273 - "destructive"
Cohesion: 0.67
Nodes (3): destructive, $type, $value

### Community 274 - "Global Virtual Store, Git Worktrees, Global Packages & Shims"
Cohesion: 0.20
Nodes (9): Git worktrees for multi-agent development, Global packages (v11 isolated installs), Global virtual store, Global Virtual Store, Git Worktrees, Global Packages & Shims, Key Points, Limitations, Other package managers (v12), Project-aware global bins (v12) (+1 more)

### Community 275 - "search-type-inheritance: Leverage Parent Search Param Types"
Cohesion: 0.22
Nodes (8): Bad Example, Context, Explanation, Good Example, Good Example: Global Search Params on Root, Preserving Inherited Params During Navigation, Priority: HIGH, search-type-inheritance: Leverage Parent Search Param Types

### Community 276 - "Projects"
Cohesion: 0.14
Nodes (14): Basic Projects Setup, Browser + Node Projects, Different Environments, Global Setup per Project, Key Points, Monorepo Pattern, Per-Project Pool & Isolation (v4), Project-Specific Dependencies (+6 more)

### Community 277 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, create-staff, deploy, dev, fix, fix:unsafe, format (+6 more)

### Community 278 - "landing package.json scripts"
Cohesion: 0.15
Nodes (13): scripts, build, deploy, dev, fix, fix:unsafe, format, generate-routes (+5 more)

### Community 279 - "Plan: M1.4 file structure"
Cohesion: 0.15
Nodes (12): File Structure, Global Constraints, M1.4 — Real API Routes + Integration Tests Implementation Plan, Self-Review, Task 1: Shared types — apiErrorSchema + resolved read shapes (TDD), Task 2: db package — programmatic migrate export (TDD), Task 3: Compose db + global setup + first live integration test (branches), Task 4: Catalog reads — service-packages + addon-services (TDD) (+4 more)

### Community 280 - "Plan: intake deepening file structure"
Cohesion: 0.15
Nodes (12): Deepen the Appointment Intake Module — Implementation Plan, File Structure, Global Constraints, Self-Review (recorded at plan time), Task 0: Branch and environment bootstrap, Task 1: Live pooler transaction probe script (Seam 3 tooling), Task 2: Run the live probe + record the outcome (confirmation gate, part 1), Task 3: STUB comment fix + compose transaction proof (Seam 2) (+4 more)

### Community 281 - "Tech stack doc"
Cohesion: 0.15
Nodes (13): Auth, Backend (`apps/api`), Data Layer, Email, Frontend (`apps/landing`, `apps/admin`), Monorepo, Observability, Provisioning Postgres (done 2026-08-31 — record of how it was done) (+5 more)

### Community 282 - "destructive-foreground"
Cohesion: 0.67
Nodes (3): destructive-foreground, $type, $value

### Community 283 - "muted"
Cohesion: 0.67
Nodes (3): muted, $type, $value

### Community 284 - "design-system: primitive tokens"
Cohesion: 0.17
Nodes (11): Border Radius, Color Scales, Gray Scale, Motion / Duration, Primary Colors (Blue), Primitive Tokens, Shadows, Spacing Scale (+3 more)

### Community 285 - "design-system: token validator"
Cohesion: 0.24
Nodes (11): extensions, formatReport(), fs, getFiles(), main(), parseArgs(), path, patterns (+3 more)

### Community 286 - "pnpm Hooks (.pnpmfile.mjs)"
Cohesion: 0.12
Nodes (15): afterAllResolved, beforePacking, Custom resolvers & fetchers (advanced), Delegating to built-in fetchers, Finders (pnpm list / why), Hook reference, Hooks vs Overrides, Key Points (+7 more)

### Community 287 - "tanstack-integration rule: SSR dehydrate/hydrate"
Cohesion: 0.17
Nodes (11): Bad Example, Context, Explanation, Good Example: Custom QueryClientProvider, Good Example: Modern SSR Integration, Good Example: Vite Configuration, Good Example: With Error and NotFound Components, Priority: CRITICAL (+3 more)

### Community 288 - "tanstack-integration: quick reference"
Cohesion: 0.17
Nodes (11): Additional SSR (Prefix: `ssr-`), Caching (Prefix: `cache-`), Data Flow (Prefix: `flow-`), Full Reference, How to Use, Quick Reference, Rule Categories by Priority, Setup (Prefix: `setup-`) (+3 more)

### Community 289 - "tanstack-query rule: network mode"
Cohesion: 0.17
Nodes (11): Bad Example, Context, Explanation, Good Example: Always Mode for Offline-First, Good Example: Default Online Mode with Offline UI, Good Example: Mutation Offline Queue, Good Example: Offline-First Mode, Good Example: Online Status Detection (+3 more)

### Community 290 - "tanstack-query rule: query persistence"
Cohesion: 0.17
Nodes (11): Bad Example, Context, Explanation, Good Example: Async Persistence with IndexedDB, Good Example: Basic Persistence with localStorage, Good Example: Handling Restoration Loading, Good Example: React Native with AsyncStorage, Good Example: Selective Persistence (+3 more)

### Community 291 - "tanstack-query rule: cancellation"
Cohesion: 0.17
Nodes (11): Bad Example, Context, Explanation, Good Example: Custom Cancellable Promise, Good Example: In Mutations (Before Optimistic Update), Good Example: Manual Cancellation, Good Example: Using AbortSignal with Fetch, Good Example: With Axios (+3 more)

### Community 292 - "tanstack-router rule: default options"
Cohesion: 0.17
Nodes (11): Bad Example, Context, Explanation, Good Example: DefaultCatchBoundary Component, Good Example: DefaultNotFound Component, Good Example: Full Configuration, Good Example: Route-Level Overrides, Good Example: With Pending Component (+3 more)

### Community 293 - "tanstack-router rule: search serializers"
Cohesion: 0.17
Nodes (11): Bad Example, Context, Explanation, Good Example: Base64 for Complex State, Good Example: Hybrid Approach, Good Example: Using JSURL for Compact URLs, Good Example: Using qs for Nested Objects, Good Example: Using query-string for Flat Params (+3 more)

### Community 294 - "tanstack-start rule: API routes"
Cohesion: 0.17
Nodes (11): api-routes: Create Server Routes for External Consumers, Bad Example, Context, Explanation, Good Example: Basic Server Route, Good Example: RESTful Resource with Dynamic Params, Good Example: Using createHandlers for Handler-Specific Middleware, Good Example: Webhook Handler (+3 more)

### Community 295 - "tanstack-start rule: env functions"
Cohesion: 0.17
Nodes (11): Bad Example, Context, env-functions: Use Environment Functions for Configuration, Environment Variable Checklist, Explanation, Good Example: Environment-Specific Behavior, Good Example: Feature Flags via Environment, Good Example: Public vs Private Config (+3 more)

### Community 296 - "tanstack-start rule: hydration safety"
Cohesion: 0.17
Nodes (11): Bad Example, Common Hydration Mismatch Causes, Context, Debugging Hydration Errors, Explanation, Good Example: Client-Only Components, Good Example: Consistent Server/Client Rendering, Good Example: Handling Time Zones (+3 more)

### Community 297 - "ssr-prerender: Configure Static Prerendering and ISR"
Cohesion: 0.17
Nodes (11): Bad Example, Cache-Control Directives, Context, Explanation, Good Example: Hybrid Static/Dynamic, Good Example: ISR with Cache Headers, Good Example: On-Demand Revalidation via Server Route, Good Example: Per-Page Prerender Config (+3 more)

### Community 298 - "split-auto-splitting: Enable autoCodeSplitting When Possible"
Cohesion: 0.22
Nodes (8): Bad Example, Context, Customizing Split Groups, Explanation, Good Example, Per-Route Overrides, Priority: MEDIUM, split-auto-splitting: Enable autoCodeSplitting When Possible

### Community 299 - "auth-cookie-security: Configure Secure Cookie Settings"
Cohesion: 0.22
Nodes (8): auth-cookie-security: Configure Secure Cookie Settings, Bad Example, Context, Cookie Security Settings Reference, Explanation, Good Example, Good Example: Session Operations, Priority: HIGH

### Community 300 - "err-not-found: Handle Not-Found Scenarios"
Cohesion: 0.22
Nodes (8): Bad Example, Context, err-not-found: Handle Not-Found Scenarios, Explanation, Good Example, Good Example: Not-Found in beforeLoad, Good Example: Targeting a Specific Route, Priority: MEDIUM

### Community 303 - "Plan: M2 E2E verification facts"
Cohesion: 0.17
Nodes (11): fillContactAndConfirm(), Global Constraints, M2 Close-out — end-to-end verification + docs (#48) Implementation Plan, Self-Review (against issue #48 + the M2 spec), Task 1: Extend the verification harness (recipient email + notes + id tail; new Resend evidence script), Task 2: The live end-to-end gate (bookings + DB confirm + email evidence), Task 3: ADR-0013 — the generalized-appointment model, Task 4: ADR-0014 — the email send topology (+3 more)

### Community 304 - "Plan: M1.5 file structure"
Cohesion: 0.17
Nodes (11): File Structure, Global Constraints, M1.5 — M1 Exit Verification + Close-Out Implementation Plan, Self-Review, Task 1: Probe script — `verify-appointment-row.mjs` (TDD, unit + compose), Task 2: Rehearsal on compose — prove the probe before it touches the live DB, Task 3: Pre-flight audit + Act 1 — create the Appointment via the deployed API, Task 4: Act 2 — confirm the row in Postgres (probe against live) (+3 more)

### Community 305 - "testimonial-submission.ts"
Cohesion: 0.11
Nodes (29): submitTestimonial, buildTestimonialSubmissionPayload(), canSubmitTestimonialForm(), FORM_BOUNDS, GENERIC_SEND_FAILURE_LINE, PERSON_TOO_SHORT_LINE, QUOTE_TOO_SHORT_LINE, valid (+21 more)

### Community 306 - "brand: visual identity"
Cohesion: 0.18
Nodes (10): Color Palette, Colors, Core Visual Elements, Logo, Logo, Quick Checks, Typography, Typography (+2 more)

### Community 307 - "brand: context injection script"
Cohesion: 0.31
Nodes (10): extractColorsFromTable(), extractCoreAttributes(), extractHexColors(), extractImageStyle(), extractTypography(), extractVoice(), fs, generatePromptAddition() (+2 more)

### Community 308 - "design: CIP style guide"
Cohesion: 0.18
Nodes (10): Bold Dynamic, CIP Design Style Guide, Classic Traditional, Color Psychology, Corporate Minimal, Fresh Modern, Luxury Premium, Modern Tech (+2 more)

### Community 309 - "design-system: token embedding"
Cohesion: 0.17
Nodes (8): args, fs, minimal, MINIMAL_TOKENS, path, projectRoot, tokensPath, wrapStyle

### Community 310 - "pnpm Configuration"
Cohesion: 0.15
Nodes (12): Environment variables, Global configuration (config.yaml), Key Points, Notable settings that changed names, .npmrc — authentication only, Package Manager / Runtime pinning (package.json), Per-project settings in a workspace (packageConfigs), pnpm Configuration (+4 more)

### Community 311 - "pnpm Catalogs"
Cohesion: 0.15
Nodes (12): Adding to a catalog from the CLI, Basic Usage, Benefits, Best Practices, Catalog vs Overrides, Keeping overrides in sync with a catalog, Migration from Overrides, Named Catalogs (+4 more)

### Community 312 - "pnpm Supply-Chain Security"
Cohesion: 0.14
Nodes (13): Approving builds, Block exotic transitive sources, Build-script approval (allowBuilds), Escape hatch (dangerous), Key Points, Lockfile integrity, Lockfile scanners: two-document lockfile, Minimum release age (+5 more)

### Community 313 - "tanstack-integration rule: single cache source"
Cohesion: 0.18
Nodes (10): Bad Example, Cache Comparison, cache-single-source: Let TanStack Query Manage Caching, Context, Explanation, Good Example, Good Example: Coordinated Caching Config, Good Example: Preload Still Works (+2 more)

### Community 314 - "tanstack-query rule: placeholder data"
Cohesion: 0.18
Nodes (10): Bad Example, cache-placeholder-vs-initial: Understand Placeholder vs Initial Data, Comparison Table, Context, Explanation, Good Example: Combining Both, Good Example: initialData for Known Good Data, Good Example: keepPreviousData Pattern (+2 more)

### Community 315 - "tanstack-query rule: infinite page params"
Cohesion: 0.18
Nodes (10): Accessing Flattened Data, Bad Example, Context, Explanation, Good Example: Bi-directional Pagination, Good Example: Cursor-Based Pagination, Good Example: Offset-Based Pagination, Good Example: With Total Count (+2 more)

### Community 316 - "tanstack-query rule: select transform"
Cohesion: 0.18
Nodes (10): Bad Example, Context, Explanation, Good Example, Good Example: Picking Single Item from List, Good Example: Selecting Specific Fields, Good Example: Stable Select with useCallback, perf-select-transform: Use Select to Transform and Filter Data (+2 more)

### Community 317 - "err-not-found: Handle Not-Found Routes Properly"
Cohesion: 0.09
Nodes (20): Bad Example, Context, err-not-found: Handle Not-Found Routes Properly, Explanation, Good Example: Catch-All Route, Good Example: Nested Not Found Bubbling, Good Example: Not Found with Data, Good Example: Root-Level Not Found (+12 more)

### Community 318 - "tanstack-router rule: ensureQueryData"
Cohesion: 0.18
Nodes (10): Bad Example, Context, ensureQueryData vs prefetchQuery vs fetchQuery, Explanation, Good Example, Good Example: Dependent Queries, Good Example: Multiple Parallel Queries, load-ensure-query-data: Use ensureQueryData with TanStack Query (+2 more)

### Community 319 - "tanstack-router rule: parallel loading"
Cohesion: 0.18
Nodes (10): Bad Example, Context, Explanation, Good Example: Parallel in Single Loader, Good Example: Parallel Nested Routes, Good Example: Streaming Non-Critical Data, Good Example: With TanStack Query, load-parallel: Leverage Parallel Route Loading (+2 more)

### Community 320 - "tanstack-router rule: Link component"
Cohesion: 0.18
Nodes (10): Bad Example, Context, Explanation, Good Example, Good Example: With Active States, Good Example: With Preloading, Good Example: With Search Params, nav-link-component: Prefer Link Component for Navigation (+2 more)

### Community 321 - "tanstack-router rule: route masks"
Cohesion: 0.18
Nodes (10): Bad Example, Context, Explanation, Good Example: Programmatic Navigation with Mask, Good Example: Route Masks for Modal, Good Example: Unmask on Interaction, Good Example: With Search Params, nav-route-masks: Use Route Masks for Modal URLs (+2 more)

### Community 322 - "tanstack-router rule: virtual routes"
Cohesion: 0.18
Nodes (10): Bad Example, Context, Decision Guide, Explanation, Good Example: File Structure with Virtual Routes, Good Example: Generated Route Tree, Good Example: Let Virtual Routes Handle It, Good Example: When You DO Need Main Route File (+2 more)

### Community 323 - "primary-foreground"
Cohesion: 0.67
Nodes (3): primary-foreground, $type, $value

### Community 324 - "tanstack-start rule: request middleware"
Cohesion: 0.18
Nodes (10): Bad Example, Context, Explanation, Good Example: Authentication Middleware, Good Example: Global Middleware Configuration, Good Example: Logging Middleware, Good Example: Rate Limiting Middleware, Middleware Execution Order (+2 more)

### Community 325 - "tanstack-start rule: streaming SSR"
Cohesion: 0.18
Nodes (10): Bad Example, Context, Explanation, Good Example: Error Boundaries with Streaming, Good Example: Nested Suspense Boundaries, Good Example: Progressive Enhancement, Good Example: Stream Non-Critical Content, Priority: MEDIUM (+2 more)

### Community 326 - "err-redirects: Use Redirects Appropriately"
Cohesion: 0.22
Nodes (8): Bad Example, Context, err-redirects: Use Redirects Appropriately, Explanation, Good Example, Good Example: External Redirects, Good Example: Handling Redirects in try/catch, Priority: MEDIUM

### Community 327 - "ring"
Cohesion: 0.67
Nodes (3): ring, $type, $value

### Community 328 - "secondary-foreground"
Cohesion: 0.67
Nodes (3): secondary-foreground, $type, $value

### Community 329 - "brand skill overview"
Cohesion: 0.20
Nodes (9): Brand, Brand Sync Workflow, Quick Start, References, Routing, Scripts, Subcommands, Templates (+1 more)

### Community 330 - "design: slide strategies"
Cohesion: 0.20
Nodes (9): Common Structures, Duarte Sparkline Pattern, Matching Strategy to Context, Product Demo (6 slides), Sales Pitch (9 slides), Search Commands, Slide Strategies, Strategy Selection (+1 more)

### Community 331 - "white"
Cohesion: 0.67
Nodes (3): white, $type, $value

### Community 332 - "design-system: component tokens"
Cohesion: 0.20
Nodes (9): Alert Tokens, Badge Tokens, Button Tokens, Card Tokens, Component Tokens, Dialog/Modal Tokens, Input Tokens, Table Tokens (+1 more)

### Community 333 - "design-system: token generator"
Cohesion: 0.36
Nodes (9): flattenTokens(), fs, generateCSS(), generateTailwind(), main(), parseArgs(), path, resolveReference() (+1 more)

### Community 334 - "Product — Sevendays (studio-wide record)"
Cohesion: 0.07
Nodes (25): Capabilities and Constraints, Operating Context, Platform, Product, Admin (staff site), Product Principles, Product Purpose, Users, Accessibility & Inclusion (+17 more)

### Community 335 - "pnpm Config Dependencies"
Cohesion: 0.17
Nodes (11): Auto-loaded plugins, Constraints, Declaring config dependencies, Import hook logic from a shared package, Key Points, pnpm Config Dependencies, Registry and security, Share patch files (+3 more)

### Community 336 - "slides: slide strategies"
Cohesion: 0.20
Nodes (9): Common Structures, Duarte Sparkline Pattern, Matching Strategy to Context, Product Demo (6 slides), Sales Pitch (9 slides), Search Commands, Slide Strategies, Strategy Selection (+1 more)

### Community 337 - "tanstack-integration rule: loader + query"
Cohesion: 0.20
Nodes (9): Bad Example, Context, Data Flow Summary, Explanation, flow-loader-query-pattern: Use Loaders with ensureQueryData, Good Example, Good Example: Optional Prefetch with Non-Critical Data, Good Example: Parallel Data Loading (+1 more)

### Community 338 - "tanstack-query rule: mutation state"
Cohesion: 0.20
Nodes (9): Bad Example, Context, Explanation, Filters Reference, Good Example, Good Example: Optimistic UI in Separate Component, Good Example: Track Specific Mutations, mut-mutation-state: Use useMutationState for Cross-Component Mutation Tracking (+1 more)

### Community 339 - "tanstack-query rule: optimistic updates"
Cohesion: 0.20
Nodes (9): Bad Example, Context, Explanation, Good Example: Optimistic Create with Temporary ID, Good Example: Via Cache Manipulation, Good Example: Via UI Variables (Simpler), mut-optimistic-updates: Implement Optimistic Updates for Responsive UI, Priority: HIGH (+1 more)

### Community 340 - "tanstack-query rule: useQueries"
Cohesion: 0.20
Nodes (9): Bad Example, Context, Explanation, Good Example, Good Example: Dependent Parallel Queries, Good Example: With Combine Option, Good Example: With Suspense, parallel-use-queries: Use useQueries for Dynamic Parallel Queries (+1 more)

### Community 341 - "tanstack-query rule: intent prefetch"
Cohesion: 0.20
Nodes (9): Bad Example, Context, Explanation, Good Example, Good Example: Prefetch with Delay, Good Example: With TanStack Router, pf-intent-prefetch: Prefetch on User Intent (Hover, Focus), Prefetch Triggers (+1 more)

### Community 342 - "tanstack-router rule: root context"
Cohesion: 0.20
Nodes (9): Bad Example, Context, Context vs. Loader Data, ctx-root-context: Define Context at Root Route, Explanation, Extending Context with beforeLoad, Good Example, Good Example: Auth-Protected Routes (+1 more)

### Community 343 - "tanstack-router rule: route loaders"
Cohesion: 0.20
Nodes (9): Bad Example, Context, Explanation, Good Example, Good Example: With Parameters, Good Example: With TanStack Query, load-use-loaders: Use Route Loaders for Data Fetching, Loader Context Properties (+1 more)

### Community 344 - "tanstack-router rule: preload on intent"
Cohesion: 0.20
Nodes (9): Bad Example, Context, Explanation, Good Example, Good Example: With TanStack Query Integration, preload-intent: Enable Intent-Based Preloading, Preload Options, Preload Strategies (+1 more)

### Community 345 - "tanstack-router rule: search validation"
Cohesion: 0.20
Nodes (9): Bad Example, Context, Explanation, Good Example: Manual Validation, Good Example: With Valibot, Good Example: With Zod, Priority: HIGH, search-validation: Always Validate Search Params (+1 more)

### Community 346 - "tanstack-router rule: lazy routes"
Cohesion: 0.20
Nodes (9): Automatic Code Splitting, Bad Example, Context, Explanation, Good Example, Priority: MEDIUM, split-lazy-routes: Use .lazy.tsx for Code Splitting, Using getRouteApi in Lazy Components (+1 more)

### Community 347 - "tanstack-router rule: useParams from"
Cohesion: 0.20
Nodes (9): Bad Example, Context, Explanation, Good Example, Priority: CRITICAL, ts-use-from-param: Use `from` Parameter for Type Narrowing, Using getRouteApi for Code-Split Components, Using Route.fullPath for Type Safety (+1 more)

### Community 348 - "tanstack-start rule: auth protection"
Cohesion: 0.20
Nodes (9): auth-route-protection: Protect Routes with beforeLoad, Bad Example, Context, Explanation, Good Example: Conditional Content Based on Auth, Good Example: Preserving Redirect URL, Good Example: Role-Based Access, Good Example: Route-Level Protection (+1 more)

### Community 349 - "tanstack-start rule: session management"
Cohesion: 0.20
Nodes (9): auth-session-management: Implement Secure Session Handling, Bad Example, Context, Explanation, Good Example: Full Authentication Flow, Good Example: Secure Session Cookie, Good Example: Session with Role-Based Access, Priority: HIGH (+1 more)

### Community 350 - "tanstack-start rule: file separation"
Cohesion: 0.20
Nodes (9): Bad Example, Context, Explanation, File Convention Summary, file-separation: Separate Server and Client Code, Good Example: Clear Separation, Good Example: Environment Variables, Good Example: Using in Components (+1 more)

### Community 351 - "tanstack-start rule: createServerFn"
Cohesion: 0.20
Nodes (9): Bad Example, Context, Explanation, Good Example, Good Example: GET Function for Data Fetching, Good Example: With Context and Dependencies, Key Benefits, Priority: CRITICAL (+1 more)

### Community 352 - "tanstack-start rule: input validation"
Cohesion: 0.20
Nodes (9): Bad Example, Context, Explanation, Good Example: Complex Validation, Good Example: Transform and Refine, Good Example: With Zod Validation, Priority: CRITICAL, sf-input-validation: Always Validate Server Function Inputs (+1 more)

### Community 354 - "Plan: #340 — Image viewer: package-detail cover zoom — the lone-image variant"
Cohesion: 0.16
Nodes (14): coverSlides(), photoSlides(), Testing Decisions, Self-review record (run 2026-11-21, before commit), Global Constraints, Owner rulings (settled at charting + the #328 pick, recorded in the spec), Plan: #340 — Image viewer: package-detail cover zoom — the lone-image variant, Scope fences (+6 more)

### Community 355 - "vitest: context & fixtures"
Cohesion: 0.20
Nodes (10): Built-in Context, Composing & Hooks, Custom Fixtures — Builder Pattern (4.1+, recommended), Fixture Options, Fixture Scopes (3.2+), Injected Fixtures (per-project values), Key Points, Object Syntax (Playwright-compatible) (+2 more)

### Community 356 - "Domain: Branch context"
Cohesion: 0.31
Nodes (10): CMS — content-management area of the admin site, Availability — Slots of a Branch on a date, within Branch hours, with remaining Slot capacity, Branch — one of the studio's three physical photography locations, Branch hours — weekly opening hours defining which Slots exist, Slot — one fixed hour of a Branch's schedule, Slot capacity — maximum number of Appointments a Branch accepts in one Slot, Walk-in flag — per-Branch boolean for accepting customers without an Appointment, Availability (customer view) — slot picker shows only open Slots for the chosen Branch and date (+2 more)

### Community 357 - "Draft: v2 offer sheet prototype"
Cohesion: 0.22
Nodes (8): How we proceed, Part A — the sheet draft (client-facing), Part B — boundary ledger (owner-facing; NEVER part of the sheet), PROTOTYPE — v2 offer sheet draft (throwaway), Sevendays Photography — Online Booking, What it looks like when it's done, What's included, What you saw in the demo

### Community 358 - "v1 picks runbook"
Cohesion: 0.14
Nodes (13): Conflict policy on transformed surfaces, Content pass — what never enters `v1` even on a v1-path, Executing a PICK, Executing a SPLIT, Fallback — the squashed snapshot, Path pass — `scripts/v1-triage.mjs`, The locks — after every push, The loop — on every squash merge to main (+5 more)

### Community 359 - "Product requirements doc"
Cohesion: 0.20
Nodes (10): Admin site (`apps/admin`), Landing site (`apps/landing`), Out of Scope for V1 (future), Problem, Product Requirements — Sevendays, Shared / platform, Success Criteria, User Stories (+2 more)

### Community 360 - "Spec: acquisition/error seam"
Cohesion: 0.24
Nodes (7): One Acquisition/Error Seam for the API (Candidate D), ADR-0006 M2 route restructure (app type + env), ADR-0008 Integration Tests vs Real Postgres, ADR-0010 versioned subapp mount, ADR-0011 Per-Request DB Client, notFound → Uniform JSON 404, Uniform 500 onError Handler

### Community 361 - "Plan: M1.1 constraints"
Cohesion: 0.20
Nodes (9): Global Constraints, M1.1 — Pre-flight Implementation Plan, Task 1: CI workflow, Task 2: Env examples + gitignore the Worker secrets file, Task 3: Turbo passthrough swap, Task 4: Manifest aligns (lucide-react, @types/node), Task 5: ADR-0007 — database connection topology, Task 6: Rewrite the `docs/plan.md` Milestone 1 checklist (+1 more)

### Community 362 - "Plan: frame grouping & attire"
Cohesion: 0.20
Nodes (9): File Structure, Frame Grouping & Attire Normalization — Implementation Plan, Global Constraints, Self-Review, Task 1: Zod — frames schemas + inclusion reshape (TDD), Task 2: Drizzle — frames + junction, migration 0001, live apply, Task 3: Seed — catalog restructure + frames/junction seeding, Task 4: Verify — frames + attire-aware read-back (+1 more)

### Community 364 - "Plan: M2 preflight-5 facts"
Cohesion: 0.20
Nodes (9): Global Constraints, M2 Pre-flight 5/5 — Close-out: end-to-end verification + roadmap ticks (#25) Implementation Plan, Self-Review (against issue #25 + spec), Task 1: Fold in the carried-forward deferred minors, Task 2: Consolidated end-to-end re-verification pass (landing + admin), Task 3: Full gates + progress.md refresh, Task 4: Tick the `docs/plan.md` M2 pre-flight checkboxes (`- [✅]` + dated), Task 5: graphify update + final commit (GitGraph current) (+1 more)

### Community 365 - "brand: tokens sync script"
Cohesion: 0.29
Nodes (8): adjustBrightness(), { execFileSync }, extractColorsFromMarkdown(), fs, generateColorScale(), main(), path, updateDesignTokens()

### Community 366 - "css"
Cohesion: 0.67
Nodes (3): css, parser, tailwindDirectives

### Community 367 - "tanstack-integration rule: QueryClient context"
Cohesion: 0.22
Nodes (8): Bad Example, Context, Explanation, Good Example: Modern Router Setup, Good Example: Root Route with Context, Good Example: Testing with Mock QueryClient, Priority: CRITICAL, setup-query-client-context: Pass QueryClient Through Router Context

### Community 368 - "tanstack-query rule: gcTime"
Cohesion: 0.22
Nodes (8): Bad Example, cache-gc-time: Configure gcTime for Inactive Query Retention, Context, Explanation, Good Example, Priority: CRITICAL, Recommended gcTime Values, Understanding gcTime vs staleTime

### Community 369 - "tanstack-query rule: error boundaries"
Cohesion: 0.22
Nodes (8): Bad Example, Context, err-error-boundaries: Use Error Boundaries with useQueryErrorResetBoundary, Error Boundary Placement Strategy, Explanation, Good Example, Good Example: With TanStack Router, Priority: HIGH

### Community 370 - "tanstack-query rule: invalidation"
Cohesion: 0.22
Nodes (8): Bad Example, Context, Explanation, Good Example, mut-invalidate-queries: Always Invalidate Related Queries After Mutations, Pattern: Invalidate or Update Directly, Pattern: Mutation with Variables Access, Priority: HIGH

### Community 371 - "tanstack-query rule: SSR dehydration"
Cohesion: 0.22
Nodes (8): Bad Example, Context, Explanation, Good Example: Manual SSR Setup, Good Example: Next.js App Router, Good Example: TanStack Start/Router, Priority: MEDIUM, ssr-dehydration: Use Dehydrate/Hydrate Pattern for SSR

### Community 372 - "tanstack-router rule: register router"
Cohesion: 0.22
Nodes (8): Bad Example, Benefits of Registration, Context, Explanation, File-Based Routing Setup, Good Example, Priority: CRITICAL, ts-register-router: Register Router Type for Global Inference

### Community 373 - "mw-composability: Compose Middleware Effectively"
Cohesion: 0.22
Nodes (8): Bad Example, Context, Explanation, Good Example: Composable Middleware Chain, Good Example: Global Middleware in start.ts, Good Example: Middleware for Server Routes, mw-composability: Compose Middleware Effectively, Priority: HIGH

### Community 374 - "Plan: #57 brand token unification"
Cohesion: 0.29
Nodes (6): Brand → shadcn Token Unification Prototype (wayfinder #57) Implementation Plan, Global Constraints, Task 1: Apply the owner's shadcn preset to landing, Task 2: Lift the token layer into packages/ui as the single shared source, Task 3: Throwaway showcase route /prototype-tokens, Task 4: Full check, push, and ticket handover

### Community 375 - "Configuration"
Cohesion: 0.18
Nodes (11): Basic Setup, Common Options, Conditional Configuration, Configuration, Key Points, Merging Configs, Projects (Monorepos), Using with Existing Vite Config (+3 more)

### Community 376 - "vitest: reporters"
Cohesion: 0.22
Nodes (8): Blob & Merge (CI/sharding), Built-in Reporters, Default Selection, HTML Report (v5 paths), JUnit Templating, Key Points, Output Files, Reporters

### Community 377 - "progress.tsx"
Cohesion: 0.15
Nodes (13): StepProgress(), contactFieldErrors(), Booking Flow Componentized, Zero Flow Changes (M3 ticket #99) Implementation Plan, Global Constraints, Self-Review, Task 1: The seam guard + the contact gate as a Zod schema (lib, test-first), Task 3: `book.tsx` onto the components — the full restyle, Task 4: `booking.$id.tsx` — ConfirmationCard + the not-found on the system (+5 more)

### Community 378 - "Architecture doc"
Cohesion: 0.22
Nodes (9): Architecture, Auth (planned, not yet wired up), Data Flow: Booking a Shoot, Deployment Targets, Media Storage, Module Boundaries, Observability, System Overview (+1 more)

### Community 379 - "Spec hub: M1 data layer"
Cohesion: 0.22
Nodes (8): Further Notes, Implementation Decisions, Milestone 1 — Real Data Layer (spec), Out of Scope, Problem Statement, Solution, Testing Decisions, User Stories

### Community 380 - "Spec hub: M2 preflight"
Cohesion: 0.22
Nodes (8): Further Notes, Implementation Decisions, Out of Scope, Problem Statement, Solution, Spec: M2 pre-flight — shared API client (`@sevendays/api-client`) + TanStack Query wiring, Testing Decisions, User Stories

### Community 381 - "Spec hub: error seam"
Cohesion: 0.22
Nodes (8): Further Notes, Implementation Decisions, Out of Scope, Problem Statement, Solution, Spec: One acquisition/error seam for the API (architecture review, candidate D), Testing Decisions, User Stories

### Community 382 - "Spec hub: row shaping"
Cohesion: 0.22
Nodes (8): Further Notes, Implementation Decisions, Out of Scope, Problem Statement, Solution, Spec: One catalog row-shaping module, three consumers (architecture review, candidate C), Testing Decisions, User Stories

### Community 383 - "Spec hub: intake deepening"
Cohesion: 0.22
Nodes (8): Further Notes, Implementation Decisions, Out of Scope, Problem Statement, Solution, Spec: Deepen the Appointment intake module, Testing Decisions, User Stories

### Community 384 - "Spec hub: read-stitch"
Cohesion: 0.22
Nodes (8): Further Notes, Implementation Decisions, Out of Scope, Problem Statement, Solution, Spec: Extract the read-stitch module (architecture review, candidate B), Testing Decisions, User Stories

### Community 385 - "Plan: M1.3 file structure"
Cohesion: 0.22
Nodes (8): Environment facts (controller-verified 2026-09-01), File Structure, Global Constraints, M1.3 — Provision, migrate, seed the real catalog — Implementation Plan, Task 1: Pre-flight gate + env template, Task 2: Fold FK indexes + natural keys into migration 0000 (pre-migrate ruling), Task 3: ADR-0007 alignment — the three stale `DATABASE_URL` spots + the session-pooler reality, Task 4: Seed + verify scripts (the re-runnable catalog seed)

### Community 389 - "Plan: M2 preflight-4 facts"
Cohesion: 0.22
Nodes (8): Global Constraints, M2 Pre-flight 4/5 — Admin: TanStack Query SSR wiring + API_URL + sample branches call (#24) Implementation Plan, Self-Review (done pre-flight, 2026-09-05), Task 1: Deps + server-side API_URL seam + data layer, Task 2: Query SSR wiring + sample branches call, Task 3: End-to-end verification (dev + loud-fail + prod-shaped workerd + leak scan), Task 4: Full gates + docs cross-linking, Verified pre-plan facts (probed against the real toolchain 2026-09-05)

### Community 390 - "@sevendays/db overview refs"
Cohesion: 0.32
Nodes (6): @sevendays/db — Drizzle schema + client (live Supabase, migrations 0000+0001 applied, catalog seeded), @sevendays/types — Zod schemas + inferred types, shared across all apps, db:generate then db:migrate for schema changes, db service — postgres:17, POSTGRES_DB sevendays_test, port 5432, pg_isready healthcheck, @sevendays/types (Zod) + @sevendays/db (Drizzle) define the shared entities, postgres service — postgres:17, POSTGRES_DB sevendays_test, port 5432, TEST_DATABASE_URL

### Community 391 - "tanstack-query rule: targeted invalidation"
Cohesion: 0.25
Nodes (7): Bad Example, cache-invalidation: Use Targeted Invalidation Over Broad Patterns, Context, Explanation, Good Example, Invalidation Patterns, Priority: CRITICAL

### Community 392 - "tanstack-query rule: staleTime"
Cohesion: 0.25
Nodes (7): Bad Example, cache-stale-time: Set Appropriate staleTime Based on Data Volatility, Context, Explanation, Good Example, Priority: CRITICAL, Recommended staleTime Values

### Community 393 - "tanstack-query rule: key factories"
Cohesion: 0.25
Nodes (7): Bad Example, Context, Explanation, Good Example, Priority: CRITICAL, qk-factory-pattern: Use Query Key Factories for Complex Applications, Query Options Factory Pattern

### Community 394 - "tanstack-query rule: hierarchical keys"
Cohesion: 0.25
Nodes (7): Bad Example, Context, Explanation, Good Example, Priority: CRITICAL, qk-hierarchical-organization: Organize Keys Hierarchically, Recommended Hierarchy Pattern

### Community 395 - "tanstack-query rule: serializable keys"
Cohesion: 0.25
Nodes (7): Bad Example, Context, Explanation, Good Example, Priority: CRITICAL, qk-serializable: Ensure All Key Parts Are JSON-Serializable, Serializable Types

### Community 396 - "api-client/src/routes/admin.ts"
Cohesion: 0.03
Nodes (92): Task 2: Wrapper extensions + the binary thumb seam (`packages/api-client`), Task 4: `packages/api-client` — the nine `remove()` wrappers + loopback coverage (TDD), ADR-0006, AdminRpc, CreateAddonArgs, CreateAdminAddonEndpoint, CreateAdminAttireEndpoint, CreateAdminBranchArgs (+84 more)

### Community 397 - "Progress log hub"
Cohesion: 0.25
Nodes (8): Current Milestone: 1 — Real Data Layer (complete — exit criteria verified live 2026-09-02; next up: Milestone 2 pre-flight, issue #1), Gate status (all verified live on 2026-08-30), Immediate Next Steps (in order), Known Gaps / Not Yet Done, Milestone 1 gate (verified live 2026-09-02 on feat/m1.5-exit-verification), Notes for Future Sessions, Progress, What Exists

### Community 399 - "File Structure"
Cohesion: 0.18
Nodes (10): File Structure, Final Review (for the executor's last pass), Global Constraints, M3 Ticket 02 — Token Swap: the Validated Logo-Palette Layer Goes Live (#96) Implementation Plan, Task 1: The merged token layer in packages/ui, Task 2: Both apps onto the layer — fonts self-hosted, island CSS removed, Task 3: The living token gallery at /prototype-tokens, Task 4: Full verification sweep (the ticket's AC, made runnable) (+2 more)

### Community 400 - "design: slides reference"
Cohesion: 0.29
Nodes (6): Key Features, Knowledge Base, Slides Reference, Usage, When to Use, Workflow

### Community 401 - "design: HTML slide template"
Cohesion: 0.29
Nodes (6): Animation Classes, Background Images, Base Structure, Chart.js Integration, CSS Variables Reference, HTML Slide Template

### Community 402 - "slides: HTML template"
Cohesion: 0.29
Nodes (6): Animation Classes, Background Images, Base Structure, Chart.js Integration, CSS Variables Reference, HTML Slide Template

### Community 403 - "tanstack-query rule: array keys"
Cohesion: 0.29
Nodes (6): Bad Example, Context, Explanation, Good Example, Priority: CRITICAL, qk-array-structure: Always Use Arrays for Query Keys

### Community 404 - "tanstack-query rule: key dependencies"
Cohesion: 0.29
Nodes (6): Bad Example, Context, Explanation, Good Example, Priority: CRITICAL, qk-include-dependencies: Include All Variables the Query Depends On

### Community 405 - "mw-context-flow: Properly Pass Context Through Middleware"
Cohesion: 0.22
Nodes (8): Bad Example, Context, Explanation, Good Example: Client-to-Server Context with sendContext, Good Example: Server Context, Good Example: Server-to-Client Context with sendContext, mw-context-flow: Properly Pass Context Through Middleware, Priority: HIGH

### Community 406 - "mw-function-middleware: Use Function Middleware for Server Functions"
Cohesion: 0.22
Nodes (8): Bad Example, Context, Explanation, Good Example, Good Example: Auth Token Middleware, Good Example: Input Validation in Middleware, mw-function-middleware: Use Function Middleware for Server Functions, Priority: HIGH

### Community 407 - "Benchmarking (v5)"
Cohesion: 0.25
Nodes (8): Benchmarking (v5), Comparing Implementations, Custom Provider (experimental), Defining & Running, Key Points, Stability Notes, Storing & Replaying Baselines, v5 Migration

### Community 408 - "vitest: test tags"
Cohesion: 0.29
Nodes (7): Applying Tags, Checking the Filter at Runtime, Defining Tags, Filtering by Tag, Key Points, Option conflict resolution, Test Tags (4.1+)

### Community 409 - "Spec: booking flow decisions"
Cohesion: 0.14
Nodes (13): Booking form (prototype variant C rulings, ticket #33), Confirmation email (content per ticket #34, mechanics per ticket #36), Confirmation read-back (`/booking/:id`), Further Notes, Implementation Decisions, Information architecture (ticket #32), Milestone 2 — Public Booking Flow (spec), Out of Scope (+5 more)

### Community 410 - "slides skill overview"
Cohesion: 0.33
Nodes (5): References (Knowledge Base), Routing, Slides, Subcommands, When to Use

### Community 411 - "sec-auth-middleware: Protect Routes with Auth Middleware"
Cohesion: 0.22
Nodes (8): Bad Example, Context, Explanation, Good Example: Auth Middleware for Server Functions, Good Example: Role-Based Middleware, Good Example: Route Protection with beforeLoad, Priority: CRITICAL, sec-auth-middleware: Protect Routes with Auth Middleware

### Community 412 - "sec-sensitive-data: Keep Secrets Server-Side Only"
Cohesion: 0.22
Nodes (8): Bad Example, Context, Explanation, Good Example, Good Example: Environment Variable Boundaries, Good Example: File Organization for Server/Client Separation, Priority: CRITICAL, sec-sensitive-data: Keep Secrets Server-Side Only

### Community 413 - "ssr-data-loading: Load Data Appropriately for SSR"
Cohesion: 0.22
Nodes (8): Bad Example, Context, Explanation, Good Example, Good Example: Using beforeLoad for Auth Context, Loading Lifecycle, Priority: MEDIUM, ssr-data-loading: Load Data Appropriately for SSR

### Community 414 - "gallery-screen.tsx"
Cohesion: 0.04
Nodes (97): CategorySaveInput, GalleryScreen(), clearTray(), commit(), enqueueFiles(), onCategoryDragEnd(), onFileDragEnter(), onFileDragOver() (+89 more)

### Community 415 - "api/src/index.ts"
Cohesion: 0.05
Nodes (62): captureError(), ErrorCapture, resetErrorCapture(), setErrorCapture(), logEmail(), logError(), internalRoutes, buildConfirmationEmail() (+54 more)

### Community 416 - "Plan: M2-01 studio services catalog"
Cohesion: 0.20
Nodes (10): Schema changes (Drizzle migration via `db:generate`; never hand-edited), File Structure, Global Constraints, M2 Ticket 01 — Studio Services Catalog + Package Slug/Featured — Implementation Plan, Task 1: Drizzle — studio_services + junctions + package slug/is_featured (migration 0002), Task 3: verify-seed extensions (live VERIFY PASSED), Task 4: Slug NOT NULL flip (migration 0003) + fixture blast radius + suites green, Task 5: packages/types — slug/isFeatured + StudioService mirror (TDD) (+2 more)

### Community 417 - "3. Logo Usage"
Cohesion: 0.11
Nodes (17): 3. Logo Usage, 4. Voice & Tone, 5. Imagery Guidelines, Brand Guidelines Template, Brand Personality, Clear Space, Document Structure, Don'ts (+9 more)

### Community 419 - "button"
Cohesion: 0.20
Nodes (10): fg, font-size, hover-bg, button, $type, $value, $type, $value (+2 more)

### Community 420 - "inf-loading-guards: Check isFetchingNextPage Before Fetching More"
Cohesion: 0.25
Nodes (7): Bad Example, Context, Explanation, Good Example, Good Example: Infinite Scroll, inf-loading-guards: Check isFetchingNextPage Before Fetching More, Priority: HIGH

### Community 423 - "api-client biome.json"
Cohesion: 0.40
Nodes (4): extends, @sevendays/config/biome/base, @sevendays/config/biome/node, root

### Community 424 - "hasExactlyOneAppointmentOffering"
Cohesion: 0.50
Nodes (4): Global Constraints, M2 Ticket 02 — Generalize the Appointment Model (schema, Zod, call sites) — Implementation Plan, Self-Review (executed at plan-writing time — re-run after any edit), hasExactlyOneAppointmentOffering()

### Community 426 - "inf-max-pages: Consider maxPages for Large Datasets"
Cohesion: 0.25
Nodes (7): Bad Example, Context, Explanation, Good Example, Good Example: Offset-Based Pagination with maxPages, inf-max-pages: Consider maxPages for Large Datasets, Priority: MEDIUM

### Community 427 - "mut-rollback-context: Provide Rollback Context from onMutate"
Cohesion: 0.25
Nodes (7): Bad Example, Context, Explanation, Good Example, Good Example: Multiple Cache Entries, mut-rollback-context: Provide Rollback Context from onMutate, Priority: HIGH

### Community 428 - "perf-placeholder-data: Use placeholderData for Instant UI"
Cohesion: 0.25
Nodes (7): Bad Example, Context, Explanation, Good Example: keepPreviousData for Pagination, Good Example: Placeholder from Another Cache Entry, perf-placeholder-data: Use placeholderData for Instant UI, Priority: LOW

### Community 429 - "perf-structural-sharing: Leverage Structural Sharing"
Cohesion: 0.25
Nodes (7): Bad Example, Context, Explanation, Good Example, Good Example: Custom Structural Sharing, perf-structural-sharing: Leverage Structural Sharing, Priority: LOW

### Community 430 - "Building For Production"
Cohesion: 0.14
Nodes (14): Adding A Route, Adding Links, API Routes, Building For Production, Data Fetching, Deploy to Cloudflare Workers, Linting & Formatting, Optional Configuration (+6 more)

### Community 433 - "dependencies"
Cohesion: 0.10
Nodes (20): dependencies, better-auth@^1.7.5, drizzle-orm@^0.45.2, hono@^4.6.0, @hono/zod-validator@^0.4.0, loglayer@9.4.0, @loglayer/transport-pino@3.3.0, resend@^6.26.0 (+12 more)

### Community 434 - "studio-service.ts"
Cohesion: 0.12
Nodes (25): Task 1: packages/types — the Studio Service read shape (TDD), Task 4: packages/types — the new-entity vocabulary (gallery, testimonials, lookup `is_active`, matrix payloads), Task 3: The pure light-entity state seam (`lib/light-entity-state.ts`), Scope fences, CreateAddonServiceInput, UpdateAddonServiceInput, UpdateBranchInput, CreateGalleryCategoryInput (+17 more)

### Community 436 - "ref_drizzle_orm"
Cohesion: 0.04
Nodes (77): MediaEnv, MediaEnv, Task 2: Seed — slugifyName (TDD), studio-service seeds, seed extensions (live ×2), addonServiceSeeds, attireSeeds, branchSeeds, featuredPackageNames, inclusionSignatures() (+69 more)

### Community 440 - "pf-route-prefetch: Prefetch Data During Route Transitions"
Cohesion: 0.25
Nodes (7): Bad Example, Context, Explanation, Good Example, Good Example: Parallel Prefetching, pf-route-prefetch: Prefetch Data During Route Transitions, Priority: MEDIUM

### Community 441 - "ssr-client-per-request: Create QueryClient Per Request"
Cohesion: 0.25
Nodes (7): Bad Example, Context, Explanation, Good Example: React State (Pages Router / Remix), Good Example: Server Components (App Router), Priority: CRITICAL, ssr-client-per-request: Create QueryClient Per Request

### Community 442 - "AppType"
Cohesion: 0.07
Nodes (33): AppType, Task 3: Export AppType via a types-only subpath export, Global Constraints, M2 Pre-flight 2/5 — Shared API client over Hono RPC (#22) Implementation Plan, Self-Review, Task 1: Chain the API so `AppType` carries its route schema (+ validator split), Task 2: Package scaffold + client core (createApiClient, unwrap, ApiClientError), Task 3: Route wrappers + Seam 1 loopback suite (mock API, injectable fetch) (+25 more)

### Community 444 - "submissions-tab.tsx"
Cohesion: 0.08
Nodes (43): AdminTopbar(), ADR-0028, GlobalSearch(), Notification(), PENDING_SKELETON_KEYS, ADR-0028, acceptAdminTestimonialSubmission, rejectAdminTestimonialSubmission (+35 more)

### Community 458 - "ADR-0012: exactly-one booked offering"
Cohesion: 0.33
Nodes (5): ADR-0012: Exactly-one booked offering, enforced on both sides, Alternatives Considered, Consequences, Context, Decision

### Community 460 - "ui/components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 462 - "Implementation Decisions"
Cohesion: 0.12
Nodes (15): Admin shell & IA (tickets #59 + #93), Brand & the token layer (tickets #90, #57, #92), Component inventory — the canonical record (ticket #58, extended by #60), Distribution: `packages/ui` as the shared library (ticket #56 → ADR-0017), Further Notes, Implementation Decisions, Landing refactor, surface by surface (ticket #60), Milestone 3 — UI/UX Design System (spec) (+7 more)

### Community 463 - "events.ts"
Cohesion: 0.14
Nodes (17): AdminMutationEntity, EmailPhase, logAccess(), logMediaFailure(), MediaFailureOp, appLogger, createRequestLogger(), RequestLogger (+9 more)

### Community 464 - "admin-gallery.ts"
Cohesion: 0.13
Nodes (34): adminGalleryCategories, ADR-0006, adminTestimonials, ADR-0006, ADR-0006, galleryPhotos, assertCategoryExists(), CATEGORY_UNIQUE (+26 more)

### Community 465 - "M3 Ticket 03 — Landing Chrome + Atmosphere: Ink Bands, SiteFooter, MobileNav, Wash Ground (#97) Implementation Plan"
Cohesion: 0.50
Nodes (3): Final Review (for the executor's last pass), Global Constraints, M3 Ticket 03 — Landing Chrome + Atmosphere: Ink Bands, SiteFooter, MobileNav, Wash Ground (#97) Implementation Plan

### Community 466 - "filters.ts"
Cohesion: 0.08
Nodes (41): AuditResult, fetchAuditActors, fetchAuditLogPage, readDbUrl(), requireAuditSession(), ADR-0018, ADR-0023, AUDIT_ACTION_LABELS (+33 more)

### Community 467 - "testimonials-screen.tsx"
Cohesion: 0.06
Nodes (49): QUERY_ERROR_LINE, SegmentedControl(), PENDING_ROW_KEYS, SubmissionsTab(), handleAccept(), EditingTarget, PENDING_ROW_KEYS, SaveTestimonialInput (+41 more)

### Community 468 - "landing/src/lib/queries.ts"
Cohesion: 0.13
Nodes (16): toNotFoundError(), branchNameFor(), offeringNameFor(), ReadCatalog, B1, B2, MinimalQueryContext, mockedGet (+8 more)

### Community 469 - "compilerOptions"
Cohesion: 0.12
Nodes (14): compilerOptions, declaration, declarationMap, noEmit, outDir, rootDir, extends, include (+6 more)

### Community 472 - "Plan: M2-08 booking confirmation"
Cohesion: 0.25
Nodes (7): File Structure, Global Constraints, M2 Ticket 08 — Confirmation read-back `/booking/:id` — Implementation Plan, Task 1: Data layer — `getAppointment` server fn, `appointmentQueries.byId`, shared 404 seam (TDD), Task 4: CDP harness — wizard unknown-id check + e2e read-back assertions, Task 5: Docs — tick the checkbox, log the landing, GetAppointmentArgs

### Community 473 - "unwrap.ts"
Cohesion: 0.10
Nodes (19): FlipInput, CreateEndpoint, CreateInput, RpcClient, ADR-0006, CreateEndpoint, GetEndpoint, BySlugEndpoint (+11 more)

### Community 475 - "Verify script: confirmation emails"
Cohesion: 0.27
Nodes (10): check(), LANDING_ORIGIN, listEmails(), main(), expectation(), PH_DATE_TIME, phDateTime(), [pkgId, svcId] (+2 more)

### Community 476 - "ssr-stale-time-server: Set Higher staleTime on Server"
Cohesion: 0.25
Nodes (7): Bad Example, Context, Explanation, Good Example, Good Example: Shared Config, Priority: HIGH, ssr-stale-time-server: Set Higher staleTime on Server

### Community 478 - "App READMEs (admin & landing)"
Cohesion: 0.33
Nodes (4): Getting Started, Learn More, Getting Started, Learn More

### Community 479 - "ADR-0013: one appointments table"
Cohesion: 0.33
Nodes (5): ADR-0013: One appointments table, nullable offering refs, booked-price snapshots, Alternatives Considered, Consequences, Context, Decision

### Community 481 - "ADR-0014: email send topology"
Cohesion: 0.33
Nodes (5): ADR-0014: Confirmation email — sent after the DB commit via waitUntil, deduped by idempotency key, Alternatives Considered, Consequences, Context, Decision

### Community 482 - "Plan: #80 seed v1 branch"
Cohesion: 0.22
Nodes (9): File Structure, Task 1: Re-derive the audit's two false-positive tokens (AC 1's verdict, landed on main), Task 2: Author the seed ruleset — the record (landed on main), Task 3: The dry-run rewrite — filter the clone and prove the lineage (loop until clean), Task 5: The seed content commit, part 2 — client-safe docs + AGENTS.md, then the one commit, Task 6: Local booking-free verification — the landing serves (AC 4), Task 7: Evidence pack → owner sign-off → the one-way push (AC 5 + AC 6), Task 8: Main-side close-out — the tick, the record, the graph (+1 more)

### Community 483 - "Global Constraints"
Cohesion: 0.20
Nodes (9): Global Constraints, M4 Live Verify + v1 Picks + Docs Rotation (#122) Implementation Plan, Self-review record (completed at plan time), Task 1: Repair the two broken api `BETTER_AUTH_SECRET` puts, Task 2: Reset the staff user via the documented path + stage the gate fixtures, Task 3: The teaser live gate — the milestone verification, Task 4: The v1 leg — login on `sevendays-v1-admin`, 404-by-absence, cross-edition share, Task 5: Docs rotation — progress, tech-stack, AGENTS, CONTEXT glossaries, plan ticks (+1 more)

### Community 486 - "Plan: edition-aware pipelines facts"
Cohesion: 0.18
Nodes (10): Edition-aware pipelines — teaser live on main, v1 private-deploy leg dormant (#79) Implementation Plan, Global Constraints, Self-Review (against issue #79 + ADR-0015), Task 1: Generalize the CI triggers past `main`, Task 2: The branch-keyed continuous deploy legs, Task 3: GitHub environments `teaser` + `v1`, and their `API_URL` variables, Task 4: Owner secret gates (STOP steps — the executor never touches a secret value), Task 5: PR → CI green → the real merge reaching the teaser live (+2 more)

### Community 487 - "ADR-0015: two-edition mechanism"
Cohesion: 0.33
Nodes (5): ADR-0015: Two-edition delivery — one filter-repo seed plus cherry-pick maintenance, Alternatives Considered, Consequences, Context, Decision

### Community 489 - "Global Constraints"
Cohesion: 0.20
Nodes (9): Global Constraints, packages/ui Becomes the Shared Primitive Library (M3 ticket #95) Implementation Plan, Self-Review, Task 1: packages/ui becomes a real workspace package with a check pipeline, Task 2: The components.json trio — base-rhea/lucide/zinc, aliases routed, Task 3: Generate the `button` tracer into packages/ui (Base UI base), Task 4: Render the tracer in both apps through the shared import, Task 5: cn migration — the `cn` package replaces the hand-rolled helpers (+1 more)

### Community 493 - "v1 export audit script"
Cohesion: 0.31
Nodes (10): argv, audit(), failUsage(), git(), makeFixture(), ADR-0015, runGit(), selfTest() (+2 more)

### Community 494 - "package-editor.tsx"
Cohesion: 0.05
Nodes (64): PACKAGE_NOT_FOUND_LINE, EditorDisplayErrors, KIND_ICONS, PackageEditor(), addPrint(), addPrivilege(), handleUploadStatus(), makeDragEnd() (+56 more)

### Community 497 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, cf-typegen, deploy, dev, fix, fix:unsafe, format (+3 more)

### Community 498 - "Plan: #78 export audit file structure"
Cohesion: 0.25
Nodes (7): Export audit script — `git log -S`/`-G` sweeps keyed to the absence inventory (#78) Implementation Plan, File Structure, Global Constraints, Task 1: The instrument — token inventory, sweeper, CLI, detection proof, Task 2: The proofs — self-test, sabotage torture, `--repo` clone sweep, Task 3: Consumer documentation — plan.md pointer + progress.md record (incl. the #80 flags), Task 4: graphify, final gates, handoff

### Community 499 - "global-search.ts"
Cohesion: 0.11
Nodes (32): buildSearchIndex(), focusUrlFor(), GROUP_ROUTES, IndexedPhoto, runSearch(), SEARCH_BODY_WEIGHT, SEARCH_COPY, SEARCH_GROUP_CAP (+24 more)

### Community 500 - "admin-delete.ts"
Cohesion: 0.16
Nodes (26): AdminDeleteFailure, AdminDeleteResult, blocked(), deleteAdminAddonService(), deleteAdminAttire(), deleteAdminBranch(), deleteAdminGalleryCategory(), deleteAdminGalleryPhoto() (+18 more)

### Community 501 - "studio-services-screen.tsx"
Cohesion: 0.04
Nodes (150): AddonsScreen(), editButton(), handleEditorSave(), openCreate(), openEdit(), BulkFlipOutcome, EditingTarget, PENDING_ROW_KEYS (+142 more)

### Community 502 - "ADR-0017: Shared UI package — the shadcn monorepo pattern"
Cohesion: 0.33
Nodes (5): ADR-0017: Shared UI package — the shadcn monorepo pattern, Alternatives Considered, Consequences, Context, Decision

### Community 503 - "Plan: #82 pick discipline"
Cohesion: 0.17
Nodes (11): #82 — Pick Discipline Stood Up: Runbook + First Real Picks — Implementation Plan, File Structure, Global Constraints, Task 1: Pre-flight — SHAs, the `v1` checkout, the backlog, the branches, Task 2: The classifier, the runbook, the `AGENTS.md` pointer (PR B's first commit), Task 3: Backlog triage + the booking worked example (ledger rows), Task 4: The split drill — a synthetic mixed commit, split per the runbook (local only), Task 5: PR A — per-route page titles on the five shared landing routes (the pick source) (+3 more)

### Community 508 - "Global Constraints"
Cohesion: 0.20
Nodes (9): Global Constraints, Landing Surfaces onto the System, Both Variants Styled (M3 ticket #98) Implementation Plan, Self-Review, Task 1: Home — the two-CTA hero band + typed-Links sweep, Task 2: /services — neutral add-on copy + the closing call-or-visit strip, Task 3: /packages — CTA-less index, the single detail affordance, the not-found, Task 5: /about — skeleton polish, slots intact, Task 6: Verification — CDP regressions + gates (controller-run, evidence-only) (+1 more)

### Community 509 - "radius"
Cohesion: 0.60
Nodes (5): radius, radius, radius, $type, $value

### Community 510 - "about.tsx"
Cohesion: 0.20
Nodes (10): ALL_TAB_ID, deriveGalleryTabs(), GalleryTab, hasPortfolioPhotos(), photosForTab(), storyParagraphs(), AboutPage(), GalleryRead (+2 more)

### Community 512 - "Global Constraints"
Cohesion: 0.22
Nodes (8): architecture.md Alignment Pass (ticket #115) Implementation Plan, Global Constraints, Task 1: The System Overview diagram — the production transport on the frontend→API edge, Task 2: Deployment Targets — the table rewrite + the client-safe editions pointer line, Task 3: Data Flow: Booking a Shoot — rewrite to today's reality, Task 4: The mini re-audit — evidence for every claim, the Observability drift fix, progress rotation, and the PR, Task 5: Drain the pending `6aff692` split pick (main-order backlog — row 153), Task 6: Triage + pick this ticket's merge, locks, ledger row (the close-out loop's tail)

### Community 513 - "notFound"
Cohesion: 0.05
Nodes (60): Bad Example, Context, Error Handling Callbacks, Explanation, Good Example, Good Example: With TanStack Query, load-error-handling: Handle Loader Errors Appropriately, Priority: HIGH (+52 more)

### Community 515 - "viewer.ts"
Cohesion: 0.40
Nodes (7): COVER_CAROUSEL, COVER_RENDER, GALLERY_ALT_FALLBACK, MOSAIC_CAROUSEL, MOSAIC_CONTROLLER, VIEWER_LABELS, yet-another-react-lightbox

### Community 516 - "Phase A — the dedicated stack (no client dependency)"
Cohesion: 0.11
Nodes (17): A1 The Cloudflare account, the subdomain, the ship token, A2 The Supabase org + project, A3 The fresh database — migrations, seed, the carry, the smoke-staff, A4 The fresh bucket (docs/media-bucket-runbook.md § Fresh bucket at ship), A5 Secrets + vars — the complete `v1` GitHub environment write-up, A6 The deploy under the scoped roles (the dry-run gate), A7 The CI re-point — the `v1` environment's deploy identity, B1 The media copy (scripted list+copy) (+9 more)

### Community 519 - "v1 triage classifier script"
Cohesion: 0.43
Nodes (7): CLUSTER, failUsage(), git(), isMainOnly(), loadMainOnlyPrefixes(), main(), ADR-0015

### Community 521 - "@sevendays/types@workspace:*"
Cohesion: 0.30
Nodes (5): types, @sevendays/types@workspace:*, exports, ./app, @sevendays/types

### Community 522 - "metrics.functions.ts"
Cohesion: 0.21
Nodes (15): POSTHOG_DEFAULT_API_HOST, R2AnalyticsConfig, readHostList(), readMetricsEnv(), readTrimmed(), FULL, ADR-0023, fetchMetricsContent (+7 more)

### Community 523 - "cf.ts"
Cohesion: 0.16
Nodes (14): bucketStart(), InvocationsRow, METRICS_WINDOWS, metricsWindowSchema, mungeWorkerSeries(), ENV, ADR-0023, WINDOW_MS (+6 more)

### Community 526 - "createApiClient"
Cohesion: 0.09
Nodes (33): Global Constraints, M2 Pre-flight 3/5 — Landing: TanStack Query SSR wiring + API_URL + sample branches call (#23) Implementation Plan, Self-Review (done pre-flight, 2026-09-05), Task 1: Deps + server-side API_URL seam + data layer, Task 2: Query SSR wiring + sample branches call, Task 3: End-to-end verification (dev + loud-fail + prod-shaped workerd + leak scan), Task 4: Full gates + docs cross-linking, Verified pre-plan facts (probed against the real toolchain 2026-09-05) (+25 more)

### Community 527 - "design-tokens-starter.json"
Cohesion: 0.15
Nodes (12): component, $type, $value, dark, semantic, $schema, $type, $value (+4 more)

### Community 528 - "Global Constraints"
Cohesion: 0.18
Nodes (10): Global Constraints, M5 ticket 09 — Close-out: admin test suite, seed dev-only, cms-reflection exit gate, docs, v1 picks (#143) Implementation Plan, Task 10: Full gates, the PR, the merge, #143's own v1 pick, and the milestone-exit close, Task 1: Branch cut, Step-0 verification, and the admin vitest suite seats (package-editor seam), Task 3: The matrix + gallery seam suites, and the two one-line seam fixes, Task 4: The upload-loop seam suites (cover loop + batch pool), Task 6: The `cms-reflection.mjs` exit-gate scenario, Task 7: The live gate run (operator machine) (+2 more)

### Community 529 - "ADR-0018: Two-role staff model — the admin gate stays owner-held"
Cohesion: 0.33
Nodes (5): ADR-0018: Two-role staff model — the admin gate stays owner-held, Alternatives Considered, Consequences, Context, Decision

### Community 531 - "Ledger"
Cohesion: 0.03
Nodes (108): FlipInput, CoverResolution, Detail, fetchComposition(), listAdminPackages(), PACKAGE_UNIQUE, PackageRow, PackageTxOutcome (+100 more)

### Community 532 - "Plan: #334 — Service covers: teaser variant pass + owner reaction"
Cohesion: 0.17
Nodes (11): Execution record (2026-11-21 — what actually ran), Global Constraints, Owner rulings (recorded), Plan: #334 — Service covers: teaser variant pass + owner reaction, Scope fences, Self-review checklist (controller pass — run before handoff), Task 1 — staging: the api leg + the rig + the plan record (no browser yet), Task 2 — the admin act: the owner's bind + the four preview states (the go gate) (+3 more)

### Community 533 - "connect"
Cohesion: 0.32
Nodes (12): check(), main(), peso(), results, connect(), evaluate(), go(), send() (+4 more)

### Community 536 - "users-tab.tsx"
Cohesion: 0.05
Nodes (70): AUDIT_ACTION_BADGE_CLASSES, FilterDate(), FilterSelect(), CategoryRail(), railEntryClass(), SortableCategoryEntry(), editButton(), editButton() (+62 more)

### Community 538 - "Plan: #341 — Image viewer: teaser variant pass + owner reaction"
Cohesion: 0.18
Nodes (10): Execution record (2026-11-21), Global Constraints, Owner rulings (recorded), Plan: #341 — Image viewer: teaser variant pass + owner reaction, Scope fences, Self-review checklist (controller pass — run before handoff), Task 1 — staging: deploy provenance + the rig + the caption gate (no browser), Task 2 — the headless capture pass (+2 more)

### Community 540 - "/public/photos — PROTOTYPE stand-ins (#111)"
Cohesion: 0.50
Nodes (3): Brand assets + owner photos (NOT stand-ins), /public/photos, PROTOTYPE stand-ins (#111), Source & license

### Community 542 - "Global Constraints"
Cohesion: 0.18
Nodes (10): Global Constraints, M4 Ticket 02 — Admin Auth Server Live (/api/auth routes, per-request instances, create-staff CLI) Implementation Plan, Self-Review (recorded at planning time), Task 1: The `/api/auth/*` catch-all route — BetterAuth's handler, per request, Task 2: The session server functions — `getSession` / `ensureSession`, Task 3: The `create-staff` script + the in-repo provisioning/reset runbook, Task 4: Local dev env values (gitignored — this task has NO commit), Task 5: The live dev verification — probe, refusal, provisioning, sign-in, Postgres rows (+2 more)

### Community 543 - "unwrap"
Cohesion: 0.21
Nodes (25): Task 2: Landing data layer — addon-services + appointment server fns, `phDateTime`, Task 2: The api-client admin wrappers + the admin server-function seam + query factories, File Structure, M5 Ticket 06 — Admin screens: branches, studio services + both matrices, add-ons (UI-bearing) Implementation Plan, Task 1: Ordering gate, branch, baselines, Task 2: Wrapper extensions + the admin server-fn saves/matrices + query factories, Task 9: Full gates, docs rotation, PR/merge, close, M5 Ticket 07 — Admin screens: gallery, testimonials, lookups (UI-bearing) Implementation Plan (+17 more)

### Community 547 - "backfill-positions.mjs"
Cohesion: 0.47
Nodes (5): fail(), failures, pass(), sql, violations()

### Community 548 - "mock-api.ts"
Cohesion: 0.07
Nodes (27): RFC-4122, ADR-0016: Frontends call the API through a service binding in deployed environments, Alternatives Considered, Consequences, Context, Decision, toLoopbackFetch(), clientFor() (+19 more)

### Community 550 - "src/media.ts"
Cohesion: 0.24
Nodes (9): MEDIA_CONTENT_TYPES, MediaContentType, mediaPresignRequestSchema, mediaPresignResponseSchema, mediaPurposeSchema, MediaStagingKey, mediaStagingKeySchema, SITE_LOGO_CONTENT_TYPES (+1 more)

### Community 551 - "admin/src/lib/api.server.ts"
Cohesion: 0.24
Nodes (9): getBranches, getSiteSettings, getApiClient(), getApiUrl(), ADR-0004, ADR-0006, ADR-0016, ADR-0021 (+1 more)

### Community 552 - "Media bucket runbook — `sevendays-media` (ADR-0019)"
Cohesion: 0.25
Nodes (7): § Fresh bucket at ship (docs/ship-provisioning-runbook.md A4 + B1–B4), § Live round-trip verify, Media bucket runbook — `sevendays-media` (ADR-0019), § Owner handoff — minting the scoped R2 S3 token (owner-operated, ~5 minutes), Re-run / repair commands, Vars and secrets — where each value lives, What exists (verified 2026-09-26)

### Community 553 - "admin/src/routes/__root.tsx"
Cohesion: 0.16
Nodes (7): PostHogProvider(), PostHogProviderProps, RootDocument(), RouterContext, PostHogProviderProps, Toaster(), motion

### Community 554 - "admin/src/lib/nav.ts"
Cohesion: 0.11
Nodes (21): NavGroup, navGroups, NavItem, NavTo, taxonomy, ADR-0018, ADR-0018, visibleNavGroups() (+13 more)

### Community 555 - "read-cache.test.ts"
Cohesion: 0.09
Nodes (31): ADMIN_MUTATION_READS, adminEvictPublicReads(), CACHED_READ_PREFIXES, CachedPublicRead, defaultStore(), evictCachedReads(), getReadCacheStore(), isCachedReadPath() (+23 more)

### Community 556 - "Staff provisioning & password reset (v1)"
Cohesion: 0.40
Nodes (4): Creating a staff user, Resetting a staff password, Staff provisioning & password reset (v1), Verifying sign-in (dev)

### Community 558 - "Global Constraints"
Cohesion: 0.13
Nodes (14): Global Constraints, M8 ticket 05 — Exit gate — re-run the baseline, close M8 — implementation plan, Not here (milestone-wide fence), Self-review notes for the executor, Task 10: post-merge — the v1 pick + the ledger row, Task 1: the pre-walk confound check + the owner ask (HITL starts), Task 2: the cold pass — capture + extraction, Task 3: the warm pass — the client arms + the verdict + the evidence comment (+6 more)

### Community 560 - "ADR-0022: Standalone Playwright as the browser-E2E and visual-regression foundation"
Cohesion: 0.29
Nodes (6): ADR-0022: Standalone Playwright as the browser-E2E and visual-regression foundation, Alternatives Considered, Amendment — 2026-11-22: CMS-content masking policy (#346), Consequences, Context, Decision

### Community 561 - "admin-studio-services.ts"
Cohesion: 0.17
Nodes (25): adminStudioServices, ADR-0006, assembleAdminStudioServices(), BranchEnv, createAdminStudioService(), getAdminStudioService(), listAdminStudioServices(), resolveBranchCover() (+17 more)

### Community 562 - "ADR-0023: The observability data path — admin server functions own the analytics queries"
Cohesion: 0.33
Nodes (5): ADR-0023: The observability data path — admin server functions own the analytics queries, Alternatives Considered, Consequences, Context, Decision

### Community 565 - "Plan: #338 — Create-button polish: teaser variant pass + owner reaction"
Cohesion: 0.20
Nodes (9): Global Constraints, Owner rulings (recorded), Plan: #338 — Create-button polish: teaser variant pass + owner reaction, Scope fences, Self-review checklist (controller pass — run before handoff), Task 1 — staging: the capture rig + the plan record (no browser yet), Task 2 — the headed capture pass (the go gate), Task 3 — the owner reaction + disposition (+1 more)

### Community 566 - "logAdminMutation"
Cohesion: 0.10
Nodes (33): logAdminMutation(), adminSiteSettings, adminTestimonialSubmissions, idParam, siteSettingsRoutes, ADR-0006, nextTestimonialPosition(), AdminWriteFailure (+25 more)

### Community 567 - "load-deferred-data: Split Critical and Non-Critical Data"
Cohesion: 0.25
Nodes (7): Bad Example, Context, Explanation, Good Example: Built-In Deferred Loading, Good Example: With TanStack Query, load-deferred-data: Split Critical and Non-Critical Data, Priority: HIGH

### Community 568 - "Global Constraints"
Cohesion: 0.25
Nodes (7): Global Constraints, Recon state this plan starts from (verified live 2026-10-10, pre-plan), Task 1: The seven-assertion suite, Task 3: The owner gate — `smoke-staff` + the teaser environment secrets, Task 4: The docs rotation + the graph refresh, Task 5: Full gates, the dispatch verification, the PR, the close-out, and the v1 pick (expected SKIP), The production smoke — the verify gate's executable leg (#190) Implementation Plan

### Community 571 - "r2.ts"
Cohesion: 0.17
Nodes (25): CF_GRAPHQL_URL, fetchOneSeries(), fetchWorkerMetrics(), windowToRange(), CLASS_A_ACTIONS, CLASS_B_ACTIONS, classifyActionType(), fetchR2Dataset() (+17 more)

### Community 572 - "primitive"
Cohesion: 0.20
Nodes (10): fast, normal, slow, $type, $value, $type, $value, duration (+2 more)

### Community 573 - "org-index-routes: Understand Index vs Layout Routes"
Cohesion: 0.25
Nodes (7): Bad Example, Context, Explanation, File Naming, Good Example, org-index-routes: Understand Index vs Layout Routes, Priority: CRITICAL

### Community 575 - "Global Constraints"
Cohesion: 0.15
Nodes (12): Docs-audit rotation — the free set — implementation plan, Global Constraints, Not here, Self-review notes for the executor, Task 1: file the execution issue, Task 2: `docs/architecture.md` — rotate to current reality, Task 3: `docs/tech-stack.md` — rotate to current reality, Task 4: `AGENTS.md` — the migrations literal (+4 more)

### Community 576 - "Global Constraints"
Cohesion: 0.14
Nodes (13): Global Constraints, Landing redesign prototype on the live catalog (#164) Implementation Plan, Recon state this plan starts from (verified live 2026-09-30, pre-plan), Task 0: Claim the ticket, cut the branch, bring up the stack, Task 1: Owner content intake — make the catalog judgeable (HITL), Task 2: The direction contract — one ratified POV before any composition, Task 3: Composition round 1 — global chrome + branded NotFound + Error, Task 4: Composition round 2 — home (+5 more)

### Community 579 - "branch.ts"
Cohesion: 0.17
Nodes (13): Task 2: Wire schemas — packages/types, branchReadSchema, branchSchema, branchWriteBase, createBranchSchema, latitudeSchema, longitudeSchema, mapsLinkSchema (+5 more)

### Community 580 - "File Structure"
Cohesion: 0.22
Nodes (8): File Structure, Global Constraints, M6 Ticket 07 — The Playwright pre-flight foundation Implementation Plan, Self-review record (planner), Task 1: The foundation at the root — devDep, script, config, the smoke home, Task 2: The CI leg — e2e.yml + the teaser E2E_BASE_URL, Task 3: The v1 fence — paths.txt records the three main-only paths, Task 4: Gates, the CDP-green proof, docs rotation, PR/merge, post-merge verification, ledger, close

### Community 581 - "admin-sidebar.tsx"
Cohesion: 0.09
Nodes (32): AdminSidebarProps, BRAND_ROW_RAIL_CLASSES, BrandLockup, brandLockup(), LOCKUP_MONOGRAM, LOGO_CHIP_GEOMETRY_CLASSES, LOGO_IMG_CLASSES, withLogo (+24 more)

### Community 582 - "ADR-0020: Unpriced catalog items — nullable prices end to end, snapshots included"
Cohesion: 0.33
Nodes (5): ADR-0020: Unpriced catalog items — nullable prices end to end, snapshots included, Alternatives Considered, Consequences, Context, Decision

### Community 583 - "ship-media-copy.mjs"
Cohesion: 0.20
Nodes (6): aws4fetch@1.0.20, dest, ADR-0019, objects, source, aws4fetch

### Community 584 - "ADR-0021: Reset emails — a second email class over the API's Resend seam, via the service binding"
Cohesion: 0.33
Nodes (5): ADR-0021: Reset emails — a second email class over the API's Resend seam, via the service binding, Alternatives Considered, Consequences, Context, Decision

### Community 586 - "measure-theme-pairs.mjs"
Cohesion: 0.13
Nodes (12): clamp01(), contrast(), css, DARK_BLOCK, DARK_PAIRS, LIGHT_PAIRS, oklchToSrgb(), rawOklch() (+4 more)

### Community 587 - "File Structure"
Cohesion: 0.50
Nodes (4): File Structure, Task 5: `apps/landing` — pageviews + web vitals on the landing's provider, landing only, Task 6: The rendered variants — the owner's ratification gate, Task 8: Gates, docs rotation (box 5 TICKED), PR/merge, the v1 pick, ledger, issue close

### Community 588 - "admin-entities.ts"
Cohesion: 0.10
Nodes (51): adminAddonServices, ADR-0006, adminAttires, ADR-0006, adminBranches, ADR-0006, adminPrintSizes, ADR-0006 (+43 more)

### Community 591 - "probes.ts"
Cohesion: 0.16
Nodes (24): collectContentCensus(), collectDbProbes(), ADR-0011, Task 1: `packages/db` — the probe module + the admin SQL-shape tests (TDD), Task 3: `apps/admin` — the DB result-union wrapper, the session-gated server fns, the query factories (TDD), Task 4: The admin pins — the actors no-placeholderData and the census catch arm, CONTENT_CENSUS_SQL, ContentCensus (+16 more)

### Community 593 - "ship-content-carry.mjs"
Cohesion: 0.29
Nodes (4): carried, dest, source, TABLES

### Community 596 - "File Structure"
Cohesion: 0.14
Nodes (16): check(), main(), ADR-0020, peso(), results, selectFeatured(), File Structure, Global Constraints (+8 more)

### Community 597 - "Plan: #339 — Image viewer: viewer spine — the library, the seam, and the mosaic walls live"
Cohesion: 0.18
Nodes (10): Global Constraints, Owner rulings (settled at charting + the #328 pick, recorded in the spec), Plan: #339 — Image viewer: viewer spine — the library, the seam, and the mosaic walls live, Scope fences, Task 1 — The library install + the slide-mapping seam (TDD), Task 2 — The PhotoViewer composition (the two hand-added laws + the mosaic wiring), Task 4 — The chrome: three stylesheets + the token override block, Task 5 — Docs, graphify, and the final gate (+2 more)

### Community 598 - "services/media.ts"
Cohesion: 0.05
Nodes (45): CommitUploadResult, EXTENSIONS, FINAL_PREFIXES, MAX_THUMBNAIL_INPUT_BYTES, MAX_UPLOAD_BYTES, MEDIA_BUCKET_NAME, MissingR2CredentialsError, PRESIGN_EXPIRY_SECONDS (+37 more)

### Community 599 - "system-health.tsx"
Cohesion: 0.11
Nodes (39): TrendChart(), TrendDatum, ContentCensusSection(), FAMILY_LABELS, formatBytes(), formatCls(), formatCount(), formatDurationMs() (+31 more)

### Community 601 - "StudioServiceWithBranches"
Cohesion: 0.12
Nodes (22): FlipInput, ServiceImageCard(), serviceBackground(), serviceImage(), Further Notes, Out of Scope, Problem Statement, Services Cover Photos Spec (+14 more)

### Community 603 - "org-route-tree-structure: Follow Hierarchical Route Tree Patterns"
Cohesion: 0.25
Nodes (7): Bad Example, Context, Directory Style Equivalent, Explanation, Good Example, org-route-tree-structure: Follow Hierarchical Route Tree Patterns, Priority: CRITICAL

### Community 606 - "chart.tsx"
Cohesion: 0.13
Nodes (20): ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent(), ChartStyle(), ChartTooltipContent(), getPayloadConfigFromPayload() (+12 more)

### Community 608 - "pino"
Cohesion: 0.50
Nodes (3): pino@10.4.0, pino/browser, pino

### Community 609 - "e2e — the browser-test foundation (ADR-0022, M6 #189)"
Cohesion: 0.40
Nodes (4): e2e, the browser-test foundation (ADR-0022, M6 #189), Rulings that bind every suite here, Running, Taxonomy

### Community 614 - "Global Constraints"
Cohesion: 0.17
Nodes (11): Global Constraints, M7 ticket 14 — M7 close-out: owner demo, exit verification, the two redesign picks, docs rotation (#225) Implementation Plan, Recon state this plan starts from (verified live 2026-11-05, pre-plan), Task 1: Branch cut, Step-0 verification, baseline floors, Task 2: The #223 v1 pick — landing redesign I on v1 (`29b4872`), Task 5: `e2e/visual/` — the redesign visual suite (teaser, both themes), Task 6: The M7 SDD deferred-minors sweep — dispositions land in-repo, Task 7: The owner demo — the milestone gate (both editions, both themes) (+3 more)

### Community 616 - "Global Constraints"
Cohesion: 0.13
Nodes (14): Global Constraints, Recon state this plan starts from (verified live 2026-10-11, pre-plan), Task 10: B4 — the production smoke (smoke-green) + the r2.dev disable, Task 11: Close-out — the docs rotation, the ledger row, the issue, Task 1: Pre-flight — the readiness gate, the values file, the walk log, Task 2: A1 + A2 — the Cloudflare account, the subdomain, the ship token; the Supabase org + project, Task 3: A3 — the fresh database: migrations, seed, the carry, the smoke-staff, Task 4: A4 — the fresh bucket: create, CORS, lifecycle, r2.dev, the rotated S3 pair (+6 more)

### Community 617 - "redesign.spec.ts"
Cohesion: 0.15
Nodes (11): Task 2: The workflow wiring + the config comment refresh, Visual regression (ADR-0022, #225), requiredEnv(), ADR-0022, MASK_SELECTORS, SENTINELS, SHARED_MASK_SELECTORS, STABILIZE_CSS (+3 more)

### Community 618 - "refresh-button.tsx"
Cohesion: 0.39
Nodes (5): isUnavailable(), refreshOutcomeMessage(), RefreshQuerySnapshot, SOURCE_LABELS, sourceLabel()

### Community 621 - "Global Constraints"
Cohesion: 0.17
Nodes (11): Global Constraints, M9 #317 — Exit gate — the live-stack walkthrough + the milestone close — implementation plan, Not here (the milestone-wide fence), Self-review notes for the executor, Task 1: the confound check + the before-state probe + the go-gate ask (HITL starts), Task 2: the walkthrough — the numbered states, light first, then dark, Task 3: the evidence comment on #317 — the AC map + the findings disposition, Task 4: the closeout branch — plan.md + progress.md (+3 more)

### Community 624 - "Global Constraints"
Cohesion: 0.33
Nodes (5): Global Constraints, Task 1: The teaching-text and cosmetic corrections, Task 3: The audit row's three unpinned negatives, Task 5: The rotation, the PR, the close, The M6 deferred-minors sweep (#207) Implementation Plan

### Community 628 - "package-expanded-row.test.ts"
Cohesion: 0.16
Nodes (14): durationLineFrom(), ExpandedRowModel, expandedRowModel(), inclusionLabel(), inclusionLine(), printSize(), T0, Task 3: Shared page components (presentational) (+6 more)

### Community 629 - "Global Constraints"
Cohesion: 0.17
Nodes (11): Global Constraints, M8 ticket 01 — Region placement of the api worker — implementation plan, Not here, Self-review notes for the executor, Task 1: the `[placement]` block + dry-run proof, Task 2: ADR-0026 + the progress.md bullet, Task 3: gates, push, PR, merge, watch the CI deploy, Task 4: live verification — `cf-placement` (agent-only) (+3 more)

### Community 634 - "$.ts"
Cohesion: 0.19
Nodes (11): getInternalFetchDeps(), makeSendResetPassword(), ResetEmailOutcome, sendResetEmailOverApi(), SendResetPasswordParams, input, ADR-0021, ADR-0021 (+3 more)

### Community 636 - "File Structure"
Cohesion: 0.17
Nodes (11): E2E Visual Tall-Viewport Capture Implementation Plan (#255), File Structure, Global Constraints, Task 1: The Reveal seam — `data-reveal` / `data-shown` on the shared wrapper, Task 2: The spec's tall-viewport settle chain, Task 3: The e2e README — the mechanics section carries the new ordering, Task 4: The repo gates, the code PR, the teaser-redeploy probe, Task 5: The re-baseline — all 16, on intent, on `visual/255` (+3 more)

### Community 639 - "SiteSettings"
Cohesion: 0.09
Nodes (32): AnnouncementBanner(), bannerFor(), footerContactFor(), SocialLink, socialLinksFor(), ON, File Structure, Task 1: The pure seams + the one types default (TDD) (+24 more)

### Community 642 - "Global Constraints"
Cohesion: 0.15
Nodes (12): #306 — The dev admin login form's submit never fires its handler — diagnosis plan, Global Constraints, Not here, Self-review notes for the executor, Task 1: branch + plan commit, Task 2: the live repro + the discrimination ladder (P0–P4) — controller-run, no commit, Task 3: the one-variable dev-only bisect (P5) + local prod parity — controller-run, no commit, Task 4: the fork — fix or document (the evidence decides) (+4 more)

### Community 645 - "Global Constraints"
Cohesion: 0.14
Nodes (13): Global Constraints, Not here, Self-review notes (plan-time), Task 1: branch + plan commit + the lever ruling posted to #307, Task 2: the cold-load probe script + the BEFORE arm (the mismatch census), Task 3: the seam — `primeCmsQueriesForClient` (TDD), Task 4: the nine route loaders swap to the client-only seam, Task 5: ADR-0028 + the progress bullet + the AGENTS.md floor line (+5 more)

### Community 647 - "posthog-js@^1.422.5"
Cohesion: 0.20
Nodes (6): posthog-js@^1.422.5, @sevendays/db@workspace:*, tw-animate-css@^1.4.0, posthog-js, @sevendays/db, tw-animate-css

### Community 648 - "File Structure"
Cohesion: 0.18
Nodes (10): Content-Pages #223-Stale Checks Rewrite Implementation Plan, File Structure, Global Constraints, Task 1: The deep-link seam — `bookParamValues` + three param-parsed re-forms, Task 2: The hero blurb follows the live site-settings wire, Task 3: The add-ons check inverts to guard the ruling's absence, Task 4: The walk-in check asserts the indicator's aria-label pair, Task 5: The testimonials check matches case-insensitively (+2 more)

### Community 649 - "File Structure"
Cohesion: 0.18
Nodes (10): File Structure, Global Constraints, M7 Ticket 06 — Dark Mode from Zero Implementation Plan, Task 1: `scripts/` — the theme-pair measurement harness (the spec of record; runs red until Task 2), Task 2: `packages/ui` — the production `.dark` block + the header amendment + the dark base rules, Task 3: `packages/ui` — the ThemeProvider seam + the shared sun/moon ThemeToggle primitive, Task 4: `apps/admin` — dark wired: the root provider, the topbar toggle, the layered link base, the dark chart pair, Task 5: `apps/landing` — dark wired: the root provider + the header toggle on the ink band (+2 more)

### Community 650 - "File Structure"
Cohesion: 0.29
Nodes (7): ResetEmailDeps, UsersActionResult, File Structure, Task 2: `apps/admin` — the forward seam, the auth wiring, the forgot/reset forms (UI-bearing), Task 3: `apps/admin` — the Users lib seams + the server fns (TDD), Task 6: The owner-reacted variants round + the live reset-flow proof (controller interaction), Task 7: Gates, docs rotation, PR, v1 pick, issues, graphify

### Community 651 - "File Structure"
Cohesion: 0.22
Nodes (8): File Structure, Global Constraints, Post-flight T1 — Landing Polish: Strip Removal, Placeholder Gradient, Mobile Toggle Implementation Plan, Task 1: The three rulings in code — one commit, all eight files, Task 2: The `content-pages.mjs` strip-coupled check — rewritten, fenced, Task 3: The quick variants round — before/after frames + DOM assertions, owner reaction, Task 4: The two-step baseline regen (teaser, deployed — never PR-gated), Task 5: Gates, the live walkthrough, docs rotation, the v1 SPLIT, issues, graphify

### Community 654 - "commitUpload"
Cohesion: 0.09
Nodes (34): adminServicePackages, ADR-0006, commitStagingKey(), createAdminPackage(), getAdminPackage(), resolveCover(), runPackageSave(), updateAdminPackage() (+26 more)

### Community 655 - "File Structure"
Cohesion: 0.18
Nodes (11): E2E Visual Data-Present Sentinels Implementation Plan (#259), File Structure, Global Constraints, Task 1: The spec — the per-surface sentinel map, the failure dump, the in-test evaluation, Task 2: The mis-point demo — AC3's loud-fail path, proven without a live flake, Task 3: The e2e README — the sentinel law joins the visual mechanics, Task 4: The repo gates + the 5-run stability gate (AC4), Task 5: The PR — the evidence quoted, then squash-merge (+3 more)

### Community 657 - "M8 — Admin-CMS Latency Spec"
Cohesion: 0.22
Nodes (8): Further Notes, Implementation Decisions, M8 — Admin-CMS Latency Spec, Out of Scope, Problem Statement, Solution, Testing Decisions, User Stories

### Community 658 - "types/src/index.ts"
Cohesion: 0.22
Nodes (7): resetEmailSendSchema, ADR-0006, ADR-0016, ADR-0021, ADR-0006, ADR-0016, ADR-0021

### Community 660 - "types/src/index.ts"
Cohesion: 0.04
Nodes (99): fullSave(), BranchCard(), WalkInIndicator(), CatalogPlate(), CatalogPlates(), CoverPanel(), initialsOf(), ErrorComponent() (+91 more)

### Community 662 - "ADR-0025: Read-through edge cache on the API's public catalog reads"
Cohesion: 0.29
Nodes (6): ADR-0025: Read-through edge cache on the API's public catalog reads, Alternatives Considered, Consequences, Context, Decision, The invalidation contract

### Community 663 - "Plan: #337 — Create-button polish: Plus on every CMS create action + the New service rename"
Cohesion: 0.17
Nodes (11): Global Constraints, Owner rulings (settled at charting 2026-11-19, recorded in the spec), Plan: #337 — Create-button polish: Plus on every CMS create action + the New service rename, Scope fences, Self-review checklist (controller pass — run before handoff), Task 1 — studio-services: the icon ×2 + the complete "New service" rename (all five sites), Task 2 — branches, testimonials, add-ons: the icon ×6 (two sites each, icon only), Task 3 — packages: the icon ×2 (index route gains its first lucide import + the table's EmptyState) (+3 more)

### Community 664 - "Global Constraints"
Cohesion: 0.15
Nodes (12): #294 — The admin Gallery rail renders full-width below `lg` — implementation plan, Global Constraints, Not here, Self-review notes for the executor, Task 1: branch + plan commit, Task 2: the rendered repro (the "before" evidence — red), Task 3: the one-token fix (green), Task 4: the rendered verification (the "after" walk — the brief's acceptance criteria) (+4 more)

### Community 665 - "Plan: #248 — Post-flight T8: branch Maps button (nullable coordinates, manual admin input, new-tab pin)"
Cohesion: 0.09
Nodes (22): isAppleUserAgent(), mapsHrefFor(), mapsUrlFor(), Acceptance-criteria mapping (issue #248), Design (one paragraph, pinned before Task 1), Global Constraints, Owner rulings (ratified 2026-11-13, plan round), Plan: #248 — Post-flight T8: branch Maps button (nullable coordinates, manual admin input, new-tab pin) (+14 more)

### Community 666 - "card"
Cohesion: 0.20
Nodes (12): $type, $value, bg, bg, padding, shadow, card, bg (+4 more)

### Community 667 - "admin/src/router.tsx"
Cohesion: 0.18
Nodes (8): options, APP, buildSentryOptions(), SentryFrontendInit, getRouter(), @tanstack/react-router, Register, routeTree

### Community 668 - "ADR-0026: Region placement of the api worker — the SIN hint"
Cohesion: 0.33
Nodes (5): ADR-0026: Region placement of the api worker — the SIN hint, Alternatives Considered, Consequences, Context, Decision

### Community 669 - "users-state.ts"
Cohesion: 0.16
Nodes (19): openDelete(), activeSessionRows(), AdminSessionRow, paginateSessions(), roleLabel(), SessionPage, SESSIONS_PAGE_SIZE, shapeSessionRows() (+11 more)

### Community 670 - "Global Constraints"
Cohesion: 0.17
Nodes (11): Global Constraints, M8 ticket 03 — Versioned immutable gallery thumbnails — implementation plan, Not here, Self-review notes for the executor, Task 1: branch + plan commit, Task 2: the gallery-thumbs seam — the versioned URL builder + the cache-control constants (TDD), Task 3: the consumption — the proxy's cache law + the grid's versioned URLs, Task 4: the dated #136 supersession note + the progress bullet (+3 more)

### Community 673 - "split-critical-path: Keep Critical Config in Main Route File"
Cohesion: 0.25
Nodes (7): Bad Example, Context, Explanation, Good Example, Priority: MEDIUM, split-critical-path: Keep Critical Config in Main Route File, What Goes Where

### Community 675 - "Create Button Polish Spec"
Cohesion: 0.22
Nodes (8): Create Button Polish Spec, Further Notes, Implementation Decisions, Out of Scope, Problem Statement, Solution, Testing Decisions, User Stories

### Community 676 - "Landing Image Viewer Spec"
Cohesion: 0.25
Nodes (7): Further Notes, Implementation Decisions, Landing Image Viewer Spec, Out of Scope, Problem Statement, Solution, User Stories

### Community 677 - "Global Constraints"
Cohesion: 0.10
Nodes (21): primeCmsQueries(), Route, Route, Route, Route, Route, Route, Route (+13 more)

### Community 679 - "ts-query-options-loader: Use queryOptions in Loaders for Type Inference"
Cohesion: 0.25
Nodes (7): Bad Example, Context, Explanation, Good Example, Good Example: Organizing Query Options, Priority: CRITICAL, ts-query-options-loader: Use queryOptions in Loaders for Type Inference

### Community 680 - "Global Constraints"
Cohesion: 0.17
Nodes (11): #309 — the testimonials sortable's div-in-tbody — fix plan, Global Constraints, Not here, Self-review notes for the executor, Task 1: branch + plan commit, Task 2: stack up + the BEFORE arm — the probe must see the defect (no commit), Task 3: the fix — the desktop DndContext wraps the `<Table>` (one commit), Task 4: the AFTER arm + the full gate (no commit) (+3 more)

### Community 681 - "em-dash-sweep.mjs"
Cohesion: 0.21
Nodes (14): Self-review record (written after the final append, 2026-11-22), Self-review record (written after the final append, 2026-11-23), argv, check(), EXCLUDED_PREFIXES, fix(), listFiles(), makeFixture() (+6 more)

### Community 682 - "auth-server-functions: Verify Auth in Server Functions"
Cohesion: 0.25
Nodes (7): auth-server-functions: Verify Auth in Server Functions, Bad Example, Context, Explanation, Good Example: Auth via Middleware, Good Example: Direct Session Check, Priority: HIGH

### Community 684 - "landing/src/lib/queries.ts"
Cohesion: 0.20
Nodes (17): createAppointment, getAddonServices, getAppointment, getBranches, getGallery, getServicePackageBySlug, getServicePackages, getSiteSettings (+9 more)

### Community 685 - "probe-cold-hydration.mjs"
Cohesion: 0.20
Nodes (8): @playwright/test@1.63.0, ADR-0022, @playwright/test, hydrationByRoute, loginTimeout, ADR-0022, nestingByRoute, routes

### Community 687 - "file-shared-validation: Share Validation Schemas Between Client and Server"
Cohesion: 0.25
Nodes (7): Bad Example, Context, Explanation, file-shared-validation: Share Validation Schemas Between Client and Server, Good Example, Good Example: Search Param Validation, Priority: LOW

### Community 688 - "sec-csrf-protection: Implement CSRF Protection for Mutations"
Cohesion: 0.25
Nodes (7): Bad Example, Context, Explanation, Good Example, Good Example: OAuth State Parameter for CSRF in Auth Flows, Priority: CRITICAL, sec-csrf-protection: Implement CSRF Protection for Mutations

### Community 689 - "ADR-0024: Hyperdrive connection caching (BURNED)"
Cohesion: 0.50
Nodes (3): ADR-0024: Hyperdrive connection caching (BURNED), What happened, Where things stand

### Community 690 - "sec-validate-inputs: Validate All User Inputs with Schemas"
Cohesion: 0.25
Nodes (7): Bad Example, Context, Explanation, Good Example, Good Example: FormData Validation, Priority: CRITICAL, sec-validate-inputs: Validate All User Inputs with Schemas

### Community 693 - "Plan: #349 — Handover polish: sweep tool + the packages/scripts/e2e tree"
Cohesion: 0.20
Nodes (9): Branch law, Controller pre-flight (live-run, record before Task 1), Global Constraints, Plan: #349 — Handover polish: sweep tool + the packages/scripts/e2e tree, Scope fences, Task 1 — the tool: `scripts/em-dash-sweep.mjs` + the package.json entry, Task 2 — the hand-rewritten strings, their pins, and the echo repairs, Task 3 — the mechanical sweep + the fix-up pass (+1 more)

### Community 694 - "cache-defaults: Set Sensible Defaults at QueryClient Level"
Cohesion: 0.29
Nodes (6): Bad Example, cache-defaults: Set Sensible Defaults at QueryClient Level, Context, Explanation, Good Example, Priority: CRITICAL

### Community 696 - "ts-route-context-typing: Type Route Context with createRootRouteWithContext"
Cohesion: 0.29
Nodes (6): Bad Example, Context, Explanation, Good Example, Priority: CRITICAL, ts-route-context-typing: Type Route Context with createRootRouteWithContext

### Community 697 - "file-functions-file: Use .functions.ts Pattern for Server Functions"
Cohesion: 0.29
Nodes (6): Bad Example, Context, Explanation, file-functions-file: Use .functions.ts Pattern for Server Functions, Good Example, Priority: LOW

### Community 698 - "sf-method-selection: Choose Appropriate HTTP Method"
Cohesion: 0.29
Nodes (6): Bad Example, Context, Explanation, Good Example, Priority: CRITICAL, sf-method-selection: Choose Appropriate HTTP Method

### Community 700 - "sf-response-headers: Customize Response Headers When Needed"
Cohesion: 0.29
Nodes (6): Bad Example, Context, Explanation, Good Example, Priority: MEDIUM, sf-response-headers: Customize Response Headers When Needed

### Community 702 - "ADR-0028: Notifications are a derived view — the queue stays the notification"
Cohesion: 0.33
Nodes (5): ADR-0028: Notifications are a derived view — the queue stays the notification, Alternatives Considered, Consequences, Context, Decision

### Community 712 - "stub-screen.tsx"
Cohesion: 0.47
Nodes (4): StubScreen(), StubScreenProps, AppointmentsPage(), Route

### Community 713 - "linter"
Cohesion: 0.33
Nodes (6): project, qwik, solid, linter, domains, enabled

## Ambiguous Edges - Review These
- `Shadcn` → `minimumReleaseAgeExclude: lucide-react@1.37.0`  [AMBIGUOUS]
  pnpm-workspace.yaml · relation: conceptually_related_to
- `@sevendays/admin — internal dashboard for content + appointments (TanStack Start)` → `PostHog analytics via VITE_POSTHOG_KEY / VITE_POSTHOG_HOST`  [AMBIGUOUS]
  apps/landing/README.md · relation: conceptually_related_to
- `Attire Junction (package_inclusion_attires)` → `Catalog Attires & Universal Privileges`  [AMBIGUOUS]
  docs/adr/0009-normalized-catalog-lookups.md · relation: conceptually_related_to

## Knowledge Gaps
- **253 isolated node(s):** `@sevendays/config/biome/base`, `@sevendays/config/biome/vite`, `ADR-0020`, `ADR-0028`, `ADR-0023` (+248 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 5567 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **53 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ledger` connect `Ledger` to `commitUpload`, `requireSession`, `types/src/index.ts`, `Plan: #248 — Post-flight T8: branch Maps button (nullable coordinates, manual admin input, new-tab pin)`, `users-state.ts`, `gallery-screen.tsx`, `api/src/index.ts`, `createAuth`, `unwrap`, `Global Constraints`, `posthog.ts`, `admin/src/lib/nav.ts`, `Env`, `landing/src/lib/queries.ts`, `lookups-screen.tsx`, `$id.thumb.ts`, `studio-service.ts`, `logAdminMutation`, `AppType`, `r2.ts`, `submissions-tab.tsx`, `admin-sidebar.tsx`, `admin-entities.ts`, `events.ts`, `services/media.ts`, `StudioServiceWithBranches`, `unwrap.ts`, `admin.functions.ts`, `v1 picks runbook`, `redesign.spec.ts`, `package-editor.tsx`, `global-search.ts`, `admin-delete.ts`, `studio-services-screen.tsx`, `$.ts`, `SiteSettings`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GalleryScreen()` (e.g. with `Task 7: The gallery screen — category rail + upload tray + sortable card grid + photo editor` and `Task 2: The screen wiring — drop zone, cancel, the leave guard (UI-bearing)`) actually correct?**
  _`GalleryScreen()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@sevendays/config/biome/base`, `@sevendays/config/biome/vite`, `ADR-0020` to the rest of the system?**
  _253 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `with` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Why does `AppType` connect `AppType` to `Global Constraints`, `ref_vitest`, `api-client/src/routes/admin.ts`, `createApiClient`, `Global Constraints`, `requireSession`, `Ledger`, `Global Constraints`, `Global Constraints`, `unwrap`, `gallery-screen.tsx`, `api/src/index.ts`, `Global Constraints`, `Env`, `logAdminMutation`, `Global Constraints`, `services/media.ts`, `Plan: M2-08 booking confirmation`, `unwrap.ts`, `book.tsx`, `Plan: M2 preflight-5 facts`, `studio-services-screen.tsx`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Shadcn` and `minimumReleaseAgeExclude: lucide-react@1.37.0`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `@sevendays/admin — internal dashboard for content + appointments (TanStack Start)` and `PostHog analytics via VITE_POSTHOG_KEY / VITE_POSTHOG_HOST`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._