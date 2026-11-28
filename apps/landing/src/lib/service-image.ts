import type { StudioServiceWithBranches } from '@sevendays/types';

// The studio-service card photography (#333, spec #330 §6). The map is the
// M2 stand-in set moved VERBATIM from home-cards.tsx, the body unchanged,
// the role demoted: these name-matched photos are the DOCUMENTED NO-COVER
// FALLBACK (owner ruling at charting, map #324, the home stays photo-led
// with zero admin work: every service always renders a photo).
export function serviceBackground(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('recover')) return '/photos/service-recovery.jpg';
  if (n.includes('fram')) return '/photos/service-framing.jpg';
  if (n.includes('id') || n.includes('portrait')) return '/photos/service-id.jpg';
  if (n.includes('print') || n.includes('tarp')) return '/photos/service-printing.jpg';
  return '/photos/cover-portrait.jpg';
}

// The one precedence helper both service cards consume: the resolved cover
// URL when the API answered one (#331's spine), else the stand-in. `??`:
// a null cover (born-null rows) and an absent field both fall back; the
// seam pins the law. The card treatment is identical either way (the
// photo IS the card, tints, scrim, alt='', lazy).
export function serviceImage(
  service: Pick<StudioServiceWithBranches, 'name' | 'coverImageUrl'>
): string {
  return service.coverImageUrl ?? serviceBackground(service.name);
}
