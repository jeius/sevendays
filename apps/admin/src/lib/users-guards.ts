// The lockout law (M7 #221, spec "deletion guards, confirmed at the live
// re-ask"): no self-delete, no self-ban (your own row is view-only), and
// the last ACTIVE owner is protected from both — refusals are the house
// field-detailed 400 lines. Pure: the server fns run it over a FRESH
// listUsers read (authoritative); the UI runs the same module over its
// query data for affordances (disabled actions, view-only own row). The
// plugin's own self-guards (YOU_CANNOT_*_YOURSELF) remain the backstop —
// ours answer first with the house copy. "Active" = banned !== true; an
// expired temporary ban counts as banned here (accepted edge — temporary
// bans are not the studio's shape).
export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
}

const isActiveOwner = (user: AdminUserSummary): boolean =>
  user.role === 'admin' && user.banned !== true;

function refusalLines(
  selfLine: string,
  lastOwnerLine: string,
  actorId: string,
  target: AdminUserSummary,
  users: readonly AdminUserSummary[]
): string[] {
  if (actorId === target.id) {
    return [selfLine];
  }
  if (isActiveOwner(target)) {
    const otherActiveOwners = users.filter((u) => u.id !== target.id && isActiveOwner(u));
    if (otherActiveOwners.length === 0) {
      return [lastOwnerLine];
    }
  }
  return [];
}

export function deleteRefusal(
  actorId: string,
  target: AdminUserSummary,
  users: readonly AdminUserSummary[]
): string[] {
  return refusalLines(
    'You cannot delete your own account.',
    'The last active owner cannot be deleted. Promote another owner first.',
    actorId,
    target,
    users
  );
}

export function banRefusal(
  actorId: string,
  target: AdminUserSummary,
  users: readonly AdminUserSummary[]
): string[] {
  return refusalLines(
    'You cannot ban your own account.',
    'The last active owner cannot be banned. Promote another owner first.',
    actorId,
    target,
    users
  );
}
