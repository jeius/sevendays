// The packages expanded row's composition seam (M7 #219): one pure
// derivation from ServicePackageRead to the render model both postures
// (the desktop ExpandPanel and the mobile stacked reveal) render.
// durationMinutes renders nowhere else in the table; frames chip by
// frame number; inclusions render as bullet lines — label + print size +
// attires for picture kinds, the description alone for privileges (an
// attire suffix would duplicate the subject: "Usage of Barong · Barong").
// Array order IS render order (the server renumbers in-transaction) —
// the seam never sorts. Pure rendering, zero API work: the read shape
// already carries every field.
//
// (owner-reacted 2026-10-17, #219's variants round): the three string
// forms ratified as rendered — the duration line ("60 minutes" beside a
// Clock icon), the chip prefix ("Frame 1"), and the bullet grammar
// ("1 framed picture · 8x10 · Toga"; privileges description-alone).
import type {
  PackageInclusionKind,
  ResolvedPackageInclusion,
  ServicePackageRead,
} from '@sevendays/types';

export interface ExpandedRowModel {
  description: string;
  durationLine: string | null;
  frameChips: string[];
  inclusionLines: string[];
}

function durationLineFrom(minutes: number | null): string | null {
  if (minutes == null) return null;
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}

function inclusionLabel(
  kind: PackageInclusionKind,
  quantity: number | null,
  description: string | null
): string {
  if (description) return description;
  if (kind === 'privilege') return 'Privilege';
  const noun = kind === 'framed_picture' ? 'framed picture' : 'print';
  if (quantity == null) return noun;
  return `${quantity} ${quantity === 1 ? noun : `${noun}s`}`;
}

function inclusionLine(inclusion: ResolvedPackageInclusion): string {
  const parts: (string | null)[] = [
    inclusionLabel(inclusion.kind, inclusion.quantity, inclusion.description),
    inclusion.printSize?.code ?? null,
  ];
  if (inclusion.kind !== 'privilege' && inclusion.attires.length > 0) {
    parts.push(inclusion.attires.map((attire) => attire.name).join('/'));
  }
  return parts.filter((part): part is string => part != null).join(' · ');
}

export function expandedRowModel(row: ServicePackageRead): ExpandedRowModel {
  return {
    description: row.description,
    durationLine: durationLineFrom(row.durationMinutes),
    frameChips: row.frames.map((frame) => `Frame ${frame.frameNumber}`),
    inclusionLines: row.inclusions.map(inclusionLine),
  };
}
