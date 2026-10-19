// The reset-email forward seam (M7 #221, ADR-0021): the admin Worker stays
// Resend-free — sendResetPassword forwards over the API service binding to
// the internal send endpoint. NEVER THROWS: anti-enumeration means the auth
// request answers identically whether the email exists, the send failed,
// or the secret is unprovisioned — a throw here would 500 the request and
// leak existence. Failures resolve { sent: false }; the caller logs
// console.error (the #186 metrics-seam posture — Workers Logs retains it).
import type { ResetEmailSendInput } from '@sevendays/types';

export interface ResetEmailDeps {
  fetch: typeof fetch;
  baseUrl: string;
  /** The INTERNAL_SEND_TOKEN shared secret; undefined = the API answers the curated 503. */
  token: string | undefined;
}

export interface ResetEmailOutcome {
  sent: boolean;
  status?: number;
}

export async function sendResetEmailOverApi(
  input: ResetEmailSendInput,
  deps: ResetEmailDeps
): Promise<ResetEmailOutcome> {
  try {
    const response = await deps.fetch(`${deps.baseUrl}/internal/reset-email`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(deps.token ? { 'x-internal-token': deps.token } : {}),
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      return { sent: false, status: response.status };
    }
    return { sent: true, status: response.status };
  } catch {
    return { sent: false };
  }
}

/** BetterAuth's sendResetPassword callback shape (1.7.5, probed in dist):
 * ({ user, url, token }, request) — we consume user.email/user.name + url. */
export interface SendResetPasswordParams {
  user: { email: string; name: string };
  url: string;
  token: string;
}

export function makeSendResetPassword(
  deps: ResetEmailDeps
): (params: SendResetPasswordParams) => Promise<void> {
  return async ({ user, url }) => {
    const outcome = await sendResetEmailOverApi({ to: user.email, url, name: user.name }, deps);
    if (!outcome.sent) {
      console.error(
        `[reset-email] the reset email to ${'<recipient redacted>'} did not send (status ${outcome.status ?? 'n/a'})`
      );
    }
  };
}
