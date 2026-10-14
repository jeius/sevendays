import { describe, expect, it } from 'vitest';
// biome-ignore lint/performance/noNamespaceImport: the plan pins the `seam.*` namespace handle (the lib-seam suites' pattern)
import * as seam from './testimonial-form';

const valid = {
  quote: 'The photographer made our shoot feel effortless.',
  person: 'Maria',
  website: '',
};

describe('testimonialFormErrors + canSubmitTestimonialForm (the gate)', () => {
  it('a valid form is clean and submittable', () => {
    expect(seam.testimonialFormErrors(valid)).toEqual({});
    expect(seam.canSubmitTestimonialForm(valid)).toBe(true);
  });

  it('a 19-char quote errors (the spec min is the gate — not the prototype’s mere non-empty); 20 is clean', () => {
    expect(seam.testimonialFormErrors({ ...valid, quote: 'x'.repeat(19) })).toEqual({
      quote: 'Tell us a little more — at least 20 characters.',
    });
    expect(seam.canSubmitTestimonialForm({ ...valid, quote: 'x'.repeat(19) })).toBe(false);
    expect(seam.testimonialFormErrors({ ...valid, quote: 'x'.repeat(20) })).toEqual({});
  });

  it('a whitespace-padded short quote errors (validation trims first)', () => {
    expect(seam.canSubmitTestimonialForm({ ...valid, quote: '   '.repeat(10) })).toBe(false);
  });

  it('a 1-char name errors; 2 is clean', () => {
    expect(seam.testimonialFormErrors({ ...valid, person: 'M' })).toEqual({
      person: 'Your name needs at least 2 characters.',
    });
    expect(seam.testimonialFormErrors({ ...valid, person: 'Mo' })).toEqual({});
  });

  it('the honeypot never blocks submit (canSubmit ignores website)', () => {
    expect(seam.canSubmitTestimonialForm({ ...valid, website: 'https://spam.example' })).toBe(true);
  });
});

describe('buildTestimonialSubmissionPayload (state → the POST body)', () => {
  it('trims quote and person before the wire', () => {
    const payload = seam.buildTestimonialSubmissionPayload({
      quote: '  Padded quote that is long enough.  ',
      person: '  Maria  ',
      website: '',
    });
    expect(payload.quote).toBe('Padded quote that is long enough.');
    expect(payload.person).toBe('Maria');
  });

  it('omits an empty website; carries a filled one verbatim', () => {
    expect('website' in seam.buildTestimonialSubmissionPayload(valid)).toBe(false);
    expect(
      seam.buildTestimonialSubmissionPayload({ ...valid, website: 'https://spam.example' })
    ).toMatchObject({ website: 'https://spam.example' });
  });

  it('the client bounds ARE the API schema numbers (the maxLength + counter can never drift)', () => {
    expect(seam.FORM_BOUNDS).toEqual({ quoteMin: 20, quoteMax: 600, personMin: 2, personMax: 80 });
  });
});
