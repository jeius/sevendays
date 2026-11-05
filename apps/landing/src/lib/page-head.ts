import type { SiteSettings } from '@sevendays/types';

// The page-head seam (M7 #224): every redesigned route's <head> composes
// through here so the title suffix has one source. The suffix is
// `{pageTitle} | {brandName} {brandTagline}` — with today's defaults that
// reproduces the incumbent literals ("Packages | Sevendays Photography")
// exactly, and a brand edit follows through. A null page title renders NO
// entries (the root's fallback title stands); the meta description renders
// only when the page carries one. The router dedupes title/name entries by
// depth (deepest match wins — the installed headContentUtils), so these
// entries ride cleanly over the root's.
export type PageMetaEntry = { title: string } | { name: 'description'; content: string };

export function pageMetaFor(
  pageTitle: string | null,
  pageDescription: string | null,
  settings: SiteSettings
): PageMetaEntry[] {
  if (pageTitle === null) return [];
  const meta: PageMetaEntry[] = [
    { title: `${pageTitle} | ${settings.brandName} ${settings.brandTagline}` },
  ];
  if (pageDescription !== null) {
    meta.push({ name: 'description', content: pageDescription });
  }
  return meta;
}
