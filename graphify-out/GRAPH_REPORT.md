# Graph Report - .  (2026-09-02)

## Corpus Check
- 189 files · ~379,671 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1405 nodes · 1705 edges · 108 communities (88 shown, 20 thin omitted)
- Extraction: 95% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 75 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Tooling ADRs (Biome + TS pin)
- DB Seeds & Catalog Data
- Workspace Packages (3 apps + 4 pkgs)
- packages/db deps (drizzle)
- Landing/Admin Vite+TanStack deps
- Landing/Admin Vite+TanStack deps
- API Acquisition & Error Seam ADRs
- API deps (hono + zod)
- PostHog Provider Integration
- Shared React/UI deps
- Shared React/UI deps
- API Appointments Route+Index
- packages/config package.json
- packages/config tsconfig deps
- packages/types package.json
- API Env & Route Handlers
- PostHog Provider Integration
- Appointment Domain Schema (types)
- tsconfig.base
- shadcn components.json
- shadcn components.json
- tsconfig.build
- tsconfig.json (app)
- tsconfig.build
- tsconfig.json (app)
- docs/specs
- packages/db
- packages/types
- packages/ui
- packages/config
- packages/config
- apps/api
- packages/config
- docs/specs
- packages/db
- packages/types
- turbo.json
- packages/config
- apps/admin
- apps/landing
- docs/superpowers
- turbo.json
- docs/superpowers
- docs/superpowers
- packages/config
- packages/config
- packages/db
- packages/types
- packages/types
- docs/superpowers
- turbo.json
- apps/api
- docs/superpowers
- packages/db
- AGENTS.md
- packages/config
- packages/config
- packages/config
- packages/db
- packages/types
- turbo.json
- turbo.json
- packages/config
- packages/config
- packages/types
- packages/types
- packages/types
- packages/ui
- docs/agents
- docs/superpowers
- packages/config
- packages/db
- packages/db
- packages/types
- biome.json
- packages/config
- packages/config
- packages/config
- packages/db
- turbo.json
- apps/admin
- apps/admin
- apps/api
- apps/landing
- packages/config
- packages/db
- packages/db
- AGENTS.md
- AGENTS.md
- AGENTS.md
- AGENTS.md
- AGENTS.md
- apps/landing
- apps/landing
- compose.yaml
- CONTEXT-MAP.md
- .github/workflows
- packages/config

## God Nodes (most connected - your core abstractions)
1. `M1 Real Data Layer Spec` - 26 edges
2. `Progress / Status Narration` - 18 edges
3. `compilerOptions` - 17 edges
4. `Roadmap - Milestone Plan (M0-M6)` - 16 edges
5. `scripts` - 15 edges
6. `scripts` - 15 edges
7. `tasks` - 14 edges
8. `scripts` - 13 edges
9. `scripts` - 13 edges
10. `formatter` - 12 edges

## Surprising Connections (you probably didn't know these)
- `PostHog analytics via VITE_POSTHOG_KEY / VITE_POSTHOG_HOST` --conceptually_related_to--> `@sevendays/admin — internal dashboard for content + appointments (TanStack Start)`  [AMBIGUOUS]
  apps/landing/README.md → AGENTS.md
- `@sevendays/api-client — the only supported path for both apps to call the API` --conceptually_related_to--> `@sevendays/landing — public marketing site + appointment booking (TanStack Start)`  [INFERRED]
  apps/api/CONTEXT.md → AGENTS.md
- `PostHog analytics via VITE_POSTHOG_KEY / VITE_POSTHOG_HOST` --conceptually_related_to--> `@sevendays/landing — public marketing site + appointment booking (TanStack Start)`  [INFERRED]
  apps/landing/README.md → AGENTS.md
- `@sevendays/api-client — the only supported path for both apps to call the API` --conceptually_related_to--> `@sevendays/admin — internal dashboard for content + appointments (TanStack Start)`  [INFERRED]
  apps/api/CONTEXT.md → AGENTS.md
- `db service — postgres:17, POSTGRES_DB sevendays_test, port 5432, pg_isready healthcheck` --shares_data_with--> `@sevendays/db — Drizzle schema + client (live Supabase, migrations 0000+0001 applied, catalog seeded)`  [INFERRED]
  compose.yaml → AGENTS.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Availability model (ADR-0005): Slots within Branch hours with remaining Slot capacity define bookable Availability** — apps_api_context_adr0005, apps_api_context_slot, apps_api_context_branch_hours, apps_api_context_slot_capacity, apps_api_context_availability [EXTRACTED 1.00]
- **Guest booking pipeline: Branch → Service Package → Slot → contact info → Confirmation, recorded as an Appointment** — apps_landing_context_booking_flow, apps_api_context_branch, apps_api_context_service_package, apps_api_context_slot, apps_landing_context_confirmation, apps_api_context_appointment [EXTRACTED 1.00]
- **Canonical domain vocabulary owned by the API context; landing and admin reference it via CONTEXT-MAP** — context_map, apps_api_context, apps_landing_context, apps_admin_context [EXTRACTED 1.00]
- **Sevendays ADR Series (ADR-0000 template through ADR-0011)** — docs_adr_0000_template_doc, docs_adr_0001_typescript_6_pin_and_biome_adoption_doc, docs_adr_0002_tiered_biome_configs_doc, docs_adr_0003_vitest_4_per_workspace_configs_doc, docs_adr_0004_betterauth_shared_tables_token_verification_doc, docs_adr_0005_hourly_slot_grid_capacity_doc, docs_adr_0006_shared_api_client_hono_rpc_doc, docs_adr_0007_database_connection_topology_doc, docs_adr_0008_integration_tests_vs_real_postgres_doc, docs_adr_0009_normalized_catalog_lookups_doc, docs_adr_0010_url_path_versioning_doc, docs_adr_0011_per_request_db_client_doc [INFERRED 0.95]
- **Toolchain Consolidation (TS 6 pin, Biome tiers, Vitest per-workspace)** — docs_adr_0001_typescript_6_pin_and_biome_adoption_doc, docs_adr_0002_tiered_biome_configs_doc, docs_adr_0003_vitest_4_per_workspace_configs_doc, docs_tech_stack_doc, docs_progress_doc [INFERRED 0.85]
- **End-to-End Appointment Booking Flow (PRD -> availability -> API client -> milestones)** — docs_prd_guest_booking_flow, docs_adr_0005_hourly_slot_grid_capacity_hourly_slot_grid, docs_adr_0006_shared_api_client_hono_rpc_rpc_client, docs_plan_milestone_2_booking, docs_plan_milestone_3_availability, docs_architecture_doc [INFERRED 0.85]
- **Milestone 1 + M2 Pre-flight Planning Corpus** — docs_specs_2026_08_30_m1_real_data_layer_spec_m1_real_data_layer, docs_specs_2026_08_30_m2_preflight_api_client_spec_m2_preflight_api_client, docs_specs_2026_09_02_acquisition_error_seam_spec_acquisition_error_seam, docs_specs_2026_09_02_catalog_row_shaping_module_spec_catalog_row_shaping_module, docs_specs_2026_09_02_deepen_appointment_intake_spec_deepen_appointment_intake, docs_specs_2026_09_02_extract_read_stitch_module_spec_extract_read_stitch_module, docs_superpowers_plans_2026_08_30_m1_1_preflight_m1_1_preflight, docs_superpowers_plans_2026_08_31_m1_2_catalog_schema_m1_2_catalog_schema, docs_superpowers_plans_2026_08_31_m1_3_provision_migrate_seed_m1_3_provision_migrate_seed, docs_superpowers_plans_2026_09_01_frame_grouping_and_attire_normalization_frame_grouping_attire_normalization, docs_superpowers_plans_2026_09_01_m1_4_real_routes_integration_tests_m1_4_real_routes_integration_tests, docs_superpowers_plans_2026_09_02_deepen_appointment_intake_deepen_appointment_intake_plan, docs_superpowers_plans_2026_09_02_m1_5_exit_verification_m1_5_exit_verification [EXTRACTED 0.95]
- **2026-09-02 Architecture Review Candidates (A-D)** — docs_specs_2026_09_02_acquisition_error_seam_spec_acquisition_error_seam, docs_specs_2026_09_02_catalog_row_shaping_module_spec_catalog_row_shaping_module, docs_specs_2026_09_02_deepen_appointment_intake_spec_deepen_appointment_intake, docs_specs_2026_09_02_extract_read_stitch_module_spec_extract_read_stitch_module, docs_superpowers_plans_2026_09_02_deepen_appointment_intake_deepen_appointment_intake_plan [EXTRACTED 0.85]
- **Database Connection Topology + Seed Infrastructure** — docs_specs_2026_08_30_m1_real_data_layer_spec_two_connection_topology, docs_specs_2026_08_30_m1_real_data_layer_spec_adr_0007, docs_superpowers_plans_2026_08_31_m1_3_provision_migrate_seed_session_mode_pooler, docs_superpowers_plans_2026_08_31_m1_3_provision_migrate_seed_check_env_gate, docs_superpowers_plans_2026_08_31_m1_3_provision_migrate_seed_seed_upsert, docs_superpowers_plans_2026_08_31_m1_3_provision_migrate_seed_fk_indexes_natural_keys [INFERRED 0.85]

## Communities (108 total, 20 thin omitted)

### Community 0 - "Tooling ADRs (Biome + TS pin)"
Cohesion: 0.06
Nodes (72): ADR Supersession Lifecycle Rule, ADR Template, Biome Replaces ESLint + Prettier, ADR-0001: Pin TypeScript to ^6.0.3, standardize on Biome, Maximal Biome Ruleset (preset all + nursery), TypeScript ^6.0.3 Pin, Bundle-Perf Rules (noBarrelFile/noReExportAll/noNamespaceImport/noCommonJs), ADR-0002: Tiered Biome configs - bundled workspaces vs libraries (+64 more)

### Community 1 - "DB Seeds & Catalog Data"
Cohesion: 0.06
Nodes (44): addonServiceSeeds, attireSeeds, branchSeeds, inclusionSignatures(), PackageSeed, packageSeeds, printSizeSeeds, privilegeSeeds (+36 more)

### Community 2 - "Workspace Packages (3 apps + 4 pkgs)"
Cohesion: 0.05
Nodes (60): AGENTS.md (root project instructions), @sevendays/admin — internal dashboard for content + appointments (TanStack Start), @sevendays/api — shared backend API (Hono on Cloudflare Workers), @sevendays/landing — public marketing site + appointment booking (TanStack Start), @sevendays/db — Drizzle schema + client (live Supabase, migrations 0000+0001 applied, catalog seeded), @sevendays/types — Zod schemas + inferred types, shared across all apps, @sevendays/ui — shadcn/ui design tokens (CSS variables), db:generate then db:migrate for schema changes (+52 more)

### Community 3 - "packages/db deps (drizzle)"
Cohesion: 0.04
Nodes (45): drizzle-kit, dependencies, drizzle-orm, postgres, devDependencies, drizzle-kit, @sevendays/config, @sevendays/types (+37 more)

### Community 4 - "Landing/Admin Vite+TanStack deps"
Cohesion: 0.04
Nodes (44): devDependencies, @cloudflare/vite-plugin, @sevendays/config, @tailwindcss/typography, @tanstack/devtools-vite, @tanstack/router-cli, @tanstack/router-plugin, @types/node (+36 more)

### Community 5 - "Landing/Admin Vite+TanStack deps"
Cohesion: 0.04
Nodes (44): devDependencies, @cloudflare/vite-plugin, @sevendays/config, @tailwindcss/typography, @tanstack/devtools-vite, @tanstack/router-cli, @tanstack/router-plugin, @types/node (+36 more)

### Community 6 - "API Acquisition & Error Seam ADRs"
Cohesion: 0.07
Nodes (43): One Acquisition/Error Seam for the API (Candidate D), Per-Request DB Acquisition Middleware (c.set), ADR-0006 M2 route restructure (app type + env), ADR-0008 Integration Tests vs Real Postgres, ADR-0010 versioned subapp mount, ADR-0011 Per-Request DB Client, Candidate D — route-layer error seam, db-free /health endpoint (+35 more)

### Community 7 - "API deps (hono + zod)"
Cohesion: 0.05
Nodes (41): dependencies, drizzle-orm, hono, @hono/zod-validator, @sevendays/db, @sevendays/types, zod, devDependencies (+33 more)

### Community 8 - "PostHog Provider Integration"
Cohesion: 0.06
Nodes (32): PostHogProvider(), PostHogProviderProps, getRouter(), Register, @tanstack/react-router, Route, Route, FileRoutesByFullPath (+24 more)

### Community 9 - "Shared React/UI deps"
Cohesion: 0.05
Nodes (39): dependencies, class-variance-authority, clsx, dotenv-cli, lucide-react, posthog-js, @posthog/react, react (+31 more)

### Community 10 - "Shared React/UI deps"
Cohesion: 0.05
Nodes (39): dependencies, class-variance-authority, clsx, dotenv-cli, lucide-react, posthog-js, @posthog/react, react (+31 more)

### Community 11 - "API Appointments Route+Index"
Cohesion: 0.11
Nodes (25): app, appointmentProjection, createAppointment(), CreateAppointmentResult, CreateReason, fail(), REJECTION_MESSAGES, ADR-0005 (+17 more)

### Community 12 - "packages/config package.json"
Cohesion: 0.06
Nodes (35): author, description, devDependencies, @biomejs/biome, @types/node, typescript, vitest, @vitest/coverage-istanbul (+27 more)

### Community 13 - "packages/config tsconfig deps"
Cohesion: 0.06
Nodes (32): devDependencies, @biomejs/biome, @sevendays/config, turbo, typescript, vitest, engines, node (+24 more)

### Community 14 - "packages/types package.json"
Cohesion: 0.07
Nodes (29): devDependencies, @sevendays/config, @types/node, typescript, vitest, zod, exports, @sevendays/config (+21 more)

### Community 15 - "API Env & Route Handlers"
Cohesion: 0.16
Nodes (16): Env, addonServices, appointments, branches, servicePackages, v1, listActiveAddonServices(), listAppointments() (+8 more)

### Community 16 - "PostHog Provider Integration"
Cohesion: 0.11
Nodes (18): PostHogProvider(), PostHogProviderProps, getRouter(), Register, @tanstack/react-router, Route, Route, FileRoutesByFullPath (+10 more)

### Community 17 - "Appointment Domain Schema (types)"
Cohesion: 0.11
Nodes (17): Appointment, AppointmentKind, appointmentKindSchema, appointmentSchema, AppointmentStatus, appointmentStatusSchema, CreateAppointmentInput, createAppointmentSchema (+9 more)

### Community 18 - "tsconfig.base"
Cohesion: 0.10
Nodes (19): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleDetection (+11 more)

### Community 19 - "shadcn components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 20 - "shadcn components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 21 - "tsconfig.build"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, declarationMap, noEmit, outDir, rootDir, exclude, extends (+9 more)

### Community 22 - "tsconfig.json (app)"
Cohesion: 0.12
Nodes (16): compilerOptions, lib, noFallthroughCasesInSwitch, noUncheckedSideEffectImports, noUnusedLocals, noUnusedParameters, paths, extends (+8 more)

### Community 23 - "tsconfig.build"
Cohesion: 0.12
Nodes (16): compilerOptions, declaration, declarationMap, outDir, rootDir, exclude, extends, include (+8 more)

### Community 24 - "tsconfig.json (app)"
Cohesion: 0.12
Nodes (16): compilerOptions, lib, noFallthroughCasesInSwitch, noUncheckedSideEffectImports, noUnusedLocals, noUnusedParameters, paths, extends (+8 more)

### Community 25 - "docs/specs"
Cohesion: 0.15
Nodes (17): GET /api/v1/addon-services, ADR-0005 Slot Capacity, ADR-0008 Integration Tests vs Real Postgres, ADR-0009 Normalized Catalog Lookups, ADR-0010 URL Path Versioning, appointment_addon_services join (price snapshot), Appointment Kind enum (scheduled|walk_in|visitation), POST /api/v1/appointments (+9 more)

### Community 26 - "packages/db"
Cohesion: 0.12
Nodes (16): compilerOptions, declaration, declarationMap, noEmit, outDir, rootDir, exclude, extends (+8 more)

### Community 27 - "packages/types"
Cohesion: 0.13
Nodes (15): CreateServicePackageInput, createServicePackageSchema, ResolvedAttire, resolvedAttireSchema, ResolvedFrame, resolvedFrameSchema, ResolvedPackageInclusion, ResolvedPrintSize (+7 more)

### Community 28 - "packages/ui"
Cohesion: 0.12
Nodes (16): devDependencies, @sevendays/config, tailwindcss, exports, ./globals.css, @sevendays/config, tailwindcss, name (+8 more)

### Community 29 - "packages/config"
Cohesion: 0.14
Nodes (16): formatter, attributePosition, bracketSameLine, bracketSpacing, enabled, expand, formatWithErrors, indentStyle (+8 more)

### Community 30 - "packages/config"
Cohesion: 0.12
Nodes (15): jsxQuoteStyle, javascript, formatter, linter, rules, useSortedClasses, noBarrelFile, noNamespaceImport (+7 more)

### Community 31 - "apps/api"
Cohesion: 0.13
Nodes (14): compilerOptions, types, exclude, extends, include, **.config.ts, coverage, dist (+6 more)

### Community 32 - "packages/config"
Cohesion: 0.13
Nodes (14): compilerOptions, declaration, declarationMap, noEmit, outDir, rootDir, strictNullChecks, exclude (+6 more)

### Community 33 - "docs/specs"
Cohesion: 0.21
Nodes (14): ADR-0003 Per-Workspace Vitest Configs, ADR-0004 Auth Session Sharing, ADR-0006 Shared API Client + Hono RPC, ApiClientError typed error class (status + details), @sevendays/api-client shared package, apiErrorSchema — one uniform error envelope, API_URL server-side env with no fallback, Hono RPC Type Inference for AppType (+6 more)

### Community 34 - "packages/db"
Cohesion: 0.15
Nodes (12): compilerOptions, outDir, exclude, extends, include, dist, node_modules, @sevendays/config/ts/node (+4 more)

### Community 35 - "packages/types"
Cohesion: 0.15
Nodes (12): exclude, extends, include, *.config.ts, coverage, dist, node_modules, @sevendays/config/ts/node (+4 more)

### Community 36 - "turbo.json"
Cohesion: 0.15
Nodes (13): .env*, $TURBO_DEFAULT$, inputs, inputs, inputs, inputs, inputs, fix (+5 more)

### Community 37 - "packages/config"
Cohesion: 0.17
Nodes (12): noUnusedVariables, rules, recommended, noBarrelFile, noNamespaceImport, noReExportAll, correctness, nursery (+4 more)

### Community 38 - "apps/admin"
Cohesion: 0.18
Nodes (10): extends, files, includes, !!**/dist, !instrument.server.mjs, !!**/.output, @sevendays/config/biome/base, @sevendays/config/biome/vite (+2 more)

### Community 39 - "apps/landing"
Cohesion: 0.18
Nodes (10): extends, files, includes, !!**/dist, !instrument.server.mjs, !!**/.output, @sevendays/config/biome/base, @sevendays/config/biome/vite (+2 more)

### Community 40 - "docs/superpowers"
Cohesion: 0.22
Nodes (11): ADR-0007 Database Connection Topology, Two-Connection Database Topology (pooled vs direct), ADR-0007 (authored in this plan), GitHub Actions CI Workflow (pnpm check + build), docs/plan.md Milestone 1 Checklist Rewrite, Committed Env Examples + Gitignored Secrets, M1.1 Pre-flight Implementation Plan, Manifest Aligns (lucide-react ^1.37.0, @types/node ^26) (+3 more)

### Community 41 - "turbo.json"
Cohesion: 0.18
Nodes (11): cache, cache, cache, cache, cache, tasks, clean, db:generate (+3 more)

### Community 42 - "docs/superpowers"
Cohesion: 0.29
Nodes (10): ADR-0003 per-workspace vitest config, ADR-0009 Normalized Catalog Lookups, First Checked-In Migration 0000, Inclusion union (framed_picture|print|privilege), M1.2 Catalog Schema Implementation Plan, Offline-by-Design Ticket (no live DB), GitHub Issue #4 — M1.2 catalog schema, packages/types Vitest Harness (+2 more)

### Community 43 - "docs/superpowers"
Cohesion: 0.27
Nodes (10): ADR-0008 Integration Tests vs Real Postgres, ADR-0010 URL Path Versioning, /api/v1 Versioned Mount (app.route('/api/v1', api)), compose.yaml Postgres 17 Test Service, M1.4 Real API Routes + Integration Tests Plan, migrateDatabase Subpath Export in packages/db, Resolved Catalog Read Shapes (printSize/attires/frames), Global Setup + Fixtures + Truncate Harness (+2 more)

### Community 44 - "packages/config"
Cohesion: 0.20
Nodes (9): linter, rules, noBarrelFile, noNamespaceImport, noReExportAll, performance, style, $schema (+1 more)

### Community 45 - "packages/config"
Cohesion: 0.20
Nodes (9): compilerOptions, module, moduleResolution, target, types, extends, ./base.json, $schema (+1 more)

### Community 46 - "packages/db"
Cohesion: 0.20
Nodes (9): extends, files, includes, !!dist, @sevendays/config/biome/base, @sevendays/config/biome/node, root, !!drizzle (+1 more)

### Community 47 - "packages/types"
Cohesion: 0.22
Nodes (6): ApiError, apiErrorSchema, Branch, branchSchema, CreateBranchInput, createBranchSchema

### Community 48 - "packages/types"
Cohesion: 0.24
Nodes (8): CreatePackageInclusionInput, createPackageInclusionSchema, PackageInclusion, PackageInclusionKind, packageInclusionKindSchema, packageInclusionSchema, ADR-0009, resolvedInclusionSchema

### Community 49 - "docs/superpowers"
Cohesion: 0.33
Nodes (9): ADR-0007 Alignment (session-pooler refinement), scripts/catalog.ts Catalog Transcription, check-env.mjs Pre-Flight Gate, FK Indexes + Natural Keys Folded Into Migration 0000, M1.3 Provision, Migrate, Seed Implementation Plan, db:seed Single-Transaction Natural-Key Upsert, Session-Mode Pooler for Migrations + Seed, GitHub Issue #5 — M1.3 provision/migrate/seed (+1 more)

### Community 50 - "turbo.json"
Cohesion: 0.22
Nodes (9): ^build, NODE_ENV, .vinxi/**, dependsOn, env, outputs, dist/**, .output/** (+1 more)

### Community 51 - "apps/api"
Cohesion: 0.25
Nodes (7): extends, files, includes, @sevendays/config/biome/base, !worker-configuration.d.ts, root, @sevendays/config/biome/worker

### Community 52 - "docs/superpowers"
Cohesion: 0.36
Nodes (8): GitHub Issue #2 — M1 tracking issue, Milestone 1 — Real Data Layer, Four-Act Exit Verification Runbook (pre-flight + acts 1-4), M1.5 M1 Exit Verification + Close-Out Implementation Plan, Negative Controls on the Deployed Artifact, rehearsal-fixture.mjs Compose-Only Rehearsal, GitHub Issue #7 — M1.5 exit verification + close-out, verify-appointment-row.mjs psql-Equivalent Probe

### Community 54 - "AGENTS.md"
Cohesion: 0.33
Nodes (7): pnpm check gate (lint + format + typecheck + test), @sevendays/config — shared ts/biome/vitest tooling configs (built dist, gitignored), Turborepo-powered root commands (dev/build/lint/format/typecheck/test/check/fix), CI workflow (.github/workflows/ci.yml), @sevendays/config/biome/* — base + tier fragments (vite, worker, node), @sevendays/config/ts/* — base, node, react, vite tsconfig variants, @sevendays/config/vitest — shared Vitest config

### Community 55 - "packages/config"
Cohesion: 0.29
Nodes (6): css, parser, files, javascript, tailwindDirectives, $schema

### Community 56 - "packages/config"
Cohesion: 0.29
Nodes (7): includes, !!**/dist, !!**/node_modules, !!**/.turbo, **, !!**/.agents, !!**/.wrangler

### Community 57 - "packages/config"
Cohesion: 0.29
Nodes (6): compilerOptions, jsx, jsxImportSource, extends, ./base.json, $schema

### Community 58 - "packages/db"
Cohesion: 0.29
Nodes (4): dbDir, dbEnvPath, devVarsPath, repoDir

### Community 59 - "packages/types"
Cohesion: 0.38
Nodes (5): Attire, attireSchema, CreateAttireInput, createAttireSchema, ADR-0009

### Community 60 - "turbo.json"
Cohesion: 0.29
Nodes (7): coverage/blob/**, ^test, $TURBO_ROOT$/vitest.config.ts, test, dependsOn, inputs, outputs

### Community 61 - "turbo.json"
Cohesion: 0.29
Nodes (6): DATABASE_MIGRATE_URL, DATABASE_URL, TEST_DATABASE_URL, globalPassThroughEnv, $schema, ui

### Community 62 - "packages/config"
Cohesion: 0.33
Nodes (6): project, qwik, solid, linter, domains, enabled

### Community 63 - "packages/config"
Cohesion: 0.60
Nodes (3): baseConfig, sharedConfig, uiConfig

### Community 64 - "packages/types"
Cohesion: 0.47
Nodes (4): AddonService, addonServiceSchema, CreateAddonServiceInput, createAddonServiceSchema

### Community 65 - "packages/types"
Cohesion: 0.47
Nodes (4): CreateFrameInput, createFrameSchema, frameSchema, PackageFrame

### Community 66 - "packages/types"
Cohesion: 0.47
Nodes (4): CreatePrintSizeInput, createPrintSizeSchema, PrintSize, printSizeSchema

### Community 67 - "packages/ui"
Cohesion: 0.33
Nodes (5): extends, @sevendays/config/biome/base, @sevendays/config/biome/node, overrides, root

### Community 68 - "docs/agents"
Cohesion: 0.40
Nodes (5): Issue Tracker: GitHub via gh CLI, gh CLI Issue Workflow, Wayfinder Map + Child Tickets, Triage Labels Mapping, Five Canonical Triage Roles

### Community 69 - "docs/superpowers"
Cohesion: 0.70
Nodes (5): ADR-0009 Revised In Place (owner-sanctioned, once), Attire Normalization: Atomic Rows + Junction, Frame Grouping & Attire Normalization Implementation Plan, Frame Numbering Rules (Frame 1/2/3; unlabeled in listed order), frames Table + package_inclusions.frame_id

### Community 70 - "packages/config"
Cohesion: 0.40
Nodes (3): destinationDir, workspaceDirs, workspaceRoot

### Community 71 - "packages/db"
Cohesion: 0.40
Nodes (3): ADR-0007, parsed, sql

### Community 73 - "packages/types"
Cohesion: 0.40
Nodes (4): extends, @sevendays/config/biome/base, @sevendays/config/biome/node, root

### Community 74 - "biome.json"
Cohesion: 0.50
Nodes (3): extends, @sevendays/config/biome/base, $schema

### Community 75 - "packages/config"
Cohesion: 0.50
Nodes (3): extends, root, ./src/biome/base.json

### Community 76 - "packages/config"
Cohesion: 0.50
Nodes (4): source, assist, actions, organizeImports

### Community 77 - "packages/config"
Cohesion: 0.50
Nodes (4): vcs, clientKind, enabled, useIgnoreFile

### Community 78 - "packages/db"
Cohesion: 0.50
Nodes (3): AppointmentProbeAddon, AppointmentProbeExpected, AppointmentProbeResult

### Community 79 - "turbo.json"
Cohesion: 0.67
Nodes (3): cache, persistent, dev

## Ambiguous Edges - Review These
- `@sevendays/admin — internal dashboard for content + appointments (TanStack Start)` → `PostHog analytics via VITE_POSTHOG_KEY / VITE_POSTHOG_HOST`  [AMBIGUOUS]
  apps/landing/README.md · relation: conceptually_related_to
- `Shadcn component workflow (pnpm dlx shadcn@latest add)` → `minimumReleaseAgeExclude: lucide-react@1.37.0`  [AMBIGUOUS]
  pnpm-workspace.yaml · relation: conceptually_related_to
- `Attire Junction (package_inclusion_attires)` → `Catalog Attires & Universal Privileges`  [AMBIGUOUS]
  docs/adr/0009-normalized-catalog-lookups.md · relation: conceptually_related_to

## Knowledge Gaps
- **696 isolated node(s):** `root`, `@sevendays/config/biome/base`, `@sevendays/config/biome/vite`, `!src/routeTree.gen.ts`, `!instrument.server.mjs` (+691 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `@sevendays/admin — internal dashboard for content + appointments (TanStack Start)` and `PostHog analytics via VITE_POSTHOG_KEY / VITE_POSTHOG_HOST`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Shadcn component workflow (pnpm dlx shadcn@latest add)` and `minimumReleaseAgeExclude: lucide-react@1.37.0`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Attire Junction (package_inclusion_attires)` and `Catalog Attires & Universal Privileges`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `M1 Real Data Layer Spec` connect `docs/specs` to `docs/superpowers`, `docs/superpowers`, `docs/superpowers`, `docs/superpowers`, `docs/superpowers`, `docs/superpowers`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `M1.4 Real API Routes + Integration Tests Plan` connect `docs/superpowers` to `docs/specs`, `docs/superpowers`, `docs/specs`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `Progress / Status Narration` (e.g. with `ADR-0001: Pin TypeScript to ^6.0.3, standardize on Biome` and `ADR-0004: API verifies BetterAuth sessions via shared tables, not cookies`) actually correct?**
  _`Progress / Status Narration` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `root`, `@sevendays/config/biome/base`, `@sevendays/config/biome/vite` to the rest of the system?**
  _696 weakly-connected nodes found - possible documentation gaps or missing edges._