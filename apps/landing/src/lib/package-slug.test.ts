import { ApiClientError } from '@sevendays/api-client';
import type { ServicePackageWithInclusions } from '@sevendays/types';
import type { QueryClient } from '@tanstack/react-query';
import { isNotFound } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getServicePackageBySlug } from './api.functions';
import { toNotFoundError } from './package-slug';
import { servicePackageQueries } from './queries';

type MinimalQueryContext = {
  client: QueryClient;
  queryKey: string[];
  signal: AbortSignal;
  meta: Record<string, unknown> | undefined;
  pageParam?: unknown;
  direction?: unknown;
};

// The seam, not the network: the server fn is mocked so these tests prove
// query-factory + 404-mapping behavior without a Start runtime. Page-level
// rendering is the Task 6 CDP script's job (spec § Testing Decisions 5).
vi.mock('./api.functions', () => ({
  getServicePackageBySlug: vi.fn(),
}));

const mockedGet = vi.mocked(getServicePackageBySlug);

function basicPackage(): ServicePackageWithInclusions {
  return {
    slug: 'basic-package',
    priceCents: 90000,
  } as ServicePackageWithInclusions;
}

describe('servicePackageQueries.bySlug', () => {
  beforeEach(() => {
    mockedGet.mockClear();
  });

  it('happy path: returns the fetched package (bare slug passed through as { data })', async () => {
    const pkg = basicPackage();
    mockedGet.mockResolvedValueOnce(pkg);
    const queryFn = servicePackageQueries.bySlug('basic-package').queryFn;
    await expect(queryFn?.({} as MinimalQueryContext)).resolves.toBe(pkg);
    expect(mockedGet).toHaveBeenCalledWith({ data: 'basic-package' });
  });

  it('404 contract: a rejected slug is NOT cached — each visit re-fetches', async () => {
    const err = new ApiClientError(404, { error: 'Package not found.' });
    mockedGet.mockRejectedValue(err);
    const queryFn = servicePackageQueries.bySlug('gone-package').queryFn;
    await expect(queryFn?.({} as MinimalQueryContext)).rejects.toBe(err);
    await expect(queryFn?.({} as MinimalQueryContext)).rejects.toBe(err);
    expect(mockedGet).toHaveBeenCalledTimes(2);
    const options = servicePackageQueries.bySlug('gone-package');
    expect(options.retry).toBe(false);
    expect(options.staleTime).toBe(Infinity);
  });
});

describe('toNotFoundError', () => {
  it('maps ApiClientError(404) to the router not-found error', () => {
    const err = new ApiClientError(404, { error: 'Package not found.' });
    expect(isNotFound(toNotFoundError(err))).toBe(true);
  });

  it('passes everything else through untouched', () => {
    const serverErr = new ApiClientError(500, { error: 'Internal Server Error' });
    expect(toNotFoundError(serverErr)).toBe(serverErr);
    const plain = new Error('plain');
    expect(toNotFoundError(plain)).toBe(plain);
  });
});
