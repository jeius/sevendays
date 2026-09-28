import type { GalleryRead, PublicGalleryPhoto } from '@sevendays/types';

// The /about portfolio seam (M5 ticket #142): tabs derive from the FETCHED
// payload — an "All" tab first and default plus one tab per category holding
// ≥1 photo, in the payload's category order (position order is the API's
// job; the payload carries no position fields). Filtering is client-side
// over the single fetch. Uncategorized photos are structurally absent from
// the payload (categoryId is non-nullable); a photo whose category row is
// missing (deactivated category, #138 AR3) still renders under All.
export const ALL_TAB_ID = 'all';

export interface GalleryTab {
  id: string;
  label: string;
}

export function deriveGalleryTabs(gallery: GalleryRead): GalleryTab[] {
  const tabs: GalleryTab[] = [{ id: ALL_TAB_ID, label: 'All' }];
  for (const category of gallery.categories) {
    if (gallery.photos.some((p) => p.categoryId === category.id)) {
      tabs.push({ id: category.id, label: category.name });
    }
  }
  return tabs;
}

// The portfolio-empty rule (spec): zero photos → the tab row hides and the
// "Portfolio coming soon." placeholder renders.
export function hasPortfolioPhotos(gallery: GalleryRead): boolean {
  return gallery.photos.length > 0;
}

export function photosForTab(gallery: GalleryRead, tabId: string): PublicGalleryPhoto[] {
  if (tabId === ALL_TAB_ID) return gallery.photos;
  return gallery.photos.filter((p) => p.categoryId === tabId);
}
