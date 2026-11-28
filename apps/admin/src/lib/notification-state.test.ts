import { describe, expect, it } from 'vitest';
import {
  bellStatus,
  confirmBusy,
  initialsFromPerson,
  PANEL_CONFIRM_META,
  panelActingRowId,
  rowActionState,
} from './notification-state.js';
import { ACCEPTING_LABEL, REJECTING_LABEL } from './save-contract.js';

const row = (id: string) => ({
  id,
  quote: 'The photographer made our graduation shoot feel effortless.',
  person: 'Maria, batch 2026',
  status: 'pending' as const,
  createdAt: new Date('2026-11-16T08:30:00.000Z'),
  updatedAt: new Date('2026-11-16T08:30:00.000Z'),
});

describe('bellStatus (the count → badge / accessible-name / tooltip mapper, D2)', () => {
  it('0 reads as quiet: no badge, the bare name, no tooltip, never a zero', () => {
    expect(bellStatus(0)).toEqual({
      badge: null,
      ariaName: 'Notifications',
      tooltip: null,
    });
  });

  it('1–9 renders the count itself on the badge, the name, and the tooltip', () => {
    expect(bellStatus(1)).toEqual({
      badge: '1',
      ariaName: 'Notifications, 1 pending submissions',
      tooltip: '1 pending submissions',
    });
    expect(bellStatus(9).badge).toBe('9');
  });

  it('10+ caps the BADGE at 9+', () => {
    expect(bellStatus(10).badge).toBe('9+');
    expect(bellStatus(12).badge).toBe('9+');
  });

  it('the cap is visual-only, the accessible name carries the UNCAPPED count', () => {
    expect(bellStatus(12).ariaName).toBe('Notifications, 12 pending submissions');
  });

  it('the tooltip mirrors the name’s count, never the badge’s cap', () => {
    expect(bellStatus(12).tooltip).toBe('12 pending submissions');
    expect(bellStatus(0).tooltip).toBeNull();
  });
});

describe('initialsFromPerson (the letters-only initials rule, #304)', () => {
  it('letters-only words, first two, uppercased, ‘Maria & Paolo Dela Cruz’ → ‘MP’', () => {
    expect(initialsFromPerson('Maria & Paolo Dela Cruz')).toBe('MP');
  });

  it('a single word renders one initial; an empty person renders empty', () => {
    expect(initialsFromPerson('MARCOS')).toBe('M');
    expect(initialsFromPerson('')).toBe('');
  });

  it('digit and symbol words are skipped, not counted, ‘2026 batch, Team A’ → ‘BT’', () => {
    expect(initialsFromPerson('2026 batch, Team A')).toBe('BT');
  });
});

describe('PANEL_CONFIRM_META (the two confirms’ copy + the #304 polarity)', () => {
  it('accept: the D5 copy verbatim, the save-contract busy label, the PRIMARY fill', () => {
    expect(PANEL_CONFIRM_META.accept).toEqual({
      title: 'Accept this submission?',
      description: 'Accepting publishes it as a testimonial at the end of the list.',
      confirmLabel: 'Accept',
      busyLabel: ACCEPTING_LABEL,
      confirmVariant: 'default',
    });
    expect(ACCEPTING_LABEL).toBe('Accepting…');
  });

  it('reject: the tab’s dialog byte-identical, REJECTING_LABEL, destructive, GuardedConfirm’s own default', () => {
    expect(PANEL_CONFIRM_META.reject).toEqual({
      title: 'Reject this submission?',
      description:
        'The submission stays on record as rejected; nothing publishes, and the sender is never told.',
      confirmLabel: 'Reject',
      busyLabel: REJECTING_LABEL,
      confirmVariant: 'destructive',
    });
    expect(REJECTING_LABEL).toBe('Rejecting…');
  });
});

describe('the confirm-state machine (one dialog at a time, the pending wiring)', () => {
  it('panelActingRowId: idle → null; the pending mutation’s row while one runs', () => {
    expect(panelActingRowId(false, null, false, null)).toBeNull();
    expect(panelActingRowId(true, 'row-1', false, null)).toBe('row-1');
    expect(panelActingRowId(false, null, true, 'row-2')).toBe('row-2');
  });

  it('rowActionState: idle → nothing disabled; acting → every action disabled, busy ONLY on the acting row', () => {
    expect(rowActionState(null, 'row-1')).toEqual({ disabled: false, busy: false });
    expect(rowActionState('row-1', 'row-1')).toEqual({ disabled: true, busy: true });
    expect(rowActionState('row-1', 'row-2')).toEqual({ disabled: true, busy: false });
  });

  it('confirmBusy: the dialog is pending only while ITS row is the acting row; a null confirm is never busy', () => {
    const confirm = { kind: 'accept' as const, row: row('row-1') };
    expect(confirmBusy(confirm, 'row-1')).toBe(true);
    expect(confirmBusy(confirm, 'row-2')).toBe(false);
    expect(confirmBusy(confirm, null)).toBe(false);
    expect(confirmBusy(null, 'row-1')).toBe(false);
  });
});
