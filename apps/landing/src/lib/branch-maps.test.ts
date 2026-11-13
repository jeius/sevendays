import type { BranchRead } from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import { isAppleUserAgent, mapsHrefFor, mapsUrlFor } from './branch-maps';

function branch(overrides: {
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  appleMapsUrl?: string | null;
}): BranchRead {
  return {
    id: '0b3552a6-b7c1-4d44-a7e2-1a9a4b2ff001',
    name: 'Test Branch A',
    address: '1 Test St',
    phone: '+63 900 000 001',
    acceptsWalkIns: false,
    isActive: true,
    coverImageUrl: null,
    googleMapsUrl: overrides.googleMapsUrl ?? null,
    appleMapsUrl: overrides.appleMapsUrl ?? null,
    latitude: overrides.latitude ?? null,
    longitude: overrides.longitude ?? null,
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

describe('isAppleUserAgent (#273)', () => {
  it('matches iPhone, iPad, iPod, Macintosh UAs', () => {
    expect(isAppleUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true);
    expect(isAppleUserAgent('Mozilla/5.0 (iPad; CPU OS 16_0')).toBe(true);
    expect(isAppleUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe(true);
  });
  it('rejects Windows/Android/Linux UAs', () => {
    expect(isAppleUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(false);
    expect(isAppleUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe(false);
  });
});

describe('mapsHrefFor — Google base, Apple augments (#273)', () => {
  const G = 'https://maps.app.goo.gl/g';
  const A = 'https://maps.apple.com/?q=a';
  it('both set: Apple → apple, non-Apple → google', () => {
    const b = branch({ googleMapsUrl: G, appleMapsUrl: A });
    expect(mapsHrefFor(b, true)).toBe(A);
    expect(mapsHrefFor(b, false)).toBe(G);
  });
  it('google only: both devices → google', () => {
    const b = branch({ googleMapsUrl: G });
    expect(mapsHrefFor(b, true)).toBe(G);
    expect(mapsHrefFor(b, false)).toBe(G);
  });
  it('apple only: Apple → apple, non-Apple → null', () => {
    const b = branch({ appleMapsUrl: A });
    expect(mapsHrefFor(b, true)).toBe(A);
    expect(mapsHrefFor(b, false)).toBeNull();
  });
  it('neither → null even with stored coordinates (#248 dormant)', () => {
    const b = branch({ latitude: 14.16598, longitude: 121.2485 });
    expect(mapsHrefFor(b, true)).toBeNull();
    expect(mapsHrefFor(b, false)).toBeNull();
  });
});
