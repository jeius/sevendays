// The seed's single source of truth — transcribed verbatim from docs/catalog.md.
// The verify script compares the DATABASE rows against these values, so any
// edit here must mirror the catalog file (and vice versa).
// Phones are user-sanctioned placeholders (TODO(seed)) — replaced after seed review.

export const printSizeSeeds = [
  { code: '1x1', description: 'One by one inch portrait print.' },
  { code: '2x2', description: 'Two by two inch portrait print (standard ID size).' },
  { code: '2R', description: '2R wallet-size portrait print.' },
  {
    code: '8R',
    description:
      '8R print — nominally the same physical size as 8x10; both appear in the price list. Client to confirm at seed review whether they merge.',
  },
  { code: '8x10', description: '8x10 inch print, commonly framed.' },
  { code: '11x14', description: '11x14 inch print, commonly framed.' },
] as const;

export const attireSeeds = [
  { name: 'Toga' },
  { name: 'Filipiniana' },
  { name: 'Executive' },
  { name: 'Uniform' },
  { name: 'Filipiniana/Executive' },
  { name: 'Filipiniana/Executive/Uniform' },
  { name: 'Executive/Uniform' },
] as const;

// USER-SUPPLIED branch rows (2026-09-01). Phones are TODO(seed) placeholders.
export const branchSeeds = [
  {
    name: 'Calamba Main Branch',
    address: 'DBAN, Calamba, Misamis Occidental',
    phone: '+63 900 000 001', // TODO(seed): replace with the real phone
    acceptsWalkIns: false,
  },
  {
    name: 'Iligan Branch',
    address: 'Iligan City, Lanao del Norte',
    phone: '+63 900 000 002', // TODO(seed): replace with the real phone
    acceptsWalkIns: false,
  },
  {
    name: 'Dipolog Branch',
    address: 'Dipolog City, Zamboanga del Norte',
    phone: '+63 900 000 003', // TODO(seed): replace with the real phone
    acceptsWalkIns: true,
  },
] as const;

export const addonServiceSeeds = [
  {
    name: 'Makeup',
    description: 'Professional make-up applied on-site before the shoot.',
    priceCents: 12000,
    isActive: true,
  },
  {
    name: 'Hairstyle',
    description: 'Professional hairstyling on-site before the shoot.',
    priceCents: 6000,
    isActive: true,
  },
] as const;

// Universal privileges seeded per package (catalog: "All packages includes
// High Resolution soft copies" + the "Include Usage of" list). Lamination is
// NOT here — framed_picture kind encodes it structurally.
export const privilegeSeeds = [
  { description: 'High Resolution soft copies', attireName: null },
  { description: 'Usage of Toga and Hood', attireName: 'Toga' },
  { description: 'Usage of Ladies Accessories', attireName: null },
  { description: 'Usage of Executive Attire', attireName: 'Executive' },
  { description: 'Usage of Barong', attireName: null },
  { description: 'Usage of Filipiniana', attireName: 'Filipiniana' },
] as const;

export type PackageSeed = {
  name: string;
  description: string;
  priceCents: number;
  // Framed pictures: one row per catalog Frame line (quantity 1).
  framedPictures: { printSizeCode: string; attireName: string; catalogLine: string }[];
  // Loose prints: one row per catalog Picture line (per-line quantity).
  prints: { quantity: number; printSizeCode: string; attireName: string; catalogLine: string }[];
};

export const packageSeeds: PackageSeed[] = [
  {
    name: 'Basic Package',
    description: 'Entry graduation portrait package — 1 framed 8x10 Toga plus wallet-size prints.',
    priceCents: 90000,
    framedPictures: [
      // Frame: 1pc 8x10 Toga
      { printSizeCode: '8x10', attireName: 'Toga', catalogLine: 'Frame: 1pc 8x10 Toga' },
    ],
    prints: [
      { quantity: 2, printSizeCode: '2R', attireName: 'Toga', catalogLine: '2pcs 2R Toga' },
      { quantity: 5, printSizeCode: '2x2', attireName: 'Toga', catalogLine: '5pcs 2x2 Toga' },
      { quantity: 4, printSizeCode: '1x1', attireName: 'Toga', catalogLine: '4pcs 1x1 Toga' },
    ],
  },
  {
    name: 'Package A',
    description: '1 framed 11x14 Toga with Toga prints.',
    priceCents: 110000,
    framedPictures: [
      // Frame: 1pc 11x14 Toga
      { printSizeCode: '11x14', attireName: 'Toga', catalogLine: 'Frame: 1pc 11x14 Toga' },
    ],
    prints: [
      { quantity: 4, printSizeCode: '2R', attireName: 'Toga', catalogLine: '4pcs 2R Toga' },
      { quantity: 5, printSizeCode: '2x2', attireName: 'Toga', catalogLine: '5pcs 2x2 Toga' },
      { quantity: 4, printSizeCode: '1x1', attireName: 'Toga', catalogLine: '4pcs 1x1 Toga' },
    ],
  },
  {
    name: 'Package B',
    description:
      '1 framed 8x10 Toga and 1 framed 8x10 Filipiniana/Executive with prints in both attires.',
    priceCents: 150000,
    framedPictures: [
      // Frame: 1pc 8x10 Toga
      { printSizeCode: '8x10', attireName: 'Toga', catalogLine: 'Frame: 1pc 8x10 Toga' },
      // Frame: 1pc 8x10 Filipiniana/Executive
      {
        printSizeCode: '8x10',
        attireName: 'Filipiniana/Executive',
        catalogLine: 'Frame: 1pc 8x10 Filipiniana/Executive',
      },
    ],
    prints: [
      { quantity: 4, printSizeCode: '2R', attireName: 'Toga', catalogLine: '4pcs 2R Toga' },
      { quantity: 5, printSizeCode: '2x2', attireName: 'Toga', catalogLine: '5pcs 2x2 Toga' },
      { quantity: 4, printSizeCode: '1x1', attireName: 'Toga', catalogLine: '4pcs 1x1 Toga' },
      {
        quantity: 6,
        printSizeCode: '2R',
        attireName: 'Filipiniana/Executive',
        catalogLine: '6pcs 2R Filipiniana/Executive',
      },
      {
        quantity: 6,
        printSizeCode: '2x2',
        attireName: 'Filipiniana/Executive',
        catalogLine: '6pcs 2x2 Filipiniana/Executive',
      },
    ],
  },
  {
    name: 'Package C',
    description: '1 framed 11x14 Toga with Toga and Filipiniana/Executive prints.',
    priceCents: 160000,
    framedPictures: [
      // Frame: 1pc 11x14 Toga
      { printSizeCode: '11x14', attireName: 'Toga', catalogLine: 'Frame: 1pc 11x14 Toga' },
    ],
    prints: [
      { quantity: 4, printSizeCode: '2R', attireName: 'Toga', catalogLine: '4pcs 2R Toga' },
      { quantity: 5, printSizeCode: '2x2', attireName: 'Toga', catalogLine: '5pcs 2x2 Toga' },
      { quantity: 4, printSizeCode: '1x1', attireName: 'Toga', catalogLine: '4pcs 1x1 Toga' },
      {
        quantity: 1,
        printSizeCode: '8R',
        attireName: 'Filipiniana/Executive',
        catalogLine: '1pc 8R Filipiniana/Executive',
      },
      {
        quantity: 4,
        printSizeCode: '2R',
        attireName: 'Filipiniana/Executive',
        catalogLine: '4pcs 2R Filipiniana/Executive',
      },
      {
        quantity: 6,
        printSizeCode: '2x2',
        attireName: 'Filipiniana/Executive',
        catalogLine: '6pcs 2x2 Filipiniana/Executive',
      },
    ],
  },
  {
    name: 'Package D',
    description:
      'Two framed pictures (11x14 Toga, 8x10 Filipiniana/Executive) with Toga and Filipiniana/Executive prints.',
    priceCents: 180000,
    framedPictures: [
      // Frame 1: 1pc 11x14 Toga
      { printSizeCode: '11x14', attireName: 'Toga', catalogLine: 'Frame 1: 1pc 11x14 Toga' },
      // Frame 2: 1pc 8x10 Filipiniana/Executive
      {
        printSizeCode: '8x10',
        attireName: 'Filipiniana/Executive',
        catalogLine: 'Frame 2: 1pc 8x10 Filipiniana/Executive',
      },
    ],
    prints: [
      { quantity: 4, printSizeCode: '2R', attireName: 'Toga', catalogLine: '4pcs 2R Toga' },
      { quantity: 5, printSizeCode: '2x2', attireName: 'Toga', catalogLine: '5pcs 2x2 Toga' },
      { quantity: 4, printSizeCode: '1x1', attireName: 'Toga', catalogLine: '4pcs 1x1 Toga' },
      {
        quantity: 4,
        printSizeCode: '2R',
        attireName: 'Filipiniana/Executive',
        catalogLine: '4pcs 2R Filipiniana/Executive',
      },
      {
        quantity: 6,
        printSizeCode: '2x2',
        attireName: 'Filipiniana/Executive',
        catalogLine: '6pcs 2x2 Filipiniana/Executive',
      },
    ],
  },
  {
    name: 'Package E',
    description:
      'Three framed pictures (Toga, Filipiniana, Executive) with per-attire and combined prints.',
    priceCents: 200000,
    framedPictures: [
      // Frame: 1pc 8x10 Toga
      { printSizeCode: '8x10', attireName: 'Toga', catalogLine: 'Frame: 1pc 8x10 Toga' },
      // Frame: 1pc 8x10 Filipiniana
      {
        printSizeCode: '8x10',
        attireName: 'Filipiniana',
        catalogLine: 'Frame: 1pc 8x10 Filipiniana',
      },
      // Frame: 1pc 8x10 Executive
      { printSizeCode: '8x10', attireName: 'Executive', catalogLine: 'Frame: 1pc 8x10 Executive' },
    ],
    prints: [
      { quantity: 4, printSizeCode: '2R', attireName: 'Toga', catalogLine: '4pcs 2R Toga' },
      { quantity: 5, printSizeCode: '2x2', attireName: 'Toga', catalogLine: '5pcs 2x2 Toga' },
      { quantity: 4, printSizeCode: '1x1', attireName: 'Toga', catalogLine: '4pcs 1x1 Toga' },
      {
        quantity: 6,
        printSizeCode: '2x2',
        attireName: 'Filipiniana/Executive',
        catalogLine: '6pcs 2x2 Filipiniana/Executive',
      },
      {
        quantity: 4,
        printSizeCode: '2R',
        attireName: 'Filipiniana',
        catalogLine: '4pcs 2R Filipiniana',
      },
      {
        quantity: 4,
        printSizeCode: '2R',
        attireName: 'Executive',
        catalogLine: '4pcs 2R Executive',
      },
    ],
  },
  {
    name: 'Package F',
    description:
      'Three framed pictures (Toga, Filipiniana, Executive) with per-attire and combined prints.',
    priceCents: 220000,
    framedPictures: [
      // Frame 1: 1pc 8x10 Toga
      { printSizeCode: '8x10', attireName: 'Toga', catalogLine: 'Frame 1: 1pc 8x10 Toga' },
      // Frame 2: 1pc 8x10 Filipiniana
      {
        printSizeCode: '8x10',
        attireName: 'Filipiniana',
        catalogLine: 'Frame 2: 1pc 8x10 Filipiniana',
      },
      // Frame 3: 1pc 8x10 Executive
      {
        printSizeCode: '8x10',
        attireName: 'Executive',
        catalogLine: 'Frame 3: 1pc 8x10 Executive',
      },
    ],
    prints: [
      { quantity: 4, printSizeCode: '2R', attireName: 'Toga', catalogLine: '4pcs 2R Toga' },
      { quantity: 5, printSizeCode: '2x2', attireName: 'Toga', catalogLine: '5pcs 2x2 Toga' },
      { quantity: 4, printSizeCode: '1x1', attireName: 'Toga', catalogLine: '4pcs 1x1 Toga' },
      {
        quantity: 6,
        printSizeCode: '2x2',
        attireName: 'Filipiniana/Executive',
        catalogLine: '6pcs 2x2 Filipiniana/Executive',
      },
      {
        quantity: 4,
        printSizeCode: '2R',
        attireName: 'Filipiniana',
        catalogLine: '4pcs 2R Filipiniana',
      },
      {
        quantity: 4,
        printSizeCode: '2R',
        attireName: 'Executive',
        catalogLine: '4pcs 2R Executive',
      },
    ],
  },
  {
    name: 'Package G',
    description: '11x14 frames in Toga and Filipiniana/Executive/Uniform with matching prints.',
    priceCents: 300000,
    framedPictures: [
      // Frame: 1pc 11x14 Toga
      { printSizeCode: '11x14', attireName: 'Toga', catalogLine: 'Frame: 1pc 11x14 Toga' },
      // Frame: 1pc 11x14 Filipiniana/Executive/Uniform
      {
        printSizeCode: '11x14',
        attireName: 'Filipiniana/Executive/Uniform',
        catalogLine: 'Frame: 1pc 11x14 Filipiniana/Executive/Uniform',
      },
    ],
    prints: [
      { quantity: 4, printSizeCode: '2R', attireName: 'Toga', catalogLine: '4pcs 2R Toga' },
      { quantity: 5, printSizeCode: '2x2', attireName: 'Toga', catalogLine: '5pcs 2x2 Toga' },
      { quantity: 4, printSizeCode: '1x1', attireName: 'Toga', catalogLine: '4pcs 1x1 Toga' },
      {
        quantity: 6,
        printSizeCode: '2x2',
        attireName: 'Filipiniana/Executive/Uniform',
        catalogLine: '6pcs 2x2 Filipiniana/Executive/Uniform',
      },
      {
        quantity: 4,
        printSizeCode: '2R',
        attireName: 'Filipiniana/Executive/Uniform',
        catalogLine: '4pcs 2R Filipiniana/Executive/Uniform',
      },
    ],
  },
  {
    name: 'Package H',
    description:
      '11x14 Toga frame plus 8x10 Filipiniana and Executive frames, with combined-attire prints.',
    priceCents: 300000,
    framedPictures: [
      // Frame: 1pc 11x14 Toga
      { printSizeCode: '11x14', attireName: 'Toga', catalogLine: 'Frame: 1pc 11x14 Toga' },
      // Frame: 1pc 8x10 Filipiniana
      {
        printSizeCode: '8x10',
        attireName: 'Filipiniana',
        catalogLine: 'Frame: 1pc 8x10 Filipiniana',
      },
      // Frame: 1pc 8x10 Executive
      { printSizeCode: '8x10', attireName: 'Executive', catalogLine: 'Frame: 1pc 8x10 Executive' },
    ],
    prints: [
      { quantity: 4, printSizeCode: '2R', attireName: 'Toga', catalogLine: '4pcs 2R Toga' },
      { quantity: 5, printSizeCode: '2x2', attireName: 'Toga', catalogLine: '5pcs 2x2 Toga' },
      { quantity: 4, printSizeCode: '1x1', attireName: 'Toga', catalogLine: '4pcs 1x1 Toga' },
      {
        quantity: 6,
        printSizeCode: '2x2',
        attireName: 'Filipiniana/Executive/Uniform',
        catalogLine: '6pcs 2x2 Filipiniana/Executive/Uniform',
      },
      {
        quantity: 4,
        printSizeCode: '2R',
        attireName: 'Filipiniana',
        catalogLine: '4pcs 2R Filipiniana',
      },
      {
        quantity: 4,
        printSizeCode: '2R',
        attireName: 'Executive/Uniform',
        catalogLine: '4pcs 2R Executive/Uniform',
      },
    ],
  },
  {
    name: 'Customize Package (CP-1)',
    description:
      'Three framed pictures (11x14 Toga, 8x10 Filipiniana, 8x10 Executive/Uniform) with combined-attire prints.',
    priceCents: 240000,
    framedPictures: [
      // Frame 1: 1pc 11x14 Toga
      { printSizeCode: '11x14', attireName: 'Toga', catalogLine: 'Frame 1: 1pc 11x14 Toga' },
      // Frame 2: 1pc 8x10 Filipiniana
      {
        printSizeCode: '8x10',
        attireName: 'Filipiniana',
        catalogLine: 'Frame 2: 1pc 8x10 Filipiniana',
      },
      // Frame 3: 1pc 8x10 Executive/Uniform
      {
        printSizeCode: '8x10',
        attireName: 'Executive/Uniform',
        catalogLine: 'Frame 3: 1pc 8x10 Executive/Uniform',
      },
    ],
    prints: [
      { quantity: 4, printSizeCode: '2R', attireName: 'Toga', catalogLine: '4pcs 2R Toga' },
      { quantity: 5, printSizeCode: '2x2', attireName: 'Toga', catalogLine: '5pcs 2x2 Toga' },
      { quantity: 4, printSizeCode: '1x1', attireName: 'Toga', catalogLine: '4pcs 1x1 Toga' },
      {
        quantity: 6,
        printSizeCode: '2x2',
        attireName: 'Filipiniana/Executive/Uniform',
        catalogLine: '6pcs 2x2 Filipiniana/Executive/Uniform',
      },
      {
        quantity: 4,
        printSizeCode: '2R',
        attireName: 'Filipiniana',
        catalogLine: '4pcs 2R Filipiniana',
      },
      {
        quantity: 4,
        printSizeCode: '2R',
        attireName: 'Executive/Uniform',
        catalogLine: '4pcs 2R Executive/Uniform',
      },
    ],
  },
  {
    name: 'Customize Package (CP-2)',
    description:
      '11x14 frames in Toga and Filipiniana/Executive/Uniform with combined-attire prints.',
    priceCents: 220000,
    framedPictures: [
      // Frame 1: 1pc 11x14 Toga
      { printSizeCode: '11x14', attireName: 'Toga', catalogLine: 'Frame 1: 1pc 11x14 Toga' },
      // Frame 2: 1pc 11x14 Filipiniana/Executive/Uniform
      {
        printSizeCode: '11x14',
        attireName: 'Filipiniana/Executive/Uniform',
        catalogLine: 'Frame 2: 1pc 11x14 Filipiniana/Executive/Uniform',
      },
    ],
    prints: [
      { quantity: 4, printSizeCode: '2R', attireName: 'Toga', catalogLine: '4pcs 2R Toga' },
      { quantity: 5, printSizeCode: '2x2', attireName: 'Toga', catalogLine: '5pcs 2x2 Toga' },
      { quantity: 4, printSizeCode: '1x1', attireName: 'Toga', catalogLine: '4pcs 1x1 Toga' },
      {
        quantity: 6,
        printSizeCode: '2x2',
        attireName: 'Filipiniana/Executive/Uniform',
        catalogLine: '6pcs 2x2 Filipiniana/Executive/Uniform',
      },
      {
        quantity: 4,
        printSizeCode: '2R',
        attireName: 'Filipiniana',
        catalogLine: '4pcs 2R Filipiniana',
      },
      {
        quantity: 4,
        printSizeCode: '2R',
        attireName: 'Executive/Uniform',
        catalogLine: '4pcs 2R Executive/Uniform',
      },
    ],
  },
];

// Canonical inclusion signature: `kind|quantity|printSizeCode|attireName` for
// pictures/prints, `privilege|0|<attireName or ->|<description>` for privileges.
// Shared with verify-seed.ts so the comparison is byte-consistent.
export function inclusionSignatures(pkg: PackageSeed): string[] {
  const framed = pkg.framedPictures.map(
    (f) => `framed_picture|1|${f.printSizeCode}|${f.attireName}`
  );
  const prints = pkg.prints.map((p) => `print|${p.quantity}|${p.printSizeCode}|${p.attireName}`);
  const privileges = privilegeSeeds.map(
    (p) => `privilege|0|${p.attireName ?? '-'}|${p.description}`
  );
  return [...framed, ...prints, ...privileges].sort();
}
