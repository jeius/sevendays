// PROTOTYPE (#111) — DRAFT copy for the remediation variants. Every string
// here is agent-drafted and awaits the owner's verbatim ratification (the
// ticket's draft-and-ratify rule); none of it is settled. The wizard's
// CDP-asserted literals are NOT touched by the prototype. Data-shaped facts
// (branch cities, seven-day delivery) come from the live seeded catalog —
// no invented facts.

// DRAFT — hero blurb (replaces the "coming soon" placeholder in variants
// only; the default home keeps the CDP-asserted literal).
export const HERO_BLURB_DRAFT =
  'Portrait, family, and event photography from our Calamba, Dipolog, and Iligan studios — booked in minutes, delivered in seven days.';

// DRAFT — section kickers (mono, uppercase) per ruled lineup order.
export const KICKERS_DRAFT = {
  gallery: 'The work — stand-in portfolio',
  packages: 'Featured packages',
  services: 'What we do',
  testimonials: 'Kind words',
} as const;

// Stand-in gallery (M5 swaps in the owner's R2 photos). Captions are DRAFT.
export const GALLERY_DRAFT = [
  { src: '/photos/gallery-01-portrait.jpg', caption: 'Portrait 01 · stand-in' },
  { src: '/photos/gallery-02-portrait.jpg', caption: 'Portrait 02 · stand-in' },
  { src: '/photos/gallery-03-wedding.jpg', caption: 'Wedding · stand-in' },
  { src: '/photos/gallery-04-family.jpg', caption: 'Family · stand-in' },
  { src: '/photos/gallery-05-still.jpg', caption: 'Still life · stand-in' },
  { src: '/photos/gallery-06-bts.jpg', caption: 'Behind the scenes · stand-in' },
] as const;

export const HERO_PHOTO = '/photos/cover_photo.jpg';
export const HERO_PHOTO_ALT =
  'Photographer holding a Canon DSLR by the studio window — the studio’s own photo';

// DRAFT — caption for hero-photo slots in collages (variant B's tall mat).
export const HERO_CAPTION_DRAFT = 'At work in the studio · owner photo';

// CLEARLY-FAKE placeholder testimonials (owner ruling: render placeholders
// now, real content at M5). Names are placeholders by construction.
export const TESTIMONIALS_PLACEHOLDER = [
  {
    quote: 'The photos felt like us — easy, warm, and true to the day.',
    name: 'Placeholder name',
    context: 'Family session',
  },
  {
    quote: 'Booked in the morning, shot by lunch, prints within the week.',
    name: 'Placeholder name',
    context: 'Graduation portraits',
  },
  {
    quote: 'Our products finally look the way they deserve on the shelf.',
    name: 'Placeholder name',
    context: 'Commercial shoot',
  },
] as const;
