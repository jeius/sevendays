import { describe, expect, it } from 'vitest';
import {
  buildConfirmationEmail,
  type ConfirmationEmailInput,
  EMAIL_FROM,
} from './confirmation-email.js';

// The builder is pure — fixed instants, no clock, no I/O. Every pinned
// string comes from the spec's § Confirmation email (owner-ratified
// ticket-34 copy); the phDateTime pins match the landing's format tests and
// were probed on full-ICU Node — fix path is a full-ICU environment, never
// editing the expectation.

const base = (overrides: Partial<ConfirmationEmailInput> = {}): ConfirmationEmailInput => ({
  appointmentId: '3f1d9c66-0000-4000-8000-000000000001',
  customerName: 'Juana Dela Cruz',
  customerEmail: 'juana@example.com',
  customerPhone: '+63 917 000 0000',
  offeringName: 'Combined Package',
  branchName: 'Calamba Branch',
  branchPhone: '+63 900 000 001',
  scheduledAt: new Date('2026-12-25T01:30:00.000Z'), // 09:30 same day in PHT
  notes: null,
  addonNames: [],
  landingOrigin: 'http://localhost:3000',
  ...overrides,
});

describe('buildConfirmationEmail — identity', () => {
  it('from is the sandbox EMAIL_FROM constant, exactly', () => {
    expect(buildConfirmationEmail(base()).from).toBe(
      'Sevendays Photography <onboarding@resend.dev>'
    );
    expect(EMAIL_FROM).toBe('Sevendays Photography <onboarding@resend.dev>');
  });

  it('to is the customer email', () => {
    expect(buildConfirmationEmail(base()).to).toBe('juana@example.com');
  });

  it('subject is exact: scheduled-never-confirmed wording with the PHT pin', () => {
    expect(buildConfirmationEmail(base()).subject).toBe(
      'Booking scheduled: Combined Package — Dec 25, 2026, 9:30 AM (PHT)'
    );
  });
});

describe('buildConfirmationEmail — body copy', () => {
  it('greets the customer and states the schedule in the pinned sentence', () => {
    const html = buildConfirmationEmail(base()).html;
    expect(html).toContain('<p>Hi Juana Dela Cruz,</p>');
    expect(html).toContain(
      'Your Combined Package at Calamba Branch is scheduled for Dec 25, 2026, 9:30 AM (PHT) — please keep an eye on this email for any changes.'
    );
  });

  it('carries the call-the-branch line with name and phone', () => {
    expect(buildConfirmationEmail(base()).html).toContain(
      'Need to change something? Call Calamba Branch at +63 900 000 001.'
    );
  });
});

describe('buildConfirmationEmail — summary table', () => {
  it('always carries Branch, Booking, and Schedule rows with their values', () => {
    const html = buildConfirmationEmail(base()).html;
    expect(html).toContain(
      '>Branch</td><td align="left" style="padding:4px 0;">Calamba Branch</td>'
    );
    expect(html).toContain(
      '>Booking</td><td align="left" style="padding:4px 0;">Combined Package</td>'
    );
    expect(html).toContain(
      '>Schedule</td><td align="left" style="padding:4px 0;">Dec 25, 2026, 9:30 AM (PHT)</td>'
    );
  });

  it('renders one name-only Add-on row per add-on, in order', () => {
    const html = buildConfirmationEmail(base({ addonNames: ['Makeup', 'Hairstyle'] })).html;
    expect(html).toContain('>Add-on</td><td align="left" style="padding:4px 0;">Makeup</td>');
    expect(html).toContain('>Add-on</td><td align="left" style="padding:4px 0;">Hairstyle</td>');
  });

  it('omits the Add-on section entirely when there are none', () => {
    expect(buildConfirmationEmail(base()).html).not.toContain('Add-on');
  });

  it('renders the Notes row when notes are non-null', () => {
    const withNotes = buildConfirmationEmail(base({ notes: 'Please shoot outdoors.' })).html;
    expect(withNotes).toContain(
      '>Notes</td><td align="left" style="padding:4px 0;">Please shoot outdoors.</td>'
    );
  });

  it('omits the Notes row when notes are null', () => {
    expect(buildConfirmationEmail(base()).html).not.toContain('Notes');
  });
});

describe('buildConfirmationEmail — money-free (spec ruling)', () => {
  it('a package booking shows no peso output, no total, no fee', () => {
    const html = buildConfirmationEmail(base()).html;
    expect(html).not.toContain('₱');
    expect(html).not.toMatch(/total/i);
    expect(html).not.toMatch(/fee/i);
  });

  it('a service booking with add-ons shows no peso output, no total, no fee either', () => {
    const html = buildConfirmationEmail(
      base({
        offeringName: 'Portraits & ID Photo',
        addonNames: ['Makeup', 'Hairstyle'],
      })
    ).html;
    expect(html).not.toContain('₱');
    expect(html).not.toMatch(/total/i);
    expect(html).not.toMatch(/fee/i);
    expect(html).toContain('Portraits &amp; ID Photo'); // uniform escaping (veto-flag #2)
  });
});

describe('buildConfirmationEmail — footer, CTA, escaping', () => {
  it('footer carries the customer contact exactly', () => {
    expect(buildConfirmationEmail(base()).html).toContain(
      'Juana Dela Cruz · juana@example.com · +63 917 000 0000'
    );
  });

  it('the CTA is the single link: View your booking → {origin}/booking/{id}', () => {
    const html = buildConfirmationEmail(base()).html;
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toContain(
      '<a href="http://localhost:3000/booking/3f1d9c66-0000-4000-8000-000000000001"'
    );
    expect(html).toContain(
      '>View your booking</a>: http://localhost:3000/booking/3f1d9c66-0000-4000-8000-000000000001</p>'
    );
  });

  it('normalizes a trailing slash on the origin (veto-flag #3)', () => {
    const html = buildConfirmationEmail(base({ landingOrigin: 'http://localhost:3000/' })).html;
    expect(html).toContain(
      'href="http://localhost:3000/booking/3f1d9c66-0000-4000-8000-000000000001"'
    );
    expect(html).not.toContain('//booking');
  });

  it('escapes interpolated values (customer input and catalog ampersands)', () => {
    const html = buildConfirmationEmail(
      base({
        customerName: 'Eve <script>alert(1)</script>',
        notes: 'Attire: "executive" & guest',
      })
    ).html;
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&quot;executive&quot; &amp; guest');
  });
});
