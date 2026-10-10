// The Audit Log viewer's pure-seam contract (#188): tolerant search-param
// parsing (invalid values drop — a stale shared URL never 500s a visit),
// UTC day windows, page math, the label maps, and the wire→row parse
// through the landed auditLogRowSchema. Plain-node, no DOM (the admin
// lib-seam pattern).
import { auditActionSchema, auditEntitySchema } from '@sevendays/types';
import { describe, expect, it } from 'vitest';

import {
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
  AUDIT_PAGE_SIZE,
  auditDateWindow,
  auditLogSearchSchema,
  hasActiveFilters,
  pageWindow,
  parseAuditWireRows,
} from './filters';

describe('auditLogSearchSchema (tolerant parse — invalid drops, never throws)', () => {
  it('an empty search parses to the defaults (page 1, no filters)', () => {
    expect(auditLogSearchSchema.parse({})).toEqual({
      page: 1,
      entity: undefined,
      action: undefined,
      actor: undefined,
      from: undefined,
      to: undefined,
    });
  });

  it('page coerces from the URL string form and rejects garbage to 1', () => {
    expect(auditLogSearchSchema.parse({ page: '3' }).page).toBe(3);
    expect(auditLogSearchSchema.parse({ page: 'abc' }).page).toBe(1);
    expect(auditLogSearchSchema.parse({ page: '0' }).page).toBe(1);
    expect(auditLogSearchSchema.parse({ page: '-2' }).page).toBe(1);
  });

  it('a valid entity and action parse; unknown values drop to undefined (stale URLs survive)', () => {
    const parsed = auditLogSearchSchema.parse({
      entity: 'service-package',
      action: 'deactivate',
    });
    expect(parsed.entity).toBe('service-package');
    expect(parsed.action).toBe('deactivate');
    // Assert on the PARSED OUTPUT (z.object strips/rejects silently) — an
    // unknown enum value is absent, and the rest of the search survives.
    const dropped = auditLogSearchSchema.parse({
      entity: 'not-an-entity',
      action: 'delete',
      actor: 'owner@studio.test',
    });
    expect(dropped.entity).toBeUndefined();
    expect(dropped.action).toBeUndefined();
    expect(dropped.actor).toBe('owner@studio.test');
  });

  it('a malformed date drops to undefined; a well-formed one survives', () => {
    expect(auditLogSearchSchema.parse({ from: '2026-13-99' }).from).toBeUndefined();
    expect(auditLogSearchSchema.parse({ from: '10/06/2026' }).from).toBeUndefined();
    expect(auditLogSearchSchema.parse({ from: '2026-10-06' }).from).toBe('2026-10-06');
  });
});

describe('auditDateWindow (UTC day boundaries — the display clock is UTC)', () => {
  it('from/to bracket their days — to is inclusive-day, exclusive-instant', () => {
    expect(auditDateWindow({ page: 1, from: '2026-10-01', to: '2026-10-06' })).toEqual({
      start: '2026-10-01T00:00:00.000Z',
      endExclusive: '2026-10-07T00:00:00.000Z',
    });
  });

  it('month and year rollovers compute the next day correctly', () => {
    expect(auditDateWindow({ page: 1, to: '2026-10-31' }).endExclusive).toBe(
      '2026-11-01T00:00:00.000Z'
    );
    expect(auditDateWindow({ page: 1, to: '2026-12-31' }).endExclusive).toBe(
      '2027-01-01T00:00:00.000Z'
    );
  });

  it('either side alone yields a half-open window', () => {
    expect(auditDateWindow({ page: 1, from: '2026-10-01' })).toEqual({
      start: '2026-10-01T00:00:00.000Z',
      endExclusive: null,
    });
    expect(auditDateWindow({ page: 1, to: '2026-10-06' })).toEqual({
      start: null,
      endExclusive: '2026-10-07T00:00:00.000Z',
    });
  });

  it('from after to yields an empty window, not an error', () => {
    const window = auditDateWindow({ page: 1, from: '2026-10-08', to: '2026-10-06' });
    expect(
      window.start !== null && window.endExclusive !== null && window.start > window.endExclusive
    ).toBe(true);
  });

  it('a calendar-invalid day (regex-valid, NaN-parsing) drops its side to null', () => {
    expect(auditDateWindow({ page: 1, from: '2026-02-31' }).start).toBeNull();
    expect(auditDateWindow({ page: 1, to: '2026-02-31' }).endExclusive).toBeNull();
  });
});

describe('pageWindow', () => {
  it('an empty log is page 1 of 1 with no offset', () => {
    expect(pageWindow(0, 1)).toEqual({
      page: 1,
      totalPages: 1,
      offset: 0,
      hasPrev: false,
      hasNext: false,
    });
  });

  it('45 rows are three pages; page 2 sits at offset 20 with both neighbors', () => {
    expect(pageWindow(45, 2)).toEqual({
      page: 2,
      totalPages: 3,
      offset: AUDIT_PAGE_SIZE,
      hasPrev: true,
      hasNext: true,
    });
    expect(pageWindow(20, 1).totalPages).toBe(1);
    expect(pageWindow(21, 1).totalPages).toBe(2);
  });

  it('a stale page beyond the end clamps to the last real page', () => {
    expect(pageWindow(45, 99)).toEqual({
      page: 3,
      totalPages: 3,
      offset: 40,
      hasPrev: true,
      hasNext: false,
    });
  });
});

describe('the label maps + parseAuditWireRows', () => {
  it('every entity and action enum value is labeled', () => {
    expect(Object.keys(AUDIT_ENTITY_LABELS).sort()).toEqual([...auditEntitySchema.options].sort());
    expect(Object.keys(AUDIT_ACTION_LABELS).sort()).toEqual([...auditActionSchema.options].sort());
  });

  it('parseAuditWireRows coerces ISO strings to Dates and strips unknown keys', () => {
    const rows = parseAuditWireRows([
      {
        id: '0d6ee72a-1b1c-4c0e-8c9f-3a1f2f0f9b11',
        occurredAt: '2026-10-06T09:05:17.721Z',
        actorId: 'actor-1',
        actorEmail: 'owner@studio.test',
        entity: 'branch',
        entityId: '7e0e4c3a-9a4b-4d8e-a2b1-6f5c4d3e2f10',
        action: 'update',
        summary: 'Makati',
        requestId: 'req_abc123',
        injectedKey: 'must-not-survive',
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.occurredAt).toBeInstanceOf(Date);
    expect(rows[0]?.occurredAt.toISOString()).toBe('2026-10-06T09:05:17.721Z');
    expect(Object.hasOwn(rows[0] as object, 'injectedKey')).toBe(false);
  });

  it('parseAuditWireRows throws on a malformed row (loud, never silent)', () => {
    expect(() => parseAuditWireRows([{ id: 'not-a-uuid', occurredAt: 'nope' }])).toThrow();
  });
});

describe('hasActiveFilters', () => {
  it('defaults are inactive; each filter alone is active', () => {
    expect(hasActiveFilters(auditLogSearchSchema.parse({}))).toBe(false);
    expect(hasActiveFilters(auditLogSearchSchema.parse({ entity: 'branch' }))).toBe(true);
    expect(hasActiveFilters(auditLogSearchSchema.parse({ action: 'create' }))).toBe(true);
    expect(hasActiveFilters(auditLogSearchSchema.parse({ actor: 'owner@studio.test' }))).toBe(true);
    expect(hasActiveFilters(auditLogSearchSchema.parse({ from: '2026-10-01' }))).toBe(true);
    expect(hasActiveFilters(auditLogSearchSchema.parse({ to: '2026-10-06' }))).toBe(true);
  });
});
