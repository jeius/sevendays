import { z } from 'zod';

// Testimonial Submission (M7 #216, spec § the public testimonial form —
// #161's ruling): the public form's wire — v1's only public write surface,
// both editions. Submissions HOLD AT THE API (pending | accepted |
// rejected); nothing the public writes ever renders, and the public POST
// answers GENERICALLY (no row echo — the accepted body is a fixed
// message). The length bounds double as anti-spam: quote 20–600 chars,
// person 2–80. The honeypot field ('website') parses like any other
// optional string — a filled one is the ROUTE's silent-discard signal,
// never a validation error (a trap that 400s is a trap that announces
// itself). The bounds live HERE as exported constants: the route schema,
// the landing seam, the textarea maxLength, and the counter all import
// the numbers — no consumer ever re-declares them.
export const TESTIMONIAL_QUOTE_MIN = 20;
export const TESTIMONIAL_QUOTE_MAX = 600;
export const TESTIMONIAL_PERSON_MIN = 2;
export const TESTIMONIAL_PERSON_MAX = 80;

export const testimonialSubmissionStatusSchema = z.enum(['pending', 'accepted', 'rejected']);

export type TestimonialSubmissionStatus = z.infer<typeof testimonialSubmissionStatusSchema>;

export const createTestimonialSubmissionSchema = z.object({
  quote: z.string().min(TESTIMONIAL_QUOTE_MIN).max(TESTIMONIAL_QUOTE_MAX),
  person: z.string().min(TESTIMONIAL_PERSON_MIN).max(TESTIMONIAL_PERSON_MAX),
  // The honeypot: absent (or empty) for humans, filled by bots. Never
  // required, never bounded — the discard is silent and success-shaped.
  website: z.string().optional(),
});

export type CreateTestimonialSubmissionInput = z.infer<typeof createTestimonialSubmissionSchema>;

// The admin read row (the moderation queue's wire): the stored text, the
// status, the timestamps. Raw status values — the queue renders them.
export const testimonialSubmissionSchema = z.object({
  id: z.uuid(),
  quote: z.string().min(1),
  person: z.string().min(1),
  status: testimonialSubmissionStatusSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type TestimonialSubmission = z.infer<typeof testimonialSubmissionSchema>;

// Accept-with-edit (spec § moderation): the optional edit rides the
// accept request itself — absent keys keep the submission's stored text;
// present keys must satisfy the same bounds (a staff edit that breaks the
// bound is a 400, never a silent trim).
export const acceptTestimonialSubmissionSchema = z.object({
  quote: z.string().min(TESTIMONIAL_QUOTE_MIN).max(TESTIMONIAL_QUOTE_MAX).optional(),
  person: z.string().min(TESTIMONIAL_PERSON_MIN).max(TESTIMONIAL_PERSON_MAX).optional(),
});

export type AcceptTestimonialSubmissionInput = z.infer<typeof acceptTestimonialSubmissionSchema>;

// The generic public answer (no row echo): a fixed message, byte-identical
// for real inserts and honeypot discards alike — indistinguishable by
// construction. The line is the #164 prototype Round-4 success-panel h2
// (owner-reacted 2026-10-01, .scratch/2026-09-30-164-rulings.md).
export const TESTIMONIAL_SUBMISSION_ACCEPTED = {
  message: 'Thank you — your story is on its way.',
} as const;

export const testimonialSubmissionAcceptedSchema = z.object({
  message: z.string(),
});

export type TestimonialSubmissionAccepted = z.infer<typeof testimonialSubmissionAcceptedSchema>;
