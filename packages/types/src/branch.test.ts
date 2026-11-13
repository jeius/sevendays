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
  latitude: null,
  longitude: null,
  googleMapsUrl: null,
  appleMapsUrl: null,
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
  latitude: null,
  longitude: null,
  googleMapsUrl: null,
  appleMapsUrl: null,
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

describe('branch coordinates (#248)', () => {
  const coords = { latitude: 14.16598, longitude: 121.2485 };
  const bareCreate = { name: 'New Branch', address: '1 St', phone: '+63 900 000 000' };
  const fullUpdate = {
    name: 'Test Branch A',
    address: '1 Test St',
    phone: '+63 900 000 001',
    acceptsWalkIns: false,
    isActive: true,
  };

  it('branchSchema accepts null coordinates on the row', () => {
    const { success } = branchSchema.safeParse({ ...row, latitude: null, longitude: null });
    expect(success).toBe(true);
  });

  it('branchReadSchema carries the coordinates through', () => {
    const parsed = branchReadSchema.parse({ ...read, ...coords });
    expect(parsed.latitude).toBe(14.16598);
    expect(parsed.longitude).toBe(121.2485);
  });

  it('createBranchSchema defaults omitted coordinates to null', () => {
    const parsed = createBranchSchema.parse(bareCreate);
    expect(parsed.latitude).toBeNull();
    expect(parsed.longitude).toBeNull();
  });

  it('createBranchSchema rejects a latitude beyond ±90', () => {
    const { success } = createBranchSchema.safeParse({ ...bareCreate, latitude: 91, longitude: 0 });
    expect(success).toBe(false);
  });

  it('createBranchSchema rejects a longitude beyond ±180', () => {
    const { success } = createBranchSchema.safeParse({
      ...bareCreate,
      latitude: 0,
      longitude: 180.1,
    });
    expect(success).toBe(false);
  });

  it('createBranchSchema rejects more than 6 decimal places', () => {
    const { success } = createBranchSchema.safeParse({
      ...bareCreate,
      latitude: 14.1659812,
      longitude: 0,
    });
    expect(success).toBe(false);
  });

  it('updateBranchSchema rejects exactly one coordinate of the pair', () => {
    const { success } = updateBranchSchema.safeParse({ ...fullUpdate, latitude: 14.1 });
    expect(success).toBe(false);
  });

  it('updateBranchSchema accepts the full pair and the null pair', () => {
    expect(updateBranchSchema.safeParse({ ...fullUpdate, ...coords }).success).toBe(true);
    expect(
      updateBranchSchema.safeParse({ ...fullUpdate, latitude: null, longitude: null }).success
    ).toBe(true);
  });
});

describe('branch maps links (#273)', () => {
  const bareCreate = { name: 'New Branch', address: '1 St', phone: '+63 900 000 000' };

  it('branchSchema accepts null links on the row', () => {
    const { success } = branchSchema.safeParse({ ...row, googleMapsUrl: null, appleMapsUrl: null });
    expect(success).toBe(true);
  });

  it('createBranchSchema defaults omitted links to null', () => {
    const parsed = createBranchSchema.parse(bareCreate);
    expect(parsed.googleMapsUrl).toBeNull();
    expect(parsed.appleMapsUrl).toBeNull();
  });

  it('createBranchSchema accepts an https link and rejects http', () => {
    expect(
      createBranchSchema.safeParse({ ...bareCreate, googleMapsUrl: 'https://maps.app.goo.gl/x' })
        .success
    ).toBe(true);
    expect(
      createBranchSchema.safeParse({ ...bareCreate, googleMapsUrl: 'http://maps.app.goo.gl/x' })
        .success
    ).toBe(false);
  });

  it('createBranchSchema rejects a non-URL string', () => {
    expect(createBranchSchema.safeParse({ ...bareCreate, appleMapsUrl: 'not a url' }).success).toBe(
      false
    );
  });

  it('each link is independently optional — one set, other null', () => {
    const parsed = createBranchSchema.parse({
      ...bareCreate,
      appleMapsUrl: 'https://maps.apple.com/?q=studio',
    });
    expect(parsed.appleMapsUrl).toBe('https://maps.apple.com/?q=studio');
    expect(parsed.googleMapsUrl).toBeNull();
  });
});
