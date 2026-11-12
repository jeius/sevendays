// The Users tab's row vocabulary (M7 #221): the domain role words render
// (ADR-0018 — Owner/Staff in UI copy, never the 'admin' gate literal);
// session rows are SHAPED — the plugin's token never crosses the seam into
// anything a component could render.
import { describe, expect, it } from 'vitest';
import type { AdminSessionRow } from './users-state';
import {
  activeSessionRows,
  paginateSessions,
  roleLabel,
  shapeSessionRows,
  shapeUserRows,
  statusLabel,
} from './users-state';

const baseUser = {
  name: 'Test Owner',
  email: 'owner@sevendays.ph',
  banReason: null as string | null,
};

describe('roleLabel + statusLabel (M7 #221)', () => {
  it('maps admin→Owner; staff and null→Staff (the nullable role column)', () => {
    expect(roleLabel('admin')).toBe('Owner');
    expect(roleLabel('staff')).toBe('Staff');
    expect(roleLabel(null)).toBe('Staff');
    expect(roleLabel(undefined)).toBe('Staff');
  });

  it('statusLabel reads banned truthy as Banned, everything else Active', () => {
    expect(statusLabel({ ...baseUser, id: '1', role: 'admin', banned: true })).toBe('Banned');
    expect(statusLabel({ ...baseUser, id: '2', role: 'staff', banned: false })).toBe('Active');
    expect(statusLabel({ ...baseUser, id: '3', role: 'staff', banned: null })).toBe('Active');
  });
});

describe('shapeUserRows (M7 #221)', () => {
  it('carries id/name/email/role/banned + roleLabel/statusLabel/isSelf; preserves input order', () => {
    const rows = shapeUserRows(
      [
        { ...baseUser, id: 'a', role: 'admin', banned: false },
        { ...baseUser, id: 'me', role: 'staff', banned: false },
      ],
      'me'
    );
    expect(rows.map((r) => r.id)).toEqual(['a', 'me']);
    expect(rows[0]).toMatchObject({ roleLabel: 'Owner', statusLabel: 'Active', isSelf: false });
    expect(rows[1]).toMatchObject({ roleLabel: 'Staff', isSelf: true });
  });

  it('shapeSessionRows strips the token — the shaped row carries no token key at all', () => {
    const rows = shapeSessionRows([
      {
        id: 'sess-1',
        token: 'secret-token-value',
        createdAt: new Date('2026-10-18T08:00:00Z'),
        expiresAt: new Date('2026-10-25T08:00:00Z'),
        ipAddress: '203.0.113.9',
        userAgent: 'Mozilla/5.0',
        userId: 'a',
        updatedAt: new Date('2026-10-18T08:00:00Z'),
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      id: 'sess-1',
      createdAt: new Date('2026-10-18T08:00:00Z'),
      expiresAt: new Date('2026-10-25T08:00:00Z'),
      ipAddress: '203.0.113.9',
      userAgent: 'Mozilla/5.0',
    });
    expect(Object.hasOwn(rows[0] as object, 'token')).toBe(false);
  });
});

const NOW = new Date('2026-11-12T12:00:00Z');

function sessionRow(overrides: Partial<AdminSessionRow> & { id: string }): AdminSessionRow {
  return {
    createdAt: NOW,
    expiresAt: new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000),
    ipAddress: null,
    userAgent: null,
    ...overrides,
  };
}

describe('activeSessionRows (#244)', () => {
  it('drops sessions at or past expiry, keeps strictly-future ones', () => {
    const rows = [
      sessionRow({ id: 'live', expiresAt: new Date(NOW.getTime() + 60_000) }),
      sessionRow({ id: 'now', expiresAt: NOW }),
      sessionRow({ id: 'past', expiresAt: new Date(NOW.getTime() - 60_000) }),
    ];
    expect(activeSessionRows(rows, NOW).map((r) => r.id)).toEqual(['live']);
  });

  it('passes an empty list through unchanged', () => {
    expect(activeSessionRows([], NOW)).toEqual([]);
  });
});

describe('paginateSessions (#244)', () => {
  // 7 rows, pageSize 5 → 2 pages. createdAt descends by index (sess-0 newest).
  const seven = Array.from({ length: 7 }, (_, i) =>
    sessionRow({ id: `sess-${i}`, createdAt: new Date(NOW.getTime() - i * 60_000) })
  );

  it('orders newest-first and slices the clamped page', () => {
    const first = paginateSessions(seven, 1);
    expect(first.rows.map((r) => r.id)).toEqual(['sess-0', 'sess-1', 'sess-2', 'sess-3', 'sess-4']);
    expect(first).toMatchObject({ page: 1, pageCount: 2, total: 7, rangeLabel: '1–5 of 7' });
    const second = paginateSessions(seven, 2);
    expect(second.rows.map((r) => r.id)).toEqual(['sess-5', 'sess-6']);
    expect(second.rangeLabel).toBe('6–7 of 7');
  });

  it('clamps a stale high page back to the last page and a low page to 1', () => {
    expect(paginateSessions(seven, 9).page).toBe(2);
    expect(paginateSessions(seven, 0).page).toBe(1);
  });

  it('an empty list yields page 1 of 1, no rows, and "0 of 0"', () => {
    const empty = paginateSessions([], 1);
    expect(empty).toMatchObject({ rows: [], page: 1, pageCount: 1, total: 0 });
    expect(empty.rangeLabel).toBe('0 of 0');
  });

  it('a single page hides nothing and labels the exact count', () => {
    const three = seven.slice(0, 3);
    expect(paginateSessions(three, 1).rangeLabel).toBe('1–3 of 3');
  });
});
