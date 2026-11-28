import type { QueryClient } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import {
  fetchAdminAddons,
  fetchAdminAttires,
  fetchAdminBranches,
  fetchAdminGalleryCategories,
  fetchAdminGalleryPhotos,
  fetchAdminPackage,
  fetchAdminPackages,
  fetchAdminPrintSizes,
  fetchAdminStudioServices,
  fetchAdminTestimonialSubmissions,
  fetchAdminTestimonials,
} from './admin.functions';
import { getSiteSettings } from './api.functions';

// Query key factories for the admin CMS (M5 #139), the branchQueries
// precedent, one factory per resource the ticket 05 screens consume.
//
// M8 #288 (the Warm/Cold contract, spec D4): every factory carries the
// ruled 5-minute staleness, within the window TanStack Query renders the
// cached rows instantly (Warm Navigation, zero network) and a background
// refetch always follows once stale (bounded staleness: nothing shown is
// more than five minutes behind; cross-staff edit lag up to that refetch
// is accepted). refetchOnWindowFocus is stated explicitly, the metrics/
// audit factories' posture. Own-mutation invalidation (the screens'
// invalidateQueries calls, all keyed through these factories) overrides
// staleness, a save refetches immediately regardless of the window; the
// query keys are byte-stable and pinned by cms-queries.test.ts.

export const CMS_STALENESS_MS = 300_000;

export const adminPackageQueries = {
  all: () =>
    queryOptions({
      queryKey: ['admin', 'service-packages'],
      queryFn: fetchAdminPackages,
      staleTime: CMS_STALENESS_MS,
      refetchOnWindowFocus: true,
    }),
  byId: (id: string) =>
    queryOptions({
      queryKey: ['admin', 'service-packages', id],
      queryFn: () => fetchAdminPackage({ data: { id } }),
      staleTime: CMS_STALENESS_MS,
      refetchOnWindowFocus: true,
    }),
};

export const adminBranchQueries = {
  all: () =>
    queryOptions({
      queryKey: ['admin', 'branches'],
      queryFn: fetchAdminBranches,
      staleTime: CMS_STALENESS_MS,
      refetchOnWindowFocus: true,
    }),
};

export const adminStudioServiceQueries = {
  all: () =>
    queryOptions({
      queryKey: ['admin', 'studio-services'],
      queryFn: fetchAdminStudioServices,
      staleTime: CMS_STALENESS_MS,
      refetchOnWindowFocus: true,
    }),
};

export const adminAddonQueries = {
  all: () =>
    queryOptions({
      queryKey: ['admin', 'addon-services'],
      queryFn: fetchAdminAddons,
      staleTime: CMS_STALENESS_MS,
      refetchOnWindowFocus: true,
    }),
};

export const adminLookupQueries = {
  printSizes: () =>
    queryOptions({
      queryKey: ['admin', 'print-sizes'],
      queryFn: fetchAdminPrintSizes,
      staleTime: CMS_STALENESS_MS,
      refetchOnWindowFocus: true,
    }),
  attires: () =>
    queryOptions({
      queryKey: ['admin', 'attires'],
      queryFn: fetchAdminAttires,
      staleTime: CMS_STALENESS_MS,
      refetchOnWindowFocus: true,
    }),
};

export const adminGalleryQueries = {
  categories: () =>
    queryOptions({
      queryKey: ['admin', 'gallery-categories'],
      queryFn: fetchAdminGalleryCategories,
      staleTime: CMS_STALENESS_MS,
      refetchOnWindowFocus: true,
    }),
  photos: () =>
    queryOptions({
      queryKey: ['admin', 'gallery-photos'],
      queryFn: fetchAdminGalleryPhotos,
      staleTime: CMS_STALENESS_MS,
      refetchOnWindowFocus: true,
    }),
};

export const adminTestimonialQueries = {
  all: () =>
    queryOptions({
      queryKey: ['admin', 'testimonials'],
      queryFn: fetchAdminTestimonials,
      staleTime: CMS_STALENESS_MS,
      refetchOnWindowFocus: true,
    }),
};

// M7 #218: the Submissions tab's queue, newest-first from the API (#216's list).
export const adminTestimonialSubmissionQueries = {
  all: () =>
    queryOptions({
      queryKey: ['admin', 'testimonial-submissions'],
      queryFn: fetchAdminTestimonialSubmissions,
      staleTime: CMS_STALENESS_MS,
      refetchOnWindowFocus: true,
    }),
};

// M7 #215: the singleton's one query, the public read the Site tab loads.
export const siteSettingsQuery = {
  all: () =>
    queryOptions({
      queryKey: ['site-settings'],
      queryFn: getSiteSettings,
      staleTime: CMS_STALENESS_MS,
      refetchOnWindowFocus: true,
    }),
};

// The loader-time priming seam (M8 #288): CMS route loaders hand these
// thunks to primeCmsQueries so a hover-intent navigation, the router's
// defaultPreload: 'intent' already runs route loaders on hover, starts
// the screen's reads before the click. queryClient.query() is the
// non-deprecated fetch path in @tanstack/react-query 5.102.8
// (ensureQueryData/fetchQuery/prefetchQuery are all removed-next-major
// there): it fetches when the cache is missing or stale, serves fresh
// data with zero requests, and its in-flight fetch dedupes with the
// screen's own useQuery, priming never doubles a read.
//
// Fire-and-forget BY DESIGN: primeCmsQueries never awaits, so a loader
// can never block a navigation, the Cold skeleton stays the screens'
// existing isPending vocabulary (spec user story 2), and the
// hover-started fetch is already in flight when the click lands (Cold
// Navigations shorten, the skeleton contract holds). A rejected read is
// swallowed here; the component's own useQuery surfaces it (the existing
// error vocabulary).
export function primeCmsQueries(primes: ReadonlyArray<() => Promise<unknown>>): void {
  for (const prime of primes) {
    void prime().catch(() => undefined);
  }
}

// The per-route priming lists: exactly the cms-queries factories each CMS
// screen consumes (the editor routes add the lookups; the screens with
// cross-entity badges add the branches/services reads). Kept beside the
// factories so a factory edit and its route's priming can never drift;
// the seam test pins every list. Thunks, not pre-built options, so each
// queryClient.query() call infers its own generics from the concrete
// factory options (a shared generic param fails their contravariance).
// The settings route needs no entry (the shell loader primes
// site-settings); the dashboard/audit-log/users reads are out of scope
// (spec D4 keeps their tuned values).
export const cmsRoutePriming = {
  packagesIndex: (queryClient: QueryClient) => [() => queryClient.query(adminPackageQueries.all())],
  packageEdit: (queryClient: QueryClient, packageId: string) => [
    () => queryClient.query(adminPackageQueries.byId(packageId)),
    () => queryClient.query(adminLookupQueries.printSizes()),
    () => queryClient.query(adminLookupQueries.attires()),
  ],
  packageNew: (queryClient: QueryClient) => [
    () => queryClient.query(adminLookupQueries.printSizes()),
    () => queryClient.query(adminLookupQueries.attires()),
  ],
  branches: (queryClient: QueryClient) => [() => queryClient.query(adminBranchQueries.all())],
  studioServices: (queryClient: QueryClient) => [
    () => queryClient.query(adminStudioServiceQueries.all()),
    () => queryClient.query(adminBranchQueries.all()),
  ],
  addOns: (queryClient: QueryClient) => [
    () => queryClient.query(adminAddonQueries.all()),
    () => queryClient.query(adminStudioServiceQueries.all()),
  ],
  lookups: (queryClient: QueryClient) => [
    () => queryClient.query(adminLookupQueries.printSizes()),
    () => queryClient.query(adminLookupQueries.attires()),
  ],
  gallery: (queryClient: QueryClient) => [
    () => queryClient.query(adminGalleryQueries.photos()),
    () => queryClient.query(adminGalleryQueries.categories()),
  ],
  testimonials: (queryClient: QueryClient) => [
    () => queryClient.query(adminTestimonialQueries.all()),
    () => queryClient.query(adminTestimonialSubmissionQueries.all()),
  ],
};
