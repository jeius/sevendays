// The lockout law (M7 #221, spec "confirmed at the live re-ask"): no
// self-delete, no self-ban, the last ACTIVE owner protected from both —
// one pure module shared by the server fns (fresh-list, authoritative) and
// the UI affordances (query-list, presentational). "Active" = banned !==
// true (an expired-ban edge counts as banned here — accepted + noted).
import { describe, expect, it } from 'vitest';
import { type AdminUserSummary, banRefusal, deleteRefusal } from './users-guards';

const owner = (id: string, banned = false): AdminUserSummary => ({
  id,
  name: `Owner ${id}`,
  email: `${id}@sevendays.ph`,
  role: 'admin',
  banned,
  banReason: null,
});
const staff = (id: string): AdminUserSummary => ({
  id,
  name: `Staff ${id}`,
  email: `${id}@sevendays.ph`,
  role: 'staff',
  banned: false,
  banReason: null,
});

describe('deleteRefusal (M7 #221 — the lockout law)', () => {
  it('refuses deleting yourself', () => {
    const me = owner('me');
    expect(deleteRefusal('me', me, [me, staff('s1')])).toEqual([
      'You cannot delete your own account.',
    ]);
  });

  it('refuses deleting the last active owner', () => {
    const last = owner('last');
    expect(deleteRefusal('other', last, [last, staff('s1')])).toEqual([
      'The last active owner cannot be deleted. Promote another owner first.',
    ]);
  });

  it('allows deleting a second owner and any staff row', () => {
    const a = owner('a');
    const b = owner('b');
    const s = staff('s1');
    expect(deleteRefusal('a', b, [a, b, s])).toEqual([]);
    expect(deleteRefusal('a', s, [a, b, s])).toEqual([]);
  });

  it('allows deleting an owner who is the only one left but already banned — and a banned co-owner', () => {
    const bannedOnly = owner('x', true);
    expect(deleteRefusal('other', bannedOnly, [bannedOnly, staff('s1')])).toEqual([]);
    const activeA = owner('a');
    const bannedB = owner('b', true);
    expect(deleteRefusal('a', bannedB, [activeA, bannedB])).toEqual([]);
  });
});

describe('banRefusal (M7 #221 — the same law, the ban side)', () => {
  it('refuses banning yourself', () => {
    const me = owner('me');
    expect(banRefusal('me', me, [me, staff('s1')])).toEqual(['You cannot ban your own account.']);
  });

  it('refuses banning the last active owner; a second owner and staff are bannable', () => {
    const last = owner('last');
    const a = owner('a');
    const b = owner('b');
    expect(banRefusal('other', last, [last, staff('s1')])).toEqual([
      'The last active owner cannot be banned. Promote another owner first.',
    ]);
    expect(banRefusal('a', b, [a, b])).toEqual([]);
    expect(banRefusal('a', staff('s1'), [a, staff('s1')])).toEqual([]);
  });
});
