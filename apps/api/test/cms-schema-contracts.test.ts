// Schema-contract tests (ticket #135 AC): a canonical entity round-trips each
// create/read schema pair — parse the create payload (asserting the parsed
// output drops every server-assigned field), then complete the server-assigned
// fields by hand and parse the read shape. Pure Zod over pinned fixtures: no
// DB rows, no routes (global-setup still runs — the suite's standing posture).
import {
  addonServiceSchema,
  attireSchema,
  branchSchema,
  createAddonServiceSchema,
  createAttireSchema,
  createBranchSchema,
  createGalleryCategorySchema,
  createGalleryPhotoSchema,
  createPrintSizeSchema,
  createServicePackageSchema,
  createStudioServiceSchema,
  createTestimonialSchema,
  galleryCategoryOrderSchema,
  galleryCategorySchema,
  galleryPhotoOrderSchema,
  galleryPhotoSchema,
  galleryReadSchema,
  printSizeSchema,
  servicePackageReadSchema,
  studioServiceAddonMatrixSchema,
  studioServiceBranchMatrixSchema,
  studioServiceSchema,
  testimonialOrderSchema,
  testimonialSchema,
  updateGalleryPhotoSchema,
  updateServicePackageSchema,
} from '@sevendays/types';
import { describe, expect, it } from 'vitest';

const UUID = '00000000-0000-4000-8000-000000000000';
const UUID2 = '00000000-0000-4000-8000-000000000001';
const DATE = '2026-09-25T00:00:00.000Z';
const COVER_URL = 'https://pub-0000.r2.dev/covers/00000000-0000-4000-8000-000000000000.jpg';
const PHOTO_URL = 'https://pub-0000.r2.dev/gallery/00000000-0000-4000-8000-000000000000.jpg';

describe('create→read round-trips (the canonical fixtures, all nine entities)', () => {
  it('branch: create drops id/timestamps; a deactivated row parses the read (admin reads include them)', () => {
    const parsed = createBranchSchema.parse({
      name: 'Fourth Branch',
      address: '123 New Street',
      phone: '+63 900 000 004',
      acceptsWalkIns: true,
      isActive: false,
      id: UUID,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect('id' in parsed).toBe(false);
    expect('createdAt' in parsed).toBe(false);
    expect('updatedAt' in parsed).toBe(false);
    const read = branchSchema.safeParse({
      id: UUID,
      name: 'Fourth Branch',
      address: '123 New Street',
      phone: '+63 900 000 004',
      acceptsWalkIns: true,
      isActive: false,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(read.success).toBe(true);
  });

  it('print size: create drops server fields; a deactivated row parses the read', () => {
    const parsed = createPrintSizeSchema.parse({
      code: 'A4',
      description: 'A4 print',
      isActive: false,
      id: UUID,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect('id' in parsed).toBe(false);
    const read = printSizeSchema.safeParse({
      id: UUID,
      code: 'A4',
      description: 'A4 print',
      isActive: false,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(read.success).toBe(true);
  });

  it('attire: create drops server fields; a deactivated row parses the read', () => {
    const parsed = createAttireSchema.parse({ name: 'Barong', isActive: false, id: UUID });
    expect('id' in parsed).toBe(false);
    const read = attireSchema.safeParse({
      id: UUID,
      name: 'Barong',
      isActive: false,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(read.success).toBe(true);
  });

  it('add-on service: create drops server fields; the row read parses', () => {
    const parsed = createAddonServiceSchema.parse({
      name: 'Hair Styling',
      description: 'Professional styling',
      priceCents: 15000,
      id: UUID,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect('id' in parsed).toBe(false);
    const read = addonServiceSchema.safeParse({
      id: UUID,
      name: 'Hair Styling',
      description: 'Professional styling',
      priceCents: 15000,
      isActive: true,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(read.success).toBe(true);
  });

  it('studio service: create drops server fields; the embedded read parses', () => {
    const parsed = createStudioServiceSchema.parse({
      name: 'Photo Restoration',
      description: 'Restore old photographs',
      priceCents: 50000,
      id: UUID,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect('id' in parsed).toBe(false);
    const read = studioServiceSchema.safeParse({
      id: UUID,
      name: 'Photo Restoration',
      description: 'Restore old photographs',
      priceCents: 50000,
      isActive: true,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(read.success).toBe(true);
  });

  it('gallery category: create drops id/position/timestamps (position is never client-supplied)', () => {
    const parsed = createGalleryCategorySchema.parse({
      name: 'Graduation',
      id: UUID,
      position: 2,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect('id' in parsed).toBe(false);
    expect('position' in parsed).toBe(false);
    const read = galleryCategorySchema.safeParse({
      id: UUID,
      name: 'Graduation',
      position: 2,
      isActive: true,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(read.success).toBe(true);
  });

  it('gallery photo: create is the spec payload { r2Key, title?, caption?, categoryId? }; the admin read carries photoUrl', () => {
    const parsed = createGalleryPhotoSchema.parse({
      r2Key: 'tmp/00000000-0000-4000-8000-000000000000.jpg',
      title: 'Toga portrait',
      caption: null,
      categoryId: UUID2,
      id: UUID,
      position: 1,
      photoUrl: PHOTO_URL,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect('id' in parsed).toBe(false);
    expect('position' in parsed).toBe(false);
    expect('photoUrl' in parsed).toBe(false);
    const read = galleryPhotoSchema.safeParse({
      id: UUID,
      title: 'Toga portrait',
      caption: null,
      categoryId: UUID2,
      position: 1,
      isActive: true,
      photoUrl: PHOTO_URL,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(read.success).toBe(true);
  });

  it('testimonial: create drops id/position/timestamps; the row read parses', () => {
    const parsed = createTestimonialSchema.parse({
      quote: 'The photos came out better than we hoped.',
      person: 'Maria, batch 2026',
      id: UUID,
      position: 1,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect('id' in parsed).toBe(false);
    expect('position' in parsed).toBe(false);
    const read = testimonialSchema.safeParse({
      id: UUID,
      quote: 'The photos came out better than we hoped.',
      person: 'Maria, batch 2026',
      position: 1,
      isActive: true,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(read.success).toBe(true);
  });

  it('service package: the full save payload (frame tokens) parses and drops id/slug/timestamps; the canonical read parses', () => {
    const save = {
      name: 'Deluxe Package',
      description: 'The full graduation set.',
      priceCents: 150000,
      durationMinutes: null,
      isFeatured: false,
      isActive: true,
      coverImageKey: 'tmp/00000000-0000-4000-8000-000000000001.jpg',
      frames: [{ id: 'frame-1' }],
      inclusions: [
        {
          kind: 'framed_picture',
          quantity: 1,
          printSizeId: UUID2,
          frameId: 'frame-1',
          attireIds: [UUID],
          description: null,
        },
      ],
      id: UUID,
      slug: 'should-be-ignored',
      createdAt: DATE,
      updatedAt: DATE,
    };
    const created = createServicePackageSchema.parse(save);
    expect('id' in created).toBe(false);
    expect('slug' in created).toBe(false);
    expect('createdAt' in created).toBe(false);
    const read = servicePackageReadSchema.safeParse({
      id: UUID,
      name: 'Deluxe Package',
      description: 'The full graduation set.',
      priceCents: 150000,
      durationMinutes: null,
      isActive: true,
      isFeatured: false,
      slug: 'deluxe-package',
      coverImageUrl: COVER_URL,
      inclusions: [
        {
          id: UUID,
          kind: 'framed_picture',
          quantity: 1,
          frameId: UUID2,
          description: null,
          createdAt: DATE,
          updatedAt: DATE,
          printSize: { id: UUID2, code: '11x14', description: '11x14 print' },
          attires: [{ id: UUID, name: 'Toga' }],
        },
      ],
      frames: [{ id: UUID2, frameNumber: 1 }],
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(read.success).toBe(true);
  });
});

describe('the wire rename (ADR-0019: no read shape exposes a raw R2 key)', () => {
  it('the package read strips coverImageKey and the photo read strips r2Key from their parsed outputs', () => {
    const pkg = servicePackageReadSchema.parse({
      id: UUID,
      name: 'Basic Package',
      description: 'Entry graduation portrait package.',
      priceCents: 90000,
      durationMinutes: null,
      isActive: true,
      isFeatured: false,
      slug: 'basic-package',
      coverImageUrl: COVER_URL,
      coverImageKey: 'covers/00000000-0000-4000-8000-000000000000.jpg',
      inclusions: [],
      frames: [],
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect('coverImageKey' in pkg).toBe(false);
    const photo = galleryPhotoSchema.parse({
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
    expect('r2Key' in photo).toBe(false);
  });

  it('the public gallery read parses the assembled payload (categories + categorized photos)', () => {
    const result = galleryReadSchema.safeParse({
      categories: [{ id: UUID2, name: 'Graduation' }],
      photos: [{ id: UUID, photoUrl: PHOTO_URL, title: null, categoryId: UUID2 }],
    });
    expect(result.success).toBe(true);
  });
});

describe('matrix payloads (full-replace PUTs keyed by the studio service)', () => {
  it('studioServiceBranchMatrixSchema parses { branchIds }; rejects a non-uuid entry', () => {
    expect(studioServiceBranchMatrixSchema.safeParse({ branchIds: [UUID, UUID2] }).success).toBe(
      true
    );
    expect(studioServiceBranchMatrixSchema.safeParse({ branchIds: ['not-a-uuid'] }).success).toBe(
      false
    );
  });

  it('studioServiceAddonMatrixSchema parses { addonServiceIds }; rejects a non-uuid entry', () => {
    expect(studioServiceAddonMatrixSchema.safeParse({ addonServiceIds: [UUID] }).success).toBe(
      true
    );
    expect(
      studioServiceAddonMatrixSchema.safeParse({ addonServiceIds: ['not-a-uuid'] }).success
    ).toBe(false);
  });
});

describe('collection order payloads (one full-replace order PUT per collection)', () => {
  it('galleryPhotoOrderSchema parses { photoIds }; rejects a non-uuid entry', () => {
    expect(galleryPhotoOrderSchema.safeParse({ photoIds: [UUID, UUID2] }).success).toBe(true);
    expect(galleryPhotoOrderSchema.safeParse({ photoIds: ['not-a-uuid'] }).success).toBe(false);
  });

  it('galleryCategoryOrderSchema parses { categoryIds }; rejects a non-uuid entry', () => {
    expect(galleryCategoryOrderSchema.safeParse({ categoryIds: [UUID] }).success).toBe(true);
    expect(galleryCategoryOrderSchema.safeParse({ categoryIds: ['not-a-uuid'] }).success).toBe(
      false
    );
  });

  it('testimonialOrderSchema parses { testimonialIds }; rejects a non-uuid entry', () => {
    expect(testimonialOrderSchema.safeParse({ testimonialIds: [UUID] }).success).toBe(true);
    expect(testimonialOrderSchema.safeParse({ testimonialIds: ['not-a-uuid'] }).success).toBe(
      false
    );
  });
});

describe('the two update schemas that differ from create', () => {
  it('updateServicePackageSchema requires slug and takes coverImageKey as string/null/absent', () => {
    const base = {
      name: 'Deluxe Package',
      description: 'The full graduation set.',
      priceCents: 150000,
      durationMinutes: null,
      frames: [],
      inclusions: [],
    };
    expect(updateServicePackageSchema.safeParse({ ...base, slug: 'deluxe-package' }).success).toBe(
      true
    );
    expect(
      updateServicePackageSchema.safeParse({
        ...base,
        slug: 'deluxe-package',
        coverImageKey: 'tmp/00000000-0000-4000-8000-000000000000.jpg',
      }).success
    ).toBe(true);
    expect(
      updateServicePackageSchema.safeParse({ ...base, slug: 'deluxe-package', coverImageKey: null })
        .success
    ).toBe(true);
    expect(updateServicePackageSchema.safeParse(base).success).toBe(false);
  });

  it('updateGalleryPhotoSchema requires the full metadata fields; r2Key is the optional replace field', () => {
    const full = { title: null, caption: 'Studio batch 1', categoryId: UUID2, isActive: false };
    expect(updateGalleryPhotoSchema.safeParse(full).success).toBe(true);
    expect(
      updateGalleryPhotoSchema.safeParse({
        ...full,
        r2Key: 'tmp/00000000-0000-4000-8000-000000000000.jpg',
      }).success
    ).toBe(true);
    expect(updateGalleryPhotoSchema.safeParse({ ...full, title: undefined }).success).toBe(false);
  });

  it('the package-level refine fires on update payloads too (duplicate frame tokens rejected)', () => {
    const base = {
      name: 'Deluxe Package',
      description: 'The full graduation set.',
      priceCents: 150000,
      durationMinutes: null,
      slug: 'deluxe-package',
      frames: [{ id: 'frame-1' }, { id: 'frame-1' }],
      inclusions: [],
    };
    expect(updateServicePackageSchema.safeParse(base).success).toBe(false);
  });
});
