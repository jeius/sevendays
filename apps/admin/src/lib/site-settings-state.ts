import type { SaveSiteSettingsInput, SiteSettings } from '@sevendays/types';
import { z } from 'zod';

// The site-settings editor seam (M7 #215, the light-entity-state pattern):
// the whole Site tab is one full-object editor over the singleton — state
// in (strings; '' = unset), the tri-state logo key, and the two
// client-side format pre-flights mirroring the API schema (the 400's
// field details land inline through fieldErrorsFromDetails).

/** The 24 free-text fields, in wire order — the keyed list both builders walk. */
const TEXT_FIELDS = [
  'brandName',
  'brandTagline',
  'homeTitle',
  'homeDescription',
  'packagesTitle',
  'packagesDescription',
  'branchesTitle',
  'branchesDescription',
  'servicesTitle',
  'servicesDescription',
  'aboutTitle',
  'aboutDescription',
  'aboutStory',
  'kickerGallery',
  'kickerPackages',
  'kickerServices',
  'kickerTestimonials',
  'socialInstagram',
  'socialFacebook',
  'socialTiktok',
  'bannerTitle',
  'bannerBody',
  'contactEmail',
  'contactPhone',
] as const;

export type SiteSettingsFieldErrors = { [field: string]: string };

/**
 * The editor's whole state: every text field as an input string ('' =
 * unset → null on save), the banner switch, and the three-state logo
 * encoding (the #214 cover law): `logoImageUrl` is the read's resolved
 * logo (preview fallback), `undefined` = unchanged (absent from the PUT),
 * `null` = clear, string = a fresh staging key (ADR-0019) to bind on the
 * next save.
 */
export interface SiteSettingsEditorState {
  brandName: string;
  brandTagline: string;
  homeTitle: string;
  homeDescription: string;
  packagesTitle: string;
  packagesDescription: string;
  branchesTitle: string;
  branchesDescription: string;
  servicesTitle: string;
  servicesDescription: string;
  aboutTitle: string;
  aboutDescription: string;
  aboutStory: string;
  kickerGallery: string;
  kickerPackages: string;
  kickerServices: string;
  kickerTestimonials: string;
  socialInstagram: string;
  socialFacebook: string;
  socialTiktok: string;
  bannerTitle: string;
  bannerBody: string;
  contactEmail: string;
  contactPhone: string;
  bannerIsActive: boolean;
  logoImageUrl: string | null;
  logoImageKey: string | null | undefined;
}

/** `#215 seam: read → editor state`. Nulls become ''; `logoImageKey`
 * starts `undefined` — a read never echoes keys, so the logo is unchanged
 * until the editor says otherwise. */
export function siteSettingsStateFromRead(read: SiteSettings): SiteSettingsEditorState {
  const state = {
    bannerIsActive: read.bannerIsActive,
    logoImageUrl: read.logoImageUrl,
    logoImageKey: undefined,
  } as SiteSettingsEditorState;
  for (const field of TEXT_FIELDS) {
    state[field] = read[field] ?? '';
  }
  return state;
}

/** `#215 seam: state → the full-object PUT body`. Text: trimmed, '' →
 * null (unset → default). The logo's tri-state rides the same encoding as
 * the branch/packages covers. */
export function buildSiteSettingsSavePayload(
  state: SiteSettingsEditorState
): SaveSiteSettingsInput {
  const payload = {
    bannerIsActive: state.bannerIsActive,
  } as SaveSiteSettingsInput;
  for (const field of TEXT_FIELDS) {
    const value = state[field].trim();
    payload[field] = value === '' ? null : value;
  }
  if (state.logoImageKey !== undefined) {
    payload.logoImageKey = state.logoImageKey;
  }
  return payload;
}

/** The two format pre-flights the API schema enforces (socials are URLs,
 * contact is an email) — surfaced inline BEFORE the save; everything else
 * (length caps) the API owns, its 400 details landing via
 * fieldErrorsFromDetails. */
export function validateSiteSettingsState(state: SiteSettingsEditorState): SiteSettingsFieldErrors {
  const errors: SiteSettingsFieldErrors = {};
  for (const field of ['socialInstagram', 'socialFacebook', 'socialTiktok'] as const) {
    const value = state[field].trim();
    if (value !== '' && !z.url().safeParse(value).success) {
      errors[field] = 'Enter a full URL (https://…).';
    }
  }
  const email = state.contactEmail.trim();
  if (email !== '' && !z.email().safeParse(email).success) {
    errors.contactEmail = 'Enter a valid email address.';
  }
  return errors;
}

/** The API's 400 field details → inline per-field errors (the
 * result-valued server fn carries `details?: unknown` across the RPC
 * boundary; this is the whole mapping). */
export function fieldErrorsFromDetails(details: unknown): SiteSettingsFieldErrors {
  if (!Array.isArray(details)) return {};
  const errors: SiteSettingsFieldErrors = {};
  for (const detail of details) {
    if (
      detail &&
      typeof detail === 'object' &&
      'path' in detail &&
      'message' in detail &&
      typeof detail.message === 'string'
    ) {
      const first = Array.isArray(detail.path) ? detail.path[0] : undefined;
      if (typeof first === 'string') {
        errors[first] = detail.message;
      }
    }
  }
  return errors;
}
