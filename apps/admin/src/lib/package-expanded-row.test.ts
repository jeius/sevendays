import type {
  PackageInclusionKind,
  ResolvedPackageInclusion,
  ServicePackageRead,
} from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import { expandedRowModel } from './package-expanded-row.js';

const UUID = '00000000-0000-4000-8000-000000000000';
const T0 = new Date('2026-10-17T00:00:00.000Z');

function inclusion(
  kind: PackageInclusionKind,
  overrides: Partial<ResolvedPackageInclusion> = {}
): ResolvedPackageInclusion {
  return {
    id: UUID,
    kind,
    quantity: kind === 'privilege' ? null : 1,
    frameId: null,
    description: null,
    createdAt: T0,
    updatedAt: T0,
    printSize: null,
    attires: [],
    ...overrides,
  };
}

function printSize(code: string): { id: string; code: string; description: string } {
  return { id: UUID, code, description: `${code} print.` };
}

function attire(name: string): { id: string; name: string } {
  return { id: UUID, name };
}

function row(overrides: Partial<ServicePackageRead> = {}): ServicePackageRead {
  return {
    id: UUID,
    name: 'Basic Package',
    description: 'Entry graduation portrait package — 1 framed 8x10 Toga plus wallet-size prints.',
    priceCents: 90000,
    durationMinutes: null,
    isActive: true,
    coverImageUrl: null,
    slug: 'basic-package',
    isFeatured: false,
    createdAt: T0,
    updatedAt: T0,
    frames: [],
    inclusions: [],
    ...overrides,
  };
}

describe('durationLine (the line durationMinutes gets)', () => {
  it('null renders nothing — the catalog specifies no durations (absent, never a placeholder)', () => {
    expect(expandedRowModel(row({ durationMinutes: null })).durationLine).toBeNull();
  });

  it('formats with pluralization — 60 → "60 minutes", 1 → "1 minute"', () => {
    expect(expandedRowModel(row({ durationMinutes: 60 })).durationLine).toBe('60 minutes');
    expect(expandedRowModel(row({ durationMinutes: 1 })).durationLine).toBe('1 minute');
  });
});

describe('frameChips (frames as a chip row, by frame number)', () => {
  it('labels each frame "Frame N" in served array order (never re-sorted); no frames → no chips', () => {
    const model = expandedRowModel(
      row({
        frames: [
          { id: UUID, frameNumber: 2 },
          { id: UUID, frameNumber: 1 },
        ],
      })
    );
    expect(model.frameChips).toEqual(['Frame 2', 'Frame 1']);
    expect(expandedRowModel(row()).frameChips).toEqual([]);
  });
});

describe('inclusionLines (label + print size + attires, " · " between parts)', () => {
  it('framed_picture: count + noun + print size + attires (attires joined "/" in served order)', () => {
    const model = expandedRowModel(
      row({
        inclusions: [
          inclusion('framed_picture', {
            printSize: printSize('8x10'),
            attires: [attire('Toga')],
          }),
          inclusion('framed_picture', {
            quantity: 2,
            printSize: printSize('11x14'),
            attires: [attire('Filipiniana'), attire('Executive')],
          }),
        ],
      })
    );
    expect(model.inclusionLines).toEqual([
      '1 framed picture · 8x10 · Toga',
      '2 framed pictures · 11x14 · Filipiniana/Executive',
    ]);
  });

  it('print: same grammar; a null print size drops its part (no stray separator)', () => {
    const model = expandedRowModel(
      row({
        inclusions: [
          inclusion('print', {
            quantity: 4,
            printSize: printSize('2R'),
            attires: [attire('Toga')],
          }),
          inclusion('print', { quantity: 4, attires: [attire('Toga')] }),
        ],
      })
    );
    expect(model.inclusionLines).toEqual(['4 prints · 2R · Toga', '4 prints · Toga']);
  });

  it('privilege: the description stands alone — no attire suffix (it would duplicate the subject); a null description falls back to "Privilege"', () => {
    const model = expandedRowModel(
      row({
        inclusions: [
          inclusion('privilege', {
            description: 'Usage of Executive Attire',
            attires: [attire('Executive')],
          }),
          inclusion('privilege', { description: 'High Resolution soft copies' }),
          inclusion('privilege'),
        ],
      })
    );
    expect(model.inclusionLines).toEqual([
      'Usage of Executive Attire',
      'High Resolution soft copies',
      'Privilege',
    ]);
  });

  it('a null quantity on a picture kind drops the count prefix, never renders "null"', () => {
    const model = expandedRowModel(
      row({
        inclusions: [
          inclusion('framed_picture', {
            quantity: null,
            printSize: printSize('8x10'),
            attires: [attire('Toga')],
          }),
        ],
      })
    );
    expect(model.inclusionLines).toEqual(['framed picture · 8x10 · Toga']);
  });

  it('zero attires on a picture kind drops the attire part (no trailing separator)', () => {
    const model = expandedRowModel(
      row({
        inclusions: [inclusion('print', { quantity: 4, printSize: printSize('2R') })],
      })
    );
    expect(model.inclusionLines).toEqual(['4 prints · 2R']);
  });
});

describe('expandedRowModel (the seeded Basic Package, whole)', () => {
  it('derives the exact model — description passthrough, no duration, one chip, ten bullet lines in served order', () => {
    const basic = row({
      frames: [{ id: UUID, frameNumber: 1 }],
      inclusions: [
        inclusion('framed_picture', { printSize: printSize('8x10'), attires: [attire('Toga')] }),
        inclusion('print', { quantity: 2, printSize: printSize('2R'), attires: [attire('Toga')] }),
        inclusion('print', { quantity: 5, printSize: printSize('2x2'), attires: [attire('Toga')] }),
        inclusion('print', { quantity: 4, printSize: printSize('1x1'), attires: [attire('Toga')] }),
        inclusion('privilege', { description: 'High Resolution soft copies' }),
        inclusion('privilege', { description: 'Usage of Toga and Hood' }),
        inclusion('privilege', { description: 'Usage of Ladies Accessories' }),
        inclusion('privilege', {
          description: 'Usage of Executive Attire',
          attires: [attire('Executive')],
        }),
        inclusion('privilege', { description: 'Usage of Barong' }),
        inclusion('privilege', {
          description: 'Usage of Filipiniana',
          attires: [attire('Filipiniana')],
        }),
      ],
    });
    expect(expandedRowModel(basic)).toEqual({
      description:
        'Entry graduation portrait package — 1 framed 8x10 Toga plus wallet-size prints.',
      durationLine: null,
      frameChips: ['Frame 1'],
      inclusionLines: [
        '1 framed picture · 8x10 · Toga',
        '2 prints · 2R · Toga',
        '5 prints · 2x2 · Toga',
        '4 prints · 1x1 · Toga',
        'High Resolution soft copies',
        'Usage of Toga and Hood',
        'Usage of Ladies Accessories',
        'Usage of Executive Attire',
        'Usage of Barong',
        'Usage of Filipiniana',
      ],
    });
  });
});
