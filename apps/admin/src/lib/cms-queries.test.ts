// The CMS query-contract tests (M8 #288): the ruled 5-minute staleness on
// every shared CMS factory (spec D4's Warm/Cold contract), the
// invalidation contract (query keys byte-stable, the screens'
// own-mutation invalidation keys off these factories, and
// invalidateQueries overrides staleness), the out-of-scope tuned values
// (dashboard/audit) pinned untouched, and the loader-priming seam
// (fire-and-forget thunks through queryClient.query). Asserts OPTIONS
// objects and thunk calls only, the server fns are never invoked from a
// plain-node test (the RPC wrapper needs request context; module import
// is safe, spike-proven at metrics-queries.test.ts).
import type { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { auditQueries } from './audit/queries';
import {
  adminAddonQueries,
  adminBranchQueries,
  adminGalleryQueries,
  adminLookupQueries,
  adminPackageQueries,
  adminStudioServiceQueries,
  adminTestimonialQueries,
  adminTestimonialSubmissionQueries,
  CMS_STALENESS_MS,
  cmsRoutePriming,
  primeCmsQueries,
  siteSettingsQuery,
} from './cms-queries';
import { metricsQueries } from './metrics-queries';

const allCmsOptions = () => [
  adminPackageQueries.all(),
  adminPackageQueries.byId('00000000-0000-4000-8000-000000000001'),
  adminBranchQueries.all(),
  adminStudioServiceQueries.all(),
  adminAddonQueries.all(),
  adminLookupQueries.printSizes(),
  adminLookupQueries.attires(),
  adminGalleryQueries.categories(),
  adminGalleryQueries.photos(),
  adminTestimonialQueries.all(),
  adminTestimonialSubmissionQueries.all(),
  siteSettingsQuery.all(),
];

describe('the CMS staleness law (M8 #288, spec D4)', () => {
  it('every CMS list/detail factory stales at the ruled 5 minutes and revalidates on focus', () => {
    expect(CMS_STALENESS_MS).toBe(300_000);
    for (const option of allCmsOptions()) {
      expect(option.staleTime).toBe(CMS_STALENESS_MS);
      expect(option.refetchOnWindowFocus).toBe(true);
    }
  });

  it('the query keys are byte-stable, the screens own-mutation-invalidate through them', () => {
    expect(adminPackageQueries.all().queryKey).toEqual(['admin', 'service-packages']);
    expect(adminPackageQueries.byId('p1').queryKey).toEqual(['admin', 'service-packages', 'p1']);
    expect(adminBranchQueries.all().queryKey).toEqual(['admin', 'branches']);
    expect(adminStudioServiceQueries.all().queryKey).toEqual(['admin', 'studio-services']);
    expect(adminAddonQueries.all().queryKey).toEqual(['admin', 'addon-services']);
    expect(adminLookupQueries.printSizes().queryKey).toEqual(['admin', 'print-sizes']);
    expect(adminLookupQueries.attires().queryKey).toEqual(['admin', 'attires']);
    expect(adminGalleryQueries.categories().queryKey).toEqual(['admin', 'gallery-categories']);
    expect(adminGalleryQueries.photos().queryKey).toEqual(['admin', 'gallery-photos']);
    expect(adminTestimonialQueries.all().queryKey).toEqual(['admin', 'testimonials']);
    expect(adminTestimonialSubmissionQueries.all().queryKey).toEqual([
      'admin',
      'testimonial-submissions',
    ]);
    expect(siteSettingsQuery.all().queryKey).toEqual(['site-settings']);
  });

  it('the dashboard + audit tuned values stay untouched (out of scope, spec D4)', () => {
    expect(metricsQueries.workers('7d')).toMatchObject({ staleTime: 60_000 });
    expect(metricsQueries.dbProbes()).toMatchObject({ staleTime: 60_000 });
    expect(metricsQueries.content()).toMatchObject({ staleTime: 300_000 });
    expect(metricsQueries.traffic('7d')).toMatchObject({ staleTime: 300_000 });
    expect(metricsQueries.storage('7d')).toMatchObject({ staleTime: 600_000 });
    expect(auditQueries.page({ page: 1 })).toMatchObject({ staleTime: 30_000 });
    expect(auditQueries.actors()).toMatchObject({ staleTime: 300_000 });
  });
});

describe('primeCmsQueries, the loader-time priming seam (M8 #288)', () => {
  it('runs every thunk exactly once (fire-and-forget)', () => {
    const primes = [vi.fn(async () => undefined), vi.fn(async () => undefined)];
    primeCmsQueries(primes);
    expect(primes[0]).toHaveBeenCalledTimes(1);
    expect(primes[1]).toHaveBeenCalledTimes(1);
  });

  it('a rejected prime never escapes the helper, a failing read cannot fail a navigation', () => {
    const prime = vi.fn(async () => {
      throw new Error('boom');
    });
    expect(() => primeCmsQueries([prime])).not.toThrow();
  });

  it('the per-route priming lists carry exactly the factories each screen consumes', () => {
    const captured: Array<readonly unknown[]> = [];
    const queryClient = {
      query: (options: { queryKey: readonly unknown[] }) => {
        captured.push(options.queryKey);
        return Promise.resolve(undefined);
      },
    } as unknown as QueryClient;
    const keysFor = (build: (client: QueryClient) => Array<() => Promise<unknown>>) => {
      captured.length = 0;
      for (const thunk of build(queryClient)) void thunk();
      return [...captured];
    };

    expect(keysFor(cmsRoutePriming.packagesIndex)).toEqual([['admin', 'service-packages']]);
    expect(keysFor((client) => cmsRoutePriming.packageEdit(client, 'p1'))).toEqual([
      ['admin', 'service-packages', 'p1'],
      ['admin', 'print-sizes'],
      ['admin', 'attires'],
    ]);
    expect(keysFor(cmsRoutePriming.packageNew)).toEqual([
      ['admin', 'print-sizes'],
      ['admin', 'attires'],
    ]);
    expect(keysFor(cmsRoutePriming.branches)).toEqual([['admin', 'branches']]);
    expect(keysFor(cmsRoutePriming.studioServices)).toEqual([
      ['admin', 'studio-services'],
      ['admin', 'branches'],
    ]);
    expect(keysFor(cmsRoutePriming.addOns)).toEqual([
      ['admin', 'addon-services'],
      ['admin', 'studio-services'],
    ]);
    expect(keysFor(cmsRoutePriming.lookups)).toEqual([
      ['admin', 'print-sizes'],
      ['admin', 'attires'],
    ]);
    expect(keysFor(cmsRoutePriming.gallery)).toEqual([
      ['admin', 'gallery-photos'],
      ['admin', 'gallery-categories'],
    ]);
    expect(keysFor(cmsRoutePriming.testimonials)).toEqual([
      ['admin', 'testimonials'],
      ['admin', 'testimonial-submissions'],
    ]);
  });
});
