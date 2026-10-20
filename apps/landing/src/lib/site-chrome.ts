import type { SiteSettings } from '@sevendays/types';

// The chrome's site-settings consumption seams (M7 #223): pure shapers over
// the RESOLVED settings (the server fn applies resolveSiteSettings — these
// never see a raw null-default mix). Three laws live here: the banner
// renders NOTHING when off or untitled (never a broken strip); unset
// social links hide (the row collapses when all are unset); the contact
// block renders only what the studio actually set.

export function bannerFor(settings: SiteSettings): { title: string; body: string | null } | null {
  if (!settings.bannerIsActive) return null;
  if (!settings.bannerTitle) return null;
  return { title: settings.bannerTitle, body: settings.bannerBody };
}

export interface SocialLink {
  key: 'instagram' | 'facebook' | 'tiktok';
  href: string;
  label: string;
}

export function socialLinksFor(settings: SiteSettings): SocialLink[] {
  const links: SocialLink[] = [];
  if (settings.socialInstagram) {
    links.push({ key: 'instagram', href: settings.socialInstagram, label: 'Instagram' });
  }
  if (settings.socialFacebook) {
    links.push({ key: 'facebook', href: settings.socialFacebook, label: 'Facebook' });
  }
  if (settings.socialTiktok) {
    links.push({ key: 'tiktok', href: settings.socialTiktok, label: 'TikTok' });
  }
  return links;
}

export function footerContactFor(
  settings: SiteSettings
): { email: string | null; phone: string | null } | null {
  if (settings.contactEmail === null && settings.contactPhone === null) return null;
  return { email: settings.contactEmail, phone: settings.contactPhone };
}
