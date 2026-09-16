// PROTOTYPE (#111) Track 3 — WCAG contrast re-measurement for the chrome
// pairs. Throwaway: the numbers it prints get recorded in the prototype's
// chrome section + the #111 handover; the BUILD ticket re-verifies with its
// own accepted process. Hexes are the canonical token values (tokens.css).
// Usage: node scripts/prototype-contrast.mjs

const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

const blend = (fgHex, alpha, bgHex) => {
  const fg = hexToRgb(fgHex);
  const bg = hexToRgb(bgHex);
  return fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha)));
};

const luminance = (rgb) => {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ratio = (fgRgb, bgRgb) => {
  const [l1, l2] = [luminance(fgRgb), luminance(bgRgb)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
};

const WHITE = '#ffffff';
const INK = '#0e131a';
const PRIMARY = '#06708e';
const HOVER = '#00566e'; // brand-700
const DEEP = '#084257';
const B100 = '#dff0f7';
const B200 = '#c9e3ee';
const B300 = '#a8d2e3';
const GRAY_LIGHT = '#dedede';
const MUTED = '#686969';

const rows = [];
function pair(name, fgRgb, bgRgb) {
  const r = ratio(fgRgb, bgRgb);
  const aa = r >= 4.5 ? 'AA ✓' : r >= 3 ? 'AA-large only' : 'FAIL';
  rows.push({ name, r, aa });
}

// — white-on-ink family (chrome nav / footer / CTA candidates) —
pair('white on ink', hexToRgb(WHITE), hexToRgb(INK));
pair('brand-100 on ink', hexToRgb(B100), hexToRgb(INK));
pair('brand-200 on ink', hexToRgb(B200), hexToRgb(INK));
pair('brand-300 on ink', hexToRgb(B300), hexToRgb(INK));
pair('white 85% over ink', blend(WHITE, 0.85, INK), hexToRgb(INK));
pair('white 70% over ink', blend(WHITE, 0.7, INK), hexToRgb(INK));
pair('white 60% over ink', blend(WHITE, 0.6, INK), hexToRgb(INK));
pair('brand-700 on ink  (F1 hijack — as-landed)', hexToRgb(HOVER), hexToRgb(INK));

// — CTA text pairs —
pair('white on primary (CTA)', hexToRgb(WHITE), hexToRgb(PRIMARY));
pair('brand-700 on primary (F1 hijack — as-landed)', hexToRgb(HOVER), hexToRgb(PRIMARY));
pair('white on brand-700 (hover state)', hexToRgb(WHITE), hexToRgb(HOVER));
pair('white on deep', hexToRgb(WHITE), hexToRgb(DEEP));

// — body/surface pairs (context, from the #92 verified set) —
pair('brand-700 on white (content links)', hexToRgb(HOVER), hexToRgb(WHITE));
pair('muted-text on white', hexToRgb(MUTED), hexToRgb(WHITE));
pair('ink on white', hexToRgb(INK), hexToRgb(WHITE));
pair('ink on gray-light', hexToRgb(INK), hexToRgb(GRAY_LIGHT));

for (const { name, r, aa } of rows) {
  console.log(`${aa.padEnd(14)} ${r.toFixed(2).padStart(6)}:1  ${name}`);
}
