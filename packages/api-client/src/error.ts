/** Thrown on any non-2xx API response (one uniform failure surface). */
export class ApiClientError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, details?: unknown) {
    super(messageFor(status, details));
    this.name = 'ApiClientError';
    this.status = status;
    this.details = details;
  }
}

function messageFor(status: number, details?: unknown): string {
  const error =
    typeof details === 'object' &&
    details !== null &&
    'error' in details &&
    typeof (details as { error?: unknown }).error === 'string'
      ? (details as { error: string }).error
      : `API request failed with status ${status}`;
  return `API ${status}: ${error}`;
}
