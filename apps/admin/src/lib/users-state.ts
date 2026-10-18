// The Users tab's row vocabulary (M7 #221): ADR-0018's domain words in UI
// copy (Owner/Staff — the 'admin' gate literal never renders), the
// Active/Banned status pair, the own-row marker, and the session-row shape
// that strips the plugin's session TOKEN by construction (a component
// cannot render what the shape does not carry).
import type { AdminUserSummary } from './users-guards';

export function roleLabel(role: string | null | undefined): 'Owner' | 'Staff' {
  return role === 'admin' ? 'Owner' : 'Staff';
}

export function statusLabel(user: AdminUserSummary): 'Active' | 'Banned' {
  return user.banned === true ? 'Banned' : 'Active';
}

export interface AdminUserRow extends AdminUserSummary {
  roleLabel: 'Owner' | 'Staff';
  statusLabel: 'Active' | 'Banned';
  isSelf: boolean;
}

export function shapeUserRows(users: readonly AdminUserSummary[], actorId: string): AdminUserRow[] {
  return users.map((user) => ({
    ...user,
    roleLabel: roleLabel(user.role),
    statusLabel: statusLabel(user),
    isSelf: user.id === actorId,
  }));
}

/** The plugin's session row minus the token — never shaped, never shipped. */
export interface AdminSessionRow {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

export function shapeSessionRows(
  sessions: ReadonlyArray<
    {
      id: string;
      createdAt: Date;
      expiresAt: Date;
      ipAddress?: string | null;
      userAgent?: string | null;
    } & Record<string, unknown>
  >
): AdminSessionRow[] {
  return sessions.map((session) => ({
    id: session.id,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    ipAddress: session.ipAddress ?? null,
    userAgent: session.userAgent ?? null,
  }));
}
