// The owner-visibility law, lib-seam-pinned (#188, ADR-0018): the nav's
// owner-only entries — Audit Log, person-level by the standing rule —
// render for role === 'admin' alone ('staff' and null both fail; the
// column is nullable in the user table). Plain-node over the extracted
// taxonomy (the data was inline in admin-sidebar.tsx since #139 — the
// extraction makes the law testable).
import { describe, expect, it } from 'vitest';

import { navGroups, visibleNavGroups } from './nav';

describe('visibleNavGroups (the ADR-0018 gate)', () => {
  it('the owner (role admin) sees Audit Log in Overview, directly after Analytics', () => {
    const overview = visibleNavGroups('admin').find((group) => group.heading === 'Overview');
    expect(overview?.items.map((item) => item.to)).toEqual(['/', '/audit-log']);
  });

  it('staff (role staff) see no Audit Log entry anywhere — Analytics unaffected', () => {
    const items = visibleNavGroups('staff').flatMap((group) => group.items);
    expect(items.some((item) => item.to === '/audit-log')).toBe(false);
    expect(items.some((item) => item.to === '/')).toBe(true);
  });

  it('a null role (the column is nullable) fails the owner gate too', () => {
    expect(
      visibleNavGroups(null)
        .flatMap((group) => group.items)
        .some((item) => item.to === '/audit-log')
    ).toBe(false);
    expect(
      visibleNavGroups(undefined)
        .flatMap((group) => group.items)
        .some((item) => item.to === '/audit-log')
    ).toBe(false);
  });

  it("Audit Log is the taxonomy's only owner-only item, and no group vanishes for staff", () => {
    const ownerOnly = navGroups.flatMap((group) => group.items.filter((item) => item.ownerOnly));
    expect(ownerOnly.map((item) => item.to)).toEqual(['/audit-log']);
    expect(visibleNavGroups('staff').map((group) => group.heading)).toEqual(
      navGroups.map((group) => group.heading)
    );
  });
});
