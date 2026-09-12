# Graph Report - .  (2026-09-12)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 7086 nodes · 8441 edges · 512 communities (445 shown, 67 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 132 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `01ee7a69`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Sevendays service catalog docs & normalized lookups ADR
- DB schema: package inclusions, frames, service packages
- Monorepo overview: AGENTS.md, app docs, workspace
- packages/db package.json scripts
- admin package.json devDependencies
- landing package.json devDependencies
- Architecture-review specs: row shaping, read-stitch, error seam, intake
- api package.json scripts
- Admin app shell: routeTree, root route, router
- admin package.json dependencies
- landing package.json dependencies
- API entrypoint & integration test suite
- packages/config package.json scripts
- Root package.json scripts
- packages/types package.json
- API v1 route wiring & db/env services
- Landing app shell: routeTree, root route, PostHog
- Shared appointment schemas (types)
- Shared TS config: base.json
- admin shadcn components.json
- landing shadcn components.json
- types tsconfig.build.json
- admin tsconfig.json
- api tsconfig.build.json
- landing tsconfig.json
- Spec: M1 real data layer
- db tsconfig.build.json
- Shared package schemas (types)
- packages/ui package.json
- Biome base: formatter
- Biome vite tier: rules
- api tsconfig.json
- packages/config tsconfig.json
- Specs: M2 preflight API client + M1.4 plan
- db tsconfig.json
- types tsconfig.json
- turbo.json default task
- Biome base: rules
- admin biome.json
- landing biome.json
- Plan: M1.1 preflight
- turbo.json tasks
- Plan: M1.2 catalog schema
- Plan: M1.4 real routes + integration tests
- Biome worker tier
- Shared TS config: node.json
- db biome.json
- Shared branch & API error schemas (types)
- Shared inclusion schemas (types)
- Plan: M1.3 provision, migrate, seed
- turbo.json build task
- api biome.json
- Plan: M1.5 exit verification
- DB script: verify appointment row
- @sevendays/config docs & CI wiring
- Biome base: root config
- Biome base: includes
- Shared TS config: react.json
- DB script: check-env
- Shared attire schemas (types)
- turbo.json test task
- turbo.json global env passthrough
- ui-ux-pro-max: data validation & tests
- Shared vitest config factory
- Shared add-on service schemas (types)
- Shared frames schemas (types)
- Shared print-size schemas (types)
- ui biome.json
- Agent docs: issue tracker & triage labels
- Design tokens template: gray palette
- Vitest blob report merge script
- DB script: pooler transaction probe
- DB migration runner (Drizzle)
- types biome.json
- Root biome.json
- packages/config biome.json
- Biome base: source settings
- Biome base: VCS settings
- Decls for verify-appointment-row script
- Landing booking flow: lib, wizard UI, rejection card
- Landing E2E verify scripts
- admin Vite config (Cloudflare plugin)
- landing Vite config (Cloudflare plugin)
- Biome node tier
- DB script: db-state report
- DB script: rehearsal fixture
- AGENTS rule: graphify query/update
- AGENTS rule: log decisions as ADRs
- AGENTS rule: per-app UI, shared tokens
- AGENTS rule: async/await only
- AGENTS rule: thin route handlers
- API service-packages & studio-services routes
- Landing README: file-based routing
- compose.yaml: local Postgres 17 test DB
- Context map: one domain, three apps
- CI check job
- config AGENTS: strict baseline policy
- Root vitest config (ADR-0003)
- design skill: CIP search & render scripts
- Design tokens template: button component
- ui-styling: Tailwind utilities reference
- design-system: slide search core
- brand: guidelines starter template
- Hono skill docs
- tsdown: tree shaking
- design skill docs
- tsdown: advanced plugins
- ui-styling: canvas design system
- organization-best-practices skill
- tsdown: shims
- tsdown: unbundle mode
- ui-ux-pro-max: prerequisites
- packages/api-client package.json
- Design tokens template: spacing scale
- tsdown: dependencies
- ui-ux-pro-max: stack search & freshness
- tsdown: sourcemaps
- ui-styling: shadcn form & input components
- ui-styling: Tailwind responsive design
- tsdown: declaration files
- tsdown: Vue support
- better-auth security skill
- brand: typography specs
- color
- tsdown: output cleaning
- tsdown: watch mode
- brand: logo usage rules
- design-system: component specs
- tsdown: React support
- tsdown skill overview
- ui-styling: shadcn accessibility
- ui-styling: Tailwind config gen tests
- ui-ux-pro-max: palette selection
- API client: Hono RPC wrapper, unwrap, errors
- design-system: HTML token validator
- tsdown: programmatic usage
- tsdown: package exports
- ui-ux-pro-max: core engine
- pnpm: performance practices
- tsdown: lifecycle hooks
- tsdown: migrate from tsup
- tsdown: config file
- tsdown: output directory
- tsdown: target option
- ui-ux-pro-max: search & taxonomy tests
- brand: asset approval checklist
- design: logo prompt engineering
- Two-factor auth best practices skill
- brand: color palette management
- design: CIP deliverable guide
- design: logo search scripts
- design-system: states & variants
- tsdown: platform option
- ui-styling skill overview
- design: social photos workflow
- tsdown: CSS support
- ui-ux-pro-max: design system generator
- ui-ux-pro-max: generator tests
- design-system skill overview
- Design tokens template: radius scale
- ui-styling: Tailwind customization
- Plan: #81 v1 first light (file structure)
- pnpm: migration guide
- API client test: mock API harness
- create-auth skill
- pnpm: content-addressable store
- tsdown: entry points
- tsdown: minification
- tsdown: references README
- PRD & architecture: slot grid capacity
- design: routing by task type
- design-system: slide generator
- tsdown: output format
- ui-styling: shadcn theming
- ui-styling: Tailwind config generator
- vitest: core test API
- vitest: mocking
- DB: catalog-rows read module
- better-auth integration skill
- brand: asset organization
- design: logo color psychology
- design: logo types & style guide
- pnpm: CI/CD setup
- pnpm: patches
- Roadmap & tech stack (M0-M6)
- Root AGENTS.md conventions
- brand: consistency checklist
- design: CIP mockup prompts
- design-system: semantic colors
- design-system: background fetcher
- pnpm: overrides
- pnpm: peer dependencies
- vitest: vi utilities
- vitest: describe API
- vitest: code coverage
- ADRs: URL versioning & shared API client
- api-client tsconfig.build.json
- pnpm: CLI commands
- tanstack-query: quick reference
- tanstack-router: quick reference
- tanstack-start: quick reference
- tsdown: getting started
- ui-styling: shadcn installer tests
- ui-ux-pro-max: threshold gate tests
- vitest skill: projects, tags, benchmarking
- vitest: expect API
- Per-context CONTEXT docs
- ADRs: TS 6 pin & tiered Biome
- DB client: pooler & transactions
- banner-design: sizes & styles
- design: banner sizes & styles
- design: icon generator
- Design tokens template: fontSize scale
- pnpm: workspaces
- pnpm: aliases
- tsdown: WASM support
- ui-styling: shadcn add script
- ui-ux-pro-max: BM25 search core
- Landing: featured packages lib
- ui-ux-pro-max: catalog refresh tests
- vitest: test environments
- vitest: type testing
- vitest: test filtering
- Spec & plan: deepen appointment intake
- design: CIP design reference
- design: icon design reference
- design: slides copywriting
- slides: copywriting formulas
- tsdown: Rolldown options
- tsdown: publint & attw
- tsdown: CLI reference
- ui-styling: config generator internals
- Roadmap (docs/plan.md)
- ui-ux-pro-max: domain detection
- vitest: CLI reference
- vitest: lifecycle hooks
- vitest: snapshot testing
- Domain: Appointment context
- admin README: production build
- Spec: delivery versions v1/v2
- Progress log & DB topology ADRs
- Catalog docs: packages
- Plan: M1.2 constraints
- ui-ux-pro-max: reasoning & data contracts
- banner-design skill overview
- brand: messaging framework
- brand: voice framework
- brand: color extraction script
- brand: asset validation script
- design: slides layout patterns
- design-system: Tailwind integration
- email & password best practices skill
- slides: layout patterns
- tanstack-start rule: deploy adapters
- tsdown: root directory
- ui-styling: shadcn installer core
- vitest: concurrency
- ADR template & domain-docs guide
- ADRs: real-Postgres tests & vitest configs
- brand: update guide
- design: logo design reference
- design-system: token architecture
- Design tokens template: primitives
- pnpm skill: CLI, hooks, virtual store
- tsdown: exe builds
- vitest: projects
- admin package.json scripts
- landing package.json scripts
- Plan: M1.4 file structure
- Plan: intake deepening file structure
- Tech stack doc
- api-client tsconfig.json
- DB: catalog seed scripts
- design-system: primitive tokens
- design-system: token validator
- pnpm: .pnpmfile hooks
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
- tanstack-start rule: prerendering & ISR
- tsdown: CI support
- tsdown: CJS default export
- tsdown: log level
- ui-styling: tailwind config gen tests
- ui-styling: JS config generation
- Plan: M2 E2E verification facts
- Plan: M1.5 file structure
- DB schema: relations & appointments
- brand: visual identity
- brand: context injection script
- design: CIP style guide
- design-system: token embedding
- pnpm: configuration
- pnpm: catalogs
- pnpm: supply-chain security
- tanstack-integration rule: single cache source
- tanstack-query rule: placeholder data
- tanstack-query rule: infinite page params
- tanstack-query rule: select transform
- tanstack-router rule: not-found routes
- tanstack-router rule: ensureQueryData
- tanstack-router rule: parallel loading
- tanstack-router rule: Link component
- tanstack-router rule: route masks
- tanstack-router rule: virtual routes
- tanstack-start rule: server errors
- tanstack-start rule: request middleware
- tanstack-start rule: streaming SSR
- tsdown CLI: usage patterns
- ui-styling: shadcn test fixtures
- Plan: row shaping file structure
- brand skill overview
- design: slide strategies
- design: logo generator
- design-system: component tokens
- design-system: token generator
- Design tokens template: duration scale
- pnpm: config dependencies
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
- ui-styling: base config internals
- ui-ux-pro-max: text layout tests
- vitest: context & fixtures
- Domain: Branch context
- Draft: v2 offer sheet prototype
- v1 picks runbook
- Product requirements doc
- Spec: acquisition/error seam
- Plan: M1.1 constraints
- Plan: frame grouping & attire
- Plan: error seam file structure
- Plan: M2 preflight-5 facts
- brand: tokens sync script
- design-system: token validator tests
- tanstack-integration rule: QueryClient context
- tanstack-query rule: gcTime
- tanstack-query rule: error boundaries
- tanstack-query rule: invalidation
- tanstack-query rule: SSR dehydration
- tanstack-router rule: register router
- tsdown: skills README
- Plan: #57 brand token unification
- vitest: configuration
- vitest: reporters
- API tests: appointments
- Architecture doc
- Spec hub: M1 data layer
- Spec hub: M2 preflight
- Spec hub: error seam
- Spec hub: row shaping
- Spec hub: intake deepening
- Spec hub: read-stitch
- Plan: M1.3 file structure
- Plan: read-stitch file structure
- Plan: M2 preflight-2 constraints
- Plan: M2 preflight-3 constraints
- Plan: M2 preflight-4 facts
- @sevendays/db overview refs
- tanstack-query rule: targeted invalidation
- tanstack-query rule: staleTime
- tanstack-query rule: key factories
- tanstack-query rule: hierarchical keys
- tanstack-query rule: serializable keys
- API: appointments route errors/validation
- Progress log hub
- Plan: M2 preflight-1 constraints
- Landing: queries & API functions
- design: slides reference
- design: HTML slide template
- slides: HTML template
- tanstack-query rule: array keys
- tanstack-query rule: key dependencies
- tsdown: introduction
- tsdown: Svelte support
- vitest: benchmarking
- vitest: test tags
- Spec: booking flow decisions
- slides skill overview
- tsdown: Solid support
- tsdown CLI: build options
- tsdown CLI: monorepo
- Landing: booking read flow & summary
- API: confirmation email builder
- Plan: M2-01 studio services catalog
- brand: guideline template
- tsdown CLI: package management
- tsdown CLI: output options
- tsdown CLI: configuration
- admin package.json hub
- landing package.json hub
- api-client biome.json
- Plan: M2-02 appointment model
- Plan: M2-04 read endpoints
- tsdown CLI: logging
- tsdown CLI: dependencies
- tsdown CLI: development
- tsdown CLI: env vars
- landing README: production build
- brand: token sync tests
- design-system: slide token validator
- Landing: services page & bookable branches
- Shared studio-service schemas (types)
- ui-styling: shadcn script bootstrap
- DB schema: inclusion attires
- design: slides create guide
- pnpm: generation notes
- slides: create guide
- tsdown: benchmarking guide
- tsdown: sync notes
- Plan: M2-05 packages pages
- ui-styling: shadcn dry-run tests
- Landing: home & packages pages
- Plan: M2-06 content pages
- ui-styling: tailwind config gen unit tests
- ui-styling: plugin recommendation tests
- ui-styling: nextjs recommendation tests
- ui-styling: init default tests
- ui-styling: JS config gen tests
- ui-styling: color config tests
- ui-styling: config validation tests
- ui-styling: write-config error tests
- ui-styling: full TS config tests
- ui-styling: base config tests
- ui-styling: content paths tests
- vitest: generation notes
- ADR-0012: exactly-one booked offering
- admin dep: @sentry/tanstackstart-react
- admin dep: @sevendays/api-client
- Biome base: performance
- primary-foreground
- ring
- admin dep: Figtree variable font
- admin dep: @tanstack/react-start
- admin dep: tw-animate-css
- admin dep: @posthog/react
- landing dep: @sentry/tanstackstart-react
- landing dep: @sevendays/api-client
- landing dep: @tanstack/react-router
- Plan: M2-07 booking wizard
- Plan: M2-08 booking confirmation
- landing dep: ssr-query integration
- Plan: M2-09 confirmation email
- Verify script: confirmation emails
- App READMEs (admin & landing)
- ADR-0013: one appointments table
- turbo.json typecheck task
- ADR-0014: email send topology
- Plan: #80 seed v1 branch
- API: appointments service & DB client
- Plan: M2-03 service path intake
- admin dep: react
- Plan: edition-aware pipelines facts
- ADR-0015: two-edition mechanism
- admin dep: react-dom
- landing dep: @tailwindcss/vite
- landing dep: @tanstack/react-query
- admin dep: tailwind-merge
- v1 export audit script
- ui-styling: shadcn list/init tests
- ui-styling: shadcn list tests
- ui-styling: shadcn init dry-run tests
- admin dep: react-devtools
- Plan: #78 export audit file structure
- admin dep: zod
- landing dep: radix-ui
- landing dep: react
- landing dep: react-dom
- Plan: #82 pick discipline
- ADR-0016: service binding
- landing dep: shadcn
- landing dep: tailwind-merge
- landing dep: tailwindcss
- landing dep: tw-animate-css
- Design tokens template: sm breakpoint
- Design tokens template: xl breakpoint
- v1 triage classifier script

## God Nodes (most connected - your core abstractions)
1. `TailwindConfigGenerator` - 58 edges
2. `DesignSystemGenerator` - 48 edges
3. `search()` - 46 edges
4. `TestTailwindConfigGenerator` - 35 edges
5. `search_stack()` - 35 edges
6. `ShadcnInstaller` - 34 edges
7. `TestShadcnInstaller` - 26 edges
8. `M1 Real Data Layer Spec` - 26 edges
9. `CLI Reference` - 20 edges
10. `Progress / Status Narration` - 19 edges

## Surprising Connections (you probably didn't know these)
- `PostHog analytics via VITE_POSTHOG_KEY / VITE_POSTHOG_HOST` --conceptually_related_to--> `@sevendays/admin — internal dashboard for content + appointments (TanStack Start)`  [AMBIGUOUS]
  apps/landing/README.md → AGENTS.md
- `minimumReleaseAgeExclude: lucide-react@1.37.0` --conceptually_related_to--> `Shadcn`  [AMBIGUOUS]
  pnpm-workspace.yaml → apps/landing/README.md
- `@sevendays/api-client — the only supported path for both apps to call the API` --conceptually_related_to--> `@sevendays/landing — public marketing site + appointment booking (TanStack Start)`  [INFERRED]
  apps/api/CONTEXT.md → AGENTS.md
- `PostHog analytics via VITE_POSTHOG_KEY / VITE_POSTHOG_HOST` --conceptually_related_to--> `@sevendays/landing — public marketing site + appointment booking (TanStack Start)`  [INFERRED]
  apps/landing/README.md → AGENTS.md
- `@sevendays/api-client — the only supported path for both apps to call the API` --conceptually_related_to--> `@sevendays/admin — internal dashboard for content + appointments (TanStack Start)`  [INFERRED]
  apps/api/CONTEXT.md → AGENTS.md

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

## Communities (512 total, 67 thin omitted)

### Community 0 - "Sevendays service catalog docs & normalized lookups ADR"
Cohesion: 0.17
Nodes (16): ADR-0009: Normalized catalog lookups for Print sizes, Attires, and Inclusions, Alternatives Considered, Attire Junction (package_inclusion_attires), Consequences, Context, Decision, ADR-0009: Normalized catalog lookups for Print sizes, Attires, Inclusions, Frames Table (+8 more)

### Community 1 - "DB schema: package inclusions, frames, service packages"
Cohesion: 0.33
Nodes (6): frames, ADR-0009, packageInclusionKindEnum, ADR-0009, servicePackages, ADR-0005

### Community 2 - "Monorepo overview: AGENTS.md, app docs, workspace"
Cohesion: 0.15
Nodes (16): @sevendays/admin — internal dashboard for content + appointments (TanStack Start), @sevendays/api — shared backend API (Hono on Cloudflare Workers), @sevendays/landing — public marketing site + appointment booking (TanStack Start), @sevendays/ui — shadcn/ui design tokens (CSS variables), Secrets via wrangler secret put per environment, Test coverage status: apps/api real vitest, landing/admin no-op, Three separate Cloudflare Worker deployments (landing/admin/api), Cloudflare Worker deploy — Vite plugin + wrangler.jsonc + wrangler secret put (+8 more)

### Community 3 - "packages/db package.json scripts"
Cohesion: 0.04
Nodes (48): drizzle-kit, default, types, dependencies, drizzle-orm, postgres, devDependencies, drizzle-kit (+40 more)

### Community 4 - "admin package.json devDependencies"
Cohesion: 0.07
Nodes (27): devDependencies, @cloudflare/vite-plugin, @sevendays/config, @tailwindcss/typography, @tanstack/devtools-vite, @tanstack/router-cli, @tanstack/router-plugin, @types/node (+19 more)

### Community 5 - "landing package.json devDependencies"
Cohesion: 0.07
Nodes (29): devDependencies, @cloudflare/vite-plugin, @sevendays/config, @tailwindcss/typography, @tanstack/devtools-vite, @tanstack/router-cli, @tanstack/router-plugin, @types/node (+21 more)

### Community 6 - "Architecture-review specs: row shaping, read-stitch, error seam, intake"
Cohesion: 0.16
Nodes (19): Candidate D — route-layer error seam, ADR-0007 seed/verify on session-mode URL, ADR-0008 minimal-fixtures stance, ADR-0009 Normalized Catalog Lookups + ordering, Candidate C — row-shaping builders, One Catalog Row-Shaping Module (Candidate C), Seeder's Natural-Key Upsert Flow, Opt-in Subpath Export (migrate precedent) (+11 more)

### Community 7 - "api package.json scripts"
Cohesion: 0.04
Nodes (48): types, dependencies, drizzle-orm, hono, @hono/zod-validator, resend, @sevendays/db, @sevendays/types (+40 more)

### Community 8 - "Admin app shell: routeTree, root route, router"
Cohesion: 0.06
Nodes (35): PostHogProvider(), PostHogProviderProps, getBranches, branchQueries, getRouter(), Register, @tanstack/react-router, Route (+27 more)

### Community 9 - "admin package.json dependencies"
Cohesion: 0.07
Nodes (27): dependencies, class-variance-authority, clsx, dotenv-cli, lucide-react, posthog-js, @sevendays/types, @sevendays/ui (+19 more)

### Community 10 - "landing package.json dependencies"
Cohesion: 0.07
Nodes (29): dependencies, class-variance-authority, clsx, cn, dotenv-cli, @fontsource-variable/figtree, lucide-react, posthog-js (+21 more)

### Community 11 - "API entrypoint & integration test suite"
Cohesion: 0.14
Nodes (21): NOTE: these expectTypeOf assertions are enforced by `pnpm typecheck`, not by, app, AppType, ADR-0006, db, url, db, url (+13 more)

### Community 12 - "packages/config package.json scripts"
Cohesion: 0.06
Nodes (35): author, description, devDependencies, @biomejs/biome, @types/node, typescript, vitest, @vitest/coverage-istanbul (+27 more)

### Community 13 - "Root package.json scripts"
Cohesion: 0.06
Nodes (32): devDependencies, @biomejs/biome, @sevendays/config, turbo, typescript, vitest, engines, node (+24 more)

### Community 14 - "packages/types package.json"
Cohesion: 0.07
Nodes (29): devDependencies, @sevendays/config, @types/node, typescript, vitest, zod, exports, @sevendays/config (+21 more)

### Community 15 - "API v1 route wiring & db/env services"
Cohesion: 0.11
Nodes (20): Env, envSchema, parseEnv(), ADR-0007, addonServices, ADR-0006, appointments, branches (+12 more)

### Community 16 - "Landing app shell: routeTree, root route, PostHog"
Cohesion: 0.07
Nodes (35): PostHogProvider(), PostHogProviderProps, getRouter(), Register, @tanstack/react-router, Route, Route, Route (+27 more)

### Community 17 - "Shared appointment schemas (types)"
Cohesion: 0.09
Nodes (25): Appointment, appointmentFieldsSchema, AppointmentKind, appointmentKindSchema, appointmentSchema, AppointmentStatus, appointmentStatusSchema, createAppointmentFieldsSchema (+17 more)

### Community 18 - "Shared TS config: base.json"
Cohesion: 0.10
Nodes (19): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleDetection (+11 more)

### Community 19 - "admin shadcn components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 20 - "landing shadcn components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 21 - "types tsconfig.build.json"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, declarationMap, noEmit, outDir, rootDir, exclude, extends (+9 more)

### Community 22 - "admin tsconfig.json"
Cohesion: 0.12
Nodes (16): compilerOptions, lib, noFallthroughCasesInSwitch, noUncheckedSideEffectImports, noUnusedLocals, noUnusedParameters, paths, extends (+8 more)

### Community 23 - "api tsconfig.build.json"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, declarationMap, noEmit, outDir, rootDir, exclude, extends (+9 more)

### Community 24 - "landing tsconfig.json"
Cohesion: 0.12
Nodes (16): compilerOptions, lib, noFallthroughCasesInSwitch, noUncheckedSideEffectImports, noUnusedLocals, noUnusedParameters, paths, extends (+8 more)

### Community 25 - "Spec: M1 real data layer"
Cohesion: 0.14
Nodes (19): GET /api/v1/addon-services, ADR-0005 Slot Capacity, ADR-0008 Integration Tests vs Real Postgres, ADR-0009 Normalized Catalog Lookups, ADR-0010 URL Path Versioning, appointment_addon_services join (price snapshot), Appointment Kind enum (scheduled|walk_in|visitation), POST /api/v1/appointments (+11 more)

### Community 26 - "db tsconfig.build.json"
Cohesion: 0.12
Nodes (16): compilerOptions, declaration, declarationMap, noEmit, outDir, rootDir, exclude, extends (+8 more)

### Community 27 - "Shared package schemas (types)"
Cohesion: 0.14
Nodes (15): CreateServicePackageInput, createServicePackageSchema, ResolvedAttire, resolvedAttireSchema, ResolvedFrame, resolvedFrameSchema, ResolvedPackageInclusion, ResolvedPrintSize (+7 more)

### Community 28 - "packages/ui package.json"
Cohesion: 0.11
Nodes (17): devDependencies, @sevendays/config, tailwindcss, exports, ./globals.css, ./tokens.css, @sevendays/config, tailwindcss (+9 more)

### Community 29 - "Biome base: formatter"
Cohesion: 0.14
Nodes (16): formatter, attributePosition, bracketSameLine, bracketSpacing, enabled, expand, formatWithErrors, indentStyle (+8 more)

### Community 30 - "Biome vite tier: rules"
Cohesion: 0.12
Nodes (15): jsxQuoteStyle, javascript, formatter, linter, rules, useSortedClasses, noBarrelFile, noNamespaceImport (+7 more)

### Community 31 - "api tsconfig.json"
Cohesion: 0.12
Nodes (15): compilerOptions, types, exclude, extends, include, **.config.ts, coverage, dist (+7 more)

### Community 32 - "packages/config tsconfig.json"
Cohesion: 0.13
Nodes (14): compilerOptions, declaration, declarationMap, noEmit, outDir, rootDir, strictNullChecks, exclude (+6 more)

### Community 33 - "Specs: M2 preflight API client + M1.4 plan"
Cohesion: 0.23
Nodes (13): ADR-0003 Per-Workspace Vitest Configs, ADR-0004 Auth Session Sharing, ADR-0006 Shared API Client + Hono RPC, ApiClientError typed error class (status + details), @sevendays/api-client shared package, apiErrorSchema — one uniform error envelope, API_URL server-side env with no fallback, Hono RPC Type Inference for AppType (+5 more)

### Community 34 - "db tsconfig.json"
Cohesion: 0.15
Nodes (12): compilerOptions, outDir, exclude, extends, include, dist, node_modules, @sevendays/config/ts/node (+4 more)

### Community 35 - "types tsconfig.json"
Cohesion: 0.15
Nodes (12): exclude, extends, include, *.config.ts, coverage, dist, node_modules, @sevendays/config/ts/node (+4 more)

### Community 36 - "turbo.json default task"
Cohesion: 0.18
Nodes (11): .env*, $TURBO_DEFAULT$, inputs, inputs, inputs, inputs, inputs, fix (+3 more)

### Community 37 - "Biome base: rules"
Cohesion: 0.17
Nodes (12): noUnusedVariables, rules, recommended, noBarrelFile, noNamespaceImport, noReExportAll, correctness, nursery (+4 more)

### Community 38 - "admin biome.json"
Cohesion: 0.18
Nodes (10): extends, files, includes, !!**/dist, !instrument.server.mjs, !!**/.output, @sevendays/config/biome/base, @sevendays/config/biome/vite (+2 more)

### Community 39 - "landing biome.json"
Cohesion: 0.18
Nodes (10): extends, files, includes, !!**/dist, !instrument.server.mjs, !!**/.output, @sevendays/config/biome/base, @sevendays/config/biome/vite (+2 more)

### Community 40 - "Plan: M1.1 preflight"
Cohesion: 0.22
Nodes (11): ADR-0007 Database Connection Topology, Two-Connection Database Topology (pooled vs direct), ADR-0007 (authored in this plan), GitHub Actions CI Workflow (pnpm check + build), docs/plan.md Milestone 1 Checklist Rewrite, Committed Env Examples + Gitignored Secrets, M1.1 Pre-flight Implementation Plan, Manifest Aligns (lucide-react ^1.37.0, @types/node ^26) (+3 more)

### Community 41 - "turbo.json tasks"
Cohesion: 0.14
Nodes (14): cache, cache, cache, cache, cache, cache, persistent, tasks (+6 more)

### Community 42 - "Plan: M1.2 catalog schema"
Cohesion: 0.33
Nodes (9): ADR-0003 per-workspace vitest config, ADR-0009 Normalized Catalog Lookups, First Checked-In Migration 0000, Inclusion union (framed_picture|print|privilege), M1.2 Catalog Schema Implementation Plan, Offline-by-Design Ticket (no live DB), GitHub Issue #4 — M1.2 catalog schema, packages/types Vitest Harness (+1 more)

### Community 43 - "Plan: M1.4 real routes + integration tests"
Cohesion: 0.31
Nodes (9): ADR-0008 Integration Tests vs Real Postgres, ADR-0010 URL Path Versioning, /api/v1 Versioned Mount (app.route('/api/v1', api)), compose.yaml Postgres 17 Test Service, M1.4 Real API Routes + Integration Tests Plan, migrateDatabase Subpath Export in packages/db, Resolved Catalog Read Shapes (printSize/attires/frames), Global Setup + Fixtures + Truncate Harness (+1 more)

### Community 44 - "Biome worker tier"
Cohesion: 0.20
Nodes (9): linter, rules, noBarrelFile, noNamespaceImport, noReExportAll, performance, style, $schema (+1 more)

### Community 45 - "Shared TS config: node.json"
Cohesion: 0.20
Nodes (9): compilerOptions, module, moduleResolution, target, types, extends, ./base.json, node (+1 more)

### Community 46 - "db biome.json"
Cohesion: 0.20
Nodes (9): extends, files, includes, !!dist, @sevendays/config/biome/base, @sevendays/config/biome/node, root, !!drizzle (+1 more)

### Community 47 - "Shared branch & API error schemas (types)"
Cohesion: 0.22
Nodes (6): ApiError, apiErrorSchema, Branch, branchSchema, CreateBranchInput, createBranchSchema

### Community 48 - "Shared inclusion schemas (types)"
Cohesion: 0.24
Nodes (8): CreatePackageInclusionInput, createPackageInclusionSchema, PackageInclusion, PackageInclusionKind, packageInclusionKindSchema, packageInclusionSchema, ADR-0009, resolvedInclusionSchema

### Community 49 - "Plan: M1.3 provision, migrate, seed"
Cohesion: 0.20
Nodes (15): ADR-0007 Alignment (session-pooler refinement), scripts/catalog.ts Catalog Transcription, check-env.mjs Pre-Flight Gate, FK Indexes + Natural Keys Folded Into Migration 0000, M1.3 Provision, Migrate, Seed Implementation Plan, db:seed Single-Transaction Natural-Key Upsert, Session-Mode Pooler for Migrations + Seed, GitHub Issue #5 — M1.3 provision/migrate/seed (+7 more)

### Community 50 - "turbo.json build task"
Cohesion: 0.33
Nodes (6): NODE_ENV, env, outputs, dist/**, .output/**, build

### Community 51 - "api biome.json"
Cohesion: 0.25
Nodes (7): extends, files, includes, @sevendays/config/biome/base, !worker-configuration.d.ts, root, @sevendays/config/biome/worker

### Community 52 - "Plan: M1.5 exit verification"
Cohesion: 0.53
Nodes (6): Four-Act Exit Verification Runbook (pre-flight + acts 1-4), M1.5 M1 Exit Verification + Close-Out Implementation Plan, Negative Controls on the Deployed Artifact, rehearsal-fixture.mjs Compose-Only Rehearsal, GitHub Issue #7 — M1.5 exit verification + close-out, verify-appointment-row.mjs psql-Equivalent Probe

### Community 54 - "@sevendays/config docs & CI wiring"
Cohesion: 0.33
Nodes (7): pnpm check gate (lint + format + typecheck + test), @sevendays/config — shared ts/biome/vitest tooling configs (built dist, gitignored), Turborepo-powered root commands (dev/build/lint/format/typecheck/test/check/fix), CI workflow (.github/workflows/ci.yml), @sevendays/config/biome/* — base + tier fragments (vite, worker, node), @sevendays/config/ts/* — base, node, react, vite tsconfig variants, @sevendays/config/vitest — shared Vitest config

### Community 55 - "Biome base: root config"
Cohesion: 0.29
Nodes (6): css, parser, files, javascript, tailwindDirectives, $schema

### Community 56 - "Biome base: includes"
Cohesion: 0.29
Nodes (7): includes, !!**/dist, !!**/node_modules, !!**/.turbo, **, !!**/.agents, !!**/.wrangler

### Community 57 - "Shared TS config: react.json"
Cohesion: 0.29
Nodes (6): compilerOptions, jsx, jsxImportSource, extends, ./base.json, $schema

### Community 58 - "DB script: check-env"
Cohesion: 0.29
Nodes (4): dbDir, dbEnvPath, devVarsPath, repoDir

### Community 59 - "Shared attire schemas (types)"
Cohesion: 0.38
Nodes (5): Attire, attireSchema, CreateAttireInput, createAttireSchema, ADR-0009

### Community 60 - "turbo.json test task"
Cohesion: 0.29
Nodes (7): coverage/blob/**, ^test, $TURBO_ROOT$/vitest.config.ts, test, dependsOn, inputs, outputs

### Community 61 - "turbo.json global env passthrough"
Cohesion: 0.29
Nodes (6): DATABASE_MIGRATE_URL, DATABASE_URL, TEST_DATABASE_URL, globalPassThroughEnv, $schema, ui

### Community 62 - "ui-ux-pro-max: data validation & tests"
Cohesion: 0.08
Nodes (45): read_rows(), TestAccessibilityGuidance, TestChartsTypographyAndIcons, TestCurrentReactGuidance, TestSemanticColors, _catalog_date(), _check_app_interface_contract(), _check_catalog_contract() (+37 more)

### Community 63 - "Shared vitest config factory"
Cohesion: 0.60
Nodes (3): baseConfig, sharedConfig, uiConfig

### Community 64 - "Shared add-on service schemas (types)"
Cohesion: 0.47
Nodes (4): AddonService, addonServiceSchema, CreateAddonServiceInput, createAddonServiceSchema

### Community 65 - "Shared frames schemas (types)"
Cohesion: 0.47
Nodes (4): CreateFrameInput, createFrameSchema, frameSchema, PackageFrame

### Community 66 - "Shared print-size schemas (types)"
Cohesion: 0.47
Nodes (4): CreatePrintSizeInput, createPrintSizeSchema, PrintSize, printSizeSchema

### Community 67 - "ui biome.json"
Cohesion: 0.33
Nodes (5): extends, @sevendays/config/biome/base, @sevendays/config/biome/node, overrides, root

### Community 68 - "Agent docs: issue tracker & triage labels"
Cohesion: 0.17
Nodes (12): Conventions, Issue Tracker: GitHub via gh CLI, gh CLI Issue Workflow, Issue tracker: GitHub, Pull requests as a triage surface, Wayfinder Map + Child Tickets, Wayfinding operations, When a skill says "fetch the relevant ticket" (+4 more)

### Community 69 - "Design tokens template: gray palette"
Cohesion: 0.05
Nodes (53): $type, $value, $type, $value, $type, $value, $type, $value (+45 more)

### Community 70 - "Vitest blob report merge script"
Cohesion: 0.40
Nodes (3): destinationDir, workspaceDirs, workspaceRoot

### Community 71 - "DB script: pooler transaction probe"
Cohesion: 0.40
Nodes (3): ADR-0007, parsed, sql

### Community 73 - "types biome.json"
Cohesion: 0.40
Nodes (4): extends, @sevendays/config/biome/base, @sevendays/config/biome/node, root

### Community 74 - "Root biome.json"
Cohesion: 0.50
Nodes (3): extends, @sevendays/config/biome/base, $schema

### Community 75 - "packages/config biome.json"
Cohesion: 0.50
Nodes (3): extends, root, ./src/biome/base.json

### Community 76 - "Biome base: source settings"
Cohesion: 0.50
Nodes (4): source, assist, actions, organizeImports

### Community 77 - "Biome base: VCS settings"
Cohesion: 0.50
Nodes (4): vcs, clientKind, enabled, useIgnoreFile

### Community 78 - "Decls for verify-appointment-row script"
Cohesion: 0.50
Nodes (3): AppointmentProbeAddon, AppointmentProbeExpected, AppointmentProbeResult

### Community 79 - "Landing booking flow: lib, wizard UI, rejection card"
Cohesion: 0.08
Nodes (39): RejectionCard(), createAppointment, addonTotalCents(), API_REASON_MAP, applicableAddonsFor(), BookingCatalog, BookingDetails, BookingSearchInit (+31 more)

### Community 80 - "Landing E2E verify scripts"
Cohesion: 0.14
Nodes (20): check(), main(), peso(), results, check(), main(), peso(), phDate() (+12 more)

### Community 97 - "API service-packages & studio-services routes"
Cohesion: 0.21
Nodes (10): ADR-0006, ADR-0006, groupChildren(), Row, ADR-0009, assemblePackageRead(), getActivePackageWithInclusionsBySlug(), JunctionRow (+2 more)

### Community 108 - "design skill: CIP search & render scripts"
Cohesion: 0.07
Nodes (42): BM25, detect_domain(), get_cip_brief(), _load_csv(), Load CSV and return list of dicts, Core search function using BM25, Auto-detect the most relevant domain from query, Main search function with auto-domain detection (+34 more)

### Community 109 - "Design tokens template: button component"
Cohesion: 0.06
Nodes (45): $type, $value, $type, $value, bg, fg, font-size, hover-bg (+37 more)

### Community 110 - "ui-styling: Tailwind utilities reference"
Cohesion: 0.05
Nodes (43): Arbitrary Values, Aspect Ratio, Background Colors, Border Color, Border Radius, Border Style, Border Width, Borders (+35 more)

### Community 111 - "design-system: slide search core"
Cohesion: 0.09
Nodes (36): format_context(), format_result(), main(), Format a single search result for display, Format contextual recommendations for display., BM25, calculate_pattern_break(), detect_domain() (+28 more)

### Community 112 - "brand: guidelines starter template"
Cohesion: 0.05
Nodes (37): 1. Color Palette, 2. Typography, 3. Logo Usage, 4. Voice & Tone, 5. Imagery Guidelines, 6. Design Components, Accessibility, AI Image Generation (+29 more)

### Community 113 - "Hono skill docs"
Cohesion: 0.05
Nodes (35): Adapters, App Constructor, Async Components, Best Practices, Components, Context (c), Custom Middleware, Environment (Cloudflare Workers) (+27 more)

### Community 114 - "tsdown: tree shaking"
Cohesion: 0.05
Nodes (37): Advanced Configuration, Basic Usage, Benefits, Better Performance, Cleaner Output, CLI, Code Still Included, Common Patterns (+29 more)

### Community 115 - "design skill docs"
Cohesion: 0.06
Nodes (35): Banner Design (Built-in), Banner: Design Rules, Banner: Quick Size Reference, Banner: Top Art Styles, Banner: Workflow, CIP Design (Built-in), CIP: Generate Brief, CIP: Generate Mockups (+27 more)

### Community 116 - "tsdown: advanced plugins"
Cohesion: 0.06
Nodes (36): 1. Rolldown Plugins, 2. Unplugin, 3. Rollup Plugins, 4. Vite Plugins, Auto Import, Basic Plugin Structure, Basic Plugin Usage, Common Plugin Patterns (+28 more)

### Community 117 - "ui-styling: canvas design system"
Cohesion: 0.06
Nodes (35): 1. Visual Communication First, 2. Minimal Text Integration, 3. Expert Craftsmanship, 4. Systematic Patterns, Analog Meditation, Approach, Canvas Boundaries, Canvas Design System (+27 more)

### Community 118 - "organization-best-practices skill"
Cohesion: 0.06
Nodes (34): Active Organizations, Adding Members (Server-Side), Assigning Multiple Roles, Checking Permissions, Client-Side Setup, Complete Configuration Example, Controlling Organization Creation, Creating Custom Roles (+26 more)

### Community 119 - "tsdown: shims"
Cohesion: 0.06
Nodes (35): Browser Platform, CJS Output (automatic), CJS with import.meta, CLI, CLI Examples, Common Patterns, Config File, `__dirname is not defined` (+27 more)

### Community 120 - "tsdown: unbundle mode"
Cohesion: 0.06
Nodes (35): Basic Usage, Build Speed, Bundle Size, CLI, CLI Examples, Common Patterns, Comparison, Config File (+27 more)

### Community 121 - "ui-ux-pro-max: prerequisites"
Cohesion: 0.06
Nodes (34): Accessibility, Available Domains, Available Stacks, Common Rules for Professional UI, Common Sticking Points, Example Workflow, How to Use This Skill, Icons & Visual Elements (+26 more)

### Community 122 - "packages/api-client package.json"
Cohesion: 0.06
Nodes (34): dependencies, hono, @sevendays/types, zod, devDependencies, @hono/zod-validator, @sevendays/api, @sevendays/config (+26 more)

### Community 123 - "Design tokens template: spacing scale"
Cohesion: 0.06
Nodes (34): $type, $value, $type, $value, $type, $value, $type, $value (+26 more)

### Community 125 - "tsdown: dependencies"
Cohesion: 0.06
Nodes (34): Auto-Externalized, CLI Tool (Bundle Everything), CLI Usage, Common Patterns, Complex Type Resolution, Conditionally Bundled, Configuration Options, Declaration Files (+26 more)

### Community 126 - "ui-ux-pro-max: stack search & freshness"
Cohesion: 0.10
Nodes (8): _project_row(), Search stack-specific guidelines, search_stack(), _valid_max_results(), _rows(), TestNativeDesktopStackFreshness, _rows(), TestWebStackFreshness

### Community 127 - "tsdown: sourcemaps"
Cohesion: 0.06
Nodes (33): Always Inline (Development Tool), Auto-Enable Scenarios, Basic Usage, Benefits, Browser Library, CLI, CLI Examples, Common Patterns (+25 more)

### Community 128 - "ui-styling: shadcn form & input components"
Cohesion: 0.06
Nodes (32): Accordion, Alert, Alert Dialog, Avatar, Badge, Button, Card, Checkbox (+24 more)

### Community 129 - "ui-styling: Tailwind responsive design"
Cohesion: 0.06
Nodes (32): 1. Mobile-First Design, 2. Consistent Breakpoint Usage, 3. Test at Breakpoint Boundaries, 4. Use Container for Content Width, 5. Progressive Enhancement, 6. Avoid Too Many Breakpoints, Best Practices, Breakpoint System (+24 more)

### Community 130 - "tsdown: declaration files"
Cohesion: 0.06
Nodes (32): Advanced Options, Auto-Enabled, Available DTS Options, Basic Library, Build Process, CLI, Common Patterns, Config File (+24 more)

### Community 131 - "tsdown: Vue support"
Cohesion: 0.06
Nodes (32): Advanced Patterns, Basic Configuration, Common Patterns, Component Example, Component Library, Component Types Missing, Export Components, How It Works (+24 more)

### Community 132 - "better-auth security skill"
Cohesion: 0.06
Nodes (30): Account Enumeration Prevention, Background Tasks, Complete Security Configuration Example, Configuration, Configuring the Secret, Configuring Trusted Origins, Cookie Security, Cross-Subdomain Cookies (+22 more)

### Community 133 - "brand: typography specs"
Cohesion: 0.06
Nodes (30): Accessibility, Base System, Best Practices, Clean & Modern, Common Font Pairings, Contrast Requirements, CSS Implementation, Editorial (+22 more)

### Community 134 - "color"
Cohesion: 0.06
Nodes (31): $type, $value, background, destructive, destructive-foreground, foreground, muted, muted-foreground (+23 more)

### Community 135 - "tsdown: output cleaning"
Cohesion: 0.06
Nodes (31): Always Clean, Basic Usage, Behavior, Clean on First Build Only, Clean Patterns, Clean Specific Directories, CLI, CLI Examples (+23 more)

### Community 136 - "tsdown: watch mode"
Cohesion: 0.07
Nodes (30): Advanced Configuration, Basic Usage, CLI, CLI Examples, Common Patterns, Conditional Watch, Config Changes Not Applied, Config File (+22 more)

### Community 137 - "brand: logo usage rules"
Cohesion: 0.07
Nodes (28): Absolute Don'ts, Approved Backgrounds, Before Using Logo, Clear Space, Co-branding, Color Rules, Color Usage, Color Variants (+20 more)

### Community 138 - "design-system: component specs"
Cohesion: 0.07
Nodes (28): Alert, Anatomy, Anatomy, Anatomy, Anatomy, Anatomy, Badge, Button (+20 more)

### Community 139 - "tsdown: React support"
Cohesion: 0.07
Nodes (29): Advanced Patterns, Automatic (Default), Basic Configuration, Classic, Common Patterns, Component Example, Component Library, Configure (+21 more)

### Community 140 - "tsdown skill overview"
Cohesion: 0.07
Nodes (29): Advanced with Hooks, Basic Configuration, Basic Library Bundle, Best Practices, Browser Library (IIFE/UMD), Build Options, CI-Aware Configuration, CLI Quick Reference (+21 more)

### Community 141 - "ui-styling: shadcn accessibility"
Cohesion: 0.07
Nodes (28): Accordion, Alert, ARIA Labels, Checkbox and Radio, Color Contrast, Command Palette Navigation, Component-Specific Patterns, Dialog/Modal Navigation (+20 more)

### Community 142 - "ui-styling: Tailwind config gen tests"
Cohesion: 0.07
Nodes (15): Test adding colors multiple times., Test adding full color palette., Test adding custom breakpoints., Test TailwindConfigGenerator class., Test generating TypeScript configuration., Test generating config with plugins., Test validating config with no content paths., Test validating config with empty theme extensions. (+7 more)

### Community 143 - "ui-ux-pro-max: palette selection"
Cohesion: 0.14
Nodes (15): _detect_page_type(), format_master_md(), format_page_override_md(), _generate_intelligent_overrides(), persist_design_system(), Path, Format design system as MASTER.md with hierarchical override logic., Format a page-specific override file with intelligent AI-generated content. (+7 more)

### Community 144 - "API client: Hono RPC wrapper, unwrap, errors"
Cohesion: 0.08
Nodes (35): getApiClient(), getApiUrl(), ADR-0006, ADR-0016, CreateEndpoint, CreateInput, CreateApiClientOptions, RpcClient (+27 more)

### Community 145 - "design-system: HTML token validator"
Cohesion: 0.14
Nodes (24): get_context(), is_allowed_exception(), is_allowed_rgba(), is_inside_block(), load_css_variables(), main(), print_result(), print_summary() (+16 more)

### Community 146 - "tsdown: programmatic usage"
Cohesion: 0.07
Nodes (27): API Reference, Automated Workflow, Basic Usage, Build Fails Silently, Build with Post-Processing, Common Patterns, Conditional Build, Configuration Object (+19 more)

### Community 147 - "tsdown: package exports"
Cohesion: 0.07
Nodes (28): Auto-Generate Package Exports, Basic Usage, CLI, CLI Examples, Common Patterns, Complete Library Setup, Conditional Dev Exports, Config File (+20 more)

### Community 148 - "ui-ux-pro-max: core engine"
Cohesion: 0.07
Nodes (44): _contains_phrase(), _domain_keywords(), _exact_match_diagnostic(), _exact_row_identity(), _file_signature(), _get_bm25(), _legacy_successor_guidance(), _load_csv() (+36 more)

### Community 149 - "pnpm: performance practices"
Cohesion: 0.07
Nodes (26): Benchmarking, Compare Install Times, Configuration Summary, Filter to Changed Packages, Global Virtual Store, Install Optimizations, Lockfile-only Mode, Lockfile Optimization (+18 more)

### Community 150 - "tsdown: lifecycle hooks"
Cohesion: 0.07
Nodes (27): Advanced Usage, Async Hooks, Available Hooks, `build:before`, `build:done`, Build Fails in Hook, Build Metrics, Build Notifications (+19 more)

### Community 151 - "tsdown: migrate from tsup"
Cohesion: 0.07
Nodes (27): Acknowledgements, Automatic Migration, Basic Library, Better Workspace Support, Build Fails After Migration, CLI Scripts, Common Migration Patterns, Default Values (+19 more)

### Community 152 - "tsdown: config file"
Cohesion: 0.07
Nodes (27): Auto Loader (Default), Basic Configuration, Common Patterns, Config Loaders, Config Precedence, Configuration File, Custom Config Path, Development vs Production (+19 more)

### Community 153 - "tsdown: output directory"
Cohesion: 0.07
Nodes (27): Basic Usage, Build to Root, CLI, CLI Examples, Common Patterns, Config File, Custom Extensions, Default Extensions (+19 more)

### Community 154 - "tsdown: target option"
Cohesion: 0.07
Nodes (27): Browser Component, Browser Versions, CLI, Common Patterns, Config File, CSS Targeting, Decorators, Default Behavior (+19 more)

### Community 155 - "ui-ux-pro-max: search & taxonomy tests"
Cohesion: 0.11
Nodes (8): _exact_stack_identifier(), Resolve a deprecated in-domain alias, or expose a cross-domain redirect., Main search function with auto-domain detection, Resolve a standalone API identifier even when its BM25 IDF is low., search(), _style_search_destination(), TestSearchDomains, TestStyleTaxonomy

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
Nodes (19): BM25, detect_domain(), _load_csv(), Load CSV and return list of dicts, Core search function using BM25, Auto-detect the most relevant domain from query, Main search function with auto-domain detection, Search across all domains and combine results (+11 more)

### Community 162 - "design-system: states & variants"
Cohesion: 0.08
Nodes (24): Accessibility, Accessibility Requirements, ARIA States, Color Contrast, Color Variants, Disabled States, Error Messages, Error States (+16 more)

### Community 163 - "tsdown: platform option"
Cohesion: 0.08
Nodes (25): Available Platforms, Browser Library (IIFE), Browser Platform, CJS Format Limitation, CLI, Common Patterns, Config File, Main Fields (+17 more)

### Community 164 - "ui-styling skill overview"
Cohesion: 0.08
Nodes (24): Accessibility Patterns, Alternative: Tailwind-Only Setup, Best Practices, Common Patterns, Component Layer: shadcn/ui, Component Library Guide, Component + Styling Setup, Core Stack (+16 more)

### Community 165 - "design: social photos workflow"
Cohesion: 0.08
Nodes (23): Art Direction Styles (Reuse from Banner), Color & Contrast, Design Best Practices, HTML Design Rules, HTML Template Structure, Option A: Chrome Headless CLI (Recommended — zero dependencies), Option B: chrome-devtools skill, Option C: Playwright script (+15 more)

### Community 166 - "tsdown: CSS support"
Cohesion: 0.08
Nodes (24): `additionalData`, Code Splitting, Configuration, CSS Import, CSS Minification, CSS Modules, CSS Pre-processors, CSS Support (+16 more)

### Community 167 - "ui-ux-pro-max: design system generator"
Cohesion: 0.06
Nodes (33): ansi_ljust(), _contrast_ratio(), _derive_dark_palette(), _filter_anti_patterns_for_mode(), format_ascii_box(), hex_to_ansi(), _palette_is_dark(), _query_wants_dark() (+25 more)

### Community 168 - "ui-ux-pro-max: generator tests"
Cohesion: 0.18
Nodes (6): Execute searches across multiple domains., Select best matching result based on priority keywords., Extract results list from search result dict., Generate complete design system recommendation. variance/motion/density are…, Bucket a 1-10 dial value into its tier config. Returns None if value is None., _resolve_dial()

### Community 169 - "design-system skill overview"
Cohesion: 0.09
Nodes (22): Best Practices, Chart.js Integration, Command, Component Spec Pattern, Contextual Decision Flow, Decision System CSVs, Design System, Integration (+14 more)

### Community 170 - "Design tokens template: radius scale"
Cohesion: 0.13
Nodes (22): $type, $value, lg, $type, $value, $type, $value, $type (+14 more)

### Community 171 - "ui-styling: Tailwind customization"
Cohesion: 0.09
Nodes (22): @apply Directive, Best Practices, Color Customization, Complete Tailwind Config, Configuration Examples, Content Configuration, Custom Color Palette, Custom Font Sizes (+14 more)

### Community 172 - "Plan: #81 v1 first light (file structure)"
Cohesion: 0.18
Nodes (10): #81 — v1 First Light: CI Green + Continuous Private Deploy, Verified Booking-Free — Implementation Plan, File Structure, Global Constraints, Task 1: Pre-flight — baseline and drift check, Task 2: The live booking-free battery on `sevendays-v1-*` (AC 2), Task 3: The env-shed in production shape (AC 3), Task 4: Teaser (main) untouched and still booking-present (AC 4), Task 5: CI green + deploy history on `v1` from the first push (AC 1 + AC 5) (+2 more)

### Community 173 - "pnpm: migration guide"
Cohesion: 0.09
Nodes (21): CI/CD Migration, Configuration Migration, From Lerna, From npm, From npm Workspaces, From Yarn, From Yarn Workspaces, Gradual Migration (+13 more)

### Community 174 - "API client test: mock API harness"
Cohesion: 0.24
Nodes (10): RFC-4122, ADDONS, APPOINTMENTS, BRANCH_LINKS, BRANCHES, makeApi(), NOW, PACKAGES (+2 more)

### Community 175 - "create-auth skill"
Cohesion: 0.10
Nodes (20): Auth UI Implementation, Client Config (auth-client.ts), Common Plugins, Create Auth Skill, Database Adapters, Database Migrations, Drizzle Config (`drizzle.config.ts`), Drizzle + PostgreSQL Setup (+12 more)

### Community 176 - "pnpm: content-addressable store"
Cohesion: 0.10
Nodes (20): Check disk usage, Configuration, Disk Space Benefits, Global Virtual Store, Hard link issues (network drives, Docker), Hoisted Mode, How It Works, Isolated Mode (Default) (+12 more)

### Community 177 - "tsdown: entry points"
Cohesion: 0.10
Nodes (21): All TypeScript Files, CLI, CLI Tool, Common Patterns, Config File, Entry Points, Exclude Test Files, Glob Patterns (+13 more)

### Community 178 - "tsdown: minification"
Cohesion: 0.10
Nodes (21): Basic Usage, Browser Library, CLI, CLI Examples, Common Patterns, Conditional Minification, Config File, DCE-Only Mode (+13 more)

### Community 179 - "tsdown: references README"
Cohesion: 0.10
Nodes (20): Advanced (continued), ✅ Advanced Features, Advanced Topics (6), ✅ Build Options, Configuration Options (20), ✅ Core Functionality, Core Guides (3), Coverage Status (+12 more)

### Community 180 - "PRD & architecture: slot grid capacity"
Cohesion: 0.17
Nodes (15): ADR-0005: Hourly slot grid with per-slot capacity for booking availability, Alternatives Considered, Consequences, Context, Decision, ADR-0005: Hourly slot grid with per-slot capacity, Hourly Slot Grid with Per-Slot Capacity, System Architecture (+7 more)

### Community 181 - "design: routing by task type"
Cohesion: 0.10
Nodes (19): Banner Design Tasks, Brand Identity Tasks, Component Creation, Corporate Identity Program Tasks, Design Routing Guide, Design System Migration, Icon Design Tasks, Implementation Tasks (+11 more)

### Community 182 - "design-system: slide generator"
Cohesion: 0.15
Nodes (19): _e(), generate_chart_slide(), generate_cta_slide(), generate_deck(), generate_metrics_slide(), generate_problem_slide(), generate_solution_slide(), generate_testimonial_slide() (+11 more)

### Community 183 - "tsdown: output format"
Cohesion: 0.10
Nodes (20): Available Formats, Browser Library (IIFE), CLI, Common Patterns, Config File, Customize Extensions, File Extensions, Format-Specific Outputs (+12 more)

### Community 184 - "ui-styling: shadcn theming"
Cohesion: 0.10
Nodes (19): Base Color Presets, Best Practices, Color Customization, Color Format, Component Customization, CSS Variable System, Customize Styles, Customize Variants (+11 more)

### Community 185 - "ui-styling: Tailwind config generator"
Cohesion: 0.10
Nodes (11): Generate Tailwind CSS configuration files., Add full color palette (50-950 shades) for a base color. Args: name: Color name…, TailwindConfigGenerator, Test adding custom fonts., Test adding custom spacing., Test that adding same plugin twice doesn't duplicate., Test initialization for JavaScript config., Test initialization with different frameworks. (+3 more)

### Community 186 - "vitest: core test API"
Cohesion: 0.10
Nodes (20): Async Tests, Basic Test, Benchmarks (v5), Concurrent Tests, Custom Test with Fixtures, Failing Tests, Focus Tests, Key Points (+12 more)

### Community 187 - "vitest: mocking"
Cohesion: 0.10
Nodes (20): Async Timer Methods, Auto-Cleanup with `using`, Auto-mock with Spy, Clearing Mocks, Conditional Mocking with vi.when (v5), Config Auto-Reset, Dynamic Mocking (vi.doMock), Hoisted Variables for Mocks (+12 more)

### Community 188 - "DB: catalog-rows read module"
Cohesion: 0.13
Nodes (19): assertAllKnownAttires(), AttireIdLookup, buildFrameRowValues(), buildInclusionRowValues(), buildJunctionPairs(), FrameRowValues, InclusionEntry, InclusionKind (+11 more)

### Community 189 - "better-auth integration skill"
Cohesion: 0.11
Nodes (18): Better Auth Integration Guide, CLI Commands, Client, Common Gotchas, Core Config Options, Database, Email Flows, Environment Variables (+10 more)

### Community 190 - "brand: asset organization"
Cohesion: 0.11
Nodes (18): Asset Entry (manifest.json), Asset Organization Guide, By Campaign, By Status, By Type, Cleanup Workflow, Components, Directory Structure (+10 more)

### Community 191 - "design: logo color psychology"
Cohesion: 0.11
Nodes (18): Accessibility Considerations, Analogous, Black, Blue, Color Combinations by Industry, Color Harmony Types, Complementary, Green (+10 more)

### Community 192 - "design: logo types & style guide"
Cohesion: 0.11
Nodes (18): 1. Wordmark (Logotype), 2. Lettermark (Monogram), 3. Pictorial Mark (Brand Mark), 4. Abstract Mark, 5. Mascot, 6. Emblem, 7. Combination Mark, Aesthetic Styles (+10 more)

### Community 193 - "pnpm: CI/CD setup"
Cohesion: 0.11
Nodes (18): Basic Setup, Best Practices Summary, Build Changed Packages Only, Corepack Integration, Docker, --frozen-lockfile, GitHub Actions, GitLab CI (+10 more)

### Community 194 - "pnpm: patches"
Cohesion: 0.11
Nodes (18): allowUnusedPatches, Best Practices, Creating a Patch, List Patched Packages, Managing Patches, Multiple Packages / Workspaces, Patch Configuration, Patch fails to apply (+10 more)

### Community 195 - "Roadmap & tech stack (M0-M6)"
Cohesion: 0.16
Nodes (21): BetterAuth Staff Auth, ADR-0004: API verifies BetterAuth sessions via shared tables, not cookies, Alternatives Considered, Consequences, Context, Decision, Shared Session Tables Token Verification, Dual Connection Strings (DATABASE_URL / DATABASE_MIGRATE_URL) (+13 more)

### Community 196 - "Root AGENTS.md conventions"
Cohesion: 0.11
Nodes (16): Agent skills, Commands, Current status of `pnpm test`, Directory Structure, Domain docs, Engineering Rules, graphify, Issue tracker (+8 more)

### Community 197 - "brand: consistency checklist"
Cohesion: 0.11
Nodes (17): Audit Frequency, Brand Consistency Checklist, Channel Audit, Collateral, Colors, Common Issues, Email, Imagery (+9 more)

### Community 198 - "design: CIP mockup prompts"
Cohesion: 0.11
Nodes (17): Apparel (Polo/T-Shirt), Base Prompt Structure, Business Card, CIP Mockup Prompt Engineering, Context Modifiers, Corporate Minimal, Deliverable-Specific Modifiers, Letterhead (+9 more)

### Community 199 - "design-system: semantic colors"
Cohesion: 0.11
Nodes (17): Accent, Applying Semantic Tokens, Background & Foreground, Border & Ring, Color Semantics, Dark Mode Overrides, Destructive, Interactive States (+9 more)

### Community 200 - "design-system: background fetcher"
Cohesion: 0.17
Nodes (17): generate_css_for_background(), get_background_image(), get_curated_images(), get_overlay_css(), get_pexels_search_url(), load_backgrounds_config(), load_brand_colors(), main() (+9 more)

### Community 201 - "pnpm: overrides"
Cohesion: 0.11
Nodes (17): Basic Syntax, Common Use Cases, Debugging, Deduplicate Dependencies, Fix Peer Dependency Issues, Hooks Alternative, Override all instances, Override nested dependency (+9 more)

### Community 202 - "pnpm: peer dependencies"
Cohesion: 0.11
Nodes (17): Adding Peer Dependencies via packageExtensions, Allow Multiple Major Versions, allowAny, allowedVersions, Auto-Install Peer Dependencies, Best Practices, Common Scenarios, Debugging Peer Dependencies (+9 more)

### Community 203 - "vitest: vi utilities"
Cohesion: 0.11
Nodes (18): Assertion Helpers — vi.defineHelper (4.1+), Conditional Mocking — vi.when (v5), Dynamic Mocking, Fake Timers, Global/Env Mocking, Global Mock Management, Hoisted Code, Key Points (+10 more)

### Community 204 - "vitest: describe API"
Cohesion: 0.11
Nodes (17): Basic Usage, Concurrent Suites, Describe API, describe.each, describe.for, Focus Suites, Hooks in Suites, Key Points (+9 more)

### Community 205 - "vitest: code coverage"
Cohesion: 0.11
Nodes (17): CI Integration, Code Coverage, Configuration, Coverage with Sharding, Ignoring Code, Istanbul, Istanbul, Key Points (+9 more)

### Community 206 - "ADRs: URL versioning & shared API client"
Cohesion: 0.16
Nodes (16): ADR-0006: Shared API client via Hono RPC type-sharing, called server-to-server only, Alternatives Considered, Consequences, Context, Decision, ADR-0006: Shared API client via Hono RPC type-sharing (server-to-server only), Hono RPC Shared API Client (packages/api-client), Server-Mediated Topology (browser -> own app -> api) (+8 more)

### Community 207 - "api-client tsconfig.build.json"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, declarationMap, noEmit, outDir, rootDir, exclude, extends (+9 more)

### Community 208 - "pnpm: CLI commands"
Cohesion: 0.12
Nodes (17): Clean / reproducible installs, dlx / pnx — run without installing, Filter patterns, Global packages (v11 isolated installs), Inspection / registry, Installation Commands, Key Points, Linking local packages (+9 more)

### Community 209 - "tanstack-query: quick reference"
Cohesion: 0.12
Nodes (16): Caching (Prefix: `cache-`), Error Handling (Prefix: `err-`), Full Reference, How to Use, Infinite Queries (Prefix: `inf-`), Mutations (Prefix: `mut-`), Offline Support (Prefix: `offline-`), Parallel Queries (Prefix: `parallel-`) (+8 more)

### Community 210 - "tanstack-router: quick reference"
Cohesion: 0.12
Nodes (16): Code Splitting (Prefix: `split-`), Data Loading (Prefix: `load-`), Error Handling (Prefix: `err-`), Full Reference, How to Use, Navigation (Prefix: `nav-`), Preloading (Prefix: `preload-`), Quick Reference (+8 more)

### Community 211 - "tanstack-start: quick reference"
Cohesion: 0.12
Nodes (16): API Routes (Prefix: `api-`), Authentication (Prefix: `auth-`), Deployment (Prefix: `deploy-`), Environment (Prefix: `env-`), Error Handling (Prefix: `err-`), File Organization (Prefix: `file-`), Full Reference, How to Use (+8 more)

### Community 212 - "tsdown: getting started"
Cohesion: 0.12
Nodes (17): 1. Create Source Files, 2. Create Config File, 3. Run Build, 4. Test Output, Add to npm Scripts, Basic Configurations, Browser Library (IIFE), CLI Commands (+9 more)

### Community 213 - "ui-styling: shadcn installer tests"
Cohesion: 0.12
Nodes (10): Test ShadcnInstaller class., Test adding all components without config., Test adding all components in dry run mode., Create temporary project structure., Test listing installed components when none exist., Test listing installed components when they exist., Test checking for existing shadcn config., Test getting installed components without config. (+2 more)

### Community 214 - "ui-ux-pro-max: threshold gate tests"
Cohesion: 0.13
Nodes (3): TestFixtureValidation, TestMetricMath, TestThresholdGate

### Community 215 - "vitest skill: projects, tags, benchmarking"
Cohesion: 0.20
Nodes (3): Advanced, Core, Features

### Community 216 - "vitest: expect API"
Cohesion: 0.12
Nodes (16): Assertion Count, Asymmetric Matchers, Basic Assertions, Chai-Style Spy Assertions (4.1+), Conditional Mock Exhaustion (v5), Error Assertions, Expect API, Extending Matchers (+8 more)

### Community 217 - "Per-context CONTEXT docs"
Cohesion: 0.13
Nodes (13): Admin, Language, Availability decision (ADR-0005), API, Availability (ADR-0005), API owns the canonical domain vocabulary, Language, Landing (+5 more)

### Community 218 - "ADRs: TS 6 pin & tiered Biome"
Cohesion: 0.14
Nodes (17): ADR-0001: Pin TypeScript to ^6.0.3 and standardize on Biome for lint + format, Alternatives Considered, Biome Replaces ESLint + Prettier, Consequences, Context, Decision, ADR-0001: Pin TypeScript to ^6.0.3, standardize on Biome, Maximal Biome Ruleset (preset all + nursery) (+9 more)

### Community 219 - "DB client: pooler & transactions"
Cohesion: 0.33
Nodes (4): createDbClient(), ADR-0008, ADR-0007, ADR-0011

### Community 220 - "banner-design: sizes & styles"
Cohesion: 0.12
Nodes (15): 22 Art Direction Styles, Banner Sizes & Art Direction Styles Reference, Complete Banner Sizes, CTA Rules, Design Principles, Pinterest Research Queries, Print, Print Specs (+7 more)

### Community 221 - "design: banner sizes & styles"
Cohesion: 0.12
Nodes (15): 22 Art Direction Styles, Banner Sizes & Art Direction Styles Reference, Complete Banner Sizes, CTA Rules, Design Principles, Pinterest Research Queries, Print, Print Specs (+7 more)

### Community 222 - "design: icon generator"
Cohesion: 0.20
Nodes (15): apply_color(), apply_viewbox_size(), extract_svgs(), generate_batch(), generate_icon(), generate_sizes(), load_env(), main() (+7 more)

### Community 223 - "Design tokens template: fontSize scale"
Cohesion: 0.12
Nodes (16): $type, $value, $type, $value, $type, $value, $type, $value (+8 more)

### Community 224 - "pnpm: workspaces"
Cohesion: 0.12
Nodes (15): Best Practices, Dependency-based Filtering, Example Project Structure, Execute commands, Filtering Packages, Install dependencies, Per-package configuration (packageConfigs), pnpm Workspaces (+7 more)

### Community 225 - "pnpm: aliases"
Cohesion: 0.12
Nodes (15): Add multiple versions, Add with alias, Basic Syntax, Best Practices, CLI Usage, Combined with Overrides, Git and Local Aliases, Multiple Versions of Same Package (+7 more)

### Community 226 - "tsdown: WASM support"
Cohesion: 0.12
Nodes (16): Async Init, Configure, Direct Import, Importing WASM Modules, Install, Overview, Plugin Options, Related Options (+8 more)

### Community 227 - "ui-styling: shadcn add script"
Cohesion: 0.17
Nodes (8): main(), Add all available shadcn/ui components. Args: overwrite: If True, overwrite…, List installed components. Returns: Tuple of (success, message with component…, Check if shadcn is initialized in project. Returns: True if components.json…, Get list of already installed components. Returns: List of installed component…, Read shadcn version from project package.json; fall back to a pinned default., Add shadcn/ui components. Args: components: List of component names to add…, Tests for shadcn_add.py

### Community 228 - "ui-ux-pro-max: BM25 search core"
Cohesion: 0.09
Nodes (12): BM25, BM25 ranking algorithm for text search, format_markdown(), generate_design_system(), Format design system as markdown., Main entry point for design system generation. Args: query: Search query (e.g.,…, format_output(), Format results for Claude consumption (token-optimized) (+4 more)

### Community 229 - "Landing: featured packages lib"
Cohesion: 0.24
Nodes (7): FALLBACK_HEADING, FEATURED_COUNT, FEATURED_HEADING, A, B, BASIC, C

### Community 231 - "vitest: test environments"
Cohesion: 0.12
Nodes (15): Available Environments, Browser Mode (Separate from Environments), Configuration, CSS and Assets, Custom Environment, Environment with VM, Fixing External Dependencies, happy-dom Environment (+7 more)

### Community 232 - "vitest: type testing"
Cohesion: 0.12
Nodes (16): assertType, Branded Types, Configuration, Equality vs Matching, expectTypeOf API, Function Types, Generic Types, Key Points (+8 more)

### Community 233 - "vitest: test filtering"
Cohesion: 0.12
Nodes (16): By File Path, By Test Name, Changed Files, CLI Filtering, Combining Filters, Environment-based Filtering, Focus Tests (.only), Include/Exclude Patterns (+8 more)

### Community 234 - "Spec & plan: deepen appointment intake"
Cohesion: 0.17
Nodes (16): ADR-0005 Slot Capacity (M3), ADR-0007 transaction-pooling refinement note, ADR-0008 compose integration suite, ADR-0011 per-request db client (untouched), Single Appointment Projection Constant, Module-Internal Transaction in createAppointment, Deepen the Appointment Intake Module (Candidate A), Live Transaction-Pooler Probe (Seam 3) (+8 more)

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

### Community 239 - "tsdown: Rolldown options"
Cohesion: 0.13
Nodes (15): Common Use Cases, Custom Working Directory, Customizing Rolldown Options, Format-Specific Options, Input Options, Output Options, Overview, Preserve Legal Comments (+7 more)

### Community 240 - "tsdown: publint & attw"
Cohesion: 0.12
Nodes (15): attw (Are the types wrong?), CI Integration, CLI, CLI, Configuration, Configuration, Enable, Enable (+7 more)

### Community 241 - "tsdown: CLI reference"
Cohesion: 0.13
Nodes (15): Assets, Basic Commands, Build, CLI Reference, `--copy <dir>`, Entry Points, `--exe`, Executable (+7 more)

### Community 242 - "ui-styling: config generator internals"
Cohesion: 0.11
Nodes (10): main(), Add custom font families. Args: fonts: Dict of font_type: [font_names] e.g.,…, Add custom spacing values. Args: spacing: Dict of name: value e.g., {'18':…, Add custom breakpoints. Args: breakpoints: Dict of name: width e.g., {'3xl':…, Add plugin requirements. Args: plugins: List of plugin names e.g.,…, Get plugin recommendations based on configuration. Returns: List of recommended…, Generate configuration file content. Returns: Configuration file as string, Write configuration to file. Returns: Tuple of (success, message) (+2 more)

### Community 243 - "Roadmap (docs/plan.md)"
Cohesion: 0.25
Nodes (8): Explicitly Deferred (post-v1, see PRD "Out of Scope"), Milestone 0 — Baseline (complete — exit criteria verified 2026-08-30), Milestone 1 — Real Data Layer, Milestone 2 — Public Booking Flow, Milestone 3 — Booking Availability, Milestone 4 — Admin Auth + Dashboard, Milestone 6 — Production Hardening, Roadmap

### Community 244 - "ui-ux-pro-max: domain detection"
Cohesion: 0.23
Nodes (3): detect_domain(), Auto-detect the most relevant domain from query. Matches are weighted by…, TestDomainDetection

### Community 245 - "vitest: CLI reference"
Cohesion: 0.13
Nodes (15): Command Line Interface, Commands, Common Options, Key Points, Package.json Scripts, Sharding for CI, `vitest`, `vitest bench` (+7 more)

### Community 246 - "vitest: lifecycle hooks"
Cohesion: 0.13
Nodes (14): Around Hooks, aroundAll, Basic Hooks, Cleanup Return Pattern, Concurrent Test Hooks, Extended Test Hooks, Hook Execution Order, Hook Timeout (+6 more)

### Community 247 - "vitest: snapshot testing"
Cohesion: 0.13
Nodes (15): Basic Snapshot, Concurrent Test Snapshots, Custom Serializers, Custom Snapshot Matchers (4.1+), Error Snapshots, File Snapshots, Inline Snapshots, Key Points (+7 more)

### Community 248 - "Domain: Appointment context"
Cohesion: 0.23
Nodes (15): Dashboard — appointment-management view filterable by Branch and Status, Deactivate — catalog action hiding a Service Package from the landing site, Fulfillable — an Appointment staff still need to act on, Add-on Service — optional paid extra (hairstyle, makeup) attached to an Appointment at booking, Appointment — customer's reserved time at a Branch for a Service Package, Attire — wardrobe context (Toga, Filipiniana, Executive, Uniform), stored atomically, Deactivated Service Package — hidden from landing and new bookings, existing Appointments stay valid, Frame — physical frame bundled with a Service Package, numbered per package (+7 more)

### Community 249 - "admin README: production build"
Cohesion: 0.13
Nodes (15): Adding A Route, Adding Links, API Routes, Building For Production, Data Fetching, Deploy to Cloudflare Workers, Linting & Formatting, Optional Configuration (+7 more)

### Community 250 - "Spec: delivery versions v1/v2"
Cohesion: 0.17
Nodes (11): Delivery Versions — v1 (Free Handover) / v2 (Paid Booking System) (spec), Further Notes, Handover Mechanics — #75 (facts from #69), Out of Scope, Problem Statement, The Artifact Mechanism — #70 (recorded as ADR-0015), The Booking-Off Direction (v1's transformed surfaces) — #72, The Editions (+3 more)

### Community 251 - "Progress log & DB topology ADRs"
Cohesion: 0.19
Nodes (15): Consequences, Database connection topology, ADR-0007: Database connection topology, Transaction Pooling Semantics, ADR-0011: Per-request database client, Alternatives Considered, Consequences, Context (+7 more)

### Community 252 - "Catalog docs: packages"
Cohesion: 0.13
Nodes (15): Basic Package (BP), Customize Package (CP-1), Customize Package (CP-2), Discounts & Promotions, Package A, Package B, Package C, Package D (+7 more)

### Community 253 - "Plan: M1.2 constraints"
Cohesion: 0.13
Nodes (14): Global Constraints, M1.2 — Catalog schema: lookups, inclusions, add-ons, Kind — Implementation Plan, Task 10: Generate and review the first migration, Task 11: ADR-0009 — normalized catalog lookups, Task 12: Full verification + handoff, Task 1: Zod — Print size + Attire lookups, and the types test harness, Task 2: Zod — the Inclusion union, Task 3: Zod — Add-on Service (+6 more)

### Community 254 - "ui-ux-pro-max: reasoning & data contracts"
Cohesion: 0.07
Nodes (20): DesignSystemGenerator, Generates design system recommendations from aggregated searches., Load reasoning rules from CSV., Find matching reasoning rule for a category., Apply reasoning rules to search results., apply_decision_rules(), _object_without_duplicates(), parse_decision_rules() (+12 more)

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
Cohesion: 0.22
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

### Community 264 - "tanstack-start rule: deploy adapters"
Cohesion: 0.14
Nodes (13): Adapter Comparison, Bad Example, Context, deploy-adapters: Choose Appropriate Deployment Adapter, Explanation, Good Example: AWS Lambda, Good Example: Bun Runtime, Good Example: Cloudflare Pages (+5 more)

### Community 265 - "tsdown: root directory"
Cohesion: 0.14
Nodes (14): Basic Usage, CLI, Common Patterns, Config File, Default, How It Works, Library with `src/` Prefix Preserved, Monorepo Package (+6 more)

### Community 266 - "ui-styling: shadcn installer core"
Cohesion: 0.14
Nodes (8): Handle shadcn/ui component installation., ShadcnInstaller, Test adding components that are already installed., Test initialization with default project root., Test initialization with custom project root., Test checking for non-existent shadcn config., Test getting installed components when none exist., Test getting installed components when files exist.

### Community 267 - "vitest: concurrency"
Cohesion: 0.14
Nodes (14): Bail on Failure, CI Example (GitHub Actions), Concurrency & Parallelism, Concurrent Tests, File Parallelism, Isolation, Key Points, Max Concurrency (+6 more)

### Community 268 - "ADR template & domain-docs guide"
Cohesion: 0.16
Nodes (14): ADR Supersession Lifecycle Rule, ADR-XXXX: <short, decision-oriented title>, Alternatives Considered, Consequences, Context, Decision, ADR Template, Before exploring, read these (+6 more)

### Community 269 - "ADRs: real-Postgres tests & vitest configs"
Cohesion: 0.16
Nodes (15): ADR-0003: Vitest 4 with a per-workspace config requirement, Alternatives Considered, Consequences, Context, Decision, ADR-0003: Vitest 4 per-workspace config requirement, Per-Workspace Vitest Config Requirement, passWithNoTests Silent-Green Trap (+7 more)

### Community 270 - "brand: update guide"
Cohesion: 0.15
Nodes (12): Color Presets, Examples, Files Modified, Important, Overview, Skills Used, Step 1: Gather Brand Input, Step 2: Update Brand Guidelines (+4 more)

### Community 271 - "design: logo design reference"
Cohesion: 0.15
Nodes (12): Available Styles, Color Psychology, Commands, Design Brief (Start Here), Detailed References, Generate Logo, Industry Defaults, Logo Design Reference (+4 more)

### Community 272 - "design-system: token architecture"
Cohesion: 0.15
Nodes (12): Categories, Dark Mode, File Organization, Layer 1: Primitive Tokens, Layer 2: Semantic Tokens, Layer 3: Component Tokens, Layer Overview, Migration from Flat Tokens (+4 more)

### Community 273 - "Design tokens template: primitives"
Cohesion: 0.15
Nodes (12): $type, $value, dark, semantic, primitive, $schema, $type, $value (+4 more)

### Community 274 - "pnpm skill: CLI, hooks, virtual store"
Cohesion: 0.15
Nodes (9): Git worktrees for multi-agent development, Global packages (v11 isolated installs), Global virtual store, Global Virtual Store, Git Worktrees & Global Packages, Key Points, Limitations, Best Practices, Core (+1 more)

### Community 275 - "tsdown: exe builds"
Cohesion: 0.15
Nodes (12): Advanced Configuration, Basic Usage, Behavior When Enabled, Caching, CLI, Cross-Platform Builds, Executable - `exe`, `ExeOptions` (+4 more)

### Community 276 - "vitest: projects"
Cohesion: 0.15
Nodes (13): Basic Projects Setup, Browser + Node Projects, Different Environments, Global Setup per Project, Key Points, Monorepo Pattern, Per-Project Pool & Isolation (v4), Project-Specific Dependencies (+5 more)

### Community 277 - "admin package.json scripts"
Cohesion: 0.15
Nodes (13): scripts, build, deploy, dev, fix, fix:unsafe, format, generate-routes (+5 more)

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

### Community 282 - "api-client tsconfig.json"
Cohesion: 0.15
Nodes (12): exclude, extends, include, *.config.ts, coverage, dist, node_modules, @sevendays/config/ts/node (+4 more)

### Community 283 - "DB: catalog seed scripts"
Cohesion: 0.13
Nodes (20): addonServiceSeeds, attireSeeds, branchSeeds, featuredPackageNames, inclusionSignatures(), PackageSeed, packageSeeds, printSizeSeeds (+12 more)

### Community 284 - "design-system: primitive tokens"
Cohesion: 0.17
Nodes (11): Border Radius, Color Scales, Gray Scale, Motion / Duration, Primary Colors (Blue), Primitive Tokens, Shadows, Spacing Scale (+3 more)

### Community 285 - "design-system: token validator"
Cohesion: 0.24
Nodes (11): extensions, formatReport(), fs, getFiles(), main(), parseArgs(), path, patterns (+3 more)

### Community 286 - "pnpm: .pnpmfile hooks"
Cohesion: 0.17
Nodes (12): afterAllResolved, beforePacking, Custom resolvers & fetchers (advanced), Finders (pnpm list / why), Hook reference, Hooks vs Overrides, Key Points, pnpm Hooks (.pnpmfile.mjs) (+4 more)

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

### Community 297 - "tanstack-start rule: prerendering & ISR"
Cohesion: 0.17
Nodes (11): Bad Example, Cache-Control Directives, Context, Explanation, Good Example: Dynamic Prerendering, Good Example: Hybrid Static/Dynamic, Good Example: ISR with Revalidation, Good Example: On-Demand Revalidation (+3 more)

### Community 298 - "tsdown: CI support"
Cohesion: 0.18
Nodes (10): CI-Aware Values, CI Environment Support, Config Function, Object Form, Overview, Related Options, String Form, Supported Options (+2 more)

### Community 299 - "tsdown: CJS default export"
Cohesion: 0.17
Nodes (12): Basic Usage, CJS Default Export, Disabled, Enabled (Default), How It Works, Overview, Related Options, Tips (+4 more)

### Community 300 - "tsdown: log level"
Cohesion: 0.17
Nodes (12): Available Levels, Basic Usage, CI/CD Pipeline, CLI, Common Patterns, Config File, Fail on Warnings, Log Level (+4 more)

### Community 301 - "ui-styling: tailwind config gen tests"
Cohesion: 0.20
Nodes (8): Tests for tailwind_config_gen.py, Reduce a generated TS/JS config to a bare assignable object so it can be handed…, Regression guard for the missing-comma bug between the ``theme`` block and…, The property preceding ``plugins`` must end with a comma (pure-Python check, so…, The emitted config parses as valid JS via ``node --check``., _strip_to_object(), TestGeneratedConfigIsValidJs, parametrize

### Community 302 - "ui-styling: JS config generation"
Cohesion: 0.29
Nodes (4): Generate TypeScript configuration., Generate JavaScript configuration., Format plugins array for config. Validates each plugin name against a strict…, Add indentation to JSON string.

### Community 303 - "Plan: M2 E2E verification facts"
Cohesion: 0.18
Nodes (10): Global Constraints, M2 Close-out — end-to-end verification + docs (#48) Implementation Plan, Self-Review (against issue #48 + the M2 spec), Task 1: Extend the verification harness (recipient email + notes + id tail; new Resend evidence script), Task 2: The live end-to-end gate (bookings + DB confirm + email evidence), Task 3: ADR-0013 — the generalized-appointment model, Task 4: ADR-0014 — the email send topology, Task 5: Docs close-out — progress.md refresh + the last plan.md tick (+2 more)

### Community 304 - "Plan: M1.5 file structure"
Cohesion: 0.17
Nodes (11): File Structure, Global Constraints, M1.5 — M1 Exit Verification + Close-Out Implementation Plan, Self-Review, Task 1: Probe script — `verify-appointment-row.mjs` (TDD, unit + compose), Task 2: Rehearsal on compose — prove the probe before it touches the live DB, Task 3: Pre-flight audit + Act 1 — create the Appointment via the deployed API, Task 4: Act 2 — confirm the row in Postgres (probe against live) (+3 more)

### Community 305 - "DB schema: relations & appointments"
Cohesion: 0.15
Nodes (18): addonServices, appointmentAddonServices, appointmentKindEnum, appointments, appointmentStatusEnum, branchStudioServices, branches, TODO: BetterAuth tables (users, sessions, accounts) will be generated via (+10 more)

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
Cohesion: 0.20
Nodes (9): args, extractTokens(), fs, minimal, MINIMAL_TOKENS, path, projectRoot, tokensPath (+1 more)

### Community 310 - "pnpm: configuration"
Cohesion: 0.18
Nodes (10): Environment variables, Global configuration (config.yaml), Key Points, Notable settings that changed names, .npmrc — authentication only, Package Manager / Runtime pinning (package.json), Per-project settings in a workspace (packageConfigs), pnpm Configuration (+2 more)

### Community 311 - "pnpm: catalogs"
Cohesion: 0.18
Nodes (10): Basic Usage, Benefits, Best Practices, Catalog vs Overrides, Keeping overrides in sync with a catalog, Migration from Overrides, Named Catalogs, pnpm Catalogs (+2 more)

### Community 312 - "pnpm: supply-chain security"
Cohesion: 0.18
Nodes (10): Approving builds, Block exotic transitive sources, Build-script approval (allowBuilds), Escape hatch (dangerous), Key Points, Lockfile integrity, Minimum release age, pnpm Supply-Chain Security (+2 more)

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

### Community 317 - "tanstack-router rule: not-found routes"
Cohesion: 0.18
Nodes (10): Bad Example, Context, err-not-found: Handle Not-Found Routes Properly, Explanation, Good Example: Catch-All Route, Good Example: Nested Not Found Bubbling, Good Example: Not Found with Data, Good Example: Root-Level Not Found (+2 more)

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

### Community 323 - "tanstack-start rule: server errors"
Cohesion: 0.18
Nodes (10): Bad Example, Context, err-server-errors: Handle Server Function Errors, Error Response Best Practices, Explanation, Good Example: Client-Side Error Handling, Good Example: Server Function with Error Handling, Good Example: Structured Error Handling (+2 more)

### Community 324 - "tanstack-start rule: request middleware"
Cohesion: 0.18
Nodes (10): Bad Example, Context, Explanation, Good Example: Authentication Middleware, Good Example: Global Middleware Configuration, Good Example: Logging Middleware, Good Example: Rate Limiting Middleware, Middleware Execution Order (+2 more)

### Community 325 - "tanstack-start rule: streaming SSR"
Cohesion: 0.18
Nodes (10): Bad Example, Context, Explanation, Good Example: Error Boundaries with Streaming, Good Example: Nested Suspense Boundaries, Good Example: Progressive Enhancement, Good Example: Stream Non-Critical Content, Priority: MEDIUM (+2 more)

### Community 326 - "tsdown CLI: usage patterns"
Cohesion: 0.18
Nodes (11): Basic Build, Browser Bundle (IIFE), Common Usage Patterns, Copy Assets, Development (Watch), Library (ESM + CJS + Types), Monorepo Package, Node.js CLI Tool (+3 more)

### Community 327 - "ui-styling: shadcn test fixtures"
Cohesion: 0.18
Nodes (6): Test adding components with overwrite flag., Test successful component addition., Test component addition with subprocess error., Test component addition when npx is not found., Test successful addition of all components., patch

### Community 328 - "Plan: row shaping file structure"
Cohesion: 0.18
Nodes (10): Catalog Row-Shaping Module — Implementation Plan, File Structure, Global Constraints, Task 0: Branch and environment bootstrap, Task 1: The row-shaping builders (TDD) + opt-in subpath export, Task 2: Derive the truncate table list from the exported schema, Task 3: Adopt the builders in the API test fixtures, Task 4: Adopt the builders in the seeder (+2 more)

### Community 329 - "brand skill overview"
Cohesion: 0.20
Nodes (9): Brand, Brand Sync Workflow, Quick Start, References, Routing, Scripts, Subcommands, Templates (+1 more)

### Community 330 - "design: slide strategies"
Cohesion: 0.20
Nodes (9): Common Structures, Duarte Sparkline Pattern, Matching Strategy to Context, Product Demo (6 slides), Sales Pitch (9 slides), Search Commands, Slide Strategies, Strategy Selection (+1 more)

### Community 331 - "design: logo generator"
Cohesion: 0.29
Nodes (9): enhance_prompt(), generate_batch(), generate_logo(), load_env(), main(), Enhance the logo prompt with style and industry modifiers, Generate a logo using Gemini models with image generation Args: aspect_ratio:…, Generate multiple logo variants with different styles (+1 more)

### Community 332 - "design-system: component tokens"
Cohesion: 0.20
Nodes (9): Alert Tokens, Badge Tokens, Button Tokens, Card Tokens, Component Tokens, Dialog/Modal Tokens, Input Tokens, Table Tokens (+1 more)

### Community 333 - "design-system: token generator"
Cohesion: 0.36
Nodes (9): flattenTokens(), fs, generateCSS(), generateTailwind(), main(), parseArgs(), path, resolveReference() (+1 more)

### Community 334 - "Design tokens template: duration scale"
Cohesion: 0.20
Nodes (10): fast, normal, slow, $type, $value, $type, $value, duration (+2 more)

### Community 335 - "pnpm: config dependencies"
Cohesion: 0.20
Nodes (9): Auto-loaded plugins, Constraints, Declaring config dependencies, Import hook logic from a shared package, Key Points, pnpm Config Dependencies, Share patch files, Share settings & catalogs via updateConfig (+1 more)

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

### Community 353 - "ui-styling: base config internals"
Cohesion: 0.22
Nodes (6): Path, Initialize generator. Args: typescript: If True, generate .ts config, else .js…, Determine default output path., Create base configuration structure., Get default content paths for framework., Any

### Community 354 - "ui-ux-pro-max: text layout tests"
Cohesion: 0.22
Nodes (3): read_rows(), TestTextLayoutDataContracts, TestTextLayoutRetrieval

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
Cohesion: 0.13
Nodes (14): Conflict policy on transformed surfaces, Content pass — what never enters `v1` even on a v1-path, Executing a PICK, Executing a SPLIT, Fallback — the squashed snapshot, Ledger, Path pass — `scripts/v1-triage.mjs`, The locks — after every push (+6 more)

### Community 359 - "Product requirements doc"
Cohesion: 0.20
Nodes (10): Admin site (`apps/admin`), Landing site (`apps/landing`), Out of Scope for V1 (future), Problem, Product Requirements — Sevendays, Shared / platform, Success Criteria, User Stories (+2 more)

### Community 360 - "Spec: acquisition/error seam"
Cohesion: 0.24
Nodes (10): One Acquisition/Error Seam for the API (Candidate D), Per-Request DB Acquisition Middleware (c.set), ADR-0006 M2 route restructure (app type + env), ADR-0008 Integration Tests vs Real Postgres, ADR-0010 versioned subapp mount, ADR-0011 Per-Request DB Client, db-free /health endpoint, Deep-module deletion test (reference) (+2 more)

### Community 361 - "Plan: M1.1 constraints"
Cohesion: 0.20
Nodes (9): Global Constraints, M1.1 — Pre-flight Implementation Plan, Task 1: CI workflow, Task 2: Env examples + gitignore the Worker secrets file, Task 3: Turbo passthrough swap, Task 4: Manifest aligns (lucide-react, @types/node), Task 5: ADR-0007 — database connection topology, Task 6: Rewrite the `docs/plan.md` Milestone 1 checklist (+1 more)

### Community 362 - "Plan: frame grouping & attire"
Cohesion: 0.20
Nodes (9): File Structure, Frame Grouping & Attire Normalization — Implementation Plan, Global Constraints, Self-Review, Task 1: Zod — frames schemas + inclusion reshape (TDD), Task 2: Drizzle — frames + junction, migration 0001, live apply, Task 3: Seed — catalog restructure + frames/junction seeding, Task 4: Verify — frames + attire-aware read-back (+1 more)

### Community 363 - "Plan: error seam file structure"
Cohesion: 0.20
Nodes (9): Acquisition / Error Seam — Implementation Plan, File Structure, Global Constraints, Self-Review, Task 0: Branch and environment bootstrap, Task 1: The error envelope — root `onError` + `notFound`, and the uniform 404 (route layer unchanged), Task 2: Acquisition middleware + route delegation — close "log-before-500" fully, Task 3: ADR-0011 amendment + ledger + issue evidence (+1 more)

### Community 364 - "Plan: M2 preflight-5 facts"
Cohesion: 0.20
Nodes (9): Global Constraints, M2 Pre-flight 5/5 — Close-out: end-to-end verification + roadmap ticks (#25) Implementation Plan, Self-Review (against issue #25 + spec), Task 1: Fold in the carried-forward deferred minors, Task 2: Consolidated end-to-end re-verification pass (landing + admin), Task 3: Full gates + progress.md refresh, Task 4: Tick the `docs/plan.md` M2 pre-flight checkboxes (`- [✅]` + dated), Task 5: graphify update + final commit (GitGraph current) (+1 more)

### Community 365 - "brand: tokens sync script"
Cohesion: 0.33
Nodes (8): adjustBrightness(), { execFileSync }, extractColorsFromMarkdown(), fs, generateColorScale(), main(), path, updateDesignTokens()

### Community 366 - "design-system: token validator tests"
Cohesion: 0.28
Nodes (8): Path, Regression tests for validate-tokens.cjs. The validator used to skip any line…, A hardcoded hex on the same line as a var() token is still a violation., A line that references only tokens produces no false positives., _run(), test_flags_hardcoded_hex_sharing_line_with_token(), test_token_only_line_reports_no_violation(), CompletedProcess

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

### Community 373 - "tsdown: skills README"
Cohesion: 0.22
Nodes (8): Documentation, Example Prompts, Installation, License, Related Skills, tsdown Skills, Usage, What's Included

### Community 374 - "Plan: #57 brand token unification"
Cohesion: 0.25
Nodes (7): Brand → shadcn Token Unification Prototype (wayfinder #57) Implementation Plan, Global Constraints, Self-Review, Task 1: Apply the owner's shadcn preset to landing, Task 2: Lift the token layer into packages/ui as the single shared source, Task 3: Throwaway showcase route /prototype-tokens, Task 4: Full check, push, and ticket handover

### Community 375 - "vitest: configuration"
Cohesion: 0.22
Nodes (9): Basic Setup, Common Options, Conditional Configuration, Configuration, Key Points, Merging Configs, Projects (Monorepos), Using with Existing Vite Config (+1 more)

### Community 376 - "vitest: reporters"
Cohesion: 0.22
Nodes (8): Blob & Merge (CI/sharding), Built-in Reporters, Default Selection, HTML Report (v5 paths), JUnit Templating, Key Points, Output Files, Reporters

### Community 377 - "API tests: appointments"
Cohesion: 0.31
Nodes (8): createViaApi(), db, fakeExecCtx(), FUTURE_ISO(), futureDate(), payload(), { sendMock }, url

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

### Community 386 - "Plan: read-stitch file structure"
Cohesion: 0.22
Nodes (8): Extract the Read-Stitch Module — Implementation Plan, File Structure, Global Constraints, Self-Review (recorded at plan-writing time), Task 0: Branch and environment bootstrap, Task 1: The `groupChildren` module (TDD), Task 2: Adopt at both call sites (one commit — spec ruling), Task 3: Docs, issue evidence, full gate

### Community 387 - "Plan: M2 preflight-2 constraints"
Cohesion: 0.22
Nodes (8): Global Constraints, M2 Pre-flight 2/5 — Shared API client over Hono RPC (#22) Implementation Plan, Self-Review, Task 1: Chain the API so `AppType` carries its route schema (+ validator split), Task 2: Package scaffold + client core (createApiClient, unwrap, ApiClientError), Task 3: Route wrappers + Seam 1 loopback suite (mock API, injectable fetch), Task 4: Full gates, docs, ticket close-out, Verified pre-plan facts (probed against the real toolchain 2026-09-04)

### Community 388 - "Plan: M2 preflight-3 constraints"
Cohesion: 0.22
Nodes (8): Global Constraints, M2 Pre-flight 3/5 — Landing: TanStack Query SSR wiring + API_URL + sample branches call (#23) Implementation Plan, Self-Review (done pre-flight, 2026-09-05), Task 1: Deps + server-side API_URL seam + data layer, Task 2: Query SSR wiring + sample branches call, Task 3: End-to-end verification (dev + loud-fail + prod-shaped workerd + leak scan), Task 4: Full gates + docs cross-linking, Verified pre-plan facts (probed against the real toolchain 2026-09-05)

### Community 389 - "Plan: M2 preflight-4 facts"
Cohesion: 0.22
Nodes (8): Global Constraints, M2 Pre-flight 4/5 — Admin: TanStack Query SSR wiring + API_URL + sample branches call (#24) Implementation Plan, Self-Review (done pre-flight, 2026-09-05), Task 1: Deps + server-side API_URL seam + data layer, Task 2: Query SSR wiring + sample branches call, Task 3: End-to-end verification (dev + loud-fail + prod-shaped workerd + leak scan), Task 4: Full gates + docs cross-linking, Verified pre-plan facts (probed against the real toolchain 2026-09-05)

### Community 390 - "@sevendays/db overview refs"
Cohesion: 0.32
Nodes (8): @sevendays/db — Drizzle schema + client (live Supabase, migrations 0000+0001 applied, catalog seeded), @sevendays/types — Zod schemas + inferred types, shared across all apps, db:generate then db:migrate for schema changes, Database access goes through packages/db, Validate all external input with Zod, db service — postgres:17, POSTGRES_DB sevendays_test, port 5432, pg_isready healthcheck, @sevendays/types (Zod) + @sevendays/db (Drizzle) define the shared entities, postgres service — postgres:17, POSTGRES_DB sevendays_test, port 5432, TEST_DATABASE_URL

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

### Community 396 - "API: appointments route errors/validation"
Cohesion: 0.31
Nodes (7): ADR-0006, badRequest(), internalError(), notFound(), validatedJson(), validatedParam(), validatedQuery()

### Community 397 - "Progress log hub"
Cohesion: 0.25
Nodes (8): Current Milestone: 1 — Real Data Layer (complete — exit criteria verified live 2026-09-02; next up: Milestone 2 pre-flight, issue #1), Gate status (all verified live on 2026-08-30), Immediate Next Steps (in order), Known Gaps / Not Yet Done, Milestone 1 gate (verified live 2026-09-02 on feat/m1.5-exit-verification), Notes for Future Sessions, Progress, What Exists

### Community 398 - "Plan: M2 preflight-1 constraints"
Cohesion: 0.25
Nodes (7): Global Constraints, M2 Pre-flight 1/5 — API restructure: AppType export + Zod-validated Env (#21) Implementation Plan, Self-Review, Task 1: Zod-validated env — schema + tests (TDD), Task 2: Root app adopts the explicit Env, Task 3: Export AppType via a types-only subpath export, Task 4: Verification + ticket close-out

### Community 399 - "Landing: queries & API functions"
Cohesion: 0.19
Nodes (12): getAddonServices, getAppointment, getBranches, getServicePackageBySlug, getServicePackages, getStudioServices, getApiClient(), getApiUrl() (+4 more)

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

### Community 405 - "tsdown: introduction"
Cohesion: 0.29
Nodes (7): Introduction, Key Differences from Rolldown, Plugin Ecosystem, Prior Arts, Related, What Can It Bundle?, Why tsdown?

### Community 406 - "tsdown: Svelte support"
Cohesion: 0.29
Nodes (7): Configuration, Dependencies, Distribution Strategy, Key Points, Quick Start, Related, Svelte Support

### Community 407 - "vitest: benchmarking"
Cohesion: 0.29
Nodes (7): Benchmarking (v5), Comparing Implementations, Defining & Running, Key Points, Stability Notes, Storing & Replaying Baselines, v5 Migration

### Community 408 - "vitest: test tags"
Cohesion: 0.29
Nodes (7): Applying Tags, Checking the Filter at Runtime, Defining Tags, Filtering by Tag, Key Points, Option conflict resolution, Test Tags (4.1+)

### Community 409 - "Spec: booking flow decisions"
Cohesion: 0.12
Nodes (15): API surface (`/api/v1`, thin routes over service modules), Booking form (prototype variant C rulings, ticket #33), Confirmation email (content per ticket #34, mechanics per ticket #36), Confirmation read-back (`/booking/:id`), Further Notes, Implementation Decisions, Information architecture (ticket #32), Milestone 2 — Public Booking Flow (spec) (+7 more)

### Community 410 - "slides skill overview"
Cohesion: 0.33
Nodes (5): References (Knowledge Base), Routing, Slides, Subcommands, When to Use

### Community 411 - "tsdown: Solid support"
Cohesion: 0.33
Nodes (6): Configuration, Dependencies, Key Points, Quick Start, Related, Solid Support

### Community 412 - "tsdown CLI: build options"
Cohesion: 0.33
Nodes (6): Build Options, `--minify`, `--platform <platform>`, `--sourcemap`, `--target <target>`, `--treeshake`

### Community 413 - "tsdown CLI: monorepo"
Cohesion: 0.33
Nodes (6): `--fail-on-warn`, `--filter, -F <pattern>`, `--root <dir>`, `--unbundle`, Workspace / Monorepo, `--workspace, -W [dir]`

### Community 414 - "Landing: booking read flow & summary"
Cohesion: 0.13
Nodes (17): SummaryRail(), ServiceCard(), ServiceTeaserItem(), branchNameFor(), confirmationTotalCents(), offeringNameFor(), ReadCatalog, B1 (+9 more)

### Community 415 - "API: confirmation email builder"
Cohesion: 0.19
Nodes (13): buildConfirmationEmail(), ConfirmationEmail, ConfirmationEmailInput, ConfirmationEmailScheduler, EMAIL_FROM, escapeHtml(), PH_DATE_TIME, phDateTime() (+5 more)

### Community 416 - "Plan: M2-01 studio services catalog"
Cohesion: 0.20
Nodes (9): File Structure, Global Constraints, M2 Ticket 01 — Studio Services Catalog + Package Slug/Featured — Implementation Plan, Task 1: Drizzle — studio_services + junctions + package slug/is_featured (migration 0002), Task 2: Seed — slugifyName (TDD), studio-service seeds, seed extensions (live ×2), Task 3: verify-seed extensions (live VERIFY PASSED), Task 4: Slug NOT NULL flip (migration 0003) + fixture blast radius + suites green, Task 5: packages/types — slug/isFeatured + StudioService mirror (TDD) (+1 more)

### Community 417 - "brand: guideline template"
Cohesion: 0.40
Nodes (4): Brand Guidelines Template, Document Structure, Extractable Fields, Usage

### Community 418 - "tsdown CLI: package management"
Cohesion: 0.40
Nodes (5): `--attw`, `--exports`, Package Management, `--publint`, `--unused`

### Community 419 - "tsdown CLI: output options"
Cohesion: 0.40
Nodes (5): `--clean`, `--dts`, `--format <format>`, `--out-dir, -d <dir>`, Output Options

### Community 420 - "tsdown CLI: configuration"
Cohesion: 0.40
Nodes (5): `--config, -c <filename>`, `--config-loader <loader>`, Configuration, `--no-config`, `--tsconfig <file>`

### Community 421 - "admin package.json hub"
Cohesion: 0.40
Nodes (4): imports, name, private, type

### Community 422 - "landing package.json hub"
Cohesion: 0.40
Nodes (4): imports, name, private, type

### Community 423 - "api-client biome.json"
Cohesion: 0.40
Nodes (4): extends, @sevendays/config/biome/base, @sevendays/config/biome/node, root

### Community 424 - "Plan: M2-02 appointment model"
Cohesion: 0.20
Nodes (9): File Structure, Global Constraints, M2 Ticket 02 — Generalize the Appointment Model (schema, Zod, call sites) — Implementation Plan, Self-Review (executed at plan-writing time — re-run after any edit), Task 1: packages/types — generalized appointment schemas (TDD), Task 2: Drizzle — nullable refs + exactly-one CHECK + rename (migration 0004), Task 3: apps/api — intake module + fixtures + integration suite on the renamed shape, Task 4: api-client + M1.5 probe tooling — rename and nullable package ref (+1 more)

### Community 425 - "Plan: M2-04 read endpoints"
Cohesion: 0.20
Nodes (9): File Structure, Global Constraints, M2 Ticket 04 — Three Read Endpoints + Client Wrappers — Implementation Plan, Self-Review (executed at plan-writing time — re-run after any edit), Task 1: packages/types — the Studio Service read shape (TDD), Task 2: apps/api — by-slug + single-get reads, validatedParam, uniform 404 (TDD), Task 3: apps/api — studio-services read (service, route, fixtures, suite) (TDD), Task 4: packages/api-client — the three wrappers + mock endpoints + loopback tests (TDD) (+1 more)

### Community 426 - "tsdown CLI: logging"
Cohesion: 0.50
Nodes (4): `--debug [feat]`, `--log-level <level>`, Logging, `--report` / `--no-report`

### Community 427 - "tsdown CLI: dependencies"
Cohesion: 0.50
Nodes (4): Dependencies, `--deps.never-bundle <module>`, `--deps.skip-node-modules-bundle`, `--shims`

### Community 428 - "tsdown CLI: development"
Cohesion: 0.50
Nodes (4): Development, `--ignore-watch <path>`, `--on-success <command>`, `--watch, -w [path]`

### Community 429 - "tsdown CLI: env vars"
Cohesion: 0.50
Nodes (4): `--env-file <file>`, `--env-prefix <prefix>`, `--env.* <value>`, Environment Variables

### Community 430 - "landing README: production build"
Cohesion: 0.14
Nodes (14): Adding A Route, Adding Links, API Routes, Building For Production, Data Fetching, Deploy to Cloudflare Workers, Linting & Formatting, Optional Configuration (+6 more)

### Community 433 - "Landing: services page & bookable branches"
Cohesion: 0.21
Nodes (7): bookableBranchNames(), BRANCHES, CALAMBA, DIPOLOG, ILIGAN, studioServiceQueries, ServicesPage()

### Community 434 - "Shared studio-service schemas (types)"
Cohesion: 0.31
Nodes (7): CreateStudioServiceInput, createStudioServiceSchema, StudioService, studioServiceSchema, StudioServiceWithBranches, studioServiceWithBranchesSchema, fullRow

### Community 436 - "DB schema: inclusion attires"
Cohesion: 0.33
Nodes (5): attires, ADR-0009, packageInclusionAttires, ADR-0009, packageInclusions

### Community 442 - "Plan: M2-05 packages pages"
Cohesion: 0.17
Nodes (11): Acceptance criteria mapping (for the PR description), File Structure, Global Constraints, M2 Ticket 05 — Landing Packages Pages — Implementation Plan, Task 1: Land the glossary branch content (doc duty — spec precondition), Task 2: Landing data layer — server functions, query factories, `peso` (TDD), Task 3: Shared page components (presentational), Task 4: Home — hero, Book-now CTA, featured strip with fallback (TDD) (+3 more)

### Community 444 - "Landing: home & packages pages"
Cohesion: 0.10
Nodes (13): BranchCard(), BranchStripItem(), CoverPanel(), InclusionsList(), ADR-0009, PackageCard(), SiteHeader(), WalkInBadge() (+5 more)

### Community 445 - "Plan: M2-06 content pages"
Cohesion: 0.18
Nodes (10): Acceptance criteria mapping (for the PR description), File Structure, Global Constraints, M2 Ticket 06 — Landing Content Pages — Implementation Plan, Task 1: Data layer — studio-services server fn, query factory, bookable-branch names (TDD), Task 2: Shared page components (presentational), Task 3: Home — services teaser strip, branches strip, credibility blurb, Task 4: `/services`, `/branches`, `/about` routes (+2 more)

### Community 458 - "ADR-0012: exactly-one booked offering"
Cohesion: 0.33
Nodes (5): ADR-0012: Exactly-one booked offering, enforced on both sides, Alternatives Considered, Consequences, Context, Decision

### Community 461 - "Biome base: performance"
Cohesion: 0.33
Nodes (6): project, qwik, solid, linter, domains, enabled

### Community 462 - "primary-foreground"
Cohesion: 0.67
Nodes (3): primary-foreground, $type, $value

### Community 463 - "ring"
Cohesion: 0.67
Nodes (3): ring, $type, $value

### Community 470 - "landing dep: @tanstack/react-router"
Cohesion: 0.18
Nodes (10): Acceptance criteria mapping (for the PR description), File Structure, Global Constraints, M2 Ticket 07 — Booking Wizard `/book` (prototype variant C) — Implementation Plan, Task 1: Applicability on the studio-services read (types + API, TDD), Task 2: Landing data layer — addon-services + appointment server fns, `phDateTime`, Task 3: The pure booking lib (state machine, rejections, PHT math — TDD), Task 4: `/book` route — variant C wizard, rail, rejection card, typed-Link sweep (+2 more)

### Community 472 - "Plan: M2-08 booking confirmation"
Cohesion: 0.22
Nodes (8): File Structure, Global Constraints, M2 Ticket 08 — Confirmation read-back `/booking/:id` — Implementation Plan, Task 1: Data layer — `getAppointment` server fn, `appointmentQueries.byId`, shared 404 seam (TDD), Task 2: The pure read-back lib — snapshot total + name joins (TDD), Task 3: `/booking/$id` route + typed-navigation convert, Task 4: CDP harness — wizard unknown-id check + e2e read-back assertions, Task 5: Docs — tick the checkbox, log the landing

### Community 474 - "Plan: M2-09 confirmation email"
Cohesion: 0.25
Nodes (7): File Structure, Global Constraints, M2 Ticket 09 — Confirmation email: builder + Resend send-after-commit — Implementation Plan, Task 1: Env — required `RESEND_API_KEY` + `LANDING_ORIGIN`, test-env conversion (TDD), Task 2: The pure builder — money-free HTML, pinned copy (TDD), Task 3: Send + schedule + route wiring — the email leaves inside `waitUntil` (TDD), Task 4: Docs — tick the checkbox, log the landing

### Community 475 - "Verify script: confirmation emails"
Cohesion: 0.29
Nodes (8): check(), LANDING_ORIGIN, listEmails(), main(), PH_DATE_TIME, [pkgId, svcId], resend(), results

### Community 478 - "App READMEs (admin & landing)"
Cohesion: 0.33
Nodes (4): Getting Started, Learn More, Getting Started, Learn More

### Community 479 - "ADR-0013: one appointments table"
Cohesion: 0.33
Nodes (5): ADR-0013: One appointments table, nullable offering refs, booked-price snapshots, Alternatives Considered, Consequences, Context, Decision

### Community 480 - "turbo.json typecheck task"
Cohesion: 0.40
Nodes (5): ^build, dependsOn, typecheck, dependsOn, inputs

### Community 481 - "ADR-0014: email send topology"
Cohesion: 0.33
Nodes (5): ADR-0014: Confirmation email — sent after the DB commit via waitUntil, deduped by idempotency key, Alternatives Considered, Consequences, Context, Decision

### Community 482 - "Plan: #80 seed v1 branch"
Cohesion: 0.15
Nodes (12): File Structure, Global Constraints, Seed the v1 branch — the one filter-repo pass (booking-free artifact line) (#80) Implementation Plan, Task 1: Re-derive the audit's two false-positive tokens (AC 1's verdict, landed on main), Task 2: Author the seed ruleset — the record (landed on main), Task 3: The dry-run rewrite — filter the clone and prove the lineage (loop until clean), Task 4: The seed content commit, part 1 — the code (typed cascade + booking-off surfaces), Task 5: The seed content commit, part 2 — client-safe docs + AGENTS.md, then the one commit (+4 more)

### Community 483 - "API: appointments service & DB client"
Cohesion: 0.21
Nodes (13): appointmentProjection, createAppointment(), CreateAppointmentResult, CreateReason, fail(), fetchAddonEntries(), getAppointmentWithAddons(), listAppointments() (+5 more)

### Community 484 - "Plan: M2-03 service path intake"
Cohesion: 0.29
Nodes (6): File Structure, Global Constraints, M2 Ticket 03 — Service-Path Intake + Typed Rejections + `past_datetime` Floor — Implementation Plan, Task 1: Service-path intake + matrix + floor, with full test coverage (TDD), Task 2: Regression sweep + full gate (no new code), Task 3: Close-out — docs, checkboxes, graphify, handoff

### Community 486 - "Plan: edition-aware pipelines facts"
Cohesion: 0.18
Nodes (10): Edition-aware pipelines — teaser live on main, v1 private-deploy leg dormant (#79) Implementation Plan, Global Constraints, Self-Review (against issue #79 + ADR-0015), Task 1: Generalize the CI triggers past `main`, Task 2: The branch-keyed continuous deploy legs, Task 3: GitHub environments `teaser` + `v1`, and their `API_URL` variables, Task 4: Owner secret gates (STOP steps — the executor never touches a secret value), Task 5: PR → CI green → the real merge reaching the teaser live (+2 more)

### Community 487 - "ADR-0015: two-edition mechanism"
Cohesion: 0.33
Nodes (5): ADR-0015: Two-edition delivery — one filter-repo seed plus cherry-pick maintenance, Alternatives Considered, Consequences, Context, Decision

### Community 493 - "v1 export audit script"
Cohesion: 0.31
Nodes (10): argv, audit(), failUsage(), git(), makeFixture(), ADR-0015, runGit(), selfTest() (+2 more)

### Community 498 - "Plan: #78 export audit file structure"
Cohesion: 0.22
Nodes (8): Export audit script — `git log -S`/`-G` sweeps keyed to the absence inventory (#78) Implementation Plan, File Structure, Global Constraints, Task 1: The instrument — token inventory, sweeper, CLI, detection proof, Task 2: The proofs — self-test, sabotage torture, `--repo` clone sweep, Task 3: Consumer documentation — plan.md pointer + progress.md record (incl. the #80 flags), Task 4: graphify, final gates, handoff, Verified pre-plan facts (probed against the real workspace 2026-09-11)

### Community 503 - "Plan: #82 pick discipline"
Cohesion: 0.18
Nodes (10): #82 — Pick Discipline Stood Up: Runbook + First Real Picks — Implementation Plan, File Structure, Global Constraints, Task 1: Pre-flight — SHAs, the `v1` checkout, the backlog, the branches, Task 2: The classifier, the runbook, the `AGENTS.md` pointer (PR B's first commit), Task 3: Backlog triage + the booking worked example (ledger rows), Task 4: The split drill — a synthetic mixed commit, split per the runbook (local only), Task 5: PR A — per-route page titles on the five shared landing routes (the pick source) (+2 more)

### Community 504 - "ADR-0016: service binding"
Cohesion: 0.33
Nodes (5): ADR-0016: Frontends call the API through a service binding in deployed environments, Alternatives Considered, Consequences, Context, Decision

### Community 509 - "Design tokens template: sm breakpoint"
Cohesion: 0.60
Nodes (5): sm, sm, sm, $type, $value

### Community 511 - "Design tokens template: xl breakpoint"
Cohesion: 0.67
Nodes (4): xl, xl, $type, $value

### Community 519 - "v1 triage classifier script"
Cohesion: 0.46
Nodes (7): CLUSTER, failUsage(), git(), isMainOnly(), loadMainOnlyPrefixes(), main(), ADR-0015

## Ambiguous Edges - Review These
- `Shadcn` → `minimumReleaseAgeExclude: lucide-react@1.37.0`  [AMBIGUOUS]
  pnpm-workspace.yaml · relation: conceptually_related_to
- `@sevendays/admin — internal dashboard for content + appointments (TanStack Start)` → `PostHog analytics via VITE_POSTHOG_KEY / VITE_POSTHOG_HOST`  [AMBIGUOUS]
  apps/landing/README.md · relation: conceptually_related_to
- `Attire Junction (package_inclusion_attires)` → `Catalog Attires & Universal Privileges`  [AMBIGUOUS]
  docs/adr/0009-normalized-catalog-lookups.md · relation: conceptually_related_to

## Knowledge Gaps
- **4040 isolated node(s):** `fs`, `path`, `fs`, `path`, `fs` (+4035 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **67 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Shadcn` and `minimumReleaseAgeExclude: lucide-react@1.37.0`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `@sevendays/admin — internal dashboard for content + appointments (TanStack Start)` and `PostHog analytics via VITE_POSTHOG_KEY / VITE_POSTHOG_HOST`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Attire Junction (package_inclusion_attires)` and `Catalog Attires & Universal Privileges`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Tree Shaking` connect `tsdown: tree shaking` to `tsdown skill: entry, dts, format, target`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `Dependencies` connect `tsdown: dependencies` to `tsdown skill: entry, dts, format, target`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `search()` connect `ui-ux-pro-max: search & taxonomy tests` to `ui-ux-pro-max: text layout tests`, `ui-ux-pro-max: BM25 search core`, `ui-ux-pro-max: design system generator`, `ui-ux-pro-max: generator tests`, `ui-ux-pro-max: palette selection`, `ui-ux-pro-max: core engine`, `ui-ux-pro-max: domain detection`, `ui-ux-pro-max: data validation & tests`, `ui-ux-pro-max: stack search & freshness`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `TailwindConfigGenerator` (e.g. with `TestGeneratedConfigIsValidJs` and `TestTailwindConfigGenerator`) actually correct?**
  _`TailwindConfigGenerator` has 2 INFERRED edges - model-reasoned connections that need verification._