// Confirmation read-back joins (issue #46). The public single-get carries
// bare branch/offering refs — only the add-on entries embed name + booking-
// time price — so the page joins names from the sibling list reads (the
// pages-join-names pattern). Prices NEVER come from the catalog: the total
// sums only record-carried snapshot values, and no function here accepts a
// catalog price as input — the snapshot rule is enforced by the signatures,
// not by discipline.

import type {
  AppointmentWithAddons,
  BranchRead,
  ServicePackageRead,
  StudioServiceWithBranches,
} from '@sevendays/types';

/**
 * Total due, from the record only: offering snapshot + add-on entry
 * snapshots. Null (ADR-0020) when ANY snapshot is unpriced — the Total is
 * omitted entirely; priced add-on entries keep their per-item lines
 * elsewhere. Never a ₱0 stand-in.
 */
export function confirmationTotalCents(record: AppointmentWithAddons): number | null {
  if (record.bookedPriceCents === null) return null;
  if (record.addonServices.some((a) => a.priceCents === null)) return null;
  return (
    record.bookedPriceCents + record.addonServices.reduce((sum, a) => sum + (a.priceCents ?? 0), 0)
  ); // guarded above
}

/** Branch display name joined from the branches read; '—' when unresolvable. */
export function branchNameFor(record: AppointmentWithAddons, branches: BranchRead[]): string {
  return branches.find((b) => b.id === record.branchId)?.name ?? '—';
}

export interface ReadCatalog {
  packages: ServicePackageRead[];
  services: StudioServiceWithBranches[];
}

/**
 * Offering display name joined from the sibling reads; '—' when the
 * offering is unresolvable (e.g. a package deactivated after booking —
 * the lists are active-only). Exactly-one is a table CHECK, so one of the
 * two refs is always set.
 */
export function offeringNameFor(record: AppointmentWithAddons, catalog: ReadCatalog): string {
  if (record.servicePackageId) {
    return catalog.packages.find((p) => p.id === record.servicePackageId)?.name ?? '—';
  }
  if (record.studioServiceId) {
    return catalog.services.find((s) => s.id === record.studioServiceId)?.name ?? '—';
  }
  return '—';
}
