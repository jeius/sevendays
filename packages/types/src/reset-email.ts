// The internal reset-email send contract (M7 #221, ADR-0021): the ADMIN's
// sendResetPassword forwards exactly this shape over the API service
// binding. Not a public /api/v1 surface (ADR-0006's client wraps that
// contract; this is Worker-to-Worker machinery over ADR-0016's transport)
// — but external input is external input: Zod at the boundary, schema
// shared by both sides. `name` rides the request (BetterAuth hands the
// admin `user` at sendResetPassword time) — the send path never touches
// Postgres, by design.
import { z } from 'zod';

export const resetEmailSendSchema = z.object({
  /** The staff member's email — the reset recipient. */
  to: z.email(),
  /** BetterAuth's built token URL (baseURL + /api/auth/reset-password/<token>?callbackURL=…). */
  url: z.url(),
  /** The recipient's display name (BetterAuth's `user.name`) — escaped into the greeting. */
  name: z.string().min(1).max(200),
});

export type ResetEmailSendInput = z.infer<typeof resetEmailSendSchema>;
