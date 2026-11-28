// The Global Search engine seam (M9 #315, D7/D8): a hand-wired fuse.js
// matcher over the #288-cached admin list arrays, identity fields weigh
// above body fields (weights pinned here, the spec's execution-tuning
// clause), the gallery photos join their category's name client-side (a
// free Map over the separate cached categories query, so "graduation"
// finds graduation photos however they're captioned), and results group
// under the four fixed headers capped at 5 with the "+N more" tail. cmdk's
// built-in filter cannot serve the inline-dropdown posture (it only
// filters items driven by its own Command.Input inside its tree, and the
// dropdown types into the topbar, outside it), matching lives HERE and
// only here; the component's cmdk tree runs shouldFilter={false} as the
// headless listbox core. Every customer-visible string is one-sourced in
// SEARCH_COPY (D5's ratified table + the 2026-11-17 owner rulings). No
// React, the component composes this; the plain-node suite pins it.
import type {
  BranchRead,
  GalleryCategory,
  GalleryPhoto,
  ServicePackageRead,
  Testimonial,
} from '@sevendays/types';
import Fuse from 'fuse.js';
import { thumbUrl } from './gallery-thumbs';
import { peso } from './peso';

export type SearchGroupKey = 'packages' | 'branches' | 'testimonials' | 'gallery';

/** The ruled cap (D9): 5 per group; the rest answer as the overflow count. */
export const SEARCH_GROUP_CAP = 5;

/** The identity weight (names, persons, titles), pinned, identity > body (#302). */
export const SEARCH_IDENTITY_WEIGHT = 2;

/** The body weight (descriptions, addresses, quotes, captions, the joined category name). */
export const SEARCH_BODY_WEIGHT = 1;

const FUSE_THRESHOLD = 0.3;

// D5's ratified copy table (one source; the component imports, never
// re-declares). The no-results period sits INSIDE the closing curly quote
// and the group labels are the ruled four, both owner-ruled, byte-pinned
// by the suite.
export const SEARCH_COPY = {
  hint: 'Type to search packages, branches, testimonials, gallery',
  noResults: (query: string) => `No results for “${query}.”`,
  overflow: (n: number, label: string) => `+${n} more in ${label}`,
  deactivated: 'Deactivated',
  groupLabels: {
    packages: 'Packages',
    branches: 'Branches',
    testimonials: 'Testimonials',
    gallery: 'Gallery',
  } satisfies Record<SearchGroupKey, string>,
} as const;

// Where a result lands (D10): the entity's list screen with the uniform
// ?focus=<id> param. THIS seam emits the href; #316's landing honors it
// (scroll into view + highlight), nothing here reads or registers params.
const GROUP_ROUTES: Record<SearchGroupKey, string> = {
  packages: '/packages',
  branches: '/branches',
  testimonials: '/testimonials',
  gallery: '/gallery',
};

export function focusUrlFor(group: SearchGroupKey, id: string): string {
  return `${GROUP_ROUTES[group]}?focus=${id}`;
}

/** One rendered result row, everything the item anatomy needs (D9). */
export interface SearchHit {
  id: string;
  group: SearchGroupKey;
  /** Identity field, the primary line. */
  primary: string;
  /** Body field, the one-line secondary snippet ('' when none). */
  secondary: string;
  deactivated: boolean;
  /** Packages only, the peso-formatted price ('' when unpriced, ADR-0020). */
  price: string;
  /** Gallery only, the #287 versioned thumb URL; null elsewhere. */
  thumbUrl: string | null;
  focusUrl: string;
}

/** One group's capped slice + the "+N more" count. */
export interface SearchGroup {
  key: SearchGroupKey;
  label: string;
  hits: SearchHit[];
  overflow: number;
}

export type SearchDropdownState = 'hint' | 'empty' | 'results';

/** Zero query = the hint line, never browse-all (#302); no match = the muted line. */
export function searchDropdownState(query: string, groups: SearchGroup[]): SearchDropdownState {
  if (query.trim() === '') return 'hint';
  return groups.length === 0 ? 'empty' : 'results';
}

/** The gallery photo with its category name joined (D8): body-weight search field + display half of the secondary line. */
export interface IndexedPhoto extends GalleryPhoto {
  categoryName: string;
}

export interface SearchIndex {
  packages: Fuse<ServicePackageRead>;
  branches: Fuse<BranchRead>;
  testimonials: Fuse<Testimonial>;
  photos: Fuse<IndexedPhoto>;
}

export interface SearchIndexInput {
  packages: ServicePackageRead[];
  branches: BranchRead[];
  testimonials: Testimonial[];
  photos: GalleryPhoto[];
  categories: GalleryCategory[];
}

const toPackageHit = (row: ServicePackageRead): SearchHit => ({
  id: row.id,
  group: 'packages',
  primary: row.name,
  secondary: row.description,
  deactivated: !row.isActive,
  price: peso(row.priceCents) ?? '',
  thumbUrl: null,
  focusUrl: focusUrlFor('packages', row.id),
});

const toBranchHit = (row: BranchRead): SearchHit => ({
  id: row.id,
  group: 'branches',
  primary: row.name,
  secondary: row.address,
  deactivated: !row.isActive,
  price: '',
  thumbUrl: null,
  focusUrl: focusUrlFor('branches', row.id),
});

const toTestimonialHit = (row: Testimonial): SearchHit => ({
  id: row.id,
  group: 'testimonials',
  primary: row.person,
  secondary: row.quote,
  deactivated: !row.isActive,
  price: '',
  thumbUrl: null,
  focusUrl: focusUrlFor('testimonials', row.id),
});

const toPhotoHit = (row: IndexedPhoto): SearchHit => ({
  id: row.id,
  group: 'gallery',
  // Null titles are the wire's truth: an empty identity renders honestly
  // (the secondary line carries the match); a photo null in every indexed
  // field simply matches nothing.
  primary: row.title ?? '',
  secondary: [row.categoryName, row.caption ?? ''].filter((part) => part !== '').join(' · '),
  deactivated: !row.isActive,
  price: '',
  thumbUrl: thumbUrl(row),
  focusUrl: focusUrlFor('gallery', row.id),
});

/**
 * Builds the four per-entity Fuse indexes over cached-shaped arrays (D8:
 * the exact shapes the #288 factories deliver, deactivated rows included).
 * The category join is a free client-side Map: a missing or null
 * categoryId joins to '' (uncategorized photos search their own fields
 * only). Excluded everywhere: slugs, branch phone, frames/inclusions;
 * system identifiers and junction data, not search surface.
 */
export function buildSearchIndex(input: SearchIndexInput): SearchIndex {
  const categoriesById = new Map(input.categories.map((row) => [row.id, row.name]));
  const photos: IndexedPhoto[] = input.photos.map((row) => ({
    ...row,
    categoryName: (row.categoryId !== null ? categoriesById.get(row.categoryId) : undefined) ?? '',
  }));

  return {
    packages: new Fuse(input.packages, {
      keys: [
        { name: 'name', weight: SEARCH_IDENTITY_WEIGHT },
        { name: 'description', weight: SEARCH_BODY_WEIGHT },
      ],
      threshold: FUSE_THRESHOLD,
      ignoreLocation: true,
      includeScore: true,
    }),
    branches: new Fuse(input.branches, {
      keys: [
        { name: 'name', weight: SEARCH_IDENTITY_WEIGHT },
        { name: 'address', weight: SEARCH_BODY_WEIGHT },
      ],
      threshold: FUSE_THRESHOLD,
      ignoreLocation: true,
      includeScore: true,
    }),
    testimonials: new Fuse(input.testimonials, {
      keys: [
        { name: 'person', weight: SEARCH_IDENTITY_WEIGHT },
        { name: 'quote', weight: SEARCH_BODY_WEIGHT },
      ],
      threshold: FUSE_THRESHOLD,
      ignoreLocation: true,
      includeScore: true,
    }),
    photos: new Fuse(photos, {
      keys: [
        { name: 'title', weight: SEARCH_IDENTITY_WEIGHT },
        { name: 'caption', weight: SEARCH_BODY_WEIGHT },
        { name: 'categoryName', weight: SEARCH_BODY_WEIGHT },
      ],
      threshold: FUSE_THRESHOLD,
      ignoreLocation: true,
      includeScore: true,
    }),
  };
}

/**
 * One pass over the index: relevance-ordered per group (fuse's weighted
 * score), capped at SEARCH_GROUP_CAP with the remainder as overflow, the
 * four groups in FIXED order with empty groups omitted. Zero query answers
 * [], the hint line, never browse-all.
 */
export function runSearch(index: SearchIndex, query: string): SearchGroup[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return [];

  const cap = (hits: SearchHit[]): Pick<SearchGroup, 'hits' | 'overflow'> =>
    hits.length > SEARCH_GROUP_CAP
      ? { hits: hits.slice(0, SEARCH_GROUP_CAP), overflow: hits.length - SEARCH_GROUP_CAP }
      : { hits, overflow: 0 };

  const groups: SearchGroup[] = [];
  const packagesCapped = cap(
    index.packages.search(needle).map((entry) => toPackageHit(entry.item))
  );
  if (packagesCapped.hits.length > 0)
    groups.push({ key: 'packages', label: SEARCH_COPY.groupLabels.packages, ...packagesCapped });
  const branchesCapped = cap(index.branches.search(needle).map((entry) => toBranchHit(entry.item)));
  if (branchesCapped.hits.length > 0)
    groups.push({ key: 'branches', label: SEARCH_COPY.groupLabels.branches, ...branchesCapped });
  const testimonialsCapped = cap(
    index.testimonials.search(needle).map((entry) => toTestimonialHit(entry.item))
  );
  if (testimonialsCapped.hits.length > 0)
    groups.push({
      key: 'testimonials',
      label: SEARCH_COPY.groupLabels.testimonials,
      ...testimonialsCapped,
    });
  const photosCapped = cap(index.photos.search(needle).map((entry) => toPhotoHit(entry.item)));
  if (photosCapped.hits.length > 0)
    groups.push({ key: 'gallery', label: SEARCH_COPY.groupLabels.gallery, ...photosCapped });
  return groups;
}
