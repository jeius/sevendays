import type { SiteSettings } from '@sevendays/types';
import { bannerFor } from '../lib/site-chrome';

// The settings-driven announcement banner (M7 #223 — the #215 Site tab's
// banner fields worn by the landing chrome): a slim wash strip ABOVE the
// sticky bar, scrolling away with the page — quiet by the thesis. The gate
// law lives in bannerFor: off or untitled renders NOTHING (never a broken
// strip). Unrated composition (no prototype precedent — settings post-date
// the arc); the variants round ratifies.
export function AnnouncementBanner({ settings }: { settings: SiteSettings }) {
  const banner = bannerFor(settings);
  if (!banner) return null;
  return (
    <aside aria-label='Announcement' className='border-line-soft border-b bg-wash-b'>
      <div className='mx-auto max-w-5xl px-6 py-3'>
        <p className='text-foreground font-medium text-sm'>{banner.title}</p>
        {banner.body ? <p className='text-muted-foreground mt-0.5 text-sm'>{banner.body}</p> : null}
      </div>
    </aside>
  );
}
