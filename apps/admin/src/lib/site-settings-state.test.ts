import { siteSettingsSchema } from '@sevendays/types';
import { describe, expect, it } from 'vitest';
// biome-ignore lint/performance/noNamespaceImport: the plan pins the `seam.*` namespace handle (the light-entity-state suite's pattern)
import * as seam from './site-settings-state';

const read = siteSettingsSchema.parse({
  brandName: 'Sevendays Studio',
  brandTagline: null,
  logoImageUrl: 'https://pub-test.r2.dev/brand/00000000-0000-4000-8000-000000000001.jpg',
  homeTitle: 'Three branches. One standard of light.',
  homeDescription: null,
  packagesTitle: 'Packages',
  packagesDescription: null,
  branchesTitle: 'Branches',
  branchesDescription: null,
  servicesTitle: 'Services',
  servicesDescription: null,
  aboutTitle: 'About',
  aboutDescription: null,
  aboutStory: 'Line one.\n\nLine two.',
  kickerGallery: null,
  kickerPackages: null,
  kickerServices: null,
  kickerTestimonials: null,
  socialInstagram: null,
  socialFacebook: null,
  socialTiktok: null,
  bannerTitle: null,
  bannerBody: null,
  bannerIsActive: false,
  contactEmail: null,
  contactPhone: null,
});

describe('siteSettingsStateFromRead (read → editor state)', () => {
  it('nulls become empty strings; set values pass through; the logo key starts undefined (a read never echoes keys)', () => {
    const state = seam.siteSettingsStateFromRead(read);
    expect(state.brandName).toBe('Sevendays Studio');
    expect(state.brandTagline).toBe('');
    expect(state.aboutStory).toBe('Line one.\n\nLine two.');
    expect(state.bannerIsActive).toBe(false);
    expect(state.logoImageUrl).toBe(
      'https://pub-test.r2.dev/brand/00000000-0000-4000-8000-000000000001.jpg'
    );
    expect(state.logoImageKey).toBeUndefined();
  });
});

describe('buildSiteSettingsSavePayload (state → the full-object PUT body)', () => {
  it('empty strings map to null across every text field (unset = default), bannerIsActive carries', () => {
    const state = seam.siteSettingsStateFromRead(read);
    const payload = seam.buildSiteSettingsSavePayload({ ...state, brandName: '' });
    expect(payload.brandName).toBeNull();
    expect(payload.homeTitle).toBe('Three branches. One standard of light.');
    expect(payload.bannerIsActive).toBe(false);
  });

  it('values pass through with ends trimmed and interior newlines preserved (newlines = paragraphs)', () => {
    const payload = seam.buildSiteSettingsSavePayload({
      ...seam.siteSettingsStateFromRead(read),
      aboutStory: '  Line one.\n\nLine two.  ',
      contactPhone: ' +63 917 000 0000 ',
    });
    expect(payload.aboutStory).toBe('Line one.\n\nLine two.');
    expect(payload.contactPhone).toBe('+63 917 000 0000');
  });

  it('the logo tri-state: undefined = property ABSENT, null = explicit clear, staging string = bind', () => {
    const state = seam.siteSettingsStateFromRead(read);
    expect('logoImageKey' in seam.buildSiteSettingsSavePayload(state)).toBe(false);
    expect(
      seam.buildSiteSettingsSavePayload({ ...state, logoImageKey: null }).logoImageKey
    ).toBeNull();
    expect(
      seam.buildSiteSettingsSavePayload({
        ...state,
        logoImageKey: 'tmp/00000000-0000-4000-8000-000000000002.jpg',
      }).logoImageKey
    ).toBe('tmp/00000000-0000-4000-8000-000000000002.jpg');
  });
});

describe('validateSiteSettingsState (the client-side pre-flight, mirroring the schema)', () => {
  it('a non-URL social value and a non-email contact get their field errors; valid state is clean', () => {
    const state = seam.siteSettingsStateFromRead(read);
    const bad = seam.validateSiteSettingsState({
      ...state,
      socialInstagram: 'instagram.com/sevendays',
      contactEmail: 'not-an-email',
    });
    expect(bad.socialInstagram).toBe('Enter a full URL (https://…).');
    expect(bad.contactEmail).toBe('Enter a valid email address.');
    expect(seam.validateSiteSettingsState(state)).toEqual({});
    // Empty values are unset, not invalid — no errors for blanks.
    expect(
      seam.validateSiteSettingsState({ ...state, socialInstagram: '', contactEmail: '' })
    ).toEqual({});
  });
});

describe('fieldErrorsFromDetails (the API 400 → inline field errors)', () => {
  it('maps {path, message} details onto their first path segment', () => {
    expect(
      seam.fieldErrorsFromDetails([
        { path: ['logoImageKey'], message: 'no object at the staging key' },
      ])
    ).toEqual({ logoImageKey: 'no object at the staging key' });
    expect(seam.fieldErrorsFromDetails(undefined)).toEqual({});
  });
});
