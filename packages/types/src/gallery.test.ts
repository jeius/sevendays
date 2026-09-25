import { describe, expect, it } from 'vitest';
import {
  createGalleryCategorySchema,
  createGalleryPhotoSchema,
  galleryCategoryOrderSchema,
  galleryCategorySchema,
  galleryPhotoOrderSchema,
  galleryPhotoSchema,
  galleryReadSchema,
  updateGalleryCategorySchema,
  updateGalleryPhotoSchema,
} from './gallery.js';

const UUID = '00000000-0000-4000-8000-000000000000';
const UUID2 = '00000000-0000-4000-8000-000000000001';
const DATE = '2026-09-25T00:00:00.000Z';
const PHOTO_URL = 'https://pub-0000.r2.dev/gallery/00000000-0000-4000-8000-000000000000.jpg';

describe('galleryCategorySchema', () => {
  it('parses a canonical category row (position 1-based, isActive, dates coerce)', () => {
    const result = galleryCategorySchema.safeParse({
      id: UUID,
      name: 'Graduation',
      position: 1,
      isActive: true,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(result.success).toBe(true);
  });

  it('create drops the server-assigned fields (id/position/timestamps — order PUTs own position)', () => {
    const parsed = createGalleryCategorySchema.parse({
      name: 'Graduation',
      isActive: true,
      id: UUID,
      position: 3,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect('id' in parsed).toBe(false);
    expect('position' in parsed).toBe(false);
    expect('createdAt' in parsed).toBe(false);
    expect('updatedAt' in parsed).toBe(false);
  });

  it('create defaults isActive true when omitted', () => {
    const parsed = createGalleryCategorySchema.parse({ name: 'Graduation' });
    expect(parsed.isActive).toBe(true);
  });

  it('create rejects an empty name', () => {
    const result = createGalleryCategorySchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('update is the create schema (full-object PUT — the same client field set)', () => {
    expect(updateGalleryCategorySchema).toBe(createGalleryCategorySchema);
  });
});

describe('galleryPhotoSchema (the admin read)', () => {
  it('parses a canonical admin read (photoUrl is the absolute resolved URL)', () => {
    const result = galleryPhotoSchema.safeParse({
      id: UUID,
      title: 'Toga portrait',
      caption: null,
      categoryId: UUID2,
      position: 4,
      isActive: false,
      photoUrl: PHOTO_URL,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(result.success).toBe(true);
  });

  it('strips a smuggled r2Key from the parsed output (ADR-0019: raw keys never leave the API)', () => {
    const parsed = galleryPhotoSchema.parse({
      id: UUID,
      title: null,
      caption: null,
      categoryId: null,
      position: 1,
      isActive: true,
      photoUrl: PHOTO_URL,
      r2Key: 'gallery/00000000-0000-4000-8000-000000000000.jpg',
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect('r2Key' in parsed).toBe(false);
  });

  it('create parses the spec-pinned payload { r2Key, title?, caption?, categoryId? }', () => {
    const result = createGalleryPhotoSchema.safeParse({
      r2Key: 'tmp/00000000-0000-4000-8000-000000000000.jpg',
      title: null,
      caption: 'Studio batch 1',
      categoryId: null,
    });
    expect(result.success).toBe(true);
  });

  it('create rejects a missing r2Key', () => {
    const result = createGalleryPhotoSchema.safeParse({ title: 'no key' });
    expect(result.success).toBe(false);
  });

  it('update requires the full metadata fields; r2Key is the optional replace field', () => {
    const full = {
      title: 'Toga portrait',
      caption: null,
      categoryId: UUID2,
      isActive: true,
    };
    expect(updateGalleryPhotoSchema.safeParse(full).success).toBe(true);
    expect(
      updateGalleryPhotoSchema.safeParse({ ...full, r2Key: 'tmp/new-staging.jpg' }).success
    ).toBe(true);
    expect(updateGalleryPhotoSchema.safeParse({ ...full, title: undefined }).success).toBe(false);
  });
});

describe('gallery order payloads (collection full-replace PUTs)', () => {
  it('parses { categoryIds } and { photoIds }; rejects non-uuid entries', () => {
    expect(galleryCategoryOrderSchema.safeParse({ categoryIds: [UUID, UUID2] }).success).toBe(true);
    expect(galleryPhotoOrderSchema.safeParse({ photoIds: [UUID] }).success).toBe(true);
    expect(galleryPhotoOrderSchema.safeParse({ photoIds: ['not-a-uuid'] }).success).toBe(false);
  });
});

describe('galleryReadSchema (the public assembled read)', () => {
  it('parses an assembled payload — categories (tab order) + categorized photos', () => {
    const result = galleryReadSchema.safeParse({
      categories: [
        { id: UUID2, name: 'Graduation' },
        { id: UUID, name: 'Family' },
      ],
      photos: [
        { id: UUID, photoUrl: PHOTO_URL, title: 'Toga portrait', categoryId: UUID2 },
        { id: UUID2, photoUrl: PHOTO_URL, title: null, categoryId: UUID2 },
      ],
    });
    expect(result.success).toBe(true);
  });
});
