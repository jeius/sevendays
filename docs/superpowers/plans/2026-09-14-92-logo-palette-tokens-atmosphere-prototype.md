# Logo Palette → Token Layer + Landing Atmosphere Prototype (wayfinder #92) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`.

**Goal:** Render the #90 brand decision (the owner's six fixed logo hexes) as a concrete candidate token layer (oklch, in `packages/ui`, imported by both apps) plus a rebuilt landing atmosphere, on a throwaway branch at `/prototype-tokens`, so the owner can react and the values can feed the milestone spec's token layer.

**Architecture:** A candidate `tokens-92.css` in `packages/ui` shadows the interim preset layer (`tokens.css`, preset `b1uGsTYZ6`) by redefining the same-named shadcn custom properties later in the cascade — imported **after** `tokens.css` in each app's `styles.css` — and adds the new brand ramp, interaction states, and atmosphere tokens through its own `@theme inline` block. The `/prototype-tokens` route is replaced with a #92 showcase: fixed points → derived ramp → interaction states → semantic components → chart ramp → admin tool-neutral strip → three full-bleed atmosphere variants → photography-recede test. Nothing merges; the owner reacts; the spec task (#61) adopts the values.

**Tech Stack:** Tailwind v4 (CSS-first `@theme`, `@theme inline` remapping), TanStack Start (file routes), pnpm workspaces, Biome, Vitest (existing suites only).

**Spec:** This plan implements wayfinder ticket [#92 "Prototype: logo palette → token layer + landing atmosphere"](https://github.com/jeius/sevendays/issues/92) on map [#55 "Wayfinder map: UI/UX design system milestone"](https://github.com/jeius/sevendays/issues/55). Key spec facts:

- **Palette = the owner's logo hexes, fixed points, never nudged** (#90): primary `#06708e`, ink `#0e131a`, deep petrol `#084257`, light neutral `#dedede`, mid gray `#7e7f7f`, cool gray `#afb8ba`. Derivation may only **add**: brand ramp 50–900 around primary + ink, hover/active/focus states, an AA-safe muted-text tone darker than `#7e7f7f`, mono-primary chart ramp, landing wash values.
- **Strictly cool** — no warm accent; destructive-red stays the shadcn default (carried verbatim from `tokens.css`).
- **oklch conversion** — full precision, round-trips to the identical rendered color, source hex kept as a comment beside each value. The hexes are canonical; no convenience rounding.
- **Landing atmosphere** — gradient wash + layered surfaces as a *pattern* rebuilt on the logo palette; **admin tool-neutral** (flat shadcn; brand = wordmark + primary).
- **Neutral/functional token names** — numeric ramp + functional atmosphere tokens; no evocative metaphor vocabulary.
- **Mechanics per #57** — throwaway branch/worktree, rendered showcase replacing `/prototype-tokens`, main untouched (teal preset stays interim until the milestone swap). No print work.
- **Quality bar** (every render passes): WCAG AA on its surfaces, recedes behind photography, admin-derivable, harmonizes with Figtree/Roboto Slab/Geist Mono, not SaaS-generic.
- **Parked / out of scope:** dark mode (v1), font loading changes (self-hosting note rides the spec #61, not this prototype), island-primitive removal (dies with the milestone), `docs/progress.md` + `graphify update` (throwaway branch; those track main), writing the spec (#61), closing the ticket (HITL — resolves when the owner reacts).

## Global Constraints

- **Work happens in the worktree** `/home/jeius/Projects/sevendays/.worktrees/92-logo-tokens-atmosphere` on branch `prototype/92-logo-tokens-atmosphere` (created off `main` @ add0cef). All paths below are relative to that worktree root unless absolute. Baseline verified 2026-09-14: `pnpm install`, `pnpm build:packages`, `pnpm --filter @sevendays/api build`, and `pnpm check` all green (33/33 turbo tasks).
- **Everything here is throwaway-branch work.** Nothing merges to `main`; `main` keeps only the validated decision later (via #61). Prototype files are marked as such at the top of each file. The ticket is **not** closed at the end — it is HITL and resolves when the owner reacts.
- **No tests for prototype code** (prototype rules: no tests, no polish). The gates are: existing suites stay green, both apps build, the route renders, `pnpm check` passes at the end (repo rule: don't commit code that fails it for touched packages).
- **Fixed brand points** (#90; hexes canonical, oklch round-trip verified by the Task 1 verify script):

  | Token | Hex | oklch | Role (#90 role map) | Measured facts |
  |---|---|---|---|---|
  | `--brand-primary` | `#06708e` | `oklch(0.5076 0.09475 225.078)` | primary — buttons, links, active | white on it 5.65:1 AA ✓ |
  | `--brand-ink` | `#0e131a` | `oklch(0.185 0.0164 256.833)` | ink — text, darkest surface | on `#dedede` 13.85:1 ✓✓ |
  | `--brand-deep` | `#084257` | `oklch(0.3553 0.06561 228.722)` | deep petrol — hero depth, footer, dark bands | white on it 10.90:1 ✓✓ |
  | `--brand-gray-light` | `#dedede` | `oklch(0.9006 0 89.876)` | light neutral — chips, secondary surfaces | ink on it 13.85:1 |
  | `--brand-gray-mid` | `#7e7f7f` | `oklch(0.5956 0.0012 197.124)` | mid gray — dividers, disabled, large muted text only | on white 4.02:1 (plan script) / 4.06:1 (#90's math) — AA small-text FAIL either way, hence the derived `--muted-text` |
  | `--brand-gray-cool` | `#afb8ba` | `oklch(0.7761 0.01046 212.527)` | cool gray — borders, inputs, tints | ink on it 9.22:1 ✓ |

  Note: `#dedede` has chroma 0, so its hue (89.876) is mathematically irrelevant — kept as computed, per the no-convenience-rounding rule.

- **Derived values** (this plan's live-computed derivation; every value below is verified by the Task 1 script):
  - **Brand ramp** (hue held at primary's 225.078, chroma peaking at 600; `--brand-600` IS the fixed primary; deep petrol stays its own fixed token — its hue 228.722 differs, it is not ramp-800):

    | Token | oklch | Hex (info) | white-on-it | ink-on-it |
    |---|---|---|---|---|
    | `--brand-50` | `oklch(0.97 0.012 225.078)` | `#edf7fb` | 1.09 | 17.13 |
    | `--brand-100` | `oklch(0.945 0.02 225.078)` | `#dff0f7` | 1.17 | 15.93 |
    | `--brand-200` | `oklch(0.9 0.032 225.078)` | `#c9e3ee` | 1.34 | 13.94 |
    | `--brand-300` | `oklch(0.84 0.05 225.078)` | `#a8d2e3` | 1.62 | 11.53 |
    | `--brand-400` | `oklch(0.7 0.075 225.078)` | `#69a9c2` | 2.61 | 7.15 |
    | `--brand-500` | `oklch(0.6 0.09 225.078)` | `#398ba9` | 3.86 | 4.83 |
    | `--brand-600` | `var(--brand-primary)` | `#06708e` | 5.65 | 3.30 |
    | `--brand-700` | `oklch(0.42 0.08 225.078)` | `#00566e` | 8.22 | 2.27 |
    | `--brand-800` | `oklch(0.355 0.0656 225.078)` | `#034356` | 10.82 | 1.72 |
    | `--brand-900` | `oklch(0.28 0.05 225.078)` | `#042e3b` | 14.39 | 1.29 |

  - **Interaction states:** `--brand-primary-hover: var(--brand-700)` (white on it 8.22:1), `--brand-primary-active: var(--brand-800)` (10.82:1), `--brand-focus-ring: var(--brand-400)` (non-text indicator; 2.61:1 on white exceeds the 3:1 UI-component bar only marginally — it is a focus ring adjacent to the controlled element, and `--ring` is not body text; the owner reaction decides).
  - **Muted text:** `--muted-text: oklch(0.52 0.0012 197.1)` = `#686969` — derived from mid gray's hue/chroma with lightness dropped until it clears 4.55:1 on the **darkest wash** (`#d9eef6`), because the atmosphere puts muted text on washes, not only white. Measured: white 5.51, wash-base 5.13, wash-a 4.99, brand-100 4.71, wash-b 4.59 — AA ✓ on every light surface it may sit on.
  - **Chart ramp (mono-primary):** `--chart-1..5 = var(--brand-300/400/600/700/800)`.
  - **Atmosphere defaults:** `--wash-base: oklch(0.975 0.008 225.078)` (`#f1f8fb`), `--wash-a: oklch(0.965 0.015 225.078)` (`#e9f6fb`), `--wash-b: oklch(0.935 0.025 225.078)` (`#d9eef6`), `--surface-glass: oklch(1 0 0 / 74%)`, `--surface-strong: oklch(1 0 0 / 90%)`, `--line-soft: oklch(0.7761 0.01046 212.527 / 50%)` (cool-gray hairline).
- **AA pair rules for any text the executor adds** (measured; script recomputes): `--muted-text` is safe on white, cards, and all three washes, and on glass over the LIGHT washes (5.38 on glass-over-wash-a); on glass over the deep band (`bg-surface-glass` above `bg-brand-deep`) use **ink** — muted-text is 3.41:1 there (Task 2 review finding, 2026-09-14); on `--brand-gray-light` use ink (muted-text is ~3.8 there); on `--brand-deep` use white (10.90) or `text-white/85` (8.36); `text-brand-700` is safe on every light surface including gray-light (6.11+); never put `text-brand-700` on cool gray (4.06 — fail).
- **Semantic mapping (candidate shadcn layer):** `--primary/--sidebar-primary: var(--brand-primary)`, `--primary-foreground/--sidebar-primary-foreground: oklch(1 0 0)`, `--foreground/--card-foreground/--popover-foreground/--secondary-foreground/--accent-foreground/--sidebar-foreground/--sidebar-accent-foreground: var(--brand-ink)`, `--secondary/--sidebar-accent: var(--brand-gray-light)`, `--muted/--accent: var(--brand-100)`, `--muted-foreground: var(--muted-text)`, `--border/--input/--sidebar-border: var(--brand-gray-cool)`, `--ring/--sidebar-ring: var(--brand-focus-ring)`, `--destructive: oklch(0.577 0.245 27.325)` (shadcn default, carried verbatim — the only warm semantic), `--background: var(--wash-base)`, `--card/--popover/--sidebar: oklch(1 0 0)`, `--radius: 0.625rem` (unchanged from interim preset — #92 decides color, not shape).
- **Dark mode is parked:** the candidate layer defines **no** `.dark` block; `tokens.css`'s `.dark` stays as-found and wins in any dark context. Do not design or delete it.
- **Do not touch** the island primitives (`--sea-ink`…`--hero-b`) or any app-specific CSS (`island-shell`, hero gradients, `body` rules) — those die with the milestone; this branch leaves them alone. Other pages on this branch will render mixed (old island app-CSS over candidate semantics) — expected cosmetic noise on a throwaway branch; the reaction surface is `/prototype-tokens`, which controls its own canvas.
- **Leave `packages/ui/src/globals.css` and its export untouched** (stale v3-era file; cleanup is milestone work).
- **Interactive elements carry shadcn-default hover behavior** (ui-ux-pro-max: hover transitions 150–300ms; #90: motion = shadcn defaults): every `<button>`, link, and input in the showcase gets `cursor-pointer` and `transition-colors` appended to its pinned className (buttons/links only for `cursor-pointer`). Mechanical class append, not a redesign.
- **Token discipline in showcase markup** (ui-ux-pro-max: token-driven theming, no per-screen hardcoded colors): decorative gradient swatches use the ramp variables, e.g. `bg-[linear-gradient(135deg,var(--brand-500),var(--brand-300),var(--brand-50))]` — never literal hexes — EXCEPT the photography-recede stand-in, whose off-brand hexes are deliberate (it simulates arbitrary photography).
- pnpm-only, `async`/`await` style, single-quoted imports, 2-space indent (Biome enforces; run `pnpm --filter @sevendays/landing fix` if formatting complains).

## File Structure

- Create: `packages/ui/src/tokens-92.css` — the candidate token layer (fixed points, ramp, states, muted text, chart, atmosphere, shadcn semantic shadow, `@theme inline` additions). One responsibility: define candidate values; wins by cascade order.
- Modify: `packages/ui/package.json` — add the `./tokens-92.css` export.
- Modify: `apps/landing/src/styles.css`, `apps/admin/src/styles.css` — one import line each, placed last so the candidate wins every cascade conflict.
- Replace: `apps/landing/src/routes/prototype-tokens.tsx` — the #92 showcase frame and token sections (the #57 preset-mapping showcase it replaces is preserved in git history; its judgment closed with #57).
- Create: `apps/landing/src/components/prototype/atmosphere-variants.tsx` — the three full-bleed atmosphere bands + photography-recede test (kept out of `routes/` so route generation ignores it).
- Create: `apps/landing/src/components/prototype/admin-neutral.tsx` — the tool-neutral admin strip (sidebar mock + flat card).
- Regenerated by build: `apps/landing/src/routeTree.gen.ts` (route path unchanged; committed only if the build touches it).

---

### Task 1: Candidate token layer in packages/ui, imported by both apps

**Files:**
- Create: `packages/ui/src/tokens-92.css`
- Modify: `packages/ui/package.json` (exports)
- Modify: `apps/landing/src/styles.css` (add one import line)
- Modify: `apps/admin/src/styles.css` (add one import line)

**Interfaces:**
- Consumes: the fixed hexes from #90 (pinned verbatim in Global Constraints); the interim `tokens.css` (untouched — the candidate shadows it).
- Produces: `@sevendays/ui/tokens-92.css` export. Downstream tasks rely on: semantic utilities re-resolving to candidate values (`bg-primary`, `text-muted-foreground`, `bg-sidebar`, `bg-chart-1..5`, …), and NEW utilities `bg-brand-50…900`, `bg-brand-ink`, `bg-brand-deep`, `bg-brand-primary`, `bg-brand-primary-hover`, `bg-brand-primary-active`, `ring-brand-focus-ring`, `text-muted-text`, `bg-wash-base`, `bg-wash-a`, `bg-wash-b`, `bg-surface-glass`, `bg-surface-strong`, `border-line-soft`.

- [ ] **Step 1: Verify the pinned literals with the conversion script**

Write `/tmp/92-verify.mjs` (this is the plan's runnable proof of the oklch table and AA pair rules — run it from anywhere; it is standalone):

```js
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const sT = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const lT = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
const hexToRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const rgbToHex = ([r, g, b]) => '#' + [r, g, b].map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0')).join('');
const oklchToHex = (L, C, H) => { const rad = H * Math.PI / 180; const a = C * Math.cos(rad), b = C * Math.sin(rad);
  const l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s_ = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return rgbToHex([4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_, -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_, -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_].map(lT)); };
const lum = (h) => { const [r, g, b] = hexToRgb(h).map(sT); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
const blend = (fg, alpha, bg) => { const f = hexToRgb(fg), b2 = hexToRgb(bg); return rgbToHex(f.map((c, i) => c * alpha + b2[i] * (1 - alpha))); };

const fixed = [
  ['brand-primary', '#06708e', 0.5076, 0.09475, 225.078],
  ['brand-ink', '#0e131a', 0.185, 0.0164, 256.833],
  ['brand-deep', '#084257', 0.3553, 0.06561, 228.722],
  ['brand-gray-light', '#dedede', 0.9006, 0, 89.876],
  ['brand-gray-mid', '#7e7f7f', 0.5956, 0.0012, 197.124],
  ['brand-gray-cool', '#afb8ba', 0.7761, 0.01046, 212.527],
];
for (const [name, hex, L, C, H] of fixed) {
  const back = oklchToHex(L, C, H);
  console.log(name.padEnd(17), hex, '->', back, back === hex.toLowerCase() ? 'RT-OK' : 'RT-FAIL');
}
const ramp = [['50', 0.97, 0.012, '#edf7fb'], ['100', 0.945, 0.02, '#dff0f7'], ['200', 0.9, 0.032, '#c9e3ee'], ['300', 0.84, 0.05, '#a8d2e3'], ['400', 0.7, 0.075, '#69a9c2'], ['500', 0.6, 0.09, '#398ba9'], ['700', 0.42, 0.08, '#00566e'], ['800', 0.355, 0.0656, '#034356'], ['900', 0.28, 0.05, '#042e3b']];
for (const [step, L, C, hex] of ramp) console.log('brand-' + step.padEnd(4), oklchToHex(L, C, 225.078), 'expect', hex, oklchToHex(L, C, 225.078) === hex ? 'OK' : 'DIFFERS');
const mt = oklchToHex(0.52, 0.0012, 197.1);
console.log('muted-text', mt, 'expect #686969', mt === '#686969' ? 'OK' : 'DIFFERS');
for (const s of ['#ffffff', '#f1f8fb', '#e9f6fb', '#dff0f7', '#d9eef6']) console.log('  muted on', s, contrast(mt, s).toFixed(2));
console.log('white on primary', contrast('#ffffff', '#06708e').toFixed(2));
console.log('white on deep', contrast('#ffffff', '#084257').toFixed(2));
console.log('ink on gray-light', contrast('#0e131a', '#dedede').toFixed(2));
console.log('ink on glass-over-deep', contrast('#0e131a', blend('#ffffff', 0.74, '#084257')).toFixed(2));
console.log('white-85 on deep', contrast(blend('#ffffff', 0.85, '#084257'), '#084257').toFixed(2));
```

Run: `node /tmp/92-verify.mjs`

Expected output (every line must match; any RT-FAIL or DIFFERS stops the task — recompute before proceeding, do not hand-wave):

```text
brand-primary     #06708e -> #06708e RT-OK
brand-ink         #0e131a -> #0e131a RT-OK
brand-deep        #084257 -> #084257 RT-OK
brand-gray-light  #dedede -> #dedede RT-OK
brand-gray-mid    #7e7f7f -> #7e7f7f RT-OK
brand-gray-cool   #afb8ba -> #afb8ba RT-OK
brand-50   #edf7fb expect #edf7fb OK
brand-100  #dff0f7 expect #dff0f7 OK
brand-200  #c9e3ee expect #c9e3ee OK
brand-300  #a8d2e3 expect #a8d2e3 OK
brand-400  #69a9c2 expect #69a9c2 OK
brand-500  #398ba9 expect #398ba9 OK
brand-700  #00566e expect #00566e OK
brand-800  #034356 expect #034356 OK
brand-900  #042e3b expect #042e3b OK
muted-text #686969 expect #686969 OK
  muted on #ffffff 5.51
  muted on #f1f8fb 5.13
  muted on #e9f6fb 4.99
  muted on #dff0f7 4.71
  muted on #d9eef6 4.59
white on primary 5.65
white on deep 10.90
ink on gray-light 13.85
ink on glass-over-deep 11.52
white-85 on deep 8.36
```

- [ ] **Step 2: Create `packages/ui/src/tokens-92.css` with exactly this content**

```css
/* PROTOTYPE (wayfinder #92) — candidate token layer built from the owner's
   logo palette (decision #90). Throwaway: this file never merges to main;
   the milestone spec (#61) adopts the values, not the file. It shadows the
   interim preset layer (tokens.css, preset b1uGsTYZ6) by redefining the
   same-named shadcn custom properties later in the cascade — imported
   AFTER tokens.css in each app's styles.css. Dark mode is parked for v1:
   no .dark block here; tokens.css's .dark stays as-found. */

:root {
  /* — Fixed brand points (#90; hexes are canonical, oklch conversions
       round-trip verified to the identical rendered color) — */
  --brand-primary: oklch(0.5076 0.09475 225.078); /* #06708e */
  --brand-ink: oklch(0.185 0.0164 256.833); /* #0e131a */
  --brand-deep: oklch(0.3553 0.06561 228.722); /* #084257 */
  --brand-gray-light: oklch(0.9006 0 89.876); /* #dedede */
  --brand-gray-mid: oklch(0.5956 0.0012 197.124); /* #7e7f7f */
  --brand-gray-cool: oklch(0.7761 0.01046 212.527); /* #afb8ba */

  /* — Derived brand ramp (adds tones around primary; hue held at primary's
       225.078, chroma peaking at 600; 600 IS the fixed primary; deep petrol
       stays its own fixed token — different hue, not ramp-800) — */
  --brand-50: oklch(0.97 0.012 225.078); /* #edf7fb */
  --brand-100: oklch(0.945 0.02 225.078); /* #dff0f7 */
  --brand-200: oklch(0.9 0.032 225.078); /* #c9e3ee */
  --brand-300: oklch(0.84 0.05 225.078); /* #a8d2e3 */
  --brand-400: oklch(0.7 0.075 225.078); /* #69a9c2 */
  --brand-500: oklch(0.6 0.09 225.078); /* #398ba9 */
  --brand-600: var(--brand-primary); /* #06708e */
  --brand-700: oklch(0.42 0.08 225.078); /* #00566e */
  --brand-800: oklch(0.355 0.0656 225.078); /* #034356 */
  --brand-900: oklch(0.28 0.05 225.078); /* #042e3b */

  /* — Derived interaction states (adds only) — */
  --brand-primary-hover: var(--brand-700); /* #00566e, white on it 8.22:1 */
  --brand-primary-active: var(--brand-800); /* #034356, white on it 10.82:1 */
  --brand-focus-ring: var(--brand-400); /* #69a9c2, non-text indicator */
  --muted-text: oklch(0.52 0.0012 197.1); /* #686969, 4.59:1 on the darkest wash */

  /* — Landing atmosphere defaults (functional names) — */
  --wash-base: oklch(0.975 0.008 225.078); /* #f1f8fb */
  --wash-a: oklch(0.965 0.015 225.078); /* #e9f6fb */
  --wash-b: oklch(0.935 0.025 225.078); /* #d9eef6 */
  --surface-glass: oklch(1 0 0 / 74%); /* white glass over wash */
  --surface-strong: oklch(1 0 0 / 90%);
  --line-soft: oklch(0.7761 0.01046 212.527 / 50%); /* cool-gray hairline */

  /* — shadcn semantic layer, candidate mapping (same names as tokens.css;
       cascade order makes these win) — */
  --background: var(--wash-base);
  --foreground: var(--brand-ink);
  --card: oklch(1 0 0);
  --card-foreground: var(--brand-ink);
  --popover: oklch(1 0 0);
  --popover-foreground: var(--brand-ink);
  --primary: var(--brand-primary);
  --primary-foreground: oklch(1 0 0);
  --secondary: var(--brand-gray-light); /* ink on it 13.85:1 */
  --secondary-foreground: var(--brand-ink);
  --muted: var(--brand-100); /* ink on it 15.93:1 */
  --muted-foreground: var(--muted-text);
  --accent: var(--brand-100);
  --accent-foreground: var(--brand-ink);
  --destructive: oklch(0.577 0.245 27.325); /* shadcn default, carried — only warm semantic */
  --border: var(--brand-gray-cool);
  --input: var(--brand-gray-cool);
  --ring: var(--brand-focus-ring);
  --chart-1: var(--brand-300);
  --chart-2: var(--brand-400);
  --chart-3: var(--brand-600);
  --chart-4: var(--brand-700);
  --chart-5: var(--brand-800);
  --radius: 0.625rem; /* unchanged from interim preset — #92 decides color, not shape */
  --sidebar: oklch(1 0 0); /* admin tool-neutral */
  --sidebar-foreground: var(--brand-ink);
  --sidebar-primary: var(--brand-primary);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: var(--brand-gray-light);
  --sidebar-accent-foreground: var(--brand-ink);
  --sidebar-border: var(--brand-gray-cool);
  --sidebar-ring: var(--brand-focus-ring);
}

@theme inline {
  --color-brand-primary: var(--brand-primary);
  --color-brand-ink: var(--brand-ink);
  --color-brand-deep: var(--brand-deep);
  --color-brand-gray-light: var(--brand-gray-light);
  --color-brand-gray-mid: var(--brand-gray-mid);
  --color-brand-gray-cool: var(--brand-gray-cool);
  --color-brand-50: var(--brand-50);
  --color-brand-100: var(--brand-100);
  --color-brand-200: var(--brand-200);
  --color-brand-300: var(--brand-300);
  --color-brand-400: var(--brand-400);
  --color-brand-500: var(--brand-500);
  --color-brand-600: var(--brand-600);
  --color-brand-700: var(--brand-700);
  --color-brand-800: var(--brand-800);
  --color-brand-900: var(--brand-900);
  --color-brand-primary-hover: var(--brand-primary-hover);
  --color-brand-primary-active: var(--brand-primary-active);
  --color-brand-focus-ring: var(--brand-focus-ring);
  --color-muted-text: var(--muted-text);
  --color-wash-base: var(--wash-base);
  --color-wash-a: var(--wash-a);
  --color-wash-b: var(--wash-b);
  --color-surface-glass: var(--surface-glass);
  --color-surface-strong: var(--surface-strong);
  --color-line-soft: var(--line-soft);
}
```

- [ ] **Step 3: Export it from the package**

In `packages/ui/package.json`, extend `exports` (keep the existing entries untouched, key order as shown):

```json
"exports": {
  "./globals.css": "./src/globals.css",
  "./tokens.css": "./src/tokens.css",
  "./tokens-92.css": "./src/tokens-92.css"
}
```

- [ ] **Step 4: Import it last in both apps**

In `apps/landing/src/styles.css`, add after the last existing `@import` line (`@import "@fontsource-variable/figtree";`, currently line 6):

```css
@import "@sevendays/ui/tokens-92.css";
```

In `apps/admin/src/styles.css`, add after its last existing `@import` line (`@import "@fontsource-variable/figtree";`, currently line 5), the same line. Placing it last is load-bearing: the candidate must come after `tokens.css` AND `shadcn/tailwind.css` in the cascade so its `:root` definitions win.

- [ ] **Step 5: Build both apps and confirm the candidate landed in the output**

```bash
pnpm --filter @sevendays/landing build && pnpm --filter @sevendays/admin build
```

Expected: both succeed. Then confirm the candidate's literals survive into built CSS (admin building green is itself the admin-derivability gate):

```bash
find apps/landing/.output apps/landing/dist -name '*.css' 2>/dev/null | head -5
# grep the found asset(s): expect a hit for the primary L component and the wash hue
grep -l '5076' <found css files>
grep -l '225.078' <found css files> || grep -l '225\\.078' <found css files>
```

Expected: at least one built CSS file contains both `5076` (candidate primary lightness) and `225.078` (candidate hue). Minifiers may rewrite `0.5076` as `.5076` — grep the digits only. If the find pattern matches nothing (output layout varies), the Task 3 render smoke is the fallback proof — note it and move on.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/tokens-92.css packages/ui/package.json apps/landing/src/styles.css apps/admin/src/styles.css
git commit -m "prototype(#92): candidate token layer from the logo palette

fixed six hexes in round-trip-verified oklch + derived ramp/states/
muted-text/chart/atmosphere; shadows interim preset via cascade order;
imported by both apps (admin build = derivability gate)"
```

### Task 2: Atmosphere variants + admin tool-neutral section components

**Files:**
- Create: `apps/landing/src/components/prototype/atmosphere-variants.tsx`
- Create: `apps/landing/src/components/prototype/admin-neutral.tsx`

**Interfaces:**
- Consumes: utilities from Task 1 (`bg-brand-*`, `bg-wash-*`, `bg-surface-glass`, `border-line-soft`, `text-muted-text`, `text-brand-700`, semantic utilities) — no props; these are presentational sections.
- Produces: `AtmosphereVariants()` and `AdminNeutralStrip()` (named exports, no props) that Task 3's route imports from `../components/prototype/atmosphere-variants` and `../components/prototype/admin-neutral`. Markers `data-92-variant-a/b/c`, `data-92-recede`, `data-92-admin` are what Task 3's smoke test greps for. Components live under `src/components/prototype/` (not `routes/`) so TanStack route generation ignores them.

Art-direction notes (from the ui-ux-pro-max / banner-design pass, 2026-09-14): the three variants map to recognizable directions — A ≈ glassmorphism/gradient, B ≈ editorial photo-depth, C ≈ minimalist neutral — so the owner's reaction can anchor on a named style, not just "lighter vs darker". Each band stays text-lean with one media slot (ui-ux-pro-max's photography-studio anti-pattern: "heavy text + poor image showcase"). Banner rules applied where they fit web heroes: safe zone (content sits in the centered `max-w-5xl` column), one primary CTA per band (secondary is a ghost), headline ≥32px (`text-4xl` = 36px), 4.5:1 contrast (measured pairs). Banner rules deliberately superseded: max-2-typefaces (the owner's trio is a fixed #90/#57 input and demonstrating its harmony is a #92 quality bar), 44px CTA height (ad-banner rule; the system ships shadcn defaults per #90's quality bar).

- [ ] **Step 1: Create `apps/landing/src/components/prototype/atmosphere-variants.tsx` with exactly this content**

```tsx
// PROTOTYPE (throwaway) — wayfinder #92: landing atmosphere variants.
// Three full-bleed bands rebuild the gradient-wash + layered-surfaces
// pattern on the logo palette, plus a photography-recede test. Delete
// when the design-system milestone work lands.
export function AtmosphereVariants() {
  return (
    <section className='mt-12' data-92-variants>
      <div className='mx-auto max-w-5xl px-6'>
        <h2 className='text-foreground font-serif text-2xl font-semibold'>
          Landing atmosphere — three variants
        </h2>
        <p className='text-muted-foreground mt-2 max-w-prose'>
          Same token layer, three readings of the gradient-wash + layered-surfaces
          pattern. React to the pattern direction: typography and components are
          identical across bands, so only the atmosphere differs.
        </p>
      </div>

      {/* Variant A — light wash led */}
      <div
        data-92-variant-a
        className='border-line-soft mt-6 border-y bg-[linear-gradient(180deg,var(--wash-base),var(--wash-a)_60%,var(--wash-b))]'
      >
        <div className='mx-auto flex max-w-5xl flex-col gap-8 px-6 py-14 md:flex-row md:items-center'>
          <div className='flex-1'>
            <p className='text-brand-700 font-mono text-xs font-bold tracking-[0.16em] uppercase'>
              A · wash-light
            </p>
            <h3 className='text-brand-ink mt-3 font-serif text-4xl font-bold'>
              Photography that takes seven days, not seven weeks.
            </h3>
            <p className='text-muted-text mt-3 max-w-prose'>
              The page stays near-white; the wash deepens toward the fold and cards
              sit on it as glass. Airiest reading — closest to a gallery wall.
            </p>
            <div className='mt-5 flex flex-wrap gap-3'>
              <button
                type='button'
                className='bg-brand-600 hover:bg-brand-primary-hover focus-visible:ring-brand-focus-ring rounded-md px-4 py-2 text-sm font-medium text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
              >
                Book a session
              </button>
              <button
                type='button'
                className='border-line-soft bg-surface-glass text-brand-ink rounded-md border px-4 py-2 text-sm font-medium'
              >
                View packages
              </button>
            </div>
          </div>
          <div className='border-line-soft bg-surface-glass w-full rounded-xl border p-4 shadow-sm md:w-80'>
            <div className='h-36 rounded-lg bg-[linear-gradient(135deg,var(--brand-500),var(--brand-300),var(--brand-50))]' />
            <p className='text-brand-ink mt-3 text-sm font-semibold'>Signature Portrait</p>
            <p className='text-muted-text text-sm'>₱3,500 · 90 minutes · 20 photos</p>
          </div>
        </div>
      </div>

      {/* Variant B — deep petrol led */}
      <div data-92-variant-b className='bg-brand-deep'>
        <div className='mx-auto flex max-w-5xl flex-col gap-8 px-6 py-14 md:flex-row md:items-center'>
          <div className='flex-1'>
            <p className='font-mono text-xs font-bold tracking-[0.16em] text-white/85 uppercase'>
              B · deep-led
            </p>
            <h3 className='mt-3 font-serif text-4xl font-bold text-white'>
              Studio depth behind every frame.
            </h3>
            <p className='mt-3 max-w-prose text-white/85'>
              Hero and footer carry the deep petrol band; the page opens dark and
              settles into light sections. Strongest contrast reading.
            </p>
            <div className='mt-5 flex flex-wrap gap-3'>
              <button
                type='button'
                className='rounded-md bg-white px-4 py-2 text-sm font-medium text-brand-deep hover:bg-white/90'
              >
                Book a session
              </button>
              <button
                type='button'
                className='rounded-md border border-white/30 px-4 py-2 text-sm font-medium text-white'
              >
                View packages
              </button>
            </div>
          </div>
          <div className='w-full rounded-xl border border-white/20 bg-surface-glass p-4 shadow-sm md:w-80'>
            <div className='h-36 rounded-lg bg-[linear-gradient(135deg,var(--brand-400),var(--brand-600),var(--brand-deep))]' />
            <p className='text-brand-ink mt-3 text-sm font-semibold'>Signature Portrait</p>
            <p className='text-brand-ink text-sm'>₱3,500 · 90 minutes · 20 photos</p>
          </div>
        </div>
      </div>

      {/* Variant C — tinted neutral led */}
      <div data-92-variant-c className='bg-brand-gray-light'>
        <div className='mx-auto flex max-w-5xl flex-col gap-8 px-6 py-14 md:flex-row md:items-center'>
          <div className='flex-1'>
            <p className='text-brand-700 font-mono text-xs font-bold tracking-[0.16em] uppercase'>
              C · neutral-tint
            </p>
            <h3 className='text-brand-ink mt-3 font-serif text-4xl font-bold'>
              Quiet mats, let the photos speak.
            </h3>
            <p className='text-brand-700 mt-3 max-w-prose'>
              The light neutral does the work: matted gray sections, white content
              cards, cool hairlines. Softest, most tonal reading.
            </p>
            <div className='mt-5 flex flex-wrap gap-3'>
              <button
                type='button'
                className='bg-brand-600 hover:bg-brand-primary-hover focus-visible:ring-brand-focus-ring rounded-md px-4 py-2 text-sm font-medium text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
              >
                Book a session
              </button>
              <button
                type='button'
                className='border-brand-gray-cool bg-card text-brand-ink rounded-md border px-4 py-2 text-sm font-medium'
              >
                View packages
              </button>
            </div>
          </div>
          <div className='border-brand-gray-cool bg-card w-full rounded-xl border p-4 shadow-sm md:w-80'>
            <div className='bg-brand-100 h-36 rounded-lg' />
            <p className='text-brand-ink mt-3 text-sm font-semibold'>Signature Portrait</p>
            <p className='text-muted-text text-sm'>₱3,500 · 90 minutes · 20 photos</p>
          </div>
        </div>
      </div>

      {/* Photography recede test — deliberately warm/cool busy stand-in */}
      <div data-92-recede>
        <div className='mx-auto max-w-5xl px-6'>
          <p className='text-brand-700 mt-10 font-mono text-xs font-bold tracking-[0.16em] uppercase'>
            Recede test · surfaces over photography
          </p>
          <div className='relative mt-3 h-64 overflow-hidden rounded-xl bg-[linear-gradient(120deg,#31576b,#b98a5f,#274050,#d9c9a8)]'>
            <div className='absolute inset-y-0 left-0 w-1/2 bg-wash-b/60' />
            <div className='border-line-soft bg-surface-glass absolute top-1/2 left-1/2 w-64 -translate-x-1/2 -translate-y-1/2 rounded-lg border p-4 shadow-sm'>
              <p className='text-brand-ink text-sm font-semibold'>Glass panel</p>
              <p className='text-brand-ink text-xs'>Ink text stays AA on glass over any photo.</p>
            </div>
            <div className='bg-card border-brand-gray-cool absolute right-6 bottom-6 rounded-lg border p-3 shadow-sm'>
              <p className='text-brand-ink text-sm font-semibold'>White card</p>
              <p className='text-muted-text text-xs'>Solid surface, full contrast.</p>
            </div>
          </div>
          <p className='text-muted-foreground mt-2 text-xs'>
            Gradient stands in for photography (busy, warm-inclusive on purpose):
            the cool washes and neutral surfaces should sit in front of it without
            fighting it.
          </p>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create `apps/landing/src/components/prototype/admin-neutral.tsx` with exactly this content**

```tsx
// PROTOTYPE (throwaway) — wayfinder #92: admin tool-neutral strip.
// Flat shadcn surfaces; brand reduced to wordmark + primary. Delete when
// the design-system milestone work lands.
export function AdminNeutralStrip() {
  return (
    <section className='mx-auto mt-10 max-w-5xl px-6' data-92-admin>
      <h2 className='text-foreground font-serif text-2xl font-semibold'>
        Admin — tool-neutral
      </h2>
      <p className='text-muted-foreground mt-2 max-w-prose'>
        Flat shadcn surfaces; the brand appears only as wordmark and primary.
        Sidebar mapping comes from the candidate token layer.
      </p>

      <div className='border-border mt-4 grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-[16rem_1fr]'>
        <aside className='border-sidebar-border bg-sidebar rounded-lg border p-3'>
          <div className='bg-sidebar-primary text-sidebar-primary-foreground rounded-md px-3 py-2 font-semibold'>
            Sevendays Admin
          </div>
          <nav className='mt-3 flex flex-col gap-1'>
            <span className='bg-sidebar-accent text-sidebar-accent-foreground rounded-md px-3 py-2 text-sm font-medium'>
              Dashboard
            </span>
            <span className='text-sidebar-foreground rounded-md px-3 py-2 text-sm'>
              Appointments
            </span>
            <span className='text-sidebar-foreground rounded-md px-3 py-2 text-sm'>
              Catalog
            </span>
            <span className='text-sidebar-foreground rounded-md px-3 py-2 text-sm'>
              Branches
            </span>
            <span className='text-sidebar-foreground rounded-md px-3 py-2 text-sm'>
              Settings
            </span>
          </nav>
        </aside>

        <div className='flex flex-col gap-4'>
          <div className='grid grid-cols-3 gap-3'>
            <div className='border-border rounded-lg border p-3'>
              <p className='text-muted-foreground text-xs'>Today</p>
              <p className='text-foreground font-mono text-2xl font-semibold'>14</p>
            </div>
            <div className='border-border rounded-lg border p-3'>
              <p className='text-muted-foreground text-xs'>This week</p>
              <p className='text-foreground font-mono text-2xl font-semibold'>86</p>
            </div>
            <div className='border-border rounded-lg border p-3'>
              <p className='text-muted-foreground text-xs'>Unconfirmed</p>
              <p className='text-primary font-mono text-2xl font-semibold'>5</p>
            </div>
          </div>

          <div className='border-border rounded-lg border'>
            <div className='border-border border-b px-4 py-3'>
              <p className='text-foreground text-sm font-semibold'>Upcoming appointments</p>
            </div>
            <ul className='divide-border divide-y'>
              <li className='text-foreground flex items-center justify-between px-4 py-2.5 text-sm'>
                <span>Signature Portrait · Makati</span>
                <span className='flex items-center gap-3'>
                  <span className='text-muted-foreground font-mono text-xs'>14:00</span>
                  <span className='bg-primary text-primary-foreground rounded-full px-2.5 py-0.5 text-xs font-medium'>
                    Confirmed
                  </span>
                </span>
              </li>
              <li className='text-foreground flex items-center justify-between px-4 py-2.5 text-sm'>
                <span>Family Session · Quezon City</span>
                <span className='flex items-center gap-3'>
                  <span className='text-muted-foreground font-mono text-xs'>16:30</span>
                  <span className='bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5 text-xs font-medium'>
                    Pending
                  </span>
                </span>
              </li>
              <li className='text-foreground flex items-center justify-between px-4 py-2.5 text-sm'>
                <span>Couple Shoot · BGC</span>
                <span className='flex items-center gap-3'>
                  <span className='text-muted-foreground font-mono text-xs'>18:00</span>
                  <span className='rounded-full bg-destructive px-2.5 py-0.5 text-xs font-medium text-white'>
                    No-show
                  </span>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: green (the components are unreferenced until Task 3 but covered by `tsc`; Biome style — single quotes, no unused vars — is pre-applied in the pinned code). If formatting fails: `pnpm fix`, re-run, include fixups in this task's commit.

- [ ] **Step 4: Commit**

```bash
git add apps/landing/src/components/prototype
git commit -m "prototype(#92): atmosphere variants (A/B/C + recede test) and admin tool-neutral strip"
```

### Task 3: Replace the /prototype-tokens showcase route

**Files:**
- Replace: `apps/landing/src/routes/prototype-tokens.tsx` (the #57 preset-mapping showcase is preserved in git history; its judgment closed with #57)
- Regenerate (commit only if changed): `apps/landing/src/routeTree.gen.ts`

**Interfaces:**
- Consumes: `SiteHeader` from `../components/site-header` (real header renders in candidate semantics); `AtmosphereVariants` from `../components/prototype/atmosphere-variants`; `AdminNeutralStrip` from `../components/prototype/admin-neutral`; all Task 1 utilities.
- Produces: route `/prototype-tokens` rendering the #92 reaction surface. Marker `data-92-frame` is the smoke-test root marker. Route path is unchanged so `routeTree.gen.ts` should not change.

- [ ] **Step 1: Overwrite `apps/landing/src/routes/prototype-tokens.tsx` with exactly this content**

```tsx
// PROTOTYPE (throwaway) — wayfinder #92: logo palette → token layer +
// landing atmosphere. Renders the #90 fixed hexes as round-trip-verified
// oklch tokens, the derived ramp/states/chart, semantic components, the
// admin tool-neutral strip, and three atmosphere variants — for owner
// reaction. Not linked from any nav. Delete this file when the
// design-system milestone work lands.
import { createFileRoute } from '@tanstack/react-router';
import { AdminNeutralStrip } from '../components/prototype/admin-neutral';
import { AtmosphereVariants } from '../components/prototype/atmosphere-variants';
import { SiteHeader } from '../components/site-header';

export const Route = createFileRoute('/prototype-tokens')({
  component: PrototypeTokensPage,
});

function PrototypeTokensPage() {
  return (
    <div className='bg-background min-h-screen pb-24' data-92-frame>
      <SiteHeader />

      <header className='mx-auto mt-10 max-w-5xl px-6'>
        <p className='text-brand-700 font-mono text-xs font-bold tracking-[0.16em] uppercase'>
          Wayfinder #92 · Logo palette → candidate tokens
        </p>
        <h1 className='text-foreground mt-2 font-serif text-5xl font-bold'>
          Sevendays Photography
        </h1>
        <p className='text-foreground mt-3 max-w-prose'>
          Headings render in Roboto Slab via <code>font-serif</code>; body copy in
          Figtree via <code>font-sans</code>; labels in Geist Mono via{' '}
          <code>font-mono</code>. The six logo hexes are fixed points; everything
          else on this page is derived from them. React to the derivation and the
          atmosphere, not to individual hex values.
        </p>
      </header>

      <section className='mx-auto mt-10 max-w-5xl px-6'>
        <h2 className='text-foreground font-serif text-2xl font-semibold'>
          Fixed brand points (#90 — never nudged)
        </h2>
        <div className='mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6'>
          <Swatch cls='bg-brand-primary' label='primary' sub='#06708e · white 5.65:1' />
          <Swatch cls='bg-brand-ink' label='ink' sub='#0e131a · 18.64:1 on white' />
          <Swatch cls='bg-brand-deep' label='deep petrol' sub='#084257 · white 10.90:1' />
          <Swatch cls='bg-brand-gray-light' label='light neutral' sub='#dedede · ink 13.85:1' />
          <Swatch cls='bg-brand-gray-mid' label='mid gray' sub='#7e7f7f · large text only' />
          <Swatch cls='bg-brand-gray-cool' label='cool gray' sub='#afb8ba · borders, inputs' />
        </div>
        <p className='text-muted-foreground mt-2 text-xs'>
          Each token stores its hex as the canonical comment beside a
          full-precision oklch conversion that round-trips to the identical color.
        </p>
      </section>

      <section className='mx-auto mt-10 max-w-5xl px-6'>
        <h2 className='text-foreground font-serif text-2xl font-semibold'>
          Derived ramp — brand 50–900
        </h2>
        <div className='mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-10'>
          <Swatch cls='bg-brand-50' label='50' sub='#edf7fb' />
          <Swatch cls='bg-brand-100' label='100' sub='#dff0f7' />
          <Swatch cls='bg-brand-200' label='200' sub='#c9e3ee' />
          <Swatch cls='bg-brand-300' label='300' sub='#a8d2e3' />
          <Swatch cls='bg-brand-400' label='400' sub='#69a9c2' />
          <Swatch cls='bg-brand-500' label='500' sub='#398ba9' />
          <Swatch cls='bg-brand-600' label='600' sub='primary · 5.65:1' />
          <Swatch cls='bg-brand-700' label='700' sub='hover · 8.22:1' />
          <Swatch cls='bg-brand-800' label='800' sub='#034356 · 10.82:1' />
          <Swatch cls='bg-brand-900' label='900' sub='#042e3b' />
        </div>
        <p className='text-muted-foreground mt-2 text-xs'>
          Hue held at the primary's 225.078; chroma peaks at 600. 600 IS the fixed
          primary. Deep petrol keeps its own token (its hue is 228.722 — a sibling,
          not a ramp step).
        </p>
      </section>

      <section className='mx-auto mt-10 max-w-5xl px-6'>
        <h2 className='text-foreground font-serif text-2xl font-semibold'>
          Interaction states + muted text
        </h2>
        <div className='mt-4 flex flex-wrap items-center gap-3'>
          <button
            type='button'
            className='bg-brand-600 hover:bg-brand-primary-hover focus-visible:ring-brand-focus-ring rounded-md px-4 py-2 text-sm font-medium text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
          >
            Default · hover to 700
          </button>
          <button
            type='button'
            className='bg-brand-primary-hover rounded-md px-4 py-2 text-sm font-medium text-white'
          >
            Hover value (700)
          </button>
          <button
            type='button'
            className='bg-brand-primary-active rounded-md px-4 py-2 text-sm font-medium text-white'
          >
            Active value (800)
          </button>
          <a
            href='#'
            className='text-brand-700 text-sm font-medium underline underline-offset-4'
          >
            Link (700 · 8.22:1)
          </a>
          <input
            aria-label='Focus ring demo'
            type='text'
            placeholder='Focus me: ring = 400'
            className='border-input bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-ring rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none'
          />
        </div>
        <div className='border-border mt-4 grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2'>
          <p className='text-muted-text text-sm'>
            Muted text on white card — #686969, 5.51:1. Derived darker than the
            logo's mid gray (#7e7f7f, ~4.0:1 — small-text fail).
          </p>
          <p className='bg-wash-b text-muted-text rounded-lg p-3 text-sm'>
            Same muted text on the darkest wash — still 4.59:1. The derivation
            targets the wash, not white, because the atmosphere sets text on washes.
          </p>
        </div>
      </section>

      <section className='mx-auto mt-10 max-w-5xl px-6'>
        <h2 className='text-foreground font-serif text-2xl font-semibold'>
          Semantic components (candidate mapping)
        </h2>
        <div className='mt-4 flex flex-wrap items-center gap-3'>
          <button
            type='button'
            className='bg-primary text-primary-foreground focus-visible:ring-ring rounded-md px-4 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
          >
            Book now
          </button>
          <button
            type='button'
            className='bg-secondary text-secondary-foreground rounded-md px-4 py-2 text-sm font-medium'
          >
            Secondary
          </button>
          <button
            type='button'
            className='border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground rounded-md border px-4 py-2 text-sm font-medium'
          >
            Outline
          </button>
          <button
            type='button'
            className='text-foreground hover:bg-accent hover:text-accent-foreground rounded-md px-4 py-2 text-sm font-medium'
          >
            Ghost
          </button>
          <button
            type='button'
            className='rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white'
          >
            Destructive (shadcn default)
          </button>
          <button
            type='button'
            disabled
            className='bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium opacity-50'
          >
            Disabled
          </button>
        </div>

        <div className='mt-6 grid gap-6 md:grid-cols-2'>
          <article className='bg-card text-card-foreground flex flex-col gap-3 rounded-xl border p-6 shadow-sm'>
            <div className='bg-secondary aspect-[4/3] rounded-lg' />
            <h3 className='font-serif text-2xl font-semibold'>Signature Portrait</h3>
            <p className='text-foreground text-lg font-semibold'>₱3,500</p>
            <p className='text-muted-foreground text-sm'>
              A 90-minute session at any branch: one outfit change, guided posing,
              and twenty hand-edited photos delivered in seven days.
            </p>
            <button
              type='button'
              className='bg-primary text-primary-foreground mt-2 rounded-md px-4 py-2 text-center text-sm font-medium'
            >
              Book now
            </button>
          </article>

          <div className='flex flex-col gap-4'>
            <div className='flex flex-col gap-2'>
              <label htmlFor='proto-name' className='text-foreground text-sm font-medium'>
                Full name
              </label>
              <input
                id='proto-name'
                type='text'
                placeholder='Juan dela Cruz'
                className='border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none'
              />
              <p className='text-muted-foreground text-xs'>
                Helper text in muted-foreground (derived #686969).
              </p>
            </div>
            <div className='flex flex-col gap-2'>
              <label htmlFor='proto-email' className='text-foreground text-sm font-medium'>
                Email
              </label>
              <input
                id='proto-email'
                type='email'
                defaultValue='not-an-email'
                className='rounded-md border border-destructive bg-background px-3 py-2 text-sm text-destructive focus-visible:ring-destructive focus-visible:ring-2 focus-visible:outline-none'
              />
              <p className='text-xs text-destructive'>Enter a valid email address.</p>
            </div>
            <div className='flex flex-wrap gap-2'>
              <span className='bg-primary text-primary-foreground rounded-full px-2.5 py-0.5 text-xs font-medium'>
                Confirmed
              </span>
              <span className='bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5 text-xs font-medium'>
                Pending
              </span>
              <span className='border-border text-foreground rounded-full border px-2.5 py-0.5 text-xs font-medium'>
                Walk-in
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className='mx-auto mt-10 max-w-5xl px-6'>
        <h2 className='text-foreground font-serif text-2xl font-semibold'>
          Chart ramp (mono-primary)
        </h2>
        <div className='bg-card border-border mt-4 flex h-40 items-end gap-3 rounded-xl border p-6'>
          <div className='bg-chart-1 h-3/5 w-full rounded-t-sm' title='chart-1 = brand-300' />
          <div className='bg-chart-2 h-2/5 w-full rounded-t-sm' title='chart-2 = brand-400' />
          <div className='bg-chart-3 h-4/5 w-full rounded-t-sm' title='chart-3 = brand-600' />
          <div className='bg-chart-4 h-3/5 w-full rounded-t-sm' title='chart-4 = brand-700' />
          <div className='bg-chart-5 h-2/5 w-full rounded-t-sm' title='chart-5 = brand-800' />
        </div>
        <p className='text-muted-foreground mt-2 text-xs'>
          chart-1…5 = brand-300 / 400 / 600 / 700 / 800 — one hue, five tones;
          multi-hue categoricals stay deferred (fog on the map).
        </p>
      </section>

      <AdminNeutralStrip />

      <AtmosphereVariants />

      <footer className='mx-auto mt-12 max-w-5xl border-t border-border px-6 pt-4'>
        <p className='text-muted-foreground text-xs'>
          Prototype for wayfinder #92 — logo palette → token layer + landing
          atmosphere, 2026-09-14. Throwaway: this route never ships. React to:
          ramp spacing, hover/active/ring choices, muted-text tone, semantic
          mapping, chart ramp, admin neutrality, and atmosphere variant A/B/C.
        </p>
      </footer>
    </div>
  );
}

function Swatch({ cls, label, sub }: { cls: string; label: string; sub: string }) {
  return (
    <figure>
      <div className={`border-border h-16 rounded-lg border ${cls}`} />
      <figcaption className='mt-1 text-xs'>
        <span className='text-foreground font-medium'>{label}</span>{' '}
        <span className='text-muted-foreground'>({sub})</span>
      </figcaption>
    </figure>
  );
}
```

- [ ] **Step 2: Build**

```bash
pnpm --filter @sevendays/landing build
```

Expected: success. If Biome formatting is enforced and fails, `pnpm --filter @sevendays/landing fix` and rebuild.

- [ ] **Step 3: Render smoke test**

```bash
pnpm --filter @sevendays/landing dev &
sleep 8
# note the port from the startup output if not the default; adjust URLs below
curl -s http://localhost:3000/prototype-tokens > /tmp/92-smoke.html
for marker in data-92-frame data-92-admin data-92-variant-a data-92-variant-b data-92-variant-c data-92-recede; do
  grep -o "$marker" /tmp/92-smoke.html | head -1
done
kill %1
```

Expected: all six markers print. The rendered HTML carries class names, not computed colors — Task 1's built-CSS grep is the proof the tokens generate; color judgment happens in the owner's browser.

- [ ] **Step 4: Commit**

```bash
git add apps/landing/src/routes/prototype-tokens.tsx
git commit -m "prototype(#92): /prototype-tokens showcase — fixed points, ramp, states, components, chart"
```

### Task 4: Full check, push, and ticket handover

**Files:**
- No new source files. Possibly formatting fixups across touched files.

**Interfaces:**
- Consumes: everything from Tasks 1–3.
- Produces: pushed branch `prototype/92-logo-tokens-atmosphere` on origin + a handover comment on issue #92. The ticket is **not** closed — it is HITL; it resolves when the owner reacts. The map (#55) is **not** edited at this stage.

- [ ] **Step 1: Repo-wide check**

```bash
pnpm check
```

Expected: lint, format, typecheck, test all green (`@sevendays/admin` test is a documented no-op — expected, not a failure). If formatting fails: `pnpm fix`, re-run `pnpm check`, commit fixups as `chore(#92): prototype check fixups`.

- [ ] **Step 2: Push the branch**

```bash
git push -u origin prototype/92-logo-tokens-atmosphere
```

- [ ] **Step 3: Post the handover comment on #92**

Stage the body as a temp file and verify the write (per wayfinder lessons):

```bash
cat > /tmp/92-handover.md <<'EOF'
## Prototype ready for reaction

Branch: `prototype/92-logo-tokens-atmosphere` (throwaway — nothing merges until the derivation is validated; main keeps the teal preset as interim)

**Run it:**
```bash
git worktree add .worktrees/92-logo-tokens-atmosphere prototype/92-logo-tokens-atmosphere 2>/dev/null || git -C .worktrees/92-logo-tokens-atmosphere pull
cd .worktrees/92-logo-tokens-atmosphere && pnpm install && pnpm --filter @sevendays/landing dev
```
Then open `/prototype-tokens` on the printed port.

**What it is:** the six logo hexes as round-trip-verified oklch fixed points (hex kept as canonical comment per token), plus derivation that only adds: brand ramp 50–900 (hue held at the primary's 225.078, 600 = primary), hover/active/focus states, an AA-safe muted text derived against the darkest wash (#686969 — 4.59:1 on wash-b, 5.51:1 on white), mono-primary chart ramp, and landing wash/surface tokens — mapped onto the shadcn semantic layer both apps import (admin build = the derivability gate). The showcase also renders the admin tool-neutral strip (flat shadcn, brand = wordmark + primary) and **three atmosphere variants** (A wash-light, B deep-led, C neutral-tint) plus a photography-recede test.

**React to:** ramp spacing (is 500→600→700 even?), hover 700 / active 800 / ring 400 choices, the muted-text tone, secondary/muted/accent mapping onto the gray family, chart ramp, admin neutrality, and — the main open call — **atmosphere variant A vs B vs C** (or a mix, e.g. B hero + A body).

**Iterate:** say the word in this ticket; the branch adjusts values and re-renders. AA pair table for any new text/surface combo is in the plan (`docs/superpowers/plans/2026-09-14-92-logo-palette-tokens-atmosphere-prototype.md` on the branch) with a standalone verify script.

Ticket stays open until the owner reacts (HITL).
EOF
gh issue comment 92 --body-file /tmp/92-handover.md
gh api repos/jeius/sevendays/issues/92/comments --jq '.[-1].body' | head -5
```

Expected: the read-back shows the comment body. Do **not** close the ticket and do **not** edit the map's Decisions-so-far — the resolution comment and map pointer happen after the owner reacts.

- [ ] **Step 4: Commit the plan doc (if not already committed)**

```bash
git add docs/superpowers/plans/2026-09-14-92-logo-palette-tokens-atmosphere-prototype.md
git commit -m "docs(#92): execution plan for the logo-palette prototype" || true
git push
```

(`|| true` covers the case where the plan was already committed with earlier work.)

---

## Self-Review

- **Spec coverage** (against ticket #92's brief):
  - Six hexes as fixed oklch points, hex kept as comment, full-precision round-trip: Task 1 Step 1 (runnable script + pinned expected output) + Step 2 (token file). ✓
  - Derivation only adds — brand ramp 50–900 around primary: Task 1 tokens (600 = `var(--brand-primary)`; no fixed hex re-expressed as a new value). Hover/active/focus states: `--brand-primary-hover/active`, `--brand-focus-ring` → `--ring`/`--sidebar-ring`. AA-safe muted text darker than `#7e7f7f`: `--muted-text` derived against the darkest wash (stronger than the brief's white-target — noted in constraints). Mono-primary chart ramp: `--chart-1..5`. Landing wash values: `--wash-*`, `--surface-*`, `--line-soft`. ✓
  - Strictly cool; destructive stays shadcn default (carried verbatim): constraint + token. ✓
  - Landing atmosphere as a pattern rebuilt on the logo palette: Task 2 variants A/B/C + recede test. Admin tool-neutral: Task 2 `AdminNeutralStrip` + `--sidebar-*` mapping. ✓
  - Every render AA on its surfaces: measured pair table in constraints; components use only verified pairs (muted-text on white/washes/glass-over-light; ink on glass-over-deep; brand-700 on light surfaces + gray-light; white + white/85 on deep; ink everywhere light). ✓
  - Recedes behind photography: recede test section. Admin-derivable: admin imports the layer + builds. Harmonizes with the type trio: showcase sets headings serif / body sans / labels mono. Not SaaS-generic: owner judges — the atmosphere variants are the differentiator. Print: untouched. ✓
  - Neutral/functional names: `--brand-*` numeric + `--muted-text`, `--wash-*`, `--surface-*`, `--line-soft` — no metaphor vocabulary. ✓
  - Mechanics per #57: throwaway worktree branch (already created), showcase replaces `/prototype-tokens`, main untouched, teal preset interim. ✓
  - The oklch checklist item on the ticket body gets ticked when Task 1 lands (executor ticks `- [✅]` on the ticket body per repo convention).
- **Sibling fencing:** the spec (#61), font self-hosting, island-primitive removal, and the milestone swap are named out of scope in the header; no task touches them. #61's roadmap checkbox is untouched by this branch. ✓
- **Placeholder scan:** every code step pins full file content; the only conditional text is Task 1 Step 5's find/grep (defensive against unknown build output layout) with an explicit fallback. No TBD/TODO/"add appropriate" anywhere. ✓
- **Type consistency:** `AtmosphereVariants` / `AdminNeutralStrip` exports match Task 3's imports (names + relative paths); all utilities used by Tasks 2–3 are produced by Task 1's `@theme inline` or already exist via `tokens.css`'s mapping (same semantic token names); marker names `data-92-*` are identical between Task 2/3 code and the Task 3 smoke loop. `createFileRoute('/prototype-tokens')` matches the existing route path so `routeTree.gen.ts` stays unchanged. ✓
- **Counted checks:** smoke loop greps exactly six markers; verify script prints 6 RT lines + 9 ramp lines + 1 muted line + 5 muted-contrast lines + 5 pair lines — expected output block enumerates them all, so a missing line is visible. ✓
- **Design-skill pass (2026-09-14, post-draft):** `ui-ux-pro-max` design-system search (photography studio / elegant / editorial) validates the serif-display + clean-sans pairing (Roboto Slab + Figtree) and the text-lean, image-forward bands; its zinc/dark palette and motion-driven effects are superseded by the fixed #90 brand and the motion = shadcn-defaults ruling — recorded in the Task 2 art-direction notes. Two concrete adoptions: `cursor-pointer` + `transition-colors` on all showcase clickables (constraint), and ramp variables instead of literal hexes in decorative gradients (except the deliberate off-brand photo stand-in). `banner-design` contributes the style-vocabulary mapping (A glassmorphism/gradient, B editorial depth, C minimalist) and the safe-zone/CTA/headline-size/contrast checks; its 2-typeface and 44px-CTA rules are deliberately superseded (owner's trio is fixed; shadcn defaults govern). ✓



