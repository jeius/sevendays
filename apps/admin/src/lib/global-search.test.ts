import {
  branchReadSchema,
  galleryCategorySchema,
  galleryPhotoSchema,
  servicePackageReadSchema,
  testimonialSchema,
} from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import { thumbUrl } from './gallery-thumbs.js';
import {
  buildSearchIndex,
  focusUrlFor,
  runSearch,
  SEARCH_BODY_WEIGHT,
  SEARCH_COPY,
  SEARCH_GROUP_CAP,
  SEARCH_IDENTITY_WEIGHT,
  type SearchIndexInput,
  searchDropdownState,
} from './global-search.js';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const STAMP = '2026-11-17T00:00:00.000Z';

// Fixtures parse through the WIRE schemas (the gallery-thumbs posture):
// what the seam consumes is exactly what the cached #288 queries deliver,
// Date instances and nullables included.
const pkg = (n: number, overrides: Record<string, unknown> = {}) =>
  servicePackageReadSchema.parse({
    id: uuid(n),
    name: `Package ${n}`,
    description: `Description ${n}`,
    priceCents: 110000,
    durationMinutes: 60,
    isActive: true,
    coverImageUrl: null,
    slug: `package-${n}`,
    isFeatured: false,
    inclusions: [],
    frames: [],
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  });

const branch = (n: number, overrides: Record<string, unknown> = {}) =>
  branchReadSchema.parse({
    id: uuid(n),
    name: `Branch ${n}`,
    address: `Address ${n}`,
    phone: '555-0100',
    acceptsWalkIns: false,
    isActive: true,
    coverImageUrl: null,
    latitude: null,
    longitude: null,
    googleMapsUrl: null,
    appleMapsUrl: null,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  });

const testimonial = (n: number, overrides: Record<string, unknown> = {}) =>
  testimonialSchema.parse({
    id: uuid(n),
    quote: `Quote ${n}`,
    person: `Person ${n}`,
    position: n,
    isActive: true,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  });

const photo = (n: number, overrides: Record<string, unknown> = {}) =>
  galleryPhotoSchema.parse({
    id: uuid(n),
    title: `Photo ${n}`,
    caption: null,
    categoryId: null,
    position: n,
    isActive: true,
    photoUrl: `https://pub-test.r2.dev/gallery/${n}.jpg`,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  });

const category = (n: number, overrides: Record<string, unknown> = {}) =>
  galleryCategorySchema.parse({
    id: uuid(n),
    name: `Category ${n}`,
    position: n,
    isActive: true,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  });

const makeIndex = (overrides: Partial<SearchIndexInput> = {}) =>
  buildSearchIndex({
    packages: [pkg(1)],
    branches: [branch(11)],
    testimonials: [testimonial(21)],
    photos: [photo(31)],
    categories: [category(41)],
    ...overrides,
  });

describe('the index + fields (D8)', () => {
  it('zero query answers [], the hint line, never browse-all (#302)', () => {
    expect(runSearch(makeIndex(), '')).toEqual([]);
    expect(runSearch(makeIndex(), '   ')).toEqual([]);
  });

  it('filters from the first character, no min-length gate', () => {
    const index = makeIndex({ packages: [pkg(1, { name: 'Graduation Deluxe' })] });
    expect(runSearch(index, 'g')[0]?.hits[0]?.id).toBe(uuid(1));
  });

  it('packages: name + description match; the slug never does (D8 exclusions)', () => {
    const index = makeIndex({
      packages: [
        pkg(1, { name: 'Graduation Deluxe', description: 'Full studio coverage' }),
        pkg(2, {
          name: 'Standard',
          description: 'Includes a graduation cap keepsake',
          slug: 'zeta-hidden-token',
        }),
      ],
    });
    const ids = runSearch(index, 'graduation')[0]?.hits.map((hit) => hit.id) ?? [];
    expect(ids).toContain(uuid(1));
    expect(ids).toContain(uuid(2));
    expect(runSearch(index, 'hidden-token')).toEqual([]);
  });

  it('branches: name + address match; the phone never does (D8 exclusions)', () => {
    const index = makeIndex({
      branches: [
        branch(11, { name: 'SM North', address: 'Quezon City avenue', phone: '555-ZX9-PIPE' }),
      ],
    });
    expect(runSearch(index, 'north')[0]?.key).toBe('branches');
    expect(runSearch(index, 'quezon')[0]?.key).toBe('branches');
    expect(runSearch(index, 'pipe')).toEqual([]);
  });

  it('testimonials: person (identity) + quote (body)', () => {
    const index = makeIndex({
      testimonials: [
        testimonial(21, { person: 'Maria Santos', quote: 'Made our debut effortless' }),
      ],
    });
    expect(runSearch(index, 'maria')[0]?.key).toBe('testimonials');
    expect(runSearch(index, 'effortless')[0]?.key).toBe('testimonials');
  });

  it('gallery photos: title (identity) + caption (body)', () => {
    const index = makeIndex({
      photos: [photo(31, { title: 'Golden hour', caption: 'The aisle walk' })],
    });
    expect(runSearch(index, 'golden')[0]?.key).toBe('gallery');
    expect(runSearch(index, 'aisle')[0]?.key).toBe('gallery');
  });

  it("the category-name join, a photo matches its category's name however it's captioned (D8)", () => {
    const index = makeIndex({
      photos: [
        photo(31, { title: 'Sunset pair', caption: 'The couple at dusk', categoryId: uuid(41) }),
      ],
      categories: [category(41, { name: 'Graduation' })],
    });
    const [gallery] = runSearch(index, 'graduation');
    expect(gallery?.key).toBe('gallery');
    expect(gallery?.hits[0]?.id).toBe(uuid(31));
  });

  it('the join displayed, gallery secondary is "category · caption", empty parts skipped', () => {
    const index = makeIndex({
      photos: [
        photo(31, { title: 'Sunset pair', caption: 'The couple at dusk', categoryId: uuid(41) }),
        photo(32, { title: 'Morning pair', caption: null, categoryId: uuid(41) }),
        photo(33, { title: 'Uncategorized pair', caption: 'Loose frame', categoryId: null }),
      ],
      categories: [category(41, { name: 'Graduation' })],
    });
    const byId = new Map(
      (runSearch(index, 'pair')[0]?.hits ?? []).map((hit) => [hit.id, hit.secondary])
    );
    expect(byId.get(uuid(31))).toBe('Graduation · The couple at dusk');
    expect(byId.get(uuid(32))).toBe('Graduation');
    expect(byId.get(uuid(33))).toBe('Loose frame');
  });

  it('nullable wire fields never throw, a null-title photo matches by caption, renders an empty identity', () => {
    const index = makeIndex({
      photos: [photo(31, { title: null, caption: 'Beach sunset', categoryId: uuid(41) })],
      categories: [category(41, { name: 'Destinations' })],
    });
    const [gallery] = runSearch(index, 'beach');
    expect(gallery?.hits[0]?.primary).toBe('');
    expect(gallery?.hits[0]?.secondary).toBe('Destinations · Beach sunset');
  });
});

describe('ranking + capping + order (D7/D9)', () => {
  it('identity > body, the pinned weights, an identity match outranks a body match', () => {
    expect(SEARCH_IDENTITY_WEIGHT).toBe(2);
    expect(SEARCH_BODY_WEIGHT).toBe(1);
    const index = makeIndex({
      packages: [
        pkg(1, { name: 'Debut', description: 'A classic studio session' }),
        pkg(2, { name: 'Standard', description: 'Debutantes love this classic package' }),
      ],
    });
    const [packagesGroup] = runSearch(index, 'debut');
    expect(packagesGroup?.key).toBe('packages');
    expect(packagesGroup?.hits[0]?.id).toBe(uuid(1));
    expect(packagesGroup?.hits[1]?.id).toBe(uuid(2));
  });

  it('five per group + the overflow count (D9)', () => {
    expect(SEARCH_GROUP_CAP).toBe(5);
    const index = makeIndex({
      packages: Array.from({ length: 7 }, (_, i) => pkg(10 + i, { name: `Graduation ${i + 1}` })),
    });
    const [group] = runSearch(index, 'graduation');
    expect(group?.hits).toHaveLength(5);
    expect(group?.overflow).toBe(2);
  });

  it('fixed group order, packages, branches, testimonials, gallery; empty groups omitted', () => {
    const index = makeIndex({
      packages: [pkg(1, { name: 'Alpha Pack' })],
      branches: [branch(11, { name: 'Alpha Mall', address: 'Somewhere' })],
      testimonials: [testimonial(21, { person: 'Alpha Santos', quote: 'Wonderful' })],
      photos: [photo(31, { title: 'Alpha Sunrise' })],
    });
    expect(runSearch(index, 'alpha').map((group) => group.key)).toEqual([
      'packages',
      'branches',
      'testimonials',
      'gallery',
    ]);
    expect(runSearch(index, 'mall').map((group) => group.key)).toEqual(['branches']);
  });
});

describe('hits + navigation + states (D9/D10)', () => {
  it('deactivated rows stay findable and are marked', () => {
    const index = makeIndex({
      packages: [
        pkg(1, { name: 'Debut Classic' }),
        pkg(2, { name: 'Debut Retired', isActive: false }),
      ],
    });
    const hits = runSearch(index, 'debut')[0]?.hits ?? [];
    expect(hits.map((hit) => hit.id)).toEqual([uuid(1), uuid(2)]);
    expect(hits[0]?.deactivated).toBe(false);
    expect(hits[1]?.deactivated).toBe(true);
  });

  it('peso on package rows, priced formats, unpriced stays blank (ADR-0020)', () => {
    const index = makeIndex({
      packages: [
        pkg(1, { name: 'Priced Session', priceCents: 110000 }),
        pkg(2, { name: 'Inquiry Session', priceCents: null }),
      ],
    });
    const byId = new Map(
      (runSearch(index, 'session')[0]?.hits ?? []).map((hit) => [hit.id, hit.price])
    );
    expect(byId.get(uuid(1))).toBe('₱1,100.00');
    expect(byId.get(uuid(2))).toBe('');
  });

  it('gallery rows carry the #287 versioned thumb; every other group carries null', () => {
    const index = makeIndex({
      packages: [pkg(1, { name: 'Alpha' })],
      photos: [photo(31, { title: 'Alpha shot' })],
    });
    const byGroup = new Map(
      runSearch(index, 'alpha').flatMap((group) => group.hits.map((hit) => [hit.group, hit]))
    );
    expect(byGroup.get('gallery')?.thumbUrl).toBe(thumbUrl(photo(31, { title: 'Alpha shot' })));
    expect(byGroup.get('packages')?.thumbUrl).toBeNull();
  });

  it('focusUrlFor, one uniform ?focus=<id> href per group (D10 emit; #316 honors)', () => {
    expect(focusUrlFor('packages', uuid(1))).toBe(`/packages?focus=${uuid(1)}`);
    expect(focusUrlFor('branches', uuid(2))).toBe(`/branches?focus=${uuid(2)}`);
    expect(focusUrlFor('testimonials', uuid(3))).toBe(`/testimonials?focus=${uuid(3)}`);
    expect(focusUrlFor('gallery', uuid(4))).toBe(`/gallery?focus=${uuid(4)}`);
  });

  it('searchDropdownState, hint at zero query, empty at no match, results otherwise', () => {
    expect(searchDropdownState('', [])).toBe('hint');
    expect(searchDropdownState('  ', [])).toBe('hint');
    expect(searchDropdownState('zzz', [])).toBe('empty');
    const stub = [{ key: 'packages' as const, label: 'Packages', hits: [], overflow: 0 }];
    expect(searchDropdownState('zzz', stub)).toBe('results');
  });
});

describe('the copy, verbatim (D5 at #305 + the 2026-11-17 owner rulings)', () => {
  it('hint, overflow tail, Deactivated suffix, group labels, one-sourced, byte-pinned', () => {
    expect(SEARCH_COPY.hint).toBe('Type to search packages, branches, testimonials, gallery');
    expect(SEARCH_COPY.overflow(2, 'Packages')).toBe('+2 more in Packages');
    expect(SEARCH_COPY.deactivated).toBe('Deactivated');
    expect(SEARCH_COPY.groupLabels).toEqual({
      packages: 'Packages',
      branches: 'Branches',
      testimonials: 'Testimonials',
      gallery: 'Gallery',
    });
  });

  it('the no-results line, period INSIDE the closing curly quote (owner-ruled 2026-11-17)', () => {
    expect(SEARCH_COPY.noResults('graduation')).toBe('No results for “graduation.”');
  });
});
