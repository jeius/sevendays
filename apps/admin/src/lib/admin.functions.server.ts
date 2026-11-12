import { startSpan } from '@sentry/tanstackstart-react';
import { ApiClientError } from '@sevendays/api-client';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { getSessionScopedApiClient } from './api.server';
import { envelopeDetails } from './api-envelope';

export type AdminClient = ReturnType<typeof getSessionScopedApiClient>;
export type AdminActionFailure = { ok: false; status: number; message: string; details?: unknown };

export async function runAdminAction<T>(
  spanName: string,
  action: (client: AdminClient) => Promise<T>
): Promise<T | AdminActionFailure> {
  return startSpan({ name: spanName }, async () => {
    const client = getSessionScopedApiClient(getRequestHeaders().get('cookie'));
    try {
      return await action(client);
    } catch (error) {
      if (error instanceof ApiClientError) {
        // ApiClientError.details is the parsed error ENVELOPE; the
        // result-value channel's consumers (blockerLines in the delete
        // dialogs, conflictFieldErrors) want the INNER array. (Ruling
        // 2026-10-16, fix round 2; #245 extracted the unwrap to
        // lib/api-envelope.ts so every path shares it.)
        return {
          ok: false,
          status: error.status,
          message: error.message,
          details: envelopeDetails(error.details),
        };
      }
      throw error;
    }
  });
}
