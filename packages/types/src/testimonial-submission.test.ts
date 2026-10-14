import { describe, expect, it } from 'vitest';
import {
  acceptTestimonialSubmissionSchema,
  createTestimonialSubmissionSchema,
  TESTIMONIAL_PERSON_MAX,
  TESTIMONIAL_QUOTE_MAX,
  TESTIMONIAL_SUBMISSION_ACCEPTED,
  testimonialSubmissionAcceptedSchema,
  testimonialSubmissionSchema,
  testimonialSubmissionStatusSchema,
} from './testimonial-submission.js';

const canonical = {
  quote: 'The photographer made our graduation shoot feel effortless.',
  person: 'Maria, batch 2026',
};

describe('createTestimonialSubmissionSchema (the public POST body)', () => {
  it('parses a canonical payload; website stays optional (absent parses)', () => {
    const parsed = createTestimonialSubmissionSchema.parse(canonical);
    expect(parsed.quote).toBe(canonical.quote);
    expect('website' in parsed).toBe(false);
  });

  it('the quote bounds: 19 chars fails; 20 and 600 pass; 601 fails', () => {
    const edge = (n: number) => ({ ...canonical, quote: 'x'.repeat(n) });
    expect(createTestimonialSubmissionSchema.safeParse(edge(19)).success).toBe(false);
    expect(createTestimonialSubmissionSchema.safeParse(edge(20)).success).toBe(true);
    expect(createTestimonialSubmissionSchema.safeParse(edge(600)).success).toBe(true);
    expect(createTestimonialSubmissionSchema.safeParse(edge(601)).success).toBe(false);
  });

  it('the person bounds: 1 char fails; 2 and 80 pass; 81 fails', () => {
    const edge = (n: number) => ({ ...canonical, person: 'x'.repeat(n) });
    expect(createTestimonialSubmissionSchema.safeParse(edge(1)).success).toBe(false);
    expect(createTestimonialSubmissionSchema.safeParse(edge(2)).success).toBe(true);
    expect(createTestimonialSubmissionSchema.safeParse(edge(80)).success).toBe(true);
    expect(createTestimonialSubmissionSchema.safeParse(edge(81)).success).toBe(false);
  });

  it('a filled website parses (the discard is route-side, never a validation error)', () => {
    const parsed = createTestimonialSubmissionSchema.parse({
      ...canonical,
      website: 'https://spam.example',
    });
    expect(parsed.website).toBe('https://spam.example');
  });

  it('strips smuggled server fields from the parsed output (id, status, createdAt)', () => {
    const parsed = createTestimonialSubmissionSchema.parse({
      ...canonical,
      id: '11111111-1111-4111-8111-111111111111',
      status: 'accepted',
      createdAt: '2026-10-14T00:00:00.000Z',
    });
    expect('id' in parsed).toBe(false);
    expect('status' in parsed).toBe(false);
    expect('createdAt' in parsed).toBe(false);
  });
});

describe('testimonialSubmissionStatusSchema', () => {
  it('accepts exactly pending | accepted | rejected', () => {
    for (const status of ['pending', 'accepted', 'rejected']) {
      expect(testimonialSubmissionStatusSchema.parse(status)).toBe(status);
    }
    expect(testimonialSubmissionStatusSchema.safeParse('held').success).toBe(false);
  });
});

describe('acceptTestimonialSubmissionSchema (the optional edit)', () => {
  it('an empty edit parses (accept as-is); partial edits parse; out-of-bounds edits fail', () => {
    expect(acceptTestimonialSubmissionSchema.parse({})).toEqual({});
    expect(acceptTestimonialSubmissionSchema.parse({ person: 'Maria D.' })).toEqual({
      person: 'Maria D.',
    });
    expect(acceptTestimonialSubmissionSchema.safeParse({ quote: 'x'.repeat(19) }).success).toBe(
      false
    );
    expect(acceptTestimonialSubmissionSchema.safeParse({ person: 'x'.repeat(81) }).success).toBe(
      false
    );
  });
});

describe('the read row + the generic public answer', () => {
  it('testimonialSubmissionSchema round-trips a canonical row (dates coerce, unknown keys strip)', () => {
    const parsed = testimonialSubmissionSchema.parse({
      id: '11111111-1111-4111-8111-111111111111',
      quote: canonical.quote,
      person: canonical.person,
      status: 'pending',
      createdAt: '2026-10-14T00:00:00.000Z',
      updatedAt: '2026-10-14T00:00:00.000Z',
      sneaky: 'blob',
    });
    expect(parsed.createdAt).toBeInstanceOf(Date);
    expect('sneaky' in parsed).toBe(false);
    expect(parsed.status).toBe('pending');
  });

  it('TESTIMONIAL_SUBMISSION_ACCEPTED is the fixed message — the no-echo pin (M7 #216)', () => {
    expect(TESTIMONIAL_SUBMISSION_ACCEPTED).toEqual({
      message: 'Thank you — your story is on its way.',
    });
    expect(testimonialSubmissionAcceptedSchema.parse(TESTIMONIAL_SUBMISSION_ACCEPTED)).toEqual(
      TESTIMONIAL_SUBMISSION_ACCEPTED
    );
    expect(TESTIMONIAL_PERSON_MAX).toBe(80); // the constants re-export pin: the numbers live HERE alone
    expect(TESTIMONIAL_QUOTE_MAX).toBe(600);
  });
});
