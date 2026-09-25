import { describe, expect, it } from 'vitest';
import {
  createServicePackageSchema,
  packageSaveInclusionSchema,
  servicePackageReadSchema,
  servicePackageSchema,
  servicePackageWithInclusionsSchema,
  updateServicePackageSchema,
} from './package.js';

const UUID = '00000000-0000-4000-8000-000000000000';

const fullRow = {
  id: UUID,
  name: 'Basic Package',
  description: 'Entry graduation portrait package.',
  priceCents: 90000,
  durationMinutes: null,
  isActive: true,
  coverImageKey: null,
  slug: 'basic-package',
  createdAt: '2026-08-31T00:00:00.000Z',
  updatedAt: '2026-08-31T00:00:00.000Z',
};

describe('servicePackageSchema', () => {
  it('parses a row with a null duration (catalog specifies none)', () => {
    const result = servicePackageSchema.safeParse(fullRow);
    expect(result.success).toBe(true);
  });

  it('still accepts a numeric duration', () => {
    const result = servicePackageSchema.safeParse({ ...fullRow, durationMinutes: 60 });
    expect(result.success).toBe(true);
  });

  it('rejects a negative duration', () => {
    const result = servicePackageSchema.safeParse({ ...fullRow, durationMinutes: -5 });
    expect(result.success).toBe(false);
  });
});

describe('servicePackageWithInclusionsSchema', () => {
  it('parses a package with a framed inclusion and resolved lookups', () => {
    const result = servicePackageWithInclusionsSchema.safeParse({
      ...fullRow,
      inclusions: [
        {
          id: UUID,
          kind: 'framed_picture',
          quantity: 1,
          frameId: UUID,
          description: null,
          createdAt: '2026-08-31T00:00:00.000Z',
          updatedAt: '2026-08-31T00:00:00.000Z',
          printSize: { id: UUID, code: '8R', description: '8R print' },
          attires: [{ id: UUID, name: 'Toga' }],
        },
      ],
      frames: [{ id: UUID, frameNumber: 1 }],
    });
    expect(result.success).toBe(true);
  });

  it('parses an inactive package (the read shape does not filter — the server does)', () => {
    const result = servicePackageWithInclusionsSchema.safeParse({
      ...fullRow,
      isActive: false,
      inclusions: [],
      frames: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing inclusions array (no default)', () => {
    const result = servicePackageWithInclusionsSchema.safeParse(fullRow);
    expect(result.success).toBe(false);
  });
});

describe('servicePackageSchema slug/isFeatured (M2 ticket 01)', () => {
  it('parses a row carrying slug and isFeatured', () => {
    const result = servicePackageSchema.safeParse({
      ...fullRow,
      isFeatured: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty slug', () => {
    const result = servicePackageSchema.safeParse({ ...fullRow, slug: '' });
    expect(result.success).toBe(false);
  });

  it('still parses a row without isFeatured (defaults false — pre-flag fixtures)', () => {
    const parsed = servicePackageSchema.parse({ ...fullRow });
    expect(parsed.isFeatured).toBe(false);
  });

  it('createServicePackageSchema strips slug and every server-assigned field', () => {
    // z.object strips unknown keys, so a payload carrying them still parses —
    // the contract is that they never appear in the parsed create output.
    const parsed = createServicePackageSchema.parse({
      name: 'New Package',
      description: 'A fresh package.',
      priceCents: 100000,
      durationMinutes: null,
      slug: 'should-be-ignored',
      id: UUID,
      createdAt: '2026-08-31T00:00:00.000Z',
      updatedAt: '2026-08-31T00:00:00.000Z',
      frames: [{ id: 'frame-1' }],
      inclusions: [
        {
          kind: 'framed_picture',
          quantity: 1,
          printSizeId: UUID,
          frameId: 'frame-1',
          attireIds: [UUID],
          description: null,
        },
      ],
    });
    expect('slug' in parsed).toBe(false);
    expect('id' in parsed).toBe(false);
    expect('createdAt' in parsed).toBe(false);
    expect('updatedAt' in parsed).toBe(false);
  });
});

describe('the atomic package save payload (M5 § Mutation shapes)', () => {
  const savePayload = {
    name: 'Deluxe Package',
    description: 'The full graduation set.',
    priceCents: 150000,
    durationMinutes: null,
    isFeatured: true,
    frames: [{ id: 'frame-1' }, { id: 'frame-2' }],
    inclusions: [
      {
        kind: 'framed_picture',
        quantity: 1,
        printSizeId: UUID,
        frameId: 'frame-1',
        attireIds: [UUID],
        description: null,
      },
      {
        kind: 'framed_picture',
        quantity: 1,
        printSizeId: UUID,
        frameId: 'frame-2',
        attireIds: [UUID, '00000000-0000-4000-8000-000000000001'],
        description: null,
      },
      {
        kind: 'print',
        quantity: 4,
        printSizeId: UUID,
        frameId: null,
        attireIds: [UUID],
        description: null,
      },
      {
        kind: 'privilege',
        quantity: null,
        printSizeId: null,
        frameId: null,
        attireIds: [UUID],
        description: 'Usage of Toga and Hood',
      },
    ],
  };

  it('parses a full save: frames carry tokens, inclusions reference them', () => {
    const result = createServicePackageSchema.safeParse(savePayload);
    expect(result.success).toBe(true);
  });

  it('parses without coverImageKey (no cover at create)', () => {
    const result = createServicePackageSchema.safeParse(savePayload);
    expect(result.success).toBe(true);
    if (result.success) expect('coverImageKey' in result.data).toBe(false);
  });

  it('rejects coverImageKey: null on create (absent-or-staging-key; the null clear is update-only)', () => {
    const result = createServicePackageSchema.safeParse({ ...savePayload, coverImageKey: null });
    expect(result.success).toBe(false);
  });

  it('update requires slug; coverImageKey is presence-encoded (string/null/absent)', () => {
    expect(
      updateServicePackageSchema.safeParse({ ...savePayload, slug: 'deluxe-package' }).success
    ).toBe(true);
    expect(
      updateServicePackageSchema.safeParse({
        ...savePayload,
        slug: 'deluxe-package',
        coverImageKey: 'tmp/00000000-0000-4000-8000-000000000000.jpg',
      }).success
    ).toBe(true);
    expect(
      updateServicePackageSchema.safeParse({
        ...savePayload,
        slug: 'deluxe-package',
        coverImageKey: null,
      }).success
    ).toBe(true);
    expect(updateServicePackageSchema.safeParse(savePayload).success).toBe(false);
  });

  it('rejects a framed_picture whose frameId is not a frames[] token', () => {
    const result = createServicePackageSchema.safeParse({
      ...savePayload,
      inclusions: [
        {
          kind: 'framed_picture',
          quantity: 1,
          printSizeId: UUID,
          frameId: 'frame-9',
          attireIds: [UUID],
          description: null,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a framed_picture without frameId', () => {
    const result = createServicePackageSchema.safeParse({
      ...savePayload,
      inclusions: [
        {
          kind: 'framed_picture',
          quantity: 1,
          printSizeId: UUID,
          frameId: null,
          attireIds: [UUID],
          description: null,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a print carrying frameId (only framed_picture carries one)', () => {
    const result = createServicePackageSchema.safeParse({
      ...savePayload,
      inclusions: [
        {
          kind: 'print',
          quantity: 4,
          printSizeId: UUID,
          frameId: 'frame-1',
          attireIds: [UUID],
          description: null,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate frame tokens', () => {
    const result = createServicePackageSchema.safeParse({
      ...savePayload,
      frames: [{ id: 'frame-1' }, { id: 'frame-1' }],
    });
    expect(result.success).toBe(false);
  });

  it('servicePackageReadSchema parses the canonical read; strips coverImageKey from the output (coverImageUrl is the wire field)', () => {
    const parsed = servicePackageReadSchema.parse({
      ...fullRow,
      coverImageUrl: 'https://pub-0000.r2.dev/covers/00000000-0000-4000-8000-000000000000.jpg',
      coverImageKey: 'covers/00000000-0000-4000-8000-000000000000.jpg',
      inclusions: [
        {
          id: UUID,
          kind: 'framed_picture',
          quantity: 1,
          frameId: UUID,
          description: null,
          createdAt: '2026-08-31T00:00:00.000Z',
          updatedAt: '2026-08-31T00:00:00.000Z',
          printSize: { id: UUID, code: '8R', description: '8R print' },
          attires: [{ id: UUID, name: 'Toga' }],
        },
      ],
      frames: [{ id: UUID, frameNumber: 1 }],
    });
    expect('coverImageKey' in parsed).toBe(false);
    expect(parsed.coverImageUrl).toBe(
      'https://pub-0000.r2.dev/covers/00000000-0000-4000-8000-000000000000.jpg'
    );
  });

  it('servicePackageReadSchema parses a null coverImageUrl (no cover)', () => {
    const result = servicePackageReadSchema.safeParse({
      ...fullRow,
      coverImageUrl: null,
      inclusions: [],
      frames: [],
    });
    expect(result.success).toBe(true);
  });
});

describe('packageSaveInclusionSchema (the inclusion row inside the save)', () => {
  it('rejects an unknown kind', () => {
    const result = packageSaveInclusionSchema.safeParse({
      kind: 'souvenir',
      quantity: 2,
      printSizeId: null,
      frameId: null,
      attireIds: [UUID],
      description: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-integer quantity', () => {
    const result = packageSaveInclusionSchema.safeParse({
      kind: 'print',
      quantity: 2.5,
      printSizeId: UUID,
      frameId: null,
      attireIds: [UUID],
      description: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a picture payload without attireIds (path pinned)', () => {
    const result = packageSaveInclusionSchema.safeParse({
      kind: 'framed_picture',
      quantity: 1,
      printSizeId: UUID,
      frameId: 'frame-1',
      attireIds: [],
      description: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['attireIds']);
    }
  });

  it('accepts a privilege payload carrying attireIds — both granted and empty (seed reality)', () => {
    const granted = packageSaveInclusionSchema.safeParse({
      kind: 'privilege',
      quantity: null,
      printSizeId: null,
      frameId: null,
      attireIds: [UUID],
      description: 'Usage of Toga and Hood',
    });
    const ungranted = packageSaveInclusionSchema.safeParse({
      kind: 'privilege',
      quantity: null,
      printSizeId: null,
      frameId: null,
      attireIds: [],
      description: 'High Resolution soft copies',
    });
    expect(granted.success).toBe(true);
    expect(ungranted.success).toBe(true);
  });
});
