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

/**
 * The expanded sessions row lists ACTIVE sessions only (#244): a session at
 * or past its expiry instant is dropped before it can render. `now` is an
 * explicit arg so the seam stays pure and the tests stay clock-free.
 */
export function activeSessionRows(
  sessions: readonly AdminSessionRow[],
  now: Date
): AdminSessionRow[] {
  return sessions.filter((session) => session.expiresAt > now);
}

/** Five session rows per expanded page — the owner-scale list (#244). */
export const SESSIONS_PAGE_SIZE = 5;

/** One page of the sessions list, newest session first. */
export interface SessionPage {
  rows: AdminSessionRow[];
  page: number;
  pageCount: number;
  total: number;
  /** "1–5 of 12" (en dash, 1-based); "0 of 0" when empty. */
  rangeLabel: string;
}

export function paginateSessions(sessions: readonly AdminSessionRow[], page: number): SessionPage {
  const ordered = [...sessions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const total = ordered.length;
  const pageCount = Math.max(1, Math.ceil(total / SESSIONS_PAGE_SIZE));
  const clamped = Math.min(Math.max(1, page), pageCount);
  const rows = ordered.slice((clamped - 1) * SESSIONS_PAGE_SIZE, clamped * SESSIONS_PAGE_SIZE);
  const start = total === 0 ? 0 : (clamped - 1) * SESSIONS_PAGE_SIZE + 1;
  const end = total === 0 ? 0 : (clamped - 1) * SESSIONS_PAGE_SIZE + rows.length;
  return {
    rows,
    page: clamped,
    pageCount,
    total,
    rangeLabel: total === 0 ? '0 of 0' : `${start}–${end} of ${total}`,
  };
}
