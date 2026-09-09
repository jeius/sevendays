// The money-free confirmation email (issue #47). This first half is the PURE
// builder: a template-literal HTML string, no I/O, no dependencies (the
// Resend `react` param is Node-only — Workers takes `html`). Money-free is
// enforced structurally: the input carries no price field, so no price can
// reach the HTML. "Scheduled", never "confirmed" — the appointment's status
// is still pending at booking. The send/schedule half joins this file in
// Task 3.
import { branches, type Database, servicePackages, studioServices } from '@sevendays/db';
import type { AppointmentWithAddons } from '@sevendays/types';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';
import type { Env } from '../env.js';

/** Sandbox sender (M2): ONE constant, no env override — M6's domain swap
 * replaces it (the `bookings@` local part is reserved). */
export const EMAIL_FROM = 'Sevendays Photography <onboarding@resend.dev>';

const PH_DATE_TIME = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila',
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** The landing's phDateTime semantics (apps/landing/src/lib/format.ts),
 * reimplemented locally — separate app, no cross-app import. Pinned output:
 * 2026-12-25T01:30:00.000Z → "Dec 25, 2026, 9:30 AM" (full-ICU runtimes). */
function phDateTime(instant: Date): string {
  return PH_DATE_TIME.format(instant);
}

/** Uniform escaping for every interpolated BODY value: customer name and
 * notes are free-text input, and catalog names carry `&` (Portraits & ID
 * Photo → Portraits &amp; ID Photo in HTML). The SUBJECT is exempt — plain
 * text, never HTML-parsed. */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export interface ConfirmationEmailInput {
  appointmentId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  offeringName: string;
  branchName: string;
  branchPhone: string;
  scheduledAt: Date;
  notes: string | null;
  /** Name-only rows — the money-free rule keeps prices out by type. */
  addonNames: string[];
  landingOrigin: string;
}

export interface ConfirmationEmail {
  from: string;
  to: string;
  subject: string;
  html: string;
}

function summaryRow(label: string, value: string): string {
  return `<tr><td align="left" style="padding:4px 12px 4px 0;color:#666;">${label}</td><td align="left" style="padding:4px 0;">${value}</td></tr>`;
}

/**
 * Build the full Resend payload minus the send options: exact from/subject,
 * the pinned body copy, the plain inline-styled summary table (no hero, no
 * logo, no banner), a single CTA link, the contact footer. Pure — the unit
 * suite owns every copy rule; nothing here reads env, db, or the clock.
 */
export function buildConfirmationEmail(input: ConfirmationEmailInput): ConfirmationEmail {
  const origin = input.landingOrigin.replace(/\/+$/, '');
  const bookingUrl = `${origin}/booking/${input.appointmentId}`;
  const when = `${phDateTime(input.scheduledAt)} (PHT)`;

  const addonRows = input.addonNames.map((name) => summaryRow('Add-on', escapeHtml(name))).join('');
  const notesRow = input.notes === null ? '' : summaryRow('Notes', escapeHtml(input.notes));

  const html = `<p>Hi ${escapeHtml(input.customerName)},</p>
<p>Your ${escapeHtml(input.offeringName)} at ${escapeHtml(input.branchName)} is scheduled for ${when} — please keep an eye on this email for any changes.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;">
<tbody>${summaryRow('Branch', escapeHtml(input.branchName))}${summaryRow('Booking', escapeHtml(input.offeringName))}${addonRows}${summaryRow('Schedule', when)}${notesRow}</tbody>
</table>
<p>Need to change something? Call ${escapeHtml(input.branchName)} at ${escapeHtml(input.branchPhone)}.</p>
<p><a href="${bookingUrl}" style="color:#0b5cab;">View your booking</a>: ${bookingUrl}</p>
<p style="color:#666;">${escapeHtml(input.customerName)} · ${escapeHtml(input.customerEmail)} · ${escapeHtml(input.customerPhone)}</p>`;

  return {
    from: EMAIL_FROM,
    to: input.customerEmail,
    subject: `Booking scheduled: ${input.offeringName} — ${when}`,
    html,
  };
}

// --- Send half (Task 3): resolve at send time, one waitUntil, booking stands ----

/**
 * Structural slice of the request's execution context — the route passes
 * `c.executionCtx`; tests pass a fake collector. (Hono throws on
 * `c.executionCtx` when the request carries no execution context, which is
 * exactly how a test proves the wiring exists.)
 */
export interface ConfirmationEmailScheduler {
  waitUntil(promise: Promise<unknown>): void;
}

/**
 * Schedule the send past the response (spec mechanics): ONE waitUntil after
 * the commit, the rejection caught and logged INSIDE the scheduled callback
 * — email failure = booking stands, and a failed send can never surface as
 * an unhandled waitUntil rejection.
 */
export function scheduleConfirmationEmail(
  executionCtx: ConfirmationEmailScheduler,
  env: Env,
  db: Database,
  record: AppointmentWithAddons
): void {
  executionCtx.waitUntil(
    sendConfirmationEmail(env, db, record).catch((error: unknown) => {
      console.error(`[api] confirmation email for appointment ${record.id} failed:`, error);
    })
  );
}

async function resolveOfferingName(db: Database, record: AppointmentWithAddons): Promise<string> {
  if (record.servicePackageId !== null) {
    const [row] = await db
      .select({ name: servicePackages.name })
      .from(servicePackages)
      .where(eq(servicePackages.id, record.servicePackageId))
      .limit(1);
    if (!row) throw new Error(`confirmation email: package ${record.servicePackageId} not found`);
    return row.name;
  }
  if (record.studioServiceId !== null) {
    const [row] = await db
      .select({ name: studioServices.name })
      .from(studioServices)
      .where(eq(studioServices.id, record.studioServiceId))
      .limit(1);
    if (!row) throw new Error(`confirmation email: service ${record.studioServiceId} not found`);
    return row.name;
  }
  throw new Error(`confirmation email: appointment ${record.id} has no offering ref`);
}

/**
 * Resolve the copy's names at send time (spec: reads keyed by the stored
 * ids — a catalog edit after booking never rewrites the email's facts; the
 * add-on names ride the record's embedded entries) and hand the payload to
 * the Resend SDK with the idempotency key (≤256 chars, 24h retention — a
 * retried request can't double-send). resend@6 RESOLVES typed failures
 * ({ data, error }) — it does not throw on API errors, so the error branch
 * is checked, never try/catch'd. The db handle is the request's per-request
 * client (ADR-0011): waitUntil extends the request context's lifetime, so
 * the client stays valid past the response.
 */
export async function sendConfirmationEmail(
  env: Env,
  db: Database,
  record: AppointmentWithAddons
): Promise<void> {
  const [branch] = await db
    .select({ name: branches.name, phone: branches.phone })
    .from(branches)
    .where(eq(branches.id, record.branchId))
    .limit(1);
  if (!branch) throw new Error(`confirmation email: branch ${record.branchId} not found`);

  const email = buildConfirmationEmail({
    appointmentId: record.id,
    customerName: record.customerName,
    customerEmail: record.customerEmail,
    customerPhone: record.customerPhone,
    offeringName: await resolveOfferingName(db, record),
    branchName: branch.name,
    branchPhone: branch.phone,
    scheduledAt: record.scheduledAt,
    notes: record.notes,
    addonNames: record.addonServices.map((a) => a.name),
    landingOrigin: env.LANDING_ORIGIN,
  });

  const result = await new Resend(env.RESEND_API_KEY).emails.send(email, {
    idempotencyKey: `booking-confirm/${record.id}`,
  });
  if (result.error) {
    throw new Error(`resend rejected the send (${result.error.name}): ${result.error.message}`);
  }
}
