import { ApiClientError } from '@sevendays/api-client';
import type { AppointmentWithAddons } from '@sevendays/types';
import type { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAppointment } from './api.functions';
import { appointmentQueries } from './queries';

// The ticket-08 read-back feature suite: query factory (Task 1) + the pure
// read lib (Task 2). The seam, not the network (package-slug.test.ts
// pattern): the server fn is mocked so these tests prove the query
// factory's contract without a Start runtime. Page rendering is the CDP
// scripts' job (spec § Testing Decisions 5).
vi.mock('./api.functions', () => ({
  getAppointment: vi.fn(),
}));

const mockedGet = vi.mocked(getAppointment);

type MinimalQueryContext = {
  client: QueryClient;
  queryKey: string[];
  signal: AbortSignal;
  meta: Record<string, unknown> | undefined;
  pageParam?: unknown;
  direction?: unknown;
};

describe('appointmentQueries.byId', () => {
  beforeEach(() => {
    mockedGet.mockClear();
  });

  it('happy path: returns the fetched record (bare id passed through as { data })', async () => {
    const rec = { id: '0c9dc0de-0000-4000-8000-000000000001' } as AppointmentWithAddons;
    mockedGet.mockResolvedValueOnce(rec);
    const queryFn = appointmentQueries.byId('0c9dc0de-0000-4000-8000-000000000001').queryFn;
    await expect(queryFn?.({} as MinimalQueryContext)).resolves.toBe(rec);
    expect(mockedGet).toHaveBeenCalledWith({ data: '0c9dc0de-0000-4000-8000-000000000001' });
  });

  it('404 posture: retry is false (a deterministic 404 is never retried) and staleTime stays default', async () => {
    const err = new ApiClientError(404, { error: 'Appointment not found.' });
    mockedGet.mockRejectedValue(err);
    const queryFn = appointmentQueries.byId('99999999-9999-4999-8999-999999999999').queryFn;
    await expect(queryFn?.({} as MinimalQueryContext)).rejects.toBe(err);
    const options = appointmentQueries.byId('99999999-9999-4999-8999-999999999999');
    expect(options.retry).toBe(false);
    expect(options.staleTime).toBeUndefined();
  });
});
