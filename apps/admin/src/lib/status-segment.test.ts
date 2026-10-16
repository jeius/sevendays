import { describe, expect, it } from 'vitest';
import { filterByStatusSegment, STATUS_SEGMENTS } from './status-segment.js';

const rows = [
  { id: 'a', isActive: true },
  { id: 'b', isActive: false },
  { id: 'c', isActive: true },
];

describe('STATUS_SEGMENTS (the toolbar triple)', () => {
  it('is All / Active / Deactivated in order — the spec-pinned labels', () => {
    expect(STATUS_SEGMENTS).toEqual([
      { value: 'all', label: 'All' },
      { value: 'active', label: 'Active' },
      { value: 'deactivated', label: 'Deactivated' },
    ]);
  });
});

describe('filterByStatusSegment', () => {
  it("segment 'all' returns every row as a COPY (never the caller's array — render-time derivation only)", () => {
    const all = filterByStatusSegment(rows, 'all');
    expect(all).toEqual(rows);
    expect(all).not.toBe(rows);
  });

  it("segment 'active' keeps only isActive rows; 'deactivated' keeps only !isActive", () => {
    expect(filterByStatusSegment(rows, 'active').map((r) => r.id)).toEqual(['a', 'c']);
    expect(filterByStatusSegment(rows, 'deactivated').map((r) => r.id)).toEqual(['b']);
  });

  it('an empty list answers empty under every segment', () => {
    for (const segment of ['all', 'active', 'deactivated'] as const) {
      expect(filterByStatusSegment([], segment)).toEqual([]);
    }
  });
});
