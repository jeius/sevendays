import { describe, expect, it } from 'vitest';
import {
  EMPTY_SITE_SETTINGS,
  resolveSiteSettings,
  SITE_SETTINGS_DEFAULTS,
  saveSiteSettingsSchema,
  siteSettingsSchema,
} from './site-settings.js';

const LOGO_URL = 'https://pub-test.r2.dev/brand/00000000-0000-4000-8000-000000000001.jpg';
const STAGING_KEY = 'tmp/00000000-0000-4000-8000-000000000002.jpg';

const read = {
  brandName: 'Sevendays Studio',
  brandTagline: 'Photography',
  logoImageUrl: LOGO_URL,
  homeTitle: 'Three branches. One standard of light.',
  homeDescription: 'Portrait, family, and event photography.',
  packagesTitle: 'Packages',
  packagesDescription: null,
  branchesTitle: 'Branches',
  branchesDescription: null,
  servicesTitle: 'Services',
  servicesDescription: 'Looking for add-ons?',
  aboutTitle: 'About',
  aboutDescription: null,
  aboutStory: 'Line one.\nLine two.',
  kickerGallery: 'The work',
  kickerPackages: 'Featured packages',
  kickerServices: 'What we do',
  kickerTestimonials: 'Kind words',
  socialInstagram: 'https://instagram.com/sevendays',
  socialFacebook: null,
  socialTiktok: null,
  bannerTitle: 'Now booking grads',
  bannerBody: 'Class of 2027 slots are open.',
  bannerIsActive: true,
  contactEmail: 'hello@sevendays.ph',
  contactPhone: '+63 917 000 0000',
};

const save = { ...read, logoImageKey: STAGING_KEY } as const;
delete (save as Record<string, unknown>).logoImageUrl;

describe('siteSettingsSchema (the read wire)', () => {
  it('parses a canonical read (every field set)', () => {
    expect(siteSettingsSchema.safeParse(read).success).toBe(true);
  });

  it('parses the born-empty read — every content field null, the banner off, no logo', () => {
    const parsed = siteSettingsSchema.parse(EMPTY_SITE_SETTINGS);
    expect(parsed).toEqual(EMPTY_SITE_SETTINGS);
    expect(parsed.brandName).toBeNull();
    expect(parsed.bannerIsActive).toBe(false);
    expect(parsed.logoImageUrl).toBeNull();
  });

  it('strips a smuggled logoImageKey from the parsed output (ADR-0019: raw keys never leave)', () => {
    const parsed = siteSettingsSchema.parse({ ...read, logoImageKey: 'brand/aaaa.jpg' });
    expect('logoImageKey' in parsed).toBe(false);
  });
});

describe('saveSiteSettingsSchema (the full-object PUT body)', () => {
  it('drops logoImageUrl from the parsed save output (reads never echo keys; saves never echo URLs)', () => {
    const parsed = saveSiteSettingsSchema.parse({ ...save, logoImageUrl: LOGO_URL });
    expect('logoImageUrl' in parsed).toBe(false);
    expect(parsed.logoImageKey).toBe(STAGING_KEY);
  });

  it('an ABSENT logoImageKey stays absent from the parsed output (unchanged)', () => {
    const { logoImageKey: _key, ...withoutLogo } = save;
    const parsed = saveSiteSettingsSchema.parse(withoutLogo);
    expect('logoImageKey' in parsed).toBe(false);
  });

  it('a null logoImageKey survives the parse (explicit clear)', () => {
    const parsed = saveSiteSettingsSchema.parse({ ...save, logoImageKey: null });
    expect(parsed.logoImageKey).toBeNull();
  });

  it('a staging-key string parses (bind via a fresh staging key)', () => {
    const parsed = saveSiteSettingsSchema.parse(save);
    expect(parsed.logoImageKey).toBe(STAGING_KEY);
  });

  it('social links must be URLs when present (all three)', () => {
    for (const field of ['socialInstagram', 'socialFacebook', 'socialTiktok'] as const) {
      const bad = saveSiteSettingsSchema.safeParse({ ...save, [field]: 'not a url' });
      expect(bad.success).toBe(false);
    }
  });

  it('contactEmail must be an email when present', () => {
    expect(
      saveSiteSettingsSchema.safeParse({ ...save, contactEmail: 'not-an-email' }).success
    ).toBe(false);
  });
});

describe('the defaults (M7 #215: unset fields fall back to today’s hardcoded copy)', () => {
  it('SITE_SETTINGS_DEFAULTS pins today’s landing literals verbatim (the owner-ratified source is the code)', () => {
    expect(SITE_SETTINGS_DEFAULTS).toEqual({
      brandName: 'Sevendays',
      brandTagline: 'Photography',
      logoImageUrl: null,
      homeTitle: 'Three branches. One standard of light.',
      homeDescription:
        'Portrait, family, and event photography from our Calamba, Dipolog, and Iligan studios — booked in minutes, delivered in seven days.',
      packagesTitle: 'Packages',
      packagesDescription: null,
      branchesTitle: 'Branches',
      branchesDescription: null,
      servicesTitle: 'Services',
      servicesDescription:
        'Looking for add-ons? Makeup, hairstyle, and more are available with any session.',
      aboutTitle: 'About',
      aboutDescription: null,
      aboutStory: 'Our studio story is coming soon.',
      kickerGallery: 'The work',
      kickerPackages: 'Featured packages',
      kickerServices: 'What we do',
      kickerTestimonials: 'Kind words',
      socialInstagram: null,
      socialFacebook: null,
      socialTiktok: null,
      bannerTitle: null,
      bannerBody: null,
      bannerIsActive: false,
      contactEmail: null,
      contactPhone: null,
    });
  });

  it('EMPTY_SITE_SETTINGS is all-null with only the banner switch false (born-empty, defaults never ride the wire)', () => {
    expect(Object.values(EMPTY_SITE_SETTINGS).every((v) => v === null || v === false)).toBe(true);
    expect(EMPTY_SITE_SETTINGS.bannerIsActive).toBe(false);
  });
});

describe('resolveSiteSettings (the defaults seam — both apps consume this one fn)', () => {
  it('resolving the born-empty settings yields exactly the defaults', () => {
    expect(resolveSiteSettings(EMPTY_SITE_SETTINGS)).toEqual(SITE_SETTINGS_DEFAULTS);
  });

  it('set values pass through untouched (including the multi-paragraph story)', () => {
    const resolved = resolveSiteSettings(siteSettingsSchema.parse(read));
    expect(resolved.brandName).toBe('Sevendays Studio');
    expect(resolved.aboutStory).toBe('Line one.\nLine two.');
    expect(resolved.logoImageUrl).toBe(LOGO_URL);
    expect(resolved.bannerIsActive).toBe(true);
  });

  it('nullable-by-design keys stay null on resolve (today renders nothing for them)', () => {
    const resolved = resolveSiteSettings(EMPTY_SITE_SETTINGS);
    expect(resolved.socialInstagram).toBeNull();
    expect(resolved.bannerTitle).toBeNull();
    expect(resolved.bannerBody).toBeNull();
    expect(resolved.contactEmail).toBeNull();
    expect(resolved.contactPhone).toBeNull();
    expect(resolved.packagesDescription).toBeNull();
  });
});
