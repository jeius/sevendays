import { describe, expect, it } from 'vitest';
import {
  ACCEPTING_LABEL,
  blockerLines,
  closesOnEvent,
  DELETING_LABEL,
  idleSaveContract,
  pendingVocabulary,
  REJECTING_LABEL,
  reduceSaveContract,
  SAVING_LABEL,
  UPLOADING_LABEL,
} from './save-contract.js';

describe('pendingVocabulary (the one pending vocabulary mapper, #218)', () => {
  it('idle: enabled, not aria-busy, the idle label', () => {
    expect(
      pendingVocabulary({ pending: false, idleLabel: 'Save changes', busyLabel: SAVING_LABEL })
    ).toEqual({ disabled: false, ariaBusy: false, label: 'Save changes' });
  });

  it('pending: disabled + aria-busy + the busy label swap (Saving…/Uploading…/Deleting… pinned)', () => {
    expect(
      pendingVocabulary({ pending: true, idleLabel: 'Save changes', busyLabel: SAVING_LABEL })
    ).toEqual({ disabled: true, ariaBusy: true, label: 'Saving…' });
    expect(
      pendingVocabulary({ pending: true, idleLabel: 'Upload cover', busyLabel: UPLOADING_LABEL })
    ).toEqual({ disabled: true, ariaBusy: true, label: 'Uploading…' });
    expect(
      pendingVocabulary({ pending: true, idleLabel: 'Delete', busyLabel: DELETING_LABEL })
    ).toEqual({ disabled: true, ariaBusy: true, label: 'Deleting…' });
    expect(ACCEPTING_LABEL).toBe('Accepting…');
    expect(REJECTING_LABEL).toBe('Rejecting…');
  });
});

describe('reduceSaveContract (the async Save contract state)', () => {
  it('started → saving; the sheet is held', () => {
    expect(reduceSaveContract(idleSaveContract, { type: 'started' })).toEqual({ saving: true });
  });

  it('settled ok:true → saving released (the close follows via closesOnEvent)', () => {
    expect(reduceSaveContract({ saving: true }, { type: 'settled', ok: true })).toEqual({
      saving: false,
    });
  });

  it('settled ok:false → saving released too — the hold is the OPEN sheet, never a stuck spinner (retry is safe)', () => {
    expect(reduceSaveContract({ saving: true }, { type: 'settled', ok: false })).toEqual({
      saving: false,
    });
  });
});

describe('closesOnEvent (the close-only-on-success rule)', () => {
  it('in-flight never closes; settled-true closes; settled-false (a veto or failed save) holds', () => {
    expect(closesOnEvent({ type: 'started' })).toBe(false);
    expect(closesOnEvent({ type: 'settled', ok: true })).toBe(true);
    expect(closesOnEvent({ type: 'settled', ok: false })).toBe(false);
  });
});

describe('blockerLines (the delete dialog’s in-body blockers, from the #213 400 details)', () => {
  it('derives one capitalized-family line per detail, order preserved', () => {
    expect(
      blockerLines([
        { path: ['appointments'], message: 'referenced by 3 appointment(s)' },
        { path: ['photos'], message: 'contains 2 photo(s)' },
      ])
    ).toEqual(['Appointments — referenced by 3 appointment(s)', 'Photos — contains 2 photo(s)']);
  });

  it('a detail with no path renders its message alone', () => {
    expect(blockerLines([{ message: 'used by 4 package inclusion(s)' }])).toEqual([
      'used by 4 package inclusion(s)',
    ]);
  });

  it('non-array details answer empty (the dialog body falls back to the message line)', () => {
    expect(blockerLines(undefined)).toEqual([]);
    expect(blockerLines({ nope: true })).toEqual([]);
  });

  it('malformed entries are skipped, never thrown', () => {
    expect(
      blockerLines([
        null,
        42,
        'text',
        { path: 'not-an-array', message: 'fine' },
        { path: ['appointments'] },
      ])
    ).toEqual(['fine']);
  });
});
