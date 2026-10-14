import type { Database } from '@sevendays/db';
import { testimonialSubmissions, testimonials } from '@sevendays/db';
import type {
  AcceptTestimonialSubmissionInput,
  TestimonialSubmissionStatus,
} from '@sevendays/types';
import { desc, eq } from 'drizzle-orm';
import { nextTestimonialPosition } from './admin-gallery.js';
import type { AdminWriteFailure, AdminWriteResult } from './admin-shared.js';
import { type AuditActor, writeAuditRow } from './audit.js';

// The testimonial-submissions seam (M7 #216, spec § the public testimonial
// form): v1's only public write surface, HOLDING AT THE API — the public
// POST inserts pending and nothing the public writes ever renders; a
// Testimonial exists only after staff accept (appended at the END of
// render order via the shared nextTestimonialPosition max+1), reject
// retains the row as an audit trail, and delete works regardless of
// status (a submission references nothing). One audit row per committed
// moderation request, inside its transaction, under the widened
// vocabulary (entity 'testimonial-submission'; accept/reject/delete).

type SubmissionRow = typeof testimonialSubmissions.$inferSelect;

/** The public write: insert as pending. No audit row — the Audit Log
 * records committed STAFF mutations (an AuditActor requires a session);
 * the rate-limit gate and the honeypot discard live at the route. */
export async function createTestimonialSubmission(
  db: Database,
  input: { quote: string; person: string }
): Promise<SubmissionRow> {
  const [row] = await db.insert(testimonialSubmissions).values(input).returning();
  if (!row) throw new Error('insert testimonial_submissions: no row returned');
  return row;
}

/** The moderation queue: every row, newest-first — the Submissions tab's
 * whole data (M7 #218 renders it); no status filter at the wire. */
export async function listAdminTestimonialSubmissions(db: Database): Promise<SubmissionRow[]> {
  return db
    .select()
    .from(testimonialSubmissions)
    .orderBy(desc(testimonialSubmissions.createdAt), desc(testimonialSubmissions.id));
}

// pending is the only transitionable state — a repeat accept would
// double-create a Testimonial; the 400 names the current status.
function nonPending(
  action: 'accepted' | 'rejected',
  status: TestimonialSubmissionStatus
): AdminWriteFailure {
  return {
    ok: false,
    reason: 'invalid',
    message: `Only pending submissions can be ${action}.`,
    details: [{ path: ['status'], message: `submission is ${status}` }],
  };
}

/**
 * Accept-with-edit: absent edit keys keep the stored text; present keys
 * were bounds-validated at the route. The Testimonial insert, the status
 * flip, and the audit row share ONE transaction — the position computes
 * BEFORE it (the createAdminTestimonial precedent: single-writer admin,
 * race accepted). ONE audit row per REQUEST (the gallery-photo commit
 * precedent: the request's primary entity is the submission; the created
 * Testimonial rides inside the same committed transaction).
 */
export async function acceptTestimonialSubmission(
  db: Database,
  audit: AuditActor,
  id: string,
  edit: AcceptTestimonialSubmissionInput
): Promise<AdminWriteResult<SubmissionRow>> {
  const [current] = await db
    .select()
    .from(testimonialSubmissions)
    .where(eq(testimonialSubmissions.id, id))
    .limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  if (current.status !== 'pending') return nonPending('accepted', current.status);
  const quote = edit.quote ?? current.quote;
  const person = edit.person ?? current.person;
  const position = await nextTestimonialPosition(db);
  const row = await db.transaction(async (tx) => {
    const [created] = await tx.insert(testimonials).values({ quote, person, position }).returning();
    if (!created) throw new Error('accept submission: testimonial insert returned no row');
    const [updated] = await tx
      .update(testimonialSubmissions)
      .set({ status: 'accepted', updatedAt: new Date() })
      .where(eq(testimonialSubmissions.id, id))
      .returning();
    if (!updated) throw new Error('accept submission: status update returned no row');
    await writeAuditRow(tx, audit, {
      entity: 'testimonial-submission',
      entityId: id,
      action: 'accept',
      summary: person,
    });
    return updated;
  });
  return { ok: true, row };
}

/** Reject: retains the row (the audit trail, re-submission spotting) — the
 * write is the status flip + its audit row, nothing else. */
export async function rejectTestimonialSubmission(
  db: Database,
  audit: AuditActor,
  id: string
): Promise<AdminWriteResult<SubmissionRow>> {
  const [current] = await db
    .select()
    .from(testimonialSubmissions)
    .where(eq(testimonialSubmissions.id, id))
    .limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  if (current.status !== 'pending') return nonPending('rejected', current.status);
  const row = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(testimonialSubmissions)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(eq(testimonialSubmissions.id, id))
      .returning();
    if (!updated) throw new Error('reject submission: status update returned no row');
    await writeAuditRow(tx, audit, {
      entity: 'testimonial-submission',
      entityId: id,
      action: 'reject',
      summary: current.person,
    });
    return updated;
  });
  return { ok: true, row };
}

/** Delete regardless of status (a submission references nothing — no guard
 * service; this is a moderation endpoint, not one of the nine). */
export async function deleteTestimonialSubmission(
  db: Database,
  audit: AuditActor,
  id: string
): Promise<{ ok: true } | { ok: false; reason: 'not_found' }> {
  const [current] = await db
    .select()
    .from(testimonialSubmissions)
    .where(eq(testimonialSubmissions.id, id))
    .limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  await db.transaction(async (tx) => {
    await tx.delete(testimonialSubmissions).where(eq(testimonialSubmissions.id, id));
    await writeAuditRow(tx, audit, {
      entity: 'testimonial-submission',
      entityId: id,
      action: 'delete',
      summary: current.person,
    });
  });
  return { ok: true };
}
