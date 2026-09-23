// PROTOTYPE (throwaway) — wayfinder #131: local fixtures for the admin CMS
// composition route. Catalog values are transcribed verbatim from
// packages/db/scripts/catalog.ts (the seed's single source of truth). Rows
// and flag assignments marked PROTOTYPE-ONLY are synthetic state exercises —
// the gallery/testimonial tables do not exist yet and real content arrives
// with the M5 build tickets. Nothing here persists; every mutation in the
// screens is local component state.

export type InclusionKind = 'framed_picture' | 'print' | 'privilege';

export interface InclusionRow {
  id: string;
  kind: InclusionKind;
  quantity: number | null; // privileges: null
  printSize: string | null; // code; privileges: null
  attires: string[]; // attire names in catalog order (Toga, Filipiniana, Executive, Uniform)
  description: string | null; // privileges carry the text; others null
  frameId: string | null; // framed_picture rows only
}

export interface FrameRow {
  id: string;
  // Display order only — the write model renumbers from array order (#130).
  frameNumber: number;
}

export interface PackageRow {
  id: string;
  name: string;
  description: string;
  slug: string;
  priceCents: number;
  durationMinutes: number | null;
  isFeatured: boolean;
  isActive: boolean;
  coverImageUrl: string | null; // null renders the placeholder block
  frames: FrameRow[];
  // Position = array order (the #130 write shape).
  inclusions: InclusionRow[];
}

export interface StudioServiceRow {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  isActive: boolean;
  // branch ids this service is bookable at (the checkbox matrix)
  branchIds: string[];
}

export interface AddonRow {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  isActive: boolean;
  // studio-service ids this add-on applies to (the checkbox matrix)
  studioServiceIds: string[];
}

export interface BranchRow {
  id: string;
  name: string;
  address: string;
  phone: string;
  acceptsWalkIns: boolean;
  isActive: boolean;
}

export interface PrintSizeRow {
  id: string;
  code: string;
  description: string;
  isActive: boolean;
}

export interface AttireRow {
  id: string;
  name: string;
  isActive: boolean;
}

export interface GalleryCategoryRow {
  id: string;
  name: string;
  position: number;
  isActive: boolean;
}

export interface GalleryPhotoRow {
  id: string;
  // PROTOTYPE-ONLY: photoUrl stays null — thumbs render placeholder blocks.
  photoUrl: string | null;
  title: string;
  caption: string | null;
  categoryId: string | null; // null = uncategorized (hidden on landing reads)
  position: number;
  isActive: boolean;
}

export interface TestimonialRow {
  id: string;
  quote: string;
  person: string;
  position: number;
  isActive: boolean;
}

// — Lookups (catalog.ts verbatim; the 8R isActive:false flag is PROTOTYPE-ONLY) —

export const printSizes: PrintSizeRow[] = [
  { id: 'ps-1x1', code: '1x1', description: 'One by one inch portrait print.', isActive: true },
  {
    id: 'ps-2x2',
    code: '2x2',
    description: 'Two by two inch portrait print (standard ID size).',
    isActive: true,
  },
  { id: 'ps-2r', code: '2R', description: '2R wallet-size portrait print.', isActive: true },
  {
    id: 'ps-8r',
    code: '8R',
    description:
      '8R print — nominally the same physical size as 8x10; both appear in the price list. Client to confirm at seed review whether they merge.',
    isActive: false,
  },
  { id: 'ps-8x10', code: '8x10', description: '8x10 inch print, commonly framed.', isActive: true },
  {
    id: 'ps-11x14',
    code: '11x14',
    description: '11x14 inch print, commonly framed.',
    isActive: true,
  },
];

export const attires: AttireRow[] = [
  { id: 'at-toga', name: 'Toga', isActive: true },
  { id: 'at-filipiniana', name: 'Filipiniana', isActive: true },
  { id: 'at-executive', name: 'Executive', isActive: true },
  { id: 'at-uniform', name: 'Uniform', isActive: true },
];

// — Branches (catalog.ts verbatim; phones are the seed's TODO(seed) placeholders) —

export const branches: BranchRow[] = [
  {
    id: 'br-calamba',
    name: 'Calamba Main Branch',
    address: 'DBAN, Calamba, Misamis Occidental',
    phone: '+63 900 000 001',
    acceptsWalkIns: false,
    isActive: true,
  },
  {
    id: 'br-iligan',
    name: 'Iligan Branch',
    address: 'Iligan City, Lanao del Norte',
    phone: '+63 900 000 002',
    acceptsWalkIns: false,
    isActive: true,
  },
  {
    id: 'br-dipolog',
    name: 'Dipolog Branch',
    address: 'Dipolog City, Zamboanga del Norte',
    phone: '+63 900 000 003',
    acceptsWalkIns: true,
    isActive: true,
  },
];

// — Studio services (catalog.ts verbatim; matrix assignments PROTOTYPE-ONLY) —

export const studioServices: StudioServiceRow[] = [
  {
    id: 'ss-photo-recovery',
    name: 'Photo Recovery',
    description: 'Restore scanned or damaged photographs.',
    priceCents: 150000,
    isActive: true,
    branchIds: ['br-calamba', 'br-iligan', 'br-dipolog'],
  },
  {
    id: 'ss-tarpaulin',
    name: 'Tarpaulin & Bulletin Printing',
    description: 'Large-format tarpaulin and bulletin printing.',
    priceCents: 80000,
    isActive: true,
    branchIds: ['br-calamba', 'br-dipolog'],
  },
  {
    id: 'ss-portraits-id',
    name: 'Portraits & ID Photo',
    description: 'Studio portraits and ID photos.',
    priceCents: 50000,
    isActive: true,
    branchIds: ['br-calamba', 'br-iligan', 'br-dipolog'],
  },
  {
    id: 'ss-framing',
    name: 'Picture Framing',
    description: 'Custom framing for prints and artwork.',
    priceCents: 120000,
    isActive: true,
    branchIds: ['br-calamba'],
  },
];

// — Add-ons (catalog.ts verbatim; matrix assignments PROTOTYPE-ONLY) —

export const addons: AddonRow[] = [
  {
    id: 'addon-makeup',
    name: 'Makeup',
    description: 'Professional make-up applied on-site before the shoot.',
    priceCents: 12000,
    isActive: true,
    studioServiceIds: ['ss-portraits-id'],
  },
  {
    id: 'addon-hairstyle',
    name: 'Hairstyle',
    description: 'Professional hairstyling on-site before the shoot.',
    priceCents: 6000,
    isActive: true,
    studioServiceIds: ['ss-portraits-id'],
  },
];

// — Packages (catalog.ts verbatim: Basic, D, A; flags marked PROTOTYPE-ONLY) —

// Universal privileges, seeded per package (privilegeSeeds): the same six
// rows on every package; attireLinks per privilegeSeeds.
const privilegeRows = (prefix: string): InclusionRow[] => [
  {
    id: `${prefix}-p1`,
    kind: 'privilege',
    quantity: null,
    printSize: null,
    attires: [],
    description: 'High Resolution soft copies',
    frameId: null,
  },
  {
    id: `${prefix}-p2`,
    kind: 'privilege',
    quantity: null,
    printSize: null,
    attires: ['Toga'],
    description: 'Usage of Toga and Hood',
    frameId: null,
  },
  {
    id: `${prefix}-p3`,
    kind: 'privilege',
    quantity: null,
    printSize: null,
    attires: [],
    description: 'Usage of Ladies Accessories',
    frameId: null,
  },
  {
    id: `${prefix}-p4`,
    kind: 'privilege',
    quantity: null,
    printSize: null,
    attires: ['Executive'],
    description: 'Usage of Executive Attire',
    frameId: null,
  },
  {
    id: `${prefix}-p5`,
    kind: 'privilege',
    quantity: null,
    printSize: null,
    attires: [],
    description: 'Usage of Barong',
    frameId: null,
  },
  {
    id: `${prefix}-p6`,
    kind: 'privilege',
    quantity: null,
    printSize: null,
    attires: ['Filipiniana'],
    description: 'Usage of Filipiniana',
    frameId: null,
  },
];

export const packages: PackageRow[] = [
  {
    id: 'pkg-basic',
    name: 'Basic Package',
    description: 'Entry graduation portrait package — 1 framed 8x10 Toga plus wallet-size prints.',
    slug: 'basic-package',
    priceCents: 90000,
    durationMinutes: null,
    isFeatured: true, // PROTOTYPE-ONLY flag: exercises the Featured badge
    isActive: true,
    coverImageUrl: null,
    frames: [{ id: 'fr-basic-1', frameNumber: 1 }],
    inclusions: [
      {
        id: 'inc-basic-f1',
        kind: 'framed_picture',
        quantity: 1,
        printSize: '8x10',
        attires: ['Toga'],
        description: null,
        frameId: 'fr-basic-1',
      },
      {
        id: 'inc-basic-r1',
        kind: 'print',
        quantity: 2,
        printSize: '2R',
        attires: ['Toga'],
        description: null,
        frameId: null,
      },
      {
        id: 'inc-basic-r2',
        kind: 'print',
        quantity: 5,
        printSize: '2x2',
        attires: ['Toga'],
        description: null,
        frameId: null,
      },
      {
        id: 'inc-basic-r3',
        kind: 'print',
        quantity: 4,
        printSize: '1x1',
        attires: ['Toga'],
        description: null,
        frameId: null,
      },
      ...privilegeRows('basic'),
    ],
  },
  {
    id: 'pkg-d',
    name: 'Package D',
    description:
      'Two framed pictures (11x14 Toga, 8x10 Filipiniana/Executive) with Toga and Filipiniana/Executive prints.',
    slug: 'package-d',
    priceCents: 180000,
    durationMinutes: null,
    isFeatured: false,
    isActive: true,
    coverImageUrl: null,
    frames: [
      { id: 'fr-d-1', frameNumber: 1 },
      { id: 'fr-d-2', frameNumber: 2 },
    ],
    inclusions: [
      {
        id: 'inc-d-f1',
        kind: 'framed_picture',
        quantity: 1,
        printSize: '11x14',
        attires: ['Toga'],
        description: null,
        frameId: 'fr-d-1',
      },
      {
        id: 'inc-d-f2',
        kind: 'framed_picture',
        quantity: 1,
        printSize: '8x10',
        attires: ['Filipiniana', 'Executive'],
        description: null,
        frameId: 'fr-d-2',
      },
      {
        id: 'inc-d-r1',
        kind: 'print',
        quantity: 4,
        printSize: '2R',
        attires: ['Toga'],
        description: null,
        frameId: null,
      },
      {
        id: 'inc-d-r2',
        kind: 'print',
        quantity: 5,
        printSize: '2x2',
        attires: ['Toga'],
        description: null,
        frameId: null,
      },
      {
        id: 'inc-d-r3',
        kind: 'print',
        quantity: 4,
        printSize: '1x1',
        attires: ['Toga'],
        description: null,
        frameId: null,
      },
      {
        id: 'inc-d-r4',
        kind: 'print',
        quantity: 4,
        printSize: '2R',
        attires: ['Filipiniana', 'Executive'],
        description: null,
        frameId: null,
      },
      {
        id: 'inc-d-r5',
        kind: 'print',
        quantity: 6,
        printSize: '2x2',
        attires: ['Filipiniana', 'Executive'],
        description: null,
        frameId: null,
      },
      ...privilegeRows('d'),
    ],
  },
  {
    id: 'pkg-a',
    name: 'Package A',
    description: '1 framed 11x14 Toga with Toga prints.',
    slug: 'package-a',
    priceCents: 110000,
    durationMinutes: null,
    isFeatured: false,
    isActive: false, // PROTOTYPE-ONLY flag: exercises the deactivated row state
    coverImageUrl: null,
    frames: [{ id: 'fr-a-1', frameNumber: 1 }],
    inclusions: [
      {
        id: 'inc-a-f1',
        kind: 'framed_picture',
        quantity: 1,
        printSize: '11x14',
        attires: ['Toga'],
        description: null,
        frameId: 'fr-a-1',
      },
      {
        id: 'inc-a-r1',
        kind: 'print',
        quantity: 4,
        printSize: '2R',
        attires: ['Toga'],
        description: null,
        frameId: null,
      },
      {
        id: 'inc-a-r2',
        kind: 'print',
        quantity: 5,
        printSize: '2x2',
        attires: ['Toga'],
        description: null,
        frameId: null,
      },
      {
        id: 'inc-a-r3',
        kind: 'print',
        quantity: 4,
        printSize: '1x1',
        attires: ['Toga'],
        description: null,
        frameId: null,
      },
      ...privilegeRows('a'),
    ],
  },
];

// — Gallery + testimonials (PROTOTYPE-ONLY synthetics — no catalog source) —

export const galleryCategories: GalleryCategoryRow[] = [
  { id: 'gc-graduation', name: 'Graduation', position: 1, isActive: true },
  { id: 'gc-portraits', name: 'Portraits', position: 2, isActive: true },
  { id: 'gc-events', name: 'Events', position: 3, isActive: true },
];

export const galleryPhotos: GalleryPhotoRow[] = [
  {
    id: 'gp-1',
    photoUrl: null,
    title: 'Cap and gown',
    caption: 'Classic graduation portrait',
    categoryId: 'gc-graduation',
    position: 1,
    isActive: true,
  },
  {
    id: 'gp-2',
    photoUrl: null,
    title: 'The toss',
    caption: null,
    categoryId: 'gc-graduation',
    position: 2,
    isActive: true,
  },
  {
    id: 'gp-3',
    photoUrl: null,
    title: 'Diploma handshake',
    caption: null,
    categoryId: 'gc-graduation',
    position: 3,
    isActive: true,
  },
  {
    id: 'gp-4',
    photoUrl: null,
    title: 'Gray backdrop portrait',
    caption: 'Studio portrait series',
    categoryId: 'gc-portraits',
    position: 4,
    isActive: true,
  },
  {
    id: 'gp-5',
    photoUrl: null,
    title: 'Family portrait',
    caption: null,
    categoryId: 'gc-portraits',
    position: 5,
    isActive: false,
  },
  {
    id: 'gp-6',
    photoUrl: null,
    title: 'Id photo set',
    caption: null,
    categoryId: 'gc-portraits',
    position: 6,
    isActive: true,
  },
  {
    id: 'gp-7',
    photoUrl: null,
    title: 'Branch opening day',
    caption: 'Dipolog branch, 2025',
    categoryId: 'gc-events',
    position: 7,
    isActive: true,
  },
  {
    id: 'gp-8',
    photoUrl: null,
    title: 'Behind the scenes',
    caption: null,
    categoryId: null,
    position: 8,
    isActive: true,
  },
];

export const testimonials: TestimonialRow[] = [
  {
    id: 'tm-1',
    quote: 'The whole shoot felt easy and the photos came out beautiful.',
    person: 'Maria S.',
    position: 1,
    isActive: true,
  },
  {
    id: 'tm-2',
    quote: 'Fast turnaround — we had our prints in a week.',
    person: 'Juan D.',
    position: 2,
    isActive: true,
  },
  {
    id: 'tm-3',
    quote: 'They handled our batch of 200 graduates smoothly.',
    person: 'Calamba National High School',
    position: 3,
    isActive: true,
  },
];
