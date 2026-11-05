// The mosaic wall's deterministic span rhythm (#164 Round 2, owner-ruled:
// "some photos have 2x2 or 1x2 size") — every 7th tile runs large, every
// 7th+3 runs wide, singles around, repeating. Pinned so a future "tune the
// rhythm" edit moves the seam and the suite together.
import { describe, expect, it } from 'vitest';
import { spanFor } from './mosaic';

describe('spanFor (M7 #223 — the #164-ruled rhythm)', () => {
  it('every 7th tile runs 2×2 (i = 0, 7, 14 …)', () => {
    expect(spanFor(0)).toBe('col-span-2 row-span-2');
    expect(spanFor(7)).toBe('col-span-2 row-span-2');
    expect(spanFor(14)).toBe('col-span-2 row-span-2');
  });

  it('every 7th+3 tile runs 2×1 wide (i = 3, 10, 17 …)', () => {
    expect(spanFor(3)).toBe('col-span-2');
    expect(spanFor(10)).toBe('col-span-2');
  });

  it('everything else is a single', () => {
    expect(spanFor(1)).toBe('');
    expect(spanFor(2)).toBe('');
    expect(spanFor(4)).toBe('');
    expect(spanFor(6)).toBe('');
    expect(spanFor(9)).toBe('');
  });

  it('the rhythm is unbounded — large indices keep cycling (the wall never runs out of window)', () => {
    expect(spanFor(21)).toBe('col-span-2 row-span-2');
    expect(spanFor(24)).toBe('col-span-2');
    expect(spanFor(100)).toBe('');
  });
});
