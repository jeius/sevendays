/**
 * The catalog row-shaping module (candidate C, 2026-09-02 spec): pure
 * functions from catalog-style entries plus resolved id lookups to typed row
 * values and junction pairs. What an Inclusion row needs per Kind, how
 * combined Attire contexts decompose into junction pairs in catalog order,
 * how Frames attach — nothing about HOW or WHEN rows are written: no I/O, no
 * client creation, no transactions. The seeder (upsert-and-rebuild) and the
 * API test fixtures (plain inserts) are its two write adapters.
 *
 * Per-Kind rules (ADR-0009): framed_picture → quantity 1, printSizeId
 * resolved, frameId required, description null; print → entry quantity,
 * printSizeId resolved, frameId null, description null; privilege →
 * quantity/printSizeId/frameId null, description carried. Junction pairs
 * decompose an entry's attireNames in array order — 'Filipiniana/Executive'
 * is two pairs, Filipiniana first (the canonical catalog attire order, never
 * alphabetized). Unknown names fail loudly, never skip.
 */
import type { frames, packageInclusionAttires, packageInclusions } from './schema/index.js';

export type InclusionKind = 'framed_picture' | 'print' | 'privilege';

export type PictureEntry = {
  kind: 'framed_picture' | 'print';
  quantity: number;
  printSizeCode: string | null;
  attireNames: string[];
  frameId?: string | null;
};

export type PrivilegeEntry = {
  kind: 'privilege';
  description: string;
  attireNames: string[];
};

export type InclusionEntry = PictureEntry | PrivilegeEntry;

export type AttireIdLookup = ReadonlyMap<string, string>;
export type PrintSizeIdLookup = ReadonlyMap<string, string>;

export type InclusionRowValues = typeof packageInclusions.$inferInsert;
export type JunctionPairValues = typeof packageInclusionAttires.$inferInsert;
export type FrameRowValues = typeof frames.$inferInsert;

export function assertAllKnownAttires(input: {
  entries: readonly InclusionEntry[];
  attireId: AttireIdLookup;
}): void {
  for (const entry of input.entries) {
    for (const name of entry.attireNames) {
      if (!input.attireId.has(name)) {
        throw new Error(`Unknown attire name: ${name}`);
      }
    }
  }
}

export function buildInclusionRowValues(input: {
  servicePackageId: string;
  entries: readonly InclusionEntry[];
  printSizeId: PrintSizeIdLookup;
}): InclusionRowValues[] {
  // biome-ignore lint/suspicious/useIterableCallbackReturn: exhaustive switch over InclusionEntry is deliberate — no default branch (adding a Kind becomes a compile error)
  return input.entries.map((entry) => {
    const base = { servicePackageId: input.servicePackageId };
    switch (entry.kind) {
      case 'framed_picture': {
        if (!entry.frameId) {
          throw new Error('framed_picture entry is missing frameId');
        }
        return {
          ...base,
          kind: 'framed_picture' as const,
          quantity: 1,
          printSizeId: resolvePrintSize(entry.printSizeCode, input.printSizeId),
          frameId: entry.frameId,
          description: null,
        };
      }
      case 'print':
        return {
          ...base,
          kind: 'print' as const,
          quantity: entry.quantity,
          printSizeId: resolvePrintSize(entry.printSizeCode, input.printSizeId),
          frameId: null,
          description: null,
        };
      case 'privilege':
        return {
          ...base,
          kind: 'privilege' as const,
          quantity: null,
          printSizeId: null,
          frameId: null,
          description: entry.description,
        };
    }
  });
}

export function buildJunctionPairs(input: {
  inclusionIds: readonly string[];
  entries: readonly InclusionEntry[];
  attireId: AttireIdLookup;
}): JunctionPairValues[] {
  if (input.inclusionIds.length !== input.entries.length) {
    throw new Error(
      `junction pairing mismatch: ${input.inclusionIds.length} ids for ${input.entries.length} entries`
    );
  }
  const pairs: JunctionPairValues[] = [];
  for (const [i, entry] of input.entries.entries()) {
    const inclusionId = input.inclusionIds[i];
    if (!inclusionId) throw new Error(`junction pairing: no inclusionId at index ${i}`);
    for (const name of entry.attireNames) {
      const id = input.attireId.get(name);
      if (!id) throw new Error(`Unknown attire name: ${name}`);
      pairs.push({ inclusionId, attireId: id });
    }
  }
  return pairs;
}

export function buildFrameRowValues(input: {
  servicePackageId: string;
  frameNumbers: readonly number[];
}): FrameRowValues[] {
  return input.frameNumbers.map((frameNumber) => ({
    servicePackageId: input.servicePackageId,
    frameNumber,
  }));
}

function resolvePrintSize(code: string | null, lookup: PrintSizeIdLookup): string | null {
  if (code === null) return null;
  const id = lookup.get(code);
  if (!id) throw new Error(`Unknown print size code: ${code}`);
  return id;
}
