import { describe, expect, it } from 'vitest';
import { groupChildren } from './group-children.js';

type Row = { parentId: string; label: string };

const row = (parentId: string, label: string): Row => ({ parentId, label });

describe('groupChildren', () => {
  it('returns children in incoming order for a repeated key', () => {
    const lookup = groupChildren(
      [row('p1', 'first'), row('p2', 'other'), row('p1', 'second')],
      (r) => r.parentId
    );
    expect(lookup('p1')).toEqual([row('p1', 'first'), row('p1', 'second')]);
  });

  it('preserves arbitrary incoming order (never re-sorts)', () => {
    const lookup = groupChildren(
      ['c', 'a', 'b'].map((label, i) => row(`p${i % 2}`, label)),
      (r) => r.parentId
    );
    expect(lookup('p0').map((r) => r.label)).toEqual(['c', 'b']);
    expect(lookup('p1').map((r) => r.label)).toEqual(['a']);
  });

  it('yields [] for a key with no children (never undefined)', () => {
    const lookup = groupChildren([row('p1', 'only')], (r) => r.parentId);
    expect(lookup('missing')).toEqual([]);
  });

  it('fans out across many parents, grouping each key separately', () => {
    const lookup = groupChildren(
      [row('p1', 'a'), row('p2', 'b'), row('p3', 'c'), row('p2', 'd')],
      (r) => r.parentId
    );
    expect(lookup('p1')).toHaveLength(1);
    expect(lookup('p2').map((r) => r.label)).toEqual(['b', 'd']);
    expect(lookup('p3')).toHaveLength(1);
  });

  it('groups a single child', () => {
    const lookup = groupChildren([row('p1', 'solo')], (r) => r.parentId);
    expect(lookup('p1')).toEqual([row('p1', 'solo')]);
  });

  it('returns [] for every key when there are no children at all', () => {
    const lookup = groupChildren([], (r: Row) => r.parentId);
    expect(lookup('p1')).toEqual([]);
  });

  it('extracts keys via the caller-supplied function (no fixed column)', () => {
    const lookup = groupChildren(
      [
        { key: 'k1', v: 1 },
        { key: 'k2', v: 2 },
      ],
      (c) => c.key
    );
    expect(lookup('k1')).toEqual([{ key: 'k1', v: 1 }]);
    expect(lookup('k2')).toEqual([{ key: 'k2', v: 2 }]);
  });
});
