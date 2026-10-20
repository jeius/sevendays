import type { PublicTestimonial } from '@sevendays/types';

// Home testimonial pagination (#164 Round 2, owner-ruled): 3 per page — a
// pull-quote lead + a 2-item side rail on every page. Non-looping (the UI
// disables the ends). Page ids derive from each page's first item: the
// page-change reveal keys on them, so every flip re-runs the animation.
export const TESTIMONIAL_PAGE_SIZE = 3;

export function paginateTestimonials(
  items: PublicTestimonial[],
  pageSize: number = TESTIMONIAL_PAGE_SIZE
): { id: string; items: PublicTestimonial[] }[] {
  const pages: { id: string; items: PublicTestimonial[] }[] = [];
  for (let i = 0; i < items.length; i += pageSize) {
    const pageItems = items.slice(i, i + pageSize);
    pages.push({ id: pageItems[0]?.id ?? `page-${pages.length}`, items: pageItems });
  }
  return pages;
}
