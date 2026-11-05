// The chrome's site-settings consumption seams (M7 #223): pure shapers over
// the RESOLVED settings. The banner gates are the law: off or untitled
// renders NOTHING (never a broken strip); unset socials hide; the contact
// block renders only what the studio set. Fixtures here are hand-built
// resolved shapes (resolveSiteSettings is types-tested — #215).
import type { SiteSettings } from '@sevendays/types';
import { EMPTY_SITE_SETTINGS } from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import { bannerFor, footerContactFor, socialLinksFor } from './site-chrome';

const ON = {
  ...EMPTY_SITE_SETTINGS,
  bannerIsActive: true,
} as SiteSettings;

describe('bannerFor (M7 #223 — off or untitled renders nothing)', () => {
  it('inactive banner → null even when title/body are set', () => {
    expect(
      bannerFor({ ...ON, bannerIsActive: false, bannerTitle: 'News', bannerBody: 'Body' })
    ).toBeNull();
  });

  it('active + title + body → both ride', () => {
    expect(bannerFor({ ...ON, bannerTitle: 'News', bannerBody: 'Body' })).toEqual({
      title: 'News',
      body: 'Body',
    });
  });

  it('active + title, body unset → the title alone (body renders nothing)', () => {
    expect(bannerFor({ ...ON, bannerTitle: 'News', bannerBody: null })).toEqual({
      title: 'News',
      body: null,
    });
  });

  it('active but untitled → null (a body-only strip is a broken strip)', () => {
    expect(bannerFor({ ...ON, bannerTitle: null, bannerBody: 'Body' })).toBeNull();
  });
});

describe('socialLinksFor (M7 #223 — unset links hide, order fixed)', () => {
  it('nothing set → empty row (the footer renders no social line)', () => {
    expect(socialLinksFor(EMPTY_SITE_SETTINGS)).toEqual([]);
  });

  it('a subset renders in the fixed Instagram → Facebook → TikTok order with labels', () => {
    const links = socialLinksFor({
      ...EMPTY_SITE_SETTINGS,
      socialInstagram: 'https://instagram.com/sevendays',
      socialTiktok: 'https://tiktok.com/@sevendays',
    } as SiteSettings);
    expect(links).toEqual([
      { key: 'instagram', href: 'https://instagram.com/sevendays', label: 'Instagram' },
      { key: 'tiktok', href: 'https://tiktok.com/@sevendays', label: 'TikTok' },
    ]);
  });
});

describe('footerContactFor (M7 #223 — renders only what the studio set)', () => {
  it('nothing set → null (no contact block)', () => {
    expect(footerContactFor(EMPTY_SITE_SETTINGS)).toBeNull();
  });

  it('email only → the block with a null phone slot', () => {
    expect(
      footerContactFor({
        ...EMPTY_SITE_SETTINGS,
        contactEmail: 'hello@sevendays.ph',
      } as SiteSettings)
    ).toEqual({
      email: 'hello@sevendays.ph',
      phone: null,
    });
  });

  it('both set → the full block', () => {
    expect(
      footerContactFor({
        ...EMPTY_SITE_SETTINGS,
        contactEmail: 'hello@sevendays.ph',
        contactPhone: '+63 900 000 000',
      } as SiteSettings)
    ).toEqual({ email: 'hello@sevendays.ph', phone: '+63 900 000 000' });
  });
});
