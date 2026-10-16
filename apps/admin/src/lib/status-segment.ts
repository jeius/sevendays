// The All/Active/Deactivated segment's pure half (M7 #218, spec § retired
// rows + the Active filter): every CMS list toolbar gains the triple;
// default All per visit (component state, never persisted); the filtered
// view is a render-time derivation — query caches and mutations keep
// operating on the full lists, and rail/grid counts stay unfiltered.

export type StatusSegment = 'all' | 'active' | 'deactivated';

/** The ordered label triple — the spec-pinned copy. */
export const STATUS_SEGMENTS: ReadonlyArray<{ value: StatusSegment; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'deactivated', label: 'Deactivated' },
];

/** 'all' returns a COPY of the input (never the caller's array); the other two filter on isActive. */
export function filterByStatusSegment<T extends { isActive: boolean }>(
  rows: readonly T[],
  segment: StatusSegment
): T[] {
  if (segment === 'all') {
    return [...rows];
  }
  return rows.filter((row) => (segment === 'active' ? row.isActive : !row.isActive));
}
