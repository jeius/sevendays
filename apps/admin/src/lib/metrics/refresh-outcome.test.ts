// The Refresh outcome's contract (#187 close-out feedback): the seam
// RESOLVES source failures (MetricsResult unions) — nothing throws
// except the session gate — so "the refresh failed" is derived from the
// query cache after the fetch settles. A thrown query error (the gate,
// an SSR transport fault) is the loud case; a resolved 'unavailable'
// source is named; 'not-configured' is the designed interim state, not a
// failure, and stays silent. Pure function — the RefreshButton snapshots
// the cache and renders the toast.
import { describe, expect, it } from 'vitest';
import { type RefreshQuerySnapshot, refreshOutcomeMessage } from './refresh-outcome';

function snapshot(source: string, patch: Partial<RefreshQuerySnapshot> = {}): RefreshQuerySnapshot {
  return {
    queryKey: ['metrics', source, '7d'],
    status: 'success',
    ...patch,
  };
}

describe('refreshOutcomeMessage', () => {
  it('a thrown query error is the loud case — Refresh failed with the first message', () => {
    expect(
      refreshOutcomeMessage([
        snapshot('traffic', { status: 'error', error: new Error('Unauthorized') }),
      ])
    ).toBe('Refresh failed — Unauthorized.');
  });

  it('resolved unavailable sources are named', () => {
    expect(
      refreshOutcomeMessage([
        snapshot('traffic', { data: { ok: false, reason: 'unavailable' } }),
        snapshot('storage', { data: { ok: false, reason: 'unavailable' } }),
      ])
    ).toBe('Refresh completed with 2 sources unavailable — Traffic, Storage & Media.');
  });

  it('one unavailable source reads singular', () => {
    expect(
      refreshOutcomeMessage([snapshot('db-probes', { data: { ok: false, reason: 'unavailable' } })])
    ).toBe('Refresh completed with 1 source unavailable — DB probes.');
  });

  it('not-configured is the designed interim state — never a failure toast', () => {
    expect(
      refreshOutcomeMessage([
        snapshot('traffic', { data: { ok: false, reason: 'not-configured' } }),
      ])
    ).toBeNull();
  });

  it('all sources healthy — no toast', () => {
    expect(
      refreshOutcomeMessage([
        snapshot('traffic', { data: { ok: true, data: {} } }),
        snapshot('content', { data: { ok: true, data: [] } }),
      ])
    ).toBeNull();
  });

  it('an empty cache snapshot — no toast', () => {
    expect(refreshOutcomeMessage([])).toBeNull();
  });

  it('a thrown error outranks the unavailable list (the widgets still show the per-source states)', () => {
    expect(
      refreshOutcomeMessage([
        snapshot('traffic', { status: 'error', error: new Error('Unauthorized') }),
        snapshot('storage', { data: { ok: false, reason: 'unavailable' } }),
      ])
    ).toBe('Refresh failed — Unauthorized.');
  });

  it('an unknown source key falls back to its key segment', () => {
    expect(
      refreshOutcomeMessage([
        snapshot('future-source', { data: { ok: false, reason: 'unavailable' } }),
      ])
    ).toBe('Refresh completed with 1 source unavailable — future-source.');
  });
});
