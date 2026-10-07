// The Refresh outcome evaluator (#187 close-out feedback): the seam
// RESOLVES source failures (MetricsResult unions — nothing throws except
// the session gate), so "the refresh failed" is derived from the query
// cache after the fetch settles. Precedence: a thrown query error (the
// gate, an SSR transport fault) is the loud case; resolved 'unavailable'
// sources are named; 'not-configured' is the designed interim state, not
// a failure, and stays silent. Pure — the RefreshButton snapshots the
// cache onto the structural snapshot type and renders the toast.
export type RefreshQuerySnapshot = {
  queryKey: readonly unknown[];
  status: 'pending' | 'error' | 'success';
  error?: unknown;
  data?: unknown;
};

const SOURCE_LABELS: Record<string, string> = {
  workers: 'Worker metrics',
  'db-probes': 'DB probes',
  content: 'Content census',
  traffic: 'Traffic',
  storage: 'Storage & Media',
};

function sourceLabel(queryKey: readonly unknown[]): string {
  const segment = queryKey[1];
  const key = typeof segment === 'string' ? segment : '';
  return SOURCE_LABELS[key] ?? key;
}

function isUnavailable(data: unknown): boolean {
  if (data === null || typeof data !== 'object' || !('ok' in data)) return false;
  const candidate = data as { ok: unknown; reason?: unknown };
  return candidate.ok === false && candidate.reason === 'unavailable';
}

export function refreshOutcomeMessage(snapshots: RefreshQuerySnapshot[]): string | null {
  let thrownCount = 0;
  let firstError: string | null = null;
  const unavailable: string[] = [];
  for (const snapshot of snapshots) {
    if (snapshot.status === 'error') {
      thrownCount += 1;
      if (firstError === null) {
        firstError =
          snapshot.error instanceof Error
            ? snapshot.error.message
            : String(snapshot.error ?? 'unknown error');
      }
      continue;
    }
    if (isUnavailable(snapshot.data)) {
      unavailable.push(sourceLabel(snapshot.queryKey));
    }
  }
  if (thrownCount > 0) {
    return `Refresh failed — ${firstError}.`;
  }
  if (unavailable.length > 0) {
    const noun = unavailable.length === 1 ? 'source' : 'sources';
    return `Refresh completed with ${unavailable.length} ${noun} unavailable — ${unavailable.join(', ')}.`;
  }
  return null;
}
