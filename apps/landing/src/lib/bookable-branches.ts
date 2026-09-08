import type { Branch, StudioServiceWithBranches } from '@sevendays/types';

/**
 * Branch-name chips for a Studio Service card (/services): the branches this
 * service is bookable at, in the branches read's order (name-ascending from
 * the API) — chip order is stable regardless of the service's id order.
 * Ids missing from the branches list are dropped, never rendered.
 */
export function bookableBranchNames(
  service: StudioServiceWithBranches,
  branches: Branch[]
): string[] {
  const bookable = new Set(service.bookableBranchIds);
  return branches.filter((b) => bookable.has(b.id)).map((b) => b.name);
}
