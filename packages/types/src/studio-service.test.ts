import { describe, expect, it } from 'vitest';
import {
  createStudioServiceSchema,
  studioServiceSchema,
  studioServiceWithBranchesSchema,
} from './studio-service.js';

const UUID = '00000000-0000-4000-8000-000000000000';

const fullRow = {
  id: UUID,
  name: 'Portraits & ID Photo',
  description: 'Studio portraits and ID photos.',
  priceCents: 50000,
  isActive: true,
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
});

describe('studioServiceWithBranchesSchema', () => {
  it('parses a read row with embedded bookable branch ids', () => {
    const result = studioServiceWithBranchesSchema.safeParse({
      ...fullRow,
      bookableBranchIds: [UUID, '00000000-0000-4000-8000-000000000001'],
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
      bookableBranchIds: [],
    });
    expect(parsed.isActive).toBe(true);
  });
});
