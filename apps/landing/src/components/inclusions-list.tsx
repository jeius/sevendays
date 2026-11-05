import type { ResolvedPackageInclusion } from '@sevendays/types';

/** The inclusion phrase — the data composes the line (there is no name
 * field): ×qty · printSize · description · attires. Shared by the D2
 * featured plates (#223) and the package detail's grouped spec sheet
 * (#224). The old render block died here (#224 — the plates index and
 * the D2 detail own the inclusions surfaces now). */
export function inclusionPhrase(inclusion: ResolvedPackageInclusion): string {
  const size = inclusion.printSize ? inclusion.printSize.code : null;
  const attires =
    inclusion.attires.length > 0 ? inclusion.attires.map((a) => a.name).join(', ') : null;
  const parts = [
    inclusion.quantity !== null ? `×${inclusion.quantity}` : null,
    size,
    inclusion.description,
    attires,
  ].filter((part): part is string => part !== null);
  return parts.join(' · ');
}
