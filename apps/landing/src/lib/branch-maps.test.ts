import type { BranchRead } from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import { mapsUrlFor } from './branch-maps';

function branch(coords: { latitude: number | null; longitude: number | null }): BranchRead {
  return {
    id: '0b3552a6-b7c1-4d44-a7e2-1a9a4b2ff001',
    name: 'Test Branch A',
    address: '1 Test St',
    phone: '+63 900 000 001',
    acceptsWalkIns: false,
    isActive: true,
    coverImageUrl: null,
    googleMapsUrl: null,
    appleMapsUrl: null,
    latitude: coords.latitude,
    longitude: coords.longitude,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };
}

describe('mapsUrlFor (#248)', () => {
  it('builds the canonical Google Maps URL from the pair', () => {
    expect(mapsUrlFor(branch({ latitude: 14.16598, longitude: 121.2485 }))).toBe(
      'https://www.google.com/maps?api=1&query=14.16598,121.2485'
    );
  });

  it('returns null when latitude is null (render gate)', () => {
    expect(mapsUrlFor(branch({ latitude: null, longitude: 121.2485 }))).toBeNull();
  });

  it('returns null when longitude is null (render gate)', () => {
    expect(mapsUrlFor(branch({ latitude: 14.16598, longitude: null }))).toBeNull();
  });

  it('returns null when both are null', () => {
    expect(mapsUrlFor(branch({ latitude: null, longitude: null }))).toBeNull();
  });

  it('interpolates integers without trailing zeros', () => {
    expect(mapsUrlFor(branch({ latitude: 7, longitude: 125 }))).toBe(
      'https://www.google.com/maps?api=1&query=7,125'
    );
  });
});
