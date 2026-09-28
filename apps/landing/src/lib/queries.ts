import { queryOptions } from '@tanstack/react-query';
import {
  getAddonServices,
  getBranches,
  getGallery,
  getServicePackageBySlug,
  getServicePackages,
  getStudioServices,
  getTestimonials,
} from './api.functions';

// Query key factory — one group per resource read.
export const branchQueries = {
  all: () =>
    queryOptions({
      queryKey: ['branches'],
      queryFn: () => getBranches(),
    }),
};

export const servicePackageQueries = {
  all: () =>
    queryOptions({
      queryKey: ['service-packages'],
      queryFn: () => getServicePackages(),
    }),
  /**
   * Detail by slug. `retry: false` + `staleTime: Infinity` encode the 404
   * contract: an unknown slug must never be cached (revisit = re-fetch, the
   * 404 stays a 404), while a fetched package lives for the session.
   */
  bySlug: (slug: string) =>
    queryOptions({
      queryKey: ['service-packages', 'by-slug', slug],
      queryFn: () => getServicePackageBySlug({ data: slug }),
      retry: false,
      staleTime: Infinity,
    }),
};

export const studioServiceQueries = {
  all: () =>
    queryOptions({
      queryKey: ['studio-services'],
      queryFn: () => getStudioServices(),
    }),
};

export const addonServiceQueries = {
  all: () =>
    queryOptions({
      queryKey: ['addon-services'],
      queryFn: () => getAddonServices(),
    }),
};

export const galleryQueries = {
  /**
   * The assembled public gallery read (#138). Default staleTime — every
   * fresh page load re-reads through the loader's ensureQueryData (the M5
   * "immediately" rule: freshness is a fresh-page-load property; no cache
   * layer). Tab filtering is client state over this single payload.
   */
  all: () =>
    queryOptions({
      queryKey: ['gallery'],
      queryFn: () => getGallery(),
    }),
};

export const testimonialQueries = {
  /** Active testimonials, position-ordered (#138). Same default-staleTime
   * posture as galleryQueries. */
  all: () =>
    queryOptions({
      queryKey: ['testimonials'],
      queryFn: () => getTestimonials(),
    }),
};
