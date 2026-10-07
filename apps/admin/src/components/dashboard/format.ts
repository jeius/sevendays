// Deterministic formatters for the dashboard (#186): every output is a
// pure function of its input so SSR and hydration render byte-identical
// strings (no locale-dependent Intl for dates, no relative "3h ago" —
// those would mismatch across the SSR/client boundary).
export function formatUtc(iso: string | null): string {
  if (iso === null) return '—';
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return `${unit === 0 ? String(value) : value.toFixed(1)} ${units[unit]}`;
}

export function formatPercent(value: number | null): string {
  if (value === null) return '—';
  return `${(value * 100).toFixed(2)}%`;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('en').format(value);
}

// Web vitals display (#187): LCP/FCP/INP arrive in milliseconds (seconds
// read better above 1000); CLS is unitless.
export function formatDurationMs(value: number | null): string {
  if (value === null) return '—';
  if (value >= 1000) return `${(value / 1000).toFixed(1)} s`;
  return `${Math.round(value)} ms`;
}

export function formatCls(value: number | null): string {
  if (value === null) return '—';
  return value.toFixed(2);
}
