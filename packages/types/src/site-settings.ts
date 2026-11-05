import { z } from 'zod';

// Site Settings (M7 #215, spec § Settings made real — the 2026-10-02
// Site-tab amendment): the singleton wire — brand + the five pages ×
// title/description + the About story + the ruled extras (social links,
// announcement banner, home section kickers, brand contact block). Every
// content field is nullable on the wire: the row is BORN-EMPTY and unset
// means "today's hardcoded default" (SITE_SETTINGS_DEFAULTS below — the
// chrome never renders broken; a fresh DB renders today's site). The wire
// never carries the raw R2 logo key: reads resolve logoImageUrl
// (ADR-0019); the save tri-state encodes the key (absent = unchanged,
// null = clear, staging string = bind — the #214 cover law).
export const siteSettingsSchema = z.object({
  brandName: z.string().max(300).nullable(),
  brandTagline: z.string().max(300).nullable(),
  logoImageUrl: z.url().nullable(),
  homeTitle: z.string().max(300).nullable(),
  homeDescription: z.string().max(1000).nullable(),
  packagesTitle: z.string().max(300).nullable(),
  packagesDescription: z.string().max(1000).nullable(),
  branchesTitle: z.string().max(300).nullable(),
  branchesDescription: z.string().max(1000).nullable(),
  servicesTitle: z.string().max(300).nullable(),
  servicesDescription: z.string().max(1000).nullable(),
  aboutTitle: z.string().max(300).nullable(),
  aboutDescription: z.string().max(1000).nullable(),
  aboutStory: z.string().max(10_000).nullable(),
  kickerGallery: z.string().max(300).nullable(),
  kickerPackages: z.string().max(300).nullable(),
  kickerServices: z.string().max(300).nullable(),
  kickerTestimonials: z.string().max(300).nullable(),
  socialInstagram: z.url().nullable(),
  socialFacebook: z.url().nullable(),
  socialTiktok: z.url().nullable(),
  bannerTitle: z.string().max(300).nullable(),
  bannerBody: z.string().max(1000).nullable(),
  bannerIsActive: z.boolean(),
  contactEmail: z.email().nullable(),
  contactPhone: z.string().max(40).nullable(),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;

// The full-object PUT body (M7 #215 — the singleton precedent: one save
// like every other editor, NO per-field patching): every content field is
// REQUIRED-and-nullable (the editor always sends the whole object; null =
// unset → default), plus the logo's tri-state media encoding (ADR-0019 —
// reads never echo keys, so the save cannot either): absent = unchanged,
// null = clear, staging string = bind via the commit pipeline.
export const saveSiteSettingsSchema = siteSettingsSchema
  .omit({ logoImageUrl: true })
  .extend({ logoImageKey: z.string().min(1).nullable().optional() });

export type SaveSiteSettingsInput = z.infer<typeof saveSiteSettingsSchema>;

// The born-empty read (M7 #215): what GET answers before the first save —
// every content field null, the banner switch off, no logo. Defaults
// NEVER ride the wire; consumers resolve through the seam below.
export const EMPTY_SITE_SETTINGS: SiteSettings = {
  brandName: null,
  brandTagline: null,
  logoImageUrl: null,
  homeTitle: null,
  homeDescription: null,
  packagesTitle: null,
  packagesDescription: null,
  branchesTitle: null,
  branchesDescription: null,
  servicesTitle: null,
  servicesDescription: null,
  aboutTitle: null,
  aboutDescription: null,
  aboutStory: null,
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
};

// Today's hardcoded copy, pinned VERBATIM from the landing's code (the
// owner-ratified source — swept 2026-10-13): brand + tagline from the
// header/footer wordmark (the logo slot's null default IS the incumbent
// sd.png monogram), home title/description from the hero (home-copy's
// HERO_BLURB), page titles + the services sub-copy from the routes'
// h1/sub-lines, the About story from /about's placeholder line, the four
// kickers from the ruled one-voice section headings (#223). Fields today renders NOTHING for stay
// null (the extras — socials, banner copy, brand contact — and the three
// page descriptions with no today-sub-copy): their null default renders
// exactly today's page. This object IS the fallback the chrome renders
// while the row is born-empty.
export const SITE_SETTINGS_DEFAULTS: SiteSettings = {
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
};

// The defaults seam (spec § Settings made real: "unset fields fall back to
// today's hardcoded defaults"): per key, the row's value when set, the
// default when null. Both apps consume this ONE fn — never per-app
// fallbacks. Nullable-by-design keys resolve to their null default, which
// is exactly today's renders-nothing behavior. The explicit field list is
// the point: the SiteSettings return type makes it exhaustive by
// construction (a missed field fails this package's typecheck).
export function resolveSiteSettings(raw: SiteSettings): SiteSettings {
  return {
    brandName: raw.brandName ?? SITE_SETTINGS_DEFAULTS.brandName,
    brandTagline: raw.brandTagline ?? SITE_SETTINGS_DEFAULTS.brandTagline,
    logoImageUrl: raw.logoImageUrl ?? SITE_SETTINGS_DEFAULTS.logoImageUrl,
    homeTitle: raw.homeTitle ?? SITE_SETTINGS_DEFAULTS.homeTitle,
    homeDescription: raw.homeDescription ?? SITE_SETTINGS_DEFAULTS.homeDescription,
    packagesTitle: raw.packagesTitle ?? SITE_SETTINGS_DEFAULTS.packagesTitle,
    packagesDescription: raw.packagesDescription ?? SITE_SETTINGS_DEFAULTS.packagesDescription,
    branchesTitle: raw.branchesTitle ?? SITE_SETTINGS_DEFAULTS.branchesTitle,
    branchesDescription: raw.branchesDescription ?? SITE_SETTINGS_DEFAULTS.branchesDescription,
    servicesTitle: raw.servicesTitle ?? SITE_SETTINGS_DEFAULTS.servicesTitle,
    servicesDescription: raw.servicesDescription ?? SITE_SETTINGS_DEFAULTS.servicesDescription,
    aboutTitle: raw.aboutTitle ?? SITE_SETTINGS_DEFAULTS.aboutTitle,
    aboutDescription: raw.aboutDescription ?? SITE_SETTINGS_DEFAULTS.aboutDescription,
    aboutStory: raw.aboutStory ?? SITE_SETTINGS_DEFAULTS.aboutStory,
    kickerGallery: raw.kickerGallery ?? SITE_SETTINGS_DEFAULTS.kickerGallery,
    kickerPackages: raw.kickerPackages ?? SITE_SETTINGS_DEFAULTS.kickerPackages,
    kickerServices: raw.kickerServices ?? SITE_SETTINGS_DEFAULTS.kickerServices,
    kickerTestimonials: raw.kickerTestimonials ?? SITE_SETTINGS_DEFAULTS.kickerTestimonials,
    socialInstagram: raw.socialInstagram ?? SITE_SETTINGS_DEFAULTS.socialInstagram,
    socialFacebook: raw.socialFacebook ?? SITE_SETTINGS_DEFAULTS.socialFacebook,
    socialTiktok: raw.socialTiktok ?? SITE_SETTINGS_DEFAULTS.socialTiktok,
    bannerTitle: raw.bannerTitle ?? SITE_SETTINGS_DEFAULTS.bannerTitle,
    bannerBody: raw.bannerBody ?? SITE_SETTINGS_DEFAULTS.bannerBody,
    bannerIsActive: raw.bannerIsActive,
    contactEmail: raw.contactEmail ?? SITE_SETTINGS_DEFAULTS.contactEmail,
    contactPhone: raw.contactPhone ?? SITE_SETTINGS_DEFAULTS.contactPhone,
  };
}
