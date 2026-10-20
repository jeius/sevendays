// Home testimonial pagination (#164 Round 2, owner-ruled: 3 per page — a
// pull-quote lead + a 2-item side rail; non-looping, the UI disables the
// ends). The seam is the pure chunking; page STATE is the component's.
import type { PublicTestimonial } from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import { paginateTestimonials } from './home-testimonials';

let n = 0;
function t(): PublicTestimonial {
  n += 1;
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    quote: `Quote ${n}`,
    person: `Person ${n}`,
  };
}

describe('paginateTestimonials (M7 #223 — 3 per page, lead + side rail)', () => {
  it('zero testimonials → zero pages (the component renders the coming-soon line)', () => {
    expect(paginateTestimonials([])).toEqual([]);
  });

  it('exactly 3 → one full page', () => {
    const items = [t(), t(), t()];
    const pages = paginateTestimonials(items);
    expect(pages).toHaveLength(1);
    expect(pages[0]?.items).toHaveLength(3);
  });

  it('4 → two pages of 3 + 1 (non-looping chunking, no padding)', () => {
    const items = [t(), t(), t(), t()];
    const pages = paginateTestimonials(items);
    expect(pages.map((p) => p.items.length)).toEqual([3, 1]);
  });

  it('7 → three pages; page ids derive from each page’s first item (the reveal keys on them)', () => {
    const items = Array.from({ length: 7 }, t);
    const pages = paginateTestimonials(items);
    expect(pages.map((p) => p.items.length)).toEqual([3, 3, 1]);
    expect(pages[0]?.id).toBe(items[0]?.id);
    expect(pages[1]?.id).toBe(items[3]?.id);
    expect(pages[2]?.id).toBe(items[6]?.id);
  });
});
