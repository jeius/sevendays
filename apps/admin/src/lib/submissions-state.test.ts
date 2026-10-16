import { describe, expect, it } from 'vitest';
import {
  acceptEditStateFromSubmission,
  buildAcceptPayload,
  filterSubmissions,
  SUBMISSION_SEGMENTS,
  submittedOn,
  validateAcceptEdit,
} from './submissions-state.js';

const base = {
  id: '11111111-1111-4111-8111-111111111111',
  quote: 'The photographer made our graduation shoot feel effortless.',
  person: 'Maria, batch 2026',
  status: 'pending' as const,
  createdAt: new Date('2026-10-14T08:30:00.000Z'),
  updatedAt: new Date('2026-10-14T08:30:00.000Z'),
};

describe("SUBMISSION_SEGMENTS (the queue's own segment)", () => {
  it('is Pending / Accepted / Rejected / All in order — pending leads because the queue IS the work', () => {
    expect(SUBMISSION_SEGMENTS).toEqual([
      { value: 'pending', label: 'Pending' },
      { value: 'accepted', label: 'Accepted' },
      { value: 'rejected', label: 'Rejected' },
      { value: 'all', label: 'All' },
    ]);
  });
});

describe("filterSubmissions (the tab's own status segment)", () => {
  const rows = [
    { ...base, id: '1', status: 'pending' as const },
    { ...base, id: '2', status: 'accepted' as const },
    { ...base, id: '3', status: 'rejected' as const },
    { ...base, id: '4', status: 'pending' as const },
  ];

  it('pending/accepted/rejected filter on status', () => {
    expect(filterSubmissions(rows, 'pending').map((r) => r.id)).toEqual(['1', '4']);
    expect(filterSubmissions(rows, 'accepted').map((r) => r.id)).toEqual(['2']);
    expect(filterSubmissions(rows, 'rejected').map((r) => r.id)).toEqual(['3']);
  });

  it("'all' returns the queue whole — retained rows stay spottable (repeat submitters)", () => {
    expect(filterSubmissions(rows, 'all')).toHaveLength(4);
  });
});

describe('acceptEditStateFromSubmission + validateAcceptEdit + buildAcceptPayload', () => {
  it('the edit state prefills the stored quote + person', () => {
    expect(acceptEditStateFromSubmission(base)).toEqual({ quote: base.quote, person: base.person });
  });

  it('valid edits validate clean and the payload carries the TRIMMED pair (the sheet always sends both)', () => {
    const state = { quote: `  ${base.quote}  `, person: ' Maria D. ' };
    expect(validateAcceptEdit(state)).toEqual({});
    expect(buildAcceptPayload(state)).toEqual({ quote: base.quote, person: 'Maria D.' });
  });

  it('out-of-bounds edits fail on the imported constants — quote under 20 / over 600, person under 2 / over 80', () => {
    expect(validateAcceptEdit({ quote: 'x'.repeat(19), person: 'Maria D.' }).quote).toBeDefined();
    expect(validateAcceptEdit({ quote: 'x'.repeat(601), person: 'Maria D.' }).quote).toBeDefined();
    expect(validateAcceptEdit({ quote: base.quote, person: 'x' }).person).toBeDefined();
    expect(validateAcceptEdit({ quote: base.quote, person: 'x'.repeat(81) }).person).toBeDefined();
    // The min-error copy is the landing form's pinned pair, verbatim.
    expect(validateAcceptEdit({ quote: 'x'.repeat(19), person: 'Maria D.' }).quote).toBe(
      'Tell us a little more — at least 20 characters.'
    );
    expect(validateAcceptEdit({ quote: base.quote, person: 'x' }).person).toBe(
      'Your name needs at least 2 characters.'
    );
  });

  it('an empty trim fails validation (the API bounds apply to the sent text)', () => {
    expect(validateAcceptEdit({ quote: '   ', person: 'Maria D.' }).quote).toBeDefined();
  });
});

describe('submittedOn (the queue’s UTC date line)', () => {
  it('formats UTC-stable — pinned on full-ICU Node (never edit the expectation; fix the runtime instead)', () => {
    expect(submittedOn(base)).toBe('Oct 14, 2026');
    expect(submittedOn({ ...base, createdAt: new Date('2026-01-02T23:59:00.000Z') })).toBe(
      'Jan 2, 2026'
    );
  });
});
