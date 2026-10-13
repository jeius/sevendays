import { describe, expect, it } from 'vitest';
import {
  branchReadSchema,
  branchSchema,
  createBranchSchema,
  updateBranchSchema,
} from './branch.js';

const UUID = '00000000-0000-4000-8000-000000000000';
const DATE = '2026-10-13T00:00:00.000Z';
const COVER_KEY = 'covers/00000000-0000-4000-8000-000000000001.jpg';
const COVER_URL = `https://pub-0000.r2.dev/${COVER_KEY}`;
const STAGING_KEY = 'tmp/00000000-0000-4000-8000-000000000002.jpg';

const row = {
  id: UUID,
  name: 'Calamba Main',
  address: '1 Sample St',
  phone: '+63 900 000 0001',
  acceptsWalkIns: true,
  isActive: true,
  coverImageKey: COVER_KEY,
  createdAt: DATE,
  updatedAt: DATE,
};

const read = {
  id: row.id,
  name: row.name,
  address: row.address,
  phone: row.phone,
  acceptsWalkIns: row.acceptsWalkIns,
  isActive: row.isActive,
  createdAt: DATE,
  updatedAt: DATE,
  coverImageUrl: COVER_URL,
};

describe('branchSchema (the row shape)', () => {
  it('parses a canonical row with a cover key', () => {
    expect(branchSchema.safeParse(row).success).toBe(true);
  });

  it('parses a bare row (coverImageKey null) — born-null covers are the default state', () => {
    expect(branchSchema.safeParse({ ...row, coverImageKey: null }).success).toBe(true);
  });
});

describe('branchReadSchema (the canonical wire shape, M7 #214)', () => {
  it('parses a resolved read (coverImageUrl is the absolute URL)', () => {
    expect(branchReadSchema.safeParse(read).success).toBe(true);
  });

  it('null coverImageUrl parses (no cover is a null URL, never a string)', () => {
    expect(branchReadSchema.safeParse({ ...read, coverImageUrl: null }).success).toBe(true);
  });

  it('strips a smuggled coverImageKey from the parsed output (ADR-0019: raw keys never leave)', () => {
    const parsed = branchReadSchema.parse({ ...read, coverImageKey: COVER_KEY });
    expect('coverImageKey' in parsed).toBe(false);
  });
});

describe('createBranchSchema (presence-encoded cover)', () => {
  it('parses the bare create; the defaults exercise themselves (acceptsWalkIns false, isActive true)', () => {
    const parsed = createBranchSchema.parse({
      name: 'Calamba Main',
      address: '1 Sample St',
      phone: '+63 900 000 0001',
    });
    expect(parsed.acceptsWalkIns).toBe(false);
    expect(parsed.isActive).toBe(true);
  });

  it('drops the server-assigned fields AND coverImageUrl from the parsed create output', () => {
    const parsed = createBranchSchema.parse({
      name: 'X',
      address: 'Y',
      phone: 'Z',
      id: UUID,
      createdAt: DATE,
      updatedAt: DATE,
      coverImageUrl: COVER_URL,
    });
    expect('id' in parsed).toBe(false);
    expect('createdAt' in parsed).toBe(false);
    expect('updatedAt' in parsed).toBe(false);
    expect('coverImageUrl' in parsed).toBe(false);
  });

  it('accepts a fresh staging key; rejects null (clear-before-create is meaningless)', () => {
    const base = { name: 'X', address: 'Y', phone: 'Z' };
    expect(createBranchSchema.safeParse({ ...base, coverImageKey: STAGING_KEY }).success).toBe(
      true
    );
    expect(createBranchSchema.safeParse({ ...base, coverImageKey: null }).success).toBe(false);
  });
});

describe('updateBranchSchema (the cover tri-state)', () => {
  const base = {
    name: 'Calamba Main',
    address: '1 Sample St',
    phone: '+63 900 000 0001',
    acceptsWalkIns: true,
    isActive: true,
  };

  it('absent coverImageKey stays ABSENT from the parsed output (unchanged)', () => {
    const parsed = updateBranchSchema.parse(base);
    expect('coverImageKey' in parsed).toBe(false);
  });

  it('null parses and survives (explicit clear)', () => {
    const parsed = updateBranchSchema.parse({ ...base, coverImageKey: null });
    expect(parsed.coverImageKey).toBeNull();
  });

  it('a staging-key string parses (bind/replace via a fresh staging key)', () => {
    const parsed = updateBranchSchema.parse({ ...base, coverImageKey: STAGING_KEY });
    expect(parsed.coverImageKey).toBe(STAGING_KEY);
  });
});
