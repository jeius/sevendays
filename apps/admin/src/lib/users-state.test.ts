// The Users tab's row vocabulary (M7 #221): the domain role words render
// (ADR-0018 — Owner/Staff in UI copy, never the 'admin' gate literal);
// session rows are SHAPED — the plugin's token never crosses the seam into
// anything a component could render.
import { describe, expect, it } from 'vitest';
import { roleLabel, shapeSessionRows, shapeUserRows, statusLabel } from './users-state';

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
