// Home copy (#111 remediation — ratified as rendered 2026-09-16, the
// resolution's draft-and-ratify satisfied by the owner's per-piece
// reactions). Gallery + testimonials are stand-in/placeholder content BY
// RULING until M5's real photography and client words arrive. The wizard's
// CDP-asserted literals are untouched by this file.

export const HERO_PHOTO = '/photos/cover_photo.jpg';
export const HERO_PHOTO_ALT =
  'Photographer holding a Canon DSLR by the studio window — the studio’s own photo';

export const HERO_BLURB =
  'Portrait, family, and event photography from our Calamba, Dipolog, and Iligan studios — booked in minutes, delivered in seven days.';

export const KICKERS = {
  gallery: 'The work — stand-in portfolio',
  packages: 'Featured packages',
  services: 'What we do',
  testimonials: 'Kind words',
} as const;

// Stand-in gallery (M5 swaps in the owner's R2 photos). Captions ratified.
export const GALLERY_STANDINS = [
  { src: '/photos/gallery-01-portrait.jpg', caption: 'Portrait 01 · stand-in' },
  { src: '/photos/gallery-02-portrait.jpg', caption: 'Portrait 02 · stand-in' },
  { src: '/photos/gallery-03-wedding.jpg', caption: 'Wedding · stand-in' },
  { src: '/photos/gallery-04-family.jpg', caption: 'Family · stand-in' },
  { src: '/photos/gallery-05-still.jpg', caption: 'Still life · stand-in' },
  { src: '/photos/gallery-06-bts.jpg', caption: 'Behind the scenes · stand-in' },
] as const;

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
