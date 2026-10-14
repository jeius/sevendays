import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Site Settings (M7 #215, spec § Settings made real — the 2026-10-02
// Site-tab amendment): the SINGLETON store for the site's words and marks —
// brand (logo key + name + tagline), the five pages × title/description,
// the About story, and the ruled extras (social links, announcement
// banner, home section kickers, brand contact block). Every content column
// is nullable: the row is BORN-EMPTY (absent until the first save) and
// unset fields fall back to today's hardcoded defaults in code
// (packages/types' SITE_SETTINGS_DEFAULTS — the chrome never renders
// broken). The raw R2 key lives here alone; reads resolve logoImageUrl
// via MEDIA_PUBLIC_BASE_URL (ADR-0019) — keys never leave the API. One
// row ever: the save service inserts on first PUT and updates after; no
// DELETE (the singleton is never deleted) and no per-field patching (the
// full-object PUT, one save like every other editor).
export const siteSettings = pgTable('site_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  logoImageKey: text('logo_image_key'),
  brandName: text('brand_name'),
  brandTagline: text('brand_tagline'),
  homeTitle: text('home_title'),
  homeDescription: text('home_description'),
  packagesTitle: text('packages_title'),
  packagesDescription: text('packages_description'),
  branchesTitle: text('branches_title'),
  branchesDescription: text('branches_description'),
  servicesTitle: text('services_title'),
  servicesDescription: text('services_description'),
  aboutTitle: text('about_title'),
  aboutDescription: text('about_description'),
  aboutStory: text('about_story'),
  kickerGallery: text('kicker_gallery'),
  kickerPackages: text('kicker_packages'),
  kickerServices: text('kicker_services'),
  kickerTestimonials: text('kicker_testimonials'),
  socialInstagram: text('social_instagram'),
  socialFacebook: text('social_facebook'),
  socialTiktok: text('social_tiktok'),
  bannerTitle: text('banner_title'),
  bannerBody: text('banner_body'),
  bannerIsActive: boolean('banner_is_active').notNull().default(false),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
