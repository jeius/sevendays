import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Testimonial Submission (M7 #216, spec § the public testimonial form —
// #161's ruling; glossary in apps/api/CONTEXT.md): an inbound customer
// quote from the public form — quote text + person attributed — HELD AT
// THE API for staff review. Nothing the public writes ever renders: a
// Testimonial exists only after staff accept (the published catalog stays
// 100% staff-authored); reject retains the row as an audit trail and
// deletion is available regardless of status (a submission references
// nothing). The only public write surface — born-empty,
// rows arrive only through the public POST.
export const testimonialSubmissionStatusEnum = pgEnum('testimonial_submission_status', [
  'pending',
  'accepted',
  'rejected',
]);

export const testimonialSubmissions = pgTable('testimonial_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  quote: text('quote').notNull(),
  person: text('person').notNull(),
  status: testimonialSubmissionStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
