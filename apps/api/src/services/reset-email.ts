// The reset email (M7 #221, ADR-0021): the API's second email consumer,
// with its own failure posture — synchronous and result-returning (the user
// clicked "send reset link"; a silent failure is a support ticket), unlike
// ADR-0014's waitUntil booking-confirmation. The BUILDER half is pure (the
// suite pins every copy rule); the ROUTE half guards with the shared
// INTERNAL_SEND_TOKEN secret — ADR-0021's "reachable only from the two
// frontend Workers" made enforceable, because the API Worker serves a
// public workers.dev URL and a literally unauthenticated sender would be an
// open relay (an attacker-chosen `url` in a studio-sent reset email is a
// phishing vector). PII floor: classified codes only, never Resend's
// free text, never the recipient.

import type { ResetEmailSendInput } from '@sevendays/types';
import type { Context } from 'hono';
import { Resend } from 'resend';
import { parseEnv } from '../env.js';
import { captureError } from '../observability/capture.js';
import { logEmail } from '../observability/events.js';
import type { RootEnv } from '../observability/logger.js';
import { EMAIL_FROM, ResendRejectionError } from './confirmation-email.js';
import { badGateway, serviceUnavailable, unauthorized } from './errors.js';

/** The escape law is the confirmation email's: free-text names carry &<>";
 * the URL is BetterAuth-built machine text and rides unescaped. */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export interface ResetEmailInput {
  to: string;
  url: string;
  name: string;
  from: string;
}

export interface ResetEmail {
  from: string;
  to: string;
  subject: string;
  html: string;
}

/** Pure: the pinned reset-email copy. The subject is exempt from escaping
 * (plain text); the body greets by display name (escaped), states the 1-hour
 * token TTL (BetterAuth's default `resetPasswordTokenExpiresIn`), links the
 * BetterAuth-built URL once, and closes with the didn't-request-this line. */
export function buildResetEmail(input: ResetEmailInput): ResetEmail {
  const html = `<p>Hi ${escapeHtml(input.name)},</p>
<p>We received a request to reset your Sevendays Admin password. This link expires in 1 hour.</p>
<p><a href="${input.url}" style="color:#0b5cab;">Reset your password</a></p>
<p style="color:#666;">If you didn&rsquo;t request this, ignore this email &mdash; your password stays unchanged.</p>`;
  return {
    from: input.from,
    to: input.to,
    subject: 'Reset your Sevendays Admin password',
    html,
  };
}

/**
 * The guarded internal send (ADR-0021 § Decision): validate the shared
 * secret, build, send synchronously, return the result. No idempotency key
 * — every request mints a fresh BetterAuth token upstream, so a double-send
 * is two valid links by design. A missing INTERNAL_SEND_TOKEN answers the
 * curated 503 (the #155 leak-safe pattern — the loud detail stays in the
 * error event, never the response); a wrong token answers the uniform 401;
 * a Resend rejection is captured (the #184 email-seam posture) and answers
 * 502 with no free text. The display name rides the validated body — the
 * send path NEVER touches Postgres (the route is outside /api/v1, no
 * acquireDb, and no user read is needed: BetterAuth gave the admin
 * `user.name` at sendResetPassword time).
 */
export async function sendResetEmail(
  c: Context<RootEnv>,
  input: ResetEmailSendInput
): Promise<Response> {
  const env = parseEnv(c.env);
  if (!env.INTERNAL_SEND_TOKEN) {
    return serviceUnavailable(c, 'Reset emails are not configured.');
  }
  const token = c.req.header('x-internal-token');
  if (typeof token !== 'string' || token !== env.INTERNAL_SEND_TOKEN) {
    return unauthorized(c);
  }
  logEmail(c.var.logger, { phase: 'attempt', purpose: 'reset' });
  const email = buildResetEmail({
    to: input.to,
    url: input.url,
    name: input.name,
    from: env.RESET_EMAIL_FROM ?? EMAIL_FROM,
  });
  const result = await new Resend(env.RESEND_API_KEY).emails.send(email);
  if (result.error) {
    const rejection = new ResendRejectionError(result.error.name);
    logEmail(c.var.logger, {
      phase: 'failed',
      purpose: 'reset',
      code: `resend:${rejection.rejectionName}`,
    });
    captureError(rejection);
    return badGateway(c, 'Email send failed.');
  }
  logEmail(c.var.logger, { phase: 'sent', purpose: 'reset' });
  return c.json({ status: true });
}
