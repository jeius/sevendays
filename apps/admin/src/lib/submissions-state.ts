// The Submissions tab's pure seams (M7 #218 over #216's moderation
// endpoints): the tab's own status segment (pending-first — the queue IS
// the work), the accept-with-edit state machine (prefill → validate on the
// imported bounds → the trimmed payload), and the UTC-stable submitted-on
// line. The bounds constants are imported from @sevendays/types — never
// re-declared.
import {
  type AcceptTestimonialSubmissionInput,
  TESTIMONIAL_PERSON_MAX,
  TESTIMONIAL_PERSON_MIN,
  TESTIMONIAL_QUOTE_MAX,
  TESTIMONIAL_QUOTE_MIN,
  type TestimonialSubmission,
} from '@sevendays/types';

export type SubmissionSegment = 'pending' | 'accepted' | 'rejected' | 'all';

/** Pending leads — the moderation queue's default view; All closes the row (audit-trail spotting). */
export const SUBMISSION_SEGMENTS: ReadonlyArray<{ value: SubmissionSegment; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
];

export function filterSubmissions<T extends { status: TestimonialSubmission['status'] }>(
  rows: readonly T[],
  segment: SubmissionSegment
): T[] {
  if (segment === 'all') {
    return [...rows];
  }
  return rows.filter((row) => row.status === segment);
}

/** The accept-with-edit sheet's field state — prefilled from the submission, edited in place. */
export type AcceptEditState = { quote: string; person: string };

export function acceptEditStateFromSubmission(row: TestimonialSubmission): AcceptEditState {
  return { quote: row.quote, person: row.person };
}

// The min-error copy is the landing form's pinned TODO(owner-copy) pair,
// verbatim (#216) — one product, one line. The max lines are this tab's
// TODO(owner-copy) proposals — ratify at the variants round.
const QUOTE_MIN_ERROR = 'Tell us a little more — at least 20 characters.';
const PERSON_MIN_ERROR = 'Your name needs at least 2 characters.';
const QUOTE_MAX_ERROR = 'That’s a little long — at most 600 characters.';
const PERSON_MAX_ERROR = 'That name is a little long — at most 80 characters.';

/** Validates the TRIMMED text against the wire bounds (the API re-verifies — a staff edit that breaks a bound is a 400, never a silent trim). */
export function validateAcceptEdit(state: AcceptEditState): {
  quote?: string;
  person?: string;
} {
  const errors: { quote?: string; person?: string } = {};
  const quote = state.quote.trim();
  const person = state.person.trim();
  if (quote.length < TESTIMONIAL_QUOTE_MIN) {
    errors.quote = QUOTE_MIN_ERROR;
  } else if (quote.length > TESTIMONIAL_QUOTE_MAX) {
    errors.quote = QUOTE_MAX_ERROR;
  }
  if (person.length < TESTIMONIAL_PERSON_MIN) {
    errors.person = PERSON_MIN_ERROR;
  } else if (person.length > TESTIMONIAL_PERSON_MAX) {
    errors.person = PERSON_MAX_ERROR;
  }
  return errors;
}

/** The accept payload always carries the trimmed pair — the sheet prefilled both, so both ride the request. */
export function buildAcceptPayload(state: AcceptEditState): AcceptTestimonialSubmissionInput {
  return { quote: state.quote.trim(), person: state.person.trim() };
}

/** UTC-stable date line (fixed locale + timeZone — SSR/hydration-safe; pinned on full-ICU Node). */
export function submittedOn(row: TestimonialSubmission): string {
  return row.createdAt.toLocaleDateString('en-PH', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
