#!/usr/bin/env node
// measure-theme-pairs.mjs — the theme-pair measurement harness (M7 #217,
// spec #172 § Dark mode). Parses packages/ui/src/tokens.css and measures
// WCAG 2.x contrast for the pinned pair tables:
//   LIGHT — must reproduce M3's recorded table EXACTLY (#96, 2026-09-14):
//     the "light pairs re-measured unchanged" acceptance.
//   DARK  — the .dark block's counterpart table, each pair at its floor
//     (4.5:1 text, 3:1 non-text indicators).
// Also enforces the token layer's discipline: every inline `/* #hex */`
// comment must equal the oklch-derived hex (hexes are canonical), and
// every oklch must round-trip (oklch -> sRGB -> hex stable on re-derive).
// The oklch->sRGB math below reproduces all six of M3/#97's recorded light
// pairs exactly (13.85 / 5.65 / 8.22 / 4.59 / 17.36 / 18.64) — verified
// 2026-10-14; if you change the math, re-verify against that table.
// Exit 0 = all green; 1 = any failure. Plain Node, zero imports.

import { readFileSync } from 'node:fs';

const TOKENS = new URL('../packages/ui/src/tokens.css', import.meta.url);

// — oklch <-> sRGB (Björn Ottosson's OKLab matrices; sRGB gamut clamped) —
const clamp01 = (x) => Math.min(1, Math.max(0, x));

function oklchToSrgb(L, C, H) {
  const rad = (H * Math.PI) / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return linear.map((c) => {
    c = clamp01(c);
    const enc = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
    return Math.round(clamp01(enc) * 255);
  });
}

function srgbToOklch(r8, g8, b8) {
  const lin = (v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const r = lin(r8);
  const g = lin(g8);
  const b = lin(b8);
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  let H = (Math.atan2(bb, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return [L, Math.sqrt(a * a + bb * bb), H];
}

const hex = (rgb) => `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

function relLum([r8, g8, b8]) {
  const lin = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r8) + 0.7152 * lin(g8) + 0.0722 * lin(b8);
}

function contrast(fgOklch, bgOklch) {
  const lf = relLum(oklchToSrgb(...fgOklch));
  const lb = relLum(oklchToSrgb(...bgOklch));
  const [hi, lo] = lf >= lb ? [lf, lb] : [lb, lf];
  return (hi + 0.05) / (lo + 0.05);
}

// — tokens.css parsing: the :root and .dark blocks, var-chain resolution —
const css = readFileSync(TOKENS, 'utf8');

// Match a selector as a RULE START at line start (e.g. `:root {`, `.dark {`)
// — a bare indexOf would false-hit the header comment's ".dark block"
// prose and slice the wrong braces. `^\.dark\s*\{` cannot match
// `.dark img {` (the selector continues before the brace).
function block(selector) {
  const m = css.match(new RegExp(`^${selector.replace('.', '\\.')}\\s*\\{`, 'm'));
  if (!m) return null;
  const open = (m.index ?? 0) + m[0].length - 1;
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  return null;
}

function parse(blockText) {
  const map = new Map();
  for (const [, name, value, commentHex] of blockText.matchAll(
    /--([\w-]+):\s*([^;]+);\s*(?:\/\*\s*(#[0-9a-fA-F]{6})\s*\*\/)?/g,
  )) {
    map.set(name, { value: value.trim(), commentHex: commentHex ?? null });
  }
  return map;
}

const ROOT = parse(block(':root') ?? '');
const DARK_BLOCK = block('.dark');
const DARK = DARK_BLOCK ? parse(DARK_BLOCK) : null;

function rawOklch(value) {
  const m = value.match(/^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

// Resolve a token to an oklch triple: literals first, then var() chains
// (own block first — a .dark token may reference a token .dark redefines —
// then :root). Alpha values (any '/') are not pairs and resolve to null.
function resolve(name, from, seen = new Set()) {
  if (seen.has(name)) return null;
  seen.add(name);
  const entry = (from ?? ROOT).get(name) ?? ROOT.get(name);
  if (!entry) return null;
  const direct = rawOklch(entry.value);
  if (direct) return direct;
  const ref = entry.value.match(/^var\((--[\w-]+)\)$/);
  if (!ref) return null;
  return resolve(ref[1].slice(2), from, seen);
}

let failures = 0;
const fail = (line) => {
  failures++;
  console.log(`  ${line}`);
};
const fmt = (n) => n.toFixed(2);

// — the pinned pair tables —
// LIGHT: [label, fg, bg, recorded] — measured value must equal `recorded`.
const LIGHT_PAIRS = [
  ['ink on secondary (gray-light)', 'brand-ink', 'secondary', 13.85],
  ['white on primary', 'primary-foreground', 'primary', 5.65],
  ['brand-700 on white (link, via --card)', 'brand-700', 'card', 8.22],
  ['muted on wash-b (the darkest wash)', 'muted-text', 'wash-b', 4.59],
];

// DARK: [label, fg, bg, floor] — measured value must be >= floor.
// Floors encode the class: 4.5 = text pairs, 3.0 = non-text indicators.
const DARK_PAIRS = [
  ['87 foreground on background', 'foreground', 'background', 4.5],
  ['87 foreground on card', 'foreground', 'card', 4.5],
  ['87 foreground on popover', 'foreground', 'popover', 4.5],
  ['60 muted on background', 'muted-foreground', 'background', 4.5],
  ['60 muted on card', 'muted-foreground', 'card', 4.5],
  ['60 muted on popover', 'muted-foreground', 'popover', 4.5],
  ['brand-300 link on background', 'brand-300', 'background', 4.5],
  ['brand-300 link on card', 'brand-300', 'card', 4.5],
  ['brand-200 link-hover on card', 'brand-200', 'card', 4.5],
  ['white on primary (unchanged)', 'primary-foreground', 'primary', 4.5],
  ['87 foreground on sidebar', 'foreground', 'sidebar', 4.5],
  ['60 muted on sidebar', 'muted-foreground', 'sidebar', 4.5],
  ['87 foreground on sidebar-accent', 'foreground', 'sidebar-accent', 4.5],
  ['brand-300 on sidebar-accent', 'brand-300', 'sidebar-accent', 4.5],
  ['brand-300 on the emphasis strip (gray-light)', 'brand-300', 'brand-gray-light', 4.5],
  ['destructive on card', 'destructive', 'card', 4.5],
  ['destructive on background', 'destructive', 'background', 4.5],
  ['ring (brand-400) on background', 'ring', 'background', 3.0],
  ['ring (brand-400) on card', 'ring', 'card', 3.0],
];

console.log('LIGHT — must reproduce M3\u2019s recorded table (#96, 2026-09-14)');
for (const [label, fg, bg, recorded] of LIGHT_PAIRS) {
  const f = resolve(fg, ROOT);
  const b = resolve(bg, ROOT);
  if (!f || !b) {
    fail(`FAIL ${label}: unresolved token (${fg} or ${bg})`);
    continue;
  }
  const measured = contrast(f, b);
  const ok = Math.abs(measured - recorded) <= 0.01;
  console.log(
    `  ${ok ? 'PASS' : 'FAIL'} ${label.padEnd(42)} ${fmt(measured)} (recorded ${fmt(recorded)})`,
  );
  if (!ok) failures++;
}

console.log('\nDARK — the .dark counterpart table (floors: 4.5 text / 3.0 non-text)');
if (!DARK) {
  fail('FAIL no .dark block in tokens.css — dark mode is parked (pre-#217 state)');
} else {
  for (const [label, fg, bg, floor] of DARK_PAIRS) {
    // fg/bg names may live in .dark, :root, or both — resolve dark-first so
    // overridden tokens measure their dark values (e.g. muted-foreground,
    // destructive, sidebar), while unchanged ones (brand-300, primary) fall
    // through to :root.
    const f = resolve(fg, DARK) ?? resolve(fg, ROOT);
    const b = resolve(bg, DARK) ?? resolve(bg, ROOT);
    if (!f || !b) {
      fail(`FAIL ${label}: unresolved token (${fg} or ${bg})`);
      continue;
    }
    const measured = contrast(f, b);
    const ok = measured >= floor;
    console.log(
      `  ${ok ? 'PASS' : 'FAIL'} ${label.padEnd(42)} ${fmt(measured)} \u2265 ${fmt(floor)}`,
    );
    if (!ok) failures++;
  }
}

// — the discipline: hexes canonical + oklch round-trips —
console.log('\nDISCIPLINE — inline hex comments vs derived hexes; round-trips');
let checked = 0;
for (const [blockName, map] of [
  [':root', ROOT],
  ...(DARK ? [['.dark', DARK]] : []),
]) {
  for (const [name, entry] of map) {
    const triple = rawOklch(entry.value);
    if (!triple) continue;
    checked++;
    const derived = hex(oklchToSrgb(...triple));
    const rederived = hex(oklchToSrgb(...srgbToOklch(...oklchToSrgb(...triple))));
    if (rederived !== derived) fail(`FAIL ${blockName} --${name}: round-trip drift ${derived} -> ${rederived}`);
    if (entry.commentHex && entry.commentHex.toLowerCase() !== derived) {
      fail(`FAIL ${blockName} --${name}: comment ${entry.commentHex} != derived ${derived}`);
    }
  }
}
console.log(`  checked ${checked} oklch literals (round-trips + comment hexes)`);

console.log(`\nRESULT: ${failures === 0 ? 'PASS' : `FAIL (${failures})`}`);
process.exit(failures === 0 ? 0 : 1);
