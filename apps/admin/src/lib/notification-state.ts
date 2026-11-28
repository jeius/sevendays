// The Notification's pure seams (M9 #314, ADR-0028): the count → badge /
// accessible-name / tooltip mapper (the D2 laws — the badge caps at 9+ and
// hides at 0; the count rides the trigger's name UNCAPPED), the panel
// rows' letters-only initials rule (the #304 prototype's, not the
// sidebar's word-based one), and the confirm-state machine — the two
// dialogs' copy (D5's ratified table verbatim) with the #304 polarity
// ruling (accept publishes = the primary fill, reject destroys =
// destructive) and the pending wiring (which row is acting, which dialog
// is busy). No React here — the component composes these; the plain-node
// suite pins them.
import type { TestimonialSubmission } from '@sevendays/types';
import { ACCEPTING_LABEL, REJECTING_LABEL } from './save-contract';

export type PanelConfirmKind = 'accept' | 'reject';

/**
 * One confirm at a time (the machine's law): a single nullable target,
 * not a map — a second dialog can never open beside the first because
 * there is no second slot. The row object is tracked directly (the #304
 * ruling): the dialog stays mounted over its row through the act, never
 * re-looked-up by id.
 */
export type PanelConfirm = { kind: PanelConfirmKind; row: TestimonialSubmission } | null;

/**
 * The count → chrome mapper (D2, ruled at #304): the badge is the pending
 * count as an amber chip, capped '9+' — a backlog never breaks the chrome
 * — and HIDDEN at 0 (a quiet queue reads as quiet, never as a zero). The
 * cap is visual-only: the accessible name and the tooltip carry the
 * UNCAPPED count as one atomic status — `Notifications, {n} pending
 * submissions` — the visual badge is aria-hidden, so the count is heard
 * exactly once.
 */
export function bellStatus(count: number): {
  badge: string | null;
  ariaName: string;
  tooltip: string | null;
} {
  return {
    badge: count > 0 ? (count > 9 ? '9+' : String(count)) : null,
    ariaName: count > 0 ? `Notifications, ${count} pending submissions` : 'Notifications',
    tooltip: count > 0 ? `${count} pending submissions` : null,
  };
}

/**
 * Words with letters only, first two, uppercased — the #304 prototype's
 * rule ('Maria & Paolo Dela Cruz' → 'MP': '&' is not a word, neither is
 * '2026'). NOT the sidebar's word-based initials: submission persons
 * carry commas, batches, and ampersands.
 */
export function initialsFromPerson(person: string): string {
  return person
    .split(/\s+/)
    .filter((word) => /\p{L}/u.test(word))
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

/**
 * The panel's two confirms — D5's ratified copy table verbatim (#305):
 * the reject dialog is the Submissions tab's GuardedConfirm
 * byte-identical; the accept dialog is the new ratified copy.
 * confirmVariant carries the #304 polarity ruling: accept PUBLISHES = the
 * primary fill ('default'), reject DESTROYS = 'destructive' — which is
 * GuardedConfirm's own default, so the reject dialog renders identically
 * with or without the prop; it rides for symmetry (one meta record, both
 * dialogs).
 */
export const PANEL_CONFIRM_META: Record<
  PanelConfirmKind,
  {
    title: string;
    description: string;
    confirmLabel: string;
    busyLabel: string;
    confirmVariant: 'default' | 'destructive';
  }
> = {
  accept: {
    title: 'Accept this submission?',
    description: 'Accepting publishes it as a testimonial at the end of the list.',
    confirmLabel: 'Accept',
    busyLabel: ACCEPTING_LABEL,
    confirmVariant: 'default',
  },
  reject: {
    title: 'Reject this submission?',
    description:
      'The submission stays on record as rejected; nothing publishes, and the sender is never told.',
    confirmLabel: 'Reject',
    busyLabel: REJECTING_LABEL,
    confirmVariant: 'destructive',
  },
};

/**
 * Which row is acting: the pending mutation's row id, else null. One act
 * at a time by construction — the confirm machine opens one dialog, and
 * only that dialog's confirm ever fires.
 */
export function panelActingRowId(
  acceptPending: boolean,
  acceptRowId: string | null,
  rejectPending: boolean,
  rejectRowId: string | null
): string | null {
  if (acceptPending) {
    return acceptRowId;
  }
  return rejectPending ? rejectRowId : null;
}

/**
 * A row's action wiring: while any act runs EVERY action disables (a
 * second confirm can never open mid-flight), and the acting row alone
 * goes busy — the spinner takes the icon's place, aria-busy carries the
 * state (#218's icon-only half).
 */
export function rowActionState(
  actingId: string | null,
  rowId: string
): { disabled: boolean; busy: boolean } {
  return { disabled: actingId !== null, busy: actingId === rowId };
}

/**
 * The open dialog's pending: true only while ITS row is the acting row —
 * the spinner + busy label + disabled Cancel ride the dialog through the
 * act (GuardedConfirm's own contract), and nothing else can busy it.
 */
export function confirmBusy(confirm: PanelConfirm, actingId: string | null): boolean {
  return confirm !== null && actingId === confirm.row.id;
}
