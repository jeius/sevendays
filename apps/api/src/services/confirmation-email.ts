// The money-free confirmation email (issue #47). This first half is the PURE
// builder: a template-literal HTML string, no I/O, no dependencies (the
// Resend `react` param is Node-only — Workers takes `html`). Money-free is
// enforced structurally: the input carries no price field, so no price can
// reach the HTML. "Scheduled", never "confirmed" — the appointment's status
// is still pending at booking. The send/schedule half joins this file in
// Task 3.

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
