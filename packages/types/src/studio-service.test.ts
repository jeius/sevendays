import { describe, expect, it } from 'vitest';
import {
  createStudioServiceSchema,
  studioServiceAddonMatrixSchema,
  studioServiceBranchMatrixSchema,
  studioServiceSchema,
  studioServiceWithBranchesSchema,
  updateStudioServiceSchema,
} from './studio-service.js';

const UUID = '00000000-0000-4000-8000-000000000000';
const COVER_KEY = 'covers/00000000-0000-4000-8000-000000000001.jpg';
const COVER_URL = `https://pub-0000.r2.dev/${COVER_KEY}`;
const STAGING_KEY = 'tmp/00000000-0000-4000-8000-000000000002.jpg';

const fullRow = {
  id: UUID,
  name: 'Portraits & ID Photo',
  description: 'Studio portraits and ID photos.',
  priceCents: 50000,
  isActive: true,
  coverImageKey: COVER_KEY,
  createdAt: '2026-09-07T00:00:00.000Z',
  updatedAt: '2026-09-07T00:00:00.000Z',
};

describe('studioServiceSchema', () => {
  it('parses an active row', () => {
    const result = studioServiceSchema.safeParse(fullRow);
    expect(result.success).toBe(true);
  });

  it('parses an inactive row (the read shape does not filter — the server does)', () => {
    const result = studioServiceSchema.safeParse({ ...fullRow, isActive: false });
    expect(result.success).toBe(true);
  });

  it('rejects an empty name', () => {
    const result = studioServiceSchema.safeParse({ ...fullRow, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a negative price', () => {
    const result = studioServiceSchema.safeParse({ ...fullRow, priceCents: -1 });
    expect(result.success).toBe(false);
  });

  it('parses a bare row (coverImageKey null) — born-null covers are the default state (#331)', () => {
    const result = studioServiceSchema.safeParse({ ...fullRow, coverImageKey: null });
    expect(result.success).toBe(true);
  });
});

describe('createStudioServiceSchema', () => {
  it('parses a create payload without row-only fields', () => {
    const result = createStudioServiceSchema.safeParse({
      name: 'Photo Recovery',
      description: 'Restore scanned or damaged photographs.',
      priceCents: 150000,
    });
    expect(result.success).toBe(true);
  });

  it('defaults isActive to true', () => {
    const parsed = createStudioServiceSchema.parse({
      name: 'Picture Framing',
      description: 'Custom framing for prints and artwork.',
      priceCents: 120000,
    });
    expect(parsed.isActive).toBe(true);
  });

  it('accepts a fresh staging key; rejects null (clear-before-create is meaningless, #331)', () => {
    const base = { name: 'X', description: 'Y', priceCents: 1 };
    expect(
      createStudioServiceSchema.safeParse({ ...base, coverImageKey: STAGING_KEY }).success
    ).toBe(true);
    expect(createStudioServiceSchema.safeParse({ ...base, coverImageKey: null }).success).toBe(
      false
    );
  });

  it('drops coverImageUrl from the parsed create output (reads never echo through writes, #331)', () => {
    const parsed = createStudioServiceSchema.parse({
      name: 'X',
      description: 'Y',
      priceCents: 1,
      coverImageUrl: COVER_URL,
    });
    expect('coverImageUrl' in parsed).toBe(false);
  });
});

describe('studioServiceWithBranchesSchema', () => {
  it('parses a read row with embedded bookable branch ids', () => {
    const result = studioServiceWithBranchesSchema.safeParse({
      ...fullRow,
      coverImageUrl: null,
      bookableBranchIds: [UUID, '00000000-0000-4000-8000-000000000001'],
      applicableAddonServiceIds: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-uuid branch id', () => {
    const result = studioServiceWithBranchesSchema.safeParse({
      ...fullRow,
      bookableBranchIds: ['not-a-uuid'],
    });
    expect(result.success).toBe(false);
  });

  it('inherits the row default (isActive defaults true when omitted)', () => {
    const parsed = studioServiceWithBranchesSchema.parse({
      ...fullRow,
      isActive: undefined,
      coverImageUrl: null,
      bookableBranchIds: [],
      applicableAddonServiceIds: [],
    });
    expect(parsed.isActive).toBe(true);
  });

  it('parses a read row with embedded applicable add-on ids', () => {
    const parsed = studioServiceWithBranchesSchema.parse({
      ...fullRow,
      coverImageUrl: null,
      bookableBranchIds: [UUID],
      applicableAddonServiceIds: [UUID, '00000000-0000-4000-8000-000000000001'],
    });
    expect(parsed.applicableAddonServiceIds).toEqual([
      UUID,
      '00000000-0000-4000-8000-000000000001',
    ]);
  });

  it('rejects a non-uuid applicable add-on id', () => {
    const result = studioServiceWithBranchesSchema.safeParse({
      ...fullRow,
      bookableBranchIds: [],
      applicableAddonServiceIds: ['not-a-uuid'],
    });
    expect(result.success).toBe(false);
  });

  it('requires the applicability field (the API always embeds it, possibly empty)', () => {
    const result = studioServiceWithBranchesSchema.safeParse({
      ...fullRow,
      bookableBranchIds: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('the canonical read resolves covers (#331, the branchReadSchema precedent)', () => {
  const read = {
    ...fullRow,
    bookableBranchIds: [],
    applicableAddonServiceIds: [],
    coverImageUrl: COVER_URL,
  };

  it('parses a resolved read (coverImageUrl is the absolute URL)', () => {
    expect(studioServiceWithBranchesSchema.safeParse(read).success).toBe(true);
  });

  it('null coverImageUrl parses (no cover is a null URL, never a string)', () => {
    expect(
      studioServiceWithBranchesSchema.safeParse({ ...read, coverImageUrl: null }).success
    ).toBe(true);
  });

  it('strips a smuggled coverImageKey from the parsed read output (ADR-0019: raw keys never leave)', () => {
    const parsed = studioServiceWithBranchesSchema.parse({ ...read, coverImageKey: COVER_KEY });
    expect('coverImageKey' in parsed).toBe(false);
  });
});

describe('studio-service matrix payloads (M5)', () => {
  it('studioServiceBranchMatrixSchema parses { branchIds }; rejects a non-uuid entry', () => {
    expect(studioServiceBranchMatrixSchema.safeParse({ branchIds: [UUID] }).success).toBe(true);
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

  it('absent coverImageKey stays ABSENT from the parsed output (unchanged, #331)', () => {
    const parsed = updateStudioServiceSchema.parse({
      name: 'X',
      description: 'Y',
      priceCents: 1,
      isActive: true,
    });
    expect('coverImageKey' in parsed).toBe(false);
  });

  it('null parses and survives (explicit clear, #331)', () => {
    const parsed = updateStudioServiceSchema.parse({
      name: 'X',
      description: 'Y',
      priceCents: 1,
      isActive: true,
      coverImageKey: null,
    });
    expect(parsed.coverImageKey).toBeNull();
  });

  it('a staging-key string parses (bind/replace via a fresh staging key, #331)', () => {
    const parsed = updateStudioServiceSchema.parse({
      name: 'X',
      description: 'Y',
      priceCents: 1,
      isActive: true,
      coverImageKey: STAGING_KEY,
    });
    expect(parsed.coverImageKey).toBe(STAGING_KEY);
  });
});

describe('unpriced catalogs (ADR-0020)', () => {
  it('the row shape parses a null price (unpriced studio service)', () => {
    const parsed = studioServiceSchema.parse({ ...fullRow, priceCents: null });
    expect(parsed.priceCents).toBeNull();
  });

  it('create accepts a null price — the unchecked Priced save', () => {
    const parsed = createStudioServiceSchema.parse({
      name: 'On-inquiry service',
      description: 'Quoted per job.',
      priceCents: null,
    });
    expect(parsed.priceCents).toBeNull();
    expect(parsed.isActive).toBe(true);
  });
});
