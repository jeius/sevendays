// The page-head seam (M7 #224): every redesigned route's <title> composes
// the settings brand suffix, and the meta description renders only when the
// page carries one. Pinned so a future suffix retune moves the seam and the
// suite together. The dedup that makes this work is the router's own (the
// deepest match's title + name entries win — verified against the installed
// headContentUtils).
import type { SiteSettings } from '@sevendays/types';
import { EMPTY_SITE_SETTINGS, resolveSiteSettings } from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import { pageMetaFor } from './page-head';

describe('pageMetaFor (M7 #224 — the brand-suffix title + the description gate)', () => {
  it('composes the suffix from the resolved settings — defaults reproduce today’s literal exactly', () => {
    const resolved = resolveSiteSettings(EMPTY_SITE_SETTINGS);
    const meta = pageMetaFor(resolved.packagesTitle, resolved.packagesDescription, resolved);
    expect(meta).toEqual([
      { title: 'Packages | Sevendays Photography' },
      { name: 'description', content: resolved.packagesDescription },
    ]);
  });

  it('a custom brand follows the Site tab’s name + tagline through the suffix', () => {
    const rebranded: SiteSettings = {
      ...resolvedDefaults(),
      brandName: 'Northlight',
      brandTagline: 'Studio',
    };
    expect(pageMetaFor('Packages', null, rebranded)).toEqual([
      { title: 'Packages | Northlight Studio' },
    ]);
  });

  it('a null description renders the title entry alone (no empty meta tag)', () => {
    const resolved = resolvedDefaults();
    const meta = pageMetaFor(resolved.branchesTitle, null, resolved);
    expect(meta).toEqual([{ title: 'Branches | Sevendays Photography' }]);
  });

  it('a null page title renders NO entries — the root’s fallback title stands', () => {
    const resolved = resolvedDefaults();
    expect(pageMetaFor(null, resolved.servicesDescription, resolved)).toEqual([]);
  });
});

function resolvedDefaults(): SiteSettings {
  return resolveSiteSettings(EMPTY_SITE_SETTINGS);
}
