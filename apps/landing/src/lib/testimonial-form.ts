import {
  TESTIMONIAL_PERSON_MAX,
  TESTIMONIAL_PERSON_MIN,
  TESTIMONIAL_QUOTE_MAX,
  TESTIMONIAL_QUOTE_MIN,
} from '@sevendays/types';

// The share-your-story form seam (M7 #216, the landing lib-seam pattern):
// the public form's whole brain as pure functions — the bounds mirror the
// API schema by IMPORT (packages/types owns the numbers; the textarea
// maxLength, the counter, and this gate can never drift from the server),
// validation trims first (the payload sends trimmed values), and the
// honeypot rides along verbatim without ever gating submit. The max
// bounds are NOT seam errors by design: the inputs' maxLength hard-caps
// at the constant, and a programmatic overrun surfaces as the API's 400
// through the page's generic failure line.

/** The form's whole state (strings in; '' = empty). */
export interface TestimonialFormValues {
  quote: string;
  person: string;
  website: string;
}

/** The no-drift pin: one object the page's maxLength/counter attributes read. */
export const FORM_BOUNDS = {
  quoteMin: TESTIMONIAL_QUOTE_MIN,
  quoteMax: TESTIMONIAL_QUOTE_MAX,
  personMin: TESTIMONIAL_PERSON_MIN,
  personMax: TESTIMONIAL_PERSON_MAX,
} as const;

// TODO(owner-copy): the two min lines — pinned in the #216 plan, ratify
// in-round at the next owner touch (the house's draft-copy convention).
export const QUOTE_TOO_SHORT_LINE = 'Tell us a little more — at least 20 characters.';
export const PERSON_TOO_SHORT_LINE = 'Your name needs at least 2 characters.';

// The owner-ratified catch-all (2026-10-14): bounds validate inline, so
// this line is the rare network/API-failure state.
export const GENERIC_SEND_FAILURE_LINE = "Your story didn't send — please try again.";

export type TestimonialFormErrors = { quote?: string; person?: string };

export function testimonialFormErrors(values: TestimonialFormValues): TestimonialFormErrors {
  const errors: TestimonialFormErrors = {};
  if (values.quote.trim().length < TESTIMONIAL_QUOTE_MIN) {
    errors.quote = QUOTE_TOO_SHORT_LINE;
  }
  if (values.person.trim().length < TESTIMONIAL_PERSON_MIN) {
    errors.person = PERSON_TOO_SHORT_LINE;
  }
  return errors;
}

export function canSubmitTestimonialForm(values: TestimonialFormValues): boolean {
  return Object.keys(testimonialFormErrors(values)).length === 0;
}

export function buildTestimonialSubmissionPayload(values: TestimonialFormValues) {
  return {
    quote: values.quote.trim(),
    person: values.person.trim(),
    ...(values.website.trim() !== '' ? { website: values.website.trim() } : {}),
  };
}
